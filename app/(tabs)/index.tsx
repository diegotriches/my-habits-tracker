// app/(tabs)/index.tsx
import HabitCard from '@/components/habits/HabitCard';
import { HabitProgressInput } from '@/components/habits/HabitProgressInput';
import { HabitWeeklyRow } from '@/components/habits/HabitWeeklyRow';
import { TimePeriodSelector, TimePeriod } from '@/components/habits/TimePeriodSelector';
import { WeeklySummaryCard } from '@/components/habits/WeeklySummaryCard';
import { HabitListSkeleton } from '@/components/skeletons/HabitListSkeleton';
import { CelebrationModal } from '@/components/ui/CelebrationModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { SuccessToast } from '@/components/ui/SuccessToast';
import { useCelebration } from '@/hooks/useCelebration';
import { useCompletions } from '@/hooks/useCompletions';
import { useWeeklyCompletions } from '@/hooks/useWeeklyCompletions';
import { useHabits } from '@/hooks/useHabits';
import { useProfile } from '@/hooks/useProfile';
import { useStreaks } from '@/hooks/useStreaks';
import { Habit } from '@/types/database';
import { isHabitDueToday } from '@/utils/habitHelpers';
import { retroactiveCompletionService } from '@/services/retroactiveCompletionService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';

const PERIOD_STORAGE_KEY = '@habitTimePeriod';

