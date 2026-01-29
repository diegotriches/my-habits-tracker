// hooks/useReminders.ts
import { useState, useEffect } from 'react';
import { supabase } from '@/services/supabase';
import { notificationService, NotificationSound } from '@/services/notificationService';

export interface Reminder {
  id: string;
  habit_id: string;
  time: string;
  days_of_week: number[];
  is_active: boolean;
  notification_ids: string[];
  sound?: NotificationSound;
  created_at: string;
}

const remindersTable = () => supabase.from('reminders') as any;

export function useReminders(habitId?: string) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Buscar lembretes de um hábito
   */
  const fetchReminders = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await remindersTable()
        .select('*')
        .eq('habit_id', id)
        .order('time', { ascending: true });

      if (error) throw error;

      setReminders((data || []) as Reminder[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar lembretes');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Buscar frequência do hábito
   */
  const getHabitFrequency = async (habitId: string): Promise<number[]> => {
    try {
      const { data: habit, error } = await supabase
        .from('habits')
        .select('frequency_type, frequency_days')
        .eq('id', habitId)
        .single();

      if (error || !habit) return [0, 1, 2, 3, 4, 5, 6];

      const habitData = habit as {
        frequency_type: 'daily' | 'weekly' | 'custom';
        frequency_days: number[] | null;
      };

      if (habitData.frequency_type === 'daily') {
        return [0, 1, 2, 3, 4, 5, 6];
      }

      return habitData.frequency_days || [0, 1, 2, 3, 4, 5, 6];
    } catch (error) {
      console.warn('Erro ao buscar frequência do hábito:', error);
      return [0, 1, 2, 3, 4, 5, 6];
    }
  };

  /**
   * Criar novo lembrete com Notifee
   */
  const createReminder = async (
    habitId: string,
    habitName: string,
    time: string,
    sound: NotificationSound = 'default',
    customDaysOfWeek?: number[]
  ): Promise<Reminder | null> => {
    try {
      const daysOfWeek = customDaysOfWeek || (await getHabitFrequency(habitId));

      // Validar formato do horário
      if (!/^\d{2}:\d{2}$/.test(time)) {
        console.error('Formato de horário inválido:', time);
        setError('Formato de horário inválido. Use HH:MM');
        return null;
      }

      console.log('🔔 Criando lembrete:', {
        habitName,
        time,
        daysOfWeek,
        sound,
      });

      // Criar registro no banco
      const { data, error } = await remindersTable()
        .insert({
          habit_id: habitId,
          time,
          days_of_week: daysOfWeek,
          is_active: true,
          sound: sound || 'default',
        })
        .select()
        .single();

      if (error) throw error;

      const createdReminder = data as Reminder;

      console.log('✅ Lembrete criado no banco:', createdReminder);

      // ✅ Agendar com Notifee (via wrapper)
      console.log('📅 Agendando notificações com Notifee...');
      const notificationIds = await notificationService.scheduleWeeklyReminder(
        habitId,
        habitName,
        time,
        daysOfWeek,
        createdReminder.id,
        sound
      );

      console.log('📬 IDs das notificações agendadas:', notificationIds);

      // Atualizar com IDs
      if (notificationIds.length > 0) {
        await remindersTable()
          .update({ notification_ids: notificationIds })
          .eq('id', createdReminder.id);
      }

      const newReminder: Reminder = {
        ...createdReminder,
        notification_ids: notificationIds,
      };

      setReminders((prev) => [...prev, newReminder]);

      console.log('✅ Lembrete criado com sucesso');
      return newReminder;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao criar lembrete';
      console.error('❌ Erro ao criar lembrete:', errorMsg);
      setError(errorMsg);
      return null;
    }
  };

  /**
   * Atualizar lembrete
   */
  const updateReminder = async (
    reminderId: string,
    habitName: string,
    updates: Partial<Pick<Reminder, 'time' | 'days_of_week' | 'is_active' | 'sound'>>
  ): Promise<boolean> => {
    try {
      const reminder = reminders.find((r) => r.id === reminderId);
      if (!reminder) throw new Error('Lembrete não encontrado');

      const timeChanged = updates.time !== undefined && updates.time !== reminder.time;
      const daysChanged = updates.days_of_week !== undefined && 
                          JSON.stringify(updates.days_of_week) !== JSON.stringify(reminder.days_of_week);
      const soundChanged = updates.sound !== undefined && updates.sound !== reminder.sound;
      const statusChanged = updates.is_active !== undefined && updates.is_active !== reminder.is_active;

      const needsReschedule = timeChanged || daysChanged || soundChanged;

      if (statusChanged && updates.is_active === false) {
        // Desativando
        if (reminder.notification_ids && reminder.notification_ids.length > 0) {
          await notificationService.cancelNotifications(reminder.notification_ids);
        }
        
        await remindersTable()
          .update({ is_active: false, notification_ids: [] })
          .eq('id', reminderId);

        setReminders((prev) =>
          prev.map((r) =>
            r.id === reminderId ? { ...r, is_active: false, notification_ids: [] } : r
          )
        );

        console.log('✅ Lembrete desativado');
        return true;
      }

      if (needsReschedule || (statusChanged && updates.is_active === true)) {
        // Cancelar antigas
        if (reminder.notification_ids && reminder.notification_ids.length > 0) {
          await notificationService.cancelNotifications(reminder.notification_ids);
        }

        // Atualizar no banco
        const { data, error } = await remindersTable()
          .update(updates)
          .eq('id', reminderId)
          .select()
          .single();

        if (error) throw error;

        const updatedReminder = data as Reminder;

        // Reagendar se estiver ativo
        let newNotificationIds: string[] = [];

        if (updatedReminder.is_active) {
          newNotificationIds = await notificationService.scheduleWeeklyReminder(
            updatedReminder.habit_id,
            habitName,
            updatedReminder.time,
            updatedReminder.days_of_week,
            updatedReminder.id,
            updatedReminder.sound || 'default'
          );

          if (newNotificationIds.length > 0) {
            await remindersTable()
              .update({ notification_ids: newNotificationIds })
              .eq('id', reminderId);
          }
        }

        setReminders((prev) =>
          prev.map((r) =>
            r.id === reminderId
              ? { ...updatedReminder, notification_ids: newNotificationIds }
              : r
          )
        );

        console.log('✅ Lembrete atualizado');
        return true;
      }

      const { error } = await remindersTable()
        .update(updates)
        .eq('id', reminderId);

      if (error) throw error;

      setReminders((prev) =>
        prev.map((r) =>
          r.id === reminderId ? { ...r, ...updates } : r
        )
      );

      console.log('✅ Lembrete atualizado');
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar lembrete');
      return false;
    }
  };

  /**
   * Deletar lembrete
   */
  const deleteReminder = async (reminderId: string): Promise<boolean> => {
    try {
      const reminder = reminders.find((r) => r.id === reminderId);
      if (!reminder) throw new Error('Lembrete não encontrado');

      if (reminder.notification_ids && reminder.notification_ids.length > 0) {
        await notificationService.cancelNotifications(reminder.notification_ids);
      }

      const { error } = await remindersTable().delete().eq('id', reminderId);

      if (error) throw error;

      setReminders((prev) => prev.filter((r) => r.id !== reminderId));

      console.log('✅ Lembrete excluído');
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao deletar lembrete');
      return false;
    }
  };

  /**
   * Toggle ativar/desativar
   */
  const toggleReminder = async (
    reminderId: string,
    habitName: string
  ): Promise<boolean> => {
    const reminder = reminders.find((r) => r.id === reminderId);
    if (!reminder) return false;

    return await updateReminder(reminderId, habitName, {
      is_active: !reminder.is_active,
    });
  };

  /**
   * Deletar todos de um hábito
   */
  const deleteAllHabitReminders = async (habitId: string): Promise<boolean> => {
    try {
      await notificationService.cancelHabitNotifications(habitId);

      const { error } = await remindersTable().delete().eq('habit_id', habitId);

      if (error) throw error;

      setReminders((prev) => prev.filter((r) => r.habit_id !== habitId));

      console.log('✅ Todos os lembretes do hábito excluídos');
      return true;
    } catch (err) {
      console.error('Erro ao deletar lembretes do hábito:', err);
      return false;
    }
  };

  /**
   * Atualizar som
   */
  const updateReminderSound = async (
    reminderId: string,
    habitName: string,
    sound: NotificationSound
  ): Promise<boolean> => {
    return await updateReminder(reminderId, habitName, { sound });
  };

  /**
   * Sincronizar com frequência do hábito
   */
  const syncRemindersWithHabitFrequency = async (
    habitId: string,
    habitName: string
  ): Promise<boolean> => {
    try {
      const habitReminders = reminders.filter((r) => r.habit_id === habitId);
      const newFrequency = await getHabitFrequency(habitId);

      for (const reminder of habitReminders) {
        await updateReminder(reminder.id, habitName, {
          days_of_week: newFrequency,
        });
      }

      console.log('✅ Lembretes sincronizados com frequência do hábito');
      return true;
    } catch (error) {
      console.error('Erro ao sincronizar lembretes:', error);
      return false;
    }
  };

  /**
   * Testar notificação
   */
  const testNotification = async (habitName: string): Promise<void> => {
    await notificationService.scheduleTestNotification(habitName);
    console.log('🧪 Notificação de teste enviada');
  };

  useEffect(() => {
    if (habitId) {
      fetchReminders(habitId);
    }
  }, [habitId]);

  return {
    reminders,
    loading,
    error,
    createReminder,
    updateReminder,
    deleteReminder,
    toggleReminder,
    deleteAllHabitReminders,
    updateReminderSound,
    syncRemindersWithHabitFrequency,
    testNotification,
    refreshReminders: habitId ? () => fetchReminders(habitId) : () => {},
  };
}