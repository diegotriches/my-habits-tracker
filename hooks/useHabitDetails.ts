import { useState, useEffect } from 'react';
import { supabase } from '@/services/supabase';
import { Habit, Completion, Streak } from '@/types/database';
import { differenceInDays, startOfDay } from 'date-fns';

interface HabitDetailsData {
  habit: Habit | null;
  completions: Completion[];
  streak: Streak | null;
  stats: {
    totalCompletions: number;
    totalPoints: number;
    successRate: number;
    completionDates: string[];
  };
}

export const useHabitDetails = (habitId: string) => {
  const [data, setData] = useState<HabitDetailsData>({
    habit: null,
    completions: [],
    streak: null,
    stats: {
      totalCompletions: 0,
      totalPoints: 0,
      successRate: 0,
      completionDates: [],
    },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHabitDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Buscar hábito
      const { data: habit, error: habitError } = await supabase
        .from('habits')
        .select('*')
        .eq('id', habitId)
        .single();

      if (habitError) throw habitError;

      // Buscar completions
      const { data: completions, error: completionsError } = await supabase
        .from('completions')
        .select('*')
        .eq('habit_id', habitId)
        .order('completed_at', { ascending: false });

      if (completionsError) throw completionsError;

      // Buscar streak
      const { data: streak, error: streakError } = await supabase
        .from('streaks')
        .select('*')
        .eq('habit_id', habitId)
        .single();

      if (streakError && streakError.code !== 'PGRST116') {
        // Ignorar erro se não encontrar streak (código PGRST116)
        throw streakError;
      }

      // Calcular estatísticas
      const totalCompletions = completions?.length || 0;
      const totalPoints = (completions || []).reduce(
        (sum, c) => sum + ((c as any).points_earned || 0),
        0
      );

      // Calcular taxa de sucesso (baseado nos últimos 30 dias)
      const today = startOfDay(new Date());
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const daysSinceCreation = Math.min(
        30,
        differenceInDays(today, new Date((habit as any).created_at)) + 1
      );

      const successRate = daysSinceCreation > 0
        ? (totalCompletions / daysSinceCreation) * 100
        : 0;

      // Extrair datas de completion
      const completionDates = (completions || []).map((c) => (c as any).completed_at);

      setData({
        habit: habit as Habit,
        completions: completions as Completion[] || [],
        streak: streak ? (streak as Streak) : null,
        stats: {
          totalCompletions,
          totalPoints,
          successRate: Math.min(100, successRate),
          completionDates,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar detalhes');
      console.error('Error fetching habit details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (habitId) {
      fetchHabitDetails();
    }
  }, [habitId]);

  return {
    ...data,
    loading,
    error,
    refetch: fetchHabitDetails,
  };
};