export default function HomeScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { habits, loading: habitsLoading, refresh: refetchHabits } = useHabits();

  const {
    completions,
    loading: completionsLoading,
    completeHabit,
    uncompleteHabit,
    isCompletedToday,
    getCompletion,
    refetch: refetchCompletions
  } = useCompletions();

  const {
    completions: weeklyCompletions,
    refetch: refetchWeeklyCompletions,
  } = useWeeklyCompletions();

  const { streaks, fetchStreaks, getStreak, updateStreakWithFrequency, checkExpiredStreaks } = useStreaks();
  const { refetch: refetchProfile } = useProfile();
  const {
    celebrationData,
    isVisible: showCelebration,
    checkStreakMilestone,
    checkTargetAchievement,
    closeCelebration
  } = useCelebration();

  const [timePeriod, setTimePeriod] = useState<TimePeriod>('day');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showUncompleteConfirm, setShowUncompleteConfirm] = useState(false);
  const [selectedHabitId, setSelectedHabitId] = useState('');
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);

  const loading = habitsLoading || completionsLoading;

  useEffect(() => {
    loadViewPreferences();
  }, []);

  useEffect(() => {
    if (habits.length > 0) {
      const habitIds = habits.map(h => h.id);
      fetchStreaks(habitIds);
      checkExpiredStreaks(habits);
    }
  }, [habits]);

  const loadViewPreferences = async () => {
    try {
      const savedPeriod = await AsyncStorage.getItem(PERIOD_STORAGE_KEY);
      if (savedPeriod === 'day' || savedPeriod === 'week') {
        setTimePeriod(savedPeriod);
      }
    } catch (error) {
      // Erro silencioso
    }
  };

  const handleTimePeriodChange = async (period: TimePeriod) => {
    setTimePeriod(period);
    try {
      await AsyncStorage.setItem(PERIOD_STORAGE_KEY, period);
    } catch (error) {
      // Erro silencioso
    }
  };

  const handleCreateHabit = () => {
    router.push('/habits/create' as any);
  };

  const handleHabitPress = (habitId: string) => {
    router.push(`/habits/${habitId}` as any);
  };

  const handleEditProgress = (habitId: string) => {
    const habit = habits.find(h => h.id === habitId);
    if (!habit || !habit.has_target) return;
    setSelectedHabit(habit);
    setShowProgressModal(true);
  };

  const handleConfirmProgress = async (value: number, mode: 'add' | 'replace') => {
    if (!selectedHabit || !user) return;

    const retroDate = (window as any).__tempRetroDate;

    if (retroDate) {
      const result = await retroactiveCompletionService.completeRetroactively(
        selectedHabit,
        retroDate,
        user.id,
        value
      );

      if (result.success) {
        await retroactiveCompletionService.recalculateStreak(selectedHabit.id);
        await fetchStreaks([selectedHabit.id]);

        setSuccessMessage(result.message);
        setShowSuccessToast(true);
        await refetchCompletions();
        await refetchWeeklyCompletions();
      } else {
        setSuccessMessage(result.message);
        setShowSuccessToast(true);
      }

      (window as any).__tempRetroDate = null;
      setShowProgressModal(false);
      setSelectedHabit(null);
      return;
    }

    const streak = getStreak(selectedHabit.id);
    const { data, error } = await completeHabit(
      selectedHabit,
      streak,
      value,
      mode
    );

    if (!error && data) {
      await updateStreakWithFrequency(selectedHabit.id, selectedHabit, true);

      const finalValue = data.achievedValue || 0;
      const percentage = selectedHabit.target_value
        ? (finalValue / selectedHabit.target_value) * 100
        : 0;

      const isUpdate = 'wasUpdate' in data && data.wasUpdate;

      if (isUpdate && mode === 'add') {
        setSuccessMessage(
          `Adicionado ${value} ${selectedHabit.target_unit}! Total: ${finalValue} ${selectedHabit.target_unit} (${percentage.toFixed(0)}%)`
        );
      } else if (isUpdate && mode === 'replace') {
        setSuccessMessage(
          `Atualizado para ${finalValue} ${selectedHabit.target_unit} (${percentage.toFixed(0)}%)`
        );
      } else {
        setSuccessMessage(
          `Registrado ${finalValue} ${selectedHabit.target_unit} (${percentage.toFixed(0)}%)`
        );
      }

      setShowSuccessToast(true);

      if (percentage >= 100) {
        setTimeout(() => {
          checkTargetAchievement(selectedHabit.name);
        }, 1000);
      }

      await refetchWeeklyCompletions();
    }

    setShowProgressModal(false);
    setSelectedHabit(null);
  };

  const handleRetroactiveComplete = async (habit: Habit, date: Date) => {
    if (!user) return;

    const result = await retroactiveCompletionService.completeRetroactively(
      habit,
      date,
      user.id
    );

    if (result.success) {
      await retroactiveCompletionService.recalculateStreak(habit.id);
      await fetchStreaks([habit.id]);

      setSuccessMessage(result.message);
      setShowSuccessToast(true);
      await refetchCompletions();
      await refetchWeeklyCompletions();
    } else {
      setSuccessMessage(result.message);
      setShowSuccessToast(true);
    }
  };

  const handleComplete = async (
    habitId: string,
    achievedValue?: number,
    mode?: 'add' | 'replace'
  ) => {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;

    const isCompleted = isCompletedToday(habitId);

    if (habit.has_target) {
      if (achievedValue !== undefined && achievedValue > 0 && mode) {
        const streak = getStreak(habitId);
        const { data, error } = await completeHabit(habit, streak, achievedValue, mode);

        if (!error && data) {
          await updateStreakWithFrequency(habitId, habit, true);

          const finalValue = data.achievedValue || 0;
          const percentage = habit.target_value
            ? (finalValue / habit.target_value) * 100
            : 0;

          const isUpdate = 'wasUpdate' in data && data.wasUpdate;

          if (isUpdate && mode === 'add') {
            setSuccessMessage(
              `Adicionado ${achievedValue} ${habit.target_unit}! Total: ${finalValue} ${habit.target_unit} (${percentage.toFixed(0)}%)`
            );
          } else if (isUpdate && mode === 'replace') {
            setSuccessMessage(
              `Atualizado para ${finalValue} ${habit.target_unit} (${percentage.toFixed(0)}%)`
            );
          } else {
            setSuccessMessage(
              `Registrado ${finalValue} ${habit.target_unit} (${percentage.toFixed(0)}%)`
            );
          }

          setShowSuccessToast(true);

          if (percentage >= 100) {
            setTimeout(() => {
              checkTargetAchievement(habit.name);
            }, 1000);
          }

          await refetchWeeklyCompletions();
        } else if (error) {
          setSuccessMessage('Erro ao registrar progresso');
          setShowSuccessToast(true);
        }
      }
      return;
    }

    if (isCompleted && !habit.has_target) {
      setSelectedHabitId(habitId);
      setShowUncompleteConfirm(true);
      return;
    }

    const streak = getStreak(habitId);
    const { data, error } = await completeHabit(habit, streak, achievedValue, mode);

    if (error) {
      setSuccessMessage('Erro ao completar hábito');
      setShowSuccessToast(true);
    } else if (data) {
      const streakResult = await updateStreakWithFrequency(habitId, habit, true);
      const updatedStreak = streakResult.data;

      const streakDays = updatedStreak?.current_streak || 0;
      if (streakDays > 1) {
        setSuccessMessage(`Completado! ${streakDays} dias seguidos!`);
      } else {
        setSuccessMessage('Completado!');
      }

      setShowSuccessToast(true);

      if (updatedStreak?.current_streak) {
        checkStreakMilestone(updatedStreak.current_streak);
      }

      await refetchWeeklyCompletions();
    }
  };

  const handleDayPress = async (habit: Habit, date: Date) => {
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    const isPast = date < today && !isToday;

    const completionsToCheck = timePeriod === 'week'
      ? weeklyCompletions
      : completions;

    if (isPast && user) {
      const completion = completionsToCheck.find(c => {
        const compDate = new Date(c.completed_at);
        return compDate.toDateString() === date.toDateString() && c.habit_id === habit.id;
      });

      if (completion) {
        setShowUncompleteConfirm(true);
        setSelectedHabitId(habit.id);
        (window as any).__tempRetroDate = date;
      } else {
        if (habit.has_target) {
          setSelectedHabit(habit);
          (window as any).__tempRetroDate = date;
          setShowProgressModal(true);
        } else {
          await handleRetroactiveComplete(habit, date);
        }
      }
      return;
    }

    if (isToday) {
      if (habit.has_target) {
        handleEditProgress(habit.id);
      } else {
        await handleComplete(habit.id);
      }
    }
  };

  const handleConfirmUncomplete = async () => {
    const habit = habits.find(h => h.id === selectedHabitId);

    if (!habit || !user) {
      setShowUncompleteConfirm(false);
      setSelectedHabitId('');
      return;
    }

    const retroDate = (window as any).__tempRetroDate;

    if (retroDate) {
      const result = await retroactiveCompletionService.uncompleteRetroactively(
        habit,
        retroDate,
        user.id
      );

      if (result.success) {
        await retroactiveCompletionService.recalculateStreak(habit.id);
        await fetchStreaks([habit.id]);

        setSuccessMessage(result.message);
        setShowSuccessToast(true);
        await refetchCompletions();
        await refetchWeeklyCompletions();
      } else {
        setSuccessMessage(result.message);
        setShowSuccessToast(true);
      }

      (window as any).__tempRetroDate = null;
      setShowUncompleteConfirm(false);
      setSelectedHabitId('');
      return;
    }

    const { error } = await uncompleteHabit(selectedHabitId);

    if (error) {
      setSuccessMessage('Erro ao desmarcar hábito');
      setShowSuccessToast(true);
    } else {
      if (habit) {
        await updateStreakWithFrequency(selectedHabitId, habit, false);
      }

      setSuccessMessage('Hábito desmarcado');
      setShowSuccessToast(true);
      await refetchWeeklyCompletions();
    }

    setShowUncompleteConfirm(false);
    setSelectedHabitId('');
  };

  const handleRefresh = async () => {
    await Promise.all([
      refetchHabits(),
      refetchCompletions(),
      refetchWeeklyCompletions(),
      refetchProfile(),
    ]);
  };

  if (habitsLoading && habits.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <View>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>Olá!</Text>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Meus Hábitos</Text>
          </View>
        </View>
        <HabitListSkeleton count={5} />
      </View>
    );
  }

  const renderHabit = (item: Habit) => {
    const isDueToday = isHabitDueToday(item);

    if (timePeriod === 'day') {
      return (
        <HabitCard
          habit={item}
          onPress={() => handleHabitPress(item.id)}
          onComplete={(achievedValue, mode) => handleComplete(item.id, achievedValue, mode)}
          isCompleted={isCompletedToday(item.id)}
          streak={getStreak(item.id)}
          completion={getCompletion(item.id)}
          isDueToday={isDueToday}
        />
      );
    }

    if (timePeriod === 'week') {
      return (
        <HabitWeeklyRow
          habit={item}
          streak={getStreak(item.id)}
          completions={weeklyCompletions.filter(c => c.habit_id === item.id)}
          onDayPress={handleDayPress}
          onHabitPress={handleHabitPress}
          isDueToday={isDueToday}
        />
      );
    }

    return null;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {celebrationData && (
        <CelebrationModal
          visible={showCelebration}
          onClose={closeCelebration}
          title={celebrationData.title}
          message={celebrationData.message}
          icon={celebrationData.icon}
          streak={celebrationData.streak}
        />
      )}

      <SuccessToast
        visible={showSuccessToast}
        message={successMessage}
        duration={3000}
        onHide={() => setShowSuccessToast(false)}
      />

      <ConfirmDialog
        visible={showUncompleteConfirm}
        title="Desmarcar hábito?"
        message="Isso removerá o registro de conclusão deste dia."
        confirmText="Confirmar"
        cancelText="Cancelar"
        confirmColor="danger"
        onConfirm={handleConfirmUncomplete}
        onCancel={() => {
          setShowUncompleteConfirm(false);
          setSelectedHabitId('');
        }}
      />

      {selectedHabit && selectedHabit.has_target && (
        <HabitProgressInput
          visible={showProgressModal}
          habitName={selectedHabit.name}
          targetValue={selectedHabit.target_value || 0}
          targetUnit={selectedHabit.target_unit || ''}
          currentValue={getCompletion(selectedHabit.id)?.value_achieved || 0}
          onConfirm={handleConfirmProgress}
          onCancel={() => {
            setShowProgressModal(false);
            setSelectedHabit(null);
          }}
        />
      )}

      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>Olá!</Text>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Meus Hábitos</Text>
        </View>

        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={handleCreateHabit}
        >
          <Icon name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {habits.length > 0 && (
        <View style={[styles.viewModeContainer, { backgroundColor: colors.background }]}>
          <TimePeriodSelector
            period={timePeriod}
            onChange={handleTimePeriodChange}
          />
        </View>
      )}

      {habits.length === 0 ? (
        <EmptyState
          icon="target"
          title="Nenhum hábito ainda"
          subtitle="Crie seu primeiro hábito e comece sua jornada de transformação!"
          buttonText="Criar Primeiro Hábito"
          onButtonPress={handleCreateHabit}
        />
      ) : (
        <FlatList
          data={habits}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => renderHabit(item)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={
            timePeriod === 'week' ? (
              <WeeklySummaryCard
                habits={habits}
                completions={weeklyCompletions}
                streaks={streaks}
              />
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  greeting: { fontSize: 14, marginBottom: 4 },
  title: { fontSize: 24, fontWeight: 'bold' },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  viewModeContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
});