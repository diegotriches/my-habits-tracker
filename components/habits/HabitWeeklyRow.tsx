// components/habits/HabitWeeklyRow.tsx
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import { Completion, Habit, Streak } from '@/types/database';
import { getDayShortName } from '@/utils/habitHelpers';
import { hapticFeedback } from '@/utils/haptics';
import { addDays, isFuture, isSameDay, startOfWeek, addWeeks, subWeeks } from 'date-fns';
import React, { useRef } from 'react';
import { Text, TouchableOpacity, View, PanResponder, Animated } from 'react-native';
import { styles } from './HabitWeeklyRowStyles';

interface HabitWeeklyRowProps {
  habit: Habit;
  streak?: Streak;
  completions: Completion[];
  onDayPress: (habit: Habit, date: Date) => void;
  onHabitPress: (habitId: string) => void;
  isDueToday?: boolean;
  weekStart?: Date;
  onWeekChange?: (newWeekStart: Date) => void;
}

export function HabitWeeklyRow({
  habit,
  streak,
  completions,
  onDayPress,
  onHabitPress,
  isDueToday = true,
  weekStart: weekStartProp,
  onWeekChange,
}: HabitWeeklyRowProps) {
  const { colors } = useTheme();
  const isNegative = habit.type === 'negative';
  const habitColor = isNegative ? colors.warning : habit.color;

  const today = new Date();
  const weekStart = weekStartProp || startOfWeek(today, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Swipe navigation
  const translateX = useRef(new Animated.Value(0)).current;
  const swipeThreshold = 50;
  const maxWeeksBack = 12;

  const currentWeekStart = startOfWeek(today, { weekStartsOn: 0 });
  const oldestWeek = subWeeks(currentWeekStart, maxWeeksBack);
  const canGoBack = weekStart.getTime() > oldestWeek.getTime();
  const canGoForward = weekStart.getTime() < currentWeekStart.getTime();

  // Mutable ref to avoid stale closures in PanResponder
  const swipeRef = useRef({ weekStart, canGoBack, canGoForward, onWeekChange });
  swipeRef.current = { weekStart, canGoBack, canGoForward, onWeekChange };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) => {
        // Captura se o movimento horizontal é dominante
        return Math.abs(gs.dx) > 10 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.5;
      },
      onMoveShouldSetPanResponderCapture: (_, gs) => {
        // Captura antes de outros respondedores se horizontal é claro
        return Math.abs(gs.dx) > 15 && Math.abs(gs.dx) > Math.abs(gs.dy) * 2;
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, gs) => {
        translateX.setValue(gs.dx * 0.3);
      },
      onPanResponderRelease: (_, gs) => {
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 120,
          friction: 10,
        }).start();

        const { weekStart: ws, canGoBack: back, canGoForward: fwd, onWeekChange: cb } = swipeRef.current;

        if (gs.dx > swipeThreshold && cb && back) {
          hapticFeedback.selection();
          cb(subWeeks(ws, 1));
        } else if (gs.dx < -swipeThreshold && cb && fwd) {
          hapticFeedback.selection();
          cb(addWeeks(ws, 1));
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 120,
          friction: 10,
        }).start();
      },
    })
  ).current;

  const isCompletedOnDay = (date: Date): boolean => {
    return completions.some(c => {
      const completionDate = new Date(c.completed_at);
      return isSameDay(completionDate, date);
    });
  };

  const isScheduledDay = (date: Date): boolean => {
    if (habit.frequency_type === 'daily') return true;
    if (habit.frequency_type === 'weekly' && habit.frequency_days) {
      const dayOfWeek = date.getDay();
      return habit.frequency_days.includes(dayOfWeek);
    }
    return true;
  };

  const getCompletionForDay = (date: Date): Completion | undefined => {
    return completions.find(c => {
      const completionDate = new Date(c.completed_at);
      return isSameDay(completionDate, date);
    });
  };

  const getProgressPercentage = (completion: Completion | undefined): number => {
    if (!habit.has_target || !habit.target_value || !completion) return 0;
    const currentValue = completion.value_achieved || 0;
    return Math.round((currentValue / habit.target_value) * 100);
  };

  const hasMetTarget = (completion: Completion | undefined): boolean => {
    if (!habit.has_target || !habit.target_value || !completion) return false;
    const currentValue = completion.value_achieved || 0;
    return currentValue >= habit.target_value;
  };

  const getWeeklyProgress = (): { completedDays: number; expectedDays: number; progress: number } => {
    const completedDays = weekDays.filter(day => isCompletedOnDay(day)).length;
    const expectedDays = habit.frequency_type === 'daily'
      ? 7
      : habit.frequency_days?.length || 7;
    const progress = expectedDays > 0 ? (completedDays / expectedDays) * 100 : 0;
    return { completedDays, expectedDays, progress };
  };

  const handleHabitPress = () => {
    hapticFeedback.light();
    onHabitPress(habit.id);
  };

  const handleDayPress = (date: Date) => {
    if (isFuture(date)) {
      hapticFeedback.error();
      return;
    }
    hapticFeedback.selection();
    onDayPress(habit, date);
  };

  const renderDayCheckbox = (date: Date, index: number) => {
    const isCompleted = isCompletedOnDay(date);
    const isScheduled = isScheduledDay(date);
    const isDayFuture = isFuture(date);
    const isToday = isSameDay(date, today);
    const completion = getCompletionForDay(date);

    const metTarget = hasMetTarget(completion);
    const percentage = getProgressPercentage(completion);

    let checkboxColor = colors.border;
    let checkIcon: 'check' | 'shield' | 'star' | null = null;
    let badgeContent: React.ReactNode = null;

    if (isDayFuture) {
      checkboxColor = colors.divider;
    } else if (isCompleted) {
      if (habit.has_target) {
        if (metTarget) {
          checkboxColor = colors.success;
          checkIcon = 'star';
          badgeContent = (
            <Text style={[styles.badgeText, { color: colors.textInverse }]}>100%</Text>
          );
        } else if (percentage >= 50) {
          checkboxColor = colors.warning;
          badgeContent = (
            <Text style={[styles.badgeText, { color: colors.textInverse }]}>{percentage}%</Text>
          );
        } else {
          checkboxColor = colors.danger;
          badgeContent = (
            <Text style={[styles.badgeText, { color: colors.textInverse }]}>{percentage}%</Text>
          );
        }
      } else {
        checkboxColor = isNegative ? colors.warning : colors.success;
        checkIcon = isNegative ? 'shield' : 'check';
      }
    } else if (isScheduled && !isCompleted && !isDayFuture) {
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
        {checkIcon && !badgeContent ? (
          <Icon name={checkIcon} size={14} color={colors.textInverse} />
        ) : (
          badgeContent
        )}
        {isToday && !isCompleted && (
          <View style={[styles.todayDot, { backgroundColor: colors.primary }]} />
        )}
      </TouchableOpacity>
    );
  };

  const { completedDays, expectedDays, progress } = getWeeklyProgress();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderColor: colors.border,
        },
        !isDueToday && { opacity: 0.7 },
      ]}
    >
      <View style={[styles.colorIndicator, { backgroundColor: habitColor }]} />

      <View style={styles.habitInfo}>
        <TouchableOpacity
          onPress={handleHabitPress}
          activeOpacity={0.7}
          style={styles.habitHeader}
        >
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
        </TouchableOpacity>

        <Animated.View
          style={{ transform: [{ translateX }], minHeight: 60 }}
          {...panResponder.panHandlers}
        >
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
                      fontWeight: '700',
                    },
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
        </Animated.View>

        <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${progress}%`,
                backgroundColor: progress >= 100 ? colors.success : habitColor,
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
}