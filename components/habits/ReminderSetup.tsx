// components/habits/ReminderSetup.tsx
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import { useReminders } from '@/hooks/useReminders';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface ReminderSetupProps {
  habitId: string;
  habitName: string;
}

export function ReminderSetup({ habitId, habitName }: ReminderSetupProps) {
  const { colors } = useTheme();
  const { reminders, createReminder, deleteReminder, toggleReminder } = useReminders(habitId);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState(new Date());

  const handleAddReminder = async () => {
    const hours = selectedTime.getHours();
    const minutes = selectedTime.getMinutes();
    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    const success = await createReminder(habitId, habitName, timeString);
    
    if (success) {
      Alert.alert('Lembrete criado', `Você será notificado às ${timeString}`);
      setShowTimePicker(false);
    } else {
      Alert.alert('Erro', 'Não foi possível criar o lembrete');
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
              Alert.alert('Lembrete removido');
            }
          },
        },
      ]
    );
  };

  const handleToggleReminder = async (reminder: any) => {
    const success = await toggleReminder(reminder.id, habitName);
    if (!success) {
      Alert.alert('Erro', 'Não foi possível atualizar o lembrete');
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name="bell" size={16} color={colors.textPrimary} />
          <Text style={[styles.title, { color: colors.textPrimary }]}>Lembretes</Text>
        </View>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Receba notificações para não esquecer
        </Text>
      </View>

      {reminders.length > 0 && (
        <ScrollView style={styles.remindersList} nestedScrollEnabled>
          {reminders.map((reminder) => (
            <View 
              key={reminder.id} 
              style={[styles.reminderItem, { 
                backgroundColor: colors.surface,
                borderColor: colors.border 
              }]}
            >
              <View style={styles.reminderInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Icon name="clock" size={14} color={colors.textSecondary} />
                  <Text style={[styles.reminderTime, { color: colors.textPrimary }]}>
                    {reminder.time}
                  </Text>
                </View>
                <Text style={[styles.reminderStatus, { 
                  color: reminder.is_active ? colors.success : colors.textTertiary 
                }]}>
                  {reminder.is_active ? 'Ativo' : 'Desativado'}
                </Text>
              </View>

              <View style={styles.reminderActions}>
                <TouchableOpacity
                  onPress={() => handleToggleReminder(reminder)}
                  style={[
                    styles.toggleButton,
                    { backgroundColor: colors.border },
                    reminder.is_active && { backgroundColor: colors.success },
                  ]}
                >
                  {reminder.is_active ? (
                    <Icon name="check" size={16} color={colors.textInverse} />
                  ) : (
                    <View style={[styles.inactiveCircle, { borderColor: colors.textInverse }]} />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleDeleteReminder(reminder)}
                  style={styles.deleteButton}
                >
                  <Icon name="trash" size={18} color={colors.danger} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {reminders.length === 0 && (
        <View style={styles.emptyState}>
          <Icon name="bellOff" size={32} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
            Nenhum lembrete configurado
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: colors.primary }]}
        onPress={() => setShowTimePicker(true)}
      >
        <Icon name="add" size={16} color={colors.textInverse} />
        <Text style={[styles.addButtonText, { color: colors.textInverse }]}>
          Adicionar Lembrete
        </Text>
      </TouchableOpacity>

      {showTimePicker && (
        <View style={[styles.pickerContainer, { 
          backgroundColor: colors.surface,
          borderColor: colors.border 
        }]}>
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
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 12 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  subtitle: { fontSize: 13 },
  remindersList: { maxHeight: 200, paddingHorizontal: 20 },
  reminderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  reminderInfo: { flex: 1 },
  reminderTime: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  reminderStatus: { fontSize: 12 },
  reminderActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggleButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  deleteButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 20, gap: 8 },
  emptyText: { fontSize: 13 },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 14,
    borderRadius: 8,
  },
  addButtonText: { fontSize: 15, fontWeight: '600' },
  pickerContainer: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
  },
  pickerButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  pickerCancelButton: { flex: 1, padding: 12, marginRight: 8, borderRadius: 8, alignItems: 'center' },
  pickerCancelText: { fontSize: 15, fontWeight: '600' },
  pickerConfirmButton: { flex: 1, padding: 12, marginLeft: 8, borderRadius: 8, alignItems: 'center' },
  pickerConfirmText: { fontSize: 15, fontWeight: '600' },
});