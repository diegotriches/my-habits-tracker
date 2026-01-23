// utils/habitHelpers.ts
import { Habit, Completion } from '@/types/database';

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
  
  return days
    .sort((a, b) => a - b)
    .map(d => getDayShortName(d))
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
 * Calcula quantos dias na semana o hábito deve ser feito
 */
export function getDaysPerWeek(habit: Habit): number {
  if (habit.frequency_type === 'daily') return 7;
  if (habit.frequency_type === 'weekly' && habit.frequency_days) {
    return habit.frequency_days.length;
  }
  return 7;
}

/**
 * 🆕 Calcula o progresso semanal do hábito
 * Retorna quantas vezes foi completado nos últimos 7 dias vs quantas deveria
 */
export function getWeeklyProgress(
  habit: Habit,
  completions: Completion[]
): { completed: number; expected: number; percentage: number } {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  // Filtra conclusões dos últimos 7 dias
  const recentCompletions = completions.filter(c => {
    const completionDate = new Date(c.completed_at);
    return completionDate >= sevenDaysAgo;
  });

  const completed = recentCompletions.length;
  const expected = getDaysPerWeek(habit);
  const percentage = expected > 0 ? (completed / expected) * 100 : 0;

  return { completed, expected, percentage };
}

/**
 * 🆕 Verifica se o hábito atingiu a meta semanal
 */
export function hasMetWeeklyGoal(
  habit: Habit,
  completions: Completion[]
): boolean {
  const { completed, expected } = getWeeklyProgress(habit, completions);
  return completed >= expected;
}

/**
 * 🆕 Calcula quantos dias faltam para atingir a meta semanal
 */
export function getDaysRemainingForWeeklyGoal(
  habit: Habit,
  completions: Completion[]
): number {
  const { completed, expected } = getWeeklyProgress(habit, completions);
  return Math.max(0, expected - completed);
}

/**
 * Retorna a próxima data em que o hábito DEVERIA ser feito
 * (usado apenas para notificações/lembretes)
 */
export function getNextDueDate(habit: Habit, fromDate: Date = new Date()): Date | null {
  if (habit.frequency_type === 'daily') {
    return new Date(fromDate);
  }

  if (habit.frequency_type === 'weekly' && habit.frequency_days && habit.frequency_days.length > 0) {
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
    const daysUntil = (7 - currentDay) + firstDay;
    const nextDate = new Date(fromDate);
    nextDate.setDate(nextDate.getDate() + daysUntil);
    return nextDate;
  }

  return null;
}

/**
 * 🆕 Retorna um texto amigável sobre o progresso semanal
 */
export function getWeeklyProgressMessage(
  habit: Habit,
  completions: Completion[]
): string {
  const { completed, expected, percentage } = getWeeklyProgress(habit, completions);
  
  if (completed >= expected) {
    return `Meta atingida! ${completed}/${expected} vezes esta semana 🎉`;
  }
  
  const remaining = expected - completed;
  if (remaining === 1) {
    return `Falta ${remaining} vez para atingir a meta semanal`;
  }
  
  return `Faltam ${remaining} vezes para atingir a meta semanal`;
}