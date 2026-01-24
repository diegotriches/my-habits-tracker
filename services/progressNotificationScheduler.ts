// services/progressNotificationScheduler.ts
import * as Notifications from 'expo-notifications';
import { supabase } from './supabase';
import { progressCheckerService } from './progressChecker';
import { Habit, ProgressNotification, NotificationPeriod } from '@/types/database';

/**
 * Service para agendar e gerenciar notificações de progresso
 */
class ProgressNotificationSchedulerService {
  /**
   * Agenda todas as notificações de progresso para um hábito
   */
  async scheduleProgressNotifications(habitId: string, userId: string): Promise<boolean> {
    try {
      // Buscar configurações
      const { data: config, error: configError } = await supabase
        .from('habit_progress_notifications')
        .select('*')
        .eq('habit_id', habitId)
        .single();

      if (configError || !config) {
        console.error('Configuração não encontrada:', configError);
        return false;
      }

      const progressConfig = config as ProgressNotification;

      if (!progressConfig.enabled) {
        console.log('Notificações de progresso desabilitadas para este hábito');
        return true;
      }

      // Buscar dados do hábito
      const { data: habit, error: habitError } = await supabase
        .from('habits')
        .select('*')
        .eq('id', habitId)
        .single();

      if (habitError || !habit) {
        console.error('Hábito não encontrado:', habitError);
        return false;
      }

      const habitData = habit as Habit;

      // Cancelar notificações antigas primeiro
      await this.cancelProgressNotifications(habitId);

      // Agendar cada período habilitado
      const notificationIds: {
        morning?: string;
        afternoon?: string;
        evening?: string;
      } = {};

      if (progressConfig.morning_enabled) {
        const id = await this.scheduleNotification(
          habitData,
          'morning',
          progressConfig.morning_time
        );
        if (id) notificationIds.morning = id;
      }

      if (progressConfig.afternoon_enabled) {
        const id = await this.scheduleNotification(
          habitData,
          'afternoon',
          progressConfig.afternoon_time
        );
        if (id) notificationIds.afternoon = id;
      }

      if (progressConfig.evening_enabled) {
        const id = await this.scheduleNotification(
          habitData,
          'evening',
          progressConfig.evening_time
        );
        if (id) notificationIds.evening = id;
      }

      // Salvar IDs das notificações no banco
      const { error: updateError } = await (supabase
        .from('habit_progress_notifications') as any)
        .update({
          morning_notification_id: notificationIds.morning || null,
          afternoon_notification_id: notificationIds.afternoon || null,
          evening_notification_id: notificationIds.evening || null,
        })
        .eq('habit_id', habitId);

      if (updateError) {
        console.error('Erro ao salvar IDs de notificação:', updateError);
      }

      return true;
    } catch (error) {
      console.error('Erro ao agendar notificações de progresso:', error);
      return false;
    }
  }

