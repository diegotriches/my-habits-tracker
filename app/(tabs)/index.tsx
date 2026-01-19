// app/(tabs)/index.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useHabits } from '@/hooks/useHabits';
import { useCompletions } from '@/hooks/useCompletions';
import { useStreaks } from '@/hooks/useStreaks';
import { useProfile } from '@/hooks/useProfile';
import { usePenalties } from '@/hooks/usePenalties';
import { useTheme } from '../contexts/ThemeContext';
import HabitCard from '@/components/habits/HabitCard';
import { PenaltyNotification } from '@/components/penalties/PenaltyNotification';
import { SuccessToast } from '@/components/ui/SuccessToast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { HabitListSkeleton } from '@/components/skeletons/HabitListSkeleton';
import { Icon } from '@/components/ui/Icon';
import { isHabitDueToday } from '@/utils/habitHelpers';

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
  
  const [pendingPenalties, setPendingPenalties] = useState<any[]>([]);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showUncompleteConfirm, setShowUncompleteConfirm] = useState(false);
  const [selectedHabitId, setSelectedHabitId] = useState('');
  
  const loading = habitsLoading || completionsLoading;

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

  const handleComplete = async (
    habitId: string, 
    achievedValue?: number,
    mode?: 'add' | 'replace'
  ) => {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;

    const isCompleted = isCompletedToday(habitId);
    const completion = getCompletion(habitId);

    if (habit.has_target && completion) {
      const streak = getStreak(habitId);
      const { data, error } = await completeHabit(
        habit, 
        streak, 
        achievedValue,
        mode || 'replace'
      );
      
      if (!error && data) {
        await updateStreakWithFrequency(habitId, habit, true);
        
        const currentValue = completion.value_achieved || 0;
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
        }

        setShowSuccessToast(true);

        if (percentage >= 100 && 'pointsDifference' in data && data.pointsDifference && data.pointsDifference > 0) {
          setTimeout(() => {
            setSuccessMessage(`Meta atingida! +${data.pointsDifference} pts de bônus!`);
            setShowSuccessToast(true);
          }, 2000);
        }

        refetchProfile();
      }
      return;
    }

    if (isCompleted && !habit.has_target) {
      setSelectedHabitId(habitId);
      setShowUncompleteConfirm(true);
    } else {
      const streak = getStreak(habitId);
      const { data, error } = await completeHabit(habit, streak, achievedValue, mode);
      
      if (error) {
        setSuccessMessage('Erro ao completar hábito');
        setShowSuccessToast(true);
      } else if (data) {
        const streakResult = await updateStreakWithFrequency(habitId, habit, true);
        const updatedStreak = streakResult.data;
        
        if (habit.has_target && achievedValue && habit.target_value) {
          const percentage = (achievedValue / habit.target_value) * 100;
          if (percentage >= 100) {
            setSuccessMessage(`Meta atingida! +${data.pointsEarned} pts (${achievedValue} ${habit.target_unit})`);
          } else {
            setSuccessMessage(`Progresso registrado: ${achievedValue} ${habit.target_unit} (+${data.pointsEarned} pts)`);
          }
        } else {
          const streakBonus = updatedStreak && updatedStreak.current_streak >= 7 
            ? ` ${updatedStreak.current_streak} dias!` 
            : '';
          setSuccessMessage(`+${data.pointsEarned} pontos ganhos!${streakBonus}`);
        }
        
        setShowSuccessToast(true);
        refetchProfile();
      }
    }
  };

  const handleConfirmUncomplete = async () => {
    const habit = habits.find(h => h.id === selectedHabitId);
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

  const todayCompletions = completions.length;
  const todaysHabits = habits.filter(habit => isHabitDueToday(habit));

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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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

      {todaysHabits.length === 0 ? (
        <EmptyState
          icon="target"
          title={habits.length === 0 ? "Nenhum hábito ainda" : "Nenhum hábito para hoje"}
          subtitle={habits.length === 0 
            ? "Crie seu primeiro hábito e comece sua jornada de transformação!"
            : "Você não tem hábitos programados para hoje. Aproveite o descanso! 😊"}
          buttonText={habits.length === 0 ? "Criar Primeiro Hábito" : undefined}
          onButtonPress={habits.length === 0 ? handleCreateHabit : undefined}
        />
      ) : (
        <FlatList
          data={todaysHabits}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <HabitCard
              habit={item}
              onPress={() => handleHabitPress(item.id)}
              onComplete={(achievedValue, mode) => handleComplete(item.id, achievedValue, mode)}
              isCompleted={isCompletedToday(item.id)}
              streak={getStreak(item.id)}
              completion={getCompletion(item.id)}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl 
              refreshing={loading} 
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
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
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  greeting: {
    fontSize: 14,
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
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
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  divider: {
    width: 1,
  },
});