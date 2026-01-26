// services/notificationsNotifee.mock.ts
// Mock COMPLETO do Notifee para testar no Expo Go

import { Alert } from 'react-native';
import * as Notifications from 'expo-notifications';

export type NotificationSound = 'default' | 'water' | 'bell' | 'chime' | 'silence';

/**
 * Mock do Notifee que usa Expo Notifications como fallback
 * Implementa TODOS os métodos da classe original
 */
class NotificationNotifeeServiceMock {
  private navigationCallback: ((habitId: string) => void) | null = null;

  // ========== MÉTODOS PRINCIPAIS ==========

  async initialize(navigationCallback: (habitId: string) => void): Promise<void> {
    this.navigationCallback = navigationCallback;
    console.log('🔔 Mock Notifee initialized (Expo Notifications fallback)');
    
    // Configurar listener do Expo Notifications
    Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.habitId) {
        this.navigationCallback?.(data.habitId as string);
      }
    });
  }

  async requestPermissions(): Promise<boolean> {
    console.log('🔔 Mock: Solicitando permissões via Expo');
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  }

  async hasPermission(): Promise<boolean> {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  }

  async scheduleWeeklyReminder(
    habitId: string,
    habitName: string,
    time: string,
    daysOfWeek: number[],
    reminderId: string,
    sound: NotificationSound = 'default'
  ): Promise<string[]> {
    console.log('🔔 Mock: Agendando lembrete (sem botões)', {
      habitName,
      time,
      daysOfWeek,
    });

    const [hours, minutes] = time.split(':').map(Number);
    const notificationIds: string[] = [];

    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ Hora do seu hábito!',
          body: `${habitName} (Mock - Expo Go)`,
          data: {
            habitId,
            habitName,
            reminderId,
            type: 'habit_reminder_mock',
          },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: hours,
          minute: minutes,
        },
      });

      notificationIds.push(id);
      console.log('✅ Mock: Notificação agendada:', id);
    } catch (error) {
      console.error('❌ Mock: Erro ao agendar:', error);
    }

    return notificationIds;
  }

  async cancelNotification(notificationId: string): Promise<void> {
    console.log('🔔 Mock: Cancelando:', notificationId);
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  async cancelNotifications(notificationIds: string[]): Promise<void> {
    console.log('🔔 Mock: Cancelando múltiplas:', notificationIds.length);
    for (const id of notificationIds) {
      await Notifications.cancelScheduledNotificationAsync(id);
    }
  }

  async cancelHabitNotifications(habitId: string): Promise<void> {
    console.log('🔔 Mock: Cancelando notificações do hábito:', habitId);
    const all = await Notifications.getAllScheduledNotificationsAsync();
    const toCancel = all.filter((n) => n.content.data?.habitId === habitId);
    
    for (const n of toCancel) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }

  async handleSnooze(habitId: string, habitName: string): Promise<void> {
    console.log('🔔 Mock: Snooze -', habitName);
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏰ Adiado por 10 minutos',
        body: habitName,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 10 * 60,
      },
    });
  }

  async handleQuickComplete(habitId: string): Promise<void> {
    console.log('🔔 Mock: Quick complete -', habitId);
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '✅ Hábito completado!',
        body: 'Mock - Complete via app',
      },
      trigger: null,
    });
  }

  async testNotificationWithActions(): Promise<void> {
    console.log('🔔 Mock: Teste de ações');
    
    Alert.alert(
      '🧪 Teste de Botões (Mock)',
      'Você está no Expo Go!\n\n' +
      '❌ Botões NÃO funcionam no Expo Go\n' +
      '✅ Faça build standalone para testar\n\n' +
      'Enviando notificação simples...',
      [{ text: 'OK' }]
    );

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🧪 Teste (Mock)',
        body: 'Notificação SEM botões (Expo Go)',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 3,
      },
    });
  }

  async getAllScheduledNotifications(): Promise<any[]> {
    console.log('🔔 Mock: Listando notificações');
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    return notifications.map((n) => ({
      notification: {
        title: n.content.title,
        data: n.content.data,
      },
    }));
  }

  async cancelAllNotifications(): Promise<void> {
    console.log('🔔 Mock: Cancelando todas');
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  // ========== MÉTODOS ADICIONAIS DO NOTIFICATION SERVICE ==========

  async setupNotificationHandlers(navigationCallback: (habitId: string) => void): Promise<void> {
    console.log('🔔 Mock: Setup handlers');
    this.navigationCallback = navigationCallback;
    
    Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.habitId) {
        this.navigationCallback?.(data.habitId as string);
      }
    });
  }

  async checkIfCompletedToday(habitId: string): Promise<boolean> {
    console.log('🔔 Mock: Check completed -', habitId);
    return false;
  }

  async getHabitData(habitId: string): Promise<any | null> {
    console.log('🔔 Mock: Get habit data -', habitId);
    return null;
  }

  async scheduleDailyReminder(
    habitId: string,
    habitName: string,
    time: string,
    reminderId: string,
    sound: NotificationSound = 'default',
    checkCompletion: boolean = true
  ): Promise<string | null> {
    console.log('🔔 Mock: Schedule daily -', habitName);
    
    const [hours, minutes] = time.split(':').map(Number);

    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ Hora do seu hábito!',
          body: habitName,
          data: { habitId, habitName, type: 'daily_mock' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: hours,
          minute: minutes,
        },
      });

      return id;
    } catch (error) {
      console.error('❌ Mock: Erro ao agendar diário:', error);
      return null;
    }
  }

  async scheduleTestNotification(habitName: string): Promise<void> {
    console.log('🔔 Mock: Test notification -', habitName);
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🧪 Teste',
        body: habitName,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 5,
      },
    });
  }

  async testAllNotificationMethods(): Promise<void> {
    console.log('🔔 Mock: Test all methods');
    
    Alert.alert(
      '🧪 Teste Completo (Mock)',
      'No Expo Go, apenas notificações simples funcionam.\n\n' +
      'Para testar botões, faça build standalone.',
      [{ text: 'OK' }]
    );

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🧪 Teste Método 1',
        body: 'Mock - Expo Go',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 3,
      },
    });
  }

  async debugChannel(): Promise<void> {
    console.log('🔔 Mock: Debug channel');
    
    Alert.alert(
      '📢 Mock Channel',
      'Expo Go usa canais padrão.\n\n' +
      'Canais customizados só em build standalone.',
      [{ text: 'OK' }]
    );
  }

  async debugScheduledNotifications(): Promise<void> {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    console.log('📋 Mock: Notificações agendadas:', notifications.length);
    
    notifications.forEach((n, index) => {
      console.log(`${index + 1}. ${n.content.title} (${n.identifier})`);
    });
  }

  // ========== MÉTODOS PRIVADOS (público para compatibilidade) ==========

  async setupNotificationCategories(): Promise<void> {
    console.log('🔔 Mock: Setup categories (noop no Expo Go)');
    // No Expo Go, categories não fazem diferença
    // Este método existe apenas para compatibilidade de tipo
  }

  getSoundFile(sound: NotificationSound): string | boolean | undefined {
    console.log('🔔 Mock: Get sound file -', sound);
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

export const notificationNotifeeService = new NotificationNotifeeServiceMock();