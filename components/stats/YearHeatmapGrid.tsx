// components/stats/YearHeatmapGrid.tsx
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTheme } from '@/contexts/ThemeContext';
import { HeatLevel, HeatmapDay, HeatmapMonth } from '@/utils/yearHeatmap';

const GAP = 2;
const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

/** Cor de cada nível: do cinza (nada) ao verde cheio (tudo feito). */
function useHeatColors(): Record<HeatLevel, string> {
  const { colors } = useTheme();
  return {
    0: colors.border,
    1: colors.success + '4D',
    2: colors.success + '80',
    3: colors.success + 'B3',
    4: colors.success,
  };
}

interface MonthBlockProps {
  month: HeatmapMonth;
  year: number;
  cellSize: number;
  today: string;
  selected: string | null;
  onDayPress: (day: HeatmapDay) => void;
}

const MonthBlock = React.memo(function MonthBlock({
  month,
  year,
  cellSize,
  today,
  selected,
  onDayPress,
}: MonthBlockProps) {
  const { colors } = useTheme();
  const heat = useHeatColors();
  const name = format(new Date(year, month.month, 1), 'MMMM', { locale: ptBR });
  const perfect = month.days.filter((d) => d.due > 0 && d.done === d.due).length;
  const rate = month.due > 0 ? Math.round((month.done / month.due) * 100) : null;
  const label =
    rate === null
      ? `${name}: nada programado`
      : `${name}: ${rate}% feito, ${perfect} ${perfect === 1 ? 'dia completo' : 'dias completos'}`;

  // Células vazias antes do dia 1, para alinhar pelo dia da semana.
  const cells: (HeatmapDay | null)[] = [
    ...Array.from({ length: month.firstWeekday }, () => null),
    ...month.days,
  ];

  return (
    <View
      style={[styles.month, { width: cellSize * 7 + GAP * 6 }]}
      accessible
      accessibilityLabel={label}
    >
      <Text style={[styles.monthName, { color: colors.textSecondary }]}>{name.slice(0, 3)}</Text>
      <View style={styles.grid}>
        {cells.map((day, i) =>
          day === null ? (
            <View key={`pad-${i}`} style={{ width: cellSize, height: cellSize }} />
          ) : (
            <Pressable
              key={day.date}
              onPress={() => onDayPress(day)}
              hitSlop={GAP}
              style={[
                styles.cell,
                {
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: heat[day.level],
                  opacity: day.future ? 0.35 : 1,
                },
                day.date === today && { borderWidth: 1.5, borderColor: colors.textPrimary },
                day.date === selected && { borderWidth: 1.5, borderColor: colors.primary },
              ]}
            />
          )
        )}
      </View>
    </View>
  );
});

interface YearHeatmapGridProps {
  months: HeatmapMonth[];
  year: number;
  /** Largura disponível para a grade. */
  width: number;
  today: string;
  selected: string | null;
  onDayPress: (day: HeatmapDay) => void;
}

/**
 * O ano em 12 mini-calendários (3 por linha) — cabe na tela do celular sem
 * rolagem lateral, ao contrário da faixa de 53 semanas do GitHub.
 */
export const YearHeatmapGrid = React.memo(function YearHeatmapGrid({
  months,
  year,
  width,
  today,
  selected,
  onDayPress,
}: YearHeatmapGridProps) {
  const { colors } = useTheme();
  const columnGap = 14;
  const blockWidth = (width - columnGap * 2) / 3;
  const cellSize = Math.max(6, Math.floor((blockWidth - GAP * 6) / 7));

  return (
    <View>
      <View style={[styles.rows, { columnGap }]}>
        {months.map((month) => (
          <View key={month.month} style={{ width: blockWidth }}>
            {month.month < 3 && (
              <View style={[styles.weekdays, { width: cellSize * 7 + GAP * 6 }]}>
                {WEEKDAYS.map((d, i) => (
                  <Text
                    key={i}
                    style={[styles.weekday, { width: cellSize, color: colors.textTertiary }]}
                  >
                    {d}
                  </Text>
                ))}
              </View>
            )}
            <MonthBlock
              month={month}
              year={year}
              cellSize={cellSize}
              today={today}
              selected={selected}
              onDayPress={onDayPress}
            />
          </View>
        ))}
      </View>
    </View>
  );
});

/** Legenda "Menos ▢▢▢▢▢ Mais". */
export const HeatmapLegend = React.memo(function HeatmapLegend() {
  const { colors } = useTheme();
  const heat = useHeatColors();
  return (
    <View
      style={styles.legend}
      accessible
      accessibilityLabel="Legenda: quanto mais verde, mais hábitos feitos no dia"
    >
      <Text style={[styles.legendText, { color: colors.textTertiary }]}>Menos</Text>
      {([0, 1, 2, 3, 4] as HeatLevel[]).map((level) => (
        <View key={level} style={[styles.legendCell, { backgroundColor: heat[level] }]} />
      ))}
      <Text style={[styles.legendText, { color: colors.textTertiary }]}>Mais</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  rows: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 16 },
  month: {},
  monthName: { fontSize: 12, fontWeight: '600', marginBottom: 4, textTransform: 'capitalize' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  cell: { borderRadius: 2 },
  weekdays: { flexDirection: 'row', gap: GAP, marginBottom: 4 },
  weekday: { fontSize: 9, textAlign: 'center' },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 12,
  },
  legendText: { fontSize: 11, marginHorizontal: 2 },
  legendCell: { width: 12, height: 12, borderRadius: 2 },
});
