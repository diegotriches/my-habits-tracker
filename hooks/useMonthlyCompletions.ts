// hooks/useMonthlyCompletions.ts
import { useState, useEffect } from 'react';
import { supabase } from '@/services/supabase';
import { Completion } from '@/types/database';
import { useAuth } from './useAuth';
import { startOfMonth, endOfMonth } from 'date-fns';

export const useMonthlyCompletions = (month?: Date) => {
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const targetMonth = month || new Date();

  const fetchMonthlyCompletions = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const monthStart = startOfMonth(targetMonth).toISOString();
      const monthEnd = endOfMonth(targetMonth).toISOString();

      const { data, error: fetchError } = await supabase
        .from('completions')
        .select(`
          *,
          habits!inner (*)
        `)
        .eq('habits.user_id', user.id)
        .gte('completed_at', monthStart)
        .lte('completed_at', monthEnd)
        .order('completed_at', { ascending: true });

      if (fetchError) throw fetchError;

      setCompletions(data as Completion[] || []);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao buscar completions do mês';
      setError(errorMsg);
      console.error('useMonthlyCompletions error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchMonthlyCompletions();
    }
  }, [user, targetMonth.getMonth(), targetMonth.getFullYear()]);

  return {
    completions,
    loading,
    error,
    refetch: fetchMonthlyCompletions,
  };
};