// components/habits/HabitWeeklyRow.tsx
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import { Completion, Habit, Streak } from '@/types/database';
import { getDayShortName } from '@/utils/habitHelpers';
import { hapticFeedback } from '@/utils/haptics';
import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
} from 'react-native';
import { startOfWeek, addDays, format, isSameDay, isFuture } from 'date-fns';

interface HabitWeeklyRowProps {
  habit: Habit;
  streak?: Streak;
  completions: Completion[];
  onDayPress: (habit: Habit, date: Date) => void;
  onHabitPress: (habitId: string) => void;
  isDueToday?: boolean;
}

export function HabitWeeklyRow({
  habit,
  streak,
  completions,
  onDayPress,
  onHabitPress,
  isDueToday = true,
}: HabitWeeklyRowProps) {
  const { colors } = useTheme();
  const isNegative = habit.type === 'negative';
  const habitColor = isNegative ? colors.warning : habit.color;
  
  // Calcular semana atual (Domingo a Sábado)
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Verificar quais dias foram completados
  const isCompletedOnDay = (date: Date) => {
    return completions.some(c => {
      const completionDate = new Date(c.completed_at);
      return isSameDay(completionDate, date);
    });
  };

  // Verificar se é dia programado
  const isScheduledDay = (date: Date) => {
    if (habit.frequency_type === 'daily') return true;
    if (habit.frequency_type === 'weekly' && habit.frequency_days) {
      const dayOfWeek = date.getDay();
      return habit.frequency_days.includes(dayOfWeek);
    }
    return true;
  };

  // Pegar completion do dia (para metas numéricas)
  const getCompletionForDay = (date: Date) => {
    return completions.find(c => {
      const completionDate = new Date(c.completed_at);
      return isSameDay(completionDate, date);
    });
  };

  // Calcular progresso semanal
  const completedDays = weekDays.filter(day => isCompletedOnDay(day)).length;
  const expectedDays = habit.frequency_type === 'daily' 
    ? 7 
    : habit.frequency_days?.length || 7;
  const progress = expectedDays > 0 ? (completedDays / expectedDays) * 100 : 0;

  const handleDayPress = (date: Date) => {
    if (isFuture(date)) {
      hapticFeedback.error();
      return;
    }
    
    hapticFeedback.selection();
    onDayPress(habit, date);
  };

  const handleHabitPress = () => {
    hapticFeedback.light();
    onHabitPress(habit.id);
  };

  const renderDayCheckbox = (date: Date, index: number) => {
    const isCompleted = isCompletedOnDay(date);
    const isScheduled = isScheduledDay(date);
    const isDayFuture = isFuture(date);
    const isToday = isSameDay(date, today);
    const completion = getCompletionForDay(date);
    
    // Se tem meta numérica e foi completado, verificar se atingiu 100%
    const hasMetTarget = habit.has_target && completion && habit.target_value
      ? (completion.value_achieved || 0) >= habit.target_value
      : false;

    let checkboxColor = colors.border;
    let checkIcon: 'check' | 'shield' | 'star' | null = null;
    let badgeText = null;

    if (isDayFuture) {
      checkboxColor = colors.divider;
    } else if (isCompleted) {
      if (hasMetTarget) {
        // Meta atingida
        checkboxColor = colors.success;
        checkIcon = 'star'; // Usando 'star' ao invés de 'target'
        badgeText = '🎯';
      } else if (habit.has_target) {
        // Completado mas não atingiu 100%
        checkboxColor = habitColor;
        checkIcon = 'check';
        const percentage = habit.target_value && completion
          ? Math.round(((completion.value_achieved || 0) / habit.target_value) * 100)
          : 0;
        badgeText = `${percentage}%`;
      } else {
        // Completado normal
        checkboxColor = isNegative ? colors.warning : colors.success;
        checkIcon = isNegative ? 'shield' : 'check';
      }
    } else if (isScheduled && !isCompleted && !isDayFuture) {
      // Dia programado mas não completado
      checkboxColor = colors.danger + '40';
    }

    return (
      <TouchableOpacity
        key={index}
        style={[
          styles.dayCheckbox,
          { borderColor: checkboxColor },
          isCompleted && { backgroundColor: checkboxColor },
          isToday && styles.todayCheckbox,
          isDayFuture && styles.futureCheckbox,
        ]}
        onPress={() => handleDayPress(date)}
        disabled={isDayFuture}
      >
        {checkIcon ? (
          <Icon 
            name={checkIcon} 
            size={14} 
            color={colors.textInverse} 
          />
        ) : badgeText ? (
          <Text style={[styles.badgeText, { color: colors.textInverse }]}>
            {badgeText}
          </Text>
        ) : null}
        
        {isToday && !isCompleted && (
          <View style={[styles.todayDot, { backgroundColor: colors.primary }]} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { 
          backgroundColor: colors.background,
          borderColor: colors.border,
        },
        !isDueToday && { opacity: 0.7 },
      ]}
      onLongPress={handleHabitPress}
      activeOpacity={0.7}
    >
      {/* Indicador de cor lateral */}
      <View style={[styles.colorIndicator, { backgroundColor: habitColor }]} />

      {/* Informações do hábito */}
      <View style={styles.habitInfo}>
        <View style={styles.habitHeader}>
          <View style={styles.habitNameRow}>
            {isNegative && (
              <Icon name="xCircle" size={16} color={colors.warning} />
            )}
            <Text 
              style={[styles.habitName, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {habit.name}
            </Text>
          </View>

          {/* Progresso e Streak */}
          <View style={styles.statsRow}>
            <Text style={[styles.progressText, { color: colors.textSecondary }]}>
              {completedDays}/{expectedDays}
            </Text>
            
            {streak && streak.current_streak > 0 && (
              <View style={[styles.streakBadge, { backgroundColor: colors.streakLight }]}>
                <Icon name="flame" size={10} color={colors.streak} />
                <Text style={[styles.streakText, { color: colors.streak }]}>
                  {streak.current_streak}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Grid de dias da semana */}
        <View style={styles.weekGrid}>
          <View style={styles.dayLabels}>
            {weekDays.map((date, i) => (
              <Text 
                key={i} 
                style={[
                  styles.dayLabel, 
                  { color: colors.textTertiary },
                  isSameDay(date, today) && { 
                    color: colors.primary,
                    fontWeight: '700' 
                  }
                ]}
              >
                {getDayShortName(date.getDay())[0]}
              </Text>
            ))}
          </View>

          <View style={styles.dayCheckboxes}>
            {weekDays.map((date, i) => renderDayCheckbox(date, i))}
          </View>
        </View>

        {/* Barra de progresso */}
        <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
          <View 
            style={[
              styles.progressFill,
              { 
                width: `${progress}%`,
                backgroundColor: progress >= 100 ? colors.success : habitColor,
              }
            ]}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  colorIndicator: {
    width: 4,
  },
  habitInfo: {
    flex: 1,
    padding: 12,
  },
  habitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  habitNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  habitName: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '600',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  streakText: {
    fontSize: 11,
    fontWeight: '700',
  },
  weekGrid: {
    marginBottom: 8,
  },
  dayLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '600',
    width: 32,
    textAlign: 'center',
  },
  dayCheckboxes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayCheckbox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  todayCheckbox: {
    borderWidth: 2.5,
  },
  futureCheckbox: {
    opacity: 0.4,
  },
  todayDot: {
    position: 'absolute',
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  progressBar: {
    height: 3,
    borderRadius: 1.5,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 1.5,
  },
});