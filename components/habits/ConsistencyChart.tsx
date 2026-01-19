// components/habits/ConsistencyChart.tsx - MULTI-VIEW
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import { hapticFeedback } from '@/utils/haptics';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import React, { useState, useEffect } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface DayData {
  date: string;
  completed: boolean;
  value?: number;
}

interface ConsistencyChartProps {
  data: DayData[];
  habitColor: string;
  targetValue?: number;
  targetUnit?: string;
}

type ChartView = 'bars' | 'line' | 'weeks';

const CHART_WIDTH = Dimensions.get('window').width - 80;
const BAR_WIDTH = CHART_WIDTH / 30;
const MAX_HEIGHT = 140;
const PADDING = 10;
const STORAGE_KEY = '@consistency_chart_view';

export function ConsistencyChart({ 
  data, 
  habitColor,
  targetValue,
  targetUnit 
}: ConsistencyChartProps) {
  const { colors } = useTheme();
  const [currentView, setCurrentView] = useState<ChartView>('bars');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Carregar preferência salva
  useEffect(() => {
    loadViewPreference();
  }, []);

  const loadViewPreference = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        setCurrentView(saved as ChartView);
      }
    } catch (error) {
      // Ignora erro
    }
  };

  const saveViewPreference = async (view: ChartView) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, view);
    } catch (error) {
      // Ignora erro
    }
  };

  const handleViewChange = (view: ChartView) => {
    hapticFeedback.selection();
    setCurrentView(view);
    setSelectedDay(null);
    saveViewPreference(view);
  };

  if (!data || data.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.surface }]}>
        <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
          Sem dados para exibir
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Toggle de Visualização */}
      <View style={[styles.viewToggle, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[
            styles.viewButton,
            currentView === 'bars' && [styles.viewButtonActive, { backgroundColor: colors.primary }],
          ]}
          onPress={() => handleViewChange('bars')}
        >
          <Icon 
            name="activity" 
            size={16} 
            color={currentView === 'bars' ? colors.textInverse : colors.textSecondary} 
          />
          <Text style={[
            styles.viewButtonText,
            { color: colors.textSecondary },
            currentView === 'bars' && { color: colors.textInverse },
          ]}>
            Barras
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.viewButton,
            currentView === 'line' && [styles.viewButtonActive, { backgroundColor: colors.primary }],
          ]}
          onPress={() => handleViewChange('line')}
        >
          <Icon 
            name="trendingUp" 
            size={16} 
            color={currentView === 'line' ? colors.textInverse : colors.textSecondary} 
          />
          <Text style={[
            styles.viewButtonText,
            { color: colors.textSecondary },
            currentView === 'line' && { color: colors.textInverse },
          ]}>
            Linha
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.viewButton,
            currentView === 'weeks' && [styles.viewButtonActive, { backgroundColor: colors.primary }],
          ]}
          onPress={() => handleViewChange('weeks')}
        >
          <Icon 
            name="calendar" 
            size={16} 
            color={currentView === 'weeks' ? colors.textInverse : colors.textSecondary} 
          />
          <Text style={[
            styles.viewButtonText,
            { color: colors.textSecondary },
            currentView === 'weeks' && { color: colors.textInverse },
          ]}>
            Semanas
          </Text>
        </TouchableOpacity>
      </View>

      {/* Renderizar visualização selecionada */}
      {currentView === 'bars' && (
        <BarsView 
          data={data} 
          habitColor={habitColor}
          targetValue={targetValue}
          targetUnit={targetUnit}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
        />
      )}

      {currentView === 'line' && (
        <LineView 
          data={data} 
          habitColor={habitColor}
        />
      )}

      {currentView === 'weeks' && (
        <WeeksView 
          data={data} 
          habitColor={habitColor}
        />
      )}
    </View>
  );
}

