// components/habits/HabitHeatMap.tsx
import { useTheme } from '@/contexts/ThemeContext';
import { startOfWeek } from 'date-fns';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

interface DayData {
  date: string;
  completed: boolean;
  value?: number;
}

interface HabitHeatMapProps {
  data: DayData[];
  habitColor: string;
}

const CELL_SIZE = 12;
const CELL_GAP = 3;

export function HabitHeatMap({ data, habitColor }: HabitHeatMapProps) {
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

  const weeks: DayData[][] = [];
  let currentWeek: DayData[] = [];

  const firstDate = new Date(data[0].date);
  const firstDayOfWeek = startOfWeek(firstDate, { weekStartsOn: 0 });
  
  let daysDiff = Math.floor(
    (firstDate.getTime() - firstDayOfWeek.getTime()) / (1000 * 60 * 60 * 24)
  );

  for (let i = 0; i < daysDiff; i++) {
    currentWeek.push({ date: '', completed: false });
  }

  data.forEach((day, index) => {
    currentWeek.push(day);
    
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push({ date: '', completed: false });
    }
    weeks.push(currentWeek);
  }

  const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={styles.heatmap}>
            {/* Labels dos dias da semana */}
            <View style={styles.weekDaysColumn}>
              {weekDays.map((day, index) => (
                <View
                  key={index}
                  style={[styles.weekDayLabel, { height: CELL_SIZE + CELL_GAP }]}
                >
                  <Text style={[styles.weekDayText, { color: colors.textTertiary }]}>
                    {day}
                  </Text>
                </View>
              ))}
            </View>

            {/* Grid de semanas */}
            <View style={styles.weeksContainer}>
              {weeks.map((week, weekIndex) => (
                <View key={weekIndex} style={styles.week}>
                  {week.map((day, dayIndex) => {
                    const isEmpty = !day.date;
                    const isCompleted = day.completed;

                    return (
                      <View
                        key={dayIndex}
                        style={[
                          styles.cell,
                          {
                            backgroundColor: isEmpty
                              ? 'transparent'
                              : isCompleted
                              ? habitColor
                              : colors.border,
                            opacity: isCompleted ? 1 : 0.3,
                          },
                        ]}
                      />
                    );
                  })}
                </View>
              ))}
            </View>
          </View>

          {/* Legenda de intensidade */}
          <View style={styles.legendContainer}>
            <Text style={[styles.legendLabel, { color: colors.textTertiary }]}>Menos</Text>
            <View style={styles.legendCells}>
              <View style={[styles.legendCell, { backgroundColor: colors.border, opacity: 0.3 }]} />
              <View style={[styles.legendCell, { backgroundColor: habitColor, opacity: 0.4 }]} />
              <View style={[styles.legendCell, { backgroundColor: habitColor, opacity: 0.7 }]} />
              <View style={[styles.legendCell, { backgroundColor: habitColor, opacity: 1 }]} />
            </View>
            <Text style={[styles.legendLabel, { color: colors.textTertiary }]}>Mais</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  heatmap: {
    flexDirection: 'row',
  },
  weekDaysColumn: {
    marginRight: 8,
  },
  weekDayLabel: {
    justifyContent: 'center',
    marginBottom: CELL_GAP,
  },
  weekDayText: {
    fontSize: 10,
    fontWeight: '600',
  },
  weeksContainer: {
    flexDirection: 'row',
    gap: CELL_GAP,
  },
  week: {
    gap: CELL_GAP,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 2,
  },
  legendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 4,
  },
  legendLabel: {
    fontSize: 10,
  },
  legendCells: {
    flexDirection: 'row',
    gap: CELL_GAP,
    marginHorizontal: 8,
  },
  legendCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 2,
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