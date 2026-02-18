// app/habits/create.tsx
import { FrequencySelector } from '@/components/habits/FrequencySelector';
import { TargetInput } from '@/components/habits/TargetInput';
import { ProgressNotificationSettings, ProgressNotificationConfig } from '@/components/habits/ProgressNotificationSettings';
import { CompactColorSelector } from '@/components/habits/CompactColorSelector';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Icon } from '@/components/ui/Icon';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { SuccessToast } from '@/components/ui/SuccessToast';
import { HABIT_COLORS } from '@/constants/GameConfig';
import { useHabits } from '@/hooks/useHabits';
import { notificationService } from '@/services/notificationService';
import { progressNotificationScheduler } from '@/services/progressNotificationScheduler';
import { supabase } from '@/services/supabase';
import { FrequencyGoalPeriod } from '@/types/database';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { hapticFeedback } from '@/utils/haptics';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { styles as createStylesFn } from './createStyles';

const remindersTable = () => (supabase.from('reminders') as any);

const MAX_REMINDERS = 5;
const MIN_NAME_LENGTH = 3;
const MAX_NAME_LENGTH = 50;
const MAX_DESCRIPTION_LENGTH = 200;

const TARGET_UNITS = {
  volume: ['litros', 'ml', 'copos'],
  distance: ['km', 'metros', 'passos'],
  time: ['horas', 'minutos'],
  count: ['páginas', 'exercícios', 'vezes', 'unidades'],
  weight: ['kg', 'gramas'],
};

