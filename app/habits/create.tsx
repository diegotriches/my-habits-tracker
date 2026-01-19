// app/habits/create.tsx
import { FrequencySelector } from '@/components/habits/FrequencySelector';
import { TargetInput } from '@/components/habits/TargetInput';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Icon } from '@/components/ui/Icon';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { SuccessToast } from '@/components/ui/SuccessToast';
import { DIFFICULTY_CONFIG, HABIT_COLORS } from '@/constants/GameConfig';
import { useHabits } from '@/hooks/useHabits';
import { notificationService } from '@/services/notifications';
import { supabase } from '@/services/supabase';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { hapticFeedback } from '@/utils/haptics';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

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
  const { createHabit } = useHabits();
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
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

  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      hapticFeedback.error();
      setErrorMessage(validationError);
      setShowErrorToast(true);
      return;
    }

    hapticFeedback.medium();
    setLoading(true);

    const trimmedDescription = description.trim();

    // 🔧 FIX: Usar os estados de frequência corretamente
    const habitData: any = {
      name: name.trim(),
      description: trimmedDescription || undefined,
      type: 'positive' as const,
      frequency_type: frequencyType,  // ✅ Usar o estado
      frequency_days: frequencyType === 'weekly' ? frequencyDays : null,  // ✅ Usar o estado
      has_target: hasTarget,
      target_value: hasTarget ? parseFloat(targetValue) : null,
      target_unit: hasTarget ? targetUnit.trim() : null,
      difficulty,
      points_base: DIFFICULTY_CONFIG[difficulty].points,
      color: selectedColor,
      icon: 'star',
    };

    const { data: habit, error } = await createHabit(habitData);

    if (habit && reminders.length > 0 && !error) {
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

    setLoading(false);

    if (error) {
      hapticFeedback.error();
      setErrorMessage('Não foi possível criar o hábito. Tente novamente.');
      setShowErrorToast(true);
    } else {
      hapticFeedback.success();
      setShowSuccessToast(true);
      setTimeout(() => router.back(), 1500);
    }
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

  const getAllUnits = () => {
    return Object.values(TARGET_UNITS).flat();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LoadingOverlay visible={loading} message="Criando hábito..." />
      <SuccessToast
        visible={showSuccessToast}
        message="Hábito criado com sucesso!"
        onHide={() => setShowSuccessToast(false)}
      />
      <SuccessToast
        visible={showErrorToast}
        message={errorMessage}
        onHide={() => setShowErrorToast(false)}
      />
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

      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={handleCancel}>
          <Text style={[styles.cancelButton, { color: colors.textSecondary }]}>Cancelar</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Novo Hábito</Text>
        <TouchableOpacity onPress={handleSubmit} disabled={loading}>
          <Text style={[styles.saveButton, { color: loading ? colors.textDisabled : colors.primary }]}>
            Salvar
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Nome */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Nome do Hábito *</Text>
          <TextInput
            style={[styles.input, {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              color: colors.textPrimary
            }]}
            placeholder="Ex: Meditar, Ler, Exercitar..."
            placeholderTextColor={colors.textTertiary}
            value={name}
            onChangeText={setName}
            maxLength={MAX_NAME_LENGTH}
            autoFocus
          />
          <Text style={[styles.charCount, { color: colors.textTertiary }]}>
            {name.length}/{MAX_NAME_LENGTH}
          </Text>
        </View>

        {/* Descrição */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Descrição (opcional)</Text>
          <TextInput
            style={[styles.input, styles.textArea, {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              color: colors.textPrimary
            }]}
            placeholder="Adicione detalhes sobre seu hábito..."
            placeholderTextColor={colors.textTertiary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            maxLength={MAX_DESCRIPTION_LENGTH}
          />
          <Text style={[styles.charCount, { color: colors.textTertiary }]}>
            {description.length}/{MAX_DESCRIPTION_LENGTH}
          </Text>
        </View>

        {/* META NUMÉRICA */}
        <View style={styles.section}>
          <View style={styles.toggleRow}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Icon name="target" size={16} color={colors.textPrimary} />
                <Text style={[styles.label, { color: colors.textPrimary, marginBottom: 0 }]}>
                  Meta Numérica
                </Text>
              </View>
              <Text style={[styles.helperText, { color: colors.textTertiary }]}>
                {hasTarget ? 'Registre valores ao completar' : 'Apenas marcar como completo'}
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Icon name="calendar" size={16} color={colors.textPrimary} />
            <Text style={[styles.label, { color: colors.textPrimary, marginBottom: 0 }]}>
              Frequência
            </Text>
          </View>
          <Text style={[styles.helperText, { color: colors.textTertiary }]}>
            Quando você quer realizar este hábito?
          </Text>
          <FrequencySelector
            frequencyType={frequencyType}
            selectedDays={frequencyDays}
            onFrequencyTypeChange={setFrequencyType}
            onDaysChange={setFrequencyDays}
          />
        </View>

        {/* Dificuldade */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Dificuldade</Text>
          <View style={styles.difficultyContainer}>
            {(Object.keys(DIFFICULTY_CONFIG) as Array<'easy' | 'medium' | 'hard'>).map((key) => {
              const config = DIFFICULTY_CONFIG[key];
              const isSelected = difficulty === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.difficultyOption,
                    { borderColor: colors.border },
                    isSelected && {
                      borderColor: config.color,
                      backgroundColor: config.color + '10',
                    },
                  ]}
                  onPress={() => {
                    hapticFeedback.selection();
                    setDifficulty(key);
                  }}
                >
                  <Text
                    style={[
                      styles.difficultyLabel,
                      { color: colors.textSecondary },
                      isSelected && { color: config.color },
                    ]}
                  >
                    {config.label}
                  </Text>
                  <Text style={[styles.difficultyPoints, { color: colors.textTertiary }]}>
                    +{config.points} pts
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Cor */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Cor</Text>
          <View style={styles.colorContainer}>
            {HABIT_COLORS.map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorOption,
                  { backgroundColor: color },
                  selectedColor === color && styles.colorOptionSelected,
                ]}
                onPress={() => {
                  hapticFeedback.selection();
                  setSelectedColor(color);
                }}
              />
            ))}
          </View>
        </View>

        {/* LEMBRETES */}
        <View style={styles.section}>
          <View style={styles.labelRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="bell" size={16} color={colors.textPrimary} />
              <Text style={[styles.label, { color: colors.textPrimary, marginBottom: 0 }]}>
                Lembretes
              </Text>
            </View>
            {reminders.length > 0 && (
              <Text style={[styles.reminderCount, { color: colors.textSecondary, backgroundColor: colors.surface }]}>
                {reminders.length}/{MAX_REMINDERS}
              </Text>
            )}
          </View>

          {!hasPermission && (
            <TouchableOpacity
              style={[styles.permissionButton, { backgroundColor: colors.primary }]}
              onPress={async () => {
                hapticFeedback.light();
                await requestNotificationPermission();
              }}
            >
              <Icon name="unlock" size={16} color={colors.textInverse} />
              <Text style={[styles.permissionButtonText, { color: colors.textInverse }]}>
                Permitir Notificações
              </Text>
            </TouchableOpacity>
          )}

          {hasPermission && (
            <>
              {reminders.length > 0 && (
                <View style={styles.remindersList}>
                  {reminders.map((reminder) => (
                    <View key={reminder.id} style={[styles.reminderItem, {
                      backgroundColor: colors.surface,
                      borderColor: colors.border
                    }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Icon name="clock" size={16} color={colors.textSecondary} />
                        <Text style={[styles.reminderTime, { color: colors.textPrimary }]}>
                          {formatTime(reminder.time)}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => handleRemoveReminder(reminder.id)}>
                        <Icon name="trash" size={18} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {reminders.length < MAX_REMINDERS && (
                <TouchableOpacity
                  style={[styles.addReminderButton, {
                    backgroundColor: colors.surface,
                    borderColor: colors.border
                  }]}
                  onPress={() => {
                    hapticFeedback.light();
                    setShowTimePicker(true);
                  }}
                >
                  <Icon name="add" size={16} color={colors.textSecondary} />
                  <Text style={[styles.addReminderText, { color: colors.textSecondary }]}>
                    Adicionar Lembrete
                  </Text>
                </TouchableOpacity>
              )}

              {showTimePicker && (
                <View style={[styles.pickerContainer, { backgroundColor: colors.surface }]}>
                  <DateTimePicker
                    value={currentTime}
                    mode="time"
                    is24Hour={true}
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={onTimeChange}
                  />

                  {Platform.OS === 'ios' && (
                    <>
                      <View style={[styles.pickerPreview, { backgroundColor: colors.infoLight }]}>
                        <Text style={[styles.pickerPreviewText, { color: colors.info }]}>
                          Horário: {formatTime(currentTime)}
                        </Text>
                      </View>

                      <View style={styles.pickerButtons}>
                        <TouchableOpacity
                          onPress={() => setShowTimePicker(false)}
                          style={[styles.pickerCancelButton, { backgroundColor: colors.border }]}
                        >
                          <Text style={[styles.pickerCancelText, { color: colors.textSecondary }]}>
                            Cancelar
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={handleAddReminder}
                          style={[styles.pickerConfirmButton, { backgroundColor: colors.success }]}
                        >
                          <Text style={[styles.pickerConfirmText, { color: colors.textInverse }]}>
                            Confirmar
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              )}
            </>
          )}
        </View>

        {/* Info Card */}
        <View style={[styles.infoCard, { backgroundColor: colors.infoLight }]}>
          <Icon name="info" size={16} color={colors.info} />
          <Text style={[styles.infoText, { color: colors.info }]}>
            Você ganhará <Text style={styles.infoBold}>+{DIFFICULTY_CONFIG[difficulty].points} pontos</Text> toda vez que completar este hábito!
            {hasTarget && targetValue && targetUnit && (
              <Text>{'\n'}Meta: {targetValue} {targetUnit} por dia</Text>
            )}
            {frequencyType === 'weekly' && frequencyDays.length > 0 && (
              <Text>{'\n'}Frequência: {frequencyDays.length === 7 ? 'Todos os dias' : `${frequencyDays.length}x por semana`}</Text>
            )}
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
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
  headerTitle: { fontSize: 18, fontWeight: '600' },
  cancelButton: { fontSize: 16 },
  saveButton: { fontSize: 16, fontWeight: '600' },
  content: { flex: 1, padding: 20 },
  section: { marginBottom: 24 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  helperText: { fontSize: 12, marginTop: 2 },
  charCount: { fontSize: 12, textAlign: 'right', marginTop: 4 },
  reminderCount: { fontSize: 12, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  input: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, borderWidth: 1 },
  textArea: { height: 80, textAlignVertical: 'top' },
  difficultyContainer: { flexDirection: 'row', gap: 12 },
  difficultyOption: { flex: 1, paddingVertical: 16, paddingHorizontal: 12, borderRadius: 12, borderWidth: 2, alignItems: 'center' },
  difficultyLabel: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  difficultyPoints: { fontSize: 12 },
  colorContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  colorOption: { width: 48, height: 48, borderRadius: 24, borderWidth: 3, borderColor: 'transparent' },
  colorOptionSelected: { borderColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  infoCard: { flexDirection: 'row', gap: 8, borderRadius: 12, padding: 16, marginTop: 8 },
  infoText: { flex: 1, fontSize: 14, lineHeight: 20 },
  infoBold: { fontWeight: '600' },
  permissionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 12, marginBottom: 12 },
  permissionButtonText: { fontSize: 15, fontWeight: '600' },
  remindersList: { marginBottom: 12 },
  reminderItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1 },
  reminderTime: { fontSize: 15, fontWeight: '600' },
  addReminderButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed' },
  addReminderText: { fontSize: 15, fontWeight: '600' },
  pickerContainer: { marginTop: 12, borderRadius: 8, padding: 16 },
  pickerPreview: { padding: 12, borderRadius: 8, marginTop: 12, alignItems: 'center' },
  pickerPreviewText: { fontSize: 16, fontWeight: '600' },
  pickerButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  pickerCancelButton: { flex: 1, padding: 12, marginRight: 8, borderRadius: 8, alignItems: 'center' },
  pickerCancelText: { fontSize: 15, fontWeight: '600' },
  pickerConfirmButton: { flex: 1, padding: 12, marginLeft: 8, borderRadius: 8, alignItems: 'center' },
  pickerConfirmText: { fontSize: 15, fontWeight: '600' },
});