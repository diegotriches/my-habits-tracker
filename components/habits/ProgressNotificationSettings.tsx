// components/habits/ProgressNotificationSettings.tsx

import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';

export interface ProgressNotificationConfig {
  enabled: boolean;
  morningEnabled: boolean;
  morningTime: string;
  afternoonEnabled: boolean;
  afternoonTime: string;
  eveningEnabled: boolean;
  eveningTime: string;
}

interface Props {
  config: ProgressNotificationConfig;
  onChange: (config: ProgressNotificationConfig) => void;
  hasPermission: boolean;
  onRequestPermission: () => void;
  hasTarget?: boolean; // 🆕 Opcional: indica se é meta numérica
  habitType?: 'positive' | 'negative'; // 🆕 Opcional: tipo do hábito
}

export function ProgressNotificationSettings({
  config,
  onChange,
  hasPermission,
  onRequestPermission,
  hasTarget = false,
  habitType = 'positive',
}: Props) {
  const { colors } = useTheme();
  const [showTimePicker, setShowTimePicker] = useState<'morning' | 'afternoon' | 'evening' | null>(null);
  const [tempTime, setTempTime] = useState(new Date());

  // 🆕 Textos contextuais baseados no tipo de hábito
  const getTitle = () => {
    if (hasTarget) {
      return 'Lembretes de Progresso';
    }
    return habitType === 'negative' 
      ? 'Alertas de Urgência' 
      : 'Lembretes de Motivação';
  };

  const getDescription = () => {
    if (hasTarget) {
      return 'Receba notificações para atualizar seu progresso';
    }
    return habitType === 'negative'
      ? 'Receba alertas para manter sua resistência forte'
      : 'Receba lembretes para não esquecer de completar';
  };

  const parseTime = (timeString: string): Date => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours);
    date.setMinutes(minutes);
    date.setSeconds(0);
    return date;
  };

  const formatTime = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}:00`;
  };

  const displayTime = (timeString: string): string => {
    const [hours, minutes] = timeString.split(':');
    return `${hours}:${minutes}`;
  };

  const handleTimeChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(null);
      if (event.type === 'set' && date && showTimePicker) {
        const timeString = formatTime(date);
        onChange({
          ...config,
          [`${showTimePicker}Time`]: timeString,
        });
      }
    } else {
      if (date) {
        setTempTime(date);
      }
    }
  };

  const confirmTimeIOS = () => {
    if (showTimePicker) {
      const timeString = formatTime(tempTime);
      onChange({
        ...config,
        [`${showTimePicker}Time`]: timeString,
      });
    }
    setShowTimePicker(null);
  };

  const openTimePicker = (period: 'morning' | 'afternoon' | 'evening') => {
    const currentTime = parseTime(config[`${period}Time`]);
    setTempTime(currentTime);
    setShowTimePicker(period);
  };

  const renderPeriodToggle = (
    period: 'morning' | 'afternoon' | 'evening',
    label: string,
    icon: any
  ) => {
    const isEnabled = config[`${period}Enabled`];
    const timeValue = config[`${period}Time`];

    return (
      <View style={[styles.periodRow, { borderColor: colors.border }]}>
        <View style={styles.periodInfo}>
          <Icon name={icon} size={16} color={colors.textSecondary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.periodLabel, { color: colors.textPrimary }]}>
              {label}
            </Text>
            {isEnabled && (
              <TouchableOpacity
                onPress={() => openTimePicker(period)}
                style={styles.timeButton}
              >
                <Icon name="clock" size={12} color={colors.primary} />
                <Text style={[styles.timeText, { color: colors.primary }]}>
                  {displayTime(timeValue)}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <Switch
          value={isEnabled}
          onValueChange={(value) =>
            onChange({
              ...config,
              [`${period}Enabled`]: value,
            })
          }
          trackColor={{ false: colors.border, true: colors.primaryLight }}
          thumbColor={isEnabled ? colors.primary : colors.surface}
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon 
            name={hasTarget ? "target" : habitType === 'negative' ? "alertTriangle" : "bellRing"} 
            size={16} 
            color={colors.textPrimary} 
          />
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {getTitle()}
          </Text>
        </View>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {getDescription()}
        </Text>
      </View>

      {!hasPermission && (
        <TouchableOpacity
          style={[styles.permissionButton, { backgroundColor: colors.primary }]}
          onPress={onRequestPermission}
        >
          <Icon name="unlock" size={16} color={colors.textInverse} />
          <Text style={[styles.permissionButtonText, { color: colors.textInverse }]}>
            Ativar Notificações
          </Text>
        </TouchableOpacity>
      )}

      {hasPermission && (
        <>
          <View style={[styles.masterToggle, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.masterToggleLabel, { color: colors.textPrimary }]}>
                Habilitar {hasTarget ? 'Lembretes' : 'Alertas'}
              </Text>
              <Text style={[styles.masterToggleSubtext, { color: colors.textTertiary }]}>
                {hasTarget 
                  ? 'Até 3 lembretes por dia'
                  : habitType === 'negative'
                    ? 'Alertas estratégicos para resistir'
                    : 'Lembretes distribuídos ao longo do dia'
                }
              </Text>
            </View>
            <Switch
              value={config.enabled}
              onValueChange={(value) =>
                onChange({
                  ...config,
                  enabled: value,
                })
              }
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={config.enabled ? colors.primary : colors.surface}
            />
          </View>

          {config.enabled && (
            <View style={[styles.periodsContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.periodsTitle, { color: colors.textSecondary }]}>
                Horários
              </Text>
              
              {renderPeriodToggle('morning', 'Manhã', 'sunrise')}
              {renderPeriodToggle('afternoon', 'Tarde', 'sun')}
              {renderPeriodToggle('evening', 'Noite', 'moon')}

              {/* 🆕 Info contextual */}
              <View style={[styles.infoCard, { backgroundColor: colors.infoLight }]}>
                <Icon name="info" size={14} color={colors.info} />
                <Text style={[styles.infoText, { color: colors.info }]}>
                  {hasTarget
                    ? 'Você será notificado apenas se ainda não atingiu a meta do dia'
                    : habitType === 'negative'
                      ? 'Alertas enviados se você ainda não marcou resistência hoje'
                      : 'Lembretes enviados apenas se o hábito não foi completado'
                  }
                </Text>
              </View>
            </View>
          )}

          {showTimePicker && (
            <View style={[styles.pickerContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.pickerTitle, { color: colors.textPrimary }]}>
                Selecione o horário
              </Text>
              <DateTimePicker
                value={tempTime}
                mode="time"
                is24Hour={true}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleTimeChange}
              />
              {Platform.OS === 'ios' && (
                <View style={styles.pickerButtons}>
                  <TouchableOpacity
                    onPress={() => setShowTimePicker(null)}
                    style={[styles.pickerButton, { backgroundColor: colors.border }]}
                  >
                    <Text style={[styles.pickerButtonText, { color: colors.textSecondary }]}>
                      Cancelar
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={confirmTimeIOS}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  permissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  permissionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  masterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  masterToggleLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  masterToggleSubtext: {
    fontSize: 12,
  },
  periodsContainer: {
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  periodsTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  periodInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  periodLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  infoCard: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  pickerContainer: {
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  pickerTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
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