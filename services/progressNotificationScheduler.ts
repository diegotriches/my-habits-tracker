// services/progressNotificationScheduler.ts
import * as Notifications from 'expo-notifications';
import { supabase } from './supabase';
import { progressCheckerService } from './progressChecker';
import { endOfDay, startOfDay } from 'date-fns';
import { Habit, ProgressNotification, NotificationPeriod } from '@/types/database';
import { countsAsDone, ProgressPeriodTime, progressWindowDates } from '@/utils/reminderSchedule';

/** Quantos dias à frente as notificações de progresso ficam agendadas. */
export const PROGRESS_WINDOW_DAYS = 7;

/** O que a janela precisa da configuração (cabe no plano salvo no aparelho). */
export type ProgressPeriodsConfig = Pick<
  ProgressNotification,
  | 'enabled'
  | 'morning_enabled'
  | 'morning_time'
  | 'afternoon_enabled'
  | 'afternoon_time'
  | 'evening_enabled'
  | 'evening_time'
>;

function progressPeriods(config: ProgressPeriodsConfig): ProgressPeriodTime[] {
  const periods: ProgressPeriodTime[] = [];
  if (config.morning_enabled) periods.push({ period: 'morning', time: config.morning_time });
  if (config.afternoon_enabled) periods.push({ period: 'afternoon', time: config.afternoon_time });
  if (config.evening_enabled) periods.push({ period: 'evening', time: config.evening_time });
  return periods;
}

class ProgressNotificationSchedulerService {
  // ---------------------------------------------------------------------------
  // Agendar as notificações de progresso de um hábito
  // ---------------------------------------------------------------------------
  //
  // Agendadas uma a uma para os próximos PROGRESS_WINDOW_DAYS dias (não como
  // repetição diária), para poder pular o dia em que a meta já foi atingida.
  // A janela é renovada a cada abertura do app, pela ressincronização
  // (reminderSyncService) — sem abrir o app por uma semana, elas param.

  /**
   * Busca a configuração e o hábito e reagenda. `doneToday` omitido: consulta
   * a conclusão de hoje no banco (sem conexão, considera não feito).
   */
  async scheduleProgressNotifications(
    habitId: string,
    _userId: string,
    doneToday?: boolean
  ): Promise<boolean> {
    try {
      const { data: config, error: configError } = await supabase
        .from('habit_progress_notifications')
        .select('*')
        .eq('habit_id', habitId)
        .single();

      if (configError || !config) {
        console.error('Configuracao nao encontrada:', configError);
        return false;
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

      const done = doneToday ?? (await this.fetchDoneToday(habit));
      await this.scheduleWindow(habit, config, done);
      return true;
    } catch (error) {
      console.error('Erro ao agendar notificacoes de progresso:', error);
      return false;
    }
  }

  /**
   * Reagenda a janela a partir de dados já carregados (sem banco) — usado pela
   * ressincronização e ao marcar/desmarcar hoje, inclusive offline.
   */
  async scheduleWindow(
    habit: Pick<Habit, 'id' | 'name' | 'is_active' | 'archived_at'>,
    config: ProgressPeriodsConfig,
    doneToday: boolean
  ): Promise<number> {
    await this.cancelProgressNotifications(habit.id);
    // Arquivado/excluído/desligado não recebe notificações.
    if (!config.enabled || !habit.is_active || habit.archived_at) return 0;

    const periods = progressPeriods(config);
    let scheduled = 0;
    for (const { period, date } of progressWindowDates(
      periods,
      new Date(),
      doneToday,
      PROGRESS_WINDOW_DAYS
    )) {
      try {
        await Notifications.scheduleNotificationAsync({
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
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
        });
        scheduled++;
      } catch (error) {
        console.error('Erro ao agendar notificacao de progresso:', error);
      }
    }
    console.log(`Notificacoes de progresso agendadas (${habit.name}): ${scheduled}`);
    return scheduled;
  }

  /** Se a meta de hoje já foi atingida (consulta o banco; erro = não). */
  private async fetchDoneToday(habit: Habit): Promise<boolean> {
    const now = new Date();
    const { data, error } = await supabase
      .from('completions')
      .select('value_achieved')
      .eq('habit_id', habit.id)
      .gte('completed_at', startOfDay(now).toISOString())
      .lte('completed_at', endOfDay(now).toISOString())
      .limit(1);
    if (error || !data || data.length === 0) return false;
    return countsAsDone(habit, data[0].value_achieved);
  }

  // ---------------------------------------------------------------------------
  // Cancelar notificações de progresso de um hábito
  // ---------------------------------------------------------------------------
  /**
   * Cancela pelo que está agendado no aparelho (todas as da janela), e não
   * pelos ids salvos no banco — que guardavam só uma por período e deixavam
   * restos para trás.
   */
  async cancelProgressNotifications(habitId: string): Promise<void> {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      for (const n of scheduled) {
        const data = n.content.data as Record<string, unknown> | undefined;
        if (data?.habitId !== habitId || data?.type !== 'progress_check') continue;
        try {
          await Notifications.cancelScheduledNotificationAsync(n.identifier);
        } catch (err) {
          console.warn('Erro ao cancelar:', n.identifier, err);
        }
      }
    } catch (error) {
      console.error('Erro ao cancelar notificacoes de progresso:', error);
    }
  }

  // ---------------------------------------------------------------------------
  // Processar notificação quando dispara (chamado pelo NotificationHandler)
  // ---------------------------------------------------------------------------
  async processProgressNotification(habitId: string, period: NotificationPeriod): Promise<void> {
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
          priority:
            message.urgency === 'high'
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
      const { error } = await supabase
        .from('habit_progress_notifications')
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

      const { error } = await supabase
        .from('habit_progress_notifications')
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

      const { error } = await supabase
        .from('habit_progress_notifications')
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
      const { error } = await supabase
        .from('habit_progress_notifications')
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
