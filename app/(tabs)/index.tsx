import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useHabits } from '@/hooks/useHabits';
import { useCompletions } from '@/hooks/useCompletions';
import { useStreaks } from '@/hooks/useStreaks';
import { useProfile } from '@/hooks/useProfile';
import HabitCard from '@/components/habits/HabitCard';

export default function HomeScreen() {
  const { habits, loading: habitsLoading, refetch: refetchHabits } = useHabits();
  const { 
    completions, 
    loading: completionsLoading, 
    completeHabit, 
    uncompleteHabit,
    isCompletedToday,
    getTodayPoints,
    refetch: refetchCompletions 
  } = useCompletions();
  const { streaks, fetchStreaks, getStreak } = useStreaks();
  const { profile, refetch: refetchProfile } = useProfile();

  const loading = habitsLoading || completionsLoading;

  // Carregar streaks quando os hábitos mudarem
  useEffect(() => {
    if (habits.length > 0) {
      const habitIds = habits.map(h => h.id);
      fetchStreaks(habitIds);
    }
  }, [habits]);

  const handleCreateHabit = () => {
    router.push('/habits/create' as any);
  };

  const handleHabitPress = (habitId: string) => {
    router.push(`/habits/${habitId}` as any);
  };

  const handleComplete = async (habitId: string) => {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;

    const isCompleted = isCompletedToday(habitId);

    if (isCompleted) {
      // Descompletar
      const { error } = await uncompleteHabit(habitId);
      if (error) {
        Alert.alert('Erro', error);
      } else {
        refetchProfile();
      }
    } else {
      // Completar
      const streak = getStreak(habitId);
      const { data, error } = await completeHabit(habit, streak);
      
      if (error) {
        Alert.alert('Erro', error);
      } else if (data) {
        // Mostrar feedback de sucesso
        const streakBonus = data.newStreak >= 7 ? ` 🔥 ${data.newStreak} dias!` : '';
        Alert.alert(
          '🎉 Parabéns!',
          `Você ganhou +${data.pointsEarned} pontos!${streakBonus}\n\nTotal: ${data.totalPoints} pontos`,
          [{ text: 'Continuar' }]
        );
        refetchProfile();
      }
    }
  };

  const handleRefresh = async () => {
    await Promise.all([
      refetchHabits(),
      refetchCompletions(),
      refetchProfile(),
    ]);
  };

  const todayCompletions = completions.length;
  const todayPoints = getTodayPoints();

  if (habitsLoading && habits.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Olá! 👋</Text>
          <Text style={styles.title}>Meus Hábitos</Text>
        </View>

        <TouchableOpacity style={styles.addButton} onPress={handleCreateHabit}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Lista de Hábitos */}
      {habits.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🎯</Text>
          <Text style={styles.emptyTitle}>Nenhum hábito ainda</Text>
          <Text style={styles.emptyText}>
            Crie seu primeiro hábito e comece sua jornada!
          </Text>
          <TouchableOpacity style={styles.emptyButton} onPress={handleCreateHabit}>
            <Text style={styles.emptyButtonText}>Criar Hábito</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={habits}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <HabitCard
              habit={item}
              onPress={() => handleHabitPress(item.id)}
              onComplete={() => handleComplete(item.id)}
              isCompleted={isCompletedToday(item.id)}
              streak={getStreak(item.id)}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={handleRefresh} />
          }
        />
      )}

      {/* Stats Footer */}
      {habits.length > 0 && (
        <View style={styles.statsFooter}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{habits.length}</Text>
            <Text style={styles.statLabel}>Hábitos</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{todayCompletions}</Text>
            <Text style={styles.statLabel}>Completos Hoje</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, styles.pointsValue]}>
              {profile?.total_points || 0}
            </Text>
            <Text style={styles.statLabel}>Pontos</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  greeting: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonText: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '300',
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statsFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  divider: {
    width: 1,
    backgroundColor: '#e5e7eb',
  },
  pointsValue: {
    color: '#3b82f6',
  },
});