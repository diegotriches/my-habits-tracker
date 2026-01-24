// app/(tabs)/index.tsx
import HabitCard from '@/components/habits/HabitCard';
import { HabitCompactRow } from '@/components/habits/HabitCompactRow';
import { HabitProgressInput } from '@/components/habits/HabitProgressInput';
import { HabitWeeklyRow } from '@/components/habits/HabitWeeklyRow';
import { ViewMode, ViewModeSelector } from '@/components/habits/ViewModeSelector';
import { WeeklySummaryCard } from '@/components/habits/WeeklySummaryCard';
import { PenaltyNotification } from '@/components/penalties/PenaltyNotification';
import { HabitListSkeleton } from '@/components/skeletons/HabitListSkeleton';
import { CelebrationModal } from '@/components/ui/CelebrationModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { SuccessToast } from '@/components/ui/SuccessToast';
import { useCelebration } from '@/hooks/useCelebration';
import { useCompletions } from '@/hooks/useCompletions';
import { useHabits } from '@/hooks/useHabits';
import { usePenalties } from '@/hooks/usePenalties';
import { useProfile } from '@/hooks/useProfile';
import { useStreaks } from '@/hooks/useStreaks';
import { Habit } from '@/types/database';
import { isHabitDueToday } from '@/utils/habitHelpers';
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

const STORAGE_KEY = '@habitViewMode';

