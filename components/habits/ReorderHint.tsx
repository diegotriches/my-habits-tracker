// components/habits/ReorderHint.tsx
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';

interface ReorderHintProps {
  onDismiss: () => void;
}

/** Aviso discreto, mostrado uma vez, de que dá para reordenar os hábitos. */
export const ReorderHint = React.memo(function ReorderHint({ onDismiss }: ReorderHintProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.primaryLight }]}>
      <Icon name="lightbulb" size={16} color={colors.primary} />
      <Text style={[styles.text, { color: colors.textPrimary }]}>
        Segure um hábito e arraste para mudar a ordem.
      </Text>
      <TouchableOpacity
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel="Entendi, dispensar a dica"
        hitSlop={8}
      >
        <Text style={[styles.action, { color: colors.primary }]}>Entendi</Text>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  text: { flex: 1, fontSize: 13, lineHeight: 18 },
  action: { fontSize: 13, fontWeight: '700' },
});
