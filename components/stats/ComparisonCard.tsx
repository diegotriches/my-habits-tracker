import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import { hapticFeedback } from '@/utils/haptics';
import React, { useState } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface ComparisonData {
  current: number;
  previous: number;
  label: string;
}

interface Props {
  weekComparison: ComparisonData;
  monthComparison: ComparisonData;
}

type PeriodType = 'week' | 'month';

export const ComparisonCard: React.FC<Props> = ({
  weekComparison,
  monthComparison,
}) => {
  const { colors } = useTheme();
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('week');
  const slideAnim = useSharedValue(0);

  const data = selectedPeriod === 'week' ? weekComparison : monthComparison;
  const difference = data.current - data.previous;
  const percentageChange = data.previous === 0
    ? 0
    : ((difference / data.previous) * 100);
  
  const isPositive = difference >= 0;

  const handlePeriodChange = (period: PeriodType) => {
    if (period === selectedPeriod) return;
    
    hapticFeedback.selection();
    setSelectedPeriod(period);
    
    slideAnim.value = withSpring(period === 'week' ? 0 : 1, {
      damping: 15,
      stiffness: 150,
    });
  };

  const slideStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slideAnim.value * 100 }],
  }));

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Comparação de Período
        </Text>
      </View>

      {/* Toggle de Período */}
      <View style={[styles.toggleContainer, { backgroundColor: colors.surfaceElevated }]}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            selectedPeriod === 'week' && [
              styles.toggleButtonActive,
              { backgroundColor: colors.primary },
            ],
          ]}
          onPress={() => handlePeriodChange('week')}
        >
          <Text
            style={[
              styles.toggleText,
              { color: colors.textSecondary },
              selectedPeriod === 'week' && styles.toggleTextActive,
            ]}
          >
            Semana
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            selectedPeriod === 'month' && [
              styles.toggleButtonActive,
              { backgroundColor: colors.primary },
            ],
          ]}
          onPress={() => handlePeriodChange('month')}
        >
          <Text
            style={[
              styles.toggleText,
              { color: colors.textSecondary },
              selectedPeriod === 'month' && styles.toggleTextActive,
            ]}
          >
            Mês
          </Text>
        </TouchableOpacity>
      </View>

      {/* Comparação */}
      <View style={styles.comparisonContainer}>
        <View style={styles.comparisonRow}>
          <View style={styles.comparisonItem}>
            <Text style={[styles.comparisonLabel, { color: colors.textSecondary }]}>
              {data.label} Atual
            </Text>
            <Text style={[styles.comparisonValue, { color: colors.textPrimary }]}>
              {data.current}
            </Text>
          </View>

          <View style={styles.comparisonDivider}>
            <Icon name="chevronRight" size={24} color={colors.border} />
          </View>

          <View style={styles.comparisonItem}>
            <Text style={[styles.comparisonLabel, { color: colors.textSecondary }]}>
              {data.label} Anterior
            </Text>
            <Text style={[styles.comparisonValue, { color: colors.textPrimary }]}>
              {data.previous}
            </Text>
          </View>
        </View>

        {/* Badge de Diferença */}
        <View
          style={[
            styles.differenceBadge,
            {
              backgroundColor: isPositive
                ? colors.successLight
                : colors.dangerLight,
            },
          ]}
        >
          <Icon
            name={isPositive ? 'trendingUp' : 'alert'}
            size={16}
            color={isPositive ? colors.success : colors.danger}
          />
          <Text
            style={[
              styles.differenceText,
              { color: isPositive ? colors.success : colors.danger },
            ]}
          >
            {isPositive ? '+' : ''}{difference} ({percentageChange > 0 ? '+' : ''}{percentageChange.toFixed(1)}%)
          </Text>
        </View>

        {/* Mensagem Motivacional */}
        <View style={[styles.messageContainer, { backgroundColor: colors.infoLight }]}>
          <Icon name="info" size={14} color={colors.info} />
          <Text style={[styles.message, { color: colors.info }]}>
            {isPositive
              ? `Ótimo! Você melhorou ${Math.abs(percentageChange).toFixed(0)}% em relação ao período anterior!`
              : difference === 0
              ? 'Mantenha a consistência! Continue assim!'
              : `Não desanime! Cada dia é uma nova oportunidade de melhorar.`}
          </Text>
        </View>
      </View>
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
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleButtonActive: {},
  toggleText: {
    fontSize: 14,
    fontWeight: '500',
  },
  toggleTextActive: {
    fontWeight: '600',
    color: '#FFFFFF',
  },
  comparisonContainer: {
    gap: 16,
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  comparisonItem: {
    flex: 1,
    alignItems: 'center',
  },
  comparisonLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  comparisonValue: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  comparisonDivider: {
    marginHorizontal: 16,
  },
  differenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  differenceText: {
    fontSize: 16,
    fontWeight: '700',
  },
  messageContainer: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderRadius: 10,
  },
  message: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});