// components/habits/ReminderEditModal.tsx
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import { NotificationSound } from '@/services/notifications';
import { soundPreviewService } from '@/services/soundPreview';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useState, useEffect } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const insets = useSafeAreaInsets();
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [selectedSound, setSelectedSound] = useState<NotificationSound>('default');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showSoundPicker, setShowSoundPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (reminder) {
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
    return timeStr.substring(0, 5);
  };

  const footerPaddingBottom = Math.max(insets.bottom, 16) + 8;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Handle */}
            <View style={styles.handleContainer}>
              <View style={[styles.handleBar, { backgroundColor: colors.border }]} />
            </View>

            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                Editar Lembrete
              </Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Icon name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.content}
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
              bounces={false}
              keyboardShouldPersistTaps="handled"
            >
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

                <TouchableOpacity
                  style={[styles.soundSelector, {
                    backgroundColor: colors.surface,
                    borderColor: showSoundPicker ? colors.primary : colors.border,
                  }]}
                  onPress={() => setShowSoundPicker(!showSoundPicker)}
                  activeOpacity={0.7}
                >
                  <View style={styles.soundSelectorLeft}>
                    <Icon
                      name={(SOUND_OPTIONS.find(o => o.value === selectedSound)?.icon || 'sound') as any}
                      size={20}
                      color={colors.primary}
                    />
                    <Text style={[styles.soundSelectorText, { color: colors.textPrimary }]}>
                      {SOUND_OPTIONS.find(o => o.value === selectedSound)?.label || 'Padrão'}
                    </Text>
                  </View>
                  <View style={styles.soundSelectorRight}>
                    {selectedSound !== 'silence' && (
                      <TouchableOpacity
                        style={[styles.previewButton, { backgroundColor: colors.primaryLight }]}
                        onPress={(e) => {
                          e.stopPropagation();
                          soundPreviewService.playPreview(selectedSound, habitName);
                        }}
                        activeOpacity={0.6}
                      >
                        <Icon name="sound" size={14} color={colors.primary} />
                      </TouchableOpacity>
                    )}
                    <Icon
                      name={showSoundPicker ? 'chevronDown' : 'chevronRight'}
                      size={18}
                      color={colors.textTertiary}
                    />
                  </View>
                </TouchableOpacity>

                {showSoundPicker && (
                  <View style={styles.soundOptionsContainer}>
                    {SOUND_OPTIONS.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.soundOption,
                          { 
                            backgroundColor: selectedSound === option.value
                              ? colors.primaryLight
                              : colors.surface,
                            borderColor: selectedSound === option.value
                              ? colors.primary
                              : colors.border,
                          },
                        ]}
                        onPress={() => {
                          setSelectedSound(option.value);
                          setShowSoundPicker(false);
                        }}
                      >
                        <View style={styles.soundOptionLeft}>
                          <Icon 
                            name={option.icon as any} 
                            size={18} 
                            color={selectedSound === option.value ? colors.primary : colors.textSecondary} 
                          />
                          <Text style={[
                            styles.soundOptionText,
                            { color: selectedSound === option.value ? colors.primary : colors.textPrimary }
                          ]}>
                            {option.label}
                          </Text>
                        </View>

                        <View style={styles.soundOptionRight}>
                          {option.value !== 'silence' && (
                            <TouchableOpacity
                              style={[styles.previewButtonSmall, {
                                backgroundColor: selectedSound === option.value
                                  ? colors.primary + '20'
                                  : colors.border + '60',
                              }]}
                              onPress={(e) => {
                                e.stopPropagation();
                                soundPreviewService.playPreview(option.value, habitName);
                              }}
                              activeOpacity={0.6}
                            >
                              <Icon
                                name="sound"
                                size={12}
                                color={selectedSound === option.value ? colors.primary : colors.textSecondary}
                              />
                            </TouchableOpacity>
                          )}
                          {selectedSound === option.value && (
                            <Icon name="check" size={16} color={colors.primary} />
                          )}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
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
            <View style={[
              styles.footer,
              { borderTopColor: colors.border, paddingBottom: footerPaddingBottom },
            ]}>
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
        </KeyboardAvoidingView>
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
  keyboardView: {
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
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
    maxHeight: '70%',
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  habitInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
  },
  habitName: {
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginBottom: 20,
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
  soundSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  soundSelectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  soundSelectorRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  soundSelectorText: {
    fontSize: 16,
    fontWeight: '600',
  },
  previewButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewButtonSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  soundOptionsContainer: {
    marginTop: 8,
    gap: 6,
  },
  soundOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  soundOptionSelected: {
    borderWidth: 1.5,
  },
  soundOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  soundOptionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  soundOptionText: {
    fontSize: 14,
    fontWeight: '500',
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
    paddingTop: 16,
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