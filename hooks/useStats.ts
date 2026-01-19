import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './useAuth';

export interface DailyStats {
  date: string;
  completions: number;
  points: number;
}

export interface WeekdayStats {
  day: string;
  completions: number;
}

export interface HabitStreak {
  habit_id: string;
  habit_name: string;
  current_streak: number;
  best_streak: number;
  total_completions: number;
}

export interface GeneralStats {
  total_habits: number;
  active_habits: number;
  total_completions: number;
  total_points: number;
  completion_rate: number;
  best_day: string;
  best_day_count: number;
  most_consistent_habit: string;
}

export const useStats = () => {
  const { user } = useAuth();
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [weekdayStats, setWeekdayStats] = useState<WeekdayStats[]>([]);
  const [topStreaks, setTopStreaks] = useState<HabitStreak[]>([]);
  const [generalStats, setGeneralStats] = useState<GeneralStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAllStats();
    }
  }, [user]);

  const fetchAllStats = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchDailyStats(),
        fetchWeekdayStats(),
        fetchTopStreaks(),
        fetchGeneralStats(),
      ]);
    } catch (error) {
      // ✅ FIX: Console.error removido
    } finally {
      setLoading(false);
    }
  };

  const fetchDailyStats = async () => {
    if (!user?.id) return;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: userHabits } = await supabase
      .from('habits')
      .select('id')
      .eq('user_id', user.id);

    const habitIds = (userHabits || []).map((h: any) => h.id);

    if (habitIds.length === 0) {
      setDailyStats([]);
      return;
    }

    const { data, error } = await supabase
      .from('completions')
      .select('completed_at, points_earned')
      .in('habit_id', habitIds)
      .gte('completed_at', thirtyDaysAgo.toISOString())
      .order('completed_at', { ascending: true });

    if (error) {
      // ✅ FIX: Console.error removido
      return;
    }

    const statsMap = new Map<string, { completions: number; points: number }>();
    
    data?.forEach((completion: any) => {
      const date = new Date(completion.completed_at).toISOString().split('T')[0];
      const current = statsMap.get(date) || { completions: 0, points: 0 };
      statsMap.set(date, {
        completions: current.completions + 1,
        points: current.points + (completion.points_earned || 0),
      });
    });

    const stats: DailyStats[] = Array.from(statsMap.entries()).map(([date, data]) => ({
      date,
      completions: data.completions,
      points: data.points,
    }));

    setDailyStats(stats);
  };

  const fetchWeekdayStats = async () => {
    if (!user?.id) return;

    const { data: userHabits } = await supabase
      .from('habits')
      .select('id')
      .eq('user_id', user.id);

    const habitIds = (userHabits || []).map((h: any) => h.id);

    if (habitIds.length === 0) {
      setWeekdayStats([]);
      return;
    }

    const { data, error } = await supabase
      .from('completions')
      .select('completed_at')
      .in('habit_id', habitIds);

    if (error) {
      // ✅ FIX: Console.error removido
      return;
    }

    const weekdayMap = new Map<number, number>();
    const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    data?.forEach((completion: any) => {
      const day = new Date(completion.completed_at).getDay();
      weekdayMap.set(day, (weekdayMap.get(day) || 0) + 1);
    });

    const stats: WeekdayStats[] = weekdays.map((day, index) => ({
      day,
      completions: weekdayMap.get(index) || 0,
    }));

    setWeekdayStats(stats);
  };

  // ✅ FIX: Corrigido - buscar streaks da tabela correta
  const fetchTopStreaks = async () => {
    if (!user?.id) return;

    // Buscar hábitos ativos
    const { data: habits, error: habitsError } = await supabase
      .from('habits')
      .select('id, name')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (habitsError) {
      // ✅ FIX: Console.error removido
      return;
    }

    if (!habits || habits.length === 0) {
      setTopStreaks([]);
      return;
    }

    const habitIds = habits.map((h: any) => h.id);

    // ✅ FIX: Buscar streaks da tabela 'streaks' com tipagem correta
    const { data: streaksData } = await supabase
      .from('streaks')
      .select('*')
      .in('habit_id', habitIds);

    // ✅ FIX: Cast explícito para resolver erro de tipagem
    const streaks = (streaksData || []) as Array<{
      habit_id: string;
      current_streak: number;
      best_streak: number;
      [key: string]: any;
    }>;

    // Buscar total de completions para cada hábito
    const streaksWithCompletions = await Promise.all(
      habits.map(async (habit: any) => {
        const streak = streaks.find((s) => s.habit_id === habit.id);
        
        const { count } = await supabase
          .from('completions')
          .select('*', { count: 'exact', head: true })
          .eq('habit_id', habit.id);

        return {
          habit_id: habit.id,
          habit_name: habit.name,
          current_streak: streak?.current_streak || 0,
          best_streak: streak?.best_streak || 0,
          total_completions: count || 0,
        };
      })
    );

    // Ordenar por melhor streak
    const sorted = streaksWithCompletions
      .sort((a, b) => b.best_streak - a.best_streak)
      .slice(0, 5);

    setTopStreaks(sorted);
  };

  const fetchGeneralStats = async () => {
    if (!user?.id) return;

    const { data: habits, error: habitsError } = await supabase
      .from('habits')
      .select('id, is_active')
      .eq('user_id', user.id);

    if (habitsError) {
      // ✅ FIX: Console.error removido
      return;
    }

    const total_habits = habits.length;
    const active_habits = habits.filter((h: any) => h.is_active).length;
    const habitIds = (habits || []).map((h: any) => h.id);

    if (habitIds.length === 0) {
      setGeneralStats({
        total_habits: 0,
        active_habits: 0,
        total_completions: 0,
        total_points: 0,
        completion_rate: 0,
        best_day: 'Nenhum',
        best_day_count: 0,
        most_consistent_habit: 'Nenhum',
      });
      return;
    }

    const { data: completions, error: completionsError } = await supabase
      .from('completions')
      .select('completed_at, points_earned')
      .in('habit_id', habitIds);

    if (completionsError) {
      // ✅ FIX: Console.error removido
      return;
    }

    const total_completions = completions.length;
    const total_points = completions.reduce((sum: number, c: any) => sum + (c.points_earned || 0), 0);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentCompletions = completions.filter(
      (c: any) => new Date(c.completed_at) >= thirtyDaysAgo
    );
    
    const possibleCompletions = 30 * active_habits;
    const completion_rate = possibleCompletions > 0 
      ? (recentCompletions.length / possibleCompletions) * 100 
      : 0;

    const dayMap = new Map<string, number>();
    completions.forEach((c: any) => {
      const date = new Date(c.completed_at).toISOString().split('T')[0];
      dayMap.set(date, (dayMap.get(date) || 0) + 1);
    });

    let best_day = 'Nenhum';
    let best_day_count = 0;
    dayMap.forEach((count, date) => {
      if (count > best_day_count) {
        best_day = date;
        best_day_count = count;
      }
    });

    // Buscar hábito mais consistente (maior streak atual)
    const { data: streaks } = await supabase
      .from('streaks')
      .select('habit_id, current_streak')
      .in('habit_id', habitIds)
      .order('current_streak', { ascending: false })
      .limit(1);

    let most_consistent_habit = 'Nenhum';
    if (streaks && streaks.length > 0) {
      const topStreakHabitId = (streaks[0] as any).habit_id;
      const habit = habits.find((h: any) => h.id === topStreakHabitId);
      
      if (habit) {
        const { data: habitData } = await supabase
          .from('habits')
          .select('name')
          .eq('id', topStreakHabitId)
          .single();
        
        most_consistent_habit = (habitData as any)?.name || 'Nenhum';
      }
    }

    setGeneralStats({
      total_habits,
      active_habits,
      total_completions,
      total_points,
      completion_rate: Math.round(completion_rate),
      best_day,
      best_day_count,
      most_consistent_habit,
    });
  };

  return {
    dailyStats,
    weekdayStats,
    topStreaks,
    generalStats,
    loading,
    refresh: fetchAllStats,
  };
};