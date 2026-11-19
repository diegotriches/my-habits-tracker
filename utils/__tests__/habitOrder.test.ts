import { applyOrder, nextSortOrder, sortHabits } from '../habitOrder';

const h = (id: string, sort_order: number | null, created_at = '2026-10-01T12:00:00.000Z') => ({
  id,
  sort_order,
  created_at,
});
const ids = (list: { id: string }[]) => list.map((x) => x.id);

describe('sortHabits', () => {
  it('ordenados primeiro, pelo sort_order', () => {
    expect(ids(sortHabits([h('c', 3), h('a', 1), h('b', 2)]))).toEqual(['a', 'b', 'c']);
  });

  it('sem ordem vêm depois, do mais antigo para o mais novo', () => {
    const list = [
      h('novo', null, '2026-11-10T12:00:00.000Z'),
      h('ordenado', 1, '2026-11-11T12:00:00.000Z'),
      h('antigo', null, '2026-10-01T12:00:00.000Z'),
    ];
    expect(ids(sortHabits(list))).toEqual(['ordenado', 'antigo', 'novo']);
  });

  it('empate de sort_order desempata pela criação; cache antigo sem o campo funciona', () => {
    const list = [
      h('b', 1, '2026-11-02T12:00:00.000Z'),
      h('a', 1, '2026-11-01T12:00:00.000Z'),
      { id: 'sem-campo', created_at: '2026-01-01T12:00:00.000Z' },
    ];
    expect(ids(sortHabits(list))).toEqual(['a', 'b', 'sem-campo']);
  });

  it('não altera o array recebido', () => {
    const list = [h('b', 2), h('a', 1)];
    sortHabits(list);
    expect(ids(list)).toEqual(['b', 'a']);
  });
});

describe('applyOrder', () => {
  it('aplica a ordem e renumera a partir de 1', () => {
    const result = applyOrder([h('a', 1), h('b', 2), h('c', 3)], ['c', 'a', 'b']);
    expect(result.map((x) => [x.id, x.sort_order])).toEqual([
      ['c', 1],
      ['a', 2],
      ['b', 3],
    ]);
  });

  it('hábitos fora da lista (criados depois) vão para o fim; ids sumidos são ignorados', () => {
    const result = applyOrder([h('a', 1), h('b', 2), h('novo', 3)], ['b', 'excluido', 'a']);
    expect(ids(result)).toEqual(['b', 'a', 'novo']);
  });
});

describe('nextSortOrder', () => {
  it('depois do maior', () => {
    expect(nextSortOrder([h('a', 1), h('b', 5), h('c', null)])).toBe(6);
  });

  it('ninguém com ordem: null (entra no fim pela data de criação)', () => {
    expect(nextSortOrder([h('a', null)])).toBeNull();
    expect(nextSortOrder([])).toBeNull();
  });
});
