// hooks/useProgressNotifications.ts
import { useState, useCallback } from 'react';
import { progressNotificationScheduler } from '@/services/progressNotificationScheduler';
import { progressCheckerService } from '@/services/progressChecker';
import { supabase } from '@/services/supabase';
import { ProgressNotification, NotificationPeriod } from '@/types/database';
import { useAuth } from './useAuth';

/**
 * Hook para gerenciar notificações de progresso de hábitos
 */
export const useProgressNotifications = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Busca configurações de notificações de progresso de um hábito
   */
  const getSettings = useCallback(async (habitId: string): Promise<ProgressNotification | null> => {
    try {
      setLoading(true);
      setError(null);

      const settings = await progressNotificationScheduler.getProgressNotificationSettings(habitId);
      
      setLoading(false);
      return settings;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao buscar configurações';
      setError(errorMsg);
      setLoading(false);
      return null;
    }
  }, []);

  /**
   * Habilita notificações de progresso para um hábito
   */
  const enable = useCallback(async (habitId: string): Promise<boolean> => {
    try {
      if (!user?.id) {
        setError('Usuário não autenticado');
        return false;
      }

      setLoading(true);
      setError(null);

      const success = await progressNotificationScheduler.enableProgressNotifications(habitId, user.id);

      setLoading(false);
      
      if (!success) {
        setError('Não foi possível habilitar notificações');
      }

      return success;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao habilitar notificações';
      setError(errorMsg);
      setLoading(false);
      return false;
    }
  }, [user]);

  /**
   * Desabilita notificações de progresso para um hábito
   */
  const disable = useCallback(async (habitId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const success = await progressNotificationScheduler.disableProgressNotifications(habitId);

      setLoading(false);
      
      if (!success) {
        setError('Não foi possível desabilitar notificações');
      }

      return success;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao desabilitar notificações';
      setError(errorMsg);
      setLoading(false);
      return false;
    }
  }, []);

  /**
   * Atualiza configurações de um período específico
   */
  const updatePeriod = useCallback(async (
    habitId: string,
    period: NotificationPeriod,
    enabled: boolean,
    time?: string
  ): Promise<boolean> => {
    try {
      if (!user?.id) {
        setError('Usuário não autenticado');
        return false;
      }

      setLoading(true);
      setError(null);

      const success = await progressNotificationScheduler.updatePeriodSettings(
        habitId,
        user.id,
        period,
        enabled,
        time
      );

      setLoading(false);
      
      if (!success) {
        setError('Não foi possível atualizar período');
      }

      return success;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao atualizar período';
      setError(errorMsg);
      setLoading(false);
      return false;
    }
  }, [user]);

  /**
   * Atualiza todas as configurações de uma vez
   */
  const updateSettings = useCallback(async (
    habitId: string,
    settings: {
      enabled: boolean;
      morningEnabled: boolean;
      morningTime: string;
      afternoonEnabled: boolean;
      afternoonTime: string;
      eveningEnabled: boolean;
      eveningTime: string;
    }
  ): Promise<boolean> => {
    try {
      if (!user?.id) {
        setError('Usuário não autenticado');
        return false;
      }

      setLoading(true);
      setError(null);

      // Atualizar no banco
      const { error: updateError } = await (supabase
        .from('habit_progress_notifications') as any)
        .update({
          enabled: settings.enabled,
          morning_enabled: settings.morningEnabled,
          morning_time: settings.morningTime,
          afternoon_enabled: settings.afternoonEnabled,
          afternoon_time: settings.afternoonTime,
          evening_enabled: settings.eveningEnabled,
          evening_time: settings.eveningTime,
        })
        .eq('habit_id', habitId);

      if (updateError) {
        throw updateError;
      }

      // Reagendar notificações
      if (settings.enabled) {
        await progressNotificationScheduler.updateNotificationSchedule(habitId, user.id);
      } else {
        await progressNotificationScheduler.cancelProgressNotifications(habitId);
      }

      setLoading(false);
      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao atualizar configurações';
      setError(errorMsg);
      setLoading(false);
      return false;
    }
  }, [user]);

  /**
   * Cria configuração padrão para um hábito novo
   */
  const createDefault = useCallback(async (habitId: string): Promise<boolean> => {
    try {
      if (!user?.id) {
        setError('Usuário não autenticado');
        return false;
      }

      setLoading(true);
      setError(null);

      const success = await progressNotificationScheduler.createDefaultSettings(habitId, user.id);

      setLoading(false);
      
      if (!success) {
        setError('Não foi possível criar configuração padrão');
      }

      return success;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao criar configuração';
      setError(errorMsg);
      setLoading(false);
      return false;
    }
  }, [user]);

  /**
   * Verifica progresso atual de um hábito
   */
  const checkProgress = useCallback(async (habitId: string) => {
    try {
      setLoading(true);
      setError(null);

      const progress = await progressCheckerService.getTodayProgress(habitId);

      setLoading(false);
      return progress;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao verificar progresso';
      setError(errorMsg);
      setLoading(false);
      return null;
    }
  }, []);

  /**
   * Busca todos os hábitos que precisam de notificação em um período
   */
  const getHabitsNeedingNotification = useCallback(async (period: NotificationPeriod) => {
    try {
      if (!user?.id) {
        setError('Usuário não autenticado');
        return [];
      }

      setLoading(true);
      setError(null);

      const habits = await progressCheckerService.getHabitsNeedingProgressNotification(user.id, period);

      setLoading(false);
      return habits;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao buscar hábitos';
      setError(errorMsg);
      setLoading(false);
      return [];
    }
  }, [user]);

  /**
   * Processa notificação de progresso (chamado quando trigger dispara)
   */
  const processNotification = useCallback(async (
    habitId: string,
    period: NotificationPeriod
  ): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      await progressNotificationScheduler.processProgressNotification(habitId, period);

      setLoading(false);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao processar notificação';
      setError(errorMsg);
      setLoading(false);
    }
  }, []);

  /**
   * Debug: Lista todas as notificações de progresso ativas
   */
  const debug = useCallback(async (): Promise<void> => {
    try {
      if (!user?.id) {
        console.log('Usuário não autenticado');
        return;
      }

      await progressNotificationScheduler.debugProgressNotifications(user.id);
    } catch (err) {
      console.error('Erro ao debugar notificações:', err);
    }
  }, [user]);

  /**
   * Limpa erro
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // Estado
    loading,
    error,
    
    // Métodos principais
    getSettings,
    enable,
    disable,
    updatePeriod,
    updateSettings,
    createDefault,
    
    // Verificação de progresso
    checkProgress,
    getHabitsNeedingNotification,
    processNotification,
    
    // Utilidades
    debug,
    clearError,
  };
};