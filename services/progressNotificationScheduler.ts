// services/progressNotificationScheduler.ts
import * as Notifications from 'expo-notifications';
import { supabase } from './supabase';
import { progressCheckerService } from './progressChecker';
import { Habit, ProgressNotification, NotificationPeriod } from '@/types/database';

class ProgressNotificationSchedulerService {

  // ---------------------------------------------------------------------------
  // Agendar todas as notificações de progresso de um hábito
  // ---------------------------------------------------------------------------
  async scheduleProgressNotifications(habitId: string, userId: string): Promise<boolean> {
    try {
      console.log('Agendando notificacoes de progresso para:', habitId);

      const { data: config, error: configError } = await supabase
        .from('habit_progress_notifications')
        .select('*')
        .eq('habit_id', habitId)
        .single();

      if (configError || !config) {
        console.error('Configuracao nao encontrada:', configError);
        return false;
      }

      const progressConfig = config as ProgressNotification;

      if (!progressConfig.enabled) {
        console.log('Notificacoes de progresso desabilitadas');
        return true;
      }

      const { data: habit, error: habitError } = await supabase
        .from('habits')
        .select('*')
        .eq('id', habitId)
        .single();

      if (habitError || !habit) {
        console.error('Habito nao encontrado:', habitError);
        return false;
      }

      const habitData = habit as Habit;

      await this.cancelProgressNotifications(habitId);

      const notificationIds: {
        morning?: string;
        afternoon?: string;
        evening?: string;
      } = {};

      if (progressConfig.morning_enabled) {
        const id = await this.scheduleNotification(habitData, 'morning', progressConfig.morning_time);
        if (id) notificationIds.morning = id;
      }

      if (progressConfig.afternoon_enabled) {
        const id = await this.scheduleNotification(habitData, 'afternoon', progressConfig.afternoon_time);
        if (id) notificationIds.afternoon = id;
      }

      if (progressConfig.evening_enabled) {
        const id = await this.scheduleNotification(habitData, 'evening', progressConfig.evening_time);
        if (id) notificationIds.evening = id;
      }

      const { error: updateError } = await (supabase
        .from('habit_progress_notifications') as any)
        .update({
          morning_notification_id: notificationIds.morning || null,
          afternoon_notification_id: notificationIds.afternoon || null,
          evening_notification_id: notificationIds.evening || null,
        })
        .eq('habit_id', habitId);

      if (updateError) {
        console.error('Erro ao salvar IDs:', updateError);
      }

      console.log('Notificacoes de progresso agendadas:', notificationIds);
      return true;
    } catch (error) {
      console.error('Erro ao agendar notificacoes de progresso:', error);
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Agendar notificação individual de um período
  // ---------------------------------------------------------------------------
  private async scheduleNotification(
    habit: Habit,
    period: NotificationPeriod,
    time: string
  ): Promise<string | null> {
    try {
      const [hours, minutes] = time.split(':').map(Number);
      console.log(`Agendando progresso: ${period} as ${time}`);

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Verificacao de progresso',
          body: `Como esta seu progresso em "${habit.name}"?`,
          data: {
            habitId: habit.id,
            habitName: habit.name,
            period,
            type: 'progress_check',
            checkProgress: 'true',
          },
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: hours,
          minute: minutes,
        },
      });

      console.log(`Notificacao de progresso agendada: ${id}`);
      return id;
    } catch (error) {
      console.error('Erro ao agendar notificacao de progresso:', error);
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Cancelar notificações de progresso de um hábito
  // ---------------------------------------------------------------------------
  async cancelProgressNotifications(habitId: string): Promise<void> {
    try {
      console.log('Cancelando notificacoes de progresso:', habitId);

      const { data: config, error } = await supabase
        .from('habit_progress_notifications')
        .select('morning_notification_id, afternoon_notification_id, evening_notification_id')
        .eq('habit_id', habitId)
        .single();

      if (error || !config) {
        console.log('Nenhuma configuracao encontrada');
        return;
      }

      const progressConfig = config as ProgressNotification;

      const ids = [
        progressConfig.morning_notification_id,
        progressConfig.afternoon_notification_id,
        progressConfig.evening_notification_id,
      ].filter(Boolean) as string[];

      for (const id of ids) {
        try {
          await Notifications.cancelScheduledNotificationAsync(id);
          console.log('Cancelado:', id);
        } catch (err) {
          console.warn('Erro ao cancelar:', id, err);
        }
      }

      await (supabase.from('habit_progress_notifications') as any)
        .update({
          morning_notification_id: null,
          afternoon_notification_id: null,
          evening_notification_id: null,
        })
        .eq('habit_id', habitId);

      console.log('Notificacoes de progresso canceladas');
    } catch (error) {
      console.error('Erro ao cancelar:', error);
    }
  }

  // ---------------------------------------------------------------------------
  // Processar notificação quando dispara (chamado pelo NotificationHandler)
  // ---------------------------------------------------------------------------
  async processProgressNotification(
    habitId: string,
    period: NotificationPeriod
  ): Promise<void> {
    try {
      console.log('Processando notificacao de progresso:', { habitId, period });

      const progress = await progressCheckerService.getTodayProgress(habitId);
      if (!progress) {
        console.log('Nao foi possivel buscar progresso');
        return;
      }

      if (!progressCheckerService.shouldNotify(progress, period)) {
        console.log('Nao precisa notificar');
        return;
      }

      const message = progressCheckerService.getNotificationMessage(progress, period);

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
          sound: 'default',
          priority: message.urgency === 'high'
            ? Notifications.AndroidNotificationPriority.HIGH
            : Notifications.AndroidNotificationPriority.DEFAULT,
        },
        trigger: null,
      });

