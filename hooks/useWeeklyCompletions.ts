// hooks/useWeeklyCompletions.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/services/supabase';
import { Completion } from '@/types/database';
import { useAuth } from './useAuth';
import { startOfWeek, endOfWeek } from 'date-fns';

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

  const fetchWeeklyCompletions = useCallback(async (refDate?: Date) => {
    const userId = userIdRef.current;
    if (!userId) return;

    try {
      setLoading(true);

      const target = refDate || new Date();
      const weekStart = startOfWeek(target, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(target, { weekStartsOn: 0 });

      const startDate = weekStart.toISOString();
      const endDate = weekEnd.toISOString();

      const { data, error: fetchError } = await supabase
        .from('completions')
        .select(`
          *,
          habits!inner (*)
        `)
        .eq('habits.user_id', userId)
        .gte('completed_at', startDate)
        .lte('completed_at', endDate)
        .order('completed_at', { ascending: false });

      if (fetchError) throw fetchError;

      setCompletions(data as Completion[] || []);
      setError(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao buscar completions da semana';
      setError(errorMsg);
      console.error('Erro em useWeeklyCompletions:', errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  const getHabitCompletions = (habitId: string): Completion[] => {
    return completions.filter(c => c.habit_id === habitId);
  };

  const isCompletedOnDate = (habitId: string, date: Date): boolean => {
    return completions.some(c => {
      if (c.habit_id !== habitId) return false;
      const completionDate = new Date(c.completed_at);
      return completionDate.toDateString() === date.toDateString();
    });
  };

  const getCompletionOnDate = (habitId: string, date: Date): Completion | undefined => {
    return completions.find(c => {
      if (c.habit_id !== habitId) return false;
      const completionDate = new Date(c.completed_at);
      return completionDate.toDateString() === date.toDateString();
    });
  };

  const getWeeklyCount = (): number => {
    return completions.length;
  };

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
    refetch: fetchWeeklyCompletions,
  };
};