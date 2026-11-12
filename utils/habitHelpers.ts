// utils/habitHelpers.ts
import { Habit } from '@/types/database';

/**
 * Verifica se um hábito deve ser realizado em uma data específica
 */
export function shouldHabitAppearOnDate(habit: Habit, date: Date = new Date()): boolean {
  if (habit.frequency_type === 'daily') {
    return true;
  }

  if (habit.frequency_type === 'weekly' && habit.frequency_days) {
    const dayOfWeek = date.getDay();
    return habit.frequency_days.includes(dayOfWeek);
  }

  return true;
}

/**
 * Dias da semana (0=Domingo) em que o hábito é feito — usado para
 * agendar lembretes só nos dias programados.
 */
export function getScheduledWeekDays(
  habit: Pick<Habit, 'frequency_type' | 'frequency_days'>
): number[] {
  if (
    habit.frequency_type === 'weekly' &&
    habit.frequency_days &&
    habit.frequency_days.length > 0
  ) {
    return [...habit.frequency_days].sort((a, b) => a - b);
  }
  return [0, 1, 2, 3, 4, 5, 6];
}

/**
 * Retorna o dia da semana atual (0-6, onde 0=Domingo)
 */
export function getCurrentDayOfWeek(): number {
  return new Date().getDay();
}

/**
 * Retorna nome do dia da semana em português
 */
export function getDayName(dayNumber: number): string {
  const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  return days[dayNumber] || '';
}

/**
 * Retorna nome abreviado do dia da semana
 */
export function getDayShortName(dayNumber: number): string {
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  return days[dayNumber] || '';
}

/**
 * Formata os dias selecionados para exibição
 * Ex: [1,2,3,4,5] -> "Seg, Ter, Qua, Qui, Sex"
 */
export function formatSelectedDays(days: number[]): string {
  if (!days || days.length === 0) return 'Nenhum dia';
  if (days.length === 7) return 'Todos os dias';

  // Cópia: .sort() ordena no lugar e alterava o frequency_days do hábito.
  return [...days]
    .sort((a, b) => a - b)
    .map((d) => getDayShortName(d))
    .join(', ');
}

/**
 * Verifica se hoje é um dia em que o hábito DEVERIA ser feito
 * (usado apenas para destacar visualmente)
 */
export function isHabitDueToday(habit: Habit): boolean {
  return shouldHabitAppearOnDate(habit, new Date());
}

/**
 * Quantas vezes por semana o hábito deve ser feito: a meta semanal
 * (ex.: 3x por semana), se houver; senão, os dias programados.
 */
export function getDaysPerWeek(habit: Habit): number {
  if (
    habit.frequency_goal_period === 'week' &&
    habit.frequency_goal_value &&
    habit.frequency_goal_value > 0
  ) {
    return Math.min(habit.frequency_goal_value, 7);
  }
  if (habit.frequency_type === 'daily') return 7;
  return habit.frequency_days?.length || 7;
}

/**
 * Retorna a próxima data em que o hábito DEVERIA ser feito
 * (usado apenas para notificações/lembretes)
 */
export function getNextDueDate(habit: Habit, fromDate: Date = new Date()): Date | null {
  if (habit.frequency_type === 'daily') {
    return new Date(fromDate);
  }

  if (
    habit.frequency_type === 'weekly' &&
    habit.frequency_days &&
    habit.frequency_days.length > 0
  ) {
    const currentDay = fromDate.getDay();
    const sortedDays = [...habit.frequency_days].sort((a, b) => a - b);

    for (const day of sortedDays) {
      if (day > currentDay) {
        const daysUntil = day - currentDay;
        const nextDate = new Date(fromDate);
        nextDate.setDate(nextDate.getDate() + daysUntil);
        return nextDate;
      }
    }

    const firstDay = sortedDays[0];
    const daysUntil = 7 - currentDay + firstDay;
    const nextDate = new Date(fromDate);
    nextDate.setDate(nextDate.getDate() + daysUntil);
    return nextDate;
  }

  return null;
}
