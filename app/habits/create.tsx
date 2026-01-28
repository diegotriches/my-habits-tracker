// app/habits/create.tsx - CORRIGIDO
import { FrequencySelector } from '@/components/habits/FrequencySelector';
import { TargetInput } from '@/components/habits/TargetInput';
import { ProgressNotificationSettings, ProgressNotificationConfig } from '@/components/habits/ProgressNotificationSettings';
import { CompactColorSelector } from '@/components/habits/CompactColorSelector';
// ❌ REMOVIDO: import { HabitPreviewCard } from '@/components/habits/HabitPreviewCard';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Icon } from '@/components/ui/Icon';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { SuccessToast } from '@/components/ui/SuccessToast';
import { DIFFICULTY_CONFIG, HABIT_COLORS } from '@/constants/GameConfig';
import { useHabits } from '@/hooks/useHabits';
// ✅ CORRIGIDO: Usar wrapper que escolhe Notifee/Expo automaticamente
import { notificationService } from '@/services/notificationService';
import { progressNotificationScheduler } from '@/services/progressNotificationScheduler';
import { supabase } from '@/services/supabase';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { hapticFeedback } from '@/utils/haptics';
import { Platform, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
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

  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [habitType, setHabitType] = useState<'positive' | 'negative'>('positive');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [selectedColor, setSelectedColor] = useState<string>(HABIT_COLORS[0]);
  const [hasTarget, setHasTarget] = useState(false);
  const [targetValue, setTargetValue] = useState('');
  const [targetUnit, setTargetUnit] = useState('');
  const [frequencyType, setFrequencyType] = useState<'daily' | 'weekly' | 'custom'>('daily');
  const [frequencyDays, setFrequencyDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [hasPermission, setHasPermission] = useState(false);
  const [reminders, setReminders] = useState<Array<{ id: string; time: Date }>>([]);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showReminders, setShowReminders] = useState(false);
  
  const [progressNotificationConfig, setProgressNotificationConfig] = useState<ProgressNotificationConfig>({
    enabled: false,
    morningEnabled: true,
    morningTime: '08:00:00',
    afternoonEnabled: true,
    afternoonTime: '15:00:00',
    eveningEnabled: true,
    eveningTime: '21:00:00',
  });
  
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

    if (frequencyType === 'weekly' && frequencyDays.length === 0) {
      return 'Selecione pelo menos um dia da semana';
    }

    return null;
  };

  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
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
    const newReminder = { 
      id: Math.random().toString(), 
      time: newReminderTime
    };

    setReminders([...reminders, newReminder]);
    setShowTimePicker(false);
    setCurrentTime(new Date());
  };

  const handleRemoveReminder = (id: string) => {
    hapticFeedback.medium();
    setReminders(reminders.filter(r => r.id !== id));
  };

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
      difficulty,
      points_base: DIFFICULTY_CONFIG[difficulty].points,
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

    // ✅ CORRIGIDO: Criar lembretes usando Notifee
    if (reminders.length > 0) {
      for (const reminder of reminders) {
        const timeString = formatTime(reminder.time);
        try {
          console.log('🔔 Agendando lembrete:', { habitName: habit.name, time: timeString });

          // Usar scheduleWeeklyReminder para todos os dias (compatível com Notifee)
          const notificationIds = await notificationService.scheduleWeeklyReminder(
            habit.id,
            habit.name,
            timeString,
            [0, 1, 2, 3, 4, 5, 6], // Todos os dias
            reminder.id
          );

          console.log('✅ Lembrete agendado:', notificationIds);

          // Salvar no banco
          await remindersTable().insert({
            habit_id: habit.id,
            time: timeString,
            days_of_week: [0, 1, 2, 3, 4, 5, 6],
            is_active: true,
            notification_ids: notificationIds, // Array de IDs
          });
        } catch (reminderError) {
          console.error('❌ Erro ao criar lembrete:', reminderError);
        }
      }
    }

    // Notificações de progresso
    if (progressNotificationConfig.enabled) {
      try {
        await (supabase.from('habit_progress_notifications') as any).insert({
          habit_id: habit.id,
          user_id: user.id,
          enabled: true,
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

  const onTimeChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
      
      if (event.type === 'set' && date) {
        setCurrentTime(date);
        
        setTimeout(() => {
          const timeString = formatTime(date);
          const exists = reminders.some(r => formatTime(r.time) === timeString);
          
          if (exists) {
            hapticFeedback.warning();
            setErrorMessage('Já existe um lembrete neste horário');
            setShowErrorToast(true);
            return;
          }

          if (reminders.length >= MAX_REMINDERS) {
            hapticFeedback.error();
            setErrorMessage(`Você pode ter no máximo ${MAX_REMINDERS} lembretes`);
            setShowErrorToast(true);
            return;
          }

          const newReminderTime = new Date();
          newReminderTime.setHours(date.getHours());
          newReminderTime.setMinutes(date.getMinutes());
          newReminderTime.setSeconds(0);
          newReminderTime.setMilliseconds(0);

          const newReminder = { 
            id: Math.random().toString(), 
            time: newReminderTime 
          };

          hapticFeedback.success();
          setReminders(prev => [...prev, newReminder]);
          setCurrentTime(new Date());
        }, 100);
      } else {
        hapticFeedback.light();
      }
    } else {
      if (date) {
        setCurrentTime(date);
      }
    }
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
        onConfirm={() => {
          setShowCancelConfirm(false);
          router.back();
        }}
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

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* ❌ PREVIEW REMOVIDO */}

        {/* TIPO DE HÁBITO */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tipo de Hábito</Text>
          <View style={styles.habitTypeContainer}>
            <TouchableOpacity
              style={[
                styles.habitTypeOption,
                habitType === 'positive' && styles.habitTypeOptionPositive
              ]}
              onPress={() => {
                hapticFeedback.selection();
                setHabitType('positive');
              }}
            >
              <Icon name="check" size={20} color={habitType === 'positive' ? colors.success : colors.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.habitTypeLabel, habitType === 'positive' && styles.habitTypeLabelPositive]}>
                  Positivo
                </Text>
                <Text style={styles.habitTypeDescription}>Criar novo hábito</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.habitTypeOption,
                habitType === 'negative' && styles.habitTypeOptionNegative
              ]}
              onPress={() => {
                hapticFeedback.selection();
                setHabitType('negative');
              }}
            >
              <Icon name="xCircle" size={20} color={habitType === 'negative' ? colors.warning : colors.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.habitTypeLabel, habitType === 'negative' && styles.habitTypeLabelNegative]}>
                  Negativo
                </Text>
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

        {/* DIFICULDADE */}
        <View style={styles.section}>
          <Text style={styles.label}>Dificuldade</Text>
          <View style={styles.difficultyContainer}>
            {(Object.keys(DIFFICULTY_CONFIG) as Array<'easy' | 'medium' | 'hard'>).map((key) => {
              const config = DIFFICULTY_CONFIG[key];
              const isSelected = difficulty === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.difficultyOption,
                    isSelected && { borderColor: config.color, backgroundColor: config.color + '15' },
                  ]}
                  onPress={() => {
                    hapticFeedback.selection();
                    setDifficulty(key);
                  }}
                >
                  <Text style={[styles.difficultyLabel, isSelected && { color: config.color }]}>
                    {config.label}
                  </Text>
                  <Text style={[styles.difficultyPoints, isSelected && { color: config.color }]}>
                    +{config.points}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* COR COMPACTA */}
        <View style={styles.section}>
          <CompactColorSelector
            selectedColor={selectedColor}
            onColorSelect={(color) => {
              hapticFeedback.selection();
              setSelectedColor(color);
            }}
          />
        </View>

        {/* META NUMÉRICA */}
        <View style={styles.section}>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Meta Numérica</Text>
              <Text style={styles.helperText}>
                {hasTarget ? 'Registre valores' : 'Apenas check/uncheck'}
              </Text>
            </View>
            <Switch
              value={hasTarget}
              onValueChange={(value) => {
                hapticFeedback.selection();
                setHasTarget(value);
              }}
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

        {/* FREQUÊNCIA */}
        <View style={styles.section}>
          <Text style={styles.label}>Frequência</Text>
          <FrequencySelector
            frequencyType={frequencyType}
            selectedDays={frequencyDays}
            onFrequencyTypeChange={setFrequencyType}
            onDaysChange={setFrequencyDays}
          />
        </View>

        {/* LEMBRETES COLAPSÁVEIS */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.collapsibleHeader}
            onPress={() => setShowReminders(!showReminders)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              <Icon name="bell" size={16} color={colors.textPrimary} />
              <Text style={styles.label}>Lembretes</Text>
              {reminders.length > 0 && (
                <View style={[styles.reminderBadge, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.reminderBadgeText, { color: colors.primary }]}>
                    {reminders.length}
                  </Text>
                </View>
              )}
            </View>
            <Icon 
              name={showReminders ? "chevronUp" : "chevronDown"} 
              size={16} 
              color={colors.textSecondary} 
            />
          </TouchableOpacity>

          {showReminders && (
            <>
              {!hasPermission && (
                <TouchableOpacity
                  style={styles.permissionButton}
                  onPress={async () => {
                    hapticFeedback.light();
                    await requestNotificationPermission();
                  }}
                >
                  <Icon name="unlock" size={16} color={colors.textInverse} />
                  <Text style={styles.permissionButtonText}>Permitir Notificações</Text>
                </TouchableOpacity>
              )}

              {hasPermission && (
                <>
                  {reminders.length > 0 && (
                    <View style={styles.remindersList}>
                      {reminders.map((reminder) => (
                        <View key={reminder.id} style={styles.reminderItem}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Icon name="clock" size={14} color={colors.textSecondary} />
                            <Text style={styles.reminderTime}>{formatTime(reminder.time)}</Text>
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
                      style={styles.addButton}
                      onPress={() => {
                        hapticFeedback.light();
                        setShowTimePicker(true);
                      }}
                    >
                      <Icon name="add" size={14} color={colors.primary} />
                      <Text style={[styles.addButtonText, { color: colors.primary }]}>
                        Adicionar
                      </Text>
                    </TouchableOpacity>
                  )}

                  {showTimePicker && (
                    <View style={styles.pickerContainer}>
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
                            onPress={() => {
                              hapticFeedback.light();
                              setShowTimePicker(false);
                              setCurrentTime(new Date());
                            }}
                            style={[styles.pickerButton, { backgroundColor: colors.surface }]}
                          >
                            <Text style={[styles.pickerButtonText, { color: colors.textSecondary }]}>
                              Cancelar
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => {
                              hapticFeedback.selection();
                              handleAddReminder();
                            }}
                            style={[styles.pickerButton, { backgroundColor: colors.primary }]}
                          >
                            <Text style={[styles.pickerButtonText, { color: colors.textInverse }]}>
                              Confirmar
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  )}
                </>
              )}
            </>
          )}
        </View>

        {/* NOTIFICAÇÕES DE PROGRESSO */}
        <View style={styles.section}>
          <ProgressNotificationSettings
            config={progressNotificationConfig}
            onChange={setProgressNotificationConfig}
            hasPermission={hasPermission}
            onRequestPermission={requestNotificationPermission}
            hasTarget={hasTarget}
            habitType={habitType}
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}