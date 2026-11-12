import {
  calculateBestDailyStreak,
  calculateDailyStreak,
  calculateScheduledDaysStreak,
  calculateWeeklyGoalStreak,
} from '../streak';
import { NOW, doneAt, makeHabit } from './testHelpers';

describe('calculateDailyStreak', () => {
  it('sem conclusões, streak e recorde são zero', () => {
    expect(calculateDailyStreak([], NOW)).toEqual({ currentStreak: 0, bestStreak: 0 });
  });

  it('conta os dias seguidos até hoje', () => {
    const completions = [doneAt('2026-11-11'), doneAt('2026-11-10'), doneAt('2026-11-09')];
    expect(calculateDailyStreak(completions, NOW).currentStreak).toBe(3);
  });

  it('hoje ainda não feito não quebra o streak (tolerância até o fim do dia)', () => {
    const completions = [doneAt('2026-11-10'), doneAt('2026-11-09')];
    expect(calculateDailyStreak(completions, NOW).currentStreak).toBe(2);
  });

  it('um dia sem conclusão quebra o streak', () => {
    const completions = [doneAt('2026-11-11'), doneAt('2026-11-08'), doneAt('2026-11-07')];
    expect(calculateDailyStreak(completions, NOW)).toEqual({ currentStreak: 1, bestStreak: 2 });
  });

  it('sem conclusão hoje nem ontem, o streak atual é zero', () => {
    const completions = [doneAt('2026-11-08'), doneAt('2026-11-07')];
    expect(calculateDailyStreak(completions, NOW)).toEqual({ currentStreak: 0, bestStreak: 2 });
  });

  it('agrupa pelo dia local: 23:30 de ontem conta como ontem, não como hoje (UTC)', () => {
    const completions = [doneAt('2026-11-11'), doneAt('2026-11-10', '23:30')];
    expect(calculateDailyStreak(completions, NOW).currentStreak).toBe(2);
  });

  it('várias conclusões no mesmo dia contam uma vez', () => {
    const completions = [
      doneAt('2026-11-11', '08:00'),
      doneAt('2026-11-11', '20:00'),
      doneAt('2026-11-10'),
    ];
    expect(calculateDailyStreak(completions, NOW).currentStreak).toBe(2);
  });

  it('o recorde considera sequências antigas maiores que a atual', () => {
    const completions = [
      doneAt('2026-11-11'),
      doneAt('2026-10-05'),
      doneAt('2026-10-04'),
      doneAt('2026-10-03'),
      doneAt('2026-10-02'),
    ];
    expect(calculateDailyStreak(completions, NOW)).toEqual({ currentStreak: 1, bestStreak: 4 });
  });
});

describe('calculateBestDailyStreak', () => {
  it('encontra a maior sequência de dias consecutivos', () => {
    const dates = ['2026-11-10', '2026-11-09', '2026-11-05', '2026-11-04', '2026-11-03'];
    expect(calculateBestDailyStreak(dates)).toBe(3);
  });

  it('atravessa a virada de mês', () => {
    expect(calculateBestDailyStreak(['2026-11-01', '2026-10-31', '2026-10-30'])).toBe(3);
  });

  it('lista vazia é zero', () => {
    expect(calculateBestDailyStreak([])).toBe(0);
  });
});

describe('calculateScheduledDaysStreak (dias fixos: seg, qua, sex)', () => {
  const habit = makeHabit({ frequency_type: 'weekly', frequency_days: [1, 3, 5] });

  it('conta só os dias programados, ignorando os outros', () => {
    // qua 11/11, seg 9/11, sex 6/11, qua 4/11
    const completions = [
      doneAt('2026-11-11'),
      doneAt('2026-11-09'),
      doneAt('2026-11-06'),
      doneAt('2026-11-04'),
    ];
    expect(calculateScheduledDaysStreak(completions, habit, NOW).currentStreak).toBe(4);
  });

  it('hoje (programado) ainda não feito não quebra o streak', () => {
    const completions = [doneAt('2026-11-09'), doneAt('2026-11-06')];
    expect(calculateScheduledDaysStreak(completions, habit, NOW).currentStreak).toBe(2);
  });

  it('um dia programado perdido quebra o streak', () => {
    // faltou a segunda 9/11
    const completions = [doneAt('2026-11-06'), doneAt('2026-11-04')];
    expect(calculateScheduledDaysStreak(completions, habit, NOW)).toEqual({
      currentStreak: 0,
      bestStreak: 2,
    });
  });
});

describe('calculateWeeklyGoalStreak (meta de 3x por semana, semana de domingo a sábado)', () => {
  // Semana atual: dom 8/11 a sáb 14/11. Anterior: 1/11 a 7/11. Antes: 25/10 a 31/10.
  it('soma os dias das semanas seguidas que bateram a meta, mais a semana atual em andamento', () => {
    const completions = [
      doneAt('2026-11-10'),
      doneAt('2026-11-06'),
      doneAt('2026-11-04'),
      doneAt('2026-11-02'),
    ];
    expect(calculateWeeklyGoalStreak(completions, 3, NOW).currentStreak).toBe(4);
  });

  it('a semana atual sem conclusões não zera o que veio antes', () => {
    const completions = [
      doneAt('2026-11-06'),
      doneAt('2026-11-04'),
      doneAt('2026-11-02'),
      doneAt('2026-10-30'),
      doneAt('2026-10-28'),
      doneAt('2026-10-26'),
    ];
    expect(calculateWeeklyGoalStreak(completions, 3, NOW).currentStreak).toBe(6);
  });

  it('semana anterior abaixo da meta interrompe a sequência', () => {
    const completions = [doneAt('2026-11-10'), doneAt('2026-11-06'), doneAt('2026-11-04')];
    expect(calculateWeeklyGoalStreak(completions, 3, NOW).currentStreak).toBe(1);
  });

  it('considera todo o histórico no recorde, não só as últimas 53 semanas', () => {
    // Três semanas seguidas com meta, há mais de um ano.
    const old = [
      '2025-03-02',
      '2025-03-03',
      '2025-03-04',
      '2025-03-09',
      '2025-03-10',
      '2025-03-11',
      '2025-03-16',
      '2025-03-17',
      '2025-03-18',
    ].map((d) => doneAt(d));
    expect(calculateWeeklyGoalStreak(old, 3, NOW).bestStreak).toBe(9);
  });
});
