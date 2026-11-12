// services/completionOutbox.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { endOfDay, parseISO, startOfDay } from 'date-fns';
import { supabase } from './supabase';
import { retroactiveCompletionService } from './retroactiveCompletionService';
import { CompletionOp } from '@/utils/completionOps';

// Reexportados: as telas importam daqui.
export type { CompletionOp } from '@/utils/completionOps';
export { applyPendingOps, completionDayFields } from '@/utils/completionOps';

/**
 * Fila de saída das marcações (modo offline, fase 1 — ver docs/offline-mode.md).
 *
 * Toda marcação/desmarcação feita no app entra aqui e é enviada ao banco em
 * seguida; sem conexão, fica guardada no aparelho e é reenviada depois (ao
 * abrir o app, ao voltar ao primeiro plano ou na próxima marcação). Assim a
 * UI otimista só precisa reverter em erro definitivo, nunca por falta de rede.
 *
 * - Uma operação por hábito + dia: a nova substitui a anterior ("vale a
 *   última"), então marcar e desmarcar offline não gera idas e vindas.
 * - Envio idempotente: reenviar uma operação já gravada não duplica nada.
 * - Metas numéricas guardam o valor final, não um incremento.
 */

/**
 * - `synced`: gravada no banco.
 * - `superseded`: substituída por uma operação mais nova do mesmo hábito/dia.
 * - `dropped`: erro definitivo (ex.: hábito excluído, outra conta); a UI deve
 *   reverter.
 */
export type OutboxResult = 'synced' | 'superseded' | 'dropped';

/** Emitido quando operações sem tela esperando por elas (ex.: de uma sessão
 *  anterior do app) foram gravadas — as telas devem buscar os dados de novo. */
export const OUTBOX_SYNCED_EVENT = 'CompletionOutboxSynced';

/** Emitido sempre que a fila muda (entrou ou saiu uma operação) — para o
 *  indicador de pendências. */
export const OUTBOX_CHANGED_EVENT = 'CompletionOutboxChanged';

const STORAGE_KEY = 'completion_outbox_v1';

// Promessas de quem enfileirou, por id da operação. Ficam só em memória: se o
// app fechar antes do envio, a operação continua no AsyncStorage e é enviada
// na próxima sessão, que avisa as telas por OUTBOX_SYNCED_EVENT.
const waiters = new Map<string, (result: OutboxResult) => void>();

let flushing: Promise<void> | null = null;
let flushAgain = false;

async function readQueue(): Promise<CompletionOp[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CompletionOp[]) : [];
  } catch (error) {
    console.warn('Fila de marcações ilegível, descartando:', error);
    return [];
  }
}

