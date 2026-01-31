// app/settings/notifications.tsx
import { Icon } from '@/components/ui/Icon';
import { useNotificationSettings } from '@/hooks/useNotificationSettings';
import { notificationService, NotificationSound } from '@/services/notifications';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

const SOUND_OPTIONS: { value: NotificationSound; label: string; icon: string }[] = [
  { value: 'default', label: 'Padrão', icon: 'sound' },
  { value: 'water', label: 'Água', icon: 'droplet' },
  { value: 'bell', label: 'Sino', icon: 'bell' },
  { value: 'chime', label: 'Carrilhão', icon: 'volume2' },
  { value: 'silence', label: 'Silencioso', icon: 'volumeX' },
];

const SNOOZE_OPTIONS = [
  { value: 5, label: '5 minutos' },
  { value: 10, label: '10 minutos' },
  { value: 15, label: '15 minutos' },
  { value: 30, label: '30 minutos' },
];

export default function NotificationSettingsScreen() {
  const { colors } = useTheme();
  const {
    settings,
    loading,
    toggleEnabled,
    updateDefaultSound,
    toggleVibration,
    toggleSmartNotifications,
    toggleQuietHours,
    updateQuietHours,
    updateDefaultSnoozeMinutes,
    resetToDefault,
  } = useNotificationSettings();

  const [showSoundPicker, setShowSoundPicker] = useState(false);
  const [showSnoozePicker, setShowSnoozePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [tempStartTime, setTempStartTime] = useState(new Date());
  const [tempEndTime, setTempEndTime] = useState(new Date());

  const handleClearAllNotifications = () => {
    Alert.alert(
      'Limpar Todas Notificações',
      'Isso cancelará TODAS as notificações agendadas. Você precisará reconfigurá-las. Tem certeza?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar Tudo',
          style: 'destructive',
          onPress: async () => {
            await notificationService.cancelAllNotifications();
            Alert.alert('Feito', 'Todas as notificações foram canceladas.');
          },
        },
      ]
    );
  };

  const handleResetSettings = () => {
    Alert.alert(
      'Resetar Configurações',
      'Isso restaurará todas as configurações para os valores padrão. Tem certeza?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Resetar',
          style: 'destructive',
          onPress: async () => {
            const success = await resetToDefault();
            if (success) {
              Alert.alert('Feito', 'Configurações restauradas para o padrão.');
            }
          },
        },
      ]
    );
  };

  const handleUpdateSound = async (sound: NotificationSound) => {
    const success = await updateDefaultSound(sound);
    if (success) {
      setShowSoundPicker(false);
    }
  };

  const handleUpdateSnooze = async (minutes: number) => {
    const success = await updateDefaultSnoozeMinutes(minutes);
    if (success) {
      setShowSnoozePicker(false);
    }
  };

  const handleStartTimeChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowStartTimePicker(false);
      if (date) {
        const timeString = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        updateQuietHours(timeString, settings?.quiet_hours_end || '07:00');
      }
    } else {
      if (date) setTempStartTime(date);
    }
  };

  const handleEndTimeChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowEndTimePicker(false);
      if (date) {
        const timeString = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        updateQuietHours(settings?.quiet_hours_start || '22:00', timeString);
      }
    } else {
      if (date) setTempEndTime(date);
    }
  };

  const confirmStartTime = () => {
    const timeString = `${tempStartTime.getHours().toString().padStart(2, '0')}:${tempStartTime.getMinutes().toString().padStart(2, '0')}`;
    updateQuietHours(timeString, settings?.quiet_hours_end || '07:00');
    setShowStartTimePicker(false);
  };

  const confirmEndTime = () => {
    const timeString = `${tempEndTime.getHours().toString().padStart(2, '0')}:${tempEndTime.getMinutes().toString().padStart(2, '0')}`;
    updateQuietHours(settings?.quiet_hours_start || '22:00', timeString);
    setShowEndTimePicker(false);
  };

  if (loading || !settings) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const selectedSound = SOUND_OPTIONS.find(s => s.value === settings.default_sound) || SOUND_OPTIONS[0];
  const selectedSnooze = SNOOZE_OPTIONS.find(s => s.value === settings.default_snooze_minutes) || SNOOZE_OPTIONS[1];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Icon name="chevronLeft" size={20} color={colors.primary} />
          <Text style={[styles.backButton, { color: colors.primary }]}>Voltar</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Notificações</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Toggle Master */}
        <View style={[styles.section, { backgroundColor: colors.background }]}>
          <View style={styles.masterToggle}>
            <View style={styles.masterToggleLeft}>
              <Icon name="bell" size={32} color={settings.enabled ? colors.primary : colors.textTertiary} />
              <View>
                <Text style={[styles.masterToggleTitle, { color: colors.textPrimary }]}>
                  Ativar Notificações
                </Text>
                <Text style={[styles.masterToggleSubtitle, { color: colors.textSecondary }]}>
                  {settings.enabled ? 'Todas ativas' : 'Todas desativadas'}
                </Text>
              </View>
            </View>
            <Switch
              value={settings.enabled}
              onValueChange={() => { void toggleEnabled(); }}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={settings.enabled ? colors.primary : colors.surface}
            />
          </View>
        </View>

        {/* Configurações Gerais */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary, backgroundColor: colors.surface }]}>
          Configurações Gerais
        </Text>

        {/* Som Padrão */}
        <TouchableOpacity
          style={[styles.settingItem, {
            backgroundColor: colors.background,
            borderBottomColor: colors.border
          }]}
          onPress={() => setShowSoundPicker(!showSoundPicker)}
          disabled={!settings.enabled}
        >
          <View style={styles.settingLeft}>
            <Icon name="sound" size={20} color={settings.enabled ? colors.textSecondary : colors.textDisabled} />
            <Text style={[
              styles.settingText,
              { color: settings.enabled ? colors.textPrimary : colors.textDisabled }
            ]}>
              Som Padrão
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name={selectedSound.icon as any} size={16} color={colors.textSecondary} />
            <Text style={[
              styles.settingValue,
              { color: settings.enabled ? colors.textSecondary : colors.textDisabled }
            ]}>
              {selectedSound.label}
            </Text>
          </View>
        </TouchableOpacity>

        {showSoundPicker && settings.enabled && (
          <View style={[styles.pickerContainer, {
            backgroundColor: colors.background,
            borderBottomColor: colors.border
          }]}>
            {SOUND_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.pickerItem,
                  settings.default_sound === option.value && { backgroundColor: colors.primaryLight },
                ]}
                onPress={() => handleUpdateSound(option.value)}
              >
                <Icon name={option.icon as any} size={20} color={colors.textSecondary} />
                <Text style={[styles.pickerItemText, { color: colors.textPrimary }]}>
                  {option.label}
                </Text>
                {settings.default_sound === option.value && (
                  <Icon name="check" size={18} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Vibração */}
        <View style={[styles.settingItem, {
          backgroundColor: colors.background,
          borderBottomColor: colors.border
        }]}>
          <View style={styles.settingLeft}>
            <Icon name="vibrate" size={20} color={settings.enabled ? colors.textSecondary : colors.textDisabled} />
            <Text style={[
              styles.settingText,
              { color: settings.enabled ? colors.textPrimary : colors.textDisabled }
            ]}>
              Vibração
            </Text>
          </View>
          <Switch
            value={settings.vibration_enabled}
            onValueChange={() => { void toggleVibration(); }}
            disabled={!settings.enabled}
            trackColor={{ false: colors.border, true: colors.primaryLight }}
            thumbColor={settings.vibration_enabled ? colors.primary : colors.surface}
          />
        </View>

        {/* Notificações Inteligentes */}
        <View style={[styles.settingItem, {
          backgroundColor: colors.background,
          borderBottomColor: colors.border
        }]}>
          <View style={styles.settingLeft}>
            <Icon name="brain" size={20} color={settings.enabled ? colors.textSecondary : colors.textDisabled} />
            <View style={{ flex: 1 }}>
              <Text style={[
                styles.settingText,
                { color: settings.enabled ? colors.textPrimary : colors.textDisabled }
              ]}>
                Notificações Inteligentes
              </Text>
              <Text style={[styles.settingHelper, { color: colors.textTertiary }]}>
                Não notificar se já completado
              </Text>
            </View>
          </View>
          <Switch
            value={settings.smart_notifications}
            onValueChange={() => { void toggleSmartNotifications(); }}
            disabled={!settings.enabled}
            trackColor={{ false: colors.border, true: colors.primaryLight }}
            thumbColor={settings.smart_notifications ? colors.primary : colors.surface}
          />
        </View>

        {/* Horário de Silêncio */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary, backgroundColor: colors.surface }]}>
          Horário de Silêncio
        </Text>

        <View style={[styles.settingItem, {
          backgroundColor: colors.background,
          borderBottomColor: colors.border
        }]}>
          <View style={styles.settingLeft}>
            <Icon name="moon" size={20} color={settings.enabled ? colors.textSecondary : colors.textDisabled} />
            <Text style={[
              styles.settingText,
              { color: settings.enabled ? colors.textPrimary : colors.textDisabled }
            ]}>
              Não Me Incomode
            </Text>
          </View>
          <Switch
            value={settings.quiet_hours_enabled}
            onValueChange={() => { void toggleQuietHours(); }}
            disabled={!settings.enabled}
            trackColor={{ false: colors.border, true: colors.primaryLight }}
            thumbColor={settings.quiet_hours_enabled ? colors.primary : colors.surface}
          />
        </View>

        {settings.quiet_hours_enabled && settings.enabled && (
          <View style={[styles.quietHoursContainer, {
            backgroundColor: colors.background,
            borderBottomColor: colors.border
          }]}>
            <View style={styles.quietHoursRow}>
              <Text style={[styles.quietHoursLabel, { color: colors.textSecondary }]}>De:</Text>
              <TouchableOpacity
                style={[styles.timeButton, {
                  backgroundColor: colors.surface,
                  borderColor: colors.border
                }]}
                onPress={() => setShowStartTimePicker(true)}
              >
                <Icon name="clock" size={16} color={colors.textSecondary} />
                <Text style={[styles.timeButtonText, { color: colors.textPrimary }]}>
                  {settings.quiet_hours_start || '22:00'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.quietHoursRow}>
              <Text style={[styles.quietHoursLabel, { color: colors.textSecondary }]}>Até:</Text>
              <TouchableOpacity
                style={[styles.timeButton, {
                  backgroundColor: colors.surface,
                  borderColor: colors.border
                }]}
                onPress={() => setShowEndTimePicker(true)}
              >
                <Icon name="clock" size={16} color={colors.textSecondary} />
                <Text style={[styles.timeButtonText, { color: colors.textPrimary }]}>
                  {settings.quiet_hours_end || '07:00'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Snooze */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary, backgroundColor: colors.surface }]}>
          Snooze
        </Text>

        <TouchableOpacity
          style={[styles.settingItem, {
            backgroundColor: colors.background,
            borderBottomColor: colors.border
          }]}
          onPress={() => setShowSnoozePicker(!showSnoozePicker)}
          disabled={!settings.enabled}
        >
          <View style={styles.settingLeft}>
            <Icon name="timer" size={20} color={settings.enabled ? colors.textSecondary : colors.textDisabled} />
            <Text style={[
              styles.settingText,
              { color: settings.enabled ? colors.textPrimary : colors.textDisabled }
            ]}>
              Tempo Padrão
            </Text>
          </View>
          <Text style={[
            styles.settingValue,
            { color: settings.enabled ? colors.textSecondary : colors.textDisabled }
          ]}>
            {selectedSnooze.label}
          </Text>
        </TouchableOpacity>

        {showSnoozePicker && settings.enabled && (
          <View style={[styles.pickerContainer, {
            backgroundColor: colors.background,
            borderBottomColor: colors.border
          }]}>
            {SNOOZE_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.pickerItem,
                  settings.default_snooze_minutes === option.value && { backgroundColor: colors.primaryLight },
                ]}
                onPress={() => handleUpdateSnooze(option.value)}
              >
                <Text style={[styles.pickerItemText, { color: colors.textPrimary }]}>
                  {option.label}
                </Text>
                {settings.default_snooze_minutes === option.value && (
                  <Icon name="check" size={18} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Snooze */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary, backgroundColor: colors.surface }]}>
          Configurações
        </Text>

        <TouchableOpacity
          style={[styles.actionButton, {
            backgroundColor: colors.background,
            borderBottomColor: colors.border
          }]}
          onPress={handleClearAllNotifications}
        >
          <Icon name="trash" size={18} color={colors.danger} />
          <Text style={[styles.actionButtonText, { color: colors.danger }]}>
            Limpar Todas Notificações
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, {
            backgroundColor: colors.background,
            borderBottomColor: colors.border
          }]}
          onPress={handleResetSettings}
        >
          <Icon name="refresh" size={18} color={colors.warning} />
          <Text style={[styles.actionButtonText, { color: colors.warning }]}>
            Resetar Configurações
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Time Pickers */}
      {showStartTimePicker && (
        <View style={[styles.pickerModal, { backgroundColor: colors.background }]}>
          <DateTimePicker
            value={tempStartTime}
            mode="time"
            is24Hour={true}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleStartTimeChange}
          />
          {Platform.OS === 'ios' && (
            <View style={styles.pickerButtons}>
              <TouchableOpacity
                onPress={() => setShowStartTimePicker(false)}
                style={[styles.pickerCancelButton, { backgroundColor: colors.surface }]}
              >
                <Text style={[styles.pickerCancelText, { color: colors.textSecondary }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmStartTime}
                style={[styles.pickerConfirmButton, { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.pickerConfirmText, { color: colors.textInverse }]}>
                  Confirmar
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {showEndTimePicker && (
        <View style={[styles.pickerModal, { backgroundColor: colors.background }]}>
          <DateTimePicker
            value={tempEndTime}
            mode="time"
            is24Hour={true}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleEndTimeChange}
          />
          {Platform.OS === 'ios' && (
            <View style={styles.pickerButtons}>
              <TouchableOpacity
                onPress={() => setShowEndTimePicker(false)}
                style={[styles.pickerCancelButton, { backgroundColor: colors.surface }]}
              >
                <Text style={[styles.pickerCancelText, { color: colors.textSecondary }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmEndTime}
                style={[styles.pickerConfirmButton, { backgroundColor: colors.primary }]}
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
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: { fontSize: 16 },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  content: { flex: 1 },
  section: { marginBottom: 12 },
  masterToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  masterToggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  masterToggleTitle: { fontSize: 18, fontWeight: '600' },
  masterToggleSubtitle: { fontSize: 13, marginTop: 2 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  settingText: { fontSize: 16 },
  settingHelper: { fontSize: 12, marginTop: 2 },
  settingValue: { fontSize: 14 },
  pickerContainer: { borderBottomWidth: 1, paddingVertical: 8 },
  pickerItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 12 },
  pickerItemText: { fontSize: 15, flex: 1 },
  quietHoursContainer: { paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, gap: 12 },
  quietHoursRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  quietHoursLabel: { fontSize: 15, width: 40 },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  timeButtonText: { fontSize: 16, fontWeight: '600' },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  actionButtonText: { fontSize: 15, textAlign: 'center' },
  pickerModal: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 20,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  pickerButtons: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 20, gap: 12 },
  pickerCancelButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  pickerCancelText: { fontSize: 15, fontWeight: '600' },
  pickerConfirmButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  pickerConfirmText: { fontSize: 15, fontWeight: '600' },
});