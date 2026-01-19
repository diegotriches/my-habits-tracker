// components/habits/PeriodStatsCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@/app/contexts/ThemeContext';

interface PeriodStatsCardProps {
  label: string;
  percentage: number;
  completed: number;
  total: number;
  color: string;
}

export function PeriodStatsCard({
  label,
  percentage,
  completed,
  total,
  color,
}: PeriodStatsCardProps) {
  const { colors } = useTheme();

  const radius = 35;
  const strokeWidth = 6;
  const circumference = 2 * Math.PI * radius;
  const progress = circumference - (percentage / 100) * circumference;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>

      {/* Círculo de Progresso */}
      <View style={styles.circleContainer}>
        <Svg width={80} height={80}>
          {/* Círculo de fundo */}
          <Circle
            cx={40}
            cy={40}
            r={radius}
            stroke={colors.border}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Círculo de progresso */}
          <Circle
            cx={40}
            cy={40}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={progress}
            strokeLinecap="round"
            rotation="-90"
            origin="40, 40"
          />
        </Svg>
        <View style={styles.percentageContainer}>
          <Text style={[styles.percentage, { color }]}>
            {percentage.toFixed(0)}%
          </Text>
        </View>
      </View>

      {/* Detalhes */}
      <Text style={[styles.details, { color: colors.textTertiary }]}>
        {completed}/{total} dias
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  circleContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  percentageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  percentage: {
    fontSize: 18,
    fontWeight: '700',
  },
  details: {
    fontSize: 11,
  },
});