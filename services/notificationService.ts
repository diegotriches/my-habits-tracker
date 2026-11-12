// services/notificationService.ts
//
// Serviço de notificações do app: permissões e canais (expo-notifications),
// agendamento dos lembretes (no Android, pelos alarmes nativos do
// exactAlarmService) e as ações das notificações. Cancele sempre por aqui:
// o expo-notifications sozinho não enxerga os alarmes nativos.
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { exactAlarmService } from './exactAlarmService';
import { completeHabitFromNotification } from './pendingCompletionService';
import { streakService } from './streakService';
import { Habit } from '@/types/database';

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

/**
 * Canais de lembrete, um por som: no Android 8+ o som pertence ao canal (e
 * não muda depois de criado). Os ids e sons precisam bater com
 * AlarmReceiver.ensureChannel (Java), que cria o mesmo canal se o JS ainda
 * não o tiver criado.
 */
const REMINDER_CHANNELS: Record<
  NotificationSound,
  { id: string; name: string; sound: string | null }
> = {
  default: { id: 'habits', name: 'Lembretes de Habitos', sound: 'default' },
  water: { id: 'habits-water', name: "Lembretes (Gota d'água)", sound: 'water_drop.wav' },
  bell: { id: 'habits-bell', name: 'Lembretes (Sino)', sound: 'bell.wav' },
  chime: { id: 'habits-chime', name: 'Lembretes (Carrilhão)', sound: 'chime.wav' },
  silence: { id: 'habits-silent', name: 'Lembretes (Silencioso)', sound: null },
};

export function getReminderChannelId(sound: NotificationSound): string {
  return (REMINDER_CHANNELS[sound] ?? REMINDER_CHANNELS.default).id;
}

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
        for (const channel of Object.values(REMINDER_CHANNELS)) {
          await Notifications.setNotificationChannelAsync(channel.id, {
            name: channel.name,
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#3b82f6',
            sound: channel.sound,
            enableVibrate: true,
            enableLights: true,
            showBadge: true,
          });
        }

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
   *
   * `options.hasTarget`: se o hábito tem meta numérica (a notificação mostra
   * "Registrar" em vez de "Feito"). Quando omitido, é lido do banco.
   */
  async scheduleWeeklyReminder(
    habitId: string,
    habitName: string,
    time: string,
    daysOfWeek: number[],
    reminderId: string,
    sound: NotificationSound = 'default',
    options: { hasTarget?: boolean; minLeadMs?: number } = {}
  ): Promise<string[]> {
    try {
      const hasPermission = await this.hasPermission();
      if (!hasPermission) return [];

      if (Platform.OS === 'android') {
        const hasTarget = options.hasTarget ?? (await this.fetchHasTarget(habitId));
        return await exactAlarmService.scheduleWeeklyReminders(
          habitId,
          habitName,
          time,
          daysOfWeek,
          reminderId,
          { sound, hasTarget, minLeadMs: options.minLeadMs }
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
      habitId,
      habitName,
      time,
      [0, 1, 2, 3, 4, 5, 6],
      reminderId,
      sound
    );
    return ids.length > 0 ? ids[0] : null;
  }

  // ---------------------------------------------------------------------------
  // Cancelamento
  // ---------------------------------------------------------------------------

  /**
   * Cancela um lembrete pelo id salvo em `reminders.notification_ids`.
   * No Android esses ids são de alarmes nativos (AlarmManager), não do
   * expo-notifications, então o alarme também é cancelado. Cancelar um id
   * inexistente em qualquer um dos dois é inofensivo.
   */
  async cancelNotification(notificationId: string): Promise<void> {
    if (Platform.OS === 'android') {
      await exactAlarmService.cancelAlarm(notificationId);
    }
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
    await exactAlarmService.cancelHabitAlarms(habitId);
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
    await exactAlarmService.cancelAllAlarms();
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

  /**
   * Ação "Marcar como feito" da notificação do expo-notifications (iOS). No
   * Android o botão "Feito" é nativo e passa pela fila local
   * (services/pendingCompletionService.ts).
   */
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

      const result = await completeHabitFromNotification(habitId, new Date());

      if (result === 'skipped') {
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

      if (result === 'retry') throw new Error('Falha ao registrar conclusao');

      await streakService.recalculateStreak(habitId);

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

  private async fetchHasTarget(habitId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('habits')
      .select('has_target')
      .eq('id', habitId)
      .maybeSingle();
    if (error) console.warn('Erro ao ler meta do habito:', error);
    return !!(data as Pick<Habit, 'has_target'> | null)?.has_target;
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
      return data;
    } catch (error) {
      console.error('Erro ao buscar habito:', error);
      return null;
    }
  }

  private getSoundFile(sound: NotificationSound): string | boolean | undefined {
    switch (sound) {
      case 'default':
        return true;
      case 'silence':
        return false;
      case 'water':
        return 'water_drop.wav';
      case 'bell':
        return 'bell.wav';
      case 'chime':
        return 'chime.wav';
      default:
        return true;
    }
  }
}

export const notificationService = new NotificationService();
