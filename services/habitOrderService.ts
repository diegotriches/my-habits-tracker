// services/habitOrderService.ts
//
// Envia ao banco a ordem dos hábitos arrastada na tela inicial.
//
// A ordem nova vale na hora (a tela já a mostra) e fica pendente no aparelho
// até ser gravada — inclusive sem conexão: a pendência é enviada na próxima
// oportunidade (ao abrir o app, ao voltar para o primeiro plano, ao
// reconectar). Só a última ordem importa, então a pendência é uma lista só.
// Enquanto ela existir, as buscas de hábitos a aplicam por cima do que vier do
// banco, para a lista não "pular" de volta para a ordem antiga.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { emitHabitsChanged } from './habitEvents';

const PENDING_KEY = 'habit_order_pending_v1';
/** Chave da versão antiga, em que a ordem ficava só no aparelho. */
const LEGACY_KEY = 'habit_order';

interface PendingOrder {
  userId: string;
  ids: string[];
}

let inFlight: Promise<void> | null = null;
/** Pedido de envio feito enquanto outro estava em andamento: roda de novo no fim. */
let flushAgain = false;
/** Sobe a cada `save`: diz se chegou uma ordem nova durante o envio. */
let saveVersion = 0;

async function readPending(): Promise<PendingOrder | null> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as PendingOrder) : null;
  } catch {
    return null;
  }
}

async function runFlush(userId: string): Promise<void> {
  // Repete enquanto chegar uma ordem nova durante o envio.
  for (;;) {
    const version = saveVersion;
    const pending = await readPending();
    if (!pending) return;
    if (pending.userId !== userId) {
      // De outra conta (não deveria sobrar após o logout): descarta.
      await AsyncStorage.removeItem(PENDING_KEY).catch(() => {});
      return;
    }

    const { error } = await supabase.rpc('set_habit_order', { habit_ids: pending.ids });
    if (error) {
      // Sem conexão ou erro do servidor: fica para a próxima oportunidade.
      console.warn('Ordem dos hábitos não enviada (fica pendente):', error.message);
      return;
    }

    if (saveVersion !== version) continue; // arrastou de novo durante o envio
    await AsyncStorage.removeItem(PENDING_KEY).catch(() => {});
    // As outras telas (cada uma com seu useHabits) passam a ver a ordem nova.
    emitHabitsChanged();
    return;
  }
}

export const habitOrderService = {
  /** Ordem ainda não gravada no banco desta conta (null = nenhuma). */
  async pendingOrder(userId: string): Promise<string[] | null> {
    const pending = await readPending();
    return pending && pending.userId === userId ? pending.ids : null;
  },

  /** Guarda a ordem nova e tenta enviá-la. */
  async save(userId: string, ids: string[]): Promise<void> {
    saveVersion++;
    try {
      await AsyncStorage.setItem(PENDING_KEY, JSON.stringify({ userId, ids } as PendingOrder));
    } catch (error) {
      console.warn('Erro ao guardar a ordem dos hábitos:', error);
    }
    await habitOrderService.flush(userId);
  },

  /** Envia a ordem pendente, se houver. Uma chamada por vez. */
  flush(userId: string): Promise<void> {
    if (inFlight) {
      flushAgain = true;
      return inFlight;
    }
    inFlight = runFlush(userId)
      .catch((error) => console.warn('Erro ao enviar a ordem dos hábitos:', error))
      .finally(() => {
        inFlight = null;
        if (flushAgain) {
          flushAgain = false;
          void habitOrderService.flush(userId);
        }
      });
    return inFlight;
  },

  /**
   * Migração única da versão antiga: se nenhum hábito tem ordem no banco e o
   * aparelho tem a ordem salva localmente, ela vira a pendência a enviar.
   * Devolve essa ordem (para a tela já usá-la) ou null.
   */
  async adoptLegacyOrder(
    userId: string,
    habits: { id: string; sort_order: number | null }[]
  ): Promise<string[] | null> {
    let legacy: string[] | null = null;
    try {
      const raw = await AsyncStorage.getItem(LEGACY_KEY);
      if (!raw) return null;
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) legacy = parsed.filter((id) => typeof id === 'string');
    } catch {
      // ilegível: só apaga
    }
    await AsyncStorage.removeItem(LEGACY_KEY).catch(() => {});

    const known = new Set(habits.map((h) => h.id));
    const ids = (legacy ?? []).filter((id) => known.has(id));
    if (ids.length === 0 || habits.some((h) => h.sort_order !== null)) return null;

    void habitOrderService.save(userId, ids);
    return ids;
  },

  /** No logout: a pendência é da conta que saiu. */
  async clear(): Promise<void> {
    await AsyncStorage.multiRemove([PENDING_KEY, LEGACY_KEY]).catch(() => {});
  },
};
