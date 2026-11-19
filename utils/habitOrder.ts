// utils/habitOrder.ts
//
// Ordem dos hábitos na tela inicial — lógica pura, coberta por testes.
// A ordem fica no banco (`habits.sort_order`, menor = mais acima); hábitos sem
// valor vêm depois dos ordenados, do mais antigo para o mais novo — o mesmo
// lugar em que um hábito novo entra (o fim da lista, junto do "Novo hábito").

type Orderable = { id: string; sort_order?: number | null; created_at: string };

function compare(a: Orderable, b: Orderable): number {
  const sa = a.sort_order ?? null;
  const sb = b.sort_order ?? null;
  if (sa !== null && sb !== null && sa !== sb) return sa - sb;
  if (sa !== null && sb === null) return -1;
  if (sa === null && sb !== null) return 1;
  // Empate (ou os dois sem ordem): data de criação, e o id para ser estável.
  return a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id);
}

/** Hábitos na ordem da tela inicial (não altera o array recebido). */
export function sortHabits<T extends Orderable>(habits: T[]): T[] {
  return [...habits].sort(compare);
}

/**
 * Aplica uma ordem de ids (ex.: a arrastada na tela, ainda não enviada):
 * os hábitos listados vêm primeiro, nessa ordem, com `sort_order` 1, 2, 3...;
 * os que não estão na lista (criados depois) vêm em seguida, na ordem atual.
 * Ids que não existem mais são ignorados.
 */
export function applyOrder<T extends Orderable>(habits: T[], orderedIds: string[]): T[] {
  const byId = new Map(habits.map((h) => [h.id, h]));
  const listed: T[] = [];
  for (const id of orderedIds) {
    const habit = byId.get(id);
    if (!habit) continue;
    byId.delete(id);
    listed.push(habit);
  }
  const rest = sortHabits([...byId.values()]);
  return [...listed, ...rest].map((h, i) => ({ ...h, sort_order: i + 1 }));
}

/** `sort_order` de um hábito novo: depois de todos (null se ninguém tem ordem). */
export function nextSortOrder(habits: Orderable[]): number | null {
  let max: number | null = null;
  for (const h of habits) {
    if (h.sort_order != null && (max === null || h.sort_order > max)) max = h.sort_order;
  }
  return max === null ? null : max + 1;
}