// ==================== VISUALIZAÇÃO 1: BARRAS ====================
function BarsView({ 
  data, 
  habitColor, 
  targetValue, 
  targetUnit,
  selectedDay,
  onSelectDay 
}: {
  data: DayData[];
  habitColor: string;
  targetValue?: number;
  targetUnit?: string;
  selectedDay: number | null;
  onSelectDay: (index: number | null) => void;
}) {
  const { colors } = useTheme();
  const last30 = data.slice(-30);
  const maxValue = targetValue || Math.max(...last30.map(d => d.value || 0), 1);

  const getBarHeight = (day: DayData) => {
    if (!day.completed) return 8;
    if (!day.value) return MAX_HEIGHT;
    const percentage = (day.value / maxValue) * 100;
    return Math.max((percentage / 100) * MAX_HEIGHT, 12);
  };

  const getBarColor = (day: DayData) => {
    if (!day.completed) return colors.border;
    if (!targetValue || !day.value) return habitColor;
    
    const percentage = (day.value / targetValue) * 100;
    if (percentage >= 100) return colors.success;
    if (percentage >= 80) return habitColor;
    if (percentage >= 50) return colors.warning;
    return colors.danger;
  };

  const handleBarPress = (index: number) => {
    hapticFeedback.light();
    onSelectDay(selectedDay === index ? null : index);
  };

  return (
    <>
      {targetValue && (
        <View style={[styles.targetLine, { 
          bottom: 46,
          borderColor: colors.textTertiary,
        }]}>
          <Text style={[styles.targetLabel, { color: colors.textTertiary }]}>
            Meta: {targetValue}{targetUnit}
          </Text>
        </View>
      )}

      <View style={styles.chart}>
        {last30.map((day, index) => {
          const dayDate = new Date(day.date);
          const isToday = format(new Date(), 'yyyy-MM-dd') === day.date;
          const isSelected = selectedDay === index;
          const barHeight = getBarHeight(day);
          const barColor = getBarColor(day);

          return (
            <TouchableOpacity 
              key={index} 
              style={styles.barContainer}
              onPress={() => handleBarPress(index)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.bar,
                  {
                    height: barHeight,
                    backgroundColor: barColor,
                    opacity: isSelected ? 1 : (day.completed ? 0.85 : 0.3),
                    borderWidth: isSelected ? 2 : 0,
                    borderColor: colors.primary,
                  },
                ]}
              />
              
              {isSelected && day.completed && (
                <View style={[styles.tooltip, { backgroundColor: colors.background }]}>
                  <Text style={[styles.tooltipValue, { color: colors.textPrimary }]}>
                    {day.value ? `${day.value}${targetUnit || ''}` : '✓'}
                  </Text>
                  <Text style={[styles.tooltipDate, { color: colors.textSecondary }]}>
                    {format(dayDate, 'dd/MM')}
                  </Text>
                </View>
              )}

              {(index % 5 === 0 || isToday) && (
                <Text style={[
                  styles.dayLabel,
                  { color: colors.textTertiary },
                  isToday && { color: colors.primary, fontWeight: '700' },
                ]}>
                  {format(dayDate, 'd', { locale: ptBR })}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[styles.legend, { borderTopColor: colors.border }]}>
        {targetValue ? (
          <>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>100%+</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: habitColor }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>80-99%</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>50-79%</Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: habitColor }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>Completado</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.border }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>Não completado</Text>
            </View>
          </>
        )}
      </View>

      <Text style={[styles.hint, { color: colors.textTertiary }]}>
        💡 Toque em uma barra para ver detalhes
      </Text>
    </>
  );
}

// ==================== VISUALIZAÇÃO 2: LINHA ====================
function LineView({ data, habitColor }: { data: DayData[]; habitColor: string }) {
  const { colors } = useTheme();
  const last30 = data.slice(-30);

  const points = last30.map((day, index) => {
    const x = (index / (last30.length - 1)) * (CHART_WIDTH - PADDING * 2) + PADDING;
    const y = day.completed ? PADDING : MAX_HEIGHT - PADDING;
    return { x, y, completed: day.completed, date: day.date };
  });

  const linePath = points.map((point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    return `L ${point.x} ${point.y}`;
  }).join(' ');

  const areaPath = 
    linePath + 
    ` L ${points[points.length - 1].x} ${MAX_HEIGHT - PADDING}` +
    ` L ${points[0].x} ${MAX_HEIGHT - PADDING} Z`;

  const completedDays = last30.filter(d => d.completed).length;
  const successRate = ((completedDays / last30.length) * 100).toFixed(0);

  let currentStreak = 0;
  for (let i = last30.length - 1; i >= 0; i--) {
    if (last30[i].completed) currentStreak++;
    else break;
  }

  return (
    <>
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: habitColor }]}>{completedDays}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Completados</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{successRate}%</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Taxa</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: colors.streak }]}>{currentStreak}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Sequência</Text>
        </View>
      </View>

      <View style={styles.chartContainer}>
        <Svg width={CHART_WIDTH} height={MAX_HEIGHT}>
          <Defs>
            <LinearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={habitColor} stopOpacity="0.3" />
              <Stop offset="1" stopColor={habitColor} stopOpacity="0.05" />
            </LinearGradient>
          </Defs>
          <Path d={areaPath} fill="url(#areaGradient)" />
          <Path d={linePath} stroke={habitColor} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((point, index) => (
            <Circle
              key={index}
              cx={point.x}
              cy={point.y}
              r={point.completed ? 4 : 2}
              fill={point.completed ? habitColor : colors.border}
              opacity={point.completed ? 1 : 0.5}
            />
          ))}
        </Svg>

        <View style={styles.dateLabels}>
          <Text style={[styles.dateLabel, { color: colors.textTertiary }]}>
            {format(new Date(last30[0].date), 'dd/MM')}
          </Text>
          <Text style={[styles.dateLabel, { color: colors.textTertiary }]}>
            {format(new Date(last30[Math.floor(last30.length / 2)].date), 'dd/MM')}
          </Text>
          <Text style={[styles.dateLabel, { color: colors.textTertiary }]}>
            {format(new Date(last30[last30.length - 1].date), 'dd/MM')}
          </Text>
        </View>
      </View>

      <View style={[styles.legend, { borderTopColor: colors.border }]}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: habitColor }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Últimos 30 dias</Text>
        </View>
      </View>
    </>
  );
}

