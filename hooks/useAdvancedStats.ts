import { useState, useEffect } from 'react';
import { supabase } from '@/services/supabase';
import { useAuth } from './useAuth';
import { DailyStats, GeneralStats } from './useStats';

interface Insight {
  type: 'success' | 'warning' | 'info';
  title: string;
  message: string;
  icon: 'trendingUp' | 'alert' | 'info' | 'star' | 'calendar';
}

interface ComparisonData {
  current: number;
  previous: number;
  label: string;
}

interface Record {
  id: string;
  title: string;
  value: string | number;
  subtitle?: string;
  icon: 'trophy' | 'flame' | 'star' | 'crown' | 'zap';
  color: string;
  onPress?: () => void;
}

export const useAdvancedStats = (
  dailyStats: DailyStats[],
  generalStats: GeneralStats | null
) => {
  const { user } = useAuth();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [weekComparison, setWeekComparison] = useState<ComparisonData>({
    current: 0,
    previous: 0,
    label: 'Completions',
  });
  const [monthComparison, setMonthComparison] = useState<ComparisonData>({
    current: 0,
    previous: 0,
    label: 'Completions',
  });
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && dailyStats.length > 0 && generalStats) {
      calculateAdvancedStats();
    }
  }, [user, dailyStats, generalStats]);

  const calculateAdvancedStats = async () => {
    setLoading(true);
    
    await Promise.all([
      generateInsights(),
      calculateComparisons(),
      calculateRecords(),
    ]);

    setLoading(false);
  };

  // Gerar insights automáticos
  const generateInsights = async () => {
    const newInsights: Insight[] = [];

    if (!generalStats || dailyStats.length === 0) {
      setInsights([]);
      return;
    }

    // Insight 1: Melhor dia da semana
    const weekdayMap = new Map<number, number>();
    dailyStats.forEach(stat => {
      const day = new Date(stat.date).getDay();
      weekdayMap.set(day, (weekdayMap.get(day) || 0) + stat.completions);
    });

    let bestDayIndex = 0;
    let maxCompletions = 0;
    weekdayMap.forEach((count, day) => {
      if (count > maxCompletions) {
        maxCompletions = count;
        bestDayIndex = day;
      }
    });

    const weekdays = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
    
    if (maxCompletions > 0) {
      newInsights.push({
        type: 'success',
        title: 'Seu melhor dia',
        message: `Você é mais produtivo nas ${weekdays[bestDayIndex]}s! Continue aproveitando esse dia.`,
        icon: 'star',
      });
    }

    // Insight 2: Consistência recente
    const last7Days = dailyStats.slice(-7);
    const daysWithCompletions = last7Days.filter(d => d.completions > 0).length;
    
    if (daysWithCompletions >= 5) {
      newInsights.push({
        type: 'success',
        title: 'Consistência excelente!',
        message: `Você completou hábitos em ${daysWithCompletions} dos últimos 7 dias. Continue assim!`,
        icon: 'trendingUp',
      });
    } else if (daysWithCompletions <= 2) {
      newInsights.push({
        type: 'warning',
        title: 'Melhore sua consistência',
        message: 'Tente completar seus hábitos mais regularmente. Pequenos passos fazem a diferença!',
        icon: 'alert',
      });
    }

    // Insight 3: Taxa de conclusão
    if (generalStats.completion_rate >= 80) {
      newInsights.push({
        type: 'success',
        title: 'Taxa excepcional!',
        message: `${generalStats.completion_rate}% de taxa de sucesso nos últimos 30 dias. Você é uma inspiração!`,
        icon: 'trendingUp',
      });
    } else if (generalStats.completion_rate < 50) {
      newInsights.push({
        type: 'info',
        title: 'Espaço para crescer',
        message: 'Considere revisar seus hábitos. Talvez alguns sejam muito desafiadores para começar?',
        icon: 'info',
      });
    }

    // Insight 4: Tendência dos últimos dias
    if (last7Days.length >= 4) {
      const firstHalf = last7Days.slice(0, 3).reduce((sum, d) => sum + d.completions, 0);
      const secondHalf = last7Days.slice(-3).reduce((sum, d) => sum + d.completions, 0);
      
      if (secondHalf > firstHalf * 1.2) {
        newInsights.push({
          type: 'success',
          title: 'Tendência crescente!',
          message: 'Você está melhorando! Seus últimos dias foram mais produtivos que os anteriores.',
          icon: 'trendingUp',
        });
      }
    }

    // Insight 5: Horário sugerido (baseado nos dados)
    if (generalStats.total_completions >= 20) {
      newInsights.push({
        type: 'info',
        title: 'Dica de horário',
        message: 'A maioria das pessoas tem mais sucesso completando hábitos pela manhã. Experimente!',
        icon: 'calendar',
      });
    }

    setInsights(newInsights.slice(0, 5)); // Máximo 5 insights
  };

  // Calcular comparações de períodos
  const calculateComparisons = () => {
    if (dailyStats.length === 0) {
      setWeekComparison({ current: 0, previous: 0, label: 'Completions' });
      setMonthComparison({ current: 0, previous: 0, label: 'Completions' });
      return;
    }

    // Comparação semanal (últimos 7 dias vs 7 dias anteriores)
    const last7Days = dailyStats.slice(-7);
    const previous7Days = dailyStats.slice(-14, -7);

    const currentWeekCompletions = last7Days.reduce((sum, d) => sum + d.completions, 0);
    const previousWeekCompletions = previous7Days.reduce((sum, d) => sum + d.completions, 0);

    setWeekComparison({
      current: currentWeekCompletions,
      previous: previousWeekCompletions,
      label: 'Completions',
    });

    // Comparação mensal (últimos 30 dias vs 30 dias anteriores)
    const last30Days = dailyStats.slice(-30);
    const previous30Days = dailyStats.slice(-60, -30);

    const currentMonthCompletions = last30Days.reduce((sum, d) => sum + d.completions, 0);
    const previousMonthCompletions = previous30Days.reduce((sum, d) => sum + d.completions, 0);

    setMonthComparison({
      current: currentMonthCompletions,
      previous: previousMonthCompletions,
      label: 'Completions',
    });
  };

  // Calcular recordes
  const calculateRecords = async () => {
    if (!user?.id || !generalStats) {
      setRecords([]);
      return;
    }

    const newRecords: Record[] = [];

    // Recorde 1: Maior streak geral
    const { data: streaks } = await supabase
      .from('streaks')
      .select('best_streak, habit_id')
      .order('best_streak', { ascending: false })
      .limit(1);

    if (streaks && streaks.length > 0) {
      const maxStreak = (streaks[0] as any).best_streak;
      
      if (maxStreak > 0) {
        newRecords.push({
          id: 'max-streak',
          title: 'Maior Sequência',
          value: `${maxStreak} dias`,
          subtitle: 'Sua melhor performance',
          icon: 'flame',
          color: '#F97316',
        });
      }
    }

    // Recorde 2: Mais completions em um dia
    if (generalStats.best_day_count > 0) {
      newRecords.push({
        id: 'best-day',
        title: 'Dia Mais Produtivo',
        value: generalStats.best_day_count,
        subtitle: new Date(generalStats.best_day).toLocaleDateString('pt-BR'),
        icon: 'star',
        color: '#EAB308',
      });
    }

    // Recorde 3: Total de pontos
    if (generalStats.total_points > 0) {
      newRecords.push({
        id: 'total-points',
        title: 'Pontos Acumulados',
        value: generalStats.total_points.toLocaleString(),
        subtitle: 'Desde o início',
        icon: 'trophy',
        color: '#8B5CF6',
      });
    }

    // Recorde 4: Hábito com mais completions
    const { data: habits } = await supabase
      .from('habits')
      .select('id, name')
      .eq('user_id', user.id);

    if (habits && habits.length > 0) {
      const habitIds = habits.map((h: any) => h.id);
      
      const completionCounts = await Promise.all(
        habits.map(async (habit: any) => {
          const { count } = await supabase
            .from('completions')
            .select('*', { count: 'exact', head: true })
            .eq('habit_id', habit.id);

          return { name: habit.name, count: count || 0 };
        })
      );

      const maxCompletions = completionCounts.reduce(
        (max, h) => (h.count > max.count ? h : max),
        { name: '', count: 0 }
      );

      if (maxCompletions.count > 0) {
        newRecords.push({
          id: 'most-completed',
          title: 'Hábito Campeão',
          value: maxCompletions.count,
          subtitle: maxCompletions.name,
          icon: 'crown',
          color: '#3B82F6',
        });
      }
    }

    // Recorde 5: Sequência atual mais longa
    const { data: currentStreaks } = await supabase
      .from('streaks')
      .select('current_streak')
      .order('current_streak', { ascending: false })
      .limit(1);

    if (currentStreaks && currentStreaks.length > 0) {
      const maxCurrentStreak = (currentStreaks[0] as any).current_streak;
      
      if (maxCurrentStreak >= 3) {
        newRecords.push({
          id: 'current-streak',
          title: 'Sequência Ativa',
          value: `${maxCurrentStreak} dias`,
          subtitle: 'Continue assim!',
          icon: 'zap',
          color: '#10B981',
        });
      }
    }

    setRecords(newRecords);
  };

  return {
    insights,
    weekComparison,
    monthComparison,
    records,
    loading,
    refresh: calculateAdvancedStats,
  };
};