// components/habits/WeeklySummaryCard.tsx
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import { Habit, Completion, Streak } from '@/types/database';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { startOfWeek, endOfWeek, isSameDay } from 'date-fns';

interface WeeklySummaryCardProps {
  habits: Habit[];
  completions: Completion[];
  streaks: Streak[];
}

export function WeeklySummaryCard({
  habits,
  completions,
  streaks,
}: WeeklySummaryCardProps) {
  const { colors } = useTheme();

  // Calcular estatísticas da semana
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 0 });

  // Completions desta semana
  const weekCompletions = completions.filter(c => {
    const date = new Date(c.completed_at);
    return date >= weekStart && date <= weekEnd;
  });

  // Total esperado esta semana
  const totalExpected = habits.reduce((sum, habit) => {
    if (habit.frequency_type === 'daily') return sum + 7;
    if (habit.frequency_type === 'weekly' && habit.frequency_days) {
      return sum + habit.frequency_days.length;
    }
    return sum + 7;
  }, 0);

  const totalCompleted = weekCompletions.length;
  const percentage = totalExpected > 0 
    ? Math.round((totalCompleted / totalExpected) * 100)
    : 0;

  // Maior streak
  const maxStreak = streaks.reduce((max, streak) => {
    return Math.max(max, streak.current_streak || 0);
  }, 0);

  const maxStreakHabit = streaks.find(s => s.current_streak === maxStreak);
  const maxStreakHabitName = maxStreakHabit 
    ? habits.find(h => h.id === maxStreakHabit.habit_id)?.name 
    : null;

  // Hábitos completados hoje
  const todayCompletions = completions.filter(c => {
    const date = new Date(c.completed_at);
    return isSameDay(date, today);
  }).length;

  return (
    <View style={[styles.container, { 
      backgroundColor: colors.primaryLight,
      borderColor: colors.primary + '30',
    }]}>
      <View style={styles.header}>
        <Icon name="stats" size={16} color={colors.primary} />
        <Text style={[styles.title, { color: colors.primary }]}>
          Resumo da Semana
        </Text>
      </View>

      <View style={styles.content}>
        {/* Progresso Geral */}
        <View style={styles.mainStat}>
          <View style={[styles.progressCircle, { borderColor: colors.primary }]}>
            <Text style={[styles.percentageText, { color: colors.primary }]}>
              {percentage}%
            </Text>
          </View>
          
          <View style={styles.mainStatInfo}>
            <Text style={[styles.completedText, { color: colors.textPrimary }]}>
              {totalCompleted}/{totalExpected} hábitos
            </Text>
            <Text style={[styles.completedLabel, { color: colors.textSecondary }]}>
              completados esta semana
            </Text>
          </View>
        </View>

        {/* Barra de progresso */}
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

        {/* Estatísticas Secundárias */}
        <View style={styles.secondaryStats}>
          <View style={styles.statItem}>
            <Icon name="checkCircle" size={14} color={colors.success} />
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {todayCompletions}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              hoje
            </Text>
          </View>

          {maxStreak > 0 && (
            <View style={styles.statItem}>
              <Icon name="flame" size={14} color={colors.streak} />
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                {maxStreak}
              </Text>
              <Text 
                style={[styles.statLabel, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {maxStreakHabitName || 'dias'}
              </Text>
            </View>
          )}
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
  secondaryStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    flex: 1,
  },
});