import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useReminders } from '@/hooks/useReminders';

interface ReminderSetupProps {
  habitId: string;
  habitName: string;
}

export function ReminderSetup({ habitId, habitName }: ReminderSetupProps) {
  const { reminders, createReminder, deleteReminder, toggleReminder } = useReminders(habitId);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState(new Date());

  const handleAddReminder = async () => {
    const hours = selectedTime.getHours();
    const minutes = selectedTime.getMinutes();
    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    const success = await createReminder(habitId, habitName, timeString);
    
    if (success) {
      Alert.alert('✅ Lembrete criado', `Você será notificado às ${timeString}`);
      setShowTimePicker(false);
    } else {
      Alert.alert('❌ Erro', 'Não foi possível criar o lembrete');
    }
  };

  const handleDeleteReminder = (reminder: any) => {
    Alert.alert(
      'Deletar Lembrete',
      `Deseja remover o lembrete das ${reminder.time}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Deletar',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteReminder(reminder.id);
            if (success) {
              Alert.alert('✅ Lembrete removido');
            }
          },
        },
      ]
    );
  };

  const handleToggleReminder = async (reminder: any) => {
    const success = await toggleReminder(reminder.id, habitName);
    if (!success) {
      Alert.alert('❌ Erro', 'Não foi possível atualizar o lembrete');
    }
  };

  const onTimeChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
      if (date) {
        setSelectedTime(date);
        setTimeout(() => handleAddReminder(), 100);
      }
    } else {
      if (date) setSelectedTime(date);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🔔 Lembretes</Text>
        <Text style={styles.subtitle}>
          Receba notificações para não esquecer
        </Text>
      </View>

      {reminders.length > 0 && (
        <ScrollView style={styles.remindersList} nestedScrollEnabled>
          {reminders.map((reminder) => (
            <View key={reminder.id} style={styles.reminderItem}>
              <View style={styles.reminderInfo}>
                <Text style={styles.reminderTime}>⏰ {reminder.time}</Text>
                <Text style={styles.reminderStatus}>
                  {reminder.is_active ? 'Ativo' : 'Desativado'}
                </Text>
              </View>

              <View style={styles.reminderActions}>
                <TouchableOpacity
                  onPress={() => handleToggleReminder(reminder)}
                  style={[
                    styles.toggleButton,
                    reminder.is_active && styles.toggleButtonActive,
                  ]}
                >
                  <Text style={styles.toggleButtonText}>
                    {reminder.is_active ? '✓' : '○'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleDeleteReminder(reminder)}
                  style={styles.deleteButton}
                >
                  <Text style={styles.deleteButtonText}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {reminders.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            Nenhum lembrete configurado
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setShowTimePicker(true)}
      >
        <Text style={styles.addButtonText}>+ Adicionar Lembrete</Text>
      </TouchableOpacity>

      {showTimePicker && (
        <View style={styles.pickerContainer}>
          <DateTimePicker
            value={selectedTime}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#6b7280',
  },
  remindersList: {
    maxHeight: 200,
    paddingHorizontal: 20,
  },
  reminderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  reminderInfo: {
    flex: 1,
  },
  reminderTime: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  reminderStatus: {
    fontSize: 12,
    color: '#6b7280',
  },
  reminderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#10b981',
  },
  toggleButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  deleteButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    fontSize: 18,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 13,
    color: '#9ca3af',
  },
  addButton: {
    backgroundColor: '#3b82f6',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  pickerContainer: {
    marginHorizontal: 20,
    marginBottom: 16,
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