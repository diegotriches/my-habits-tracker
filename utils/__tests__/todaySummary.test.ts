import { computeTodaySummary } from '../todaySummary';
import { NOW, local, makeHabit } from './testHelpers';

// NOW = quarta, 11/11/2026. Semana: domingo 8/11 a sábado 14/11.
const done = (habitId: string, day: string, value: number | null = null) => ({
  habit_id: habitId,
  completed_at: local(day).toISOString(),
  value_achieved: value,
});

describe('computeTodaySummary', () => {
  it('hábitos diários: conta todos e os feitos hoje', () => {
    const habits = [makeHabit({ id: 'a' }), makeHabit({ id: 'b' }), makeHabit({ id: 'c' })];
    const summary = computeTodaySummary(
      habits,
      [done('a', '2026-11-11'), done('b', '2026-11-10')],
      NOW
    );
    expect(summary).toEqual({ due: 3, done: 1, allDone: false });
  });

  it('dias específicos: só conta se hoje é um dos dias', () => {
    const habits = [
      makeHabit({ id: 'qua', frequency_type: 'weekly', frequency_days: [3] }), // quarta
      makeHabit({ id: 'seg', frequency_type: 'weekly', frequency_days: [1] }), // segunda
    ];
    expect(computeTodaySummary(habits, [], NOW)).toEqual({ due: 1, done: 0, allDone: false });
  });

  it('meta semanal ainda não batida conta para hoje', () => {
    const habit = makeHabit({ id: 'g', frequency_goal_value: 3, frequency_goal_period: 'week' });
    const completions = [done('g', '2026-11-09'), done('g', '2026-11-10')];
    expect(computeTodaySummary([habit], completions, NOW)).toEqual({
      due: 1,
      done: 0,
      allDone: false,
    });
  });

  it('meta semanal já batida não cobra o dia de hoje', () => {
    const habit = makeHabit({ id: 'g', frequency_goal_value: 2, frequency_goal_period: 'week' });
    const completions = [done('g', '2026-11-09'), done('g', '2026-11-10')];
    expect(computeTodaySummary([habit], completions, NOW)).toEqual({
      due: 0,
      done: 0,
      allDone: false,
    });
  });

  it('meta semanal: conclusões da semana anterior não contam', () => {
    const habit = makeHabit({ id: 'g', frequency_goal_value: 2, frequency_goal_period: 'week' });
    const completions = [done('g', '2026-11-06'), done('g', '2026-11-07')];
    expect(computeTodaySummary([habit], completions, NOW).due).toBe(1);
  });

  it('meta semanal feita hoje conta como feita, mesmo batendo a meta', () => {
    const habit = makeHabit({ id: 'g', frequency_goal_value: 2, frequency_goal_period: 'week' });
    const completions = [done('g', '2026-11-09'), done('g', '2026-11-11')];
    expect(computeTodaySummary([habit], completions, NOW)).toEqual({
      due: 1,
      done: 1,
      allDone: true,
    });
  });

  it('meta numérica: só conta como feito ao atingir a meta', () => {
    const habit = makeHabit({ id: 'km', has_target: true, target_value: 5, target_unit: 'km' });
    expect(computeTodaySummary([habit], [done('km', '2026-11-11', 3)], NOW).done).toBe(0);
    expect(computeTodaySummary([habit], [done('km', '2026-11-11', 5)], NOW).done).toBe(1);
  });

  it('tudo feito', () => {
    const habits = [makeHabit({ id: 'a' }), makeHabit({ id: 'b' })];
    const summary = computeTodaySummary(
      habits,
      [done('a', '2026-11-11'), done('b', '2026-11-11')],
      NOW
    );
    expect(summary).toEqual({ due: 2, done: 2, allDone: true });
  });

  it('nenhum hábito para hoje não é "tudo feito"', () => {
    expect(computeTodaySummary([], [], NOW)).toEqual({ due: 0, done: 0, allDone: false });
  });
});
