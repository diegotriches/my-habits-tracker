import { useState, useEffect } from 'react';
import { supabase } from '@/services/supabase';
import { notificationService } from '@/services/notifications';

export interface Reminder {
  id: string;
  habit_id: string;
  time: string;
  days_of_week: number[];
  is_active: boolean;
  notification_id?: string | null;
  created_at: string;
}

// Helper para contornar problemas de tipagem do Supabase
const remindersTable = () => (supabase.from('reminders') as any);

export function useReminders(habitId?: string) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      console.error('Erro ao buscar lembretes:', err);
      setError(err instanceof Error ? err.message : 'Erro ao buscar lembretes');
    } finally {
      setLoading(false);
    }
  };

  const createReminder = async (
    habitId: string,
    habitName: string,
    time: string,
    daysOfWeek: number[] = [0, 1, 2, 3, 4, 5, 6],
    isActive: boolean = true
  ): Promise<Reminder | null> => {
    try {
      const { data, error } = await remindersTable()
        .insert({
          habit_id: habitId,
          time,
          days_of_week: daysOfWeek,
          is_active: isActive,
        })
        .select()
        .single();

      if (error) throw error;

      const createdReminder = data as Reminder;
      let notificationId: string | null = null;

      if (isActive) {
        notificationId = await notificationService.scheduleDailyReminder(
          habitId,
          habitName,
          time,
          createdReminder.id
        );

        if (notificationId) {
          await remindersTable()
            .update({ notification_id: notificationId })
            .eq('id', createdReminder.id);
        }
      }

      const newReminder: Reminder = { 
        ...createdReminder, 
        notification_id: notificationId 
      };
      
      setReminders((prev) => [...prev, newReminder]);

      return newReminder;
    } catch (err) {
      console.error('Erro ao criar lembrete:', err);
      setError(err instanceof Error ? err.message : 'Erro ao criar lembrete');
      return null;
    }
  };

  const updateReminder = async (
    reminderId: string,
    habitName: string,
    updates: Partial<Pick<Reminder, 'time' | 'days_of_week' | 'is_active'>>
  ): Promise<boolean> => {
    try {
      const reminder = reminders.find((r) => r.id === reminderId);
      if (!reminder) throw new Error('Lembrete não encontrado');

      if (reminder.notification_id) {
        await notificationService.cancelNotification(reminder.notification_id);
      }

      const { data, error } = await remindersTable()
        .update(updates)
        .eq('id', reminderId)
        .select()
        .single();

      if (error) throw error;

      const updatedReminder = data as Reminder;
      let newNotificationId: string | null = null;

      if (updatedReminder.is_active) {
        newNotificationId = await notificationService.scheduleDailyReminder(
          updatedReminder.habit_id,
          habitName,
          updatedReminder.time,
          updatedReminder.id
        );

        if (newNotificationId) {
          await remindersTable()
            .update({ notification_id: newNotificationId })
            .eq('id', reminderId);
        }
      }

      setReminders((prev) =>
        prev.map((r) =>
          r.id === reminderId
            ? { ...updatedReminder, notification_id: newNotificationId }
            : r
        )
      );

      return true;
    } catch (err) {
      console.error('Erro ao atualizar lembrete:', err);
      setError(err instanceof Error ? err.message : 'Erro ao atualizar lembrete');
      return false;
    }
  };

  const deleteReminder = async (reminderId: string): Promise<boolean> => {
    try {
      const reminder = reminders.find((r) => r.id === reminderId);
      if (!reminder) throw new Error('Lembrete não encontrado');

      if (reminder.notification_id) {
        await notificationService.cancelNotification(reminder.notification_id);
      }

      const { error } = await remindersTable()
        .delete()
        .eq('id', reminderId);

      if (error) throw error;

      setReminders((prev) => prev.filter((r) => r.id !== reminderId));

      return true;
    } catch (err) {
      console.error('Erro ao deletar lembrete:', err);
      setError(err instanceof Error ? err.message : 'Erro ao deletar lembrete');
      return false;
    }
  };

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

  const deleteAllHabitReminders = async (habitId: string): Promise<boolean> => {
    try {
      await notificationService.cancelHabitNotifications(habitId);

      const { error } = await remindersTable()
        .delete()
        .eq('habit_id', habitId);

      if (error) throw error;

      setReminders((prev) => prev.filter((r) => r.habit_id !== habitId));

      return true;
    } catch (err) {
      console.error('Erro ao deletar lembretes do hábito:', err);
      return false;
    }
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
    refreshReminders: habitId ? () => fetchReminders(habitId) : () => {},
  };
}