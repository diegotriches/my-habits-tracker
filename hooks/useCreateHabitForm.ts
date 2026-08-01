import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Platform } from 'react-native';
import { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useHabits } from '@/hooks/useHabits';
import { useAuth } from '@/hooks/useAuth';
import { notificationService } from '@/services/notificationService';
import { progressNotificationScheduler } from '@/services/progressNotificationScheduler';
import { supabase } from '@/services/supabase';
import { FrequencyGoalPeriod } from '@/types/database';
import { HABIT_COLORS } from '@/constants/GameConfig';
import { MIN_NAME_LENGTH, MAX_NAME_LENGTH, MAX_DESCRIPTION_LENGTH, getAllTargetUnits } from '@/constants/HabitForm';
import { ProgressNotificationConfig } from '@/components/habits/ProgressNotificationSettings';
import { hapticFeedback } from '@/utils/haptics';

const remindersTable = () => (supabase.from('reminders') as any);

export const MAX_REMINDERS = 5;

type FrequencyType = 'daily' | 'weekly' | 'custom';

interface FrequencySnapshot {
  frequencyType: FrequencyType;
  frequencyDays: number[];
  hasFrequencyGoal: boolean;
  frequencyGoalValue: number;
  frequencyGoalPeriod: FrequencyGoalPeriod;
  frequencyGoalCustomDays: number;
}

interface ReminderItem {
  id: string;
  time: Date;
}

interface RemindersSnapshot {
  reminders: ReminderItem[];
  progressNotificationConfig: ProgressNotificationConfig;
}

const DEFAULT_PROGRESS_CONFIG: ProgressNotificationConfig = {
  enabled: false,
  morningEnabled: true,
  morningTime: '08:00:00',
  afternoonEnabled: true,
  afternoonTime: '15:00:00',
  eveningEnabled: true,
  eveningTime: '21:00:00',
};

