// components/habits/HabitMonthlyCalendar.tsx - ENHANCED VERSION
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import { Completion, Habit } from '@/types/database';
import { getDayShortName } from '@/utils/habitHelpers';
import { hapticFeedback } from '@/utils/haptics';
import { 
  addDays, 
  eachDayOfInterval, 
  endOfMonth, 
  endOfWeek, 
  isFuture, 
  isSameDay, 
  isSameMonth, 
  startOfMonth, 
  startOfWeek,
  isToday as isTodayFn,
} from 'date-fns';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// 🆕 Tipos de filtro
type FilterType = 'all' | 'completed' | 'missed' | 'perfect';

interface HabitMonthlyCalendarProps {
  habits: Habit[];
  completions: Completion[];
  month: Date;
  onDayPress: (habit: Habit, date: Date) => void;
  onHabitPress: (habitId: string) => void;
}

export function HabitMonthlyCalendar({
  habits,
  completions,
  month,
  onDayPress,
  onHabitPress,
}: HabitMonthlyCalendarProps) {
  const { colors } = useTheme();
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
  const [filter, setFilter] = useState<FilterType>('all'); // 🆕 Estado de filtro

  // Calcular dias do calendário
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const today = new Date();

  // ========== HELPERS ==========

  const isCompletedOnDay = (habitId: string, date: Date): boolean => {
    return completions.some(c => {
      if (c.habit_id !== habitId) return false;
      const completionDate = new Date(c.completed_at);
      return isSameDay(completionDate, date);
    });
  };

  const getCompletionForDay = (habitId: string, date: Date): Completion | undefined => {
    return completions.find(c => {
      if (c.habit_id !== habitId) return false;
      const completionDate = new Date(c.completed_at);
      return isSameDay(completionDate, date);
    });
  };

  const getProgressPercentage = (completion: Completion | undefined, habit: Habit): number => {
    if (!habit.has_target || !habit.target_value || !completion) return 0;
    const currentValue = completion.value_achieved || 0;
    return Math.round((currentValue / habit.target_value) * 100);
  };

  const hasMetTarget = (completion: Completion | undefined, habit: Habit): boolean => {
    if (!habit.has_target || !habit.target_value || !completion) return false;
    const currentValue = completion.value_achieved || 0;
    return currentValue >= habit.target_value;
  };

  const getHeatmapColor = (completion: Completion | undefined, habit: Habit): string => {
    if (!completion) return colors.border;

    if (habit.has_target) {
      const percentage = getProgressPercentage(completion, habit);
      if (percentage >= 100) return colors.success;
      if (percentage >= 50) return colors.warning;
      return colors.danger + '80';
    }

    return habit.type === 'negative' ? colors.warning : colors.success;
  };

  const getDayCompletionCount = (date: Date): number => {
    if (!selectedHabit) {
      return completions.filter(c => 
        isSameDay(new Date(c.completed_at), date)
      ).length;
    }
    return isCompletedOnDay(selectedHabit.id, date) ? 1 : 0;
  };

  // 🆕 Verificar se dia é perfeito (todos hábitos completados)
  const isPerfectDay = (date: Date): boolean => {
    if (isFuture(date) || !isSameMonth(date, month)) return false;
    
    const dayHabits = habits.filter(h => {
      if (h.frequency_type === 'daily') return true;
      if (h.frequency_type === 'weekly' && h.frequency_days) {
        return h.frequency_days.includes(date.getDay());
      }
      return true;
    });

    if (dayHabits.length === 0) return false;

    const dayCompletions = completions.filter(c => 
      isSameDay(new Date(c.completed_at), date)
    );

    return dayCompletions.length >= dayHabits.length;
  };

  // 🆕 Verificar se dia foi perdido (nenhum hábito completado)
  const isMissedDay = (date: Date): boolean => {
    if (isFuture(date) || !isSameMonth(date, month)) return false;
    
    const dayHabits = habits.filter(h => {
      if (h.frequency_type === 'daily') return true;
      if (h.frequency_type === 'weekly' && h.frequency_days) {
        return h.frequency_days.includes(date.getDay());
      }
      return true;
    });

    if (dayHabits.length === 0) return false;

    const dayCompletions = completions.filter(c => 
      isSameDay(new Date(c.completed_at), date)
    );

    return dayCompletions.length === 0;
  };

  // 🆕 Filtrar dias baseado no filtro selecionado
  const shouldShowDay = (date: Date): boolean => {
    if (!isSameMonth(date, month)) return true; // Sempre mostra dias fora do mês (com opacidade)
    if (filter === 'all') return true;
    
    if (filter === 'completed') {
      return getDayCompletionCount(date) > 0;
    }
    if (filter === 'missed') {
      return isMissedDay(date);
    }
    if (filter === 'perfect') {
      return isPerfectDay(date);
    }
    
    return true;
  };

  const handleDayPress = (date: Date) => {
    if (!selectedHabit || isFuture(date)) {
      hapticFeedback.error();
      return;
    }
    hapticFeedback.selection();
    onDayPress(selectedHabit, date);
  };

  const handleHabitSelect = (habit: Habit) => {
    hapticFeedback.light();
    setSelectedHabit(habit.id === selectedHabit?.id ? null : habit);
  };

  const handleFilterChange = (newFilter: FilterType) => {
    hapticFeedback.light();
    setFilter(newFilter);
  };

  // 🆕 Calcular estatísticas para insights
  const totalDaysInMonth = calendarDays.filter(d => isSameMonth(d, month) && !isFuture(d)).length;
  const completedDaysCount = calendarDays.filter(d => 
    isSameMonth(d, month) && !isFuture(d) && getDayCompletionCount(d) > 0
  ).length;
  const perfectDaysCount = calendarDays.filter(isPerfectDay).length;
  const missedDaysCount = calendarDays.filter(isMissedDay).length;

  const completionRate = totalDaysInMonth > 0 
    ? Math.round((completedDaysCount / totalDaysInMonth) * 100)
    : 0;

  // ========== RENDER ==========

  const renderDay = (date: Date, index: number) => {
    const isOutsideMonth = !isSameMonth(date, month);
    const isToday = isTodayFn(date);
    const isDayFuture = isFuture(date);
    const completionCount = getDayCompletionCount(date);
    const isPerfect = isPerfectDay(date);
    const shouldShow = shouldShowDay(date);

    let backgroundColor = 'transparent';
    let showBadge = false;
    let borderColor = 'transparent';

    // 🆕 Destacar dias perfeitos com borda dourada
    if (isPerfect && !selectedHabit) {
      borderColor = colors.warning;
    }

    if (selectedHabit && !isOutsideMonth) {
      const completion = getCompletionForDay(selectedHabit.id, date);
      backgroundColor = getHeatmapColor(completion, selectedHabit);
      showBadge = !!completion && selectedHabit.has_target;
    }

    return (
      <TouchableOpacity
        key={index}
        style={[
          styles.dayCell,
          isToday && { borderColor: colors.primary, borderWidth: 2 },
          isPerfect && !selectedHabit && { borderColor, borderWidth: 2 },
          isOutsideMonth && { opacity: 0.3 },
          isDayFuture && { opacity: 0.5 },
          !shouldShow && { opacity: 0.2 }, // 🆕 Diminui opacidade de dias filtrados
          { backgroundColor },
        ]}
        onPress={() => handleDayPress(date)}
        disabled={!selectedHabit || isDayFuture || isOutsideMonth}
      >
        <Text
          style={[
            styles.dayText,
            { color: backgroundColor !== 'transparent' ? '#FFFFFF' : colors.textPrimary },
            isToday && backgroundColor === 'transparent' && { color: colors.primary, fontWeight: '700' },
          ]}
        >
          {date.getDate()}
        </Text>

        {/* Badge de percentual para metas numéricas */}
        {showBadge && selectedHabit && (
          <View style={styles.percentageBadge}>
            <Text style={styles.percentageText}>
              {getProgressPercentage(getCompletionForDay(selectedHabit.id, date), selectedHabit)}%
            </Text>
          </View>
        )}

        {/* Dot para indicar completions quando nenhum hábito selecionado */}
        {!selectedHabit && completionCount > 0 && !isOutsideMonth && (
          <View style={[styles.completionDot, { backgroundColor: colors.primary }]}>
            <Text style={styles.dotText}>{completionCount}</Text>
          </View>
        )}

        {/* 🆕 Ícone de estrela para dias perfeitos */}
        {isPerfect && !selectedHabit && !isOutsideMonth && (
          <View style={styles.perfectStar}>
            <Icon name="sparkles" size={10} color={colors.warning} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* 🆕 Filtros Rápidos */}
      {!selectedHabit && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
          contentContainerStyle={styles.filterContent}
        >
          <TouchableOpacity
            style={[
              styles.filterChip,
              { 
                backgroundColor: filter === 'all' ? colors.primary : colors.surface,
                borderColor: filter === 'all' ? colors.primary : colors.border,
              },
            ]}
            onPress={() => handleFilterChange('all')}
          >
            <Icon 
              name="list" 
              size={14} 
              color={filter === 'all' ? '#FFFFFF' : colors.textSecondary} 
            />
            <Text style={[
              styles.filterText,
              { color: filter === 'all' ? '#FFFFFF' : colors.textSecondary }
            ]}>
              Todos ({totalDaysInMonth})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              { 
                backgroundColor: filter === 'completed' ? colors.success : colors.surface,
                borderColor: filter === 'completed' ? colors.success : colors.border,
              },
            ]}
            onPress={() => handleFilterChange('completed')}
          >
            <Icon 
              name="checkCircle" 
              size={14} 
              color={filter === 'completed' ? '#FFFFFF' : colors.textSecondary} 
            />
            <Text style={[
              styles.filterText,
              { color: filter === 'completed' ? '#FFFFFF' : colors.textSecondary }
            ]}>
              Completados ({completedDaysCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              { 
                backgroundColor: filter === 'perfect' ? colors.warning : colors.surface,
                borderColor: filter === 'perfect' ? colors.warning : colors.border,
              },
            ]}
            onPress={() => handleFilterChange('perfect')}
          >
            <Icon 
              name="sparkles" 
              size={14} 
              color={filter === 'perfect' ? '#FFFFFF' : colors.textSecondary} 
            />
            <Text style={[
              styles.filterText,
              { color: filter === 'perfect' ? '#FFFFFF' : colors.textSecondary }
            ]}>
              Perfeitos ({perfectDaysCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              { 
                backgroundColor: filter === 'missed' ? colors.danger : colors.surface,
                borderColor: filter === 'missed' ? colors.danger : colors.border,
              },
            ]}
            onPress={() => handleFilterChange('missed')}
          >
            <Icon 
              name="xCircle" 
              size={14} 
              color={filter === 'missed' ? '#FFFFFF' : colors.textSecondary} 
            />
            <Text style={[
              styles.filterText,
              { color: filter === 'missed' ? '#FFFFFF' : colors.textSecondary }
            ]}>
              Perdidos ({missedDaysCount})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Filtro de Hábitos */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.habitFilter}
        contentContainerStyle={styles.habitFilterContent}
      >
        <TouchableOpacity
          style={[
            styles.habitChip,
            { 
              backgroundColor: !selectedHabit ? colors.primary : colors.surface,
              borderColor: colors.border,
            },
          ]}
          onPress={() => setSelectedHabit(null)}
        >
          <Icon 
            name="filter" 
            size={14} 
            color={!selectedHabit ? '#FFFFFF' : colors.textSecondary} 
          />
          <Text style={[
            styles.habitChipText,
            { color: !selectedHabit ? '#FFFFFF' : colors.textSecondary }
          ]}>
            Todos
          </Text>
        </TouchableOpacity>

        {habits.map(habit => (
          <TouchableOpacity
            key={habit.id}
            style={[
              styles.habitChip,
              { 
                backgroundColor: selectedHabit?.id === habit.id ? habit.color : colors.surface,
                borderColor: selectedHabit?.id === habit.id ? habit.color : colors.border,
              },
            ]}
            onPress={() => handleHabitSelect(habit)}
          >
            <Text style={[
              styles.habitChipText,
              { color: selectedHabit?.id === habit.id ? '#FFFFFF' : colors.textPrimary }
            ]}>
              {habit.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Calendário */}
      <View style={[styles.calendar, { backgroundColor: colors.surface }]}>
        {/* Cabeçalho dos dias da semana */}
        <View style={styles.weekHeader}>
          {[0, 1, 2, 3, 4, 5, 6].map(day => (
            <View key={day} style={styles.weekDayCell}>
              <Text style={[styles.weekDayText, { color: colors.textTertiary }]}>
                {getDayShortName(day)[0]}
              </Text>
            </View>
          ))}
        </View>

        {/* Grid de dias */}
        <View style={styles.daysGrid}>
          {calendarDays.map((date, index) => renderDay(date, index))}
        </View>
      </View>

      {/* 🆕 Insight Inteligente */}
      {!selectedHabit && completionRate > 0 && (
        <View style={[styles.insightCard, { backgroundColor: colors.infoLight, borderColor: colors.info }]}>
          <Icon name="info" size={16} color={colors.info} />
          <Text style={[styles.insightText, { color: colors.info }]}>
            {completionRate >= 80 && `🎉 Incrível! Você está mantendo ${completionRate}% dos seus hábitos!`}
            {completionRate >= 50 && completionRate < 80 && `💪 Bom trabalho! ${completionRate}% de conclusão. Continue assim!`}
            {completionRate < 50 && `📈 Foco! Você está em ${completionRate}%. Vamos melhorar!`}
          </Text>
        </View>
      )}

      {/* Legenda */}
      {selectedHabit && (
        <View style={styles.legend}>
          <Text style={[styles.legendTitle, { color: colors.textSecondary }]}>
            Legenda:
          </Text>
          <View style={styles.legendItems}>
            {selectedHabit.has_target ? (
              <>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: colors.success }]} />
                  <Text style={[styles.legendText, { color: colors.textSecondary }]}>
                    ≥ 100%
                  </Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: colors.warning }]} />
                  <Text style={[styles.legendText, { color: colors.textSecondary }]}>
                    50-99%
                  </Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: colors.danger + '80' }]} />
                  <Text style={[styles.legendText, { color: colors.textSecondary }]}>
                    {'< 50%'}
                  </Text>
                </View>
              </>
            ) : (
              <View style={styles.legendItem}>
                <View style={[
                  styles.legendColor, 
                  { backgroundColor: selectedHabit.type === 'negative' ? colors.warning : colors.success }
                ]} />
                <Text style={[styles.legendText, { color: colors.textSecondary }]}>
                  Completado
                </Text>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  filterRow: {
    marginBottom: 12,
  },
  filterContent: {
    paddingRight: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
  },
  habitFilter: {
    marginBottom: 12,
  },
  habitFilterContent: {
    paddingRight: 16,
    gap: 8,
  },
  habitChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  habitChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  calendar: {
    borderRadius: 12,
    padding: 12,
  },
  weekHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDayCell: {
    flex: 1,
    alignItems: 'center',
  },
  weekDayText: {
    fontSize: 11,
    fontWeight: '600',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 4,
    position: 'relative',
  },
  dayText: {
    fontSize: 13,
    fontWeight: '500',
  },
  percentageBadge: {
    position: 'absolute',
    bottom: 2,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  percentageText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  completionDot: {
    position: 'absolute',
    bottom: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  perfectStar: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
  },
  insightText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  legend: {
    marginTop: 12,
  },
  legendTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  legendItems: {
    flexDirection: 'row',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
  },
});