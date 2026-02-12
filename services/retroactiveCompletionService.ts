// services/retroactiveCompletionService.ts
import { supabase } from './supabase';
import { Habit } from '@/types/database';
import { startOfDay, endOfDay, format } from 'date-fns';

interface RetroactiveResult {
  success: boolean;
  message: string;
  action: 'completed' | 'uncompleted';
}

/**
 * Serviço para completar/descompletar dias retroativamente
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
          message: 'Este dia já foi completado',
          action: 'completed',
        };
      }

      // 2. Criar completion
      const { error: insertError } = await (supabase.from('completions') as any)
        .insert({
          habit_id: habit.id,
          completed_at: startOfDay(date).toISOString(),
          value_achieved: achievedValue || null,
          was_synced: true,
        });

      if (insertError) throw insertError;

      return {
        success: true,
        message: 'Dia completado retroativamente',
        action: 'completed',
      };
    } catch (error) {
      console.error('Erro ao completar retroativamente:', error);
      return {
        success: false,
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
          message: 'Este dia não estava completado',
          action: 'uncompleted',
        };
      }

      // 2. Deletar completion
      await supabase
        .from('completions')
        .delete()
        .eq('id', (completion as any).id);

      return {
        success: true,
        message: 'Dia desmarcado',
        action: 'uncompleted',
      };
    } catch (error) {
      console.error('Erro ao descompletar retroativamente:', error);
      return {
        success: false,
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
      const { data: completions } = await supabase
        .from('completions')
        .select('completed_at')
        .eq('habit_id', habitId)
        .order('completed_at', { ascending: false });

      if (!completions || completions.length === 0) {
        await (supabase.from('streaks') as any)
          .update({
            current_streak: 0,
            last_completion_date: null,
          })
          .eq('habit_id', habitId);
        return;
      }

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

      const lastCompletionDate = completions[0]
        ? format(startOfDay(new Date((completions[0] as any).completed_at)), 'yyyy-MM-dd')
        : null;

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