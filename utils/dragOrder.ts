// utils/dragOrder.ts
//
// Contas do arrastar para reordenar (DraggableHabitList) — lógica pura,
// coberta por testes. As funções marcadas com 'worklet' rodam também na
// thread de UI (Reanimated), a cada quadro do arrasto.

/** Lista com o item de `from` movido para `to` (não altera a recebida). */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  'worklet';
  const result = list.slice();
  if (from < 0 || from >= result.length || from === to) return result;
  const [moved] = result.splice(from, 1);
  result.splice(Math.max(0, Math.min(to, result.length)), 0, moved);
  return result;
}

/**
 * Centro (y) de cada item, empilhados a partir de `top` na ordem dada.
 * Calculado das alturas, e não do `y` medido de cada item, que pode estar
 * velho logo depois de uma reordenação.
 */
export function centersFor(heights: number[], top: number): number[] {
  'worklet';
  const centers: number[] = [];
  let y = top;
  for (const h of heights) {
    centers.push(y + h / 2);
    y += h;
  }
  return centers;
}

/**
 * Posição em que o item arrastado cairia: quantos dos outros itens têm o
 * centro acima do centro do item arrastado.
 *
 * @param centers centro (y) de cada item na posição original, na ordem da lista
 * @param from    índice do item arrastado
 * @param activeCenter centro (y) atual do item arrastado
 */
export function dropIndex(centers: number[], from: number, activeCenter: number): number {
  'worklet';
  let index = 0;
  for (let i = 0; i < centers.length; i++) {
    if (i !== from && centers[i] < activeCenter) index++;
  }
  return index;
}

/**
 * Quanto um item que não está sendo arrastado se desloca para abrir espaço:
 * os que ficam entre a origem e o destino sobem (ou descem) a altura do
 * item arrastado.
 */
export function shiftFor(index: number, from: number, to: number, activeHeight: number): number {
  'worklet';
  if (from < 0 || index === from) return 0;
  if (from < to && index > from && index <= to) return -activeHeight;
  if (to < from && index >= to && index < from) return activeHeight;
  return 0;
}

/**
 * Deslocamento até o destino do item arrastado, somando as alturas dos itens
 * que ele "pula" (para cima é negativo).
 */
export function offsetToIndex(heights: number[], from: number, to: number): number {
  'worklet';
  let offset = 0;
  if (to > from) for (let i = from + 1; i <= to; i++) offset += heights[i] ?? 0;
  if (to < from) for (let i = to; i < from; i++) offset -= heights[i] ?? 0;
  return offset;
}

/**
 * Rolagem automática perto das bordas: pixels por quadro (negativo = para
 * cima), mais rápida quanto mais perto da borda. 0 fora da faixa da borda.
 *
 * @param fingerY posição do dedo dentro da área visível da lista
 */
export function autoScrollStep(
  fingerY: number,
  viewportHeight: number,
  edge: number,
  maxStep: number
): number {
  'worklet';
  if (viewportHeight <= 0) return 0;
  if (fingerY < edge) return -maxStep * Math.min(1, (edge - fingerY) / edge);
  const fromBottom = viewportHeight - fingerY;
  if (fromBottom < edge) return maxStep * Math.min(1, (edge - fromBottom) / edge);
  return 0;
}
