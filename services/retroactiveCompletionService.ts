// services/retroactiveCompletionService.ts
import { supabase } from './supabase';
import { Habit } from '@/types/database';
import { startOfDay, endOfDay, format } from 'date-fns';
import { calculateCompletionPoints } from '@/utils/points';

interface RetroactiveResult {
  success: boolean;
  pointsChange: number;
  penaltyChange: number;
  message: string;
  action: 'completed' | 'uncompleted';
}

/**
 * Serviço para completar/descompletar dias retroativamente
 * com recálculo de pontos e penalidades
 */
export const retroactiveCompletionService = {
  /**
   * Completar um dia no passado
   */
  async completeRetroactively(
    habit: Habit,
    date: Date,
    userId: string,
    achievedValue?: number
  ): Promise<RetroactiveResult> {
    try {
      const dateStr = format(startOfDay(date), 'yyyy-MM-dd');
      
      // 1. Verificar se já existe completion neste dia
      const { data: existing } = await supabase
        .from('completions')
        .select('*')
        .eq('habit_id', habit.id)
        .gte('completed_at', startOfDay(date).toISOString())
        .lte('completed_at', endOfDay(date).toISOString())
        .maybeSingle();

      if (existing) {
        return {
          success: false,
          pointsChange: 0,
          penaltyChange: 0,
          message: 'Este dia já foi completado',
          action: 'completed',
        };
      }

      // 2. Calcular pontos
      let pointsEarned = 0;
      
      if (habit.has_target && achievedValue) {
        // Para metas numéricas, só pontua se ≥ 100%
        const percentage = (achievedValue / (habit.target_value || 1)) * 100;
        if (percentage >= 100) {
          pointsEarned = calculateCompletionPoints(habit, 0); // Streak será recalculado depois
          const bonus = Math.floor(pointsEarned * 0.2);
          pointsEarned += bonus;
        }
      } else {
        // Hábitos binários sempre pontuam
        pointsEarned = calculateCompletionPoints(habit, 0);
      }

      // 3. Criar completion
      const { error: insertError } = await (supabase.from('completions') as any)
        .insert({
          habit_id: habit.id,
          completed_at: startOfDay(date).toISOString(),
          value_achieved: achievedValue || null,
          points_earned: pointsEarned,
          was_synced: true,
        });

      if (insertError) throw insertError;

      // 4. Atualizar pontos do perfil
      if (pointsEarned > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('total_points')
          .eq('id', userId)
          .single();

        if (profileData) {
          const profile = profileData as { total_points: number };
          const newPoints = (profile.total_points || 0) + pointsEarned;
          await (supabase.from('profiles') as any)
            .update({ total_points: newPoints })
            .eq('id', userId);
        }
      }

      // 5. Remover penalidade se existir neste dia
      let penaltyRemoved = 0;
      const { data: penalties } = await supabase
        .from('penalties')
        .select('*')
        .eq('habit_id', habit.id)
        .eq('penalty_date', dateStr);

      if (penalties && penalties.length > 0) {
        const totalPenalty = penalties.reduce((sum, p: any) => sum + (p.points_lost || 0), 0);
        
        // Deletar penalidades
        await supabase
          .from('penalties')
          .delete()
          .eq('habit_id', habit.id)
          .eq('penalty_date', dateStr);

        // Restaurar pontos
        if (totalPenalty > 0) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('total_points')
            .eq('id', userId)
            .single();

          if (profileData) {
            const profile = profileData as { total_points: number };
            const newPoints = (profile.total_points || 0) + totalPenalty;
            await (supabase.from('profiles') as any)
              .update({ total_points: newPoints })
              .eq('id', userId);
          }
        }

        penaltyRemoved = totalPenalty;
      }

      return {
        success: true,
        pointsChange: pointsEarned,
        penaltyChange: penaltyRemoved,
        message: `Dia completado retroativamente. +${pointsEarned} pontos${penaltyRemoved > 0 ? ` e +${penaltyRemoved} de penalidade removida` : ''}`,
        action: 'completed',
      };
    } catch (error) {
      console.error('Erro ao completar retroativamente:', error);
      return {
        success: false,
        pointsChange: 0,
        penaltyChange: 0,
        message: 'Erro ao completar dia',
        action: 'completed',
      };
    }
  },

  /**
   * Descompletar um dia no passado
   */
  async uncompleteRetroactively(
    habit: Habit,
    date: Date,
    userId: string
  ): Promise<RetroactiveResult> {
    try {
      const dateStr = format(startOfDay(date), 'yyyy-MM-dd');

      // 1. Buscar completion do dia
      const { data: completion } = await supabase
        .from('completions')
        .select('*')
        .eq('habit_id', habit.id)
        .gte('completed_at', startOfDay(date).toISOString())
        .lte('completed_at', endOfDay(date).toISOString())
        .maybeSingle();

      if (!completion) {
        return {
          success: false,
          pointsChange: 0,
          penaltyChange: 0,
          message: 'Este dia não estava completado',
          action: 'uncompleted',
        };
      }

      const pointsLost = (completion as any).points_earned || 0;

      // 2. Deletar completion
      await supabase
        .from('completions')
        .delete()
        .eq('id', (completion as any).id);

      // 3. Remover pontos do perfil
      if (pointsLost > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('total_points')
          .eq('id', userId)
          .single();

        if (profileData) {
          const profile = profileData as { total_points: number };
          const newPoints = Math.max(0, (profile.total_points || 0) - pointsLost);
          await (supabase.from('profiles') as any)
            .update({ total_points: newPoints })
            .eq('id', userId);
        }
      }

      // 4. Aplicar penalidade retroativa (se dia estava programado)
      const dayOfWeek = date.getDay();
      let shouldApplyPenalty = false;

      if (habit.frequency_type === 'daily') {
        shouldApplyPenalty = true;
      } else if (habit.frequency_type === 'weekly' && habit.frequency_days) {
        shouldApplyPenalty = habit.frequency_days.includes(dayOfWeek);
      }

      let penaltyApplied = 0;
      if (shouldApplyPenalty) {
        // Calcular penalidade baseada na dificuldade
        const PENALTY_CONFIG: any = {
          easy: { missedDay: 5 },
          medium: { missedDay: 10 },
          hard: { missedDay: 15 },
        };

        const penaltyPoints = PENALTY_CONFIG[habit.difficulty]?.missedDay || 10;

        // Criar penalidade
        await (supabase.from('penalties') as any)
          .insert({
            user_id: userId,
            habit_id: habit.id,
            points_lost: penaltyPoints,
            reason: 'retroactive_uncheck',
            penalty_date: dateStr,
          });

        // Deduzir pontos
        const { data: profileData } = await supabase
          .from('profiles')
          .select('total_points')
          .eq('id', userId)
          .single();

        if (profileData) {
          const profile = profileData as { total_points: number };
          const newPoints = Math.max(0, (profile.total_points || 0) - penaltyPoints);
          await (supabase.from('profiles') as any)
            .update({ total_points: newPoints })
            .eq('id', userId);
        }

        penaltyApplied = penaltyPoints;
      }

      return {
        success: true,
        pointsChange: -pointsLost,
        penaltyChange: -penaltyApplied,
        message: `Dia desmarcado. -${pointsLost} pontos${penaltyApplied > 0 ? ` e -${penaltyApplied} de penalidade` : ''}`,
        action: 'uncompleted',
      };
    } catch (error) {
      console.error('Erro ao descompletar retroativamente:', error);
      return {
        success: false,
        pointsChange: 0,
        penaltyChange: 0,
        message: 'Erro ao desmarcar dia',
        action: 'uncompleted',
      };
    }
  },

  /**
   * Recalcular streak após mudanças retroativas
   */
  async recalculateStreak(habitId: string): Promise<void> {
    try {
      // Buscar todas as completions ordenadas por data
      const { data: completions } = await supabase
        .from('completions')
        .select('completed_at')
        .eq('habit_id', habitId)
        .order('completed_at', { ascending: false });

      if (!completions || completions.length === 0) {
        // Resetar streak se não há completions
        await (supabase.from('streaks') as any)
          .update({
            current_streak: 0,
            last_completion_date: null,
          })
          .eq('habit_id', habitId);
        return;
      }

      // Calcular streak atual
      let currentStreak = 0;
      let lastDate: Date | null = null;

      for (const completion of completions) {
        const compDate = startOfDay(new Date((completion as any).completed_at));
        
        if (!lastDate) {
          lastDate = compDate;
          currentStreak = 1;
          continue;
        }

        const daysDiff = Math.floor(
          (lastDate.getTime() - compDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysDiff === 1) {
          currentStreak++;
          lastDate = compDate;
        } else {
          break;
        }
      }

      // Atualizar streak
      const lastCompletionDate = completions[0] ? 
        format(startOfDay(new Date((completions[0] as any).completed_at)), 'yyyy-MM-dd') : 
        null;

      const { data: existingStreak } = await supabase
        .from('streaks')
        .select('best_streak')
        .eq('habit_id', habitId)
        .maybeSingle();

      const bestStreak = Math.max(
        currentStreak,
        (existingStreak as any)?.best_streak || 0
      );

      await (supabase.from('streaks') as any)
        .update({
          current_streak: currentStreak,
          best_streak: bestStreak,
          last_completion_date: lastCompletionDate,
        })
        .eq('habit_id', habitId);
    } catch (error) {
      console.error('Erro ao recalcular streak:', error);
    }
  },
};