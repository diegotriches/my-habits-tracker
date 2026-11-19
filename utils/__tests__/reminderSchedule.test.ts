import {
  countsAsDone,
  habitsDoneToday,
  nextWeeklyOccurrence,
  progressWindowDates,
} from '../reminderSchedule';
import { NOW, local } from './testHelpers';

// NOW = quarta (3), 11/11/2026, 15h.
const fmt = (d: Date) =>
  `${d.toDateString()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;

describe('nextWeeklyOccurrence', () => {
  it('hoje, horário ainda por vir: toca hoje', () => {
    expect(fmt(nextWeeklyOccurrence(3, '21:30', NOW))).toBe(fmt(local('2026-11-11', '21:30')));
  });

  it('hoje, horário que já passou: próxima semana', () => {
    expect(fmt(nextWeeklyOccurrence(3, '08:00', NOW))).toBe(fmt(local('2026-11-18', '08:00')));
  });

  it('hábito já feito hoje: pula hoje e fica para a próxima semana', () => {
    expect(fmt(nextWeeklyOccurrence(3, '21:30', NOW, { skipToday: true }))).toBe(
      fmt(local('2026-11-18', '21:30'))
    );
  });

  it('outro dia da semana não é afetado pelo "feito hoje"', () => {
    // quinta (4), 12/11
    expect(fmt(nextWeeklyOccurrence(4, '08:00', NOW, { skipToday: true }))).toBe(
      fmt(local('2026-11-12', '08:00'))
    );
  });

  it('antecedência mínima: horário perto demais vai para a próxima semana', () => {
    const almost = local('2026-11-11', '21:29');
    expect(fmt(nextWeeklyOccurrence(3, '21:30', almost, { minLeadMs: 2 * 60_000 }))).toBe(
      fmt(local('2026-11-18', '21:30'))
    );
  });

  it('aceita horário com segundos', () => {
    expect(fmt(nextWeeklyOccurrence(3, '21:30:00', NOW))).toBe(fmt(local('2026-11-11', '21:30')));
  });
});

describe('progressWindowDates', () => {
  const periods = [
    { period: 'morning' as const, time: '08:00' },
    { period: 'afternoon' as const, time: '15:00' },
    { period: 'evening' as const, time: '21:00' },
  ];

  it('pula os horários que já passaram hoje', () => {
    const dates = progressWindowDates(periods, NOW, false, 2).map((x) => fmt(x.date));
    expect(dates).toEqual([
      fmt(local('2026-11-11', '21:00')),
      fmt(local('2026-11-12', '08:00')),
      fmt(local('2026-11-12', '15:00')),
      fmt(local('2026-11-12', '21:00')),
    ]);
  });

  it('meta de hoje atingida: nada hoje, a partir de amanhã normal', () => {
    const dates = progressWindowDates(periods, NOW, true, 2).map((x) => fmt(x.date));
    expect(dates[0]).toBe(fmt(local('2026-11-12', '08:00')));
    expect(dates).toHaveLength(3);
  });

  it('a janela cobre os dias pedidos', () => {
    const dates = progressWindowDates([{ period: 'morning', time: '08:00' }], NOW, false, 7);
    expect(dates).toHaveLength(6); // hoje às 8h já passou
    expect(fmt(dates[5].date)).toBe(fmt(local('2026-11-17', '08:00')));
  });
});

describe('countsAsDone / habitsDoneToday', () => {
  const simple = { id: 'a', has_target: false, target_value: null };
  const target = { id: 'km', has_target: true, target_value: 5 };
  const c = (habit_id: string, day: string, value_achieved: number | null = null) => ({
    habit_id,
    completed_at: local(day).toISOString(),
    value_achieved,
  });

  it('meta numérica só conta ao atingir o valor', () => {
    expect(countsAsDone(target, 3)).toBe(false);
    expect(countsAsDone(target, 5)).toBe(true);
    expect(countsAsDone(simple, null)).toBe(true);
  });

  it('só conclusões de hoje, de hábitos conhecidos', () => {
    const done = habitsDoneToday(
      [simple, target],
      [c('a', '2026-11-10'), c('km', '2026-11-11', 6), c('outro', '2026-11-11')],
      NOW
    );
    expect([...done]).toEqual(['km']);
  });
});
