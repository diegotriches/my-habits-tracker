import { applyPendingOps, completionDayFields, CompletionOp } from '../completionOps';
import { Completion } from '@/types/database';
import { NOW, local } from './testHelpers';

const completion = (
  habitId: string,
  day: string,
  value: number | null = null,
  time = '12:00'
): Completion => ({
  id: `${habitId}-${day}-${time}`,
  habit_id: habitId,
  completed_at: local(day, time).toISOString(),
  value_achieved: value,
  was_synced: true,
  created_at: local(day, time).toISOString(),
});

const op = (
  kind: CompletionOp['kind'],
  habitId: string,
  day: string,
  value: number | null = null
): CompletionOp => ({
  id: `op-${kind}-${habitId}-${day}`,
  userId: 'user-1',
  habitId,
  day,
  kind,
  completedAt: local(day).toISOString(),
  value,
  createdAt: NOW.toISOString(),
});

describe('applyPendingOps', () => {
  it('marcação pendente aparece na lista', () => {
    const result = applyPendingOps([], [op('complete', 'h1', '2026-11-10')]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ habit_id: 'h1', was_synced: false });
  });

  it('marcar um dia que já está concluído não duplica', () => {
    const result = applyPendingOps(
      [completion('h1', '2026-11-10')],
      [op('complete', 'h1', '2026-11-10')]
    );
    expect(result).toHaveLength(1);
  });

  it('com meta, a marcação pendente troca o valor do dia', () => {
    const result = applyPendingOps(
      [completion('h1', '2026-11-10', 2)],
      [op('complete', 'h1', '2026-11-10', 5)]
    );
    expect(result).toHaveLength(1);
    expect(result[0].value_achieved).toBe(5);
  });

  it('desmarcar remove todas as conclusões daquele dia (inclusive duplicatas)', () => {
    const list = [
      completion('h1', '2026-11-10', null, '08:00'),
      completion('h1', '2026-11-10', null, '20:00'),
    ];
    expect(applyPendingOps(list, [op('uncomplete', 'h1', '2026-11-10')])).toHaveLength(0);
  });

  it('não mexe em outros hábitos nem em outros dias', () => {
    const list = [completion('h1', '2026-11-09'), completion('h2', '2026-11-10')];
    const result = applyPendingOps(list, [op('uncomplete', 'h1', '2026-11-10')]);
    expect(result).toEqual(list);
  });

  it('aplica na ordem da fila: marcar e depois desmarcar deixa o dia vazio', () => {
    const ops = [op('complete', 'h1', '2026-11-10'), op('uncomplete', 'h1', '2026-11-10')];
    expect(applyPendingOps([], ops)).toHaveLength(0);
  });

  it('usa o dia local: 23:30 pertence ao próprio dia, mesmo sendo o dia seguinte em UTC', () => {
    const late = completion('h1', '2026-11-10', null, '23:30');
    expect(applyPendingOps([late], [op('uncomplete', 'h1', '2026-11-10')])).toHaveLength(0);
    expect(applyPendingOps([late], [op('uncomplete', 'h1', '2026-11-11')])).toHaveLength(1);
  });
});

describe('completionDayFields', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });
  afterEach(() => jest.useRealTimers());

  it('hoje grava o horário atual', () => {
    expect(completionDayFields(local('2026-11-11', '00:00'))).toEqual({
      day: '2026-11-11',
      completedAt: NOW.toISOString(),
    });
  });

  it('dia passado grava o início do dia local', () => {
    expect(completionDayFields(local('2026-11-09', '18:00'))).toEqual({
      day: '2026-11-09',
      completedAt: local('2026-11-09', '00:00').toISOString(),
    });
  });
});
