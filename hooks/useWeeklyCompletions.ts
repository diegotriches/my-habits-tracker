import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/services/supabase';
import { Completion } from '@/types/database';
import { useAuth } from './useAuth';
import { startOfWeek, endOfWeek, format, isWithinInterval, parseISO, subWeeks } from 'date-fns';
import { applyPendingOps, completionOutbox } from '@/services/completionOutbox';
import { pruneCache, readCache, writeCache } from '@/services/offlineCache';

// Semanas guardadas no cache offline (a atual e as anteriores).
const CACHED_WEEKS = 8;

/** Mutação otimista: marcar (add) ou desmarcar (remove) um dia. */
export type OptimisticOp =
  { kind: 'add'; completion: Completion } | { kind: 'remove'; habitId: string; date: Date };

/**
 * Encerra uma mutação otimista. `ok = true` quando a requisição gravou no
 * banco; `false` quando falhou (quem chamou continua responsável por
 * reverter a UI).
 */
export type SettleOptimistic = (ok: boolean) => void;

interface PendingOp {
  op: OptimisticOp;
  // null enquanto a requisição está em andamento. Depois do sucesso, guarda
  // o número da última busca iniciada até então: buscas com número menor ou
  // igual podem ter lido o banco antes da gravação.
  settledAtFetch: number | null;
}

const dayKey = (value: string | Date) => format(new Date(value), 'yyyy-MM-dd');

function applyOp(list: Completion[], op: OptimisticOp): Completion[] {
  if (op.kind === 'add') {
    const day = dayKey(op.completion.completed_at);
    const alreadyThere = list.some(
      (c) =>
        c.id === op.completion.id ||
        (c.habit_id === op.completion.habit_id && dayKey(c.completed_at) === day)
    );
    return alreadyThere ? list : [op.completion, ...list];
  }
  const day = dayKey(op.date);
  return list.filter((c) => c.habit_id !== op.habitId || dayKey(c.completed_at) !== day);
}

/**
 * Hook para buscar completions de uma semana específica (Domingo a Sábado)
 * Chame refetch(date) para buscar completions de qualquer semana
 */
