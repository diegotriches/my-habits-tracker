import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useHabits } from '@/hooks/useHabits';
import { DIFFICULTY_CONFIG, HABIT_COLORS } from '@/constants/GameConfig';
import { HabitInsert } from '@/types/database';
import { notificationService } from '@/services/notifications';
import { supabase } from '@/services/supabase';

// Helper para contornar problemas de tipagem do Supabase
const remindersTable = () => (supabase.from('reminders') as any);

export default function CreateHabitScreen() {
  const { createHabit } = useHabits();
  const [loading, setLoading] = useState(false);

  // Estado do formulário
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [selectedColor, setSelectedColor] = useState<string>(HABIT_COLORS[0]);

  // Estados para lembretes
  const [hasPermission, setHasPermission] = useState(false);
  const [reminders, setReminders] = useState<Array<{ id: string; time: Date }>>([]);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Verificar permissão de notificações ao carregar
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
      Alert.alert(
        'Permissão Negada',
        'Para receber lembretes, você precisa permitir notificações nas configurações do dispositivo.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleAddReminder = () => {
    const newReminder = {
      id: Math.random().toString(),
      time: currentTime,
    };
    setReminders([...reminders, newReminder]);
    setShowTimePicker(false);
    setCurrentTime(new Date());
  };

  const handleRemoveReminder = (id: string) => {
    setReminders(reminders.filter(r => r.id !== id));
  };

  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Erro', 'Digite um nome para o hábito');
      return;
    }

    setLoading(true);

    const habitData: Omit<HabitInsert, 'user_id'> = {
      name: name.trim(),
      description: description.trim() || null,
      type: 'positive',
      frequency_type: 'daily',
      frequency_days: null,
      has_target: false,
      target_value: null,
      target_unit: null,
      difficulty,
      points_base: DIFFICULTY_CONFIG[difficulty].points,
      color: selectedColor,
      icon: 'star',
    };

    const { data: habit, error } = await createHabit(habitData);

    // Salvar lembretes se o hábito foi criado com sucesso
    if (habit && reminders.length > 0 && !error) {
      for (const reminder of reminders) {
        const timeString = formatTime(reminder.time);
        
        // Agendar notificação
        const notificationId = await notificationService.scheduleDailyReminder(
          habit.id,
          habit.name,
          timeString,
          reminder.id
        );

        // Salvar lembrete no banco
        await remindersTable().insert({
          habit_id: habit.id,
          time: timeString,
          days_of_week: [0, 1, 2, 3, 4, 5, 6],
          is_active: true,
          notification_id: notificationId,
        });
      }
    }

    setLoading(false);

    if (error) {
      Alert.alert('Erro', error);
    } else {
      const reminderMsg = reminders.length > 0 
        ? ` com ${reminders.length} lembrete(s)` 
        : '';
      Alert.alert('Sucesso!', `Hábito criado${reminderMsg}`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancelButton}>Cancelar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Novo Hábito</Text>
        <TouchableOpacity onPress={handleSubmit} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color="#3b82f6" />
          ) : (
            <Text style={styles.saveButton}>Salvar</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Nome */}
        <View style={styles.section}>
          <Text style={styles.label}>Nome do Hábito *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Meditar, Ler, Exercitar..."
            value={name}
            onChangeText={setName}
            maxLength={50}
          />
        </View>

        {/* Descrição */}
        <View style={styles.section}>
          <Text style={styles.label}>Descrição (opcional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Adicione detalhes sobre seu hábito..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            maxLength={200}
          />
        </View>

        {/* Dificuldade */}
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
                    isSelected && {
                      borderColor: config.color,
                      backgroundColor: config.color + '10',
                    },
                  ]}
                  onPress={() => setDifficulty(key)}
                >
                  <Text
                    style={[
                      styles.difficultyLabel,
                      isSelected && { color: config.color },
                    ]}
                  >
                    {config.label}
                  </Text>
                  <Text style={styles.difficultyPoints}>+{config.points} pts</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Cor */}
        <View style={styles.section}>
          <Text style={styles.label}>Cor</Text>
          <View style={styles.colorContainer}>
            {HABIT_COLORS.map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorOption,
                  { backgroundColor: color },
                  selectedColor === color && styles.colorOptionSelected,
                ]}
                onPress={() => setSelectedColor(color)}
              />
            ))}
          </View>
        </View>

        {/* SEÇÃO DE LEMBRETES */}
        <View style={styles.section}>
          <Text style={styles.label}>🔔 Lembretes</Text>
          
          {!hasPermission && (
            <TouchableOpacity 
              style={styles.permissionButton}
              onPress={requestNotificationPermission}
            >
              <Text style={styles.permissionButtonText}>
                🔓 Permitir Notificações
              </Text>
            </TouchableOpacity>
          )}

          {hasPermission && (
            <>
              {reminders.map((reminder) => (
                <View key={reminder.id} style={styles.reminderItem}>
                  <Text style={styles.reminderTime}>
                    ⏰ {formatTime(reminder.time)}
                  </Text>
                  <TouchableOpacity onPress={() => handleRemoveReminder(reminder.id)}>
                    <Text style={styles.removeReminderText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity
                style={styles.addReminderButton}
                onPress={() => setShowTimePicker(true)}
              >
                <Text style={styles.addReminderText}>+ Adicionar Lembrete</Text>
              </TouchableOpacity>

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
                        style={styles.pickerCancelButton}
                      >
                        <Text style={styles.pickerCancelText}>Cancelar</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={handleAddReminder}
                        style={styles.pickerConfirmButton}
                      >
                        <Text style={styles.pickerConfirmText}>Confirmar</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </>
          )}
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            💡 Você ganhará <Text style={styles.infoBold}>+{DIFFICULTY_CONFIG[difficulty].points} pontos</Text> toda vez que completar este hábito!
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  cancelButton: {
    fontSize: 16,
    color: '#6b7280',
  },
  saveButton: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    color: '#1f2937',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  difficultyContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  difficultyOption: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  difficultyLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  difficultyPoints: {
    fontSize: 12,
    color: '#9ca3af',
  },
  colorContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  infoCard: {
    backgroundColor: '#dbeafe',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
  },
  infoBold: {
    fontWeight: '600',
  },
  // Estilos de Lembretes
  permissionButton: {
    backgroundColor: '#3b82f6',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  reminderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  reminderTime: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  removeReminderText: {
    fontSize: 20,
  },
  addReminderButton: {
    backgroundColor: '#f9fafb',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  addReminderText: {
    color: '#6b7280',
    fontSize: 15,
    fontWeight: '600',
  },
  pickerContainer: {
    marginTop: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 16,
  },
  pickerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  pickerCancelButton: {
    flex: 1,
    padding: 12,
    marginRight: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    alignItems: 'center',
  },
  pickerCancelText: {
    color: '#6b7280',
    fontSize: 15,
    fontWeight: '600',
  },
  pickerConfirmButton: {
    flex: 1,
    padding: 12,
    marginLeft: 8,
    backgroundColor: '#10b981',
    borderRadius: 8,
    alignItems: 'center',
  },
  pickerConfirmText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});