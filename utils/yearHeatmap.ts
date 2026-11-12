// utils/yearHeatmap.ts
//
// Mapa de calor do ano (tela de estatísticas) — lógica pura, coberta por
// testes. Para cada dia: quantos hábitos contavam e quantos foram feitos.
import { eachDayOfInterval, endOfMonth, format, isAfter, startOfDay, startOfMonth } from 'date-fns';
import { Completion, Habit } from '@/types/database';
import { shouldHabitAppearOnDate } from '@/utils/habitHelpers';

/** 0 = nada feito (ou nada programado); 1–4 = quanto do dia foi feito. */
export type HeatLevel = 0 | 1 | 2 | 3 | 4;

export interface HeatmapDay {
  /** yyyy-MM-dd, dia local. */
  date: string;
  /** Hábitos que contavam no dia. */
  due: number;
  /** Desses, quantos foram feitos. */
  done: number;
  /** Dia futuro: fica de fora das contas e aparece apagado. */
  future: boolean;
  level: HeatLevel;
}

export interface HeatmapMonth {
  /** 0–11. */
  month: number;
  /** Dia da semana do dia 1 (0 = domingo), para alinhar a grade. */
  firstWeekday: number;
  days: HeatmapDay[];
  due: number;
  done: number;
}

export interface YearStats {
  /** Conclusões que contaram no ano. */
  completions: number;
  /** Dias com algo programado e tudo feito. */
  perfectDays: number;
  /** Dias com algo programado (até hoje). */
  dueDays: number;
  /** Feitos / programados, 0–100 (null sem nada programado). */
  rate: number | null;
}

export interface YearHeatmap {
  months: HeatmapMonth[];
  stats: YearStats;
}

type HeatmapCompletion = Pick<Completion, 'habit_id' | 'completed_at' | 'value_achieved'>;

const dayKey = (d: Date) => format(d, 'yyyy-MM-dd');

const hasWeeklyGoal = (h: Habit) =>
  h.frequency_goal_period === 'week' && !!h.frequency_goal_value && h.frequency_goal_value > 0;

export function heatLevel(due: number, done: number): HeatLevel {
  if (due === 0 || done === 0) return 0;
  const ratio = done / due;
  if (ratio >= 1) return 4;
  if (ratio > 2 / 3) return 3;
  if (ratio > 1 / 3) return 2;
  return 1;
}

/**
 * Monta o ano dia a dia.
 *
 * Um hábito conta num dia quando já existia (criado até aquele dia), ainda não
 * tinha sido arquivado e o dia é da agenda dele. Hábitos com meta semanal
 * ("3x por semana") não têm dias fixos: contam só nos dias em que foram feitos
 * — senão todo dia sem eles pareceria falha. Meta numérica só conta como feita
 * ao atingir o valor. Dias futuros ficam de fora.
 *
 * Passe só os hábitos que devem entrar (todos, ou um, no filtro da tela).
 */
export function computeYearHeatmap(
  habits: Habit[],
  completions: HeatmapCompletion[],
  year: number,
  now: Date = new Date()
): YearHeatmap {
  const today = startOfDay(now);

  // Feito por hábito e dia (meta numérica: só ao atingir o valor).
  const habitById = new Map(habits.map((h) => [h.id, h]));
  const doneByDay = new Map<string, Set<string>>();
  for (const c of completions) {
    const habit = habitById.get(c.habit_id);
    if (!habit) continue;
    if (habit.has_target && habit.target_value && (c.value_achieved ?? 0) < habit.target_value) {
      continue;
    }
    const key = dayKey(new Date(c.completed_at));
    if (!key.startsWith(`${year}-`)) continue;
    let set = doneByDay.get(key);
    if (!set) doneByDay.set(key, (set = new Set()));
    set.add(habit.id);
  }

  const lifetimes = habits.map((h) => ({
    habit: h,
    from: dayKey(new Date(h.created_at)),
    // Arquivado: conta até o dia anterior ao arquivamento.
    until: h.archived_at ? dayKey(new Date(h.archived_at)) : null,
    weeklyGoal: hasWeeklyGoal(h),
  }));

  const stats: YearStats = { completions: 0, perfectDays: 0, dueDays: 0, rate: null };
  let totalDue = 0;

  const months: HeatmapMonth[] = [];
  for (let m = 0; m < 12; m++) {
    const first = startOfMonth(new Date(year, m, 1));
    const month: HeatmapMonth = {
      month: m,
      firstWeekday: first.getDay(),
      days: [],
      due: 0,
      done: 0,
    };

    for (const date of eachDayOfInterval({ start: first, end: endOfMonth(first) })) {
      const key = dayKey(date);
      const future = isAfter(date, today);
      let due = 0;
      let done = 0;

      if (!future) {
        const doneSet = doneByDay.get(key);
        for (const { habit, from, until, weeklyGoal } of lifetimes) {
          if (key < from || (until !== null && key >= until)) continue;
          const isDone = !!doneSet?.has(habit.id);
          if (weeklyGoal ? !isDone : !shouldHabitAppearOnDate(habit, date)) continue;
          due++;
          if (isDone) done++;
        }
      }

      month.days.push({ date: key, due, done, future, level: heatLevel(due, done) });
      month.due += due;
      month.done += done;
      if (due > 0) {
        stats.dueDays++;
        if (done === due) stats.perfectDays++;
      }
      stats.completions += done;
      totalDue += due;
    }
    months.push(month);
  }

  stats.rate = totalDue > 0 ? Math.round((stats.completions / totalDue) * 100) : null;
  return { months, stats };
}
