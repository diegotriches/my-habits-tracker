// components/habits/ReminderSetup.tsx
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import { useReminders } from '@/hooks/useReminders';
import { NotificationSound } from '@/services/notifications';
import { hapticFeedback } from '@/utils/haptics';
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
import { ReminderEditModal } from './ReminderEditModal';

interface ReminderSetupProps {
  habitId: string;
  habitName: string;
}

export function ReminderSetup({ habitId, habitName }: ReminderSetupProps) {
  const { colors } = useTheme();
  const { reminders, createReminder, deleteReminder, toggleReminder, updateReminder } = useReminders(habitId);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingReminder, setEditingReminder] = useState<any>(null);

  const handleAddReminder = async () => {
    const hours = selectedTime.getHours();
    const minutes = selectedTime.getMinutes();
    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    console.log('🕐 Criando lembrete com horário:', timeString);
    console.log('📅 Data selecionada:', selectedTime);

    const success = await createReminder(habitId, habitName, timeString);
    
    if (success) {
      // ✅ SEM MODAL - Apenas feedback háptico
      hapticFeedback.success();
      setShowTimePicker(false);
      console.log('✅ Lembrete criado com sucesso');
    } else {
      // ❌ Mantém alerta de ERRO (importante para debug)
      hapticFeedback.error();
      Alert.alert('Erro', 'Não foi possível criar o lembrete');
    }
  };

  const handleDeleteReminder = (reminder: any) => {
    hapticFeedback.warning();
    
    // ✅ MANTÉM confirmação antes de deletar (evita exclusões acidentais)
    Alert.alert(
      'Deletar Lembrete',
      `Deseja remover o lembrete das ${reminder.time}?`,
      [
        { 
          text: 'Cancelar', 
          style: 'cancel',
          onPress: () => hapticFeedback.light()
        },
        {
          text: 'Deletar',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteReminder(reminder.id);
            if (success) {
              // ✅ SEM MODAL de confirmação após deletar
              hapticFeedback.success();
              console.log('✅ Lembrete removido com sucesso');
            } else {
              // ❌ Mantém alerta de ERRO
              hapticFeedback.error();
              Alert.alert('Erro', 'Não foi possível remover o lembrete');
            }
          },
        },
      ]
    );
  };

  const handleToggleReminder = async (reminder: any) => {
    hapticFeedback.light();
    const success = await toggleReminder(reminder.id, habitName);
    
    if (success) {
      // ✅ SEM MODAL - Apenas feedback háptico
      hapticFeedback.success();
      console.log(`✅ Lembrete ${reminder.is_active ? 'desativado' : 'ativado'}`);
    } else {
      // ❌ Mantém alerta de ERRO
      hapticFeedback.error();
      Alert.alert('Erro', 'Não foi possível atualizar o lembrete');
    }
  };

  const handleEditReminder = (reminder: any) => {
    hapticFeedback.light();
    setEditingReminder(reminder);
    setShowEditModal(true);
  };

  const handleSaveEdit = async (
    reminderId: string, 
    time: string, 
    sound: NotificationSound
  ): Promise<boolean> => {
    const success = await updateReminder(reminderId, habitName, { time, sound });
    
    if (success) {
      // ✅ SEM MODAL - Apenas feedback háptico
      hapticFeedback.success();
      console.log('✅ Lembrete atualizado:', time);
      return true;
    } else {
      // ❌ Mantém alerta de ERRO
      hapticFeedback.error();
      Alert.alert('Erro', 'Não foi possível atualizar o lembrete');
      return false;
    }
  };

  const onTimeChange = (event: DateTimePickerEvent, date?: Date) => {
    console.log('⏰ Time picker mudou:', {
      type: event.type,
      date: date?.toLocaleTimeString(),
    });

    if (Platform.OS === 'android') {
      setShowTimePicker(false);
      
      if (event.type === 'set' && date) {
        console.log('✅ Android: Horário confirmado:', date.toLocaleTimeString());
        
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        
        console.log('🕐 Horário a ser criado:', timeString);
        
        // Atualizar estado para próxima vez
        setSelectedTime(date);
        
        // Android: Adiciona o lembrete com o horário correto
        setTimeout(async () => {
          const success = await createReminder(habitId, habitName, timeString);
          
          if (success) {
            // ✅ SEM MODAL - Apenas feedback háptico
            hapticFeedback.success();
            console.log('✅ Lembrete criado com sucesso');
          } else {
            // ❌ Mantém alerta de ERRO
            hapticFeedback.error();
            Alert.alert('Erro', 'Não foi possível criar o lembrete');
          }
        }, 100);
      } else {
        console.log('❌ Android: Usuário cancelou');
        hapticFeedback.light();
      }
    } else {
      // iOS: Apenas atualiza o estado
      if (date) {
        console.log('📱 iOS: Atualizando horário:', date.toLocaleTimeString());
        setSelectedTime(date);
      }
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
            <TouchableOpacity
              key={reminder.id}
              style={[styles.reminderItem, { 
                backgroundColor: colors.surface,
                borderColor: colors.border 
              }]}
              onPress={() => handleEditReminder(reminder)}
              activeOpacity={0.7}
            >
              <View style={styles.reminderInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Icon name="clock" size={14} color={colors.textSecondary} />
                  <Text style={[styles.reminderTime, { color: colors.textPrimary }]}>
                    {reminder.time}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={[styles.reminderStatus, { 
                    color: reminder.is_active ? colors.success : colors.textTertiary 
                  }]}>
                    {reminder.is_active ? 'Ativo' : 'Desativado'}
                  </Text>
                  <Icon name="chevronRight" size={14} color={colors.textTertiary} />
                </View>
              </View>

              <View style={styles.reminderActions}>
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    handleToggleReminder(reminder);
                  }}
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
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDeleteReminder(reminder);
                  }}
                  style={styles.deleteButton}
                >
                  <Icon name="trash" size={18} color={colors.danger} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
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
        onPress={() => {
          hapticFeedback.light();
          console.log('➕ Abrindo seletor de horário');
          setShowTimePicker(true);
        }}
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
          <Text style={[styles.pickerTitle, { color: colors.textPrimary }]}>
            Selecione o horário
          </Text>
          
          <DateTimePicker
            value={selectedTime}
            mode="time"
            is24Hour={true}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onTimeChange}
            style={{ width: '100%' }}
          />

          {Platform.OS === 'ios' && (
            <View style={styles.pickerButtons}>
              <TouchableOpacity
                onPress={() => {
                  hapticFeedback.light();
                  console.log('❌ iOS: Cancelado');
                  setShowTimePicker(false);
                }}
                style={[styles.pickerCancelButton, { backgroundColor: colors.border }]}
              >
                <Text style={[styles.pickerCancelText, { color: colors.textSecondary }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  hapticFeedback.selection();
                  console.log('✅ iOS: Confirmado');
                  handleAddReminder();
                }}
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

      {/* Modal de Edição */}
      <ReminderEditModal
        visible={showEditModal}
        reminder={editingReminder}
        habitName={habitName}
        onClose={() => {
          hapticFeedback.light();
          setShowEditModal(false);
          setEditingReminder(null);
        }}
        onSave={handleSaveEdit}
      />
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
  pickerTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  pickerButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, gap: 8 },
  pickerCancelButton: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  pickerCancelText: { fontSize: 15, fontWeight: '600' },
  pickerConfirmButton: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  pickerConfirmText: { fontSize: 15, fontWeight: '600' },
});