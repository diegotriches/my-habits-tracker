// services/notifications.ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { format } from 'date-fns';

// Configurar handler padrão de notificações
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

export interface ScheduledNotification {
  id: string;
  habitId: string;
  reminderId: string;
  dayOfWeek: number;
  time: string;
}

class NotificationService {
  private navigationCallback: ((habitId: string) => void) | null = null;

  /**
   * Configurar listeners de notificações e deep link
   */
  setupNotificationHandlers(navigationCallback: (habitId: string) => void): void {
    this.navigationCallback = navigationCallback;

    // Listener para quando o usuário clica na notificação
    Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      
      if (data?.habitId) {
        // Deep link para a tela do hábito
        this.navigationCallback?.(data.habitId as string);
      }

      // Handler de ações (snooze, complete)
      if (response.actionIdentifier === 'snooze') {
        this.handleSnooze(data?.habitId as string, data?.habitName as string);
      } else if (response.actionIdentifier === 'complete') {
        this.handleQuickComplete(data?.habitId as string);
      }
    });

    // Configurar categorias de notificação com ações
    this.setupNotificationCategories();
  }

  /**
   * Configurar categorias com ações (snooze, complete)
   */
  private async setupNotificationCategories(): Promise<void> {
    try {
      if (Platform.OS === 'ios') {
        await Notifications.setNotificationCategoryAsync('habit-reminder', [
          {
            identifier: 'snooze',
            buttonTitle: '⏰ Adiar 10min',
            options: {
              opensAppToForeground: false,
            },
          },
          {
            identifier: 'complete',
            buttonTitle: '✅ Marcar como feito',
            options: {
              opensAppToForeground: false,
            },
          },
        ]);
      }
      
      // Android usa notification actions inline
    } catch (error) {
      console.warn('Erro ao configurar categorias:', error);
    }
  }

  /**
   * Solicitar permissões de notificação
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
        return false;
      }

      // Configurar canal Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('habits', {
          name: 'Lembretes de Hábitos',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#3b82f6',
          sound: 'default',
          enableVibrate: true,
        });

        // Canal para notificações silenciosas
        await Notifications.setNotificationChannelAsync('habits-silent', {
          name: 'Lembretes Silenciosos',
          importance: Notifications.AndroidImportance.LOW,
          sound: undefined,
          enableVibrate: false,
        });
      }

      return true;
    } catch (error) {
      console.error('Erro ao solicitar permissões:', error);
      return false;
    }
  }

  /**
   * Verificar se tem permissão
   */
  async hasPermission(): Promise<boolean> {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  }

  /**
   * Verificar se o hábito foi completado hoje
   */
  async checkIfCompletedToday(habitId: string): Promise<boolean> {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('completions')
        .select('id')
        .eq('habit_id', habitId)
        .eq('completed_at', today)
        .maybeSingle(); // ← Usar maybeSingle() em vez de single()

      // Se não houve erro e data existe, está completado
      return !error && data !== null;
    } catch {
      return false;
    }
  }

  /**
   * Agendar lembrete semanal (respeitando dias específicos)
   * Retorna array de notification IDs (um por dia da semana)
   */
  async scheduleWeeklyReminder(
    habitId: string,
    habitName: string,
    time: string,
    daysOfWeek: number[], // [0, 1, 2, 3, 4, 5, 6] = dom-sáb
    reminderId: string,
    sound: NotificationSound = 'default',
    checkCompletion: boolean = true
  ): Promise<string[]> {
    try {
      const hasPermission = await this.hasPermission();
      if (!hasPermission) {
        return [];
      }

      const [hours, minutes] = time.split(':').map(Number);
      const notificationIds: string[] = [];

      // Agendar uma notificação para cada dia da semana
      for (const dayOfWeek of daysOfWeek) {
        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: '⏰ Hora do seu hábito!',
            body: `Não esqueça: ${habitName}`,
            data: {
              habitId,
              habitName,
              reminderId,
              dayOfWeek,
              time,
              checkCompletion,
              type: 'habit_reminder',
            },
            sound: this.getSoundFile(sound),
            categoryIdentifier: Platform.OS === 'ios' ? 'habit-reminder' : undefined,
            priority: Notifications.AndroidNotificationPriority.HIGH,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
            weekday: dayOfWeek + 1, // Expo usa 1-7 (dom-sáb), precisamos converter
            hour: hours,
            minute: minutes,
            repeats: true,
          },
        });

        notificationIds.push(notificationId);
      }

      return notificationIds;
    } catch (error) {
      console.error('Erro ao agendar lembrete semanal:', error);
      return [];
    }
  }

  /**
   * Agendar lembrete diário (todos os dias)
   */
  async scheduleDailyReminder(
    habitId: string,
    habitName: string,
    time: string,
    reminderId: string,
    sound: NotificationSound = 'default',
    checkCompletion: boolean = true
  ): Promise<string | null> {
    try {
      const hasPermission = await this.hasPermission();
      if (!hasPermission) {
        return null;
      }

      const [hours, minutes] = time.split(':').map(Number);

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ Hora do seu hábito!',
          body: `Não esqueça: ${habitName}`,
          data: {
            habitId,
            habitName,
            reminderId,
            time,
            checkCompletion,
            type: 'habit_reminder',
          },
          sound: this.getSoundFile(sound),
          categoryIdentifier: Platform.OS === 'ios' ? 'habit-reminder' : undefined,
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
      console.error('Erro ao agendar lembrete diário:', error);
      return null;
    }
  }

  /**
   * Cancelar uma notificação específica
   */
  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.warn('Erro ao cancelar notificação:', error);
    }
  }

  /**
   * Cancelar múltiplas notificações
   */
  async cancelNotifications(notificationIds: string[]): Promise<void> {
    try {
      await Promise.all(
        notificationIds.map((id) =>
          Notifications.cancelScheduledNotificationAsync(id)
        )
      );
    } catch (error) {
      console.warn('Erro ao cancelar notificações:', error);
    }
  }

  /**
   * Cancelar todas as notificações de um hábito
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
      console.warn('Erro ao cancelar notificações do hábito:', error);
    }
  }

  /**
   * Agendar notificação de snooze (10 minutos)
   */
  async handleSnooze(habitId: string, habitName: string): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ Lembrete adiado',
          body: `${habitName} - Hora de fazer agora!`,
          data: {
            habitId,
            habitName,
            type: 'snooze_reminder',
          },
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 10 * 60, // 10 minutos
        },
      });
    } catch (error) {
      console.error('Erro ao agendar snooze:', error);
    }
  }

  /**
   * Marcar hábito como completo rapidamente (via ação de notificação)
   */
  async handleQuickComplete(habitId: string): Promise<void> {
    try {
      // Buscar dados do hábito
      const { data: habit, error: habitError } = await supabase
        .from('habits')
        .select('points_base, user_id')
        .eq('id', habitId)
        .single();

      if (habitError || !habit) {
        console.warn('Hábito não encontrado:', habitError);
        return;
      }

      // Casting para tipo correto
      const habitData = habit as { points_base: number; user_id: string };

      const today = format(new Date(), 'yyyy-MM-dd');

      // Verificar se já foi completado hoje
      const { data: existing, error: checkError } = await supabase
        .from('completions')
        .select('id')
        .eq('habit_id', habitId)
        .eq('completed_at', today)
        .single();

      if (!checkError && existing) {
        // Mostrar feedback que já foi completado
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '✅ Já completado!',
            body: 'Você já completou este hábito hoje.',
            sound: 'default',
          },
          trigger: null, // Imediato
        });
        return;
      }

      // Criar completion (casting explícito)
      const { error: insertError } = await (supabase.from('completions') as any).insert({
        habit_id: habitId,
        completed_at: today,
        points_earned: habitData.points_base,
        was_synced: true,
      });

      if (insertError) {
        console.error('Erro ao criar completion:', insertError);
        return;
      }

      // Atualizar pontos do perfil (casting explícito)
      const { error: rpcError } = await (supabase.rpc as any)('increment_points', {
        user_id_param: habitData.user_id,
        points_param: habitData.points_base,
      });

      if (rpcError) {
        console.warn('Erro ao atualizar pontos:', rpcError);
      }

      // Mostrar feedback de sucesso
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🎉 Hábito completado!',
          body: `+${habitData.points_base} pontos ganhos!`,
          sound: 'default',
        },
        trigger: null, // Imediato
      });
    } catch (error) {
      console.error('Erro ao completar hábito:', error);
    }
  }

  /**
   * Obter arquivo de som baseado no tipo
   */
  private getSoundFile(sound: NotificationSound): string | boolean | undefined {
    switch (sound) {
      case 'default':
        return true; // Som padrão do sistema
      case 'silence':
        return false; // Sem som
      case 'water':
        return 'water_drop.wav'; // Precisa adicionar o arquivo
      case 'bell':
        return 'bell.wav';
      case 'chime':
        return 'chime.wav';
      default:
        return true;
    }
  }

  /**
   * Agendar notificação de teste (dispara em 5 segundos)
   */
  async scheduleTestNotification(habitName: string): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🧪 Teste de Notificação',
          body: `Lembrete: ${habitName}`,
          sound: true,
          categoryIdentifier: Platform.OS === 'ios' ? 'habit-reminder' : undefined,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 5,
        },
      });
    } catch (error) {
      console.error('Erro ao agendar teste:', error);
    }
  }

  /**
   * Listar todas as notificações agendadas (DEBUG)
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
   * Debug: Imprimir todas as notificações agendadas
   */
  async debugScheduledNotifications(): Promise<void> {
    const notifications = await this.getAllScheduledNotifications();
    console.log('📋 Notificações Agendadas:', notifications.length);
    
    notifications.forEach((notification, index) => {
      console.log(`\n${index + 1}. ${notification.content.title}`);
      console.log(`   ID: ${notification.identifier}`);
      console.log(`   Trigger:`, notification.trigger);
      console.log(`   Data:`, notification.content.data);
    });
  }

  /**
   * Cancelar TODAS as notificações (use com cuidado!)
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Erro ao cancelar todas notificações:', error);
    }
  }
}

export const notificationService = new NotificationService();