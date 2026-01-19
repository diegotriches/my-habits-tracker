// utils/habitHelpers.ts
import { Habit } from '@/types/database';

/**
 * Verifica se um hábito deve ser realizado em uma data específica
 */
export function shouldHabitAppearOnDate(habit: Habit, date: Date = new Date()): boolean {
  // Se é diário, sempre aparece
  if (habit.frequency_type === 'daily') {
    return true;
  }

  // Se é semanal, verifica se o dia da semana está nos dias selecionados
  if (habit.frequency_type === 'weekly' && habit.frequency_days) {
    const dayOfWeek = date.getDay(); // 0=Dom, 1=Seg, 2=Ter, etc
    return habit.frequency_days.includes(dayOfWeek);
  }

  // Custom ou outros tipos: por enquanto retorna true
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
 * Verifica se hoje é um dia em que o hábito deve ser feito
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
 * Retorna a próxima data em que o hábito deve ser feito
 */
export function getNextDueDate(habit: Habit, fromDate: Date = new Date()): Date | null {
  if (habit.frequency_type === 'daily') {
    return new Date(fromDate);
  }

  if (habit.frequency_type === 'weekly' && habit.frequency_days && habit.frequency_days.length > 0) {
    const currentDay = fromDate.getDay();
    const sortedDays = [...habit.frequency_days].sort((a, b) => a - b);
    
    // Procura próximo dia a partir de hoje
    for (const day of sortedDays) {
      if (day > currentDay) {
        const daysUntil = day - currentDay;
        const nextDate = new Date(fromDate);
        nextDate.setDate(nextDate.getDate() + daysUntil);
        return nextDate;
      }
    }
    
    // Se não achou, retorna o primeiro dia da próxima semana
    const firstDay = sortedDays[0];
    const daysUntil = (7 - currentDay) + firstDay;
    const nextDate = new Date(fromDate);
    nextDate.setDate(nextDate.getDate() + daysUntil);
    return nextDate;
  }

  return null;
}