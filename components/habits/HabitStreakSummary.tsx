import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';

interface HabitStreakSummaryProps {
  isNegative: boolean;
  currentStreak: number;
  bestStreak: number;
  themeColor: string;
  tintBorder: string;
}

export const HabitStreakSummary = React.memo(function HabitStreakSummary({
  isNegative,
  currentStreak,
  bestStreak,
  themeColor,
  tintBorder,
}: HabitStreakSummaryProps) {
  const { colors } = useTheme();

  const streakLabel = isNegative
    ? `${currentStreak} ${currentStreak === 1 ? 'dia' : 'dias'} sem`
    : 'Sequência Atual';

  return (
    <View style={styles.streakRow}>
      <View style={[styles.streakCard, { backgroundColor: colors.surface, borderColor: tintBorder }]}>
        <Icon name={isNegative ? 'shield' : 'flame'} size={32} color={themeColor} />
        <Text style={[styles.streakValue, { color: colors.textPrimary }]}>{currentStreak}</Text>
        <Text style={[styles.streakLabel, { color: colors.textSecondary }]}>{streakLabel}</Text>
      </View>

      <View style={[styles.streakCard, { backgroundColor: colors.surface, borderColor: tintBorder }]}>
        <Icon name="award" size={32} color={themeColor} />
        <Text style={[styles.streakValue, { color: colors.textPrimary }]}>{bestStreak}</Text>
        <Text style={[styles.streakLabel, { color: colors.textSecondary }]}>Melhor Sequência</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  streakRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  streakCard: {
    flex: 1, borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1.5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  streakValue: { fontSize: 32, fontWeight: '700', marginTop: 8, marginBottom: 4 },
  streakLabel: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
});