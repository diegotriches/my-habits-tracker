import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';

interface OverallStats {
  totalCompletions: number;
  successRate: number;
  averageValue?: number;
  maxValue?: number;
}

interface HabitOverallStatsProps {
  overallStats: OverallStats;
  isNegative: boolean;
  hasTarget: boolean;
  targetUnit?: string | null;
  createdAt: string;
  themeColor: string;
  tintBorderLight: string;
}

export const HabitOverallStats = React.memo(function HabitOverallStats({
  overallStats,
  isNegative,
  hasTarget,
  targetUnit,
  createdAt,
  themeColor,
  tintBorderLight,
}: HabitOverallStatsProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.section}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Icon name="activity" size={16} color={themeColor} />
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Estatísticas Gerais
        </Text>
      </View>
      <View
        style={[
          styles.statsCard,
          { backgroundColor: colors.surface, borderColor: tintBorderLight },
        ]}
      >
        <View style={[styles.statRow, { borderBottomColor: tintBorderLight }]}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            {isNegative ? 'Vezes que resistiu' : 'Total de conclusões'}
          </Text>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {overallStats.totalCompletions} vezes
          </Text>
        </View>

        <View style={[styles.statRow, { borderBottomColor: tintBorderLight }]}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Taxa de sucesso</Text>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {overallStats.successRate.toFixed(1)}%
          </Text>
        </View>

        {hasTarget && overallStats.averageValue && (
          <>
            <View style={[styles.statRow, { borderBottomColor: tintBorderLight }]}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Valor médio alcançado
              </Text>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                {overallStats.averageValue.toFixed(1)} {targetUnit}
              </Text>
            </View>
            <View style={[styles.statRow, { borderBottomColor: tintBorderLight }]}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Valor máximo alcançado
              </Text>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                {overallStats.maxValue} {targetUnit}
              </Text>
            </View>
          </>
        )}

        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Criado em</Text>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {new Date(createdAt).toLocaleDateString('pt-BR')}
          </Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  statsCard: { borderRadius: 12, padding: 16, borderWidth: 1 },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  statLabel: { fontSize: 14 },
  statValue: { fontSize: 14, fontWeight: '600' },
});
