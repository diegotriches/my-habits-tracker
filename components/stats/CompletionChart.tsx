import { useTheme } from '@/contexts/ThemeContext';
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
  const screenWidth = Dimensions.get('window').width - 40;

  // Preparar dados para gráfico diário (últimos 7 dias)
  const last7Days = dailyStats.slice(-7);
  const dailyLabels = last7Days.map(stat => {
    const date = new Date(stat.date);
    return `${date.getDate()}/${date.getMonth() + 1}`;
  });
  const dailyData = last7Days.map(stat => stat.completions);

  // Dados para gráfico por dia da semana
  const weekdayLabels = weekdayStats.map(stat => stat.day);
  const weekdayData = weekdayStats.map(stat => stat.completions);

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
            onPress={() => setChartType('daily')}
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
            onPress={() => setChartType('weekday')}
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

      {chartType === 'daily' && dailyData.length > 0 && (
        <LineChart
          data={{
            labels: dailyLabels,
            datasets: [{ data: dailyData }],
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

      {chartType === 'weekday' && weekdayData.length > 0 && (
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

      {dailyData.length === 0 && chartType === 'daily' && (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Nenhum dado dos últimos 7 dias
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
            Complete hábitos para ver seu progresso
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
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
  },
});