export default function HomeScreen() {
  const { colors } = useTheme();
  const { habits, loading: habitsLoading, refresh: refetchHabits } = useHabits();
  const { 
    completions, 
    loading: completionsLoading, 
    completeHabit, 
    uncompleteHabit,
    isCompletedToday,
    getCompletion,
    getTodayPoints,
    refetch: refetchCompletions 
  } = useCompletions();
  const { streaks, fetchStreaks, getStreak, updateStreakWithFrequency, checkExpiredStreaks } = useStreaks();
  const { profile, refetch: refetchProfile } = useProfile();
  const { checkPenalties } = usePenalties();
  const { 
    celebrationData, 
    isVisible: showCelebration, 
    checkStreakMilestone,
    checkTargetAchievement,
    checkPointsMilestone,
    closeCelebration 
  } = useCelebration();
  
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [pendingPenalties, setPendingPenalties] = useState<any[]>([]);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showUncompleteConfirm, setShowUncompleteConfirm] = useState(false);
  const [selectedHabitId, setSelectedHabitId] = useState('');
  
  // 🆕 Estado do modal de progresso
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
  
  const loading = habitsLoading || completionsLoading;

  useEffect(() => {
    loadViewMode();
  }, []);

  useEffect(() => {
    if (habits.length > 0) {
      const habitIds = habits.map(h => h.id);
      fetchStreaks(habitIds);
      checkExpiredStreaks(habits);
    }
  }, [habits]);

  useEffect(() => {
    checkForPenalties();
  }, []);

  const loadViewMode = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved === 'cards' || saved === 'weekly' || saved === 'compact') {
        setViewMode(saved);
      }
    } catch (error) {
      console.error('Erro ao carregar modo de visualização:', error);
    }
  };

  const handleViewModeChange = async (mode: ViewMode) => {
    setViewMode(mode);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, mode);
    } catch (error) {
      console.error('Erro ao salvar modo de visualização:', error);
    }
  };

  const checkForPenalties = async () => {
    try {
      const results = await checkPenalties(false);
      if (results && results.length > 0) {
        const appliedPenalties = results.filter((r: any) => r.penaltyApplied);
        if (appliedPenalties.length > 0) {
          setPendingPenalties(appliedPenalties);
        }
      }
    } catch (error) {
      // Erro silencioso
    }
  };

  const dismissPenalty = (index: number) => {
    setPendingPenalties(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreateHabit = () => {
    router.push('/habits/create' as any);
  };

  const handleHabitPress = (habitId: string) => {
    router.push(`/habits/${habitId}` as any);
  };

  // 🆕 Abrir modal de edição de progresso
  const handleEditProgress = (habitId: string) => {
    const habit = habits.find(h => h.id === habitId);
    if (!habit || !habit.has_target) return;
    
    setSelectedHabit(habit);
    setShowProgressModal(true);
  };

  // 🆕 Confirmar progresso no modal
  const handleConfirmProgress = async (value: number, mode: 'add' | 'replace') => {
    if (!selectedHabit) return;

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

      if (percentage >= 100 && 'pointsDifference' in data && data.pointsDifference && data.pointsDifference > 0) {
        setTimeout(() => {
          checkTargetAchievement(selectedHabit.name, data.pointsDifference);
        }, 1000);
      }

      refetchProfile();
    }

    setShowProgressModal(false);
    setSelectedHabit(null);
  };

  const handleComplete = async (
    habitId: string, 
    achievedValue?: number,
    mode?: 'add' | 'replace'
  ) => {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;

    const isCompleted = isCompletedToday(habitId);
    const completion = getCompletion(habitId);

    // 🆕 Para hábitos com meta numérica, não fazer nada aqui
    // O modal será aberto via onEditProgress
    if (habit.has_target) {
      return;
    }

    // Hábitos binários: se já completou, mostrar confirmação para desmarcar
    if (isCompleted && !habit.has_target) {
      setSelectedHabitId(habitId);
      setShowUncompleteConfirm(true);
      return;
    }

    // Hábitos binários: completar normalmente
    const streak = getStreak(habitId);
    const { data, error } = await completeHabit(habit, streak, achievedValue, mode);
    
    if (error) {
      setSuccessMessage('Erro ao completar hábito');
      setShowSuccessToast(true);
    } else if (data) {
      const streakResult = await updateStreakWithFrequency(habitId, habit, true);
      const updatedStreak = streakResult.data;
      
      const streakBonus = updatedStreak && updatedStreak.current_streak >= 7 
        ? ` ${updatedStreak.current_streak} dias!` 
        : '';
      setSuccessMessage(`+${data.pointsEarned} pontos ganhos!${streakBonus}`);
      
      setShowSuccessToast(true);

      if (updatedStreak?.current_streak) {
        const hasMilestone = checkStreakMilestone(
          updatedStreak.current_streak,
          data.pointsEarned
        );
        
        if (!hasMilestone) {
          refetchProfile();
        } else {
          setTimeout(() => {
            refetchProfile();
          }, 3000);
        }
      } else {
        refetchProfile();
      }

      if (data.totalPoints) {
        setTimeout(() => {
          checkPointsMilestone(data.totalPoints);
        }, 500);
      }
    }
  };

  const handleDayPress = async (habit: Habit, date: Date) => {
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    
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
    const completion = getCompletion(selectedHabitId);
    
    if (!habit || !completion) {
      setShowUncompleteConfirm(false);
      setSelectedHabitId('');
      return;
    }

    const pointsToDeduct = completion.points_earned;

    const { error } = await uncompleteHabit(selectedHabitId);
    
    if (error) {
      setSuccessMessage('Erro ao desmarcar hábito');
      setShowSuccessToast(true);
    } else {
      // Atualizar streak
      if (habit) {
        await updateStreakWithFrequency(selectedHabitId, habit, false);
      }
      
      setSuccessMessage(`Hábito desmarcado (-${pointsToDeduct} pontos)`);
      setShowSuccessToast(true);
      refetchProfile();
    }
    
    setShowUncompleteConfirm(false);
    setSelectedHabitId('');
  };

  const handleRefresh = async () => {
    await Promise.all([
      refetchHabits(),
      refetchCompletions(),
      refetchProfile(),
    ]);
    await checkForPenalties();
  };

  const todaysHabits = habits.filter(habit => isHabitDueToday(habit));
  const todayCompletions = completions.length;

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
    
    if (viewMode === 'weekly') {
      return (
        <HabitWeeklyRow
          habit={item}
          streak={getStreak(item.id)}
          completions={completions.filter(c => c.habit_id === item.id)}
          onDayPress={handleDayPress}
          onHabitPress={handleHabitPress}
          isDueToday={isDueToday}
        />
      );
    }
    
    if (viewMode === 'compact') {
      return (
        <HabitCompactRow
          habit={item}
          streak={getStreak(item.id)}
          completion={getCompletion(item.id)}
          isCompleted={isCompletedToday(item.id)}
          isDueToday={isDueToday}
          onPress={() => handleHabitPress(item.id)}
          onEditProgress={() => handleEditProgress(item.id)}
          onComplete={(achievedValue, mode) => handleComplete(item.id, achievedValue, mode)}
        />
      );
    }
    
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
          points={celebrationData.points}
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
        message="Isso removerá os pontos ganhos hoje com este hábito."
        confirmText="Confirmar"
        cancelText="Cancelar"
        confirmColor="danger"
        onConfirm={handleConfirmUncomplete}
        onCancel={() => {
          setShowUncompleteConfirm(false);
          setSelectedHabitId('');
        }}
      />

      {/* 🆕 Modal de Progresso */}
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

      {pendingPenalties.map((penalty, index) => (
        <PenaltyNotification
          key={index}
          pointsLost={penalty.pointsLost}
          reason={penalty.reason}
          onDismiss={() => dismissPenalty(index)}
        />
      ))}

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
          <ViewModeSelector 
            mode={viewMode} 
            onChange={handleViewModeChange}
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
            viewMode === 'weekly' ? (
              <WeeklySummaryCard
                habits={habits}
                completions={completions}
                streaks={streaks}
              />
            ) : null
          }
        />
      )}

      {habits.length > 0 && (
        <View style={[styles.statsFooter, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{todaysHabits.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Para Hoje</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.divider }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{todayCompletions}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Completos</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.divider }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {profile?.total_points || 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pontos</Text>
          </View>
        </View>
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
  statsFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  statLabel: { fontSize: 12 },
  divider: { width: 1 },
});