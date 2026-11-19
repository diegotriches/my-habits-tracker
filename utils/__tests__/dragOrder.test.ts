import { autoScrollStep, dropIndex, moveItem, offsetToIndex, shiftFor } from '../dragOrder';

describe('moveItem', () => {
  it('move para baixo e para cima', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(moveItem(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('mesma posição ou índice inválido: mesma ordem, sem alterar a recebida', () => {
    const list = ['a', 'b'];
    expect(moveItem(list, 1, 1)).toEqual(['a', 'b']);
    expect(moveItem(list, 5, 0)).toEqual(['a', 'b']);
    expect(moveItem(list, 0, 9)).toEqual(['b', 'a']); // destino além do fim vai para o fim
    expect(list).toEqual(['a', 'b']);
  });
});

describe('dropIndex', () => {
  // Três cards de 100px: centros 50, 150, 250.
  const centers = [50, 150, 250];

  it('sem passar do centro do vizinho, fica onde está', () => {
    expect(dropIndex(centers, 0, 140)).toBe(0);
  });

  it('passou do centro do vizinho de baixo: troca com ele', () => {
    expect(dropIndex(centers, 0, 160)).toBe(1);
    expect(dropIndex(centers, 0, 400)).toBe(2);
  });

  it('para cima', () => {
    expect(dropIndex(centers, 2, 140)).toBe(1);
    expect(dropIndex(centers, 2, -50)).toBe(0);
  });
});

describe('shiftFor', () => {
  it('arrastando para baixo, os do caminho sobem', () => {
    expect([0, 1, 2, 3].map((i) => shiftFor(i, 0, 2, 100))).toEqual([0, -100, -100, 0]);
  });

  it('arrastando para cima, os do caminho descem', () => {
    expect([0, 1, 2, 3].map((i) => shiftFor(i, 3, 1, 100))).toEqual([0, 100, 100, 0]);
  });

  it('sem arrasto, nada se move', () => {
    expect(shiftFor(1, -1, -1, 100)).toBe(0);
  });
});

describe('offsetToIndex', () => {
  const heights = [100, 120, 80];

  it('soma as alturas dos itens pulados', () => {
    expect(offsetToIndex(heights, 0, 2)).toBe(200);
    expect(offsetToIndex(heights, 2, 0)).toBe(-220);
    expect(offsetToIndex(heights, 1, 1)).toBe(0);
  });
});

describe('autoScrollStep', () => {
  it('no meio da tela não rola', () => {
    expect(autoScrollStep(300, 600, 80, 10)).toBe(0);
  });

  it('perto do topo rola para cima, mais rápido quanto mais perto', () => {
    expect(autoScrollStep(40, 600, 80, 10)).toBe(-5);
    expect(autoScrollStep(-20, 600, 80, 10)).toBe(-10);
  });

  it('perto do fundo rola para baixo', () => {
    expect(autoScrollStep(560, 600, 80, 10)).toBe(5);
  });

  it('sem medida da tela ainda, não rola', () => {
    expect(autoScrollStep(10, 0, 80, 10)).toBe(0);
  });
});