export const useWeeklyCompletions = () => {
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const userIdRef = useRef(user?.id);
  userIdRef.current = user?.id;

  // Número da busca mais recente; respostas de buscas anteriores são
  // descartadas (ex.: trocar de semana rápido e receber fora de ordem).
  const fetchSeqRef = useRef(0);
  const pendingOpsRef = useRef(new Map<number, PendingOp>());
  const opSeqRef = useRef(0);

  const fetchWeeklyCompletions = useCallback(async (refDate?: Date) => {
    const userId = userIdRef.current;
    if (!userId) return;

    const seq = ++fetchSeqRef.current;

    try {
      setLoading(true);

      const target = refDate || new Date();
      const weekStart = startOfWeek(target, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(target, { weekStartsOn: 0 });

      const weekKey = `week:${format(weekStart, 'yyyy-MM-dd')}`;

      // O que a tela mostra = dados (cache ou banco) + marcações ainda na fila
      // de saída (inclusive de sessões anteriores) + mutações otimistas desta
      // sessão que essa leitura pode não refletir. `fromServer` decide se dá
      // para esquecer as mutações já gravadas: só uma leitura do banco
      // iniciada depois da gravação garante que ela está lá.
      const present = async (data: Completion[], fromServer: boolean) => {
        const queued = (await completionOutbox.getPendingOps(userId)).filter((op) =>
          isWithinInterval(parseISO(op.day), { start: weekStart, end: weekEnd })
        );
        let next = applyPendingOps(data, queued);
        for (const [key, pending] of pendingOpsRef.current) {
          if (fromServer && pending.settledAtFetch !== null && pending.settledAtFetch < seq) {
            // Esta busca começou depois da gravação: o banco já reflete.
            pendingOpsRef.current.delete(key);
            continue;
          }
          const { op } = pending;
          if (
            op.kind === 'add' &&
            !isWithinInterval(new Date(op.completion.completed_at), {
              start: weekStart,
              end: weekEnd,
            })
          ) {
            continue; // marcação de outra semana
          }
          next = applyOp(next, op);
        }
        return next;
      };

      // Cache offline primeiro: a semana aparece na hora, mesmo sem rede.
      const cached = await readCache<Completion[]>(weekKey, userId);
      if (cached && seq === fetchSeqRef.current) {
        const shown = await present(cached, false);
        if (seq === fetchSeqRef.current) setCompletions(shown);
      }

      const { data, error: fetchError } = await supabase
        .from('completions')
        // O join com habits só filtra pelo dono; trazer o hábito inteiro em
        // cada conclusão inflava a resposta e o cache offline.
        .select('*, habits!inner (user_id)')
        .eq('habits.user_id', userId)
        .gte('completed_at', weekStart.toISOString())
        .lte('completed_at', weekEnd.toISOString())
        .order('completed_at', { ascending: false });

      if (seq !== fetchSeqRef.current) return;
      if (fetchError) throw fetchError;

      const fresh = (data as Completion[]) || [];
      void writeCache(weekKey, userId, fresh);
      const oldestKept = format(
        startOfWeek(subWeeks(new Date(), CACHED_WEEKS - 1), { weekStartsOn: 0 }),
        'yyyy-MM-dd'
      );
      void pruneCache('week:', (key) => key.slice('week:'.length) >= oldestKept);

      const next = await present(fresh, true);
      if (seq !== fetchSeqRef.current) return;
      setCompletions(next);
      setError(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao buscar completions da semana';
      setError(errorMsg);
      console.error('Erro em useWeeklyCompletions:', errorMsg);
    } finally {
      if (seq === fetchSeqRef.current) setLoading(false);
    }
  }, []);

  const getHabitCompletions = (habitId: string): Completion[] => {
    return completions.filter((c) => c.habit_id === habitId);
  };

  const isCompletedOnDate = (habitId: string, date: Date): boolean => {
    return completions.some((c) => {
      if (c.habit_id !== habitId) return false;
      const completionDate = new Date(c.completed_at);
      return completionDate.toDateString() === date.toDateString();
    });
  };

  const getCompletionOnDate = (habitId: string, date: Date): Completion | undefined => {
    return completions.find((c) => {
      if (c.habit_id !== habitId) return false;
      const completionDate = new Date(c.completed_at);
      return completionDate.toDateString() === date.toDateString();
    });
  };

  const getWeeklyCount = (): number => {
    return completions.length;
  };

  // ===== MUTAÇÃO OTIMISTA =====

  /**
   * Aplica uma marcação/desmarcação na UI na hora e a mantém sobre os
   * refetches até a requisição terminar e uma busca posterior já
   * refleti-la. Chame o `settle` devolvido quando a requisição terminar.
   */
  const applyOptimistic = useCallback((op: OptimisticOp): SettleOptimistic => {
    const key = ++opSeqRef.current;
    pendingOpsRef.current.set(key, { op, settledAtFetch: null });
    setCompletions((prev) => applyOp(prev, op));

    return (ok: boolean) => {
      const pending = pendingOpsRef.current.get(key);
      if (!pending) return;
      if (ok) {
        pending.settledAtFetch = fetchSeqRef.current;
      } else {
        pendingOpsRef.current.delete(key);
      }
    };
  }, []);

  // Mutações locais simples, sem rastreamento — usadas para reverter a UI
  // quando uma requisição otimista falha.

  /** Adiciona uma completion ao estado local (ex.: restaurar após falha). */
  const addOptimisticCompletion = useCallback((completion: Completion) => {
    setCompletions((prev) => [completion, ...prev]);
  }, []);

  /** Remove uma completion do estado local pelo id (real ou otimista). */
  const removeCompletionById = useCallback((id: string) => {
    setCompletions((prev) => prev.filter((c) => c.id !== id));
  }, []);

  // Fetch da semana atual no mount
  useEffect(() => {
    if (user) {
      fetchWeeklyCompletions();
    }
  }, [user?.id]);

  return {
    completions,
    loading,
    error,
    getHabitCompletions,
    isCompletedOnDate,
    getCompletionOnDate,
    getWeeklyCount,
    applyOptimistic,
    addOptimisticCompletion,
    removeCompletionById,
    refetch: fetchWeeklyCompletions,
  };
};
