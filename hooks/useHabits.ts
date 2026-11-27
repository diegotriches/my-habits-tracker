// hooks/useHabits.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { supabase } from '@/services/supabase';
import { useAuth } from './useAuth';
import { FrequencyGoalPeriod, Habit, HabitInsert, ReminderUpdate } from '@/types/database';
import { notificationService } from '@/services/notificationService';
import { progressNotificationScheduler } from '@/services/progressNotificationScheduler';
import { readCache, writeCache } from '@/services/offlineCache';
import { emitHabitsChanged, HABITS_CHANGED_EVENT } from '@/services/habitEvents';
import { reminderSyncService } from '@/services/reminderSyncService';
import { habitOrderService } from '@/services/habitOrderService';
import { applyOrder, nextSortOrder, sortHabits } from '@/utils/habitOrder';

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
  // Sobe a cada reordenação: uma busca que começou antes dela traz a ordem
  // antiga do banco e não pode desfazer a nova (a pendência no aparelho pode
  // ainda nem ter sido gravada quando a busca a consulta).
  const reorderSeqRef = useRef(0);

  // Cache offline: mantém a última lista conhecida, inclusive depois de
  // criar/editar/excluir (que só acontecem online).
  useEffect(() => {
    if (user?.id && loadedFromServerRef.current) void writeCache('habits', user.id, habits);
  }, [habits, user?.id]);

  /**
   * `silent`: busca em segundo plano (ex.: ao voltar para o app) — sem o
   * indicador de carregamento e sem virar erro se falhar (a lista na tela
   * continua valendo).
   */
  const fetchHabits = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!user?.id) return;
      const userId = user.id;
      const reorderSeq = reorderSeqRef.current;

      try {
        if (!silent) {
          setLoading(true);
          setError(null);
        }

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
          .is('archived_at', null); // arquivados ficam em settings/archived

        if (fetchError) throw fetchError;

        // Ordem da tela inicial: a do banco, ou a arrastada que ainda não foi
        // enviada (sem conexão), ou — uma vez — a que a versão antiga guardava
        // só no aparelho.
        const rows = data ?? [];
        const pending =
          (await habitOrderService.pendingOrder(userId)) ??
          (await habitOrderService.adoptLegacyOrder(userId, rows));

        loadedFromServerRef.current = true;
        if (reorderSeqRef.current !== reorderSeq) {
          // Reordenou durante a busca: vale a ordem que está na tela.
          setHabits((prev) =>
            applyOrder(
              rows,
              prev.map((h) => h.id)
            )
          );
        } else {
          setHabits(pending ? applyOrder(rows, pending) : sortHabits(rows));
        }
      } catch (err) {
        if (!silent) setError(err instanceof Error ? err.message : 'Erro ao buscar hábitos');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [user]
  );

  // Busca de novo quando o objeto `user` muda — inclusive na renovação do
  // token, o que atualiza a tela ao reconectar depois de abrir offline.
  useEffect(() => {
    if (user) {
      fetchHabits();
    }
  }, [user, fetchHabits]);

  // Outra tela mudou a lista (criou, editou, excluiu, arquivou, restaurou).
  useEffect(() => {
    if (!user) return;
    const subscription = DeviceEventEmitter.addListener(HABITS_CHANGED_EVENT, () => {
      void fetchHabits();
    });
    return () => subscription.remove();
  }, [user, fetchHabits]);

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
        // Entra no fim da lista, junto do "Novo hábito".
        sort_order: nextSortOrder(habits),
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

      setHabits((prevHabits) => [...prevHabits, data]);
      emitHabitsChanged();

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
      emitHabitsChanged();

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
      reminderSyncService.syncCurrentUser();

      setHabits((prevHabits) => prevHabits.filter((h) => h.id !== habitId));
      emitHabitsChanged();

      return { error: null };
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : 'Erro ao deletar hábito',
      };
    }
  };

  /** Ordem arrastada na tela inicial: vale na hora e é enviada ao banco. */
  const reorderHabits = useCallback(
    (orderedIds: string[]) => {
      if (!user?.id) return;
      reorderSeqRef.current++;
      setHabits((prev) => applyOrder(prev, orderedIds));
      void habitOrderService.save(user.id, orderedIds);
    },
    [user]
  );

  const refresh = useCallback(() => fetchHabits(), [fetchHabits]);
  /** Busca sem indicador de carregamento (ver `useForegroundRefresh`). */
  const refreshSilently = useCallback(() => fetchHabits({ silent: true }), [fetchHabits]);

  return {
    habits,
    loading,
    error,
    getHabit,
    createHabit,
    updateHabit,
    deleteHabit,
    reorderHabits,
    refresh,
    refreshSilently,
  };
};
