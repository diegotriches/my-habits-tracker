// components/habits/WeekNavigator.tsx
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import { hapticFeedback } from '@/utils/haptics';
import { format, isSameWeek, startOfWeek, addWeeks, subWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface WeekNavigatorProps {
  weekStart: Date;
  onWeekChange: (newWeekStart: Date) => void;
  maxWeeksBack?: number;
}

export function WeekNavigator({
  weekStart,
  onWeekChange,
  maxWeeksBack = 12,
}: WeekNavigatorProps) {
  const { colors } = useTheme();

  const today = new Date();
  const currentWeekStart = startOfWeek(today, { weekStartsOn: 0 });
  const isCurrentWeek = isSameWeek(weekStart, today, { weekStartsOn: 0 });

  const oldestWeek = subWeeks(currentWeekStart, maxWeeksBack);
  const canGoBack = weekStart.getTime() > oldestWeek.getTime();
  const canGoForward = !isCurrentWeek;

  const goToPreviousWeek = () => {
    if (!canGoBack) return;
    hapticFeedback.selection();
    onWeekChange(subWeeks(weekStart, 1));
  };

  const goToNextWeek = () => {
    if (!canGoForward) return;
    hapticFeedback.selection();
    onWeekChange(addWeeks(weekStart, 1));
  };

  const goToCurrentWeek = () => {
    if (isCurrentWeek) return;
    hapticFeedback.medium();
    onWeekChange(currentWeekStart);
  };

  // Formatar label da semana
  const weekEnd = addWeeks(weekStart, 1);
  weekEnd.setDate(weekEnd.getDate() - 1);

  const startDay = format(weekStart, 'd', { locale: ptBR });
  const endDay = format(weekEnd, 'd', { locale: ptBR });
  const startMonth = format(weekStart, 'MMM', { locale: ptBR });
  const endMonth = format(weekEnd, 'MMM', { locale: ptBR });

  const isSameMonth = weekStart.getMonth() === weekEnd.getMonth();
  const weekLabel = isSameMonth
    ? `${startDay} - ${endDay} de ${startMonth}`
    : `${startDay} ${startMonth} - ${endDay} ${endMonth}`;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      {/* Seta esquerda */}
      <TouchableOpacity
        onPress={goToPreviousWeek}
        disabled={!canGoBack}
        style={styles.arrowButton}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Icon
          name="chevronLeft"
          size={20}
          color={canGoBack ? colors.textPrimary : colors.border}
        />
      </TouchableOpacity>

      {/* Label da semana */}
      <TouchableOpacity
        onPress={goToCurrentWeek}
        disabled={isCurrentWeek}
        style={styles.labelContainer}
      >
        <Text style={[styles.weekLabel, { color: colors.textPrimary }]}>
          {weekLabel}
        </Text>
        {isCurrentWeek ? (
          <View style={[styles.currentBadge, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.currentBadgeText, { color: colors.primary }]}>Atual</Text>
          </View>
        ) : (
          <Text style={[styles.tapHint, { color: colors.primary }]}>
            Voltar para atual
          </Text>
        )}
      </TouchableOpacity>

      {/* Seta direita */}
      <TouchableOpacity
        onPress={goToNextWeek}
        disabled={!canGoForward}
        style={styles.arrowButton}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Icon
          name="chevronRight"
          size={20}
          color={canGoForward ? colors.textPrimary : colors.border}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  arrowButton: {
    padding: 8,
  },
  labelContainer: {
    flex: 1,
    alignItems: 'center',
  },
  weekLabel: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  currentBadge: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  currentBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  tapHint: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
});