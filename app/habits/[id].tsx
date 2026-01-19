// app/habits/[id].tsx
import { ConsistencyChart } from '@/components/habits/ConsistencyChart';
import { HabitHeatMap } from '@/components/habits/HabitHeatMap';
import { PeriodStatsCard } from '@/components/habits/PeriodStatsCard';
import { ReminderSetup } from '@/components/habits/ReminderSetup';
import { Icon } from '@/components/ui/Icon';
import { DIFFICULTY_CONFIG } from '@/constants/GameConfig';
import { useHabitDetails } from '@/hooks/useHabitDetails';
import { useHabits } from '@/hooks/useHabits';
import { formatSelectedDays } from '@/utils/habitHelpers';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export default function HabitDetailsScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { deleteHabit } = useHabits();
  const [deleting, setDeleting] = useState(false);

  const {
    habit,
    completions,
    streak,
    weekStats,
    monthStats,
    semesterStats,
    yearStats,
    overallStats,
    last30DaysData,
    last90DaysData,
    loading,
    error,
    refetch,
  } = useHabitDetails(id as string);

  const handleEdit = () => {
    router.push(`/habits/edit/${id}` as any);
  };

  const handleDelete = () => {
    Alert.alert(
      'Deletar Hábito',
      `Tem certeza que deseja deletar "${habit?.name}"? Esta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
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
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Carregando detalhes...
        </Text>
      </View>
    );
  }

  if (error || !habit) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Icon name="alert" size={48} color={colors.danger} />
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          {error || 'Hábito não encontrado'}
        </Text>
        <TouchableOpacity 
          style={[styles.backButton, { backgroundColor: colors.primary }]} 
          onPress={() => router.back()}
        >
          <Text style={[styles.backButtonText, { color: colors.textInverse }]}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const difficultyConfig = DIFFICULTY_CONFIG[habit.difficulty];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Icon name="chevronLeft" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {habit.name}
        </Text>
        <TouchableOpacity onPress={handleEdit} style={styles.headerButton}>
          <Icon name="edit" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Card Principal do Hábito */}
        <View style={[styles.habitCard, { 
          backgroundColor: colors.background,
          borderLeftColor: habit.color,
          borderColor: colors.border 
        }]}>
          <View style={styles.habitHeader}>
            <Text style={[styles.habitName, { color: colors.textPrimary }]}>{habit.name}</Text>
            <View style={[
              styles.difficultyBadge,
              { backgroundColor: difficultyConfig.color + '20' }
            ]}>
              <Text style={[styles.difficultyText, { color: difficultyConfig.color }]}>
                {difficultyConfig.label}
              </Text>
            </View>
          </View>

          {habit.description && (
            <Text style={[styles.habitDescription, { color: colors.textSecondary }]}>
              {habit.description}
            </Text>
          )}

          {/* Frequência */}
          <View style={[styles.habitInfo, { borderTopColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="calendar" size={14} color={colors.textSecondary} />
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Frequência:</Text>
            </View>
            <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
              {habit.frequency_type === 'daily' 
                ? 'Todos os dias'
                : habit.frequency_days
                ? formatSelectedDays(habit.frequency_days)
                : 'Personalizado'}
            </Text>
          </View>

          {/* Meta Numérica */}
          {habit.has_target && (
            <View style={[styles.habitInfo, { borderTopColor: colors.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name="target" size={14} color={colors.textSecondary} />
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Meta diária:</Text>
              </View>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                {habit.target_value} {habit.target_unit}
              </Text>
            </View>
          )}

          {/* Pontos */}
          <View style={[styles.habitInfo, { borderTopColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="star" size={14} color={colors.points} />
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Pontos por conclusão:</Text>
            </View>
            <Text style={[styles.infoValue, { color: colors.primary }]}>+{habit.points_base} pts</Text>
          </View>
        </View>

        {/* Streak Cards */}
        <View style={styles.streakRow}>
          <View style={[styles.streakCard, { 
            backgroundColor: colors.background,
            borderColor: colors.streak,
            ...styles.currentStreakCard 
          }]}>
            <Icon name="flame" size={32} color={colors.streak} />
            <Text style={[styles.streakValue, { color: colors.textPrimary }]}>
              {streak?.current_streak || 0}
            </Text>
            <Text style={[styles.streakLabel, { color: colors.textSecondary }]}>Streak Atual</Text>
          </View>

          <View style={[styles.streakCard, { 
            backgroundColor: colors.background,
            borderColor: colors.warning,
            ...styles.bestStreakCard 
          }]}>
            <Icon name="award" size={32} color={colors.warning} />
            <Text style={[styles.streakValue, { color: colors.textPrimary }]}>
              {streak?.best_streak || 0}
            </Text>
            <Text style={[styles.streakLabel, { color: colors.textSecondary }]}>Melhor Streak</Text>
          </View>
        </View>

        {/* Progresso por Período */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Icon name="stats" size={16} color={colors.textPrimary} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Progresso por Período
            </Text>
          </View>
          <View style={styles.periodCardsRow}>
            <PeriodStatsCard
              label="Semana"
              percentage={weekStats?.successRate || 0}
              completed={weekStats?.completed || 0}
              total={weekStats?.total || 0}
              color="#3b82f6"
            />
            <PeriodStatsCard
              label="Mês"
              percentage={monthStats?.successRate || 0}
              completed={monthStats?.completed || 0}
              total={monthStats?.total || 0}
              color="#8b5cf6"
            />
          </View>

          <View style={styles.periodCardsRow}>
            <PeriodStatsCard
              label="Semestre"
              percentage={semesterStats?.successRate || 0}
              completed={semesterStats?.completed || 0}
              total={semesterStats?.total || 0}
              color="#ec4899"
            />
            <PeriodStatsCard
              label="Ano"
              percentage={yearStats?.successRate || 0}
              completed={yearStats?.completed || 0}
              total={yearStats?.total || 0}
              color="#f59e0b"
            />
          </View>
        </View>

        {/* Gráfico de Consistência */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Icon name="trendingUp" size={16} color={colors.textPrimary} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Consistência (Últimos 30 dias)
            </Text>
          </View>
          <ConsistencyChart data={last30DaysData} habitColor={habit.color} />
        </View>

        {/* Heat Map */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Icon name="calendar" size={16} color={colors.textPrimary} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Calendário de Atividade
            </Text>
          </View>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>Últimos 90 dias</Text>
          <HabitHeatMap data={last90DaysData} habitColor={habit.color} />
        </View>

        {/* SEÇÃO DE LEMBRETES */}
        <View style={styles.section}>
          <ReminderSetup habitId={id as string} habitName={habit.name} />
        </View>

        {/* Estatísticas Gerais */}
        {overallStats && (
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Icon name="activity" size={16} color={colors.textPrimary} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Estatísticas Gerais
              </Text>
            </View>
            <View style={[styles.statsCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <View style={[styles.statRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total de conclusões</Text>
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                  {overallStats.totalCompletions} vezes
                </Text>
              </View>

              <View style={[styles.statRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Taxa de sucesso</Text>
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                  {overallStats.successRate.toFixed(1)}%
                </Text>
              </View>

              <View style={[styles.statRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pontos ganhos</Text>
                <Text style={[styles.statValue, styles.pointsValue, { color: colors.primary }]}>
                  {overallStats.totalPoints} pts
                </Text>
              </View>

              {habit.has_target && overallStats.averageValue && (
                <>
                  <View style={[styles.statRow, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                      Valor médio alcançado
                    </Text>
                    <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                      {overallStats.averageValue.toFixed(1)} {habit.target_unit}
                    </Text>
                  </View>

                  <View style={[styles.statRow, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                      Valor máximo alcançado
                    </Text>
                    <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                      {overallStats.maxValue} {habit.target_unit}
                    </Text>
                  </View>
                </>
              )}

              <View style={styles.statRow}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Criado em</Text>
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                  {new Date(habit.created_at).toLocaleDateString('pt-BR')}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Últimas Conclusões */}
        {completions.length > 0 && (
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Icon name="checkCircle" size={16} color={colors.success} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Últimas Conclusões
              </Text>
            </View>
            <View style={[styles.completionsList, { backgroundColor: colors.background }]}>
              {completions.slice(0, 10).map((completion) => {
                const date = new Date((completion as any).completed_at);
                const dateStr = date.toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                });
                const points = (completion as any).points_earned;

                return (
                  <View key={(completion as any).id} style={[styles.completionItem, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.completionDate, { color: colors.textPrimary }]}>{dateStr}</Text>
                    <Text style={[styles.completionPoints, { color: colors.primary }]}>+{points} pts</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Botão de Deletar */}
        <TouchableOpacity
          style={[styles.deleteButton, { backgroundColor: colors.danger }]}
          onPress={handleDelete}
          disabled={deleting}
        >
          {deleting ? (
            <ActivityIndicator size="small" color={colors.textInverse} />
          ) : (
            <>
              <Icon name="trash" size={18} color={colors.textInverse} />
              <Text style={[styles.deleteButtonText, { color: colors.textInverse }]}>
                Deletar Hábito
              </Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14 },
  errorText: { fontSize: 16, marginBottom: 16, marginTop: 16, textAlign: 'center', paddingHorizontal: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerButton: { padding: 8, minWidth: 60 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '600', textAlign: 'center', marginHorizontal: 8 },
  content: { flex: 1, padding: 20 },
  habitCard: {
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    borderWidth: 1,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  habitHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  habitName: { fontSize: 20, fontWeight: '700', flex: 1 },
  difficultyBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  difficultyText: { fontSize: 12, fontWeight: '600' },
  habitDescription: { fontSize: 14, marginBottom: 16, lineHeight: 20 },
  habitInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1 },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: '600' },
  streakRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  streakCard: {
    flex: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  currentStreakCard: { borderWidth: 2 },
  bestStreakCard: { borderWidth: 2 },
  streakValue: { fontSize: 32, fontWeight: '700', marginTop: 8, marginBottom: 4 },
  streakLabel: { fontSize: 12, fontWeight: '600' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  sectionSubtitle: { fontSize: 12, marginBottom: 12 },
  periodCardsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statsCard: { borderRadius: 12, padding: 16, borderWidth: 1 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  statLabel: { fontSize: 14 },
  statValue: { fontSize: 14, fontWeight: '600' },
  pointsValue: {},
  completionsList: { borderRadius: 12, overflow: 'hidden' },
  completionItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  completionDate: { fontSize: 14 },
  completionPoints: { fontSize: 14, fontWeight: '600' },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  deleteButtonText: { fontSize: 16, fontWeight: '600' },
  backButton: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, marginTop: 16 },
  backButtonText: { fontSize: 16, fontWeight: '600' },
});