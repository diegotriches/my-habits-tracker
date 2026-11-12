// hooks/useYearStats.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchAllRows, supabase } from '@/services/supabase';
import { readCache, writeCache } from '@/services/offlineCache';
import { applyPendingOps, completionOutbox } from '@/services/completionOutbox';
import { Completion, Habit } from '@/types/database';
import { errorMessageFor } from '@/utils/networkErrors';
import { useAuth } from './useAuth';

interface YearData {
  /** Ativos e arquivados (o histórico dos arquivados também conta). */
  habits: Habit[];
  completions: Completion[];
}

const EMPTY: YearData = { habits: [], completions: [] };

/**
 * Hábitos e conclusões de um ano, para a tela de estatísticas. Mostra o cache
 * offline na hora e atualiza com o banco; com cache na tela, falha de rede
 * não vira erro. Marcações ainda na fila de saída entram por cima.
 */
export function useYearStats(year: number) {
  const { user } = useAuth();
  const [data, setData] = useState<YearData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Troca rápida de ano: só a resposta do último pedido vale.
  const seqRef = useRef(0);

  const fetchYear = useCallback(async () => {
    if (!user) return;
    const seq = ++seqRef.current;
    const cacheKey = `year:${year}`;
    setError(null);

    const withPending = async (completions: Completion[]) =>
      applyPendingOps(completions, await completionOutbox.getPendingOps(user.id));

    const cached = await readCache<YearData>(cacheKey, user.id);
    const cachedCompletions = cached ? await withPending(cached.completions) : [];
    if (seq !== seqRef.current) return;
    if (cached) {
      setData({ habits: cached.habits, completions: cachedCompletions });
      setLoading(false);
    } else {
      setData(EMPTY);
      setLoading(true);
    }

    try {
      const { data: habits, error: habitsError } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: true });
      if (habitsError) throw habitsError;

      // Limites no dia local: 1º de janeiro até 1º de janeiro seguinte.
      const start = new Date(year, 0, 1).toISOString();
      const end = new Date(year + 1, 0, 1).toISOString();
      const rows = await fetchAllRows((from, to) =>
        supabase
          .from('completions')
          .select('*, habits!inner (user_id)')
          .eq('habits.user_id', user.id)
          .gte('completed_at', start)
          .lt('completed_at', end)
          .order('completed_at', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to)
      );
      // O join só filtra pelo dono; não vai para o cache.
      const completions: Completion[] = rows.map(({ habits: _owner, ...c }) => c);
      const fresh: YearData = { habits: habits ?? [], completions };
      const shown = await withPending(completions);
      if (seq !== seqRef.current) return;

      setData({ habits: fresh.habits, completions: shown });
      void writeCache(cacheKey, user.id, fresh);
    } catch (err) {
      if (seq !== seqRef.current) return;
      if (!cached) {
        setError(errorMessageFor(err, 'Não foi possível carregar as estatísticas.'));
      }
    } finally {
      if (seq === seqRef.current) setLoading(false);
    }
  }, [user, year]);

  useEffect(() => {
    void fetchYear();
  }, [fetchYear]);

  return { ...data, loading, error, refresh: fetchYear };
}