async function writeQueue(queue: CompletionOp[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  DeviceEventEmitter.emit(OUTBOX_CHANGED_EVENT);
}

function resolveWaiter(id: string, result: OutboxResult) {
  const resolve = waiters.get(id);
  if (resolve) {
    waiters.delete(id);
    resolve(result);
  }
}

/**
 * Falha temporária (manter na fila) x erro definitivo (descartar). Erros de
 * rede chegam sem `code`; os do PostgREST/Postgres trazem um (ex.: 23503 = o
 * hábito não existe mais, 42501 = sem permissão). PGRST3xx são de token JWT
 * (ex.: expirado) e se resolvem quando a sessão é renovada.
 */
function isTransient(error: { code?: string; message?: string }): boolean {
  if (!error.code) return true;
  return error.code.startsWith('PGRST3');
}

type SendResult = 'synced' | 'retry' | 'dropped';

async function sendOp(op: CompletionOp): Promise<SendResult> {
  const day = parseISO(op.day);
  const from = startOfDay(day).toISOString();
  const to = endOfDay(day).toISOString();

  const fail = (error: { code?: string; message?: string }): SendResult => {
    if (isTransient(error)) return 'retry';
    console.error('Marcação descartada:', op, error);
    return 'dropped';
  };

  if (op.kind === 'uncomplete') {
    // Apaga o dia inteiro (cobre duplicatas); nada a apagar também é sucesso.
    const { error } = await supabase
      .from('completions')
      .delete()
      .eq('habit_id', op.habitId)
      .gte('completed_at', from)
      .lte('completed_at', to);
    return error ? fail(error) : 'synced';
  }

  const { data: existing, error: fetchError } = await supabase
    .from('completions')
    .select('id')
    .eq('habit_id', op.habitId)
    .gte('completed_at', from)
    .lte('completed_at', to)
    .limit(1);
  if (fetchError) return fail(fetchError);

  if (existing && existing.length > 0) {
    // Sem meta: o dia já está concluído. Com meta: grava o valor final.
    if (op.value === null) return 'synced';
    const { error } = await supabase
      .from('completions')
      .update({ value_achieved: op.value })
      .eq('id', existing[0].id);
    return error ? fail(error) : 'synced';
  }

  const { error: insertError } = await supabase.from('completions').insert({
    habit_id: op.habitId,
    completed_at: op.completedAt,
    value_achieved: op.value,
    was_synced: true,
  });
  return insertError ? fail(insertError) : 'synced';
}

async function runFlush(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user.id;
  if (!userId) return;

  let queue = await readQueue();
  const syncedHabits = new Set<string>();
  // Ops gravadas cujos waiters só são resolvidos depois do recálculo do
  // streak, para a tela já ler o streak certo ao ser avisada.
  const syncedOps: string[] = [];
  let syncedWithoutWaiter = false;

  while (queue.length > 0) {
    const op = queue[0];
    // Operação de outra conta que usou o app: não é desta sessão.
    const result: SendResult = op.userId === userId ? await sendOp(op) : 'dropped';
    if (result === 'retry') break; // sem rede: tenta tudo de novo depois

    // Relê antes de remover: novas operações podem ter entrado durante o envio.
    queue = (await readQueue()).filter(o => o.id !== op.id);
    await writeQueue(queue);

    if (result === 'synced') {
      syncedHabits.add(op.habitId);
      syncedOps.push(op.id);
      if (!waiters.has(op.id)) syncedWithoutWaiter = true;
    } else {
      resolveWaiter(op.id, 'dropped');
    }
  }

  for (const habitId of syncedHabits) {
    await retroactiveCompletionService.recalculateStreak(habitId);
  }
  for (const id of syncedOps) resolveWaiter(id, 'synced');

  if (syncedWithoutWaiter) DeviceEventEmitter.emit(OUTBOX_SYNCED_EVENT);
}

export const completionOutbox = {
  /**
   * Enfileira uma marcação/desmarcação e tenta enviá-la. A promessa só se
   * resolve quando ela for gravada (inclusive com o streak recalculado),
   * substituída ou descartada — sem rede, pode levar até a próxima sessão.
   */
  async enqueue(input: Omit<CompletionOp, 'id' | 'createdAt'>): Promise<OutboxResult> {
    const op: CompletionOp = {
      ...input,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      createdAt: new Date().toISOString(),
    };

    const result = new Promise<OutboxResult>(resolve => waiters.set(op.id, resolve));

    const queue = await readQueue();
    const kept = queue.filter(o => {
      const sameSlot = o.habitId === op.habitId && o.day === op.day;
      if (sameSlot) resolveWaiter(o.id, 'superseded');
      return !sameSlot;
    });
    await writeQueue([...kept, op]);

    void completionOutbox.flush();
    return result;
  },

  /** Envia o que estiver pendente. Nunca roda duas vezes em paralelo. */
  flush(): Promise<void> {
    if (flushing) {
      flushAgain = true;
      return flushing;
    }
    flushing = (async () => {
      do {
        flushAgain = false;
        try {
          await runFlush();
        } catch (error) {
          console.error('Erro ao enviar fila de marcações:', error);
        }
      } while (flushAgain);
    })().finally(() => {
      flushing = null;
    });
    return flushing;
  },

  /** Operações deste usuário que aguardam envio, na ordem da fila. */
  async getPendingOps(userId: string): Promise<CompletionOp[]> {
    return (await readQueue()).filter(op => op.userId === userId);
  },

  /** Quantas operações aguardam envio. */
  async pendingCount(): Promise<number> {
    return (await readQueue()).length;
  },
};
