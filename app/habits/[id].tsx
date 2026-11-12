// app/habits/[id].tsx
import { ConsistencyChart } from '@/components/habits/ConsistencyChart';
import { HabitStreakTracker } from '@/components/habits/HabitStreakTracker';
import { HabitProgressInput } from '@/components/habits/HabitProgressInput';
import { PeriodStatsCard } from '@/components/habits/PeriodStatsCard';
import { HabitInfoCard } from '@/components/habits/HabitInfoCard';
import { HabitStreakSummary } from '@/components/habits/HabitStreakSummary';
import { HabitOverallStats } from '@/components/habits/HabitOverallStats';
import { HabitActionsMenu, HabitActionsMenuItem } from '@/components/habits/HabitActionsMenu';
import { HabitNotificationsModal } from '@/components/habits/HabitNotificationsModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SuccessToast } from '@/components/ui/SuccessToast';
import { Icon } from '@/components/ui/Icon';
import { useHabitDetails } from '@/hooks/useHabitDetails';
import { useHabits } from '@/hooks/useHabits';
import { useAuth } from '@/hooks/useAuth';
import { useDeleteHabitConfirm } from '@/hooks/useDeleteHabitConfirm';
import { useArchiveHabitActions } from '@/hooks/useArchiveHabitActions';
import { useHabitProgressNotifications } from '@/hooks/useHabitProgressNotifications';
import { useHabitCalendarActions } from '@/hooks/useHabitCalendarActions';
import { useRegisterProgressAction } from '@/hooks/useRegisterProgressAction';
import { hapticFeedback } from '@/utils/haptics';
import { capitalizeFirst } from '@/utils/text';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';

