// services/progressNotificationScheduler.ts - ADAPTADO PARA NOTIFEE
import { supabase } from './supabase';
import { progressCheckerService } from './progressChecker';
import { Habit, ProgressNotification, NotificationPeriod } from '@/types/database';
import { notificationNotifeeService } from './notificationsNotifee';
import notifee, {
  TriggerType,
  TimestampTrigger,
  RepeatFrequency,
  AndroidImportance,
} from '@notifee/react-native';

/**
 * Service para agendar notificações de progresso usando Notifee
 */
class ProgressNotificationSchedulerService {
  
  /**
   * Agenda todas as notificações de progresso para um hábito
   */
  async scheduleProgressNotifications(habitId: string, userId: string): Promise<boolean> {
    try {
      console.log('📊 Agendando notificações de progresso para:', habitId);

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
        console.log('Notificações de progresso desabilitadas');
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

      // Cancelar notificações antigas
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

      // Salvar IDs no banco
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

      console.log('✅ Notificações de progresso agendadas:', notificationIds);
      return true;
    } catch (error) {
      console.error('❌ Erro ao agendar notificações de progresso:', error);
      return false;
    }
  }

  /**
   * Agenda uma notificação individual para um período
   */
  private async scheduleNotification(
    habit: Habit,
    period: NotificationPeriod,
    time: string
  ): Promise<string | null> {
    try {
      const [hours, minutes] = time.split(':').map(Number);

      console.log(`📊 Agendando notificação de progresso: ${period} às ${time}`);

      // Calcular próxima ocorrência
      const nextOccurrence = this.getNextOccurrence(hours, minutes);

      const trigger: TimestampTrigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: nextOccurrence.getTime(),
        repeatFrequency: RepeatFrequency.DAILY,
      };

      // Criar notificação com Notifee
      const notificationId = await notifee.createTriggerNotification(
        {
          title: '📊 Verificação de Progresso',
          body: `Como está seu progresso em "${habit.name}"?`,
          data: {
            habitId: habit.id,
            habitName: habit.name,
            period,
            type: 'progress_check',
            checkProgress: 'true', // String ao invés de boolean
          },
          android: {
            channelId: 'habits-progress',
            importance: AndroidImportance.DEFAULT,
            sound: 'default',
            pressAction: {
              id: 'default',
            },
          },
        },
        trigger
      );

      console.log(`✅ Notificação de progresso agendada: ${notificationId}`);
      return notificationId;
    } catch (error) {
      console.error('❌ Erro ao agendar notificação de progresso:', error);
      return null;
    }
  }

  /**
   * Calcula próxima ocorrência de um horário
   */
  private getNextOccurrence(hours: number, minutes: number): Date {
    const now = new Date();
    const result = new Date();
    
    result.setHours(hours, minutes, 0, 0);
    
    // Se já passou hoje, ir para amanhã
    if (result <= now) {
      result.setDate(result.getDate() + 1);
    }
    
    return result;
  }

  /**
   * Cancela todas as notificações de progresso de um hábito
   */
  async cancelProgressNotifications(habitId: string): Promise<void> {
    try {
      console.log('🗑️ Cancelando notificações de progresso:', habitId);

      // Buscar IDs salvos
      const { data: config, error } = await supabase
        .from('habit_progress_notifications')
        .select('morning_notification_id, afternoon_notification_id, evening_notification_id')
        .eq('habit_id', habitId)
        .single();

      if (error || !config) {
        console.log('Nenhuma configuração encontrada');
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
          await notifee.cancelNotification(id);
          console.log(`✅ Cancelado: ${id}`);
        } catch (err) {
          console.warn('Erro ao cancelar:', id, err);
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

      console.log('✅ Notificações de progresso canceladas');
    } catch (error) {
      console.error('❌ Erro ao cancelar:', error);
    }
  }

  /**
   * Atualiza o agendamento
   */
  async updateNotificationSchedule(habitId: string, userId: string): Promise<boolean> {
    return await this.scheduleProgressNotifications(habitId, userId);
  }

  /**
   * Habilita notificações de progresso
   */
  async enableProgressNotifications(habitId: string, userId: string): Promise<boolean> {
    try {
      console.log('🔔 Habilitando notificações de progresso:', habitId);

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
        console.error('Erro ao habilitar:', upsertError);
        return false;
      }

      return await this.scheduleProgressNotifications(habitId, userId);
    } catch (error) {
      console.error('❌ Erro:', error);
      return false;
    }
  }

  /**
   * Desabilita notificações de progresso
   */
  async disableProgressNotifications(habitId: string): Promise<boolean> {
    try {
      console.log('🔕 Desabilitando notificações de progresso:', habitId);

      await this.cancelProgressNotifications(habitId);

      const { error } = await (supabase
        .from('habit_progress_notifications') as any)
        .update({ enabled: false })
        .eq('habit_id', habitId);

      if (error) {
        console.error('Erro ao desabilitar:', error);
        return false;
      }

      console.log('✅ Notificações de progresso desabilitadas');
      return true;
    } catch (error) {
      console.error('❌ Erro:', error);
      return false;
    }
  }

  /**
   * Atualiza configurações de um período
   */
  async updatePeriodSettings(
    habitId: string,
    userId: string,
    period: NotificationPeriod,
    enabled: boolean,
    time?: string
  ): Promise<boolean> {
    try {
      console.log(`📝 Atualizando ${period}:`, { enabled, time });

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
        console.error('Erro:', error);
        return false;
      }

      // Re-agendar
      return await this.scheduleProgressNotifications(habitId, userId);
    } catch (error) {
      console.error('❌ Erro:', error);
      return false;
    }
  }

  /**
   * Busca configuração
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
        console.error('Erro ao buscar:', error);
        return null;
      }

      return data as ProgressNotification | null;
    } catch (error) {
      console.error('❌ Erro:', error);
      return null;
    }
  }

  /**
   * Cria configuração padrão
   */
  async createDefaultSettings(habitId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await (supabase
        .from('habit_progress_notifications') as any)
        .insert({
          habit_id: habitId,
          user_id: userId,
          enabled: false,
        });

      if (error) {
        console.error('Erro ao criar config:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Erro:', error);
      return false;
    }
  }

  /**
   * Processa notificação quando dispara
   * (Chamado pelo handler de notificações)
   */
  async processProgressNotification(
    habitId: string,
    period: NotificationPeriod
  ): Promise<void> {
    try {
      console.log('📊 Processando notificação de progresso:', { habitId, period });

      const progress = await progressCheckerService.getTodayProgress(habitId);
      if (!progress) {
        console.log('Não foi possível buscar progresso');
        return;
      }

      if (!progressCheckerService.shouldNotify(progress, period)) {
        console.log('Não precisa notificar');
        return;
      }

      const message = progressCheckerService.getNotificationMessage(progress, period);

      await notifee.displayNotification({
        title: message.title,
        body: message.body,
        data: {
          habitId,
          type: 'progress_alert',
          period,
          percentage: Math.round(progress.percentage),
        },
        android: {
          channelId: 'habits-progress',
          importance:
            message.urgency === 'high'
              ? AndroidImportance.HIGH
              : AndroidImportance.DEFAULT,
          sound: 'default',
        },
      });

      console.log('✅ Notificação de progresso enviada');
    } catch (error) {
      console.error('❌ Erro ao processar:', error);
    }
  }

  /**
   * Debug
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

      console.log('📊 Notificações ativas:', data?.length || 0);
      data?.forEach((config: any) => {
        console.log('\n---');
        console.log('Hábito:', config.habits.name);
        console.log('Manhã:', config.morning_enabled ? config.morning_time : 'Off');
        console.log('Tarde:', config.afternoon_enabled ? config.afternoon_time : 'Off');
        console.log('Noite:', config.evening_enabled ? config.evening_time : 'Off');
      });
    } catch (error) {
      console.error('❌ Erro:', error);
    }
  }
}

export const progressNotificationScheduler = new ProgressNotificationSchedulerService();