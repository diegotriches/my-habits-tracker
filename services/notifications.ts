// services/notifications.ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { startOfDay, endOfDay } from 'date-fns';

// 🆕 Interface estendida para suportar android.actions
interface NotificationContentWithActions extends Notifications.NotificationContentInput {
  android?: {
    channelId?: string;
    actions?: Array<{
      identifier: string;
      title: string;
      buttonTitle: string;
      options?: {
        opensAppToForeground?: boolean;
      };
    }>;
  };
}

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
   * 🔧 CORRIGIDO: Configurar categorias com ações (iOS) e Actions (Android)
   */
  private async setupNotificationCategories(): Promise<void> {
    try {
      if (Platform.OS === 'ios') {
        // iOS: Usa categorias
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
      } else {
        // Android: Actions são configuradas por notificação
        // Não precisa de setup global
        console.log('Android: Actions serão configuradas por notificação');
      }
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
   * 🔧 CORRIGIDO: Verificar se o hábito foi completado hoje
   */
  async checkIfCompletedToday(habitId: string): Promise<boolean> {
    try {
      const today = new Date();
      const startOfToday = startOfDay(today).toISOString();
      const endOfToday = endOfDay(today).toISOString();
      
      const { data, error } = await supabase
        .from('completions')
        .select('id')
        .eq('habit_id', habitId)
        .gte('completed_at', startOfToday)
        .lte('completed_at', endOfToday)
        .maybeSingle();

      // Se não houve erro e data existe, está completado
      return !error && data !== null;
    } catch {
      return false;
    }
  }

  /**
   * 🆕 NOVO: Buscar dados do hábito (inclui has_target)
   */
  async getHabitData(habitId: string): Promise<{
    id: string;
    name: string;
    has_target: boolean;
    target_value: number | null;
    target_unit: string | null;
    points_base: number;
    user_id: string;
  } | null> {
    try {
      const { data, error } = await supabase
        .from('habits')
        .select('id, name, has_target, target_value, target_unit, points_base, user_id')
        .eq('id', habitId)
        .single();

      if (error) throw error;

      return data as any;
    } catch (error) {
      console.error('Erro ao buscar hábito:', error);
      return null;
    }
  }

  /**
   * 🔧 CORRIGIDO: Agendar lembrete semanal (respeitando dias específicos)
   * iOS: Usa CALENDAR trigger com weekday + Categories
   * Android: Usa DAILY trigger + Actions inline
   */
  async scheduleWeeklyReminder(
    habitId: string,
    habitName: string,
    time: string,
    daysOfWeek: number[],
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

      if (Platform.OS === 'ios') {
        // iOS: Suporta weekday no trigger calendar + Categories
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
                scheduledDays: daysOfWeek,
              },
              sound: this.getSoundFile(sound),
              categoryIdentifier: 'habit-reminder', // iOS usa categoria
              priority: Notifications.AndroidNotificationPriority.HIGH,
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
              weekday: dayOfWeek + 1,
              hour: hours,
              minute: minutes,
              repeats: true,
            },
          });

          notificationIds.push(notificationId);
        }
      } else {
        // 🔧 CORRIGIDO: Android com cast de tipo
        const content: NotificationContentWithActions = {
          title: '⏰ Hora do seu hábito!',
          body: `Não esqueça: ${habitName}`,
          data: {
            habitId,
            habitName,
            reminderId,
            time,
            checkCompletion,
            type: 'habit_reminder',
            scheduledDays: daysOfWeek,
          },
          sound: this.getSoundFile(sound),
          priority: Notifications.AndroidNotificationPriority.HIGH,
          // 🆕 Android: Actions inline na notificação
          android: {
            channelId: 'habits',
            actions: [
              {
                identifier: 'snooze',
                title: '⏰ Adiar 10min',
                buttonTitle: '⏰ Adiar',
                options: {
                  opensAppToForeground: false,
                },
              },
              {
                identifier: 'complete',
                title: '✅ Marcar como feito',
                buttonTitle: '✅ Completar',
                options: {
                  opensAppToForeground: false,
                },
              },
            ],
          },
        };

        const notificationId = await Notifications.scheduleNotificationAsync({
          content: content as Notifications.NotificationContentInput,
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: hours,
            minute: minutes,
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
   * Agendar lembrete diário
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
   * Cancelar notificações
   */
  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.warn('Erro ao cancelar notificação:', error);
    }
  }

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
   * Snooze (10 minutos)
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
          seconds: 10 * 60,
        },
      });
    } catch (error) {
      console.error('Erro ao agendar snooze:', error);
    }
  }

  /**
   * 🔧 MELHORADO: Quick complete com suporte a metas numéricas
   */
  async handleQuickComplete(habitId: string): Promise<void> {
    try {
      // 🆕 Buscar dados completos do hábito
      const habit = await this.getHabitData(habitId);
      
      if (!habit) {
        console.warn('Hábito não encontrado');
        return;
      }

      // 🆕 Se tem meta numérica, não pode completar via notificação
      if (habit.has_target) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '📊 Meta Numérica',
            body: `Abra o app para registrar o valor de "${habit.name}"`,
            sound: 'default',
            data: {
              habitId,
              type: 'open_app_required',
            },
          },
          trigger: null,
        });
        return;
      }

      const today = new Date();
      const startOfToday = startOfDay(today).toISOString();
      const endOfToday = endOfDay(today).toISOString();

      // Verificar se já foi completado
      const { data: existing } = await supabase
        .from('completions')
        .select('id')
        .eq('habit_id', habitId)
        .gte('completed_at', startOfToday)
        .lte('completed_at', endOfToday)
        .maybeSingle();

      if (existing) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '✅ Já completado!',
            body: 'Você já completou este hábito hoje.',
            sound: 'default',
          },
          trigger: null,
        });
        return;
      }

      // Criar completion
      const { error: insertError } = await (supabase.from('completions') as any).insert({
        habit_id: habitId,
        completed_at: new Date().toISOString(),
        points_earned: habit.points_base,
        was_synced: true,
      });

      if (insertError) throw insertError;

      // Atualizar pontos
      const { error: rpcError } = await (supabase.rpc as any)('increment_points', {
        user_id_param: habit.user_id,
        points_param: habit.points_base,
      });

      if (rpcError) {
        console.warn('Erro ao atualizar pontos:', rpcError);
      }

      // Feedback de sucesso
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🎉 Hábito completado!',
          body: `+${habit.points_base} pontos ganhos!`,
          sound: 'default',
        },
        trigger: null,
      });
    } catch (error) {
      console.error('Erro ao completar hábito:', error);
    }
  }

  /**
   * Som
   */
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

  /**
   * Teste
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
   * Debug
   */
  async getAllScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Erro ao listar notificações:', error);
      return [];
    }
  }

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

  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Erro ao cancelar todas notificações:', error);
    }
  }
}

export const notificationService = new NotificationService();