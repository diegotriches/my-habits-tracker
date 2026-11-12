// components/account/DataTransferCard.tsx
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { IconName } from '@/constants/Icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useDataTransfer } from '@/hooks/useDataTransfer';

interface ActionRowProps {
  icon: IconName;
  title: string;
  description: string;
  loading: boolean;
  disabled: boolean;
  onPress: () => void;
}

// Fora do corpo do cartão: definido dentro, seria remontado a cada render.
const ActionRow = React.memo(function ActionRow({ icon, title, description, loading, disabled, onPress }: ActionRowProps) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.row, { borderTopColor: colors.border, opacity: disabled && !loading ? 0.5 : 1 }]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
    >
      <Icon name={icon} size={20} color={colors.primary} />
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{title}</Text>
        <Text style={[styles.rowDescription, { color: colors.textSecondary }]}>{description}</Text>
      </View>
      {loading ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <Icon name="chevronRight" size={18} color={colors.textTertiary} />
      )}
    </TouchableOpacity>
  );
});

/** Cartão "Backup e exportação" da tela de Dados e Privacidade. */
export const DataTransferCard = React.memo(function DataTransferCard() {
  const { colors } = useTheme();
  const { busy, exportBackup, exportCsv, importBackup } = useDataTransfer();

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <Icon name="download" size={20} color={colors.primary} />
        <Text style={[styles.title, { color: colors.textPrimary }]}>Backup e exportação</Text>
      </View>
      <Text style={[styles.text, { color: colors.textSecondary }]}>
        Leve seus hábitos para outro aparelho ou conta, ou guarde uma cópia do seu histórico.
      </Text>

      <ActionRow
        icon="download"
        title="Exportar backup"
        description="Arquivo completo (JSON), que pode ser importado depois"
        loading={busy === 'backup'}
        disabled={busy !== null}
        onPress={exportBackup}
      />
      <ActionRow
        icon="file"
        title="Exportar histórico"
        description="Planilha com todas as conclusões (CSV)"
        loading={busy === 'csv'}
        disabled={busy !== null}
        onPress={exportCsv}
      />
      <ActionRow
        icon="upload"
        title="Importar backup"
        description="Hábitos com o mesmo nome recebem só os dias que faltam"
        loading={busy === 'import'}
        disabled={busy !== null}
        onPress={importBackup}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  card: { borderRadius: 12, padding: 20, marginBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '600' },
  text: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '500' },
  rowDescription: { fontSize: 12, marginTop: 2 },
});
