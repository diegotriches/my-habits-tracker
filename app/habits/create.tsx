// app/habits/create.tsx
import { FrequencySelector } from '@/components/habits/FrequencySelector';
import { TargetInput } from '@/components/habits/TargetInput';
import { ProgressNotificationSettings, ProgressNotificationConfig } from '@/components/habits/ProgressNotificationSettings';
import { CompactColorSelector } from '@/components/habits/CompactColorSelector';
import { HabitPreviewCard } from '@/components/habits/HabitPreviewCard';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Icon } from '@/components/ui/Icon';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { SuccessToast } from '@/components/ui/SuccessToast';
import { DIFFICULTY_CONFIG, HABIT_COLORS } from '@/constants/GameConfig';
import { useHabits } from '@/hooks/useHabits';
import { notificationService } from '@/services/notifications';
import { progressNotificationScheduler } from '@/services/progressNotificationScheduler';
import { supabase } from '@/services/supabase';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { hapticFeedback } from '@/utils/haptics';
import { Platform, ScrollView, Switch, Text, TextInput, TouchableOpacity, View, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';

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

    hapticFeedback.success();
    const newReminder = { id: Math.random().toString(), time: currentTime };
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

    if (reminders.length > 0) {
      for (const reminder of reminders) {
        const timeString = formatTime(reminder.time);
        try {
          const notificationId = await notificationService.scheduleDailyReminder(
            habit.id,
            habit.name,
            timeString,
            reminder.id
          );
          await remindersTable().insert({
            habit_id: habit.id,
            time: timeString,
            days_of_week: [0, 1, 2, 3, 4, 5, 6],
            is_active: true,
            notification_id: notificationId,
          });
        } catch (reminderError) {
          console.warn('Erro ao criar lembrete:', reminderError);
        }
      }
    }

    if (hasTarget && progressNotificationConfig.enabled) {
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
    } else if (hasTarget) {
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

  const onTimeChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
      if (date) {
        setCurrentTime(date);
        setTimeout(() => handleAddReminder(), 100);
      }
    } else {
      if (date) setCurrentTime(date);
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

  const styles = createStyles(colors);

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
        {/* PREVIEW */}
        {name.trim() && (
          <HabitPreviewCard
            name={name}
            color={selectedColor}
            difficulty={difficulty}
            hasTarget={hasTarget}
            targetValue={targetValue}
            targetUnit={targetUnit}
            habitType={habitType}
          />
        )}

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

        {/* DIFICULDADE E COR */}
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
                            onPress={() => setShowTimePicker(false)}
                            style={[styles.pickerButton, { backgroundColor: colors.surface }]}
                          >
                            <Text style={[styles.pickerButtonText, { color: colors.textSecondary }]}>
                              Cancelar
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={handleAddReminder}
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
        {hasTarget && (
          <View style={styles.section}>
            <ProgressNotificationSettings
              config={progressNotificationConfig}
              onChange={setProgressNotificationConfig}
              hasPermission={hasPermission}
              onRequestPermission={requestNotificationPermission}
            />
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cancelButton: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  helperText: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 4,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  habitTypeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  habitTypeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  habitTypeOptionPositive: {
    borderColor: colors.success,
    backgroundColor: colors.successLight,
  },
  habitTypeOptionNegative: {
    borderColor: colors.warning,
    backgroundColor: colors.warningLight,
  },
  habitTypeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  habitTypeLabelPositive: {
    color: colors.success,
  },
  habitTypeLabelNegative: {
    color: colors.warning,
  },
  habitTypeDescription: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  difficultyContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  difficultyOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  difficultyLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  difficultyPoints: {
    fontSize: 11,
    color: colors.textTertiary,
    fontWeight: '700',
  },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  reminderBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  reminderBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  permissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  permissionButtonText: {
    color: colors.textInverse,
    fontSize: 14,
    fontWeight: '600',
  },
  remindersList: {
    marginTop: 12,
    gap: 8,
  },
  reminderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reminderTime: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    marginTop: 8,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  pickerContainer: {
    marginTop: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickerButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  pickerButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  pickerButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});