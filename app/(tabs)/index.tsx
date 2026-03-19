// app/(tabs)/index.tsx
import { HabitProgressInput } from '@/components/habits/HabitProgressInput';
import { HabitWeeklyRow } from '@/components/habits/HabitWeeklyRow';
import { WeekNavigator } from '@/components/habits/WeekNavigator';
import { DraggableHabitList } from '@/components/habits/DraggableHabitList';
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
import { useHabitOrder } from '@/hooks/useHabitOrder';
import { useProfile } from '@/hooks/useProfile';
import { useStreaks } from '@/hooks/useStreaks';
import { Habit } from '@/types/database';
import { isHabitDueToday } from '@/utils/habitHelpers';
import { retroactiveCompletionService } from '@/services/retroactiveCompletionService';
import { router } from 'expo-router';
import React, { useEffect, useState, useCallback } from 'react';
import {
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { startOfWeek, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';

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

  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 0 })
  );

  const {
    completions: weeklyCompletions,
    refetch: refetchWeeklyCompletions,
  } = useWeeklyCompletions();

  const { streaks, fetchStreaks, getStreak, updateStreakWithFrequency, checkExpiredStreaks } = useStreaks();
  const { profile, refetch: refetchProfile } = useProfile();
  const {
    celebrationData,
    isVisible: showCelebration,
    checkStreakMilestone,
    checkTargetAchievement,
    closeCelebration
  } = useCelebration();

  // Ordem arrastável
  const habitIds = habits.map(h => h.id);
  const { orderedIds, updateOrder } = useHabitOrder(habitIds);

  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showUncompleteConfirm, setShowUncompleteConfirm] = useState(false);
  const [selectedHabitId, setSelectedHabitId] = useState('');
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);

  const loading = habitsLoading || completionsLoading;

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const firstName = profile?.display_name?.split(' ')[0] || '';
  const todayFormatted = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });

  useEffect(() => {
    if (habits.length > 0) {
      const habitIds = habits.map(h => h.id);
      fetchStreaks(habitIds);
      checkExpiredStreaks(habits);
    }
  }, [habits]);

  const handleWeekChange = useCallback((newWeekStart: Date) => {
    setSelectedWeekStart(newWeekStart);
    refetchWeeklyCompletions(newWeekStart);
  }, [refetchWeeklyCompletions]);

  useEffect(() => {
    refetchWeeklyCompletions(selectedWeekStart);
  }, [selectedWeekStart]);

  const handleCreateHabit = () => router.push('/habits/create' as any);
  const handleHabitPress = (habitId: string) => router.push(`/habits/${habitId}` as any);

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
        selectedHabit, retroDate, user.id, value
      );
      if (result.success) {
        await retroactiveCompletionService.recalculateStreak(selectedHabit.id);
        await fetchStreaks([selectedHabit.id]);
        setSuccessMessage(result.message);
        setShowSuccessToast(true);
        await refetchCompletions();
        await refetchWeeklyCompletions(selectedWeekStart);
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
    const { data, error } = await completeHabit(selectedHabit, streak, value, mode);

    if (!error && data) {
      await updateStreakWithFrequency(selectedHabit.id, selectedHabit, true);
      const finalValue = data.achievedValue || 0;
      const percentage = selectedHabit.target_value
        ? (finalValue / selectedHabit.target_value) * 100
        : 0;
      const isUpdate = 'wasUpdate' in data && data.wasUpdate;

      if (isUpdate && mode === 'add') {
        setSuccessMessage(`Adicionado ${value} ${selectedHabit.target_unit}! Total: ${finalValue} ${selectedHabit.target_unit} (${percentage.toFixed(0)}%)`);
      } else if (isUpdate && mode === 'replace') {
        setSuccessMessage(`Atualizado para ${finalValue} ${selectedHabit.target_unit} (${percentage.toFixed(0)}%)`);
      } else {
        setSuccessMessage(`Registrado ${finalValue} ${selectedHabit.target_unit} (${percentage.toFixed(0)}%)`);
      }

      setShowSuccessToast(true);
      if (percentage >= 100) setTimeout(() => checkTargetAchievement(selectedHabit.name), 1000);
      await refetchWeeklyCompletions(selectedWeekStart);
    }

    setShowProgressModal(false);
    setSelectedHabit(null);
  };

  const handleRetroactiveComplete = async (habit: Habit, date: Date) => {
    if (!user) return;
    const result = await retroactiveCompletionService.completeRetroactively(habit, date, user.id);
    if (result.success) {
      await retroactiveCompletionService.recalculateStreak(habit.id);
      await fetchStreaks([habit.id]);
      setSuccessMessage(result.message);
      setShowSuccessToast(true);
      await refetchCompletions();
      await refetchWeeklyCompletions(selectedWeekStart);
    } else {
      setSuccessMessage(result.message);
      setShowSuccessToast(true);
    }
  };

  const handleComplete = async (habitId: string, achievedValue?: number, mode?: 'add' | 'replace') => {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;

    if (habit.has_target) {
      if (achievedValue !== undefined && achievedValue > 0 && mode) {
        const streak = getStreak(habitId);
        const { data, error } = await completeHabit(habit, streak, achievedValue, mode);
        if (!error && data) {
          await updateStreakWithFrequency(habitId, habit, true);
          const finalValue = data.achievedValue || 0;
          const percentage = habit.target_value ? (finalValue / habit.target_value) * 100 : 0;
          const isUpdate = 'wasUpdate' in data && data.wasUpdate;
          if (isUpdate && mode === 'add') {
            setSuccessMessage(`Adicionado ${achievedValue} ${habit.target_unit}! Total: ${finalValue} ${habit.target_unit} (${percentage.toFixed(0)}%)`);
          } else if (isUpdate && mode === 'replace') {
            setSuccessMessage(`Atualizado para ${finalValue} ${habit.target_unit} (${percentage.toFixed(0)}%)`);
          } else {
            setSuccessMessage(`Registrado ${finalValue} ${habit.target_unit} (${percentage.toFixed(0)}%)`);
          }
          setShowSuccessToast(true);
          if (percentage >= 100) setTimeout(() => checkTargetAchievement(habit.name), 1000);
          await refetchWeeklyCompletions(selectedWeekStart);
        } else if (error) {
          setSuccessMessage('Erro ao registrar progresso');
          setShowSuccessToast(true);
        }
      }
      return;
    }

    const isCompleted = isCompletedToday(habitId);
    if (isCompleted) {
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
      setSuccessMessage(streakDays > 1 ? `Completado! ${streakDays} dias seguidos!` : 'Completado!');
      setShowSuccessToast(true);
      if (updatedStreak?.current_streak) checkStreakMilestone(updatedStreak.current_streak);
      await refetchWeeklyCompletions(selectedWeekStart);
    }
  };

  const handleDayPress = async (habit: Habit, date: Date) => {
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    const isPast = date < today && !isToday;

    if (isPast && user) {
      const completion = weeklyCompletions.find(c => {
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
      const result = await retroactiveCompletionService.uncompleteRetroactively(habit, retroDate, user.id);
      if (result.success) {
        await retroactiveCompletionService.recalculateStreak(habit.id);
        await fetchStreaks([habit.id]);
        setSuccessMessage(result.message);
        setShowSuccessToast(true);
        await refetchCompletions();
        await refetchWeeklyCompletions(selectedWeekStart);
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
      if (habit) await updateStreakWithFrequency(selectedHabitId, habit, false);
      setSuccessMessage('Hábito desmarcado');
      setShowSuccessToast(true);
      await refetchWeeklyCompletions(selectedWeekStart);
    }

    setShowUncompleteConfirm(false);
    setSelectedHabitId('');
  };

  const handleRefresh = async () => {
    await Promise.all([
      refetchHabits(),
      refetchCompletions(),
      refetchWeeklyCompletions(selectedWeekStart),
      refetchProfile(),
    ]);
  };

  if (habitsLoading && habits.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <View>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>
              {getGreeting()}{firstName ? `, ${firstName}!` : '!'}
            </Text>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Meus Hábitos</Text>
          </View>
          <View style={[styles.avatarPlaceholder, { backgroundColor: colors.border }]}>
            <Icon name="profile" size={20} color={colors.textTertiary} />
          </View>
        </View>
        <HabitListSkeleton count={5} />
      </View>
    );
  }

  const renderHabit = (item: Habit) => {
    const isDueToday = isHabitDueToday(item);
    return (
      <HabitWeeklyRow
        habit={item}
        streak={getStreak(item.id)}
        completions={weeklyCompletions.filter(c => c.habit_id === item.id)}
        onDayPress={handleDayPress}
        onHabitPress={handleHabitPress}
        isDueToday={isDueToday}
        weekStart={selectedWeekStart}
        onWeekChange={handleWeekChange}
      />
    );
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
        onCancel={() => { setShowUncompleteConfirm(false); setSelectedHabitId(''); }}
      />

      {selectedHabit && selectedHabit.has_target && (
        <HabitProgressInput
          visible={showProgressModal}
          habitName={selectedHabit.name}
          targetValue={selectedHabit.target_value || 0}
          targetUnit={selectedHabit.target_unit || ''}
          currentValue={getCompletion(selectedHabit.id)?.value_achieved || 0}
          onConfirm={handleConfirmProgress}
          onCancel={() => { setShowProgressModal(false); setSelectedHabit(null); }}
        />
      )}

      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>
            {getGreeting()}{firstName ? `, ${firstName}!` : '!'}
          </Text>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Meus Hábitos</Text>
        </View>

        <TouchableOpacity
          style={styles.avatarButton}
          onPress={() => router.push('/(tabs)/profile' as any)}
          activeOpacity={0.7}
        >
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={[styles.avatar, { borderColor: colors.primary }]} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarInitial}>
                {firstName ? firstName[0].toUpperCase() : '?'}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {habits.length === 0 ? (
        <EmptyState
          icon="target"
          title="Nenhum hábito ainda"
          subtitle="Crie seu primeiro hábito e comece sua jornada de transformação!"
          buttonText="Criar Primeiro Hábito"
          onButtonPress={handleCreateHabit}
        />
      ) : (
        <DraggableHabitList
          habits={habits}
          orderedIds={orderedIds}
          onOrderChange={updateOrder}
          renderItem={renderHabit}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={
            <View>
              <View style={styles.todayBar}>
                <Icon name="calendar" size={14} color={colors.textSecondary} />
                <Text style={[styles.todayText, { color: colors.textSecondary }]}>
                  {todayFormatted}
                </Text>
              </View>
              <WeekNavigator
                weekStart={selectedWeekStart}
                onWeekChange={handleWeekChange}
              />
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={handleCreateHabit}
        activeOpacity={0.8}
      >
        <Icon name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
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
  avatarButton: { padding: 2 },
  avatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 2 },
  avatarPlaceholder: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarInitial: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  todayBar: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  todayText: { fontSize: 13, fontWeight: '500', textTransform: 'capitalize' },
  fab: {
    position: 'absolute', bottom: 70, right: 20,
    width: 56, height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  listContent: { padding: 20, paddingBottom: 120 },
});