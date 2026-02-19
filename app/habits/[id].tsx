// app/habits/[id].tsx
import { ConsistencyChart } from '@/components/habits/ConsistencyChart';
import { HabitStreakTracker } from '@/components/habits/HabitStreakTracker';
import { HabitProgressInput } from '@/components/habits/HabitProgressInput';
import { PeriodStatsCard } from '@/components/habits/PeriodStatsCard';
import { ReminderSetup } from '@/components/habits/ReminderSetup';
import { ProgressNotificationSettings, ProgressNotificationConfig } from '@/components/habits/ProgressNotificationSettings';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SuccessToast } from '@/components/ui/SuccessToast';
import { Icon } from '@/components/ui/Icon';
import { useHabitDetails } from '@/hooks/useHabitDetails';
import { useHabits } from '@/hooks/useHabits';
import { useAuth } from '@/hooks/useAuth';
import { notificationService } from '@/services/notificationService';
import { progressNotificationScheduler } from '@/services/progressNotificationScheduler';
import { retroactiveCompletionService } from '@/services/retroactiveCompletionService';
import { supabase } from '@/services/supabase';
import { ProgressNotification } from '@/types/database';
import { formatSelectedDays } from '@/utils/habitHelpers';
import { hapticFeedback } from '@/utils/haptics';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect, useRef } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Modal,
    Platform,
    Pressable,
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
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { deleteHabit } = useHabits();
  const [deleting, setDeleting] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollPositionRef = useRef(0);

  const [hasPermission, setHasPermission] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [progressNotificationConfig, setProgressNotificationConfig] = useState<ProgressNotificationConfig>({
    enabled: false,
    morningEnabled: true,
    morningTime: '08:00:00',
    afternoonEnabled: true,
    afternoonTime: '15:00:00',
    eveningEnabled: true,
    eveningTime: '21:00:00',
  });

  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showUncompleteConfirm, setShowUncompleteConfirm] = useState(false);
  const [pendingUncompleteDate, setPendingUncompleteDate] = useState<Date | null>(null);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [pendingProgressDate, setPendingProgressDate] = useState<Date | null>(null);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);

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

  useEffect(() => {
    checkNotificationPermission();
  }, []);

  useEffect(() => {
    if (habit?.id) {
      loadProgressNotificationSettings(habit.id);
    }
  }, [habit?.id]);

  const checkNotificationPermission = async () => {
    const permission = await notificationService.hasPermission();
    setHasPermission(permission);
  };

  const requestNotificationPermission = async () => {
    const granted = await notificationService.requestPermissions();
    setHasPermission(granted);
    if (!granted) {
      Alert.alert('Permissão Negada', 'Ative as notificações nas configurações do dispositivo.');
    }
  };

  const loadProgressNotificationSettings = async (habitId: string) => {
    try {
      const { data, error } = await supabase
        .from('habit_progress_notifications')
        .select('*')
        .eq('habit_id', habitId)
        .maybeSingle();

      if (error) return;

      if (data) {
        const config = data as ProgressNotification;
        setProgressNotificationConfig({
          enabled: config.enabled,
          morningEnabled: config.morning_enabled,
          morningTime: config.morning_time,
          afternoonEnabled: config.afternoon_enabled,
          afternoonTime: config.afternoon_time,
          eveningEnabled: config.evening_enabled,
          eveningTime: config.evening_time,
        });
      }
    } catch (error) {
      // Erro silencioso
    }
  };

  const handleProgressNotificationChange = async (newConfig: ProgressNotificationConfig) => {
    setProgressNotificationConfig(newConfig);
    if (!user?.id || !habit?.id) return;

    setSavingNotifications(true);
    hapticFeedback.light();

    try {
      const { data: existingConfig } = await supabase
        .from('habit_progress_notifications')
        .select('id')
        .eq('habit_id', habit.id)
        .maybeSingle();

      if (existingConfig) {
        await (supabase.from('habit_progress_notifications') as any)
          .update({
            enabled: newConfig.enabled,
            morning_enabled: newConfig.morningEnabled,
            morning_time: newConfig.morningTime,
            afternoon_enabled: newConfig.afternoonEnabled,
            afternoon_time: newConfig.afternoonTime,
            evening_enabled: newConfig.eveningEnabled,
            evening_time: newConfig.eveningTime,
          })
          .eq('habit_id', habit.id);

        if (newConfig.enabled) {
          await progressNotificationScheduler.updateNotificationSchedule(habit.id, user.id);
        } else {
          await progressNotificationScheduler.disableProgressNotifications(habit.id);
        }
      } else {
        await (supabase.from('habit_progress_notifications') as any)
          .insert({
            habit_id: habit.id,
            user_id: user.id,
            enabled: newConfig.enabled,
            morning_enabled: newConfig.morningEnabled,
            morning_time: newConfig.morningTime,
            afternoon_enabled: newConfig.afternoonEnabled,
            afternoon_time: newConfig.afternoonTime,
            evening_enabled: newConfig.eveningEnabled,
            evening_time: newConfig.eveningTime,
          });

        if (newConfig.enabled) {
          await progressNotificationScheduler.scheduleProgressNotifications(habit.id, user.id);
        }
      }

      hapticFeedback.success();
    } catch (error) {
      hapticFeedback.error();
      Alert.alert('Erro', 'Não foi possível salvar as configurações de notificação');
    } finally {
      setSavingNotifications(false);
    }
  };

  // ========== REFETCH SEM PERDER SCROLL ==========
  const refetchKeepingScroll = async () => {
    const savedPosition = scrollPositionRef.current;
    await refetch();
    // Restore after re-render
    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollTo({ y: savedPosition, animated: false });
    });
  };

  // ========== HANDLERS DO CALENDÁRIO ==========

  const handleCalendarDayPress = async (date: Date, isCompleted: boolean) => {
    if (!habit || !user) return;

    if (isCompleted) {
      setPendingUncompleteDate(date);
      setShowUncompleteConfirm(true);
      return;
    }

    if (habit.has_target) {
      setPendingProgressDate(date);
      setShowProgressModal(true);
      return;
    }

    const result = await retroactiveCompletionService.completeRetroactively(habit, date, user.id);

    if (result.success) {
      await retroactiveCompletionService.recalculateStreak(habit.id);
      hapticFeedback.success();
      setSuccessMessage(result.message);
      setShowSuccessToast(true);
      await refetchKeepingScroll();
    } else {
      setSuccessMessage(result.message);
      setShowSuccessToast(true);
    }
  };

  const handleConfirmUncomplete = async () => {
    if (!habit || !user || !pendingUncompleteDate) {
      setShowUncompleteConfirm(false);
      setPendingUncompleteDate(null);
      return;
    }

    const result = await retroactiveCompletionService.uncompleteRetroactively(habit, pendingUncompleteDate, user.id);

    if (result.success) {
      await retroactiveCompletionService.recalculateStreak(habit.id);
      hapticFeedback.success();
      setSuccessMessage(result.message);
      setShowSuccessToast(true);
      await refetchKeepingScroll();
    } else {
      setSuccessMessage(result.message);
      setShowSuccessToast(true);
    }

    setShowUncompleteConfirm(false);
    setPendingUncompleteDate(null);
  };

  const handleProgressConfirm = async (value: number, mode: 'add' | 'replace') => {
    if (!habit || !user || !pendingProgressDate) {
      setShowProgressModal(false);
      setPendingProgressDate(null);
      return;
    }

    const result = await retroactiveCompletionService.completeRetroactively(habit, pendingProgressDate, user.id, value);

    if (result.success) {
      await retroactiveCompletionService.recalculateStreak(habit.id);
      hapticFeedback.success();
      setSuccessMessage(result.message);
      setShowSuccessToast(true);
      await refetchKeepingScroll();
    } else {
      setSuccessMessage(result.message);
      setShowSuccessToast(true);
    }

    setShowProgressModal(false);
    setPendingProgressDate(null);
  };

  // ========== HANDLERS ORIGINAIS ==========

  const handleEdit = () => {
    hapticFeedback.light();
    router.push(`/habits/edit/${id}` as any);
  };

  const handleDelete = () => {
    hapticFeedback.warning();
    Alert.alert(
      'Deletar Hábito',
      `Tem certeza que deseja deletar "${habit?.name}"? Esta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel', onPress: () => hapticFeedback.light() },
        {
          text: 'Deletar',
          style: 'destructive',
          onPress: async () => {
            hapticFeedback.heavy();
            setDeleting(true);
            const { error } = await deleteHabit(id as string);
            setDeleting(false);

            if (error) {
              hapticFeedback.error();
              Alert.alert('Erro', error);
            } else {
              hapticFeedback.success();
              Alert.alert('Sucesso', 'Hábito deletado com sucesso', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            }
          },
        },
      ]
    );
  };

  const handleBack = () => {
    hapticFeedback.light();
    router.back();
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Carregando detalhes...</Text>
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
        <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.primary }]} onPress={handleBack}>
          <Text style={[styles.backButtonText, { color: colors.textInverse }]}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isNegative = habit.type === 'negative';
  const themeColor = isNegative ? colors.warning : habit.color;
  const tintBg = themeColor + '0A';
  const tintBorder = themeColor + '30';
  const tintBorderLight = themeColor + '18';

  const streakLabel = isNegative
    ? `${streak?.current_streak || 0} ${(streak?.current_streak || 0) === 1 ? 'dia' : 'dias'} sem`
    : 'Sequência Atual';
  const bestStreakLabel = 'Melhor Sequência';

  const screenHeight = Dimensions.get('window').height;

  const getFrequencyLabel = (): string => {
    if (!habit) return '';
    const goalValue = (habit as any).frequency_goal_value;
    const goalPeriod = (habit as any).frequency_goal_period;
    const goalCustomDays = (habit as any).frequency_goal_custom_days;

    if (goalValue && goalValue > 0) {
      const periodLabel = goalPeriod === 'week' ? 'semana'
        : goalPeriod === 'month' ? 'mês'
        : `${goalCustomDays || '?'} dias`;
      return `${goalValue}x por ${periodLabel}`;
    }
    if (habit.frequency_type === 'daily') return 'Todos os dias';
    if (habit.frequency_type === 'weekly' && habit.frequency_days) {
      if (habit.frequency_days.length === 7) return 'Todos os dias';
      return formatSelectedDays(habit.frequency_days);
    }
    return 'Personalizado';
  };

  const getNotificationSummary = (): string => {
    const parts: string[] = [];
    if (progressNotificationConfig.enabled) {
      const count = [
        progressNotificationConfig.morningEnabled,
        progressNotificationConfig.afternoonEnabled,
        progressNotificationConfig.eveningEnabled,
      ].filter(Boolean).length;
      parts.push(`progresso ${count > 0 ? `(${count}x/dia)` : 'ativo'}`);
    }
    if (parts.length === 0) return 'Toque para configurar lembretes';
    return parts.join(' · ');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SuccessToast visible={showSuccessToast} message={successMessage} duration={3000} onHide={() => setShowSuccessToast(false)} />

      <ConfirmDialog
        visible={showUncompleteConfirm}
        title="Desmarcar hábito?"
        message="Isso removerá o registro de conclusão deste dia."
        confirmText="Confirmar"
        cancelText="Cancelar"
        confirmColor="danger"
        onConfirm={handleConfirmUncomplete}
        onCancel={() => { setShowUncompleteConfirm(false); setPendingUncompleteDate(null); }}
      />

      {habit.has_target && (
        <HabitProgressInput
          visible={showProgressModal}
          habitName={habit.name}
          targetValue={habit.target_value || 0}
          targetUnit={habit.target_unit || ''}
          currentValue={0}
          onConfirm={handleProgressConfirm}
          onCancel={() => { setShowProgressModal(false); setPendingProgressDate(null); }}
        />
      )}

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: tintBorder, paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
          <Icon name="chevronLeft" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>{habit.name}</Text>
        <TouchableOpacity onPress={handleEdit} style={styles.headerButton}>
          <Icon name="edit" size={20} color={themeColor} />
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={[styles.content, { backgroundColor: tintBg }]}
        showsVerticalScrollIndicator={false}
        onScroll={(e) => { scrollPositionRef.current = e.nativeEvent.contentOffset.y; }}
        scrollEventThrottle={16}
      >
        {/* Card Principal */}
        <View style={[styles.habitCard, { backgroundColor: colors.surface, borderLeftColor: themeColor, borderColor: tintBorder }]}>
          <View style={styles.habitHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              {isNegative && <Icon name="xCircle" size={20} color={colors.warning} />}
              <Text style={[styles.habitName, { color: colors.textPrimary }]}>{habit.name}</Text>
            </View>
          </View>

          {isNegative && (
            <View style={[styles.typeBadge, { backgroundColor: colors.warningLight }]}>
              <Icon name="shield" size={12} color={colors.warning} />
              <Text style={[styles.typeText, { color: colors.warning }]}>Hábito Negativo</Text>
            </View>
          )}

          {habit.description && (
            <Text style={[styles.habitDescription, { color: colors.textSecondary }]}>{habit.description}</Text>
          )}

          <View style={[styles.habitInfo, { borderTopColor: tintBorder }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="calendar" size={14} color={themeColor} />
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Frequência:</Text>
            </View>
            <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
              {getFrequencyLabel()}
            </Text>
          </View>

          {habit.has_target && (
            <View style={[styles.habitInfo, { borderTopColor: tintBorder }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name="target" size={14} color={themeColor} />
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Meta diária:</Text>
              </View>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                {habit.target_value} {habit.target_unit}
              </Text>
            </View>
          )}
        </View>

        {/* Streak Cards */}
        <View style={styles.streakRow}>
          <View style={[styles.streakCard, { backgroundColor: colors.surface, borderColor: tintBorder }]}>
            <Icon name={isNegative ? "shield" : "flame"} size={32} color={isNegative ? colors.warning : colors.streak} />
            <Text style={[styles.streakValue, { color: colors.textPrimary }]}>{streak?.current_streak || 0}</Text>
            <Text style={[styles.streakLabel, { color: colors.textSecondary }]}>{streakLabel}</Text>
          </View>

          <View style={[styles.streakCard, { backgroundColor: colors.surface, borderColor: tintBorder }]}>
            <Icon name="award" size={32} color={colors.warning} />
            <Text style={[styles.streakValue, { color: colors.textPrimary }]}>{streak?.best_streak || 0}</Text>
            <Text style={[styles.streakLabel, { color: colors.textSecondary }]}>{bestStreakLabel}</Text>
          </View>
        </View>

        {/* Progresso por Período */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Icon name="stats" size={16} color={themeColor} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Progresso por Período</Text>
          </View>
          <View style={styles.periodCardsRow}>
            <PeriodStatsCard label="Semana" percentage={weekStats?.successRate || 0} completed={weekStats?.completed || 0} total={weekStats?.total || 0} color={themeColor} />
            <PeriodStatsCard label="Mês" percentage={monthStats?.successRate || 0} completed={monthStats?.completed || 0} total={monthStats?.total || 0} color={themeColor} />
          </View>
          <View style={styles.periodCardsRow}>
            <PeriodStatsCard label="Semestre" percentage={semesterStats?.successRate || 0} completed={semesterStats?.completed || 0} total={semesterStats?.total || 0} color={themeColor} />
            <PeriodStatsCard label="Ano" percentage={yearStats?.successRate || 0} completed={yearStats?.completed || 0} total={yearStats?.total || 0} color={themeColor} />
          </View>
        </View>

        {/* Gráfico de Consistência */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Icon name="trendingUp" size={16} color={themeColor} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Evolução Semanal</Text>
          </View>
          <ConsistencyChart data={last30DaysData} habitColor={themeColor} />
        </View>

        {/* Calendário */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Icon name="calendar" size={16} color={themeColor} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Calendário & Sequências</Text>
          </View>
          <HabitStreakTracker data={last90DaysData} habitColor={themeColor} hasTarget={habit.has_target} onDayPress={handleCalendarDayPress} />
        </View>

        {/* Notificações — Botão resumo */}
        <TouchableOpacity
          style={[styles.notificationButton, { backgroundColor: colors.surface, borderColor: tintBorder }]}
          onPress={() => { hapticFeedback.light(); setShowNotificationsModal(true); }}
          activeOpacity={0.7}
        >
          <View style={[styles.notifIconCircle, { backgroundColor: themeColor + '15' }]}>
            <Icon name="bell" size={20} color={themeColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.notifButtonLabel, { color: colors.textPrimary }]}>Notificações</Text>
            <Text style={[styles.notifButtonSummary, { color: colors.textSecondary }]}>
              {getNotificationSummary()}
            </Text>
          </View>
          <Icon name="chevronRight" size={18} color={colors.textTertiary} />
        </TouchableOpacity>

        {/* Estatísticas Gerais */}
        {overallStats && (
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Icon name="activity" size={16} color={themeColor} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Estatísticas Gerais</Text>
            </View>
            <View style={[styles.statsCard, { backgroundColor: colors.surface, borderColor: tintBorderLight }]}>
              <View style={[styles.statRow, { borderBottomColor: tintBorderLight }]}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  {isNegative ? 'Vezes que resistiu' : 'Total de conclusões'}
                </Text>
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                  {overallStats.totalCompletions} vezes
                </Text>
              </View>

              <View style={[styles.statRow, { borderBottomColor: tintBorderLight }]}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Taxa de sucesso</Text>
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                  {overallStats.successRate.toFixed(1)}%
                </Text>
              </View>

              {habit.has_target && overallStats.averageValue && (
                <>
                  <View style={[styles.statRow, { borderBottomColor: tintBorderLight }]}>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Valor médio alcançado</Text>
                    <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                      {overallStats.averageValue.toFixed(1)} {habit.target_unit}
                    </Text>
                  </View>
                  <View style={[styles.statRow, { borderBottomColor: tintBorderLight }]}>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Valor máximo alcançado</Text>
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

        {/* Botão de Deletar */}
        <TouchableOpacity style={[styles.deleteButton, { backgroundColor: colors.danger }]} onPress={handleDelete} disabled={deleting}>
          {deleting ? (
            <ActivityIndicator size="small" color={colors.textInverse} />
          ) : (
            <>
              <Icon name="trash" size={18} color={colors.textInverse} />
              <Text style={[styles.deleteButtonText, { color: colors.textInverse }]}>Deletar Hábito</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>

      {/* Modal: Notificações */}
      <Modal
        visible={showNotificationsModal}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowNotificationsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={{ flex: 1 }} onPress={() => setShowNotificationsModal(false)} />
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHandle}>
              <View style={[styles.modalHandleBar, { backgroundColor: colors.border }]} />
            </View>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Notificações</Text>
              <TouchableOpacity
                onPress={() => setShowNotificationsModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={{ maxHeight: screenHeight * 0.6 }}
              contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 }}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <View style={{ marginBottom: 20 }}>
                <ReminderSetup habitId={id as string} habitName={habit.name} />
              </View>

              <View style={{ marginBottom: 12 }}>
                <ProgressNotificationSettings
                  config={progressNotificationConfig}
                  onChange={handleProgressNotificationChange}
                  hasPermission={hasPermission}
                  onRequestPermission={requestNotificationPermission}
                  hasTarget={habit.has_target}
                  habitType={habit.type}
                />
                {savingNotifications && (
                  <View style={[styles.savingIndicator, { backgroundColor: colors.surface }]}>
                    <ActivityIndicator size="small" color={themeColor} />
                    <Text style={[styles.savingText, { color: themeColor }]}>Salvando...</Text>
                  </View>
                )}
              </View>
            </ScrollView>
            <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.modalConfirmButton, { backgroundColor: colors.primary }]}
                onPress={() => setShowNotificationsModal(false)}
              >
                <Text style={styles.modalConfirmText}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14 },
  errorText: { fontSize: 16, marginBottom: 16, marginTop: 16, textAlign: 'center', paddingHorizontal: 20 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1,
  },
  headerButton: { padding: 8, minWidth: 60 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '600', textAlign: 'center', marginHorizontal: 8 },
  content: { flex: 1, padding: 20, paddingTop: 20 },
  habitCard: {
    borderRadius: 16, padding: 20, borderLeftWidth: 4, borderWidth: 1.5, marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3,
  },
  habitHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  habitName: { fontSize: 20, fontWeight: '700', flex: 1 },
  typeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 10,
    borderRadius: 8, alignSelf: 'flex-start', marginBottom: 12,
  },
  typeText: { fontSize: 12, fontWeight: '600' },
  habitDescription: { fontSize: 14, marginBottom: 16, lineHeight: 20 },
  habitInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1 },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: '600' },
  streakRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  streakCard: {
    flex: 1, borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1.5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  streakValue: { fontSize: 32, fontWeight: '700', marginTop: 8, marginBottom: 4 },
  streakLabel: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  periodCardsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  savingIndicator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, marginTop: 8, marginHorizontal: 20 },
  savingText: { fontSize: 13, fontWeight: '600' },
  statsCard: { borderRadius: 12, padding: 16, borderWidth: 1 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  statLabel: { fontSize: 14 },
  statValue: { fontSize: 14, fontWeight: '600' },
  deleteButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20, paddingVertical: 16, borderRadius: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  deleteButtonText: { fontSize: 16, fontWeight: '600' },
  backButton: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, marginTop: 16 },
  backButtonText: { fontSize: 16, fontWeight: '600' },

  // Notification button
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

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalHandle: { alignItems: 'center', paddingTop: 12, paddingBottom: 4 },
  modalHandleBar: { width: 40, height: 4, borderRadius: 2 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalFooter: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'android' ? 48 : 16,
    borderTopWidth: 1,
  },
  modalConfirmButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});