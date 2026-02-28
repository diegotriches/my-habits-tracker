// services/notificationsNotifee.ts - VERSÃO FINAL CORRIGIDA
import notifee, {
  AndroidImportance,
  TriggerType,
  TimestampTrigger,
  EventType,
  AuthorizationStatus,
  AndroidStyle,
} from '@notifee/react-native';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { startOfDay, endOfDay } from 'date-fns';
import { exactAlarmService } from './exactAlarmService';

export type NotificationSound = 'default' | 'water' | 'bell' | 'chime' | 'silence';

class NotificationNotifeeService {
  private navigationCallback: ((habitId: string) => void) | null = null;
  private isInitialized = false;

  constructor() {
    console.log('Constructor Notifee executado');
  }

  async initialize(navigationCallback: (habitId: string) => void): Promise<void> {
    if (this.isInitialized) {
      console.log('Notifee já inicializado');
      return;
    }

    console.log('Inicializando Notifee...');
    this.navigationCallback = navigationCallback;

    await this.createChannels();
    this.isInitialized = true;
    console.log('Notifee inicializado');
  }

  private async createChannels(): Promise<void> {
    if (Platform.OS !== 'android') return;

    try {
      await notifee.createChannel({
        id: 'habits',
        name: 'Lembretes de Hábitos',
        importance: AndroidImportance.HIGH,
        sound: 'default',
        vibration: true,
        lights: true,
        lightColor: '#3B82F6',
        badge: true,
      });

      await notifee.createChannel({
        id: 'habits-progress',
        name: 'Atualizações de Progresso',
        importance: AndroidImportance.DEFAULT,
        sound: 'default',
      });

      console.log('Canais criados');
    } catch (error) {
      console.error('Erro ao criar canais:', error);
    }
  }

  async requestPermissions(): Promise<boolean> {
    try {
      const settings = await notifee.requestPermission();
      const granted = settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED;

      if (granted) {
        console.log('Permissões de notificação concedidas');
        if (Platform.OS === 'android' && Platform.Version >= 31) {
          try {
            console.log('Verificando permissão de alarmes exatos...');
          } catch (alarmError) {
            console.warn('Erro ao abrir configurações de alarmes:', alarmError);
          }
        }
      } else {
        console.log('Permissões negadas');
      }

      return granted;
    } catch (error) {
      console.error('Erro permissões:', error);
      return false;
    }
  }

  async hasPermission(): Promise<boolean> {
    const settings = await notifee.getNotificationSettings();
    return settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED;
  }

  async scheduleWeeklyReminder(
    habitId: string,
    habitName: string,
    time: string,
    daysOfWeek: number[],
    reminderId: string,
    sound: NotificationSound = 'default'
  ): Promise<string[]> {
    try {
      const hasPermission = await this.hasPermission();
      if (!hasPermission) {
        console.log('Sem permissão');
        return [];
      }

      console.log('Usando ExactAlarmService (AlarmManager nativo)');

      const alarmIds = await exactAlarmService.scheduleWeeklyReminders(
        habitId,
        habitName,
        time,
        daysOfWeek,
        reminderId
      );

      console.log(`${alarmIds.length} alarmes agendados via AlarmManager`);
      return alarmIds;

    } catch (error) {
      console.error('Erro ao agendar:', error);
      return [];
    }
  }

  private getNextOccurrence(dayOfWeek: number, hours: number, minutes: number): Date {
    const now = new Date();
    const result = new Date();

    result.setHours(hours, minutes, 0, 0);

    const currentDay = result.getDay();
    let daysUntil = dayOfWeek - currentDay;

    const minBuffer = 2 * 60 * 1000;
    const diffMs = result.getTime() - now.getTime();

    if (daysUntil < 0) {
      daysUntil += 7;
    } else if (daysUntil === 0 && diffMs < minBuffer) {
      daysUntil += 7;
      console.log('Horário muito próximo! Pulando para próxima semana');
    }

    result.setDate(result.getDate() + daysUntil);

    const finalDiffMs = result.getTime() - now.getTime();
    const finalDiffMinutes = Math.floor(finalDiffMs / 60000);

    console.log('getNextOccurrence:', {
      dayOfWeek,
      currentDay,
      time: `${hours}:${minutes}`,
      daysUntil,
      now: now.toLocaleString(),
      scheduled: result.toLocaleString(),
      diffMinutes: `${finalDiffMinutes} minutos (${Math.floor(finalDiffMinutes / 1440)} dias)`,
    });

    return result;
  }

