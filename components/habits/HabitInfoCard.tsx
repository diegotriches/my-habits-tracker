import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import { formatSelectedDays } from '@/utils/habitHelpers';

interface HabitInfoCardProps {
  // Tipagem do hábito do projeto (Habit) — usando `any` para não
  // depender de um import específico; substitua pelo tipo real se preferir.
  habit: any;
  isNegative: boolean;
  themeColor: string;
  tintBorder: string;
}

export const HabitInfoCard = React.memo(function HabitInfoCard({
  habit,
  isNegative,
  themeColor,
  tintBorder,
}: HabitInfoCardProps) {
  const { colors } = useTheme();

  const frequencyLabel = React.useMemo(() => {
    const goalValue = habit.frequency_goal_value;
    const goalPeriod = habit.frequency_goal_period;
    const goalCustomDays = habit.frequency_goal_custom_days;

    if (goalValue && goalValue > 0) {
      const periodLabel =
        goalPeriod === 'week'
          ? 'semana'
          : goalPeriod === 'month'
            ? 'mês'
            : `${goalCustomDays || '?'} dias`;
      return `${goalValue}x por ${periodLabel}`;
    }
    if (habit.frequency_type === 'daily') return 'Todos os dias';
    if (habit.frequency_type === 'weekly' && habit.frequency_days) {
      if (habit.frequency_days.length === 7) return 'Todos os dias';
      return formatSelectedDays(habit.frequency_days);
    }
    return 'Personalizado';
  }, [habit]);

  return (
    <View
      style={[
        styles.habitCard,
        { backgroundColor: colors.surface, borderLeftColor: themeColor, borderColor: tintBorder },
      ]}
    >
      <View style={styles.habitHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          {isNegative && <Icon name="xCircle" size={20} color={colors.warning} />}
          <Text style={[styles.habitName, { color: colors.textPrimary }]}>{habit.name}</Text>
        </View>
      </View>

      {isNegative && (
        <View style={[styles.typeBadge, { backgroundColor: colors.warningLight }]}>
          <Icon name="shield" size={12} color={colors.warning} />
          <Text style={[styles.typeText, { color: colors.warning }]}>Hábito Negativo</Text>
        </View>
      )}

      {habit.description && (
        <Text style={[styles.habitDescription, { color: colors.textSecondary }]}>
          {habit.description}
        </Text>
      )}

      <View style={[styles.habitInfo, { borderTopColor: tintBorder }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="calendar" size={14} color={themeColor} />
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Frequência:</Text>
        </View>
        <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{frequencyLabel}</Text>
      </View>

      {habit.has_target && (
        <View style={[styles.habitInfo, { borderTopColor: tintBorder }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="target" size={14} color={themeColor} />
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Meta diária:</Text>
          </View>
          <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
            {habit.target_value} {habit.target_unit}
          </Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  habitCard: {
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    borderWidth: 1.5,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  habitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  habitName: { fontSize: 20, fontWeight: '700', flex: 1 },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  typeText: { fontSize: 12, fontWeight: '600' },
  habitDescription: { fontSize: 14, marginBottom: 16, lineHeight: 20 },
  habitInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: '600' },
});
