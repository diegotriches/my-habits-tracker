// app/settings/archived.tsx
import { ArchivedHabitRow } from '@/components/habits/ArchivedHabitRow';
import { Icon } from '@/components/ui/Icon';
import { SuccessToast } from '@/components/ui/SuccessToast';
import { useTheme } from '@/contexts/ThemeContext';
import { useArchiveHabitActions } from '@/hooks/useArchiveHabitActions';
import { useArchivedHabits } from '@/hooks/useArchivedHabits';
import { Habit } from '@/types/database';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ArchivedHabitsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { habits, loading, error, refresh } = useArchivedHabits();
  const { busy, restore } = useArchiveHabitActions();
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const handleOpen = useCallback((habitId: string) => {
    router.push({ pathname: '/habits/[id]', params: { id: habitId } });
  }, []);

  const handleRestore = useCallback(
    async (habitId: string) => {
      setRestoringId(habitId);
      const ok = await restore(habitId);
      setRestoringId(null);
      if (ok) setToast('Hábito restaurado — de volta à tela inicial');
    },
    [restore]
  );

  const renderItem = useCallback(
    ({ item }: { item: Habit }) => (
      <ArchivedHabitRow
        habit={item}
        restoring={restoringId === item.id}
        disabled={busy}
        onOpen={handleOpen}
        onRestore={handleRestore}
      />
    ),
    [restoringId, busy, handleOpen, handleRestore]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SuccessToast
        visible={toast !== null}
        message={toast ?? ''}
        duration={3000}
        onHide={() => setToast(null)}
      />

      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
            paddingTop: insets.top + 16,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerButton}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
        >
          <Icon name="chevronLeft" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Hábitos arquivados</Text>
        <View style={styles.headerButton} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={habits}
          keyExtractor={(h) => h.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 20 }]}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={refresh} tintColor={colors.primary} />
          }
          ListHeaderComponent={
            error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null
          }
          ListEmptyComponent={
            error ? null : (
              <View style={styles.empty}>
                <Icon name="archive" size={40} color={colors.textTertiary} />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                  Nenhum hábito arquivado
                </Text>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Para tirar um hábito da tela inicial sem perder o histórico, abra os detalhes dele
                  e escolha &quot;Arquivar&quot; no menu.
                </Text>
              </View>
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerButton: { padding: 8, minWidth: 40 },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginHorizontal: 8,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 20, flexGrow: 1 },
  error: { fontSize: 14, marginBottom: 12, textAlign: 'center' },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  emptyTitle: { fontSize: 17, fontWeight: '600' },
  emptyText: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
});
