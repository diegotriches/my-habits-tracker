import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Streak } from '@/types/database';

interface HabitStatsProps {
  totalCompletions: number;
  totalPoints: number;
  streak?: Streak;
  successRate: number; // 0-100
  color?: string;
}

export default function HabitStats({
  totalCompletions,
  totalPoints,
  streak,
  successRate,
  color = '#3b82f6',
}: HabitStatsProps) {
  return (
    <View style={styles.container}>
      <View style={styles.statsGrid}>
        {/* Total de Completions */}
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalCompletions}</Text>
          <Text style={styles.statLabel}>Completados</Text>
        </View>

        {/* Streak Atual */}
        <View style={styles.statCard}>
          <View style={styles.streakValue}>
            {(streak?.current_streak || 0) > 0 && (
              <Text style={styles.fireIcon}>🔥</Text>
            )}
            <Text style={styles.statValue}>{streak?.current_streak || 0}</Text>
          </View>
          <Text style={styles.statLabel}>Sequência</Text>
        </View>

        {/* Melhor Streak */}
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{streak?.best_streak || 0}</Text>
          <Text style={styles.statLabel}>Melhor Seq.</Text>
        </View>

        {/* Total de Pontos */}
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color }]}>{totalPoints}</Text>
          <Text style={styles.statLabel}>Pontos</Text>
        </View>
      </View>

      {/* Taxa de Sucesso */}
      <View style={styles.successRateContainer}>
        <View style={styles.successRateHeader}>
          <Text style={styles.successRateLabel}>Taxa de Sucesso</Text>
          <Text style={styles.successRateValue}>{successRate.toFixed(0)}%</Text>
        </View>
        
        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${successRate}%`, backgroundColor: color },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
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
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  streakValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  fireIcon: {
    fontSize: 20,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  successRateContainer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
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
    color: '#374151',
  },
  successRateValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
});