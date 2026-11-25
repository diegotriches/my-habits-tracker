// utils/todaySummary.ts
//
// Resumo do dia da home ("3 de 5 hoje") — lógica pura, coberta por testes.
import { endOfWeek, format, isSameDay, isWithinInterval, startOfWeek } from 'date-fns';
import { Completion, Habit } from '@/types/database';
import { getWeeklyTarget, shouldHabitAppearOnDate } from '@/utils/habitHelpers';
import { countsAsDone } from '@/utils/reminderSchedule';

export interface TodaySummary {
  /** Hábitos que contam para hoje. */
  due: number;
  /** Desses, quantos já foram feitos hoje. */
  done: number;
  /** Todos os de hoje feitos (e havia algum). */
  allDone: boolean;
}

type SummaryCompletion = Pick<Completion, 'habit_id' | 'completed_at' | 'value_achieved'>;

/**
 * Conta os hábitos de hoje e quantos já foram feitos.
 *
 * - Diário: conta todo dia.
 * - Meta semanal (ex.: 3x por semana): conta só enquanto a meta da semana não
 *   foi batida — ou se já foi feito hoje. Senão, "2 de 5" seria injusto com
 *   quem já cumpriu a semana.
 * - Dias específicos (ex.: seg e qua = 2x por semana): como a meta semanal,
 *   mas só aparece como pendente nos dias escolhidos; feito em outro dia,
 *   conta como feito hoje.
 * - Meta numérica: feito quando o valor de hoje atinge a meta.
 *
 * `completions` deve incluir pelo menos a semana atual (domingo a sábado).
 */
export function computeTodaySummary(
  habits: Habit[],
  completions: SummaryCompletion[],
  now: Date = new Date()
): TodaySummary {
  const week = {
    start: startOfWeek(now, { weekStartsOn: 0 }),
    end: endOfWeek(now, { weekStartsOn: 0 }),
  };
  let due = 0;
  let done = 0;

  for (const habit of habits) {
    const mine = completions.filter((c) => c.habit_id === habit.id);
    const today = mine.find((c) => isSameDay(new Date(c.completed_at), now));
    const doneToday = !!today && countsAsDone(habit, today.value_achieved);

    const weeklyTarget = getWeeklyTarget(habit);
    let countsToday: boolean;
    if (weeklyTarget !== null) {
      const daysThisWeek = new Set(
        mine
          .filter((c) => isWithinInterval(new Date(c.completed_at), week))
          .map((c) => format(new Date(c.completed_at), 'yyyy-MM-dd'))
      ).size;
      // Sem dias escolhidos (meta "3x por semana"), todo dia é sugerido.
      countsToday =
        doneToday || (daysThisWeek < weeklyTarget && shouldHabitAppearOnDate(habit, now));
    } else {
      countsToday = shouldHabitAppearOnDate(habit, now);
    }

    if (!countsToday) continue;
    due++;
    if (doneToday) done++;
  }

  return { due, done, allDone: due > 0 && done === due };
}