  /**
   * Agenda uma notificação individual para um período específico
   */
  private async scheduleNotification(
    habit: Habit,
    period: NotificationPeriod,
    time: string
  ): Promise<string | null> {
    try {
      const [hours, minutes] = time.split(':').map(Number);

      // Criar trigger diário
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '📊 Verificando progresso...',
          body: `Preparando notificação para ${habit.name}`,
          data: {
            habitId: habit.id,
            habitName: habit.name,
            period,
            type: 'progress_notification',
            checkProgress: true,
          },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          hour: hours,
          minute: minutes,
          repeats: true,
        },
      });

      return notificationId;
    } catch (error) {
      console.error('Erro ao agendar notificação:', error);
      return null;
    }
  }

  /**
   * Cancela todas as notificações de progresso de um hábito
   */
  async cancelProgressNotifications(habitId: string): Promise<void> {
    try {
      // Buscar IDs salvos
      const { data: config, error } = await supabase
        .from('habit_progress_notifications')
        .select('morning_notification_id, afternoon_notification_id, evening_notification_id')
        .eq('habit_id', habitId)
        .single();

      if (error || !config) {
        console.log('Nenhuma configuração encontrada para cancelar');
        return;
      }

      const progressConfig = config as ProgressNotification;

      // Cancelar cada notificação
      const ids = [
        progressConfig.morning_notification_id,
        progressConfig.afternoon_notification_id,
        progressConfig.evening_notification_id,
      ].filter(Boolean) as string[];

      for (const id of ids) {
        try {
          await Notifications.cancelScheduledNotificationAsync(id);
        } catch (err) {
          console.warn('Erro ao cancelar notificação:', id, err);
        }
      }

      // Limpar IDs do banco
      await (supabase.from('habit_progress_notifications') as any)
        .update({
          morning_notification_id: null,
          afternoon_notification_id: null,
          evening_notification_id: null,
        })
        .eq('habit_id', habitId);
    } catch (error) {
      console.error('Erro ao cancelar notificações:', error);
    }
  }

  /**
   * Atualiza o agendamento de notificações (usado quando settings mudam)
   */
  async updateNotificationSchedule(habitId: string, userId: string): Promise<boolean> {
    return await this.scheduleProgressNotifications(habitId, userId);
  }

  /**
   * Habilita notificações de progresso para um hábito
   */
  async enableProgressNotifications(habitId: string, userId: string): Promise<boolean> {
    try {
      // Criar ou atualizar configuração
      const { error: upsertError } = await (supabase
        .from('habit_progress_notifications') as any)
        .upsert(
          {
            habit_id: habitId,
            user_id: userId,
            enabled: true,
          },
          {
            onConflict: 'habit_id',
          }
        );

      if (upsertError) {
        console.error('Erro ao habilitar notificações:', upsertError);
        return false;
      }

      // Agendar notificações
      return await this.scheduleProgressNotifications(habitId, userId);
    } catch (error) {
      console.error('Erro ao habilitar notificações:', error);
      return false;
    }
  }

  /**
   * Desabilita notificações de progresso para um hábito
   */
  async disableProgressNotifications(habitId: string): Promise<boolean> {
    try {
      // Cancelar todas as notificações
      await this.cancelProgressNotifications(habitId);

      // Atualizar configuração
      const { error } = await (supabase
        .from('habit_progress_notifications') as any)
        .update({ enabled: false })
        .eq('habit_id', habitId);

      if (error) {
        console.error('Erro ao desabilitar notificações:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao desabilitar notificações:', error);
      return false;
    }
  }

  /**
   * Atualiza configurações de um período específico
   */
  async updatePeriodSettings(
    habitId: string,
    userId: string,
    period: NotificationPeriod,
    enabled: boolean,
    time?: string
  ): Promise<boolean> {
    try {
      const updates: any = {};
      updates[`${period}_enabled`] = enabled;
      if (time) {
        updates[`${period}_time`] = time;
      }

      const { error } = await (supabase
        .from('habit_progress_notifications') as any)
        .update(updates)
        .eq('habit_id', habitId);

      if (error) {
        console.error('Erro ao atualizar período:', error);
        return false;
      }

      // Re-agendar notificações
      return await this.scheduleProgressNotifications(habitId, userId);
    } catch (error) {
      console.error('Erro ao atualizar período:', error);
      return false;
    }
  }

  /**
   * Busca configuração de notificações de progresso de um hábito
   */
  async getProgressNotificationSettings(
    habitId: string
  ): Promise<ProgressNotification | null> {
    try {
      const { data, error } = await supabase
        .from('habit_progress_notifications')
        .select('*')
        .eq('habit_id', habitId)
        .maybeSingle();

      if (error) {
        console.error('Erro ao buscar configurações:', error);
        return null;
      }

      return data as ProgressNotification | null;
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
      return null;
    }
  }

  /**
   * Cria configuração padrão para um novo hábito com meta
   */
  async createDefaultSettings(habitId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await (supabase
        .from('habit_progress_notifications') as any)
        .insert({
          habit_id: habitId,
          user_id: userId,
          enabled: false, // Desabilitado por padrão
        });

      if (error) {
        console.error('Erro ao criar configuração padrão:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao criar configuração padrão:', error);
      return false;
    }
  }

  /**
   * Processa notificação de progresso quando o trigger dispara
   * Esta função deve ser chamada pelo handler de notificações
   */
  async processProgressNotification(
    habitId: string,
    period: NotificationPeriod
  ): Promise<void> {
    try {
      // Buscar progresso atual
      const progress = await progressCheckerService.getTodayProgress(habitId);
      if (!progress) {
        console.log('Não foi possível buscar progresso');
        return;
      }

      // Verificar se deve notificar
      if (!progressCheckerService.shouldNotify(progress, period)) {
        console.log('Não precisa notificar (meta já atingida ou outro motivo)');
        return;
      }

      // Gerar mensagem
      const message = progressCheckerService.getNotificationMessage(progress, period);

      // Enviar notificação imediata
      await Notifications.scheduleNotificationAsync({
        content: {
          title: message.title,
          body: message.body,
          data: {
            habitId,
            type: 'progress_alert',
            period,
            percentage: Math.round(progress.percentage),
          },
          sound: true,
          priority:
            message.urgency === 'high'
              ? Notifications.AndroidNotificationPriority.HIGH
              : Notifications.AndroidNotificationPriority.DEFAULT,
        },
        trigger: null, // Imediato
      });
    } catch (error) {
      console.error('Erro ao processar notificação de progresso:', error);
    }
  }

  /**
   * Debug: Listar todas as notificações de progresso agendadas
   */
  async debugProgressNotifications(userId: string): Promise<void> {
    try {
      const { data } = await supabase
        .from('habit_progress_notifications')
        .select(`
          *,
          habits!inner (name)
        `)
        .eq('user_id', userId)
        .eq('enabled', true);

      console.log('📊 Notificações de Progresso Ativas:', data?.length || 0);
      data?.forEach((config: any) => {
        console.log('\n---');
        console.log('Hábito:', config.habits.name);
        console.log('Manhã:', config.morning_enabled ? config.morning_time : 'Desabilitado');
        console.log('Tarde:', config.afternoon_enabled ? config.afternoon_time : 'Desabilitado');
        console.log('Noite:', config.evening_enabled ? config.evening_time : 'Desabilitado');
      });
    } catch (error) {
      console.error('Erro ao listar notificações:', error);
    }
  }
}

export const progressNotificationScheduler = new ProgressNotificationSchedulerService();