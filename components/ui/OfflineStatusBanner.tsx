// components/ui/OfflineStatusBanner.tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';

interface OfflineStatusBannerProps {
  isOffline: boolean;
  pendingCount: number;
}

const changes = (n: number) => `${n} ${n === 1 ? 'alteração' : 'alterações'}`;

/**
 * Faixa discreta com o estado do modo offline: sem conexão (e quantas
 * marcações aguardam envio) ou enviando as pendentes. Some quando está tudo
 * sincronizado.
 */
export const OfflineStatusBanner = React.memo(function OfflineStatusBanner({
  isOffline,
  pendingCount,
}: OfflineStatusBannerProps) {
  const { colors } = useTheme();
  if (!isOffline && pendingCount === 0) return null;

  const message = isOffline
    ? pendingCount > 0
      ? `Sem conexão · ${changes(pendingCount)} aguardando envio`
      : 'Sem conexão · suas marcações ficam salvas no aparelho'
    : `Enviando ${changes(pendingCount)}...`;

  return (
    <View
      style={[styles.banner, { backgroundColor: isOffline ? colors.warningLight : colors.surface }]}
      accessibilityRole="text"
      accessibilityLiveRegion="polite"
    >
      <Icon name={isOffline ? 'alertCircle' : 'refresh'} size={14} color={colors.textSecondary} />
      <Text style={[styles.text, { color: colors.textSecondary }]}>{message}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  text: { fontSize: 13, flex: 1 },
});
