// components/habits/ConsistencyChart.tsx - WEEKLY LINE COMPARISON
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import { hapticFeedback } from '@/utils/haptics';
import { format, startOfWeek, endOfWeek, eachWeekOfInterval, subWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import React, { useState } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

interface DayData {
  date: string;
  completed: boolean;
  value?: number;
}

interface ConsistencyChartProps {
  data: DayData[];
  habitColor: string;
}

interface WeekData {
  weekNumber: number;
  weekLabel: string;
  startDate: Date;
  endDate: Date;
  completed: number;
  total: number;
  percentage: number;
  days: DayData[];
}

const CHART_WIDTH = Dimensions.get('window').width - 80;
const CHART_HEIGHT = 180;
const PADDING_TOP = 30;
const PADDING_BOTTOM = 40;
const PADDING_LEFT = 40;
const PADDING_RIGHT = 20;
const WEEKS_TO_SHOW = 5; // Últimas 5 semanas

export function ConsistencyChart({ data, habitColor }: ConsistencyChartProps) {
  const { colors } = useTheme();
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.surface }]}>
        <Icon name="activity" size={32} color={colors.textTertiary} />
        <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
          Sem dados para exibir
        </Text>
      </View>
    );
  }

  // ========== CALCULAR DADOS SEMANAIS ==========
  const calculateWeeklyData = (): WeekData[] => {
    const today = new Date();
    const weeks: WeekData[] = [];

    for (let i = WEEKS_TO_SHOW - 1; i >= 0; i--) {
      const weekStart = startOfWeek(subWeeks(today, i), { weekStartsOn: 0 });
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });

      // Filtrar dados desta semana
      const weekDays = data.filter(day => {
        const dayDate = new Date(day.date);
        return dayDate >= weekStart && dayDate <= weekEnd;
      });

      if (weekDays.length > 0) {
        const completed = weekDays.filter(d => d.completed).length;
        const total = weekDays.length;
        const percentage = (completed / total) * 100;

        weeks.push({
          weekNumber: WEEKS_TO_SHOW - i,
          weekLabel: i === 0 ? 'Atual' : `Sem ${WEEKS_TO_SHOW - i}`,
          startDate: weekStart,
          endDate: weekEnd,
          completed,
          total,
          percentage,
          days: weekDays,
        });
      }
    }

    return weeks;
  };

  const weeklyData = calculateWeeklyData();

  if (weeklyData.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.surface }]}>
        <Icon name="calendar" size={32} color={colors.textTertiary} />
        <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
          Complete hábitos para ver o gráfico
        </Text>
      </View>
    );
  }

  // ========== CALCULAR PONTOS DO GRÁFICO ==========
  const chartWidth = CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT;
  const chartHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
  const maxPercentage = 100;

  const points = weeklyData.map((week, index) => {
    const x = PADDING_LEFT + (index / Math.max(weeklyData.length - 1, 1)) * chartWidth;
    const y = PADDING_TOP + chartHeight - (week.percentage / maxPercentage) * chartHeight;
    return { x, y, week, index };
  });

  // Criar path da linha
  const linePath = points
    .map((point, index) => {
      if (index === 0) return `M ${point.x} ${point.y}`;
      return `L ${point.x} ${point.y}`;
    })
    .join(' ');

  // ========== ESTATÍSTICAS GERAIS ==========
  const avgPercentage = weeklyData.reduce((sum, w) => sum + w.percentage, 0) / weeklyData.length;
  const bestWeek = weeklyData.reduce((best, current) => 
    current.percentage > best.percentage ? current : best
  );
  const currentWeek = weeklyData[weeklyData.length - 1];
  const trend = weeklyData.length > 1 
    ? currentWeek.percentage - weeklyData[weeklyData.length - 2].percentage
    : 0;

  const handlePointPress = (index: number) => {
    hapticFeedback.light();
    setSelectedWeek(selectedWeek === index ? null : index);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Header com Estatísticas */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <View style={styles.statHeader}>
            <Icon name="activity" size={14} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {avgPercentage.toFixed(0)}%
            </Text>
          </View>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Média
          </Text>
        </View>

        <View style={styles.statBox}>
          <View style={styles.statHeader}>
            <Icon name="award" size={14} color={colors.warning} />
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {bestWeek.percentage.toFixed(0)}%
            </Text>
          </View>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Melhor
          </Text>
        </View>

        <View style={styles.statBox}>
          <View style={styles.statHeader}>
            <Icon 
              name={trend >= 0 ? "trendingUp" : "trendingDown"} 
              size={14} 
              color={trend >= 0 ? colors.success : colors.danger} 
            />
            <Text style={[
              styles.statValue, 
              { color: trend >= 0 ? colors.success : colors.danger }
            ]}>
              {Math.abs(trend).toFixed(0)}%
            </Text>
          </View>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Tendência
          </Text>
        </View>
      </View>

      {/* Gráfico de Linha */}
      <View style={styles.chartContainer}>
        <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
          {/* Grid horizontal (linhas de referência) */}
          {[0, 25, 50, 75, 100].map((value) => {
            const y = PADDING_TOP + chartHeight - (value / maxPercentage) * chartHeight;
            return (
              <React.Fragment key={value}>
                <Line
                  x1={PADDING_LEFT}
                  y1={y}
                  x2={CHART_WIDTH - PADDING_RIGHT}
                  y2={y}
                  stroke={colors.border}
                  strokeWidth="1"
                  opacity="0.3"
                  strokeDasharray="4,4"
                />
                <SvgText
                  x={PADDING_LEFT - 8}
                  y={y + 4}
                  fontSize="10"
                  fill={colors.textTertiary}
                  textAnchor="end"
                >
                  {value}%
                </SvgText>
              </React.Fragment>
            );
          })}

          {/* Linha do gráfico */}
          <Path
            d={linePath}
            stroke={habitColor}
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Pontos interativos */}
          {points.map((point, index) => {
            const isSelected = selectedWeek === index;
            const isCurrentWeek = index === points.length - 1;

            return (
              <React.Fragment key={index}>
                {/* Círculo externo (seleção) */}
                {isSelected && (
                  <Circle
                    cx={point.x}
                    cy={point.y}
                    r={12}
                    fill={habitColor}
                    opacity={0.2}
                  />
                )}

                {/* Círculo principal */}
                <Circle
                  cx={point.x}
                  cy={point.y}
                  r={isSelected ? 7 : isCurrentWeek ? 6 : 5}
                  fill={isCurrentWeek ? colors.primary : habitColor}
                  stroke={colors.surface}
                  strokeWidth="2"
                  onPress={() => handlePointPress(index)}
                />
              </React.Fragment>
            );
          })}

          {/* Labels das semanas (eixo X) */}
          {points.map((point, index) => (
            <SvgText
              key={index}
              x={point.x}
              y={CHART_HEIGHT - 10}
              fontSize="10"
              fill={index === points.length - 1 ? colors.primary : colors.textTertiary}
              textAnchor="middle"
              fontWeight={index === points.length - 1 ? "700" : "400"}
            >
              {point.week.weekLabel}
            </SvgText>
          ))}
        </Svg>
      </View>

      {/* Detalhes da semana selecionada */}
      {selectedWeek !== null && weeklyData[selectedWeek] && (
        <View style={[styles.detailsCard, { backgroundColor: colors.background }]}>
          <View style={styles.detailsHeader}>
            <Icon 
              name="calendar" 
              size={16} 
              color={selectedWeek === points.length - 1 ? colors.primary : habitColor} 
            />
            <Text style={[styles.detailsTitle, { color: colors.textPrimary }]}>
              {weeklyData[selectedWeek].weekLabel}
            </Text>
            {selectedWeek === points.length - 1 && (
              <View style={[styles.currentBadge, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.currentText, { color: colors.primary }]}>Atual</Text>
              </View>
            )}
          </View>

          <Text style={[styles.detailsDate, { color: colors.textSecondary }]}>
            {format(weeklyData[selectedWeek].startDate, 'dd/MM', { locale: ptBR })} 
            {' - '} 
            {format(weeklyData[selectedWeek].endDate, 'dd/MM', { locale: ptBR })}
          </Text>

          <View style={styles.detailsStats}>
            <View style={styles.detailsStat}>
              <Text style={[styles.detailsValue, { color: habitColor }]}>
                {weeklyData[selectedWeek].percentage.toFixed(0)}%
              </Text>
              <Text style={[styles.detailsLabel, { color: colors.textSecondary }]}>
                Taxa de Sucesso
              </Text>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.detailsStat}>
              <Text style={[styles.detailsValue, { color: colors.success }]}>
                {weeklyData[selectedWeek].completed}/{weeklyData[selectedWeek].total}
              </Text>
              <Text style={[styles.detailsLabel, { color: colors.textSecondary }]}>
                Dias Completados
              </Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => {
              hapticFeedback.light();
              setSelectedWeek(null);
            }}
          >
            <Icon name="close" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Legenda */}
      <View style={[styles.legend, { borderTopColor: colors.border }]}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: habitColor }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>
            Comparação Semanal
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>
            Semana Atual
          </Text>
        </View>
      </View>

      <Text style={[styles.hint, { color: colors.textTertiary }]}>
        💡 Toque nos pontos para ver detalhes de cada semana
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },

  // ========== STATS ROW ==========
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingBottom: 16,
  },
  statBox: {
    alignItems: 'center',
    gap: 4,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
  },

  // ========== CHART ==========
  chartContainer: {
    marginBottom: 16,
  },

  // ========== DETAILS CARD ==========
  detailsCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    position: 'relative',
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  currentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  currentText: {
    fontSize: 10,
    fontWeight: '600',
  },
  detailsDate: {
    fontSize: 12,
    marginBottom: 12,
  },
  detailsStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  detailsStat: {
    flex: 1,
    alignItems: 'center',
  },
  detailsValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  detailsLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  divider: {
    width: 1,
    height: 40,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
  },

  // ========== LEGEND ==========
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
  },

  // ========== HINT ==========
  hint: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 8,
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