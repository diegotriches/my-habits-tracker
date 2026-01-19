// hooks/useHabitDetails.ts
import { useState, useEffect } from 'react';
import { supabase } from '@/services/supabase';
import { useAuth } from './useAuth';
import { Habit, Completion, Streak } from '@/types/database';
import { shouldHabitAppearOnDate } from '@/utils/habitHelpers';
import { 
  startOfWeek, 
  subDays, 
  eachDayOfInterval, 
  format 
} from 'date-fns';

interface PeriodStats {
  completed: number;
  total: number;
  successRate: number;
}

interface OverallStats {
  totalCompletions: number;
  successRate: number;
  totalPoints: number;
  averageValue?: number;
  maxValue?: number;
  minValue?: number;
}

interface DayData {
  date: string;
  completed: boolean;
  value?: number;
}

interface HabitDetailsData {
  habit: Habit | null;
  completions: Completion[];
  streak: Streak | null;
  weekStats: PeriodStats | null;
  monthStats: PeriodStats | null;
  semesterStats: PeriodStats | null;
  yearStats: PeriodStats | null;
  overallStats: OverallStats | null;
  last30DaysData: DayData[];
  last90DaysData: DayData[];
}

export function useHabitDetails(habitId: string) {
  const { user } = useAuth();

  const [data, setData] = useState<HabitDetailsData>({
    habit: null,
    completions: [],
    streak: null,
    weekStats: null,
    monthStats: null,
    semesterStats: null,
    yearStats: null,
    overallStats: null,
    last30DaysData: [],
    last90DaysData: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && habitId) {
      fetchAllData();
    }
  }, [user, habitId]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Buscar hábito
      const { data: habit, error: habitError } = await supabase
        .from('habits')
        .select('*')
        .eq('id', habitId)
        .single();

      if (habitError) throw habitError;

      // 2. Buscar completions
      const { data: completions, error: completionsError } = await supabase
        .from('completions')
        .select('*')
        .eq('habit_id', habitId)
        .order('completed_at', { ascending: false });

      if (completionsError) throw completionsError;

      // 3. Buscar streak
      const { data: streak, error: streakError } = await supabase
        .from('streaks')
        .select('*')
        .eq('habit_id', habitId)
        .single();

      // Ignorar erro se não encontrar streak (código PGRST116)
      if (streakError && streakError.code !== 'PGRST116') {
        throw streakError;
      }

      // 4. Calcular todas as estatísticas
      const today = new Date();

      const weekStart = startOfWeek(today, { weekStartsOn: 0 });
      const monthStart = subDays(today, 29); // 30 dias (incluindo hoje)
      const semesterStart = subDays(today, 179); // 180 dias
      const yearStart = subDays(today, 364); // 365 dias

      const [weekStats, monthStats, semesterStats, yearStats] = await Promise.all([
        calculatePeriodStats(habit as any, weekStart, today, completions || []),
        calculatePeriodStats(habit as any, monthStart, today, completions || []),
        calculatePeriodStats(habit as any, semesterStart, today, completions || []),
        calculatePeriodStats(habit as any, yearStart, today, completions || []),
      ]);

      // 5. Calcular estatísticas gerais
      const overallStats = calculateOverallStats(
        habit as any,
        completions || []
      );

      // 6. Gerar dados para gráficos
      const last30DaysData = generateDaysData(
        subDays(today, 29),
        today,
        completions || []
      );

      const last90DaysData = generateDaysData(
        subDays(today, 89),
        today,
        completions || []
      );

      setData({
        habit: habit as Habit,
        completions: completions as Completion[] || [],
        streak: streak ? (streak as Streak) : null,
        weekStats,
        monthStats,
        semesterStats,
        yearStats,
        overallStats,
        last30DaysData,
        last90DaysData,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar detalhes');
    } finally {
      setLoading(false);
    }
  };

  return {
    ...data,
    loading,
    error,
    refetch: fetchAllData,
  };
}

// ========== FUNÇÕES AUXILIARES ==========

function calculatePeriodStats(
  habit: any,
  startDate: Date,
  endDate: Date,
  completions: any[]
): PeriodStats {
  const completedDates = new Set(
    completions.map((c: any) => c.completed_at.split('T')[0])
  );

  // 🔧 FIX: Contar apenas dias em que o hábito deveria ser feito
  const allDays = eachDayOfInterval({ start: startDate, end: endDate });
  const dueDays = allDays.filter(day => shouldHabitAppearOnDate(habit, day));

  const total = dueDays.length; // ✅ Agora conta apenas os dias devidos
  const completed = dueDays.filter(day =>
    completedDates.has(format(day, 'yyyy-MM-dd'))
  ).length;

  const successRate = total > 0 ? (completed / total) * 100 : 0;

  return { completed, total, successRate };
}

function calculateOverallStats(
  habit: any,
  completions: any[]
): OverallStats {
  if (!completions || completions.length === 0) {
    return {
      totalCompletions: 0,
      successRate: 0,
      totalPoints: 0,
    };
  }

  const totalCompletions = completions.length;
  const totalPoints = completions.reduce(
    (sum: number, c: any) => sum + (c.points_earned || 0),
    0
  );

  // Valores alcançados (para hábitos com meta)
  const valuesAchieved = completions
    .map((c: any) => c.value_achieved)
    .filter((v: any) => v !== null && v !== undefined);

  let averageValue, maxValue, minValue;
  if (valuesAchieved.length > 0) {
    averageValue =
      valuesAchieved.reduce((sum: number, v: number) => sum + v, 0) /
      valuesAchieved.length;
    maxValue = Math.max(...valuesAchieved);
    minValue = Math.min(...valuesAchieved);
  }

  // Calcular taxa de sucesso geral (desde a criação)
  const createdDate = new Date(habit.created_at);
  const today = new Date();
  const allDays = eachDayOfInterval({ start: createdDate, end: today });
  const dueDays = allDays.filter(day => shouldHabitAppearOnDate(habit, day));
  const successRate = dueDays.length > 0 ? (totalCompletions / dueDays.length) * 100 : 0;

  return {
    totalCompletions,
    successRate,
    totalPoints,
    averageValue,
    maxValue,
    minValue,
  };
}

function generateDaysData(
  startDate: Date,
  endDate: Date,
  completions: any[]
): DayData[] {
  const completionMap = new Map(
    completions.map((c: any) => [
      c.completed_at.split('T')[0],
      c.value_achieved,
    ])
  );

  const days = eachDayOfInterval({ start: startDate, end: endDate });
  return days.map(day => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return {
      date: dateStr,
      completed: completionMap.has(dateStr),
      value: completionMap.get(dateStr),
    };
  });
}