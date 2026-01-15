import { useState, useEffect } from 'react';
import { supabase } from '@/services/supabase';
import { Streak } from '@/types/database';
import { useAuth } from './useAuth';

export const useStreaks = () => {
  const [streaks, setStreaks] = useState<Map<string, Streak>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Buscar todas as streaks dos hábitos do usuário
  const fetchStreaks = async (habitIds: string[]) => {
    if (habitIds.length === 0) return;

    try {
      setLoading(true);

      const { data, error: fetchError } = await supabase
        .from('streaks')
        .select('*')
        .in('habit_id', habitIds);

      if (fetchError) throw fetchError;

      // Converter array para Map para acesso rápido
      const streaksMap = new Map<string, Streak>();
      (data || []).forEach((streak: any) => {
        streaksMap.set(streak.habit_id, streak as Streak);
      });

      setStreaks(streaksMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar streaks');
      console.error('Error fetching streaks:', err);
    } finally {
      setLoading(false);
    }
  };

  // Pegar streak de um hábito específico
  const getStreak = (habitId: string): Streak | undefined => {
    return streaks.get(habitId);
  };

  // Verificar se há bônus de streak
  const hasStreakBonus = (habitId: string): boolean => {
    const streak = streaks.get(habitId);
    if (!streak) return false;
    return streak.current_streak >= 7;
  };

  return {
    streaks,
    loading,
    error,
    fetchStreaks,
    getStreak,
    hasStreakBonus,
  };
};