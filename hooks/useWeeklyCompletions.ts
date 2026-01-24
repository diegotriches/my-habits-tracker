// hooks/useWeeklyCompletions.ts
import { useState, useEffect } from 'react';
import { supabase } from '@/services/supabase';
import { Completion } from '@/types/database';
import { useAuth } from './useAuth';
import { startOfWeek, endOfWeek } from 'date-fns';

/**
 * Hook para buscar completions da semana inteira (Domingo a Sábado)
 * Usado especialmente no modo de visualização semanal
 */
export const useWeeklyCompletions = () => {
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Buscar completions da semana atual
  const fetchWeeklyCompletions = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      // Calcular início e fim da semana (Domingo a Sábado)
      const today = new Date();
      const weekStart = startOfWeek(today, { weekStartsOn: 0 }); // 0 = Domingo
      const weekEnd = endOfWeek(today, { weekStartsOn: 0 });

      const startDate = weekStart.toISOString();
      const endDate = weekEnd.toISOString();

      const { data, error: fetchError } = await supabase
        .from('completions')
        .select(`
          *,
          habits!inner (*)
        `)
        .eq('habits.user_id', user.id)
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
  };

  // Buscar completions de um hábito específico
  const getHabitCompletions = (habitId: string): Completion[] => {
    return completions.filter(c => c.habit_id === habitId);
  };

  // Verificar se um hábito foi completado em uma data específica
  const isCompletedOnDate = (habitId: string, date: Date): boolean => {
    return completions.some(c => {
      if (c.habit_id !== habitId) return false;
      
      const completionDate = new Date(c.completed_at);
      return completionDate.toDateString() === date.toDateString();
    });
  };

  // Obter completion de um hábito em uma data específica
  const getCompletionOnDate = (habitId: string, date: Date): Completion | undefined => {
    return completions.find(c => {
      if (c.habit_id !== habitId) return false;
      
      const completionDate = new Date(c.completed_at);
      return completionDate.toDateString() === date.toDateString();
    });
  };

  // Calcular total de completions da semana
  const getWeeklyCount = (): number => {
    return completions.length;
  };

  // Calcular total de pontos da semana
  const getWeeklyPoints = (): number => {
    return completions.reduce((total, c) => total + (c.points_earned || 0), 0);
  };

  // Carregar completions quando o usuário estiver disponível
  useEffect(() => {
    if (user) {
      fetchWeeklyCompletions();
    }
  }, [user]);

  return {
    completions,
    loading,
    error,
    getHabitCompletions,
    isCompletedOnDate,
    getCompletionOnDate,
    getWeeklyCount,
    getWeeklyPoints,
    refetch: fetchWeeklyCompletions,
  };
};