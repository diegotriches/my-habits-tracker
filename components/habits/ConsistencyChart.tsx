// components/habits/ConsistencyChart.tsx
import { useTheme } from '@/contexts/ThemeContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';

interface DayData {
  date: string;
  completed: boolean;
  value?: number;
}

interface ConsistencyChartProps {
  data: DayData[];
  habitColor: string;
}

const CHART_WIDTH = Dimensions.get('window').width - 80;
const BAR_WIDTH = CHART_WIDTH / 30;
const MAX_HEIGHT = 120;

export function ConsistencyChart({ data, habitColor }: ConsistencyChartProps) {
  const { colors } = useTheme();

  if (!data || data.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.surface }]}>
        <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
          Sem dados para exibir
        </Text>
      </View>
    );
  }

  const last30 = data.slice(-30);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.chart}>
        {last30.map((day, index) => {
          const dayDate = new Date(day.date);
          const isToday = format(new Date(), 'yyyy-MM-dd') === day.date;

          return (
            <View key={index} style={styles.barContainer}>
              <View
                style={[
                  styles.bar,
                  {
                    height: day.completed ? MAX_HEIGHT : 20,
                    backgroundColor: day.completed ? habitColor : colors.border,
                    opacity: day.completed ? 1 : 0.3,
                  },
                ]}
              />
              {(index % 5 === 0 || isToday) && (
                <Text style={[
                  styles.dayLabel,
                  { color: colors.textTertiary },
                  isToday && { color: colors.primary, fontWeight: '700' },
                ]}>
                  {format(dayDate, 'd', { locale: ptBR })}
                </Text>
              )}
            </View>
          );
        })}
      </View>

      {/* Legenda */}
      <View style={[styles.legend, { borderTopColor: colors.border }]}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: habitColor }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>
            Completado
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.border }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>
            Não completado
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: MAX_HEIGHT + 30,
    gap: 2,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderRadius: 2,
    minHeight: 4,
  },
  dayLabel: {
    fontSize: 9,
    marginTop: 4,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 11,
  },
  emptyContainer: {
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
  },
});