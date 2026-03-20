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
  subDays,
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
      const { data: rawCompletions } = await supabase
        .from('completions')
        .select('completed_at, value_achieved')
        .eq('habit_id', habitId)
        .order('completed_at', { ascending: false });

      if (!rawCompletions || rawCompletions.length === 0) {
        await (supabase.from('streaks') as any)
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
        await (supabase.from('streaks') as any)
          .upsert({
            habit_id: habitId,
            current_streak: 0,
            best_streak: 0,
            last_completion_date: rawCompletions[0] 
              ? format(startOfDay(new Date((rawCompletions[0] as any).completed_at)), 'yyyy-MM-dd')
              : null,
          }, { onConflict: 'habit_id' });
        return;
      }

      const goalValue = (habitData as any).frequency_goal_value;
      const goalPeriod = (habitData as any).frequency_goal_period;

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

// ========== ESTRATÉGIAS DE CÁLCULO DE STREAK ==========

/**
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
  const today = startOfDay(new Date());
  const todayStr = format(today, 'yyyy-MM-dd');
  const yesterdayStr = format(subDays(today, 1), 'yyyy-MM-dd');

  // Current streak: from today or yesterday backwards
  let currentStreak = 0;
  let startDate: Date;

  if (completedDates.has(todayStr)) {
    startDate = today;
  } else if (completedDates.has(yesterdayStr)) {
    // Tolerância: se hoje ainda não completou mas ontem sim
    startDate = subDays(today, 1);
  } else {
    // Nem hoje nem ontem: streak = 0
    return { currentStreak: 0, bestStreak: calculateBestDailyStreak(sortedDates) };
  }

  // Contar para trás usando subDays (imutável, sem mutation bugs)
  let daysBack = 0;
  while (true) {
    const checkDate = subDays(startDate, daysBack);
    const dateStr = format(checkDate, 'yyyy-MM-dd');
    if (completedDates.has(dateStr)) {
      currentStreak++;
      daysBack++;
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
 * Conta DIAS completados em semanas consecutivas em que a meta foi atingida.
 * Uma "semana" vai de domingo a sábado.
 * 
 * Ex: meta 3x/sem, completou 3 dias em 2 semanas + 2 dias na semana atual
 *     → streak = 3 + 3 + 2 = 8 dias
 */
function calculateWeeklyGoalStreak(
  completions: any[],
  goalValue: number
): { currentStreak: number; bestStreak: number } {
  const completedDates = completions.map((c: any) =>
    startOfDay(new Date(c.completed_at))
  );

  const today = new Date();

  // Contar completions por semana (últimas 53 semanas + atual)
  const weeksToCheck = 53;
  const weeklyData: { weekStart: Date; count: number }[] = [];

  for (let i = 0; i < weeksToCheck; i++) {
    const ws = startOfWeek(subWeeks(today, i), { weekStartsOn: 0 });
    const we = endOfWeek(ws, { weekStartsOn: 0 });

    const count = completedDates.filter(d =>
      !isBefore(d, ws) && !isAfter(d, we)
    ).length;

    weeklyData.push({ weekStart: ws, count });
  }

    weeklyData.slice(0, 5).map(w => ({
      semana: format(w.weekStart, 'dd/MM'),
      completions: w.count,
      meta: w.count >= goalValue ? '✅' : '❌',
    }))
  );

  // --- CURRENT STREAK (em dias) ---
  // Semana atual (index 0): se ainda não atingiu a meta, tolerar (semana em andamento)
  // e somar os dias completados até agora
  let currentStreakDays = 0;
  let startIdx = 0;

  // Semana atual: sempre somar os dias (semana em andamento)
  if (weeklyData[0].count > 0) {
    currentStreakDays += weeklyData[0].count;
    
    // Se a semana atual ainda não bateu a meta, começar a verificar da semana passada
    // mas manter os dias da semana atual
    if (weeklyData[0].count < goalValue) {
      startIdx = 1;
    } else {
      // Semana atual bateu a meta, verificar anteriores
      startIdx = 1;
    }
  } else {
    // Nenhuma completion na semana atual — verificar semana passada
    startIdx = 1;
    currentStreakDays = 0;
  }

  // Somar dias das semanas anteriores consecutivas que bateram a meta
  for (let i = startIdx; i < weeklyData.length; i++) {
    if (weeklyData[i].count >= goalValue) {
      currentStreakDays += weeklyData[i].count;
    } else {
      // Se a semana atual não tinha completions E a primeira semana anterior
      // também não bateu a meta, streak = 0
      if (startIdx === 1 && weeklyData[0].count === 0) {
        currentStreakDays = 0;
      }
      break;
    }
  }

  // --- BEST STREAK (em dias) ---
  // Percorrer do mais antigo ao mais recente, somando dias em semanas consecutivas com meta
  let bestStreakDays = 0;
  let tempStreakDays = 0;

  for (let i = weeklyData.length - 1; i >= 0; i--) {
    if (weeklyData[i].count >= goalValue) {
      tempStreakDays += weeklyData[i].count;
      bestStreakDays = Math.max(bestStreakDays, tempStreakDays);
    } else if (i === 0 && weeklyData[0].count > 0 && tempStreakDays > 0) {
      // Semana atual em andamento: somar dias parciais se vem de uma sequência
      tempStreakDays += weeklyData[0].count;
      bestStreakDays = Math.max(bestStreakDays, tempStreakDays);
    } else {
      tempStreakDays = 0;
    }
  }


  return {
    currentStreak: currentStreakDays,
    bestStreak: Math.max(currentStreakDays, bestStreakDays),
  };
}