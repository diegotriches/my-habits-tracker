// components/habits/HabitStats.tsx
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import { Streak } from '@/types/database';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface HabitStatsProps {
  totalCompletions: number;
  totalPoints: number;
  streak?: Streak;
  successRate: number;
  color?: string;
}

export default function HabitStats({
  totalCompletions,
  totalPoints,
  streak,
  successRate,
  color,
}: HabitStatsProps) {
  const { colors } = useTheme();
  const habitColor = color || colors.primary;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.statsGrid}>
        {/* Total de Completions */}
        <View style={[styles.statCard, { backgroundColor: colors.background }]}>
          <Icon name="checkCircle" size={20} color={colors.success} />
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {totalCompletions}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Completados
          </Text>
        </View>

        {/* Streak Atual */}
        <View style={[styles.statCard, { backgroundColor: colors.background }]}>
          <View style={styles.streakValue}>
            {(streak?.current_streak || 0) > 0 && (
              <Icon name="flame" size={20} color={colors.streak} />
            )}
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {streak?.current_streak || 0}
            </Text>
          </View>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Sequência
          </Text>
        </View>

        {/* Melhor Streak */}
        <View style={[styles.statCard, { backgroundColor: colors.background }]}>
          <Icon name="award" size={20} color={colors.warning} />
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {streak?.best_streak || 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Melhor Seq.
          </Text>
        </View>

        {/* Total de Pontos */}
        <View style={[styles.statCard, { backgroundColor: colors.background }]}>
          <Icon name="star" size={20} color={habitColor} />
          <Text style={[styles.statValue, { color: habitColor }]}>
            {totalPoints}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Pontos
          </Text>
        </View>
      </View>

      {/* Taxa de Sucesso */}
      <View style={[styles.successRateContainer, { borderTopColor: colors.border }]}>
        <View style={styles.successRateHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="trendingUp" size={16} color={colors.textSecondary} />
            <Text style={[styles.successRateLabel, { color: colors.textPrimary }]}>
              Taxa de Sucesso
            </Text>
          </View>
          <Text style={[styles.successRateValue, { color: colors.textPrimary }]}>
            {successRate.toFixed(0)}%
          </Text>
        </View>
        
        <View style={[styles.progressBarContainer, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${successRate}%`, backgroundColor: habitColor },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
    marginBottom: 4,
  },
  streakValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  successRateContainer: {
    paddingTop: 16,
    borderTopWidth: 1,
  },
  successRateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  successRateLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  successRateValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  progressBarContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
});