import { computeYearHeatmap, heatLevel } from '../yearHeatmap';
import { NOW, local, makeHabit } from './testHelpers';

// NOW = quarta, 11/11/2026. makeHabit cria em 01/10/2026.
const done = (habitId: string, day: string, value: number | null = null) => ({
  habit_id: habitId,
  completed_at: local(day).toISOString(),
  value_achieved: value,
});

const dayOf = (heatmap: ReturnType<typeof computeYearHeatmap>, date: string) => {
  const month = Number(date.slice(5, 7)) - 1;
  return heatmap.months[month].days.find((d) => d.date === date)!;
};

describe('heatLevel', () => {
  it('vai de 0 (nada) a 4 (tudo feito)', () => {
    expect(heatLevel(0, 0)).toBe(0);
    expect(heatLevel(3, 0)).toBe(0);
    expect(heatLevel(4, 1)).toBe(1);
    expect(heatLevel(2, 1)).toBe(2);
    expect(heatLevel(4, 3)).toBe(3);
    expect(heatLevel(3, 3)).toBe(4);
  });
});

describe('computeYearHeatmap', () => {
  it('monta os 12 meses, alinhados pelo dia da semana do dia 1', () => {
    const { months } = computeYearHeatmap([], [], 2026, NOW);
    expect(months).toHaveLength(12);
    expect(months[1].days).toHaveLength(28); // fevereiro de 2026
    expect(months[10].firstWeekday).toBe(0); // 1/11/2026 é domingo
  });

  it('conta os hábitos do dia e os feitos', () => {
    const habits = [makeHabit({ id: 'a' }), makeHabit({ id: 'b' })];
    const heatmap = computeYearHeatmap(habits, [done('a', '2026-11-10')], 2026, NOW);
    expect(dayOf(heatmap, '2026-11-10')).toMatchObject({ due: 2, done: 1, level: 2 });
  });

  it('antes da criação do hábito e dias futuros não contam', () => {
    const heatmap = computeYearHeatmap([makeHabit()], [], 2026, NOW);
    expect(dayOf(heatmap, '2026-09-30').due).toBe(0);
    expect(dayOf(heatmap, '2026-10-01').due).toBe(1);
    expect(dayOf(heatmap, '2026-11-12')).toMatchObject({ due: 0, future: true });
  });

  it('dias específicos: só os dias da agenda contam', () => {
    const habit = makeHabit({ frequency_type: 'weekly', frequency_days: [1] }); // segunda
    const heatmap = computeYearHeatmap([habit], [], 2026, NOW);
    expect(dayOf(heatmap, '2026-11-09').due).toBe(1); // segunda
    expect(dayOf(heatmap, '2026-11-10').due).toBe(0); // terça
  });

  it('meta semanal: conta só nos dias feitos (sem dia fixo, não há falha)', () => {
    const habit = makeHabit({ frequency_goal_value: 3, frequency_goal_period: 'week' });
    const heatmap = computeYearHeatmap([habit], [done('habit-1', '2026-11-10')], 2026, NOW);
    expect(dayOf(heatmap, '2026-11-10')).toMatchObject({ due: 1, done: 1 });
    expect(dayOf(heatmap, '2026-11-09').due).toBe(0);
  });

  it('meta numérica: só conta como feito ao atingir o valor', () => {
    const habit = makeHabit({ has_target: true, target_value: 5 });
    const heatmap = computeYearHeatmap(
      [habit],
      [done('habit-1', '2026-11-09', 3), done('habit-1', '2026-11-10', 5)],
      2026,
      NOW
    );
    expect(dayOf(heatmap, '2026-11-09')).toMatchObject({ due: 1, done: 0 });
    expect(dayOf(heatmap, '2026-11-10')).toMatchObject({ due: 1, done: 1 });
  });

  it('arquivado: conta até o dia anterior ao arquivamento', () => {
    const habit = makeHabit({ archived_at: local('2026-11-05').toISOString() });
    const heatmap = computeYearHeatmap([habit], [], 2026, NOW);
    expect(dayOf(heatmap, '2026-11-04').due).toBe(1);
    expect(dayOf(heatmap, '2026-11-05').due).toBe(0);
  });

  it('conclusões de outro ano ou de hábitos fora do filtro são ignoradas', () => {
    const heatmap = computeYearHeatmap(
      [makeHabit({ id: 'a', created_at: local('2025-01-01').toISOString() })],
      [done('a', '2025-12-31'), done('outro', '2026-11-10')],
      2026,
      NOW
    );
    expect(heatmap.stats.completions).toBe(0);
  });

  it('totais do ano: conclusões, dias perfeitos e aproveitamento', () => {
    // Criado em 08/11: 4 dias até hoje (8 a 11), feito em 2 deles.
    const habit = makeHabit({ created_at: local('2026-11-08').toISOString() });
    const heatmap = computeYearHeatmap(
      [habit],
      [done('habit-1', '2026-11-08'), done('habit-1', '2026-11-11')],
      2026,
      NOW
    );
    expect(heatmap.stats).toEqual({ completions: 2, perfectDays: 2, dueDays: 4, rate: 50 });
    expect(heatmap.months[10]).toMatchObject({ due: 4, done: 2 });
  });

  it('sem nada programado, o aproveitamento é null', () => {
    expect(computeYearHeatmap([], [], 2026, NOW).stats.rate).toBeNull();
  });
});