      console.log('Notificacao de progresso enviada');
    } catch (error) {
      console.error('Erro ao processar:', error);
    }
  }

  // ---------------------------------------------------------------------------
  // CRUD de configurações
  // ---------------------------------------------------------------------------

  async updateNotificationSchedule(habitId: string, userId: string): Promise<boolean> {
    return this.scheduleProgressNotifications(habitId, userId);
  }

  async enableProgressNotifications(habitId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await (supabase.from('habit_progress_notifications') as any)
        .upsert({ habit_id: habitId, user_id: userId, enabled: true }, { onConflict: 'habit_id' });

      if (error) {
        console.error('Erro ao habilitar:', error);
        return false;
      }

      return this.scheduleProgressNotifications(habitId, userId);
    } catch (error) {
      console.error('Erro:', error);
      return false;
    }
  }

  async disableProgressNotifications(habitId: string): Promise<boolean> {
    try {
      await this.cancelProgressNotifications(habitId);

      const { error } = await (supabase.from('habit_progress_notifications') as any)
        .update({ enabled: false })
        .eq('habit_id', habitId);

      if (error) {
        console.error('Erro ao desabilitar:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro:', error);
      return false;
    }
  }

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
      if (time) updates[`${period}_time`] = time;

      const { error } = await (supabase.from('habit_progress_notifications') as any)
        .update(updates)
        .eq('habit_id', habitId);

      if (error) {
        console.error('Erro:', error);
        return false;
      }

      return this.scheduleProgressNotifications(habitId, userId);
    } catch (error) {
      console.error('Erro:', error);
      return false;
    }
  }

  async getProgressNotificationSettings(habitId: string): Promise<ProgressNotification | null> {
    try {
      const { data, error } = await supabase
        .from('habit_progress_notifications')
        .select('*')
        .eq('habit_id', habitId)
        .maybeSingle();

      if (error) {
        console.error('Erro ao buscar:', error);
        return null;
      }

      return data as ProgressNotification | null;
    } catch (error) {
      console.error('Erro:', error);
      return null;
    }
  }

  async createDefaultSettings(habitId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await (supabase.from('habit_progress_notifications') as any)
        .insert({ habit_id: habitId, user_id: userId, enabled: false });

      if (error) {
        console.error('Erro ao criar config:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro:', error);
      return false;
    }
  }

  async debugProgressNotifications(userId: string): Promise<void> {
    try {
      const { data } = await supabase
        .from('habit_progress_notifications')
        .select('*, habits!inner (name)')
        .eq('user_id', userId)
        .eq('enabled', true);

      console.log('Notificacoes ativas:', data?.length || 0);
      data?.forEach((config: any) => {
        console.log('---');
        console.log('Habito:', config.habits.name);
        console.log('Manha:', config.morning_enabled ? config.morning_time : 'Off');
        console.log('Tarde:', config.afternoon_enabled ? config.afternoon_time : 'Off');
        console.log('Noite:', config.evening_enabled ? config.evening_time : 'Off');
      });
    } catch (error) {
      console.error('Erro:', error);
    }
  }
}

export const progressNotificationScheduler = new ProgressNotificationSchedulerService();