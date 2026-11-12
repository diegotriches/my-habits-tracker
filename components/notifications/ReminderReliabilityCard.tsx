// components/notifications/ReminderReliabilityCard.tsx
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import { ReminderReliabilityStatus } from '@/services/reminderReliabilityService';

interface ReminderReliabilityCardProps {
  status: ReminderReliabilityStatus;
  manufacturerTip: string | null;
  onOpenBatterySettings: () => void;
  onOpenExactAlarmSettings: () => void;
}

interface RowProps {
  ok: boolean;
  title: string;
  okText: string;
  problemText: string;
  onFix: () => void;
}

// Fora do corpo do cartão: definido dentro, seria remontado a cada render.
const Row = React.memo(function Row({ ok, title, okText, problemText, onFix }: RowProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[styles.row, { backgroundColor: colors.background, borderBottomColor: colors.border }]}
    >
      <Icon
        name={ok ? 'checkCircle' : 'alertTriangle'}
        size={20}
        color={ok ? colors.success : colors.warning}
      />
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{title}</Text>
        <Text style={[styles.rowHelper, { color: colors.textSecondary }]}>
          {ok ? okText : problemText}
        </Text>
      </View>
      {!ok && (
        <TouchableOpacity
          onPress={onFix}
          style={[styles.fixButton, { backgroundColor: colors.primary }]}
          accessibilityRole="button"
        >
          <Text style={styles.fixButtonText}>Ajustar</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

/**
 * Seção "Lembretes confiáveis" das configurações de notificação (Android):
 * mostra o que pode atrasar os lembretes e leva às telas do sistema.
 */
export const ReminderReliabilityCard = React.memo(function ReminderReliabilityCard({
  status,
  manufacturerTip,
  onOpenBatterySettings,
  onOpenExactAlarmSettings,
}: ReminderReliabilityCardProps) {
  const { colors } = useTheme();

  return (
    <View>
      <Text
        style={[
          styles.sectionTitle,
          { color: colors.textSecondary, backgroundColor: colors.surface },
        ]}
      >
        Lembretes confiáveis
      </Text>

      <Row
        ok={status.batteryUnrestricted}
        title="Otimização de bateria"
        okText="O app está liberado"
        problemText='Ative "Não otimizar" / "Sem restrições" para o app'
        onFix={onOpenBatterySettings}
      />
      <Row
        ok={status.exactAlarms}
        title="Alarmes e lembretes"
        okText="Lembretes chegam no horário exato"
        problemText="Sem esta permissão, os lembretes podem atrasar"
        onFix={onOpenExactAlarmSettings}
      />

      {manufacturerTip && (
        <View
          style={[
            styles.tip,
            { backgroundColor: colors.background, borderBottomColor: colors.border },
          ]}
        >
          <Icon name="lightbulb" size={18} color={colors.textSecondary} />
          <Text style={[styles.tipText, { color: colors.textSecondary }]}>{manufacturerTip}</Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 16 },
  rowHelper: { fontSize: 12, marginTop: 2 },
  fixButton: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  fixButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  tip: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  tipText: { flex: 1, fontSize: 13, lineHeight: 18 },
});
