// components/notifications/AllRemindersView.tsx
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { notificationService } from '@/services/notifications';
import { supabase } from '@/services/supabase';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface ReminderWithHabit {
  id: string;
  habit_id: string;
  habit_name: string;
  habit_color: string;
  time: string;
  days_of_week: number[];
  is_active: boolean;
  sound: string | null;
}

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function AllRemindersView() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [reminders, setReminders] = useState<ReminderWithHabit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAllReminders();
    }
  }, [user]);

  const fetchAllReminders = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Buscar todos os lembretes do usuário com dados do hábito
      const { data, error } = await supabase
        .from('reminders')
        .select(`
          id,
          habit_id,
          time,
          days_of_week,
          is_active,
          sound,
          habits!inner (
            name,
            color
          )
        `)
        .eq('habits.user_id', user.id)
        .order('time', { ascending: true });

      if (error) throw error;

      // Transformar dados
      const remindersWithHabits: ReminderWithHabit[] = (data || []).map((item: any) => ({
        id: item.id,
        habit_id: item.habit_id,
        habit_name: item.habits.name,
        habit_color: item.habits.color,
        time: item.time,
        days_of_week: item.days_of_week || [0, 1, 2, 3, 4, 5, 6],
        is_active: item.is_active,
        sound: item.sound,
      }));

      setReminders(remindersWithHabits);
    } catch (error) {
      console.error('Erro ao buscar lembretes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleReminder = async (reminder: ReminderWithHabit) => {
    try {
      const newStatus = !reminder.is_active;

      // Atualizar no banco (casting explícito)
      const { error } = await (supabase
        .from('reminders') as any)
        .update({ is_active: newStatus })
        .eq('id', reminder.id);

      if (error) throw error;

      // Se desativando, cancelar notificações
      if (!newStatus) {
        await notificationService.cancelHabitNotifications(reminder.habit_id);
      } else {
        // Se ativando, reagendar (precisaria buscar notification_ids, simplificado aqui)
        // Em produção, você chamaria o hook useReminders para fazer isso corretamente
      }

      // Atualizar estado local
      setReminders((prev) =>
        prev.map((r) =>
          r.id === reminder.id ? { ...r, is_active: newStatus } : r
        )
      );
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível atualizar o lembrete');
    }
  };

  const handleDeleteReminder = (reminder: ReminderWithHabit) => {
    Alert.alert(
      'Deletar Lembrete',
      `Deseja remover o lembrete de ${reminder.time} para "${reminder.habit_name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Deletar',
          style: 'destructive',
          onPress: async () => {
            try {
              // Cancelar notificações
              await notificationService.cancelHabitNotifications(reminder.habit_id);

              // Deletar do banco (casting explícito)
              const { error } = await (supabase
                .from('reminders') as any)
                .delete()
                .eq('id', reminder.id);

              if (error) throw error;

              // Atualizar estado local
              setReminders((prev) => prev.filter((r) => r.id !== reminder.id));

              Alert.alert('✅ Lembrete removido');
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível deletar o lembrete');
            }
          },
        },
      ]
    );
  };

  const formatDaysOfWeek = (days: number[]): string => {
    if (days.length === 7) return 'Todos os dias';
    if (days.length === 0) return 'Nenhum dia';
    return days.map((d) => DAY_LABELS[d]).join(', ');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (reminders.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.emptyIconContainer, { backgroundColor: colors.surfaceElevated }]}>
          <Icon name="bellOff" size={48} color={colors.textTertiary} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
          Nenhum lembrete configurado
        </Text>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          Adicione lembretes nas configurações de cada hábito
        </Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]} 
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <Text style={[styles.headerText, { color: colors.textSecondary }]}>
          {reminders.length} {reminders.length === 1 ? 'lembrete' : 'lembretes'}
        </Text>
      </View>

      {reminders.map((reminder) => (
        <View 
          key={reminder.id} 
          style={[styles.reminderCard, { backgroundColor: colors.surface }]}
        >
          {/* Indicador de cor do hábito */}
          <View
            style={[styles.colorIndicator, { backgroundColor: reminder.habit_color }]}
          />

          <View style={styles.reminderContent}>
            {/* Header do lembrete */}
            <View style={styles.reminderHeader}>
              <Text style={[styles.habitName, { color: colors.textPrimary }]}>
                {reminder.habit_name}
              </Text>
              <View style={styles.actions}>
                <TouchableOpacity
                  onPress={() => handleToggleReminder(reminder)}
                  style={[
                    styles.toggleButton,
                    { backgroundColor: reminder.is_active ? colors.success : colors.surfaceElevated },
                  ]}
                >
                  <Icon 
                    name={reminder.is_active ? "check" : "close"} 
                    size={16} 
                    color="#FFFFFF" 
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleDeleteReminder(reminder)}
                  style={styles.deleteButton}
                >
                  <Icon name="trash" size={18} color={colors.danger} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Detalhes */}
            <View style={styles.reminderDetails}>
              <View style={styles.detailRow}>
                <Icon name="clock" size={14} color={colors.textSecondary} />
                <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                  {reminder.time}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Icon name="calendar" size={14} color={colors.textSecondary} />
                <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                  {formatDaysOfWeek(reminder.days_of_week)}
                </Text>
              </View>

              {reminder.sound && reminder.sound !== 'default' && (
                <View style={styles.detailRow}>
                  <Icon name="sound" size={14} color={colors.textSecondary} />
                  <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                    {reminder.sound}
                  </Text>
                </View>
              )}

              {/* Status */}
              <View style={styles.statusBadge}>
                <Text
                  style={[
                    styles.statusText,
                    {
                      color: reminder.is_active ? colors.success : colors.textSecondary,
                      backgroundColor: reminder.is_active ? colors.successLight : colors.surfaceElevated,
                    },
                  ]}
                >
                  {reminder.is_active ? 'Ativo' : 'Desativado'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      ))}

      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerText: {
    fontSize: 13,
    fontWeight: '600',
  },
  reminderCard: {
    flexDirection: 'row',
    marginBottom: 1,
    paddingVertical: 16,
    paddingRight: 16,
  },
  colorIndicator: {
    width: 4,
    marginRight: 16,
  },
  reminderContent: {
    flex: 1,
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  habitName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
  },
  statusBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
});