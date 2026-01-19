// hooks/useReminders.ts
import { useState, useEffect } from 'react';
import { supabase } from '@/services/supabase';
import { notificationService, NotificationSound } from '@/services/notifications';

export interface Reminder {
  id: string;
  habit_id: string;
  time: string;
  days_of_week: number[];
  is_active: boolean;
  notification_ids: string[]; // Array de IDs (um por dia da semana)
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
   * Buscar frequência do hábito (para sincronizar lembretes)
   */
  const getHabitFrequency = async (habitId: string): Promise<number[]> => {
    try {
      const { data: habit, error } = await supabase
        .from('habits')
        .select('frequency_type, frequency_days')
        .eq('id', habitId)
        .single();

      if (error || !habit) return [0, 1, 2, 3, 4, 5, 6]; // Default: todos os dias

      // Casting explícito para o tipo correto
      const habitData = habit as {
        frequency_type: 'daily' | 'weekly' | 'custom';
        frequency_days: number[] | null;
      };

      // Se for diário, retorna todos os dias
      if (habitData.frequency_type === 'daily') {
        return [0, 1, 2, 3, 4, 5, 6];
      }

      // Se for semanal/custom, retorna os dias específicos
      return habitData.frequency_days || [0, 1, 2, 3, 4, 5, 6];
    } catch (error) {
      console.warn('Erro ao buscar frequência do hábito:', error);
      return [0, 1, 2, 3, 4, 5, 6];
    }
  };

  /**
   * Criar novo lembrete (sincroniza com frequência do hábito)
   */
  const createReminder = async (
    habitId: string,
    habitName: string,
    time: string,
    sound: NotificationSound = 'default',
    customDaysOfWeek?: number[]
  ): Promise<Reminder | null> => {
    try {
      // Buscar dias do hábito (se não fornecidos manualmente)
      const daysOfWeek = customDaysOfWeek || (await getHabitFrequency(habitId));

      // Criar registro no banco (sem notification_ids ainda)
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

      // Agendar notificações (uma por dia da semana)
      const notificationIds = await notificationService.scheduleWeeklyReminder(
        habitId,
        habitName,
        time,
        daysOfWeek,
        createdReminder.id,
        sound,
        true // checkCompletion = true (não notificar se já completou)
      );

      // Atualizar registro com os IDs das notificações
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

      return newReminder;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar lembrete');
      return null;
    }
  };

  /**
   * Atualizar lembrete existente
   */
  const updateReminder = async (
    reminderId: string,
    habitName: string,
    updates: Partial<Pick<Reminder, 'time' | 'days_of_week' | 'is_active' | 'sound'>>
  ): Promise<boolean> => {
    try {
      const reminder = reminders.find((r) => r.id === reminderId);
      if (!reminder) throw new Error('Lembrete não encontrado');

      // Cancelar notificações antigas
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

      // Reagendar notificações se estiver ativo
      let newNotificationIds: string[] = [];

      if (updatedReminder.is_active) {
        newNotificationIds = await notificationService.scheduleWeeklyReminder(
          updatedReminder.habit_id,
          habitName,
          updatedReminder.time,
          updatedReminder.days_of_week,
          updatedReminder.id,
          updatedReminder.sound || 'default',
          true
        );

        // Atualizar IDs no banco
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

      // Cancelar notificações
      if (reminder.notification_ids && reminder.notification_ids.length > 0) {
        await notificationService.cancelNotifications(reminder.notification_ids);
      }

      // Deletar do banco
      const { error } = await remindersTable().delete().eq('id', reminderId);

      if (error) throw error;

      setReminders((prev) => prev.filter((r) => r.id !== reminderId));

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao deletar lembrete');
      return false;
    }
  };

  /**
   * Toggle ativar/desativar lembrete
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
   * Deletar todos os lembretes de um hábito
   */
  const deleteAllHabitReminders = async (habitId: string): Promise<boolean> => {
    try {
      // Cancelar todas as notificações do hábito
      await notificationService.cancelHabitNotifications(habitId);

      // Deletar do banco
      const { error } = await remindersTable().delete().eq('habit_id', habitId);

      if (error) throw error;

      setReminders((prev) => prev.filter((r) => r.habit_id !== habitId));

      return true;
    } catch (err) {
      console.error('Erro ao deletar lembretes do hábito:', err);
      return false;
    }
  };

  /**
   * Atualizar som de um lembrete
   */
  const updateReminderSound = async (
    reminderId: string,
    habitName: string,
    sound: NotificationSound
  ): Promise<boolean> => {
    return await updateReminder(reminderId, habitName, { sound });
  };

  /**
   * Sincronizar lembretes com a frequência do hábito
   * (Útil quando o usuário edita a frequência do hábito)
   */
  const syncRemindersWithHabitFrequency = async (
    habitId: string,
    habitName: string
  ): Promise<boolean> => {
    try {
      const habitReminders = reminders.filter((r) => r.habit_id === habitId);
      const newFrequency = await getHabitFrequency(habitId);

      // Atualizar cada lembrete com a nova frequência
      for (const reminder of habitReminders) {
        await updateReminder(reminder.id, habitName, {
          days_of_week: newFrequency,
        });
      }

      return true;
    } catch (error) {
      console.error('Erro ao sincronizar lembretes:', error);
      return false;
    }
  };

  /**
   * Testar notificação (dispara em 5 segundos)
   */
  const testNotification = async (habitName: string): Promise<void> => {
    await notificationService.scheduleTestNotification(habitName);
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