// services/notifications.ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { exactAlarmService } from './exactAlarmService';
import { startOfDay, endOfDay } from 'date-fns';

// Configurar handler padrão
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export type NotificationSound = 'default' | 'water' | 'bell' | 'chime' | 'silence';

class NotificationService {

  // ---------------------------------------------------------------------------
  // Permissões e canais
  // ---------------------------------------------------------------------------

  async requestPermissions(): Promise<boolean> {
    try {
      const { status: existing } = await Notifications.getPermissionsAsync();
      let finalStatus = existing;

      if (existing !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Permissao negada');
        return false;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('habits', {
          name: 'Lembretes de Habitos',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#3b82f6',
          sound: 'default',
          enableVibrate: true,
          enableLights: true,
          showBadge: true,
        });

        await Notifications.setNotificationChannelAsync('habits-progress', {
          name: 'Atualizacoes de Progresso',
          importance: Notifications.AndroidImportance.DEFAULT,
          sound: 'default',
        });
      }

      console.log('Permissoes concedidas');
      return true;
    } catch (error) {
      console.error('Erro ao solicitar permissoes:', error);
      return false;
    }
  }

  async hasPermission(): Promise<boolean> {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  }

  // ---------------------------------------------------------------------------
  // Agendamento de lembretes
  // ---------------------------------------------------------------------------

  /**
   * Agenda lembretes semanais.
   * Android: usa ExactAlarmService (AlarmManager nativo) para horário preciso.
   * iOS: usa expo-notifications com trigger CALENDAR.
   */
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
      if (!hasPermission) return [];

      if (Platform.OS === 'android') {
        return await exactAlarmService.scheduleWeeklyReminders(
          habitId,
          habitName,
          time,
          daysOfWeek,
          reminderId
        );
      }

      // iOS: expo-notifications com trigger semanal
      const [hours, minutes] = time.split(':').map(Number);
      const ids: string[] = [];

      for (const dayOfWeek of daysOfWeek) {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Hora do seu habito!',
            body: habitName,
            data: { habitId, habitName, reminderId, dayOfWeek, time, type: 'habit_reminder' },
            sound: this.getSoundFile(sound),
            categoryIdentifier: 'habit-reminder',
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
            weekday: dayOfWeek + 1,
            hour: hours,
            minute: minutes,
            repeats: true,
          },
        });
        ids.push(id);
      }

      return ids;
    } catch (error) {
      console.error('Erro ao agendar lembrete semanal:', error);
      return [];
    }
  }

  async scheduleDailyReminder(
    habitId: string,
    habitName: string,
    time: string,
    reminderId: string,
    sound: NotificationSound = 'default'
  ): Promise<string | null> {
    const ids = await this.scheduleWeeklyReminder(
      habitId, habitName, time,
      [0, 1, 2, 3, 4, 5, 6],
      reminderId, sound
    );
    return ids.length > 0 ? ids[0] : null;
  }

  // ---------------------------------------------------------------------------
  // Cancelamento
  // ---------------------------------------------------------------------------

  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.warn('Erro ao cancelar notificacao:', error);
    }
  }

  async cancelNotifications(notificationIds: string[]): Promise<void> {
    await Promise.all(notificationIds.map((id) => this.cancelNotification(id)));
  }

  async cancelHabitNotifications(habitId: string): Promise<void> {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const toCancel = scheduled.filter((n) => n.content.data?.habitId === habitId);
      for (const n of toCancel) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    } catch (error) {
      console.warn('Erro ao cancelar notificacoes do habito:', error);
    }
  }

  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  // ---------------------------------------------------------------------------
  // Ações das notificações
  // ---------------------------------------------------------------------------

  async handleSnooze(habitId: string, habitName: string): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Lembrete adiado',
          body: `${habitName} - Hora de fazer agora!`,
          data: { habitId, habitName, type: 'snooze_reminder' },
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 10 * 60,
        },
      });
      console.log('Snooze agendado para 10 minutos');
    } catch (error) {
      console.error('Erro ao agendar snooze:', error);
    }
  }

  async handleQuickComplete(habitId: string): Promise<void> {
    try {
      const habit = await this.getHabitData(habitId);

      if (!habit) {
        console.warn('Habito nao encontrado:', habitId);
        return;
      }

      if (habit.has_target) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Meta Numerica',
            body: `Abra o app para registrar "${habit.name}"`,
            data: { habitId, type: 'open_app_required' },
          },
          trigger: null,
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
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Ja completado!',
            body: 'Voce ja completou este habito hoje.',
            sound: 'default',
          },
          trigger: null,
        });
        return;
      }

      const { error: insertError } = await (supabase.from('completions') as any).insert({
        habit_id: habitId,
        completed_at: new Date().toISOString(),
        was_synced: true,
      });

      if (insertError) throw insertError;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Concluido!',
          body: `${habit.name} registrado com sucesso`,
          sound: 'default',
        },
        trigger: null,
      });

      console.log('Habito concluido:', habit.name);
    } catch (error) {
      console.error('Erro ao completar habito:', error);
    }
  }

  // ---------------------------------------------------------------------------
  // Configuração de categorias iOS
  // ---------------------------------------------------------------------------

  async setupNotificationHandlers(navigationCallback: (habitId: string) => void): Promise<void> {
    if (Platform.OS === 'ios') {
      await Notifications.setNotificationCategoryAsync('habit-reminder', [
        {
          identifier: 'snooze',
          buttonTitle: 'Adiar 10min',
          options: { opensAppToForeground: false },
        },
        {
          identifier: 'complete',
          buttonTitle: 'Marcar como feito',
          options: { opensAppToForeground: false },
        },
      ]);
    }
  }

  // ---------------------------------------------------------------------------
  // Utilitários
  // ---------------------------------------------------------------------------

  async getAllScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Erro ao listar notificacoes:', error);
      return [];
    }
  }

  async debugScheduledNotifications(): Promise<void> {
    const notifications = await this.getAllScheduledNotifications();
    console.log('Notificacoes agendadas:', notifications.length);
    notifications.forEach((n, i) => {
      console.log(`${i + 1}. ${n.content.title} | ${n.identifier}`);
    });
  }

  async scheduleTestNotification(habitName: string = 'Teste'): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Teste de Notificacao',
        body: `Lembrete: ${habitName}`,
        sound: true,
        categoryIdentifier: Platform.OS === 'ios' ? 'habit-reminder' : undefined,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 5,
      },
    });
  }

  // Mantido para compatibilidade com app/debug/notifications.tsx
  async testNotificationWithActions(): Promise<void> {
    await this.scheduleTestNotification();
  }

  // Mantido para compatibilidade
  async initialize(_navigationCallback: (habitId: string) => void): Promise<void> {
    await this.requestPermissions();
  }

  private async getHabitData(habitId: string): Promise<{
    id: string;
    name: string;
    has_target: boolean;
    user_id: string;
  } | null> {
    try {
      const { data, error } = await supabase
        .from('habits')
        .select('id, name, has_target, user_id')
        .eq('id', habitId)
        .single();
      if (error) throw error;
      return data as any;
    } catch (error) {
      console.error('Erro ao buscar habito:', error);
      return null;
    }
  }

  private getSoundFile(sound: NotificationSound): string | boolean | undefined {
    switch (sound) {
      case 'default': return true;
      case 'silence': return false;
      case 'water':   return 'water_drop.wav';
      case 'bell':    return 'bell.wav';
      case 'chime':   return 'chime.wav';
      default:        return true;
    }
  }
}

export const notificationService = new NotificationService();