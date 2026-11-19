// components/habits/AddHabitRow.tsx
import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';

interface AddHabitRowProps {
  onPress: () => void;
  /**
   * Em destaque no primeiro uso (lista vazia); discreta depois, como último
   * item da lista. Fica sempre no mesmo lugar — abaixo dos hábitos —, para o
   * usuário aprender onde criar desde o início.
   */
  variant?: 'subtle' | 'prominent';
}

/** "+ Novo hábito": a última linha da lista da home, no lugar do botão flutuante. */
export const AddHabitRow = React.memo(function AddHabitRow({
  onPress,
  variant = 'subtle',
}: AddHabitRowProps) {
  const { colors } = useTheme();
  const prominent = variant === 'prominent';
  const color = prominent ? colors.textInverse : colors.textSecondary;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={prominent ? 'Criar o primeiro hábito' : 'Novo hábito'}
      style={[
        styles.row,
        prominent
          ? [styles.prominent, { backgroundColor: colors.primary }]
          : [styles.subtle, { borderColor: colors.border }],
      ]}
    >
      <Icon name="add" size={prominent ? 22 : 18} color={color} />
      <Text style={[styles.label, prominent && styles.labelProminent, { color }]}>
        {prominent ? 'Criar primeiro hábito' : 'Novo hábito'}
      </Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    marginBottom: 12,
  },
  subtle: {
    paddingVertical: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  prominent: {
    paddingVertical: 20,
  },
  label: { fontSize: 15, fontWeight: '600' },
  labelProminent: { fontSize: 17 },
});
