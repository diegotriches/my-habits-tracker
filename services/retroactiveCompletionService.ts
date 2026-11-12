// services/retroactiveCompletionService.ts
import { fetchAllRows, supabase } from './supabase';
import { Habit } from '@/types/database';
import {
  startOfDay,
  format,
} from 'date-fns';
import {
  calculateDailyStreak,
  calculateScheduledDaysStreak,
  calculateWeeklyGoalStreak,
} from '@/utils/streak';

/**
 * Cálculo de streaks a partir do histórico de conclusões. (As marcações em
 * si passam pela fila de saída — services/completionOutbox.ts.)
 */
export const retroactiveCompletionService = {
  /**
   * Recalcular streak após mudanças.
   * 
   * Estratégias:
   * 1. Meta semanal (frequency_goal_value + period=week): conta semanas consecutivas
   * 2. Dias fixos (frequency_type=weekly + frequency_days): conta dias programados consecutivos
   * 3. Diário (fallback): conta dias consecutivos
   */
  async recalculateStreak(habitId: string): Promise<void> {
    try {
      // 1. Buscar hábito
      const { data: habit, error: habitError } = await supabase
        .from('habits')
        .select('*')
        .eq('id', habitId)
        .single();

      if (habitError || !habit) {
        console.error('Erro ao buscar hábito para streak:', habitError);
        return;
      }

      // 2. Buscar todas as completions (incluindo value_achieved para filtrar metas)
      // Paginado: o Supabase corta em 1000 linhas, e o streak/recorde de um
      // hábito com histórico maior sairia errado. Um erro aqui interrompe o
      // recálculo (antes era ignorado e o streak podia ser zerado).
      const rawCompletions = await fetchAllRows((from, to) =>
        supabase
          .from('completions')
          .select('completed_at, value_achieved')
          .eq('habit_id', habitId)
          .order('completed_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to)
      );

      if (!rawCompletions || rawCompletions.length === 0) {
        await supabase.from('streaks')
          .upsert({
            habit_id: habitId,
            current_streak: 0,
            best_streak: 0,
            last_completion_date: null,
          }, { onConflict: 'habit_id' });
        return;
      }

      const habitData = habit as Habit;

      // 3. Para hábitos com meta numérica, filtrar apenas completions 100%
      let completions = rawCompletions;
      if (habitData.has_target && habitData.target_value && habitData.target_value > 0) {
        completions = rawCompletions.filter((c: any) => {
          const achieved = c.value_achieved || 0;
          return achieved >= habitData.target_value!;
        });
      }

      if (completions.length === 0) {
        await supabase.from('streaks')
          .upsert({
            habit_id: habitId,
            current_streak: 0,
            best_streak: 0,
            last_completion_date: rawCompletions[0] 
              ? format(startOfDay(new Date(rawCompletions[0].completed_at)), 'yyyy-MM-dd')
              : null,
          }, { onConflict: 'habit_id' });
        return;
      }

      const goalValue = habitData.frequency_goal_value;
      const goalPeriod = habitData.frequency_goal_period;

      let currentStreak: number;
      let bestStreak: number;

      // 3. Escolher estratégia de cálculo
      if (goalValue && goalValue > 0 && goalPeriod === 'week') {
        // Meta semanal: streak por semanas (ex: 3x/semana)
        const result = calculateWeeklyGoalStreak(completions, goalValue);
        currentStreak = result.currentStreak;
        bestStreak = result.bestStreak;
      } else if (
        habitData.frequency_type === 'weekly' &&
        habitData.frequency_days &&
        habitData.frequency_days.length > 0 &&
        habitData.frequency_days.length < 7
      ) {
        // Dias específicos: streak por dias programados
        const result = calculateScheduledDaysStreak(completions, habitData);
        currentStreak = result.currentStreak;
        bestStreak = result.bestStreak;
      } else {
        // Diário: streak por dias consecutivos
        const result = calculateDailyStreak(completions);
        currentStreak = result.currentStreak;
        bestStreak = result.bestStreak;
      }

      // O best_streak é recalculado de todo o histórico. Antes ele era
      // combinado com Math.max ao valor salvo e nunca diminuía — nem
      // depois de desmarcar um dia marcado por engano.

      const lastCompletionDate = format(
        startOfDay(new Date(completions[0].completed_at)),
        'yyyy-MM-dd'
      );

      await supabase.from('streaks')
        .upsert({
          habit_id: habitId,
          current_streak: currentStreak,
          best_streak: bestStreak,
          last_completion_date: lastCompletionDate,
        }, { onConflict: 'habit_id' });
    } catch (error) {
      console.error('Erro ao recalcular streak:', error);
    }
  },
};
