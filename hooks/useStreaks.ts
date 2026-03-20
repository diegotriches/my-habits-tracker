// hooks/useStreaks.ts
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/services/supabase';
import { Streak, Habit } from '@/types/database';
import { useAuth } from './useAuth';
import { retroactiveCompletionService } from '@/services/retroactiveCompletionService';

const streaksTable = () => (supabase.from('streaks') as any);

export const useStreaks = () => {
  const { user } = useAuth();
  const [streaks, setStreaks] = useState<Streak[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasRecalculated = useRef(false);

  const fetchStreaks = async (habitIds: string[]) => {
    if (!user || habitIds.length === 0) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await streaksTable()
        .select('*')
        .in('habit_id', habitIds);

      if (fetchError) throw fetchError;

      setStreaks(data as Streak[] || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar streaks');
    } finally {
      setLoading(false);
    }
  };

  const getStreak = (habitId: string): Streak | undefined => {
    return streaks.find(s => s.habit_id === habitId);
  };

  const updateStreakWithFrequency = async (
    habitId: string,
    habit: Habit,
    wasCompleted: boolean
  ) => {
    try {
      await ensureStreakExists(habitId);
      await retroactiveCompletionService.recalculateStreak(habitId);

      const { data: updatedData } = await streaksTable()
        .select('*')
        .eq('habit_id', habitId)
        .maybeSingle();

      const updatedStreak = updatedData as Streak | null;

      if (updatedStreak) {
        setStreaks(prev => {
          const filtered = prev.filter(s => s.habit_id !== habitId);
          return [...filtered, updatedStreak];
        });
      }

      return { data: updatedStreak, error: null };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao atualizar streak';
      setError(errorMsg);
      return { data: null, error: errorMsg };
    }
  };

  const checkExpiredStreaks = async (habits: Habit[]) => {
    if (hasRecalculated.current || habits.length === 0) return;
    hasRecalculated.current = true;

    try {
      for (const habit of habits) {
        await ensureStreakExists(habit.id);
        await retroactiveCompletionService.recalculateStreak(habit.id);
      }

      const habitIds = habits.map(h => h.id);
      const { data } = await streaksTable()
        .select('*')
        .in('habit_id', habitIds);

      if (data) {
        setStreaks(data as Streak[]);
      }
    } catch (err) {
      console.error('Erro ao verificar streaks expirados:', err);
    }
  };

  return {
    streaks,
    loading,
    error,
    fetchStreaks,
    getStreak,
    updateStreakWithFrequency,
    checkExpiredStreaks,
  };
};

async function ensureStreakExists(habitId: string): Promise<void> {
  const { data: existing } = await streaksTable()
    .select('id')
    .eq('habit_id', habitId)
    .maybeSingle();

  if (!existing) {
    await streaksTable().insert({
      habit_id: habitId,
      current_streak: 0,
      best_streak: 0,
      last_completion_date: null,
    });
  }
}