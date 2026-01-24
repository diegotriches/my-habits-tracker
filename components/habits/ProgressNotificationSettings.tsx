// components/habits/ProgressNotificationSettings.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Platform,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import { hapticFeedback } from '@/utils/haptics';

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
  onRequestPermission: () => Promise<void>;
}

type Period = 'morning' | 'afternoon' | 'evening';

export const ProgressNotificationSettings: React.FC<Props> = ({
  config,
  onChange,
  hasPermission,
  onRequestPermission,
}) => {
  const { colors } = useTheme();
  const [showTimePicker, setShowTimePicker] = useState<Period | null>(null);

  const handleToggleEnabled = (value: boolean) => {
    hapticFeedback.selection();
    onChange({ ...config, enabled: value });
  };

  const handleTogglePeriod = (period: Period, value: boolean) => {
    hapticFeedback.selection();
    const key = `${period}Enabled` as keyof ProgressNotificationConfig;
    onChange({ ...config, [key]: value });
  };

  const handleTimeChange = (period: Period, event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(null);
    }

    if (event.type === 'set' && date) {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}:00`;

      const key = `${period}Time` as keyof ProgressNotificationConfig;
      onChange({ ...config, [key]: timeString });

      if (Platform.OS === 'android') {
        hapticFeedback.success();
      }
    } else if (event.type === 'dismissed') {
      setShowTimePicker(null);
    }
  };

  const formatTime = (timeString: string): string => {
    const [hours, minutes] = timeString.split(':');
    return `${hours}:${minutes}`;
  };

  const parseTime = (timeString: string): Date => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0);
    return date;
  };

  const getPeriodInfo = (period: Period) => {
    const info = {
      morning: {
        icon: 'sunrise' as const,
        label: 'Lembrete Matinal',
        description: 'Começar o dia com motivação',
        color: colors.warning,
      },
      afternoon: {
        icon: 'sun' as const,
        label: 'Verificação da Tarde',
        description: 'Avaliar progresso até agora',
        color: colors.primary,
      },
      evening: {
        icon: 'moon' as const,
        label: 'Alerta de Urgência',
        description: 'Última chance do dia',
        color: colors.danger,
      },
    };
    return info[period];
  };

  const renderPeriodRow = (period: Period) => {
    const info = getPeriodInfo(period);
    const enabled = config[`${period}Enabled` as keyof ProgressNotificationConfig] as boolean;
    const time = config[`${period}Time` as keyof ProgressNotificationConfig] as string;

    return (
      <View key={period} style={[styles.periodRow, { borderBottomColor: colors.border }]}>
        <View style={styles.periodLeft}>
          <View style={[styles.periodIcon, { backgroundColor: `${info.color}15` }]}>
            <Icon name={info.icon} size={20} color={info.color} />
          </View>
          <View style={styles.periodInfo}>
            <Text style={[styles.periodLabel, { color: colors.textPrimary }]}>
              {info.label}
            </Text>
            <Text style={[styles.periodDescription, { color: colors.textTertiary }]}>
              {info.description}
            </Text>
          </View>
        </View>

        <View style={styles.periodRight}>
          {enabled && (
            <TouchableOpacity
              style={[styles.timeButton, { backgroundColor: colors.surface }]}
              onPress={() => {
                hapticFeedback.light();
                setShowTimePicker(period);
              }}
            >
              <Icon name="clock" size={14} color={colors.textSecondary} />
              <Text style={[styles.timeText, { color: colors.textPrimary }]}>
                {formatTime(time)}
              </Text>
            </TouchableOpacity>
          )}

          <Switch
            value={enabled}
            onValueChange={(value) => handleTogglePeriod(period, value)}
            trackColor={{ false: colors.border, true: colors.primaryLight }}
            thumbColor={enabled ? colors.primary : colors.surface}
          />
        </View>
      </View>
    );
  };

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="bell" size={16} color={colors.textPrimary} />
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Notificações de Progresso
            </Text>
          </View>
        </View>

        <View style={[styles.permissionCard, { backgroundColor: colors.warningLight }]}>
          <Icon name="alertCircle" size={24} color={colors.warning} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.permissionTitle, { color: colors.warning }]}>
              Permissão Necessária
            </Text>
            <Text style={[styles.permissionText, { color: colors.warning }]}>
              Habilite as notificações para receber lembretes sobre o progresso de suas metas
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.permissionButton, { backgroundColor: colors.primary }]}
          onPress={async () => {
            hapticFeedback.light();
            await onRequestPermission();
          }}
        >
          <Icon name="unlock" size={16} color={colors.textInverse} />
          <Text style={[styles.permissionButtonText, { color: colors.textInverse }]}>
            Permitir Notificações
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header com toggle principal */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="bell" size={16} color={colors.textPrimary} />
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Notificações de Progresso
            </Text>
          </View>
          <Text style={[styles.subtitle, { color: colors.textTertiary }]}>
            Receba lembretes durante o dia para atingir sua meta
          </Text>
        </View>
        <Switch
          value={config.enabled}
          onValueChange={handleToggleEnabled}
          trackColor={{ false: colors.border, true: colors.primaryLight }}
          thumbColor={config.enabled ? colors.primary : colors.surface}
        />
      </View>

      {config.enabled && (
        <>
          {/* Info Card */}
          <View style={[styles.infoCard, { backgroundColor: colors.infoLight }]}>
            <Icon name="info" size={14} color={colors.info} />
            <Text style={[styles.infoText, { color: colors.info }]}>
              Você receberá até 3 notificações por dia baseadas no seu progresso
            </Text>
          </View>

          {/* Períodos */}
          <View style={[styles.periodsContainer, { backgroundColor: colors.surface }]}>
            {renderPeriodRow('morning')}
            {renderPeriodRow('afternoon')}
            {renderPeriodRow('evening')}
          </View>

          {/* Time Picker Modal */}
          {showTimePicker && (
            <View style={[styles.pickerContainer, { backgroundColor: colors.surface }]}>
              <View style={styles.pickerHeader}>
                <Text style={[styles.pickerTitle, { color: colors.textPrimary }]}>
                  Selecionar Horário
                </Text>
                {Platform.OS === 'ios' && (
                  <TouchableOpacity
                    onPress={() => {
                      hapticFeedback.success();
                      setShowTimePicker(null);
                    }}
                  >
                    <Text style={[styles.pickerDone, { color: colors.primary }]}>
                      Confirmar
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <DateTimePicker
                value={parseTime(config[`${showTimePicker}Time` as keyof ProgressNotificationConfig] as string)}
                mode="time"
                is24Hour={true}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, date) => handleTimeChange(showTimePicker, event, date)}
              />
            </View>
          )}

          {/* Exemplo de mensagens */}
          <View style={[styles.exampleCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.exampleTitle, { color: colors.textPrimary }]}>
              💬 Exemplos de Mensagens
            </Text>
            <View style={styles.exampleList}>
              <View style={styles.exampleItem}>
                <Text style={[styles.exampleEmoji, { color: colors.textPrimary }]}>☀️</Text>
                <Text style={[styles.exampleText, { color: colors.textSecondary }]}>
                  Manhã: "Lembre-se da sua meta de hoje"
                </Text>
              </View>
              <View style={styles.exampleItem}>
                <Text style={[styles.exampleEmoji, { color: colors.textPrimary }]}>⚠️</Text>
                <Text style={[styles.exampleText, { color: colors.textSecondary }]}>
                  Tarde: "Você está em 40%. Continue!"
                </Text>
              </View>
              <View style={styles.exampleItem}>
                <Text style={[styles.exampleEmoji, { color: colors.textPrimary }]}>🚨</Text>
                <Text style={[styles.exampleText, { color: colors.textSecondary }]}>
                  Noite: "Última chance! Faltam 60%"
                </Text>
              </View>
            </View>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  periodsContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  periodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  periodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  periodIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  periodInfo: {
    flex: 1,
  },
  periodLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  periodDescription: {
    fontSize: 12,
  },
  periodRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  exampleCard: {
    padding: 16,
    borderRadius: 12,
  },
  exampleTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  exampleList: {
    gap: 8,
  },
  exampleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  exampleEmoji: {
    fontSize: 16,
  },
  exampleText: {
    flex: 1,
    fontSize: 12,
  },
  permissionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 12,
  },
  permissionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  permissionText: {
    fontSize: 12,
    lineHeight: 16,
  },
  permissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
  },
  permissionButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  pickerContainer: {
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pickerTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  pickerDone: {
    fontSize: 15,
    fontWeight: '600',
  },
});