// utils/streak.ts
//
// Cálculo de streaks a partir do histórico de conclusões — lógica pura (sem
// acesso ao banco), usada pelo recalculateStreak e coberta por testes.
// `now` é parâmetro para os testes controlarem o "hoje".
import {
  startOfDay,
  startOfWeek,
  endOfWeek,
  format,
  eachDayOfInterval,
  subWeeks,
  subDays,
  isAfter,
  isBefore,
  differenceInCalendarWeeks,
} from 'date-fns';
import { Habit } from '@/types/database';
import { shouldHabitAppearOnDate } from '@/utils/habitHelpers';

export interface StreakCompletion {
  completed_at: string;
}

export interface StreakResult {
  currentStreak: number;
  bestStreak: number;
}

/**
 * Conta de trás pra frente a partir de hoje.
 */
export function calculateDailyStreak(
  completions: StreakCompletion[],
  now: Date = new Date()
): StreakResult {
  const completedDates = new Set(
    completions.map((c) => format(startOfDay(new Date(c.completed_at)), 'yyyy-MM-dd'))
  );

  const sortedDates = [...completedDates].sort().reverse();
  const today = startOfDay(now);
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

export function calculateBestDailyStreak(sortedDatesDesc: string[]): number {
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
export function calculateScheduledDaysStreak(
  completions: StreakCompletion[],
  habit: Habit,
  now: Date = new Date()
): StreakResult {
  const completedDates = new Set(
    completions.map((c) => format(startOfDay(new Date(c.completed_at)), 'yyyy-MM-dd'))
  );

  // Gerar todos os dias programados desde a criação até hoje
  const createdAt = startOfDay(new Date(habit.created_at));
  const today = startOfDay(now);
  const allDays = eachDayOfInterval({ start: createdAt, end: today });
  const scheduledDays = allDays
    .filter((d) => shouldHabitAppearOnDate(habit, d))
    .map((d) => format(d, 'yyyy-MM-dd'))
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
export function calculateWeeklyGoalStreak(
  completions: StreakCompletion[],
  goalValue: number,
  now: Date = new Date()
): StreakResult {
  const completedDates = completions.map((c) => startOfDay(new Date(c.completed_at)));

  const today = now;

  // Contar completions por semana, da semana da primeira conclusão até a
  // atual — todo o histórico, para o best_streak não perder recordes antigos.
  const earliest = completedDates.reduce((min, d) => (d < min ? d : min), today);
  const weeksToCheck = differenceInCalendarWeeks(today, earliest, { weekStartsOn: 0 }) + 1;
  const weeklyData: { weekStart: Date; count: number }[] = [];

  for (let i = 0; i < weeksToCheck; i++) {
    const ws = startOfWeek(subWeeks(today, i), { weekStartsOn: 0 });
    const we = endOfWeek(ws, { weekStartsOn: 0 });

    const count = completedDates.filter((d) => !isBefore(d, ws) && !isAfter(d, we)).length;

    weeklyData.push({ weekStart: ws, count });
  }

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

// ---------------------------------------------------------------------------
// Previsão local (para o toast e os marcos, sem esperar o servidor)
// ---------------------------------------------------------------------------

/** Streaks que merecem celebração ao serem alcançados. */
export const STREAK_MILESTONES = [7, 30, 100, 365];

/**
 * Prevê o streak depois de marcar hoje, a partir do streak salvo — o oficial
 * só é recalculado depois do envio (e, offline, nem isso). Devolve null
 * quando não dá para prever com segurança: hábitos com meta semanal, cujo
 * streak é contado por semanas.
 */
export function predictStreakAfterMarkingToday(
  habit: Habit,
  saved: { current_streak: number; last_completion_date: string | null } | undefined,
  now: Date = new Date()
): number | null {
  if (habit.frequency_goal_period === 'week' && (habit.frequency_goal_value ?? 0) > 0) return null;

  const today = format(now, 'yyyy-MM-dd');
  const last = saved?.last_completion_date ?? null;
  const current = saved?.current_streak ?? 0;
  if (last === today) return Math.max(current, 1);

  // Dia programado anterior: ontem, para diários; para dias fixos, o último
  // dia da agenda antes de hoje (procura até uma semana para trás).
  let previous: string | null = null;
  for (let back = 1; back <= 7; back++) {
    const day = subDays(startOfDay(now), back);
    if (shouldHabitAppearOnDate(habit, day)) {
      previous = format(day, 'yyyy-MM-dd');
      break;
    }
  }

  return last !== null && last === previous ? current + 1 : 1;
}
