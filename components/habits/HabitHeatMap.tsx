// components/habits/HabitHeatMap.tsx
import React, { useRef, useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View, Dimensions } from 'react-native';
import { startOfWeek, format, subDays, startOfMonth } from 'date-fns';
import { useTheme } from '@/contexts/ThemeContext';

interface DayData {
  date: string;
  completed: boolean;
  value?: number; // Para metas numéricas
  targetValue?: number; // Meta do dia
}

interface HabitHeatMapProps {
  data: DayData[];
  habitColor: string;
  weeksToShow?: number; // Quantas semanas mostrar (padrão: 12 = ~3 meses)
  hasTarget?: boolean; // Se é meta numérica
}

const CELL_SIZE = 12;
const CELL_GAP = 3;
const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function HabitHeatMap({ 
  data, 
  habitColor, 
  weeksToShow = 12,
  hasTarget = false 
}: HabitHeatMapProps) {
  const { colors } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);

  // Auto-scroll para o final (dias mais recentes) ao montar
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  if (!data || data.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.surface }]}>
        <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
          Sem dados para exibir
        </Text>
      </View>
    );
  }

  // ========== PREPARAR DADOS ==========

  /**
   * Gerar grid completo de últimas X semanas
   */
  const generateFullGrid = (): { weeks: DayData[][]; months: { label: string; weekIndex: number }[] } => {
    const today = new Date();
    const startDate = subDays(today, weeksToShow * 7);
    const weeks: DayData[][] = [];
    const months: { label: string; weekIndex: number }[] = [];
    
    let currentWeek: DayData[] = [];
    let currentDate = startOfWeek(startDate, { weekStartsOn: 0 });
    let lastMonth = -1;

    for (let i = 0; i < weeksToShow * 7; i++) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const existingData = data.find(d => d.date === dateStr);
      
      // Adicionar label de mês na primeira semana do mês
      const monthNum = currentDate.getMonth();
      if (monthNum !== lastMonth && currentWeek.length === 0) {
        months.push({
          label: MONTHS_SHORT[monthNum],
          weekIndex: weeks.length,
        });
        lastMonth = monthNum;
      }

      currentWeek.push(
        existingData || {
          date: dateStr,
          completed: false,
          value: 0,
        }
      );

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }

      currentDate = new Date(currentDate.getTime() + 86400000); // +1 dia
    }

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push({ date: '', completed: false });
      }
      weeks.push(currentWeek);
    }

    return { weeks, months };
  };

  /**
   * Calcular opacidade baseada no progresso (para metas numéricas)
   */
  const getCellOpacity = (day: DayData): number => {
    if (!day.completed) return 0.2;
    
    if (hasTarget && day.value !== undefined && day.targetValue) {
      const percentage = (day.value / day.targetValue) * 100;
      
      if (percentage >= 100) return 1.0; // Meta completa
      if (percentage >= 75) return 0.8;
      if (percentage >= 50) return 0.6;
      if (percentage >= 25) return 0.4;
      return 0.3;
    }
    
    return 1.0; // Hábito binário completado
  };

  /**
   * Obter cor da célula
   */
  const getCellColor = (day: DayData): string => {
    if (!day.completed) return colors.border;
    
    if (hasTarget && day.value !== undefined && day.targetValue) {
      const percentage = (day.value / day.targetValue) * 100;
      
      if (percentage >= 100) return colors.success; // Verde
      if (percentage >= 50) return colors.warning; // Laranja
      return colors.danger; // Vermelho
    }
    
    return habitColor; // Hábito binário
  };

  const { weeks, months } = generateFullGrid();
  const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Header com labels de meses */}
      <View style={styles.monthsHeader}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEnabled={false}
          contentContainerStyle={{ paddingLeft: 28 }} // Espaço para labels dos dias
        >
          <View style={styles.monthsRow}>
            {months.map((month, index) => (
              <View
                key={index}
                style={[
                  styles.monthLabel,
                  { left: month.weekIndex * (CELL_SIZE + CELL_GAP) },
                ]}
              >
                <Text style={[styles.monthText, { color: colors.textSecondary }]}>
                  {month.label}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Heatmap scrollável */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={true}
        decelerationRate="fast"
        contentContainerStyle={{ paddingRight: 16 }}
      >
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
                  const opacity = isEmpty ? 0 : getCellOpacity(day);
                  const backgroundColor = isEmpty ? 'transparent' : getCellColor(day);

                  return (
                    <View
                      key={dayIndex}
                      style={[
                        styles.cell,
                        {
                          backgroundColor,
                          opacity,
                        },
                      ]}
                    />
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Legenda de intensidade */}
      <View style={styles.legendContainer}>
        <Text style={[styles.legendLabel, { color: colors.textTertiary }]}>
          Menos
        </Text>
        <View style={styles.legendCells}>
          <View
            style={[
              styles.legendCell,
              { backgroundColor: colors.border, opacity: 0.2 },
            ]}
          />
          <View
            style={[
              styles.legendCell,
              { backgroundColor: habitColor, opacity: 0.4 },
            ]}
          />
          <View
            style={[
              styles.legendCell,
              { backgroundColor: habitColor, opacity: 0.7 },
            ]}
          />
          <View
            style={[
              styles.legendCell,
              { backgroundColor: habitColor, opacity: 1 },
            ]}
          />
        </View>
        <Text style={[styles.legendLabel, { color: colors.textTertiary }]}>
          Mais
        </Text>
      </View>

      {/* Dica de scroll (fade indicator) */}
      <View style={[styles.scrollIndicator, { backgroundColor: colors.surface }]}>
        <Text style={[styles.scrollHint, { color: colors.textTertiary }]}>
          ← Arraste para ver mais →
        </Text>
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

  // ========== MONTHS HEADER ==========
  monthsHeader: {
    marginBottom: 8,
  },
  monthsRow: {
    flexDirection: 'row',
    height: 20,
    position: 'relative',
  },
  monthLabel: {
    position: 'absolute',
    top: 0,
  },
  monthText: {
    fontSize: 10,
    fontWeight: '600',
  },

  // ========== HEATMAP ==========
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

  // ========== LEGEND ==========
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

  // ========== SCROLL INDICATOR ==========
  scrollIndicator: {
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  scrollHint: {
    fontSize: 10,
    fontStyle: 'italic',
  },

  // ========== EMPTY STATE ==========
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