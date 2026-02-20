// services/retroactiveCompletionService.ts
import { supabase } from './supabase';
import { Habit } from '@/types/database';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  format,
  eachDayOfInterval,
  subWeeks,
  isAfter,
  isBefore,
} from 'date-fns';
import { shouldHabitAppearOnDate } from '@/utils/habitHelpers';

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
   * Recalcular streak após mudanças retroativas.
   * 
   * Para hábitos diários ou com dias fixos (weekly):
   *   Streak conta dias consecutivos programados com completion.
   * 
   * Para hábitos com meta de frequência (ex: 3x/sem):
   *   Streak conta semanas consecutivas em que a meta foi atingida.
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

      // 2. Buscar todas as completions
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

      const habitData = habit as Habit;
      const goalValue = (habitData as any).frequency_goal_value;
      const goalPeriod = (habitData as any).frequency_goal_period;

      let currentStreak: number;
      let bestStreak: number;

      // 3. Escolher estratégia de cálculo
      if (goalValue && goalValue > 0 && goalPeriod === 'week') {
        // Meta semanal: streak por semanas
        const result = calculateWeeklyGoalStreak(completions, goalValue);
        currentStreak = result.currentStreak;
        bestStreak = result.bestStreak;
      } else if (
        habitData.frequency_type === 'weekly' &&
        habitData.frequency_days &&
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

      // 4. Preservar melhor streak existente
      const { data: existingStreak } = await supabase
        .from('streaks')
        .select('best_streak')
        .eq('habit_id', habitId)
        .maybeSingle();

      bestStreak = Math.max(
        bestStreak,
        (existingStreak as any)?.best_streak || 0
      );

      const lastCompletionDate = format(
        startOfDay(new Date((completions[0] as any).completed_at)),
        'yyyy-MM-dd'
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

// ========== ESTRATÉGIAS DE CÁLCULO DE STREAK ==========

/**
 * Streak diário: dias consecutivos com completion.
 * Conta de trás pra frente a partir de hoje.
 */
function calculateDailyStreak(
  completions: any[]
): { currentStreak: number; bestStreak: number } {
  const completedDates = new Set(
    completions.map((c: any) =>
      format(startOfDay(new Date(c.completed_at)), 'yyyy-MM-dd')
    )
  );

  const sortedDates = [...completedDates].sort().reverse();
  const today = format(startOfDay(new Date()), 'yyyy-MM-dd');

  // Current streak: from today backwards
  let currentStreak = 0;
  let checkDate = new Date();

  // Se hoje não foi completado, verificar se ontem foi (tolerância de 1 dia)
  if (!completedDates.has(today)) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = format(startOfDay(yesterday), 'yyyy-MM-dd');
    if (!completedDates.has(yesterdayStr)) {
      // Nem hoje nem ontem: streak = 0
      return { currentStreak: 0, bestStreak: calculateBestDailyStreak(sortedDates) };
    }
    checkDate = yesterday;
  }

  while (true) {
    const dateStr = format(startOfDay(checkDate), 'yyyy-MM-dd');
    if (completedDates.has(dateStr)) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return {
    currentStreak,
    bestStreak: Math.max(currentStreak, calculateBestDailyStreak(sortedDates)),
  };
}

function calculateBestDailyStreak(sortedDatesDesc: string[]): number {
  if (sortedDatesDesc.length === 0) return 0;

  const sorted = [...sortedDatesDesc].sort(); // ascending
  let best = 1;
  let current = 1;

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));

    if (diff === 1) {
      current++;
      best = Math.max(best, current);
    } else {
      current = 1;
    }
  }

  return best;
}

/**
 * Streak por dias programados (weekly com dias fixos).
 * Conta dias programados consecutivos com completion, ignorando dias não programados.
 */
function calculateScheduledDaysStreak(
  completions: any[],
  habit: Habit
): { currentStreak: number; bestStreak: number } {
  const completedDates = new Set(
    completions.map((c: any) =>
      format(startOfDay(new Date(c.completed_at)), 'yyyy-MM-dd')
    )
  );

  // Gerar todos os dias programados desde a criação até hoje
  const createdAt = startOfDay(new Date(habit.created_at));
  const today = startOfDay(new Date());
  const allDays = eachDayOfInterval({ start: createdAt, end: today });
  const scheduledDays = allDays
    .filter(d => shouldHabitAppearOnDate(habit, d))
    .map(d => format(d, 'yyyy-MM-dd'))
    .reverse(); // mais recente primeiro

  // Current streak: dias programados consecutivos completados
  let currentStreak = 0;
  let startedCounting = false;

  for (const dateStr of scheduledDays) {
    if (completedDates.has(dateStr)) {
      currentStreak++;
      startedCounting = true;
    } else {
      // Tolerância: se o dia é hoje e ainda não completou, pular
      if (!startedCounting && dateStr === format(today, 'yyyy-MM-dd')) {
        continue;
      }
      break;
    }
  }

  // Best streak
  let bestStreak = 0;
  let tempStreak = 0;
  const scheduledAsc = [...scheduledDays].reverse();

  for (const dateStr of scheduledAsc) {
    if (completedDates.has(dateStr)) {
      tempStreak++;
      bestStreak = Math.max(bestStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  }

  return {
    currentStreak,
    bestStreak: Math.max(currentStreak, bestStreak),
  };
}

/**
 * Streak por meta semanal (ex: 3x por semana).
 * Conta semanas consecutivas em que a meta foi atingida.
 * Uma "semana" vai de domingo a sábado.
 */
function calculateWeeklyGoalStreak(
  completions: any[],
  goalValue: number
): { currentStreak: number; bestStreak: number } {
  const completedDates = completions.map((c: any) =>
    startOfDay(new Date(c.completed_at))
  );

  const today = new Date();
  const currentWeekStart = startOfWeek(today, { weekStartsOn: 0 });

  // Contar completions por semana (últimas 52 semanas + atual)
  const weeksToCheck = 53;
  const weeklyCompletions: { weekStart: Date; count: number }[] = [];

  for (let i = 0; i < weeksToCheck; i++) {
    const ws = startOfWeek(subWeeks(today, i), { weekStartsOn: 0 });
    const we = endOfWeek(ws, { weekStartsOn: 0 });

    const count = completedDates.filter(d =>
      !isBefore(d, ws) && !isAfter(d, we)
    ).length;

    weeklyCompletions.push({ weekStart: ws, count });
  }

  // Current streak: semanas consecutivas com meta atingida
  // Semana atual: se ainda não atingiu a meta, pular (semana em andamento)
  let currentStreak = 0;
  let startIdx = 0;

  // Se a semana atual ainda não atingiu a meta, começar da semana passada
  if (weeklyCompletions[0].count < goalValue) {
    startIdx = 1;
  }

  for (let i = startIdx; i < weeklyCompletions.length; i++) {
    if (weeklyCompletions[i].count >= goalValue) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Best streak
  let bestStreak = 0;
  let tempStreak = 0;

  // Calcular de trás pra frente (mais antigo primeiro)
  for (let i = weeklyCompletions.length - 1; i >= 0; i--) {
    if (weeklyCompletions[i].count >= goalValue) {
      tempStreak++;
      bestStreak = Math.max(bestStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  }

  return {
    currentStreak,
    bestStreak: Math.max(currentStreak, bestStreak),
  };
}