  async scheduleDailyReminder(
    habitId: string,
    habitName: string,
    time: string,
    reminderId: string,
    sound: NotificationSound = 'default',
    checkCompletion: boolean = true
  ): Promise<string | null> {
    const ids = await this.scheduleWeeklyReminder(
      habitId,
      habitName,
      time,
      [0, 1, 2, 3, 4, 5, 6],
      reminderId,
      sound
    );
    return ids.length > 0 ? ids[0] : null;
  }

  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await notifee.cancelNotification(notificationId);
      console.log(`Cancelado: ${notificationId}`);
    } catch (error) {
      console.warn('Erro ao cancelar:', error);
    }
  }

  async cancelNotifications(notificationIds: string[]): Promise<void> {
    for (const id of notificationIds) {
      await this.cancelNotification(id);
    }
  }

  async cancelHabitNotifications(habitId: string): Promise<void> {
    try {
      const notifications = await notifee.getTriggerNotifications();
      const ids = notifications
        .filter(n => n.notification.data?.habitId === habitId)
        .map(n => n.notification.id as string);

      for (const id of ids) {
        await notifee.cancelNotification(id);
      }

      if (ids.length > 0) {
        console.log(`Canceladas ${ids.length} notificações`);
      }
    } catch (error) {
      console.warn('Erro:', error);
    }
  }

  async handleSnooze(habitId: string, habitName: string): Promise<void> {
    try {
      console.log('Snooze:', habitName);

      const trigger: TimestampTrigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: Date.now() + 10 * 60 * 1000,
      };

      await notifee.createTriggerNotification(
        {
          title: 'Lembrete adiado',
          body: `${habitName} — Hora de fazer agora!`,
          data: { habitId, habitName, type: 'snooze_reminder' },
          android: {
            channelId: 'habits',
            importance: AndroidImportance.HIGH,
            sound: 'default',
            pressAction: { id: 'default' },
          },
        },
        trigger
      );

      await notifee.displayNotification({
        title: 'Adiado',
        body: 'Lembrarei em 10 minutos',
        android: {
          channelId: 'habits-progress',
          importance: AndroidImportance.LOW,
          autoCancel: true,
        },
      });

      console.log('Snooze OK');
    } catch (error) {
      console.error('Erro snooze:', error);
    }
  }

  async handleQuickComplete(habitId: string): Promise<void> {
    try {
      console.log('Quick complete:', habitId);

      const { data: habitData, error } = await supabase
        .from('habits')
        .select('id, name, has_target, points_base, user_id')
        .eq('id', habitId)
        .single();

      if (error || !habitData) {
        console.warn('Hábito não encontrado');
        return;
      }

      const habit = habitData as any;

      if (habit.has_target) {
        await notifee.displayNotification({
          title: 'Meta numérica',
          body: `Abra o app para registrar "${habit.name}"`,
          android: {
            channelId: 'habits-progress',
            importance: AndroidImportance.HIGH,
          },
        });
        return;
      }

      const today = new Date();
      const { data: existing } = await supabase
        .from('completions')
        .select('id')
        .eq('habit_id', habitId)
        .gte('completed_at', startOfDay(today).toISOString())
        .lte('completed_at', endOfDay(today).toISOString())
        .maybeSingle();

      if (existing) {
        await notifee.displayNotification({
          title: 'Já completado',
          body: 'Você já fez isso hoje.',
          android: {
            channelId: 'habits-progress',
            importance: AndroidImportance.LOW,
          },
        });
        return;
      }

      await (supabase.from('completions') as any).insert({
        habit_id: habitId,
        completed_at: new Date().toISOString(),
        points_earned: habit.points_base,
        was_synced: true,
      });

      await (supabase.rpc as any)('increment_points', {
        user_id_param: habit.user_id,
        points_param: habit.points_base,
      });

      await notifee.displayNotification({
        title: 'Completado!',
        body: `+${habit.points_base} pontos`,
        android: {
          channelId: 'habits-progress',
          importance: AndroidImportance.HIGH,
          sound: 'default',
        },
      });

      console.log('Complete OK');
    } catch (error) {
      console.error('Erro complete:', error);
    }
  }

  async testNotificationWithActions(): Promise<void> {
    try {
      console.log('TESTE: Notificação em 3 segundos...');

      const trigger: TimestampTrigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: Date.now() + 3000,
      };

      await notifee.createTriggerNotification(
        {
          title: 'Teste de botões',
          body: 'Expanda para ver os botões',
          data: {
            habitId: 'test-123',
            habitName: 'Teste',
            type: 'test',
          },
          android: {
            channelId: 'habits',
            importance: AndroidImportance.HIGH,

            actions: [
              {
                title: 'Adiar',
                pressAction: { id: 'snooze' },
              },
              {
                title: 'Feito',
                pressAction: { id: 'complete' },
              },
            ],

            style: {
              type: AndroidStyle.BIGTEXT,
              text: 'Teste — Expanda a notificação para ver 2 botões: Adiar e Feito',
            },

            autoCancel: false,
            showTimestamp: true,
            pressAction: { id: 'default' },
          },
        },
        trigger
      );

      console.log('Teste agendado');
    } catch (error) {
      console.error('Erro teste:', error);
    }
  }

  async getAllScheduledNotifications(): Promise<any[]> {
    try {
      const notifications = await notifee.getTriggerNotifications();
      console.log(`${notifications.length} agendadas`);
      return notifications;
    } catch (error) {
      console.error('Erro listar:', error);
      return [];
    }
  }

  async cancelAllNotifications(): Promise<void> {
    try {
      await notifee.cancelAllNotifications();
      console.log('Todas canceladas');
    } catch (error) {
      console.error('Erro cancelar:', error);
    }
  }

  async setupNotificationHandlers(cb: (habitId: string) => void): Promise<void> {
    await this.initialize(cb);
  }
  async checkIfCompletedToday(habitId: string): Promise<boolean> {
    const today = new Date();
    const { data } = await supabase
      .from('completions')
      .select('id')
      .eq('habit_id', habitId)
      .gte('completed_at', startOfDay(today).toISOString())
      .lte('completed_at', endOfDay(today).toISOString())
      .maybeSingle();
    return !!data;
  }
  async getHabitData(habitId: string): Promise<any | null> {
    const { data } = await supabase
      .from('habits')
      .select('*')
      .eq('id', habitId)
      .single();
    return data || null;
  }
  async scheduleTestNotification(): Promise<void> {
    await this.testNotificationWithActions();
  }
  async testAllNotificationMethods(): Promise<void> {
    await this.testNotificationWithActions();
  }
  async debugChannel(): Promise<void> {
    console.log('Veja configurações do Android');
  }
  async debugScheduledNotifications(): Promise<void> {
    const n = await this.getAllScheduledNotifications();
    n.forEach((not, i) => console.log(`${i + 1}. ${not.notification.title}`));
  }
}

export const notificationNotifeeService = new NotificationNotifeeService();