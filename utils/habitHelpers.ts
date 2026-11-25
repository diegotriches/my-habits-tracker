// utils/habitHelpers.ts
import { FrequencyGoalPeriod, Habit } from '@/types/database';

type FrequencyFields = Pick<
  Habit,
  | 'frequency_type'
  | 'frequency_days'
  | 'frequency_goal_value'
  | 'frequency_goal_period'
  | 'frequency_goal_custom_days'
>;

export interface FrequencyGoal {
  value: number;
  period: FrequencyGoalPeriod;
  customDays: number | null;
}

/**
 * Meta de frequência que vale para as contas (heatmap, streak, resumo do dia,
 * estatísticas):
 *
 * - a meta explícita do hábito ("3x por semana"), se houver;
 * - dias específicos (ex.: segunda e quarta) viram "2x por semana": os dias
 *   escolhidos são só a sugestão visual e a agenda dos lembretes — fazer em
 *   outro dia da semana conta igual;
 * - null para hábitos diários (todo dia conta).
 */
export function getFrequencyGoal(habit: FrequencyFields): FrequencyGoal | null {
  if (habit.frequency_goal_value && habit.frequency_goal_value > 0 && habit.frequency_goal_period) {
    return {
      value: habit.frequency_goal_value,
      period: habit.frequency_goal_period,
      customDays: habit.frequency_goal_custom_days,
    };
  }
  const days = habit.frequency_type === 'weekly' ? (habit.frequency_days?.length ?? 0) : 0;
  if (days > 0 && days < 7) return { value: days, period: 'week', customDays: null };
  return null;
}

/** Vezes por semana exigidas pela meta (null se a meta não é semanal ou não há meta). */
export function getWeeklyTarget(habit: FrequencyFields): number | null {
  const goal = getFrequencyGoal(habit);
  return goal && goal.period === 'week' ? Math.min(goal.value, 7) : null;
}

/**
 * Se o dia é um dos dias sugeridos do hábito (destaque visual e lembretes).
 * Não decide se o hábito "conta" no dia — para isso, veja `getFrequencyGoal`.
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
 * Quantas vezes por semana o hábito deve ser feito: a meta semanal
 * (ex.: 3x por semana, ou os dias específicos); 7 para os diários.
 */
export function getDaysPerWeek(habit: FrequencyFields): number {
  return getWeeklyTarget(habit) ?? 7;
}
