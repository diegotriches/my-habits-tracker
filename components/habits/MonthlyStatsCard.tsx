// components/habits/MonthlyStatsCard.tsx
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import { Habit, Completion, Streak } from '@/types/database';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';

interface MonthlyStatsCardProps {
  habits: Habit[];
  completions: Completion[];
  streaks: Streak[];
  month: Date;
}

export function MonthlyStatsCard({
  habits,
  completions,
  streaks,
  month,
}: MonthlyStatsCardProps) {
  const { colors } = useTheme();

  // Calcular estatísticas do mês
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const allDaysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Total esperado no mês
  const totalExpected = habits.reduce((sum, habit) => {
    if (habit.frequency_type === 'daily') {
      return sum + allDaysInMonth.length;
    }
    if (habit.frequency_type === 'weekly' && habit.frequency_days) {
      const daysInMonth = allDaysInMonth.filter(day => 
        habit.frequency_days!.includes(day.getDay())
      ).length;
      return sum + daysInMonth;
    }
    return sum + allDaysInMonth.length;
  }, 0);

  const totalCompleted = completions.length;
  const percentage = totalExpected > 0 
    ? Math.round((totalCompleted / totalExpected) * 100)
    : 0;

  // Dias perfeitos (todos os hábitos do dia completados)
  const perfectDays = allDaysInMonth.filter(day => {
    const dayHabits = habits.filter(h => {
      if (h.frequency_type === 'daily') return true;
      if (h.frequency_type === 'weekly' && h.frequency_days) {
        return h.frequency_days.includes(day.getDay());
      }
      return true;
    });

    if (dayHabits.length === 0) return false;

    const dayCompletions = completions.filter(c => 
      isSameDay(new Date(c.completed_at), day)
    );

    return dayCompletions.length >= dayHabits.length;
  }).length;

  // Maior streak
  const maxStreak = streaks.reduce((max, streak) => 
    Math.max(max, streak.current_streak || 0), 0
  );

  // Total de pontos ganhos no mês
  const totalPoints = completions.reduce((sum, c) => sum + c.points_earned, 0);

  const monthName = month.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <View style={[styles.container, { 
      backgroundColor: colors.primaryLight,
      borderColor: colors.primary + '30',
    }]}>
      <View style={styles.header}>
        <Icon name="activity" size={16} color={colors.primary} />
        <Text style={[styles.title, { color: colors.primary }]}>
          {monthName.charAt(0).toUpperCase() + monthName.slice(1)}
        </Text>
      </View>

      <View style={styles.content}>
        {/* Progresso Principal */}
        <View style={styles.mainStat}>
          <View style={[styles.progressCircle, { borderColor: colors.primary }]}>
            <Text style={[styles.percentageText, { color: colors.primary }]}>
              {percentage}%
            </Text>
          </View>
          
          <View style={styles.mainStatInfo}>
            <Text style={[styles.completedText, { color: colors.textPrimary }]}>
              {totalCompleted}/{totalExpected} completados
            </Text>
            <Text style={[styles.completedLabel, { color: colors.textSecondary }]}>
              neste mês
            </Text>
          </View>
        </View>

        {/* Barra de Progresso */}
        <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
          <View 
            style={[
              styles.progressFill,
              { 
                width: `${percentage}%`,
                backgroundColor: colors.primary,
              }
            ]}
          />
        </View>

        {/* Grid de Estatísticas */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Icon name="sparkles" size={14} color={colors.success} />
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {perfectDays}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              dias perfeitos
            </Text>
          </View>

          <View style={styles.statBox}>
            <Icon name="flame" size={14} color={colors.streak} />
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {maxStreak}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              melhor sequência
            </Text>
          </View>

          <View style={styles.statBox}>
            <Icon name="star" size={14} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {totalPoints}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              pontos
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
  },
  content: {
    padding: 12,
    paddingTop: 4,
  },
  mainStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  progressCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  percentageText: {
    fontSize: 18,
    fontWeight: '700',
  },
  mainStatInfo: {
    flex: 1,
  },
  completedText: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  completedLabel: {
    fontSize: 12,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 10,
    textAlign: 'center',
  },
});