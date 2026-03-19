// hooks/useHabitDetails.ts
import { useState, useEffect } from 'react';
import { supabase } from '@/services/supabase';
import { useAuth } from './useAuth';
import { Habit, Completion, Streak } from '@/types/database';
import { shouldHabitAppearOnDate } from '@/utils/habitHelpers';
import { 
  startOfWeek, 
  addDays,
  subDays, 
  eachDayOfInterval, 
  format,
  differenceInDays,
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

      const { data: habit, error: habitError } = await supabase
        .from('habits')
        .select('*')
        .eq('id', habitId)
        .single();

      if (habitError) throw habitError;

      const { data: completions, error: completionsError } = await supabase
        .from('completions')
        .select('*')
        .eq('habit_id', habitId)
        .order('completed_at', { ascending: false });

      if (completionsError) throw completionsError;

      const { data: streak, error: streakError } = await supabase
        .from('streaks')
        .select('*')
        .eq('habit_id', habitId)
        .single();

      if (streakError && streakError.code !== 'PGRST116') {
        throw streakError;
      }

      const today = new Date();
      const weekStart = startOfWeek(today, { weekStartsOn: 0 });
      const monthStart = subDays(today, 29);
      const semesterStart = subDays(today, 179);
      const yearStart = subDays(today, 364);
      const weekEnd = addDays(weekStart, 6);

      const [weekStats, monthStats, semesterStats, yearStats] = await Promise.all([
        calculatePeriodStats(habit as any, weekStart, today, completions || [], weekEnd),
        calculatePeriodStats(habit as any, monthStart, today, completions || []),
        calculatePeriodStats(habit as any, semesterStart, today, completions || []),
        calculatePeriodStats(habit as any, yearStart, today, completions || []),
      ]);

      const overallStats = calculateOverallStats(habit as any, completions || []);

      const last30DaysData = generateDaysData(
        subDays(today, 29),
        today,
        completions || [],
        habit as any
      );

      const last90DaysData = generateDaysData(
        subDays(today, 89),
        today,
        completions || [],
        habit as any
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

function getExpectedDaysForPeriod(
  habit: any,
  startDate: Date,
  endDate: Date
): number {
  const goalValue = habit.frequency_goal_value;
  const goalPeriod = habit.frequency_goal_period;
  const goalCustomDays = habit.frequency_goal_custom_days;

  if (goalValue && goalValue > 0) {
    const totalDaysInPeriod = differenceInDays(endDate, startDate) + 1;
    if (goalPeriod === 'week') {
      const weeks = totalDaysInPeriod / 7;
      return Math.round(weeks * goalValue);
    }
    if (goalPeriod === 'month') {
      const months = totalDaysInPeriod / 30;
      return Math.round(months * goalValue);
    }
    if (goalPeriod === 'custom' && goalCustomDays && goalCustomDays > 0) {
      const periods = totalDaysInPeriod / goalCustomDays;
      return Math.round(periods * goalValue);
    }
  }

  const allDays = eachDayOfInterval({ start: startDate, end: endDate });
  return allDays.filter(day => shouldHabitAppearOnDate(habit, day)).length;
}

function calculatePeriodStats(
  habit: any,
  startDate: Date,
  endDate: Date,
  completions: any[],
  fullPeriodEnd?: Date
): PeriodStats {
  const completedDates = new Set(
    completions.map((c: any) => c.completed_at.split('T')[0])
  );

  const actualDays = eachDayOfInterval({ start: startDate, end: endDate });
  const completed = actualDays.filter(day =>
    completedDates.has(format(day, 'yyyy-MM-dd'))
  ).length;

  const totalEndDate = fullPeriodEnd || endDate;
  const total = getExpectedDaysForPeriod(habit, startDate, totalEndDate);
  const successRate = total > 0 ? (completed / total) * 100 : 0;

  return { completed, total, successRate };
}

function calculateOverallStats(
  habit: any,
  completions: any[]
): OverallStats {
  if (!completions || completions.length === 0) {
    return { totalCompletions: 0, successRate: 0, totalPoints: 0 };
  }

  const totalCompletions = completions.length;
  const totalPoints = completions.reduce(
    (sum: number, c: any) => sum + (c.points_earned || 0), 0
  );

  const valuesAchieved = completions
    .map((c: any) => c.value_achieved)
    .filter((v: any) => v !== null && v !== undefined);

  let averageValue, maxValue, minValue;
  if (valuesAchieved.length > 0) {
    averageValue = valuesAchieved.reduce((sum: number, v: number) => sum + v, 0) / valuesAchieved.length;
    maxValue = Math.max(...valuesAchieved);
    minValue = Math.min(...valuesAchieved);
  }

  const createdDate = new Date(habit.created_at);
  const today = new Date();
  const total = getExpectedDaysForPeriod(habit, createdDate, today);
  const successRate = total > 0 ? (totalCompletions / total) * 100 : 0;

  return { totalCompletions, successRate, totalPoints, averageValue, maxValue, minValue };
}

/**
 * Gera dados de dias para os gráficos.
 *
 * - frequency_goal (3x/semana): inclui todos os dias do período,
 *   marcando apenas os completados. Dias não completados ficam como
 *   completed=false mas SEM aparecer como "missed" no calendário
 *   (o componente trata isso via hasFrequencyGoal).
 * - Dias fixos (daily/weekly): filtra por shouldHabitAppearOnDate.
 */
function generateDaysData(
  startDate: Date,
  endDate: Date,
  completions: any[],
  habit: any
): DayData[] {
  const completionMap = new Map(
    completions.map((c: any) => [
      c.completed_at.split('T')[0],
      c.value_achieved,
    ])
  );

  const hasFrequencyGoal = habit.frequency_goal_value && habit.frequency_goal_value > 0;
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  if (hasFrequencyGoal) {
    // Inclui todos os dias — o calendário mostra apenas os completados
    // e o total esperado é calculado separadamente via getExpectedDaysForPeriod
    return days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      return {
        date: dateStr,
        completed: completionMap.has(dateStr),
        value: completionMap.get(dateStr),
      };
    });
  }

  // Dias fixos — filtrar por agendamento
  return days
    .filter(day => shouldHabitAppearOnDate(habit, day))
    .map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      return {
        date: dateStr,
        completed: completionMap.has(dateStr),
        value: completionMap.get(dateStr),
      };
    });
}