export default function CreateHabitScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { createHabit } = useHabits();

  // Form state
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [habitType, setHabitType] = useState<'positive' | 'negative'>('positive');
  const [selectedColor, setSelectedColor] = useState<string>(HABIT_COLORS[0]);

  // Target
  const [hasTarget, setHasTarget] = useState(false);
  const [targetValue, setTargetValue] = useState('');
  const [targetUnit, setTargetUnit] = useState('');

  // Frequency
  const [frequencyType, setFrequencyType] = useState<'daily' | 'weekly' | 'custom'>('daily');
  const [frequencyDays, setFrequencyDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [hasFrequencyGoal, setHasFrequencyGoal] = useState(false);
  const [frequencyGoalValue, setFrequencyGoalValue] = useState(0);
  const [frequencyGoalPeriod, setFrequencyGoalPeriod] = useState<FrequencyGoalPeriod>('week');
  const [frequencyGoalCustomDays, setFrequencyGoalCustomDays] = useState(0);

  // Reminders
  const [hasPermission, setHasPermission] = useState(false);
  const [reminders, setReminders] = useState<Array<{ id: string; time: Date }>>([]);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Progress notifications
  const [progressNotificationConfig, setProgressNotificationConfig] = useState<ProgressNotificationConfig>({
    enabled: false,
    morningEnabled: true,
    morningTime: '08:00:00',
    afternoonEnabled: true,
    afternoonTime: '15:00:00',
    eveningEnabled: true,
    eveningTime: '21:00:00',
  });

  // Modals
  const [showFrequencyModal, setShowFrequencyModal] = useState(false);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [showRemindersModal, setShowRemindersModal] = useState(false);

  // Snapshots para restaurar ao cancelar modais
  const frequencySnapshot = useRef<any>(null);
  const targetSnapshot = useRef<any>(null);
  const remindersSnapshot = useRef<any>(null);

  // Dialogs & toasts
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    checkNotificationPermission();
  }, []);

  const checkNotificationPermission = async () => {
    const permission = await notificationService.hasPermission();
    setHasPermission(permission);
  };

  const requestNotificationPermission = async () => {
    const granted = await notificationService.requestPermissions();
    setHasPermission(granted);
    if (!granted) {
      setErrorMessage('Permissão de notificações negada. Ative nas configurações do dispositivo.');
      setShowErrorToast(true);
    }
  };

  const getMaxForPeriod = (): number => {
    switch (frequencyGoalPeriod) {
      case 'week': return 7;
      case 'month': return 31;
      case 'custom': return frequencyGoalCustomDays || 9999;
    }
  };

  const validateForm = (): string | null => {
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

    if (!hasFrequencyGoal && frequencyType === 'weekly' && frequencyDays.length === 0) return 'Selecione pelo menos um dia da semana';

    return null;
  };

  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // ===== SUMMARY HELPERS =====

  const getFrequencySummary = (): string => {
    if (hasFrequencyGoal) {
      const periodLabel = frequencyGoalPeriod === 'week' ? 'semana'
        : frequencyGoalPeriod === 'month' ? 'mês'
        : `${frequencyGoalCustomDays || '?'} dias`;
      return frequencyGoalValue > 0
        ? `${frequencyGoalValue}x por ${periodLabel}`
        : 'Meta personalizada';
    }
    if (frequencyType === 'weekly') {
      if (frequencyDays.length === 7) return 'Todos os dias';
      if (frequencyDays.length === 0) return 'Nenhum dia';
      const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      if (frequencyDays.length <= 3) {
        return frequencyDays.map(d => dayLabels[d]).join(', ');
      }
      return `${frequencyDays.length} dias/semana`;
    }
    return 'Todos os dias';
  };

  const getTargetSummary = (): string => {
    if (!hasTarget) return 'Desativada';
    if (targetValue && targetUnit) return `${targetValue} ${targetUnit}/dia`;
    return 'Configurar...';
  };

  const getRemindersSummary = (): string => {
    const parts: string[] = [];
    if (reminders.length > 0) {
      parts.push(`${reminders.length} ${reminders.length === 1 ? 'lembrete' : 'lembretes'}`);
    }
    if (progressNotificationConfig.enabled) {
      parts.push('progresso ativo');
    }
    return parts.length > 0 ? parts.join(' · ') : 'Nenhum configurado';
  };

  // ===== MODAL OPEN / CANCEL / CONFIRM =====

  const openFrequencyModal = () => {
    frequencySnapshot.current = {
      frequencyType, frequencyDays: [...frequencyDays],
      hasFrequencyGoal, frequencyGoalValue, frequencyGoalPeriod, frequencyGoalCustomDays,
    };
    hapticFeedback.light();
    setShowFrequencyModal(true);
  };

  const cancelFrequencyModal = () => {
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
  };

  const confirmFrequencyModal = () => {
    frequencySnapshot.current = null;
    setShowFrequencyModal(false);
  };

  const openTargetModal = () => {
    targetSnapshot.current = {
      hasTarget, targetValue, targetUnit,
    };
    hapticFeedback.light();
    setShowTargetModal(true);
  };

  const cancelTargetModal = () => {
    if (targetSnapshot.current) {
      const s = targetSnapshot.current;
      setHasTarget(s.hasTarget);
      setTargetValue(s.targetValue);
      setTargetUnit(s.targetUnit);
    }
    setShowTargetModal(false);
  };

  const confirmTargetModal = () => {
    targetSnapshot.current = null;
    setShowTargetModal(false);
  };

  const openRemindersModal = () => {
    remindersSnapshot.current = {
      reminders: reminders.map(r => ({ ...r })),
      progressNotificationConfig: { ...progressNotificationConfig },
    };
    hapticFeedback.light();
    setShowRemindersModal(true);
  };

  const cancelRemindersModal = () => {
    if (remindersSnapshot.current) {
      const s = remindersSnapshot.current;
      setReminders(s.reminders);
      setProgressNotificationConfig(s.progressNotificationConfig);
    }
    setShowTimePicker(false);
    setShowRemindersModal(false);
  };

  const confirmRemindersModal = () => {
    remindersSnapshot.current = null;
    setShowTimePicker(false);
    setShowRemindersModal(false);
  };

  const handleAddReminder = () => {
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

    const newReminderTime = new Date();
    newReminderTime.setHours(currentTime.getHours());
    newReminderTime.setMinutes(currentTime.getMinutes());
    newReminderTime.setSeconds(0);
    newReminderTime.setMilliseconds(0);

    hapticFeedback.success();
    setReminders([...reminders, { id: Math.random().toString(), time: newReminderTime }]);
    setShowTimePicker(false);
    setCurrentTime(new Date());
  };

  const handleRemoveReminder = (id: string) => {
    hapticFeedback.medium();
    setReminders(reminders.filter(r => r.id !== id));
  };

  const onTimeChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
      if (event.type === 'set' && date) {
        setCurrentTime(date);
        setTimeout(() => {
          const timeString = formatTime(date);
          const exists = reminders.some(r => formatTime(r.time) === timeString);
          if (exists) { hapticFeedback.warning(); setErrorMessage('Já existe um lembrete neste horário'); setShowErrorToast(true); return; }
          if (reminders.length >= MAX_REMINDERS) { hapticFeedback.error(); setErrorMessage(`Máximo ${MAX_REMINDERS} lembretes`); setShowErrorToast(true); return; }
          const t = new Date(); t.setHours(date.getHours()); t.setMinutes(date.getMinutes()); t.setSeconds(0); t.setMilliseconds(0);
          hapticFeedback.success();
          setReminders(prev => [...prev, { id: Math.random().toString(), time: t }]);
          setCurrentTime(new Date());
        }, 100);
      } else { hapticFeedback.light(); }
    } else {
      if (date) setCurrentTime(date);
    }
  };

  // ===== SUBMIT =====

  const handleSubmit = async () => {
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
      frequency_goal_custom_days: hasFrequencyGoal && frequencyGoalPeriod === 'custom'
        ? frequencyGoalCustomDays
        : null,
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
        } catch (reminderError) {
          console.error('Erro ao criar lembrete:', reminderError);
        }
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
      } catch (progressError) {
        console.warn('Erro ao criar notificações de progresso:', progressError);
      }
    } else {
      try {
        await progressNotificationScheduler.createDefaultSettings(habit.id, user.id);
      } catch (defaultError) {
        console.warn('Erro ao criar configuração padrão:', defaultError);
      }
    }

    setLoading(false);
    hapticFeedback.success();
    setShowSuccessToast(true);
    setTimeout(() => router.back(), 1500);
  };

  const handleCancel = () => {
    hapticFeedback.light();
    if (name.trim() || description.trim() || reminders.length > 0) {
      setShowCancelConfirm(true);
    } else {
      router.back();
    }
  };

  const getAllUnits = () => Object.values(TARGET_UNITS).flat();
  const styles = createStylesFn(colors);

  // ===== BOTTOM SHEET MODAL WRAPPER =====

  const BottomSheetModal = ({
    visible,
    onCancel,
    onConfirm,
    title,
    children,
  }: {
    visible: boolean;
    onCancel: () => void;
    onConfirm: () => void;
    title: string;
    children: React.ReactNode;
  }) => (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onCancel}>
      <Pressable style={styles.modalOverlay} onPress={onCancel}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalKeyboardView}
        >
          <Pressable style={[styles.modalContent, { backgroundColor: colors.background }]} onPress={Keyboard.dismiss}>
            {/* Handle bar */}
            <View style={styles.modalHandle}>
              <View style={[styles.modalHandleBar, { backgroundColor: colors.border }]} />
            </View>

            {/* Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{title}</Text>
              <TouchableOpacity onPress={onCancel} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Icon name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Body */}
            <ScrollView
              style={styles.modalBody}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {children}
              <View style={{ height: 40 }} />
            </ScrollView>

            {/* Confirm */}
            <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.modalConfirmButton, { backgroundColor: colors.primary }]}
                onPress={onConfirm}
              >
                <Text style={styles.modalConfirmText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );

  // ===== RENDER =====

  return (
    <View style={styles.container}>
      <LoadingOverlay visible={loading} message="Criando hábito..." />
      <SuccessToast visible={showSuccessToast} message="Hábito criado com sucesso!" onHide={() => setShowSuccessToast(false)} />
      <SuccessToast visible={showErrorToast} message={errorMessage} onHide={() => setShowErrorToast(false)} />
      <ConfirmDialog
        visible={showCancelConfirm}
        title="Descartar Hábito?"
        message="Você tem alterações não salvas. Deseja realmente sair?"
        confirmText="Descartar"
        cancelText="Continuar Editando"
        confirmColor="danger"
        onConfirm={() => { setShowCancelConfirm(false); router.back(); }}
        onCancel={() => setShowCancelConfirm(false)}
      />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel}>
          <Text style={styles.cancelButton}>Cancelar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Novo Hábito</Text>
        <TouchableOpacity onPress={handleSubmit} disabled={loading}>
          <Text style={[styles.saveButton, loading && styles.saveButtonDisabled]}>Salvar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* TIPO DE HÁBITO */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tipo de Hábito</Text>
          <View style={styles.habitTypeContainer}>
            <TouchableOpacity
              style={[styles.habitTypeOption, habitType === 'positive' && styles.habitTypeOptionPositive]}
              onPress={() => { hapticFeedback.selection(); setHabitType('positive'); }}
            >
              <Icon name="check" size={20} color={habitType === 'positive' ? colors.success : colors.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.habitTypeLabel, habitType === 'positive' && styles.habitTypeLabelPositive]}>Positivo</Text>
                <Text style={styles.habitTypeDescription}>Criar novo hábito</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.habitTypeOption, habitType === 'negative' && styles.habitTypeOptionNegative]}
              onPress={() => { hapticFeedback.selection(); setHabitType('negative'); }}
            >
              <Icon name="xCircle" size={20} color={habitType === 'negative' ? colors.warning : colors.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.habitTypeLabel, habitType === 'negative' && styles.habitTypeLabelNegative]}>Negativo</Text>
                <Text style={styles.habitTypeDescription}>Evitar algo ruim</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* NOME */}
        <View style={styles.section}>
          <Text style={styles.label}>Nome *</Text>
          <TextInput
            style={styles.input}
            placeholder={habitType === 'positive' ? "Ex: Meditar, Ler..." : "Ex: Não fumar..."}
            placeholderTextColor={colors.textTertiary}
            value={name}
            onChangeText={setName}
            maxLength={MAX_NAME_LENGTH}
          />
        </View>

        {/* DESCRIÇÃO */}
        <View style={styles.section}>
          <Text style={styles.label}>Descrição (opcional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Adicione detalhes..."
            placeholderTextColor={colors.textTertiary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={2}
            maxLength={MAX_DESCRIPTION_LENGTH}
          />
        </View>

        {/* COR */}
        <View style={styles.section}>
          <CompactColorSelector
            selectedColor={selectedColor}
            onColorSelect={(color) => { hapticFeedback.selection(); setSelectedColor(color); }}
          />
        </View>

        {/* SEPARADOR */}
        <View style={[styles.metaSeparator, { borderTopColor: colors.border }]} />

        {/* FREQUÊNCIA — BOTÃO RESUMO */}
        <TouchableOpacity
          style={[styles.summaryRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={openFrequencyModal}
          activeOpacity={0.7}
        >
          <View style={[styles.summaryIconCircle, { backgroundColor: colors.primaryLight }]}>
            <Icon name="calendar" size={18} color={colors.primary} />
          </View>
          <View style={styles.summaryTextContainer}>
            <Text style={[styles.summaryLabel, { color: colors.textPrimary }]}>Frequência</Text>
            <Text style={[styles.summaryValue, { color: colors.textSecondary }]}>{getFrequencySummary()}</Text>
          </View>
          <Icon name="chevronRight" size={18} color={colors.textTertiary} />
        </TouchableOpacity>

        {/* META NUMÉRICA — BOTÃO RESUMO */}
        <TouchableOpacity
          style={[styles.summaryRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={openTargetModal}
          activeOpacity={0.7}
        >
          <View style={[styles.summaryIconCircle, { backgroundColor: hasTarget ? colors.successLight : colors.borderLight }]}>
            <Icon name="target" size={18} color={hasTarget ? colors.success : colors.textTertiary} />
          </View>
          <View style={styles.summaryTextContainer}>
            <Text style={[styles.summaryLabel, { color: colors.textPrimary }]}>Meta Numérica</Text>
            <Text style={[styles.summaryValue, { color: hasTarget ? colors.success : colors.textSecondary }]}>{getTargetSummary()}</Text>
          </View>
          <Icon name="chevronRight" size={18} color={colors.textTertiary} />
        </TouchableOpacity>

        {/* LEMBRETES — BOTÃO RESUMO */}
        <TouchableOpacity
          style={[styles.summaryRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={openRemindersModal}
          activeOpacity={0.7}
        >
          <View style={[styles.summaryIconCircle, {
            backgroundColor: (reminders.length > 0 || progressNotificationConfig.enabled) ? colors.warningLight : colors.borderLight
          }]}>
            <Icon name="bell" size={18} color={(reminders.length > 0 || progressNotificationConfig.enabled) ? colors.warning : colors.textTertiary} />
          </View>
          <View style={styles.summaryTextContainer}>
            <Text style={[styles.summaryLabel, { color: colors.textPrimary }]}>Lembretes</Text>
            <Text style={[styles.summaryValue, {
              color: (reminders.length > 0 || progressNotificationConfig.enabled) ? colors.warning : colors.textSecondary
            }]}>{getRemindersSummary()}</Text>
          </View>
          <Icon name="chevronRight" size={18} color={colors.textTertiary} />
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ===== MODAL: FREQUÊNCIA ===== */}
      <BottomSheetModal
        visible={showFrequencyModal}
        onCancel={cancelFrequencyModal}
        onConfirm={confirmFrequencyModal}
        title="Frequência"
      >
        <FrequencySelector
          frequencyType={frequencyType}
          selectedDays={frequencyDays}
          onFrequencyTypeChange={setFrequencyType}
          onDaysChange={setFrequencyDays}
          hasFrequencyGoal={hasFrequencyGoal}
          frequencyGoalValue={frequencyGoalValue}
          frequencyGoalPeriod={frequencyGoalPeriod}
          frequencyGoalCustomDays={frequencyGoalCustomDays}
          onFrequencyGoalToggle={setHasFrequencyGoal}
          onFrequencyGoalValueChange={setFrequencyGoalValue}
          onFrequencyGoalPeriodChange={setFrequencyGoalPeriod}
          onFrequencyGoalCustomDaysChange={setFrequencyGoalCustomDays}
        />
      </BottomSheetModal>

      {/* ===== MODAL: META NUMÉRICA ===== */}
      <BottomSheetModal
        visible={showTargetModal}
        onCancel={cancelTargetModal}
        onConfirm={confirmTargetModal}
        title="Meta Numérica"
      >
        <View style={styles.modalSection}>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { marginBottom: 0 }]}>Ativar meta numérica</Text>
              <Text style={[styles.helperText, { marginTop: 4 }]}>
                {hasTarget ? 'Registre valores diários' : 'Ex: Beber 2L de água por dia'}
              </Text>
            </View>
            <Switch
              value={hasTarget}
              onValueChange={(v) => { hapticFeedback.selection(); setHasTarget(v); }}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={hasTarget ? colors.primary : colors.surface}
            />
          </View>

          {hasTarget && (
            <TargetInput
              value={targetValue}
              unit={targetUnit}
              onValueChange={setTargetValue}
              onUnitChange={setTargetUnit}
              availableUnits={getAllUnits()}
            />
          )}
        </View>
      </BottomSheetModal>

      {/* ===== MODAL: LEMBRETES ===== */}
      <BottomSheetModal
        visible={showRemindersModal}
        onCancel={cancelRemindersModal}
        onConfirm={confirmRemindersModal}
        title="Lembretes"
      >
        {/* Permissão */}
        {!hasPermission && (
          <TouchableOpacity
            style={[styles.permissionButton, { backgroundColor: colors.primary }]}
            onPress={async () => { hapticFeedback.light(); await requestNotificationPermission(); }}
          >
            <Icon name="unlock" size={16} color={colors.textInverse} />
            <Text style={[styles.permissionButtonText, { color: colors.textInverse }]}>Permitir Notificações</Text>
          </TouchableOpacity>
        )}

        {hasPermission && (
          <>
            {/* Seção: Lembretes de horário */}
            <View style={styles.modalSection}>
              <View style={styles.modalSectionHeader}>
                <Icon name="clock" size={16} color={colors.textPrimary} />
                <Text style={[styles.modalSectionTitle, { color: colors.textPrimary }]}>Horários de Lembrete</Text>
              </View>
              <Text style={[styles.modalSectionSubtitle, { color: colors.textSecondary }]}>
                Receba notificações nos horários definidos
              </Text>

              {reminders.length > 0 && (
                <View style={styles.remindersList}>
                  {reminders.map((reminder) => (
                    <View key={reminder.id} style={[styles.reminderItem, { borderColor: colors.border }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Icon name="bell" size={14} color={colors.primary} />
                        <Text style={[styles.reminderTime, { color: colors.textPrimary }]}>{formatTime(reminder.time)}</Text>
                      </View>
                      <TouchableOpacity onPress={() => handleRemoveReminder(reminder.id)}>
                        <Icon name="trash" size={16} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {reminders.length < MAX_REMINDERS && (
                <TouchableOpacity
                  style={[styles.addButton, { borderColor: colors.primary }]}
                  onPress={() => { hapticFeedback.light(); setShowTimePicker(true); }}
                >
                  <Icon name="add" size={14} color={colors.primary} />
                  <Text style={[styles.addButtonText, { color: colors.primary }]}>Adicionar horário</Text>
                </TouchableOpacity>
              )}

              {showTimePicker && (
                <View style={[styles.pickerContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <DateTimePicker
                    value={currentTime}
                    mode="time"
                    is24Hour={true}
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={onTimeChange}
                  />
                  {Platform.OS === 'ios' && (
                    <View style={styles.pickerButtons}>
                      <TouchableOpacity
                        onPress={() => { hapticFeedback.light(); setShowTimePicker(false); setCurrentTime(new Date()); }}
                        style={[styles.pickerButton, { backgroundColor: colors.surface }]}
                      >
                        <Text style={[styles.pickerButtonText, { color: colors.textSecondary }]}>Cancelar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => { hapticFeedback.selection(); handleAddReminder(); }}
                        style={[styles.pickerButton, { backgroundColor: colors.primary }]}
                      >
                        <Text style={[styles.pickerButtonText, { color: colors.textInverse }]}>Confirmar</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Separador visual */}
            <View style={[styles.modalDivider, { backgroundColor: colors.border }]} />

            {/* Seção: Notificações de Progresso */}
            <ProgressNotificationSettings
              config={progressNotificationConfig}
              onChange={setProgressNotificationConfig}
              hasPermission={hasPermission}
              onRequestPermission={requestNotificationPermission}
              hasTarget={hasTarget}
              habitType={habitType}
            />
          </>
        )}
      </BottomSheetModal>
    </View>
  );
}