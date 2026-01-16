import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configurar como as notificações devem ser exibidas
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true, // CORRIGIDO: propriedade obrigatória
    shouldShowList: true,   // CORRIGIDO: propriedade obrigatória
  }),
});

export interface ScheduledNotification {
  id: string;
  habitId: string;
  time: string; // formato "HH:mm"
  title: string;
  body: string;
}

class NotificationService {
  /**
   * Solicita permissão para enviar notificações
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Permissão de notificação negada');
        return false;
      }

      // Configurar canal de notificação para Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('habits', {
          name: 'Lembretes de Hábitos',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#3b82f6',
        });
      }

      return true;
    } catch (error) {
      console.error('Erro ao solicitar permissões:', error);
      return false;
    }
  }

  /**
   * Verifica se temos permissão para enviar notificações
   */
  async hasPermission(): Promise<boolean> {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  }

  /**
   * Agenda uma notificação recorrente diária
   */
  async scheduleDailyReminder(
    habitId: string,
    habitName: string,
    time: string, // formato "HH:mm"
    reminderId: string
  ): Promise<string | null> {
    try {
      const hasPermission = await this.hasPermission();
      if (!hasPermission) {
        console.log('Sem permissão para agendar notificações');
        return null;
      }

      const [hours, minutes] = time.split(':').map(Number);

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ Hora do seu hábito!',
          body: `Não esqueça: ${habitName}`,
          data: { 
            habitId, 
            reminderId,
            type: 'habit_reminder' 
          },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR, // CORRIGIDO
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
   * Cancela uma notificação específica
   */
  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('Erro ao cancelar notificação:', error);
    }
  }

  /**
   * Cancela todas as notificações de um hábito específico
   */
  async cancelHabitNotifications(habitId: string): Promise<void> {
    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      
      const habitNotifications = scheduledNotifications.filter(
        (notification) => notification.content.data?.habitId === habitId
      );

      for (const notification of habitNotifications) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    } catch (error) {
      console.error('Erro ao cancelar notificações do hábito:', error);
    }
  }

  /**
   * Lista todas as notificações agendadas
   */
  async getAllScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Erro ao listar notificações:', error);
      return [];
    }
  }

  /**
   * Agenda uma notificação de teste (5 segundos)
   */
  async scheduleTestNotification(habitName: string): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🧪 Teste de Notificação',
          body: `Lembrete: ${habitName}`,
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 5,
        },
      });
    } catch (error) {
      console.error('Erro ao agendar notificação de teste:', error);
    }
  }
}

export const notificationService = new NotificationService();