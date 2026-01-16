import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useHabitDetails } from '@/hooks/useHabitDetails';
import { useHabits } from '@/hooks/useHabits';
import HabitCalendar from '@/components/habits/HabitCalendar';
import HabitStats from '@/components/habits/HabitStats';
import { ReminderSetup } from '@/components/habits/ReminderSetup';
import { DIFFICULTY_CONFIG } from '@/constants/GameConfig';

export default function HabitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { habit, completions, streak, stats, loading, refetch } = useHabitDetails(id as string);
  const { deleteHabit } = useHabits();
  const [deleting, setDeleting] = useState(false);

  const handleEdit = () => {
    router.push(`/habits/edit/${id}` as any);
  };

  const handleDelete = () => {
    Alert.alert(
      'Deletar Hábito',
      `Tem certeza que deseja deletar "${habit?.name}"? Esta ação não pode ser desfeita.`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Deletar',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            const { error } = await deleteHabit(id as string);
            setDeleting(false);

            if (error) {
              Alert.alert('Erro', error);
            } else {
              Alert.alert('Sucesso', 'Hábito deletado com sucesso', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!habit) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Hábito não encontrado</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const difficultyConfig = DIFFICULTY_CONFIG[habit.difficulty];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButtonHeader}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalhes</Text>
        <TouchableOpacity onPress={handleEdit}>
          <Text style={styles.editButton}>Editar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Informações do Hábito */}
        <View style={[styles.habitInfo, { borderLeftColor: habit.color }]}>
          <Text style={styles.habitName}>{habit.name}</Text>
          
          {habit.description && (
            <Text style={styles.habitDescription}>{habit.description}</Text>
          )}

          <View style={styles.habitMeta}>
            <View style={[styles.difficultyBadge, { backgroundColor: difficultyConfig.color + '20' }]}>
              <Text style={[styles.difficultyText, { color: difficultyConfig.color }]}>
                {difficultyConfig.label}
              </Text>
            </View>

            <Text style={styles.pointsText}>+{habit.points_base} pts por dia</Text>
          </View>
        </View>

        {/* Estatísticas */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Estatísticas</Text>
          <HabitStats
            totalCompletions={stats.totalCompletions}
            totalPoints={stats.totalPoints}
            streak={streak || undefined}
            successRate={stats.successRate}
            color={habit.color}
          />
        </View>

        {/* SEÇÃO DE LEMBRETES */}
        <ReminderSetup habitId={id as string} habitName={habit.name} />

        {/* Calendário */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Histórico</Text>
          <HabitCalendar
            completionDates={stats.completionDates}
            color={habit.color}
          />
        </View>

        {/* Últimas Completions */}
        {completions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Últimas Conclusões</Text>
            <View style={styles.completionsList}>
              {completions.slice(0, 10).map((completion) => {
                const date = new Date((completion as any).completed_at);
                const dateStr = date.toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                });
                const points = (completion as any).points_earned;

                return (
                  <View key={(completion as any).id} style={styles.completionItem}>
                    <Text style={styles.completionDate}>{dateStr}</Text>
                    <Text style={styles.completionPoints}>+{points} pts</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Botão de Deletar */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          disabled={deleting}
        >
          {deleting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.deleteButtonText}>Deletar Hábito</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  errorText: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  backButtonHeader: {
    fontSize: 16,
    color: '#3b82f6',
  },
  editButton: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  habitInfo: {
    backgroundColor: '#fff',
    padding: 20,
    borderLeftWidth: 4,
    marginBottom: 12,
  },
  habitName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  habitDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  habitMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  pointsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#f9fafb',
  },
  completionsList: {
    backgroundColor: '#fff',
    paddingVertical: 8,
  },
  completionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  completionDate: {
    fontSize: 14,
    color: '#374151',
  },
  completionPoints: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});