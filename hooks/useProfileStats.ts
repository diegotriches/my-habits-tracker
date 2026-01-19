import { useState, useEffect } from 'react';
import { supabase } from '@/services/supabase';
import { useAuth } from './useAuth';
import { differenceInDays } from 'date-fns';

interface ProfileStats {
  daysActive: number;
  totalHabits: number;
  bestStreak: number;
  totalCompletions: number;
}

export const useProfileStats = () => {
  const [stats, setStats] = useState<ProfileStats>({
    daysActive: 0,
    totalHabits: 0,
    bestStreak: 0,
    totalCompletions: 0,
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchStats = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      const { data: profile } = await supabase
        .from('profiles')
        .select('created_at')
        .eq('id', user.id)
        .single();

      const daysActive = profile
        ? differenceInDays(new Date(), new Date((profile as any).created_at)) + 1
        : 0;

      const { data: habits } = await supabase
        .from('habits')
        .select('id')
        .eq('user_id', user.id);

      const totalHabits = habits?.length || 0;
      const habitIds = (habits || []).map((h: any) => h.id);

      if (habitIds.length === 0) {
        setStats({
          daysActive,
          totalHabits: 0,
          bestStreak: 0,
          totalCompletions: 0,
        });
        return;
      }

      const { data: streaks } = await supabase
        .from('streaks')
        .select('best_streak, habit_id')
        .in('habit_id', habitIds);

      const bestStreak = streaks?.length
        ? Math.max(...streaks.map((s: any) => s.best_streak || 0))
        : 0;

      const { data: completions, error: completionsError } = await supabase
        .from('completions')
        .select('id')
        .in('habit_id', habitIds);

      if (completionsError) {
        // ✅ FIX: Console.error removido
      }

      const totalCompletions = completions?.length || 0;

      setStats({
        daysActive,
        totalHabits,
        bestStreak,
        totalCompletions,
      });
    } catch (err) {
      // ✅ FIX: Console.error removido
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  return {
    stats,
    loading,
    refetch: fetchStats,
  };
};