// ==================== VISUALIZAÇÃO 3: SEMANAS ====================
function WeeksView({ data, habitColor }: { data: DayData[]; habitColor: string }) {
  const { colors } = useTheme();
  const last30 = data.slice(-30);

  const weeksMap = new Map<string, DayData[]>();
  last30.forEach(day => {
    const date = new Date(day.date);
    const weekStart = startOfWeek(date, { weekStartsOn: 0 });
    const weekKey = format(weekStart, 'yyyy-MM-dd');
    if (!weeksMap.has(weekKey)) weeksMap.set(weekKey, []);
    weeksMap.get(weekKey)!.push(day);
  });

  const weeklyData = Array.from(weeksMap.entries())
    .map(([weekKey, days]) => {
      const startDate = new Date(weekKey);
      const completed = days.filter(d => d.completed).length;
      const total = days.length;
      const percentage = (completed / total) * 100;
      return {
        weekLabel: format(startDate, 'dd/MM', { locale: ptBR }),
        completed,
        total,
        percentage,
        startDate,
      };
    })
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

  const getBarColor = (percentage: number) => {
    if (percentage === 100) return colors.success;
    if (percentage >= 75) return habitColor;
    if (percentage >= 50) return colors.warning;
    return colors.danger;
  };

  const getWeekIcon = (percentage: number) => {
    if (percentage === 100) return 'crown';
    if (percentage >= 75) return 'star';
    if (percentage >= 50) return 'checkCircle';
    return 'alert';
  };

  return (
    <>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Últimas {weeklyData.length} semanas
      </Text>

      <View style={styles.weeksContainer}>
        {weeklyData.map((week, index) => {
          const barColor = getBarColor(week.percentage);
          const isCurrentWeek = index === weeklyData.length - 1;

          return (
            <View key={index} style={styles.weekRow}>
              <View style={styles.weekLabel}>
                <Text style={[
                  styles.weekText,
                  { color: colors.textSecondary },
                  isCurrentWeek && { color: colors.primary, fontWeight: '700' },
                ]}>
                  {week.weekLabel}
                </Text>
                {isCurrentWeek && (
                  <View style={[styles.currentBadge, { backgroundColor: colors.primaryLight }]}>
                    <Text style={[styles.currentText, { color: colors.primary }]}>Atual</Text>
                  </View>
                )}
              </View>

              <View style={styles.progressContainer}>
                <View style={[styles.progressBackground, { backgroundColor: colors.border }]}>
                  <View style={[styles.progressFill, { width: `${week.percentage}%`, backgroundColor: barColor }]} />
                </View>
                <View style={styles.percentageContainer}>
                  <Icon name={getWeekIcon(week.percentage)} size={14} color={barColor} />
                  <Text style={[styles.percentage, { color: barColor }]}>
                    {week.percentage.toFixed(0)}%
                  </Text>
                </View>
              </View>

              <Text style={[styles.count, { color: colors.textTertiary }]}>
                {week.completed}/{week.total}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={[styles.summary, { backgroundColor: colors.background }]}>
        <View style={styles.summaryItem}>
          <Icon name="calendar" size={16} color={colors.textSecondary} />
          <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
            {last30.length} dias analisados
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Icon name="checkCircle" size={16} color={colors.success} />
          <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
            {last30.filter(d => d.completed).length} completados
          </Text>
        </View>
      </View>

      <View style={[styles.legend, { borderTopColor: colors.border }]}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>100%</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: habitColor }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>75%+</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>50-74%</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>{"<"}50%</Text>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: 12, padding: 16, marginTop: 8 },
  viewToggle: { flexDirection: 'row', borderRadius: 8, padding: 4, marginBottom: 16, gap: 4 },
  viewButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6 },
  viewButtonActive: {},
  viewButtonText: { fontSize: 12, fontWeight: '600' },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: MAX_HEIGHT + 30, gap: 2 },
  barContainer: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 3, minHeight: 8 },
  targetLine: { position: 'absolute', left: 16, right: 16, height: 1, borderTopWidth: 1, borderStyle: 'dashed', zIndex: 1 },
  targetLabel: { fontSize: 9, position: 'absolute', right: 0, top: -12 },
  tooltip: { position: 'absolute', bottom: '100%', marginBottom: 4, paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3, minWidth: 40, alignItems: 'center' },
  tooltipValue: { fontSize: 11, fontWeight: '700' },
  tooltipDate: { fontSize: 9 },
  dayLabel: { fontSize: 9, marginTop: 4 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  statBox: { alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  statLabel: { fontSize: 11 },
  chartContainer: { marginBottom: 8 },
  dateLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingHorizontal: PADDING },
  dateLabel: { fontSize: 10 },
  subtitle: { fontSize: 12, marginBottom: 16, textAlign: 'center' },
  weeksContainer: { gap: 12 },
  weekRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  weekLabel: { width: 60 },
  weekText: { fontSize: 11 },
  currentBadge: { paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4, marginTop: 2 },
  currentText: { fontSize: 8, fontWeight: '600' },
  progressContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressBackground: { flex: 1, height: 20, borderRadius: 10, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 10 },
  percentageContainer: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 50 },
  percentage: { fontSize: 12, fontWeight: '700' },
  count: { fontSize: 10, minWidth: 30, textAlign: 'right' },
  summary: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 16, padding: 12, borderRadius: 8, gap: 8 },
  summaryItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summaryText: { fontSize: 11 },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 16, paddingTop: 12, borderTopWidth: 1, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 10 },
  hint: { fontSize: 10, textAlign: 'center', marginTop: 8, fontStyle: 'italic' },
  emptyContainer: { borderRadius: 12, padding: 40, alignItems: 'center', marginTop: 8 },
  emptyText: { fontSize: 14 },
});