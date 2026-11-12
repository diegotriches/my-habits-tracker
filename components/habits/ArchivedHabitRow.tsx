// components/habits/ArchivedHabitRow.tsx
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import { Habit } from '@/types/database';

interface ArchivedHabitRowProps {
  habit: Habit;
  restoring: boolean;
  disabled: boolean;
  onOpen: (habitId: string) => void;
  onRestore: (habitId: string) => void;
}

/** Linha da lista de arquivados: abre os detalhes (histórico) ou restaura. */
export const ArchivedHabitRow = React.memo(function ArchivedHabitRow({
  habit,
  restoring,
  disabled,
  onOpen,
  onRestore,
}: ArchivedHabitRowProps) {
  const { colors } = useTheme();
  const color = habit.type === 'negative' ? colors.warning : habit.color;
  const archivedOn = habit.archived_at
    ? format(new Date(habit.archived_at), "d 'de' MMMM 'de' yyyy", { locale: ptBR })
    : '';

  return (
    <View style={[styles.row, { backgroundColor: colors.surface }]}>
      <TouchableOpacity
        style={styles.info}
        onPress={() => onOpen(habit.id)}
        accessibilityRole="button"
        accessibilityLabel={`${habit.name}, arquivado em ${archivedOn}`}
        accessibilityHint="Abre o histórico do hábito"
      >
        <View style={[styles.dot, { backgroundColor: color }]} />
        <View style={styles.texts}>
          <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
            {habit.name}
          </Text>
          <Text style={[styles.date, { color: colors.textSecondary }]}>
            Arquivado em {archivedOn}
          </Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.restore, { borderColor: colors.primary, opacity: disabled ? 0.5 : 1 }]}
        onPress={() => onRestore(habit.id)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`Restaurar ${habit.name}`}
      >
        {restoring ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <>
            <Icon name="restore" size={16} color={colors.primary} />
            <Text style={[styles.restoreText, { color: colors.primary }]}>Restaurar</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  info: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  texts: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600' },
  date: { fontSize: 13, marginTop: 2 },
  restore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 110,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  restoreText: { fontSize: 14, fontWeight: '600' },
});
