import {
  formatSelectedDays,
  getDaysPerWeek,
  getScheduledWeekDays,
  shouldHabitAppearOnDate,
} from '../habitHelpers';
import { local, makeHabit } from './testHelpers';

describe('getDaysPerWeek', () => {
  it('meta semanal define o esperado da semana (ex.: 3x por semana)', () => {
    expect(
      getDaysPerWeek(makeHabit({ frequency_goal_value: 3, frequency_goal_period: 'week' }))
    ).toBe(3);
  });

  it('meta semanal acima de 7 é limitada a 7', () => {
    expect(
      getDaysPerWeek(makeHabit({ frequency_goal_value: 10, frequency_goal_period: 'week' }))
    ).toBe(7);
  });

  it('meta mensal não vale para a semana', () => {
    expect(
      getDaysPerWeek(makeHabit({ frequency_goal_value: 3, frequency_goal_period: 'month' }))
    ).toBe(7);
  });

  it('diário: 7; dias específicos: quantidade de dias', () => {
    expect(getDaysPerWeek(makeHabit())).toBe(7);
    expect(getDaysPerWeek(makeHabit({ frequency_type: 'weekly', frequency_days: [1, 3, 5] }))).toBe(
      3
    );
  });
});

describe('formatSelectedDays', () => {
  it('lista os dias em ordem', () => {
    expect(formatSelectedDays([5, 1, 3])).toBe('Seg, Qua, Sex');
  });

  it('não altera o array recebido', () => {
    const days = [5, 1, 3];
    formatSelectedDays(days);
    expect(days).toEqual([5, 1, 3]);
  });

  it('casos especiais: nenhum e todos os dias', () => {
    expect(formatSelectedDays([])).toBe('Nenhum dia');
    expect(formatSelectedDays([0, 1, 2, 3, 4, 5, 6])).toBe('Todos os dias');
  });
});

describe('agenda do hábito', () => {
  const weekly = makeHabit({ frequency_type: 'weekly', frequency_days: [1, 3] });

  it('hábito de dias fixos só aparece nesses dias', () => {
    expect(shouldHabitAppearOnDate(weekly, local('2026-11-09'))).toBe(true); // segunda
    expect(shouldHabitAppearOnDate(weekly, local('2026-11-10'))).toBe(false); // terça
  });

  it('dias dos lembretes: os programados, em ordem; sem programação, todos', () => {
    expect(getScheduledWeekDays({ frequency_type: 'weekly', frequency_days: [3, 1] })).toEqual([
      1, 3,
    ]);
    expect(getScheduledWeekDays({ frequency_type: 'daily', frequency_days: null })).toEqual([
      0, 1, 2, 3, 4, 5, 6,
    ]);
  });
});