export function useCreateHabitForm() {
  const { user } = useAuth();
  const { createHabit } = useHabits();

  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [habitType, setHabitType] = useState<'positive' | 'negative'>('positive');
  const [selectedColor, setSelectedColor] = useState<string>(HABIT_COLORS[0]);

  // Meta
  const [hasTarget, setHasTarget] = useState(false);
  const [targetValue, setTargetValue] = useState('');
  const [targetUnit, setTargetUnit] = useState('');
  const [showTargetInline, setShowTargetInline] = useState(false);

  // Frequência
  const [frequencyType, setFrequencyType] = useState<FrequencyType>('daily');
  const [frequencyDays, setFrequencyDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [hasFrequencyGoal, setHasFrequencyGoal] = useState(false);
  const [frequencyGoalValue, setFrequencyGoalValue] = useState(0);
  const [frequencyGoalPeriod, setFrequencyGoalPeriod] = useState<FrequencyGoalPeriod>('week');
  const [frequencyGoalCustomDays, setFrequencyGoalCustomDays] = useState(0);

  // Lembretes
  const [hasPermission, setHasPermission] = useState(false);
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Notificações de progresso
  const [progressNotificationConfig, setProgressNotificationConfig] = useState<ProgressNotificationConfig>(DEFAULT_PROGRESS_CONFIG);

  // Modais
  const [showFrequencyModal, setShowFrequencyModal] = useState(false);
  const [showRemindersModal, setShowRemindersModal] = useState(false);

  const frequencySnapshot = useRef<FrequencySnapshot | null>(null);
  const remindersSnapshot = useRef<RemindersSnapshot | null>(null);

  // Dialogs & toasts
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const checkNotificationPermission = useCallback(async () => {
    const permission = await notificationService.hasPermission();
    setHasPermission(permission);
  }, []);

  useEffect(() => {
    checkNotificationPermission();
  }, [checkNotificationPermission]);

  const requestNotificationPermission = useCallback(async () => {
    const granted = await notificationService.requestPermissions();
    setHasPermission(granted);
    if (!granted) {
      setErrorMessage('Permissão de notificações negada. Ative nas configurações do dispositivo.');
      setShowErrorToast(true);
    }
  }, []);

  const getMaxForPeriod = useCallback((): number => {
    switch (frequencyGoalPeriod) {
      case 'week': return 7;
      case 'month': return 31;
      case 'custom': return frequencyGoalCustomDays || 9999;
      default: return 9999;
    }
  }, [frequencyGoalPeriod, frequencyGoalCustomDays]);

  const validateForm = useCallback((): string | null => {
    const trimmedName = name.trim();
    if (!trimmedName) return 'Digite um nome para o hábito';
    if (trimmedName.length < MIN_NAME_LENGTH) return `O nome deve ter pelo menos ${MIN_NAME_LENGTH} caracteres`;
    if (trimmedName.length > MAX_NAME_LENGTH) return `O nome deve ter no máximo ${MAX_NAME_LENGTH} caracteres`;
    if (description.trim().length > MAX_DESCRIPTION_LENGTH) return `A descrição deve ter no máximo ${MAX_DESCRIPTION_LENGTH} caracteres`;

    if (hasTarget) {
      const value = parseFloat(targetValue);
      if (!targetValue || isNaN(value)) return 'Digite um valor válido para a meta';
      if (value <= 0) return 'O valor da meta deve ser maior que zero';
      if (value > 999999) return 'O valor da meta é muito alto';
      if (!targetUnit.trim()) return 'Selecione uma unidade para a meta';
    }

    if (hasFrequencyGoal) {
      if (frequencyGoalValue <= 0) return 'Digite quantas vezes para a meta de frequência';
      if (frequencyGoalValue > getMaxForPeriod()) return `A meta não pode exceder ${getMaxForPeriod()} vezes neste período`;
      if (frequencyGoalPeriod === 'custom' && frequencyGoalCustomDays <= 0) return 'Digite o número de dias para a meta personalizada';
    }

    if (!hasFrequencyGoal && frequencyType === 'weekly' && frequencyDays.length === 0)
      return 'Selecione pelo menos um dia da semana';

    return null;
  }, [name, description, hasTarget, targetValue, targetUnit, hasFrequencyGoal, frequencyGoalValue, frequencyGoalPeriod, frequencyGoalCustomDays, frequencyType, frequencyDays, getMaxForPeriod]);

  const formatTime = useCallback((date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }, []);

  // ===== SUMMARIES =====

  const getFrequencySummary = useCallback((): string => {
    if (hasFrequencyGoal) {
      const periodLabel = frequencyGoalPeriod === 'week' ? 'semana'
        : frequencyGoalPeriod === 'month' ? 'mês'
        : `${frequencyGoalCustomDays || '?'} dias`;
      return frequencyGoalValue > 0 ? `${frequencyGoalValue}x por ${periodLabel}` : 'Meta personalizada';
    }
    if (frequencyType === 'weekly') {
      if (frequencyDays.length === 7) return 'Todos os dias';
      if (frequencyDays.length === 0) return 'Nenhum dia';
      const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      if (frequencyDays.length <= 3) return frequencyDays.map(d => dayLabels[d]).join(', ');
      return `${frequencyDays.length} dias/semana`;
    }
    return 'Todos os dias';
  }, [hasFrequencyGoal, frequencyGoalPeriod, frequencyGoalCustomDays, frequencyGoalValue, frequencyType, frequencyDays]);

  const getTargetSummary = useCallback((): string => {
    if (!hasTarget) return 'Desativada';
    if (targetValue && targetUnit) return `${targetValue} ${targetUnit}/dia`;
    return 'Configurar...';
  }, [hasTarget, targetValue, targetUnit]);

  const getRemindersSummary = useCallback((): string => {
    const parts: string[] = [];
    if (reminders.length > 0) parts.push(`${reminders.length} ${reminders.length === 1 ? 'lembrete' : 'lembretes'}`);
    if (progressNotificationConfig.enabled) parts.push('progresso ativo');
    return parts.length > 0 ? parts.join(' · ') : 'Nenhum configurado';
  }, [reminders, progressNotificationConfig]);

  // ===== MODAL HANDLERS =====

  const openFrequencyModal = useCallback(() => {
    frequencySnapshot.current = {
      frequencyType, frequencyDays: [...frequencyDays],
      hasFrequencyGoal, frequencyGoalValue, frequencyGoalPeriod, frequencyGoalCustomDays,
    };
    hapticFeedback.light();
    setShowFrequencyModal(true);
  }, [frequencyType, frequencyDays, hasFrequencyGoal, frequencyGoalValue, frequencyGoalPeriod, frequencyGoalCustomDays]);

  const cancelFrequencyModal = useCallback(() => {
    if (frequencySnapshot.current) {
      const s = frequencySnapshot.current;
      setFrequencyType(s.frequencyType);
      setFrequencyDays(s.frequencyDays);
      setHasFrequencyGoal(s.hasFrequencyGoal);
      setFrequencyGoalValue(s.frequencyGoalValue);
      setFrequencyGoalPeriod(s.frequencyGoalPeriod);
      setFrequencyGoalCustomDays(s.frequencyGoalCustomDays);
    }
    setShowFrequencyModal(false);
  }, []);

  const confirmFrequencyModal = useCallback(() => {
    frequencySnapshot.current = null;
    setShowFrequencyModal(false);
  }, []);

  const openRemindersModal = useCallback(() => {
    remindersSnapshot.current = {
      reminders: reminders.map(r => ({ ...r })),
      progressNotificationConfig: { ...progressNotificationConfig },
    };
    hapticFeedback.light();
    setShowRemindersModal(true);
  }, [reminders, progressNotificationConfig]);

  const cancelRemindersModal = useCallback(() => {
    if (remindersSnapshot.current) {
      const s = remindersSnapshot.current;
      setReminders(s.reminders);
      setProgressNotificationConfig(s.progressNotificationConfig);
    }
    setShowTimePicker(false);
    setShowRemindersModal(false);
  }, []);

  const confirmRemindersModal = useCallback(() => {
    remindersSnapshot.current = null;
    setShowTimePicker(false);
    setShowRemindersModal(false);
  }, []);

  const handleAddReminder = useCallback(() => {
    if (reminders.length >= MAX_REMINDERS) {
      hapticFeedback.error();
      setErrorMessage(`Você pode ter no máximo ${MAX_REMINDERS} lembretes por hábito`);
      setShowErrorToast(true);
      return;
    }
    const timeString = formatTime(currentTime);
    const exists = reminders.some(r => formatTime(r.time) === timeString);
    if (exists) {
      hapticFeedback.warning();
      setErrorMessage('Já existe um lembrete neste horário');
      setShowErrorToast(true);
      return;
    }
    const t = new Date();
    t.setHours(currentTime.getHours());
    t.setMinutes(currentTime.getMinutes());
    t.setSeconds(0); t.setMilliseconds(0);
    hapticFeedback.success();
    setReminders(prev => [...prev, { id: Math.random().toString(), time: t }]);
    setShowTimePicker(false);
    setCurrentTime(new Date());
  }, [reminders, currentTime, formatTime]);

  const handleRemoveReminder = useCallback((id: string) => {
    hapticFeedback.medium();
    setReminders(prev => prev.filter(r => r.id !== id));
  }, []);

  const onTimeChange = useCallback((event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
      if (event.type === 'set' && date) {
        setCurrentTime(date);
        setTimeout(() => {
          const timeString = formatTime(date);
          setReminders(prev => {
            const exists = prev.some(r => formatTime(r.time) === timeString);
            if (exists) { hapticFeedback.warning(); setErrorMessage('Já existe um lembrete neste horário'); setShowErrorToast(true); return prev; }
            if (prev.length >= MAX_REMINDERS) { hapticFeedback.error(); setErrorMessage(`Máximo ${MAX_REMINDERS} lembretes`); setShowErrorToast(true); return prev; }
            const t = new Date(); t.setHours(date.getHours()); t.setMinutes(date.getMinutes()); t.setSeconds(0); t.setMilliseconds(0);
            hapticFeedback.success();
            return [...prev, { id: Math.random().toString(), time: t }];
          });
          setCurrentTime(new Date());
        }, 100);
      } else { hapticFeedback.light(); }
    } else {
      if (date) setCurrentTime(date);
    }
  }, [formatTime]);

  // ===== SUBMIT =====

  const handleSubmit = useCallback(async () => {
    Keyboard.dismiss();
    const validationError = validateForm();
    if (validationError) {
      hapticFeedback.error();
      setErrorMessage(validationError);
      setShowErrorToast(true);
      return;
    }

    if (!user?.id) {
      setErrorMessage('Usuário não autenticado');
      setShowErrorToast(true);
      return;
    }

    hapticFeedback.medium();
    setLoading(true);

    const habitData: any = {
      name: name.trim(),
      description: description.trim() || undefined,
      type: habitType,
      frequency_type: frequencyType,
      frequency_days: frequencyType === 'weekly' ? frequencyDays : null,
      has_target: hasTarget,
      target_value: hasTarget ? parseFloat(targetValue) : null,
      target_unit: hasTarget ? targetUnit.trim() : null,
      frequency_goal_value: hasFrequencyGoal ? frequencyGoalValue : null,
      frequency_goal_period: hasFrequencyGoal ? frequencyGoalPeriod : null,
      frequency_goal_custom_days: hasFrequencyGoal && frequencyGoalPeriod === 'custom' ? frequencyGoalCustomDays : null,
      color: selectedColor,
      icon: habitType === 'negative' ? 'xCircle' : 'star',
    };

    const { data: habit, error } = await createHabit(habitData);

    if (error || !habit) {
      setLoading(false);
      hapticFeedback.error();
      setErrorMessage('Não foi possível criar o hábito. Tente novamente.');
      setShowErrorToast(true);
      return;
    }

    if (reminders.length > 0) {
      for (const reminder of reminders) {
        const timeString = formatTime(reminder.time);
        try {
          const notificationIds = await notificationService.scheduleWeeklyReminder(
            habit.id, habit.name, timeString, [0, 1, 2, 3, 4, 5, 6], reminder.id
          );
          await remindersTable().insert({
            habit_id: habit.id, time: timeString, days_of_week: [0, 1, 2, 3, 4, 5, 6],
            is_active: true, notification_ids: notificationIds,
          });
        } catch (e) { console.error('Erro ao criar lembrete:', e); }
      }
    }

    if (progressNotificationConfig.enabled) {
      try {
        await (supabase.from('habit_progress_notifications') as any).insert({
          habit_id: habit.id, user_id: user.id, enabled: true,
          morning_enabled: progressNotificationConfig.morningEnabled,
          morning_time: progressNotificationConfig.morningTime,
          afternoon_enabled: progressNotificationConfig.afternoonEnabled,
          afternoon_time: progressNotificationConfig.afternoonTime,
          evening_enabled: progressNotificationConfig.eveningEnabled,
          evening_time: progressNotificationConfig.eveningTime,
        });
        await progressNotificationScheduler.scheduleProgressNotifications(habit.id, user.id);
      } catch (e) { console.warn('Erro ao criar notificações de progresso:', e); }
    } else {
      try {
        await progressNotificationScheduler.createDefaultSettings(habit.id, user.id);
      } catch (e) { console.warn('Erro ao criar configuração padrão:', e); }
    }

    setLoading(false);
    hapticFeedback.success();
    setShowSuccessToast(true);
    setTimeout(() => router.back(), 1500);
  }, [validateForm, user?.id, name, description, habitType, frequencyType, frequencyDays, hasTarget, targetValue, targetUnit, hasFrequencyGoal, frequencyGoalValue, frequencyGoalPeriod, frequencyGoalCustomDays, selectedColor, createHabit, reminders, formatTime, progressNotificationConfig]);

  const handleCancel = useCallback(() => {
    hapticFeedback.light();
    if (name.trim() || description.trim() || reminders.length > 0) {
      setShowCancelConfirm(true);
    } else {
      router.back();
    }
  }, [name, description, reminders]);

  const confirmDiscard = useCallback(() => {
    setShowCancelConfirm(false);
    router.back();
  }, []);

  const dismissDiscardConfirm = useCallback(() => {
    setShowCancelConfirm(false);
  }, []);

  const getAllUnits = useCallback(() => getAllTargetUnits(), []);

  return {
    loading,
    name, setName,
    description, setDescription,
    habitType, setHabitType,
    selectedColor, setSelectedColor,
    hasTarget, setHasTarget,
    targetValue, setTargetValue,
    targetUnit, setTargetUnit,
    showTargetInline, setShowTargetInline,
    frequencyType, setFrequencyType,
    frequencyDays, setFrequencyDays,
    hasFrequencyGoal, setHasFrequencyGoal,
    frequencyGoalValue, setFrequencyGoalValue,
    frequencyGoalPeriod, setFrequencyGoalPeriod,
    frequencyGoalCustomDays, setFrequencyGoalCustomDays,
    hasPermission,
    requestNotificationPermission,
    reminders,
    showTimePicker, setShowTimePicker,
    currentTime, setCurrentTime,
    progressNotificationConfig, setProgressNotificationConfig,
    showFrequencyModal,
    openFrequencyModal,
    cancelFrequencyModal,
    confirmFrequencyModal,
    showRemindersModal,
    openRemindersModal,
    cancelRemindersModal,
    confirmRemindersModal,
    handleAddReminder,
    handleRemoveReminder,
    onTimeChange,
    formatTime,
    getFrequencySummary,
    getTargetSummary,
    getRemindersSummary,
    getAllUnits,
    handleSubmit,
    handleCancel,
    showCancelConfirm,
    confirmDiscard,
    dismissDiscardConfirm,
    showSuccessToast, setShowSuccessToast,
    showErrorToast, setShowErrorToast,
    errorMessage,
  };
}