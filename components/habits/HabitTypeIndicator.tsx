import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';

interface HabitTypeIndicatorProps {
  isNegative: boolean;
}

export const HabitTypeIndicator = React.memo(function HabitTypeIndicator({
  isNegative,
}: HabitTypeIndicatorProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.typeIndicator,
        {
          backgroundColor: isNegative ? colors.warningLight : colors.successLight,
          borderColor: isNegative ? colors.warning : colors.success,
        },
      ]}
    >
      <Icon
        name={isNegative ? 'xCircle' : 'check'}
        size={20}
        color={isNegative ? colors.warning : colors.success}
      />
      <View style={{ flex: 1 }}>
        <Text style={[styles.typeLabel, { color: isNegative ? colors.warning : colors.success }]}>
          {isNegative ? 'Hábito Negativo' : 'Hábito Positivo'}
        </Text>
        <Text style={[styles.typeDescription, { color: colors.textSecondary }]}>
          {isNegative
            ? 'Marque os dias em que conseguiu evitar — cada dia evitado conta no streak'
            : 'Criar um novo hábito saudável'}
        </Text>
      </View>
      <View style={[styles.lockBadge, { backgroundColor: colors.surface }]}>
        <Icon name="lock" size={12} color={colors.textTertiary} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  typeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
  },
  typeLabel: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  typeDescription: { fontSize: 12 },
  lockBadge: { padding: 6, borderRadius: 6 },
});
