// components/stats/CompletionChart.tsx
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import { hapticFeedback } from '@/utils/haptics';
import React, { useState } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BarChart, LineChart } from 'react-native-chart-kit';
import { DailyStats, WeekdayStats } from '../../hooks/useStats';

interface Props {
  dailyStats: DailyStats[];
  weekdayStats: WeekdayStats[];
}

type ChartType = 'daily' | 'weekday';

export const CompletionChart: React.FC<Props> = ({ dailyStats, weekdayStats }) => {
  const { colors, theme } = useTheme();
  const [chartType, setChartType] = useState<ChartType>('daily');
  const screenWidth = Dimensions.get('window').width - 80;

  const handleChartTypeChange = (type: ChartType) => {
    if (type === chartType) return;
    hapticFeedback.selection();
    setChartType(type);
  };

  // Preparar dados para gráfico diário (últimos 7 dias)
  // Se dailyStats tem menos de 7 dias, preencher com dias anteriores
  const prepareDailyData = () => {
    const today = new Date();
    const last7: Array<{ label: string; value: number }> = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const stat = dailyStats.find(s => s.date === dateStr);
      last7.push({
        label: `${date.getDate()}/${date.getMonth() + 1}`,
        value: stat ? stat.completions : 0,
      });
    }

    return last7;
  };

  const dailyPrepared = prepareDailyData();
  const dailyLabels = dailyPrepared.map(d => d.label);
  const dailyData = dailyPrepared.map(d => d.value);
  const hasDailyData = dailyData.some(v => v > 0);

  // Garantir que o dataset nunca é vazio ou todos zeros para o chart
  // react-native-chart-kit falha com dataset [0,0,0,...]
  const safeDailyData = hasDailyData ? dailyData : dailyData.map(() => 0);

  // Dados para gráfico por dia da semana
  const weekdayLabels = weekdayStats.map(stat => stat.day);
  const weekdayData = weekdayStats.map(stat => stat.completions);
  const hasWeekdayData = weekdayData.some(v => v > 0);

  const chartConfig = {
    backgroundColor: colors.primary,
    backgroundGradientFrom: colors.primary,
    backgroundGradientTo: colors.primaryDark,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#fff',
    },
  };

  const barChartConfig = {
    backgroundColor: colors.secondary,
    backgroundGradientFrom: colors.secondary,
    backgroundGradientTo: colors.primary,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    style: {
      borderRadius: 16,
    },
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Progresso</Text>
        <View style={[styles.toggleContainer, { backgroundColor: colors.surfaceElevated }]}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              chartType === 'daily' && [styles.toggleButtonActive, { backgroundColor: colors.surface }],
            ]}
            onPress={() => handleChartTypeChange('daily')}
          >
            <Text style={[
              styles.toggleText,
              { color: colors.textSecondary },
              chartType === 'daily' && [styles.toggleTextActive, { color: colors.primary }],
            ]}>
              7 Dias
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              chartType === 'weekday' && [styles.toggleButtonActive, { backgroundColor: colors.surface }],
            ]}
            onPress={() => handleChartTypeChange('weekday')}
          >
            <Text style={[
              styles.toggleText,
              { color: colors.textSecondary },
              chartType === 'weekday' && [styles.toggleTextActive, { color: colors.primary }],
            ]}>
              Semana
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {chartType === 'daily' && hasDailyData && (
        <LineChart
          data={{
            labels: dailyLabels,
            datasets: [{ data: safeDailyData }],
          }}
          width={screenWidth}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
          withInnerLines={false}
          withOuterLines={false}
        />
      )}

      {chartType === 'daily' && !hasDailyData && (
        <View style={styles.emptyState}>
          <Icon name="trendingUp" size={32} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Nenhuma conclusão nos últimos 7 dias
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
            Complete hábitos para ver seu progresso aqui
          </Text>
        </View>
      )}

      {chartType === 'weekday' && hasWeekdayData && (
        <BarChart
          data={{
            labels: weekdayLabels,
            datasets: [{ data: weekdayData }],
          }}
          width={screenWidth}
          height={220}
          yAxisLabel=""
          yAxisSuffix=""
          chartConfig={barChartConfig}
          style={styles.chart}
          withInnerLines={false}
          showValuesOnTopOfBars
          fromZero
        />
      )}

      {chartType === 'weekday' && !hasWeekdayData && (
        <View style={styles.emptyState}>
          <Icon name="calendar" size={32} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Sem dados por dia da semana
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
            Complete hábitos para ver a distribuição
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 2,
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  toggleButtonActive: {},
  toggleText: {
    fontSize: 12,
    fontWeight: '500',
  },
  toggleTextActive: {
    fontWeight: '600',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 4,
  },
  emptySubtext: {
    fontSize: 13,
  },
});