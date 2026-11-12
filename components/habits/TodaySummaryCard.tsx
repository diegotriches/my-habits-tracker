// components/habits/TodaySummaryCard.tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';

interface TodaySummaryCardProps {
  due: number;
  done: number;
}

/** Resumo do dia no topo da home: "3 de 5 hoje" + barra de progresso. */
export const TodaySummaryCard = React.memo(function TodaySummaryCard({
  due,
  done,
}: TodaySummaryCardProps) {
  const { colors } = useTheme();
  if (due === 0) return null;

  const allDone = done >= due;
  const progress = Math.min(done / due, 1);
  const label = allDone ? 'Tudo feito hoje!' : `${done} de ${due} hoje`;

  return (
    <View
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      accessible
      accessibilityLabel={
        allDone ? 'Todos os hábitos de hoje feitos' : `${done} de ${due} hábitos feitos hoje`
      }
    >
      <View style={styles.header}>
        <Icon
          name={allDone ? 'checkCircle' : 'target'}
          size={18}
          color={allDone ? colors.success : colors.primary}
        />
        <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>
        {!allDone && (
          <Text style={[styles.remaining, { color: colors.textSecondary }]}>
            {due - done === 1 ? 'falta 1' : `faltam ${due - done}`}
          </Text>
        )}
      </View>
      <View style={[styles.track, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${progress * 100}%`,
              backgroundColor: allDone ? colors.success : colors.primary,
            },
          ]}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 12, gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { flex: 1, fontSize: 15, fontWeight: '600' },
  remaining: { fontSize: 13 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
});