export default function HabitDetailsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { id, action } = useLocalSearchParams<{ id: string; action?: string }>();
  const { user } = useAuth();
  const { deleteHabit } = useHabits();

  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

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
    addOptimisticCompletion,
    removeCompletionById,
    removeCompletionForDate,
    refetchStreak,
    refetchHabit,
  } = useHabitDetails(id as string);

  // Ao voltar para a tela (ex.: depois de editar o hábito), recarrega o
  // hábito em silêncio. O primeiro foco é coberto pelo fetch inicial.
  const focusedOnceRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!focusedOnceRef.current) {
        focusedOnceRef.current = true;
        return;
      }
      refetchHabit();
    }, [refetchHabit])
  );
  const { deleting, confirmDelete } = useDeleteHabitConfirm(id as string, habit?.name, deleteHabit);

  const {
    config: progressNotificationConfig,
    hasPermission,
    saving: savingNotifications,
    requestNotificationPermission,
    handleChange: handleProgressNotificationChange,
    summary: notificationSummary,
  } = useHabitProgressNotifications(habit?.id, user?.id);

  const showResultMessage = useCallback((message: string) => {
    setSuccessMessage(message);
    setShowSuccessToast(true);
  }, []);

  const {
    handleCalendarDayPress,
    showUncompleteConfirm,
    handleConfirmUncomplete,
    cancelUncomplete,
    showProgressModal,
    pendingProgressCurrentValue,
    handleProgressConfirm,
    cancelProgress,
  } = useHabitCalendarActions({
    habit,
    userId: user?.id,
    completions,
    onSuccessMessage: showResultMessage,
    addOptimisticCompletion,
    removeCompletionById,
    removeCompletionForDate,
    refetchStreak,
  });

  useRegisterProgressAction({
    action,
    habit,
    completions,
    loading,
    openProgressForDay: handleCalendarDayPress,
  });

  const handleEdit = useCallback(() => {
    hapticFeedback.light();
    router.push(`/habits/edit/${id}` as any);
  }, [id]);

  const leaveScreen = useCallback(() => {
    // Aberto pela notificação com o app fechado, não há tela anterior.
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  }, []);

  const handleBack = useCallback(() => {
    hapticFeedback.light();
    leaveScreen();
  }, [leaveScreen]);

  // Arquivar volta para a tela anterior (o hábito some da home); restaurar
  // fica aqui e recarrega o hábito.
  const handleRestored = useCallback(() => {
    void refetchHabit();
    showResultMessage('Hábito restaurado — de volta à tela inicial');
  }, [refetchHabit, showResultMessage]);
  const {
    busy: archiving,
    confirmArchive,
    restore,
  } = useArchiveHabitActions({ onArchived: leaveScreen, onRestored: handleRestored });

  const isArchived = !!habit?.archived_at;
  const habitName = habit?.name;
  const actionsMenuItems: HabitActionsMenuItem[] = useMemo(() => {
    const deleteItem: HabitActionsMenuItem = {
      key: 'delete',
      icon: 'trash',
      label: 'Excluir',
      color: colors.danger,
      onPress: confirmDelete,
    };
    if (isArchived) {
      return [
        { key: 'restore', icon: 'restore', label: 'Restaurar', onPress: () => void restore(id) },
        deleteItem,
      ];
    }
    return [
      { key: 'edit', icon: 'edit', label: 'Editar', onPress: handleEdit },
      {
        key: 'archive',
        icon: 'archive',
        label: 'Arquivar',
        onPress: () => confirmArchive(id, habitName),
      },
      deleteItem,
    ];
  }, [
    isArchived,
    id,
    habitName,
    handleEdit,
    confirmArchive,
    restore,
    confirmDelete,
    colors.danger,
  ]);

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
        <Icon name="alertCircle" size={48} color={colors.danger} />
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          {error || 'Hábito não encontrado'}
        </Text>
        <TouchableOpacity
          style={[styles.errorBackButton, { backgroundColor: colors.primary }]}
          onPress={handleBack}
        >
          <Text style={[styles.errorBackButtonText, { color: colors.textInverse }]}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isNegative = habit.type === 'negative';
  const themeColor = isNegative ? colors.warning : habit.color;
  const tintBg = themeColor + '20';
  const tintBorder = themeColor + '30';
  const tintBorderLight = themeColor + '18';

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
        message="Isso removerá o registro de conclusão deste dia."
        confirmText="Confirmar"
        cancelText="Cancelar"
        confirmColor="danger"
        onConfirm={handleConfirmUncomplete}
        onCancel={cancelUncomplete}
      />

      {habit.has_target && (
        <HabitProgressInput
          visible={showProgressModal}
          habitName={habit.name}
          targetValue={habit.target_value || 0}
          targetUnit={habit.target_unit || ''}
          currentValue={pendingProgressCurrentValue}
          onConfirm={handleProgressConfirm}
          onCancel={cancelProgress}
        />
      )}

      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.background,
            borderBottomColor: tintBorder,
            paddingTop: insets.top + 16,
          },
        ]}
      >
        <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
          <Icon name="chevronLeft" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {habit.name}
        </Text>
        <View style={styles.headerActions}>
          <HabitActionsMenu
            items={actionsMenuItems}
            topOffset={insets.top + 56}
            loading={deleting || archiving}
          />
        </View>
      </View>

      <ScrollView
        style={[styles.content, { backgroundColor: tintBg }]}
        showsVerticalScrollIndicator={false}
      >
        {habit.archived_at && (
          <View
            style={[
              styles.archivedBanner,
              { backgroundColor: colors.surface, borderColor: tintBorder },
            ]}
          >
            <Icon name="archive" size={20} color={colors.textSecondary} />
            <Text style={[styles.archivedText, { color: colors.textSecondary }]}>
              {capitalizeFirst(
                format(new Date(habit.archived_at), "'arquivado em' d 'de' MMMM 'de' yyyy", {
                  locale: ptBR,
                })
              )}
              . Fora da tela inicial e sem lembretes; o histórico continua aqui.
            </Text>
            <TouchableOpacity
              onPress={() => void restore(id)}
              disabled={archiving}
              accessibilityRole="button"
              accessibilityLabel={`Restaurar ${habit.name}`}
              style={[styles.archivedButton, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.archivedButtonText, { color: colors.textInverse }]}>
                Restaurar
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <HabitInfoCard
          habit={habit}
          isNegative={isNegative}
          themeColor={themeColor}
          tintBorder={tintBorder}
        />

        <HabitStreakSummary
          isNegative={isNegative}
          currentStreak={streak?.current_streak || 0}
          bestStreak={streak?.best_streak || 0}
          themeColor={themeColor}
          tintBorder={tintBorder}
        />

        {/* Progresso por Período */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Icon name="stats" size={16} color={themeColor} />
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
              color={themeColor}
            />
            <PeriodStatsCard
              label="Mês"
              percentage={monthStats?.successRate || 0}
              completed={monthStats?.completed || 0}
              total={monthStats?.total || 0}
              color={themeColor}
            />
          </View>
          <View style={styles.periodCardsRow}>
            <PeriodStatsCard
              label="Semestre"
              percentage={semesterStats?.successRate || 0}
              completed={semesterStats?.completed || 0}
              total={semesterStats?.total || 0}
              color={themeColor}
            />
            <PeriodStatsCard
              label="Ano"
              percentage={yearStats?.successRate || 0}
              completed={yearStats?.completed || 0}
              total={yearStats?.total || 0}
              color={themeColor}
            />
          </View>
        </View>

        {/* Gráfico de Consistência */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Icon name="trendingUp" size={16} color={themeColor} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Evolução Semanal
            </Text>
          </View>
          <ConsistencyChart data={last30DaysData} habitColor={themeColor} />
        </View>

        {/* Calendário */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Icon name="calendar" size={16} color={themeColor} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Calendário & Sequências
            </Text>
          </View>
          <HabitStreakTracker
            data={last90DaysData}
            habitColor={themeColor}
            hasTarget={habit.has_target}
            targetValue={habit.target_value || 0}
            targetUnit={habit.target_unit || ''}
            hasFrequencyGoal={!!habit.frequency_goal_value}
            frequencyGoalValue={habit.frequency_goal_value || 0}
            frequencyGoalPeriod={habit.frequency_goal_period || null}
            frequencyGoalCustomDays={habit.frequency_goal_custom_days || null}
            currentMonth={calendarMonth}
            onMonthChange={setCalendarMonth}
            onDayPress={handleCalendarDayPress}
            isNegative={habit.type === 'negative'}
          />
        </View>

        {/* Notificações — Botão resumo (arquivado não tem lembretes) */}
        {!habit.archived_at && (
          <TouchableOpacity
            style={[
              styles.notificationButton,
              { backgroundColor: colors.surface, borderColor: tintBorder },
            ]}
            onPress={() => {
              hapticFeedback.light();
              setShowNotificationsModal(true);
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.notifIconCircle, { backgroundColor: themeColor + '15' }]}>
              <Icon name="bell" size={20} color={themeColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.notifButtonLabel, { color: colors.textPrimary }]}>
                Notificações
              </Text>
              <Text style={[styles.notifButtonSummary, { color: colors.textSecondary }]}>
                {notificationSummary}
              </Text>
            </View>
            <Icon name="chevronRight" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        )}

        {overallStats && (
          <HabitOverallStats
            overallStats={overallStats}
            isNegative={isNegative}
            hasTarget={habit.has_target}
            targetUnit={habit.target_unit}
            createdAt={habit.created_at}
            themeColor={themeColor}
            tintBorderLight={tintBorderLight}
          />
        )}

        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>

      <HabitNotificationsModal
        visible={showNotificationsModal}
        onClose={() => setShowNotificationsModal(false)}
        habitId={id as string}
        habitName={habit.name}
        habitType={habit.type}
        hasTarget={habit.has_target}
        config={progressNotificationConfig}
        onChange={handleProgressNotificationChange}
        hasPermission={hasPermission}
        onRequestPermission={requestNotificationPermission}
        saving={savingNotifications}
        themeColor={themeColor}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  archivedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  archivedText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  archivedButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  archivedButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14 },
  errorText: {
    fontSize: 16,
    marginBottom: 16,
    marginTop: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerButton: { padding: 8 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginHorizontal: 8,
  },
  content: { flex: 1, padding: 20, paddingTop: 20 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  periodCardsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  errorBackButton: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, marginTop: 16 },
  errorBackButtonText: { fontSize: 16, fontWeight: '600' },
  notificationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 24,
    gap: 12,
  },
  notifIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifButtonLabel: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  notifButtonSummary: { fontSize: 12, fontWeight: '500' },
});
