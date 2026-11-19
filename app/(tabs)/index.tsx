// app/(tabs)/index.tsx
import { HabitProgressInput } from '@/components/habits/HabitProgressInput';
import { HabitWeeklyRow } from '@/components/habits/HabitWeeklyRow';
import { WeekNavigator } from '@/components/habits/WeekNavigator';
import { DraggableHabitList } from '@/components/habits/DraggableHabitList';
import { HabitListSkeleton } from '@/components/skeletons/HabitListSkeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { AddHabitRow } from '@/components/habits/AddHabitRow';
import { Icon } from '@/components/ui/Icon';
import { Confetti } from '@/components/ui/Confetti';
import { SuccessToast } from '@/components/ui/SuccessToast';
import { useCelebration } from '@/hooks/useCelebration';
import { useWeeklyCompletions } from '@/hooks/useWeeklyCompletions';
import { useHabits } from '@/hooks/useHabits';
import { useProfile } from '@/hooks/useProfile';
import { useStreaks } from '@/hooks/useStreaks';
import { useHabitCompletionActions } from '@/hooks/useHabitCompletionActions';
import { useCurrentDay } from '@/hooks/useCurrentDay';
import { capitalizeFirst } from '@/utils/text';
import { useConnectivity } from '@/hooks/useConnectivity';
import { OfflineStatusBanner } from '@/components/ui/OfflineStatusBanner';
import { COMPLETIONS_SYNCED_EVENT } from '@/services/pendingCompletionService';
import { OUTBOX_SYNCED_EVENT } from '@/services/completionOutbox';
import { DATA_IMPORTED_EVENT } from '@/services/dataTransferService';
import { Habit } from '@/types/database';
import { shouldHabitAppearOnDate } from '@/utils/habitHelpers';
import { computeTodaySummary } from '@/utils/todaySummary';
import { STREAK_MILESTONES } from '@/utils/streak';
import { TodaySummaryCard } from '@/components/habits/TodaySummaryCard';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DeviceEventEmitter,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { startOfWeek, format, parseISO, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';

export default function HomeScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { habits, loading: habitsLoading, refresh: refetchHabits, reorderHabits } = useHabits();

  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 0 })
  );

  const {
    completions: weeklyCompletions,
    applyOptimistic,
    addOptimisticCompletion,
    removeCompletionById,
    refetch: refetchWeeklyCompletions,
  } = useWeeklyCompletions();

  // Se o app fica aberto na virada do dia e o usuário estava vendo a semana
  // corrente, a home acompanha a semana nova (sábado → domingo).
  const today = useCurrentDay();
  const previousDayRef = useRef(today);
  useEffect(() => {
    const previousDay = previousDayRef.current;
    if (previousDay === today) return;
    previousDayRef.current = today;
    const previousWeekStart = startOfWeek(parseISO(previousDay), { weekStartsOn: 0 });
    setSelectedWeekStart((current) =>
      isSameDay(current, previousWeekStart) ? startOfWeek(new Date(), { weekStartsOn: 0 }) : current
    );
  }, [today]);

  const { fetchStreaks, getStreak, checkExpiredStreaks } = useStreaks();
  const { profile, refetch: refetchProfile } = useProfile();
  const connectivity = useConnectivity();
  const { isVisible: showConfetti, celebrate, closeCelebration } = useCelebration();

  // Ordem arrastável: `habits` já vem na ordem da tela (banco + pendência).
  const habitIds = useMemo(() => habits.map((h) => h.id), [habits]);

  // Resumo do dia: só na semana atual (a única em que "hoje" está na tela).
  const isCurrentWeek = isSameDay(
    selectedWeekStart,
    startOfWeek(parseISO(today), { weekStartsOn: 0 })
  );
  const todaySummary = useMemo(
    () => computeTodaySummary(habits, weeklyCompletions, parseISO(today)),
    [habits, weeklyCompletions, today]
  );

  // Celebração com propósito: o confete aparece ao concluir o último hábito do
  // dia ou ao alcançar um marco de streak (7, 30, 100, 365 dias), e não a cada
  // marcação. A marcação de hoje arma a verificação, feita no render seguinte,
  // já com o resumo atualizado — assim, carregar os dados com o dia já
  // completo (ao abrir o app) não dispara confete.
  const checkDayDoneRef = useRef(false);
  const milestoneRef = useRef(false);
  const handleTodayMarked = useCallback((streak: number | null) => {
    checkDayDoneRef.current = true;
    milestoneRef.current = streak !== null && STREAK_MILESTONES.includes(streak);
  }, []);
  useEffect(() => {
    if (!checkDayDoneRef.current) return;
    checkDayDoneRef.current = false;
    const milestone = milestoneRef.current;
    milestoneRef.current = false;
    if (todaySummary.allDone || milestone) setTimeout(celebrate, 600);
  }, [todaySummary, celebrate]);

  const {
    showSuccessToast,
    setShowSuccessToast,
    successMessage,
    showUncompleteConfirm,
    handleConfirmUncomplete,
    cancelUncomplete,
    showProgressModal,
    selectedHabit,
    progressCurrentValue,
    handleConfirmProgress,
    cancelProgress,
    handleDayPress,
  } = useHabitCompletionActions({
    userId: user?.id,
    weeklyCompletions,
    fetchStreaks,
    getStreak,
    onTodayMarked: handleTodayMarked,
    applyOptimistic,
    addOptimisticCompletion,
    removeCompletionById,
  });

  const loading = habitsLoading;

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const firstName = profile?.display_name?.split(' ')[0] || '';
  const todayFormatted = capitalizeFirst(format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR }));

  useEffect(() => {
    if (habits.length > 0) {
      const ids = habits.map((h) => h.id);
      fetchStreaks(ids);
      checkExpiredStreaks(habits);
    }
  }, [habits, fetchStreaks, checkExpiredStreaks]);

  // A busca da semana nova fica a cargo do efeito abaixo (antes eram duas).
  const handleWeekChange = useCallback((newWeekStart: Date) => {
    setSelectedWeekStart(newWeekStart);
  }, []);

  useEffect(() => {
    refetchWeeklyCompletions(selectedWeekStart);
  }, [selectedWeekStart, refetchWeeklyCompletions]);

  const handleCreateHabit = useCallback(() => router.push('/habits/create'), []);
  const handleHabitPress = useCallback(
    (habitId: string) => router.push(`/habits/${habitId}` as any),
    []
  );

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      refetchHabits(),
      refetchWeeklyCompletions(selectedWeekStart),
      refetchProfile(),
    ]);
  }, [refetchHabits, refetchWeeklyCompletions, selectedWeekStart, refetchProfile]);

  // Depois de importar um backup, hábitos e marcações mudam de uma vez.
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(DATA_IMPORTED_EVENT, () => {
      void handleRefresh();
    });
    return () => subscription.remove();
  }, [handleRefresh]);

  // Conclusões que chegam ao banco sem esta tela ter feito a marcação — pelo
  // botão "Feito" da notificação ou por operações da fila de saída de uma
  // sessão anterior — pedem uma nova busca.
  useEffect(() => {
    const refresh = () => {
      refetchWeeklyCompletions(selectedWeekStart);
      fetchStreaks(habitIds);
    };
    const subscriptions = [
      DeviceEventEmitter.addListener(COMPLETIONS_SYNCED_EVENT, refresh),
      DeviceEventEmitter.addListener(OUTBOX_SYNCED_EVENT, refresh),
    ];
    return () => subscriptions.forEach((s) => s.remove());
  }, [refetchWeeklyCompletions, selectedWeekStart, fetchStreaks, habitIds]);

  const renderHabit = useCallback(
    (item: Habit) => {
      // `today` (useCurrentDay) entra no cálculo: na virada do dia, o
      // renderHabit muda e os cards recalculam o "hoje" e o destaque do dia.
      const isDueToday = shouldHabitAppearOnDate(item, parseISO(today));
      return (
        <HabitWeeklyRow
          habit={item}
          streak={getStreak(item.id)}
          completions={weeklyCompletions.filter((c) => c.habit_id === item.id)}
          onDayPress={handleDayPress}
          onHabitPress={handleHabitPress}
          isDueToday={isDueToday}
          weekStart={selectedWeekStart}
          onWeekChange={handleWeekChange}
        />
      );
    },
    [
      getStreak,
      weeklyCompletions,
      handleDayPress,
      handleHabitPress,
      selectedWeekStart,
      handleWeekChange,
      today,
    ]
  );

  if (habitsLoading && habits.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.header,
            { backgroundColor: colors.background, borderBottomColor: colors.border },
          ]}
        >
          <View>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>
              {getGreeting()}
              {firstName ? `, ${firstName}!` : '!'}
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Confetti visible={showConfetti} onComplete={closeCelebration} particleCount={60} />

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
        onCancel={cancelUncomplete}
      />

      {selectedHabit && selectedHabit.has_target && (
        <HabitProgressInput
          visible={showProgressModal}
          habitName={selectedHabit.name}
          targetValue={selectedHabit.target_value || 0}
          targetUnit={selectedHabit.target_unit || ''}
          currentValue={progressCurrentValue}
          onConfirm={handleConfirmProgress}
          onCancel={cancelProgress}
        />
      )}

      <View
        style={[
          styles.header,
          { backgroundColor: colors.background, borderBottomColor: colors.border },
        ]}
      >
        <View>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>
            {getGreeting()}
            {firstName ? `, ${firstName}!` : '!'}
          </Text>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Meus Hábitos</Text>
        </View>

        <View style={styles.headerRight}>
          {/* Atalho para criar com a lista longa (a linha "Novo hábito" fica no
              fim). Com a lista vazia, a própria tela já mostra o botão. */}
          {habits.length > 0 && (
            <TouchableOpacity
              style={[styles.headerIconButton, { backgroundColor: colors.surface }]}
              onPress={handleCreateHabit}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Novo hábito"
            >
              <Icon name="add" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.headerIconButton, { backgroundColor: colors.surface }]}
            onPress={() => router.push('/stats')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Estatísticas do ano"
          >
            <Icon name="stats" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.avatarButton}
            onPress={() => router.push('/(tabs)/profile' as any)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Perfil e configurações"
          >
            {profile?.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={[styles.avatar, { borderColor: colors.primary }]}
              />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
                <Text style={styles.avatarInitial}>
                  {firstName ? firstName[0].toUpperCase() : '?'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <OfflineStatusBanner
        isOffline={connectivity.isOffline}
        pendingCount={connectivity.pendingCount}
      />

      {habits.length === 0 ? (
        // Primeiro uso: o botão fica onde ficará depois — abaixo dos hábitos —,
        // para o usuário aprender desde já onde se cria um hábito.
        <View style={styles.listContent}>
          <Text style={[styles.welcomeTitle, { color: colors.textPrimary }]}>
            Comece pelo primeiro hábito
          </Text>
          <Text style={[styles.welcomeText, { color: colors.textSecondary }]}>
            Escolha algo pequeno para fazer todos os dias. Os próximos hábitos você cria aqui
            embaixo da lista, sempre neste mesmo lugar.
          </Text>
          <AddHabitRow variant="prominent" onPress={handleCreateHabit} />
        </View>
      ) : (
        <DraggableHabitList
          habits={habits}
          orderedIds={habitIds}
          onOrderChange={reorderHabits}
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
              {isCurrentWeek && (
                <TodaySummaryCard due={todaySummary.due} done={todaySummary.done} />
              )}
              <WeekNavigator weekStart={selectedWeekStart} onWeekChange={handleWeekChange} />
            </View>
          }
          ListFooterComponent={<AddHabitRow onPress={handleCreateHabit} />}
          contentContainerStyle={styles.listContent}
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
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarButton: { padding: 2 },
  avatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 2 },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  todayBar: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  todayText: { fontSize: 13, fontWeight: '500' },
  listContent: { padding: 20, paddingBottom: 40 },
  welcomeTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  welcomeText: { fontSize: 15, lineHeight: 21, marginBottom: 20 },
});
