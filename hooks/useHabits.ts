// hooks/useHabits.ts
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/services/supabase';
import { useAuth } from './useAuth';
import { FrequencyGoalPeriod, Habit, HabitInsert, ReminderUpdate } from '@/types/database';
import { notificationService } from '@/services/notificationService';
import { progressNotificationScheduler } from '@/services/progressNotificationScheduler';
import { readCache, writeCache } from '@/services/offlineCache';

const habitsTable = () => supabase.from('habits');

async function cleanupHabitNotifications(habitId: string): Promise<void> {
  try {
    await notificationService.cancelHabitNotifications(habitId);
    await progressNotificationScheduler.disableProgressNotifications(habitId);

    const update: ReminderUpdate = { is_active: false, notification_ids: [] };
    const { error } = await supabase.from('reminders').update(update).eq('habit_id', habitId);

    if (error) throw error;
  } catch (err) {
    // Não bloqueia a exclusão: os alarmes já foram cancelados no aparelho.
    console.error('Erro ao limpar lembretes do hábito excluído:', err);
  }
}

export const useHabits = () => {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Só regrava o cache depois de uma busca bem-sucedida: antes disso a lista
  // é a inicial (vazia) ou veio do próprio cache.
  const loadedFromServerRef = useRef(false);

  useEffect(() => {
    if (user) {
      fetchHabits();
    }
  }, [user]);

  // Cache offline: mantém a última lista conhecida, inclusive depois de
  // criar/editar/excluir (que só acontecem online).
  useEffect(() => {
    if (user?.id && loadedFromServerRef.current) void writeCache('habits', user.id, habits);
  }, [habits, user?.id]);

  const fetchHabits = async () => {
    if (!user?.id) return;
    const userId = user.id;

    try {
      setLoading(true);
      setError(null);

      // Mostra o cache na hora (abre offline); a busca abaixo atualiza.
      const cached = await readCache<Habit[]>('habits', userId);
      if (cached) {
        setHabits((prev) => (prev.length > 0 ? prev : cached));
        setLoading(false);
      }

      const { data, error: fetchError } = await habitsTable()
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      loadedFromServerRef.current = true;
      setHabits((data as Habit[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar hábitos');
    } finally {
      setLoading(false);
    }
  };

  const getHabit = async (habitId: string) => {
    try {
      const { data, error: fetchError } = await habitsTable()
        .select('*')
        .eq('id', habitId)
        .single();

      if (fetchError) {
        return { data: null, error: fetchError.message };
      }

      return { data, error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Erro ao buscar hábito',
      };
    }
  };

  const createHabit = async (habitData: {
    name: string;
    description?: string;
    type?: 'positive' | 'negative';
    frequency_type?: 'daily' | 'weekly' | 'custom';
    frequency_days?: number[];
    has_target?: boolean;
    target_value?: number | null;
    target_unit?: string | null;
    frequency_goal_value?: number | null;
    frequency_goal_period?: FrequencyGoalPeriod | null;
    frequency_goal_custom_days?: number | null;
    color: string;
    icon?: string;
  }) => {
    if (!user?.id) {
      return { data: null, error: 'Usuário não autenticado' };
    }

    try {
      const dataToInsert: HabitInsert = {
        user_id: user.id,
        name: habitData.name,
        description: habitData.description || null,
        type: habitData.type || 'positive',
        frequency_type: habitData.frequency_type || 'daily',
        frequency_days: habitData.frequency_days || null,
        has_target: habitData.has_target || false,
        target_value: habitData.target_value || null,
        target_unit: habitData.target_unit || null,
        color: habitData.color,
        icon: habitData.icon || 'star',
        is_active: true,
      };

      if (habitData.frequency_goal_value) {
        dataToInsert.frequency_goal_value = habitData.frequency_goal_value;
      }
      if (habitData.frequency_goal_period) {
        dataToInsert.frequency_goal_period = habitData.frequency_goal_period;
      }
      if (habitData.frequency_goal_custom_days) {
        dataToInsert.frequency_goal_custom_days = habitData.frequency_goal_custom_days;
      }

      const { data, error: insertError } = await habitsTable()
        .insert(dataToInsert)
        .select()
        .single();

      if (insertError) {
        return { data: null, error: insertError.message };
      }

      setHabits((prevHabits) => [data as Habit, ...prevHabits]);

      return { data, error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Erro ao criar hábito',
      };
    }
  };

  const updateHabit = async (
    habitId: string,
    updates: {
      name?: string;
      description?: string | null;
      color?: string;
      has_target?: boolean;
      target_value?: number | null;
      target_unit?: string | null;
      frequency_type?: 'daily' | 'weekly' | 'custom';
      frequency_days?: number[] | null;
      frequency_goal_value?: number | null;
      frequency_goal_period?: FrequencyGoalPeriod | null;
      frequency_goal_custom_days?: number | null;
    }
  ) => {
    try {
      const { data, error: updateError } = await habitsTable()
        .update(updates)
        .eq('id', habitId)
        .select()
        .single();

      if (updateError) {
        return { data: null, error: updateError.message };
      }

      setHabits((prevHabits) => prevHabits.map((h) => (h.id === habitId ? (data as Habit) : h)));

      return { data, error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Erro ao atualizar hábito',
      };
    }
  };

  const deleteHabit = async (habitId: string) => {
    try {
      const { error: deleteError } = await habitsTable()
        .update({ is_active: false })
        .eq('id', habitId);

      if (deleteError) {
        return { error: deleteError.message };
      }

      // O hábito é só desativado (soft delete), então nada no banco
      // remove os lembretes: cancela alarmes/notificações e desativa os
      // registros para que não voltem a ser agendados.
      await cleanupHabitNotifications(habitId);

      setHabits((prevHabits) => prevHabits.filter((h) => h.id !== habitId));

      return { error: null };
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : 'Erro ao deletar hábito',
      };
    }
  };

  const toggleHabitActive = async (habitId: string, isActive: boolean) => {
    try {
      const { error: updateError } = await habitsTable()
        .update({ is_active: isActive })
        .eq('id', habitId);

      if (updateError) {
        return { error: updateError.message };
      }

      if (isActive) {
        const { data } = await getHabit(habitId);
        if (data) {
          setHabits((prevHabits) => [data as Habit, ...prevHabits]);
        }
      } else {
        setHabits((prevHabits) => prevHabits.filter((h) => h.id !== habitId));
      }

      return { error: null };
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : 'Erro ao atualizar status',
      };
    }
  };

  const refresh = async () => {
    await fetchHabits();
  };

  return {
    habits,
    loading,
    error,
    getHabit,
    createHabit,
    updateHabit,
    deleteHabit,
    toggleHabitActive,
    refresh,
  };
};
