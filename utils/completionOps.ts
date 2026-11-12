// utils/completionOps.ts
//
// Operações de marcação (modo offline) — lógica pura, sem acesso ao banco nem
// ao armazenamento: usada pela fila de saída (services/completionOutbox.ts) e
// pelas telas, e coberta por testes.
import { format, isSameDay, startOfDay } from 'date-fns';
import { Completion } from '@/types/database';

export interface CompletionOp {
  id: string;
  userId: string;
  habitId: string;
  /** Dia local da marcação (yyyy-MM-dd). */
  day: string;
  kind: 'complete' | 'uncomplete';
  /** ISO do completed_at a gravar (complete). */
  completedAt: string;
  /** Valor final do dia, para hábitos com meta; null nos demais. */
  value: number | null;
  createdAt: string;
}

/**
 * Aplica as operações ainda não enviadas sobre uma lista de conclusões (vinda
 * do cache offline ou do banco), para a tela refletir o que o usuário fez —
 * inclusive em sessões anteriores do app. Mesma regra do envio: desmarcar
 * remove o dia; marcar adiciona (ou, com meta, troca o valor).
 */
export function applyPendingOps(completions: Completion[], ops: CompletionOp[]): Completion[] {
  let result = completions;
  for (const op of ops) {
    const inSlot = (c: Completion) =>
      c.habit_id === op.habitId && format(new Date(c.completed_at), 'yyyy-MM-dd') === op.day;

    if (op.kind === 'uncomplete') {
      result = result.filter(c => !inSlot(c));
      continue;
    }

    const index = result.findIndex(inSlot);
    if (index >= 0) {
      if (op.value !== null) {
        result = result.map((c, i) => (i === index ? { ...c, value_achieved: op.value } : c));
      }
      continue;
    }
    result = [
      {
        id: `pending-${op.id}`,
        habit_id: op.habitId,
        completed_at: op.completedAt,
        value_achieved: op.value,
        was_synced: false,
        created_at: op.createdAt,
      },
      ...result,
    ];
  }
  return result;
}

/**
 * Dia local e completed_at de uma marcação em `date`: hoje grava a hora atual
 * (como o fluxo de hoje sempre fez); dias passados, o início do dia.
 */
export function completionDayFields(date: Date): Pick<CompletionOp, 'day' | 'completedAt'> {
  const now = new Date();
  return {
    day: format(date, 'yyyy-MM-dd'),
    completedAt: (isSameDay(date, now) ? now : startOfDay(date)).toISOString(),
  };
}
