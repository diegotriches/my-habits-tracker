// components/habits/ReminderEditModal.tsx
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import { NotificationSound } from '@/services/notifications';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useState, useEffect } from 'react';
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';

interface Reminder {
  id: string;
  time: string;
  sound?: NotificationSound;
  is_active: boolean;
}

interface ReminderEditModalProps {
  visible: boolean;
  reminder: Reminder | null;
  habitName: string;
  onClose: () => void;
  onSave: (reminderId: string, time: string, sound: NotificationSound) => Promise<boolean>;
}

const SOUND_OPTIONS: { value: NotificationSound; label: string; icon: string }[] = [
  { value: 'default', label: 'Padrão', icon: 'sound' },
  { value: 'water', label: 'Água', icon: 'droplet' },
  { value: 'bell', label: 'Sino', icon: 'bell' },
  { value: 'chime', label: 'Carrilhão', icon: 'bellRing' },
  { value: 'silence', label: 'Silencioso', icon: 'bellOff' },
];

export function ReminderEditModal({
  visible,
  reminder,
  habitName,
  onClose,
  onSave,
}: ReminderEditModalProps) {
  const { colors } = useTheme();
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [selectedSound, setSelectedSound] = useState<NotificationSound>('default');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  // Atualizar estado quando reminder muda
  useEffect(() => {
    if (reminder) {
      // Parse time string (HH:MM) para Date
      const [hours, minutes] = reminder.time.split(':').map(Number);
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      setSelectedTime(date);
      setSelectedSound(reminder.sound || 'default');
    }
  }, [reminder]);

  if (!reminder) return null;

  const handleTimeChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }

    if (event.type === 'set' && date) {
      setSelectedTime(date);
    }
  };

  const handleSave = async () => {
    setSaving(true);

    const hours = selectedTime.getHours();
    const minutes = selectedTime.getMinutes();
    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    const success = await onSave(reminder.id, timeString, selectedSound);

    setSaving(false);

    if (success) {
      onClose();
    }
  };

  const formatTime = (timeStr: string) => {
    return timeStr.substring(0, 5); // Remove segundos se tiver
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Editar Lembrete
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Hábito Info */}
            <View style={[styles.habitInfo, { backgroundColor: colors.surface }]}>
              <Icon name="target" size={20} color={colors.primary} />
              <Text style={[styles.habitName, { color: colors.textPrimary }]}>
                {habitName}
              </Text>
            </View>

            {/* Horário */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                Horário
              </Text>

              <TouchableOpacity
                style={[styles.timeSelector, { 
                  backgroundColor: colors.surface,
                  borderColor: colors.border 
                }]}
                onPress={() => setShowTimePicker(true)}
              >
                <Icon name="clock" size={20} color={colors.primary} />
                <Text style={[styles.timeText, { color: colors.textPrimary }]}>
                  {formatTime(selectedTime.toLocaleTimeString('pt-BR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  }))}
                </Text>
                <Icon name="chevronRight" size={20} color={colors.textTertiary} />
              </TouchableOpacity>

              {showTimePicker && (
                <View style={[styles.pickerContainer, { backgroundColor: colors.surface }]}>
                  <DateTimePicker
                    value={selectedTime}
                    mode="time"
                    is24Hour={true}
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleTimeChange}
                  />
                  {Platform.OS === 'ios' && (
                    <TouchableOpacity
                      onPress={() => setShowTimePicker(false)}
                      style={[styles.pickerDoneButton, { backgroundColor: colors.primary }]}
                    >
                      <Text style={[styles.pickerDoneText, { color: colors.textInverse }]}>
                        OK
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>

            {/* Som */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                Som da Notificação
              </Text>

              {SOUND_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.soundOption,
                    { 
                      backgroundColor: colors.surface,
                      borderColor: selectedSound === option.value ? colors.primary : colors.border,
                    },
                    selectedSound === option.value && styles.soundOptionSelected,
                  ]}
                  onPress={() => setSelectedSound(option.value)}
                >
                  <View style={styles.soundOptionLeft}>
                    <Icon 
                      name={option.icon as any} 
                      size={20} 
                      color={selectedSound === option.value ? colors.primary : colors.textSecondary} 
                    />
                    <Text style={[
                      styles.soundOptionText,
                      { color: selectedSound === option.value ? colors.primary : colors.textPrimary }
                    ]}>
                      {option.label}
                    </Text>
                  </View>

                  {selectedSound === option.value && (
                    <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}>
                      <Icon name="check" size={14} color={colors.textInverse} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Info */}
            <View style={[styles.infoBox, { backgroundColor: colors.infoLight }]}>
              <Icon name="info" size={16} color={colors.info} />
              <Text style={[styles.infoText, { color: colors.info }]}>
                As mudanças serão aplicadas imediatamente. Você receberá notificações no novo horário.
              </Text>
            </View>
          </ScrollView>

          {/* Footer com botões */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: colors.surface }]}
              onPress={onClose}
              disabled={saving}
            >
              <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
                Cancelar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.primary }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <Text style={[styles.saveButtonText, { color: colors.textInverse }]}>
                  Salvando...
                </Text>
              ) : (
                <>
                  <Icon name="check" size={18} color={colors.textInverse} />
                  <Text style={[styles.saveButtonText, { color: colors.textInverse }]}>
                    Salvar
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  habitInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  habitName: {
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  timeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  timeText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  pickerContainer: {
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
  },
  pickerDoneButton: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  pickerDoneText: {
    fontSize: 16,
    fontWeight: '600',
  },
  soundOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
  },
  soundOptionSelected: {
    borderWidth: 2,
  },
  soundOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  soundOptionText: {
    fontSize: 15,
    fontWeight: '500',
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});