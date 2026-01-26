// services/notificationsNotifee.ts
import notifee, { 
  AndroidImportance, 
  AndroidCategory,
  TriggerType,
  RepeatFrequency,
  TimestampTrigger,
  EventType,
  AuthorizationStatus,
} from '@notifee/react-native';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { startOfDay, endOfDay } from 'date-fns';

export type NotificationSound = 'default' | 'water' | 'bell' | 'chime' | 'silence';

/**
 * 🆕 Service de Notificações usando Notifee
 * Suporte COMPLETO para actions/botões no Android
 */
class NotificationNotifeeService {
  private navigationCallback: ((habitId: string) => void) | null = null;

  /**
   * Inicializar listeners de eventos
   */
  async initialize(navigationCallback: (habitId: string) => void): Promise<void> {
    this.navigationCallback = navigationCallback;

    // Listener para quando usuário clica na notificação ou botão
    notifee.onBackgroundEvent(async ({ type, detail }) => {
      console.log('🔔 Background Event:', type);
      
      if (type === EventType.PRESS) {
        const { notification, pressAction } = detail;
        const data = notification?.data;

        // Click em action/botão
        if (pressAction?.id === 'snooze') {
          await this.handleSnooze(
            data?.habitId as string, 
            data?.habitName as string
          );
        } else if (pressAction?.id === 'complete') {
          await this.handleQuickComplete(data?.habitId as string);
        } else if (data?.habitId) {
          // Click na notificação (sem action)
          this.navigationCallback?.(data.habitId as string);
        }
      }
    });

    // Listener para foreground
    notifee.onForegroundEvent(({ type, detail }) => {
      console.log('🔔 Foreground Event:', type);
      
      if (type === EventType.PRESS) {
        const { notification, pressAction } = detail;
        const data = notification?.data;

        if (pressAction?.id === 'snooze') {
          this.handleSnooze(
            data?.habitId as string, 
            data?.habitName as string
          );
        } else if (pressAction?.id === 'complete') {
          this.handleQuickComplete(data?.habitId as string);
        } else if (data?.habitId) {
          this.navigationCallback?.(data.habitId as string);
        }
      }
    });

    // Criar canais
    await this.createChannels();
  }

  /**
   * Criar canais de notificação
   */
  private async createChannels(): Promise<void> {
    if (Platform.OS !== 'android') return;

    try {
      // Canal principal de hábitos
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

      // Canal de progresso
      await notifee.createChannel({
        id: 'habits-progress',
        name: 'Atualizações de Progresso',
        importance: AndroidImportance.DEFAULT,
        sound: 'default',
      });

      console.log('✅ Canais Notifee criados');
    } catch (error) {
      console.error('❌ Erro ao criar canais:', error);
    }
  }

  /**
   * Solicitar permissões
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const settings = await notifee.requestPermission();
      
      if (settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED) {
        console.log('✅ Permissões concedidas');
        return true;
      }

      console.log('❌ Permissões negadas');
      return false;
    } catch (error) {
      console.error('❌ Erro ao solicitar permissões:', error);
      return false;
    }
  }

  /**
   * Verificar se tem permissão
   */
  async hasPermission(): Promise<boolean> {
    const settings = await notifee.getNotificationSettings();
    return settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED;
  }

  /**
   * 🎯 Agendar lembrete semanal com BOTÕES
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
      if (!hasPermission) {
        console.log('❌ Sem permissão');
        return [];
      }

      const [hours, minutes] = time.split(':').map(Number);
      const notificationIds: string[] = [];

      // Para cada dia da semana, criar um trigger
      for (const dayOfWeek of daysOfWeek) {
        // Calcular próxima ocorrência deste dia
        const now = new Date();
        const trigger: TimestampTrigger = {
          type: TriggerType.TIMESTAMP,
          timestamp: this.getNextOccurrence(dayOfWeek, hours, minutes).getTime(),
          repeatFrequency: RepeatFrequency.WEEKLY,
        };

        const notificationId = await notifee.createTriggerNotification(
          {
            title: '⏰ Hora do seu hábito!',
            body: `Não esqueça: ${habitName}`,
            data: {
              habitId,
              habitName,
              reminderId,
              dayOfWeek: String(dayOfWeek),
              time,
              type: 'habit_reminder',
            },
            android: {
              channelId: 'habits',
              importance: AndroidImportance.HIGH,
              sound: sound === 'default' ? 'default' : undefined,
              pressAction: {
                id: 'default',
              },
              // 🎉 ACTIONS/BOTÕES (funciona 100%!)
              actions: [
                {
                  title: '⏰ Adiar 10min',
                  pressAction: { id: 'snooze' },
                },
                {
                  title: '✅ Completar',
                  pressAction: { id: 'complete' },
                },
              ],
              category: AndroidCategory.REMINDER,
              autoCancel: false,
            },
          },
          trigger
        );

        notificationIds.push(notificationId);
        console.log(`✅ Notificação agendada: ${notificationId} (${dayOfWeek})`);
      }

      return notificationIds;
    } catch (error) {
      console.error('❌ Erro ao agendar:', error);
      return [];
    }
  }

  /**
   * Calcular próxima ocorrência de um dia da semana
   */
  private getNextOccurrence(dayOfWeek: number, hours: number, minutes: number): Date {
    const now = new Date();
    const result = new Date(now);
    
    result.setHours(hours, minutes, 0, 0);
    
    // Se já passou hoje, ir para próxima semana
    if (result <= now) {
      result.setDate(result.getDate() + 1);
    }
    
    // Ajustar para o dia da semana correto
    while (result.getDay() !== dayOfWeek) {
      result.setDate(result.getDate() + 1);
    }
    
    return result;
  }

  /**
   * Cancelar notificação
   */
  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await notifee.cancelNotification(notificationId);
      console.log(`✅ Notificação cancelada: ${notificationId}`);
    } catch (error) {
      console.warn('❌ Erro ao cancelar:', error);
    }
  }

  /**
   * Cancelar múltiplas notificações
   */
  async cancelNotifications(notificationIds: string[]): Promise<void> {
    try {
      // Notifee não tem cancelNotifications plural, usar loop
      for (const id of notificationIds) {
        await notifee.cancelNotification(id);
      }
      console.log(`✅ ${notificationIds.length} notificações canceladas`);
    } catch (error) {
      console.warn('❌ Erro ao cancelar:', error);
    }
  }

  /**
   * Cancelar todas as notificações de um hábito
   */
  async cancelHabitNotifications(habitId: string): Promise<void> {
    try {
      const notifications = await notifee.getTriggerNotifications();
      
      const habitNotificationIds = notifications
        .filter(n => n.notification.data?.habitId === habitId)
        .map(n => n.notification.id as string);

      if (habitNotificationIds.length > 0) {
        // Cancelar um por um
        for (const id of habitNotificationIds) {
          await notifee.cancelNotification(id);
        }
        console.log(`✅ Canceladas ${habitNotificationIds.length} notificações do hábito`);
      }
    } catch (error) {
      console.warn('❌ Erro ao cancelar notificações do hábito:', error);
    }
  }

  /**
   * Snooze - Adiar 10 minutos
   */
  async handleSnooze(habitId: string, habitName: string): Promise<void> {
    try {
      const trigger: TimestampTrigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: Date.now() + 10 * 60 * 1000, // 10 minutos
      };

      await notifee.createTriggerNotification(
        {
          title: '⏰ Lembrete adiado',
          body: `${habitName} - Hora de fazer agora!`,
          data: {
            habitId,
            habitName,
            type: 'snooze_reminder',
          },
          android: {
            channelId: 'habits',
            importance: AndroidImportance.HIGH,
            sound: 'default',
            pressAction: { id: 'default' },
          },
        },
        trigger
      );

      console.log('✅ Snooze agendado');
      
      // Feedback imediato
      await notifee.displayNotification({
        title: '⏰ Adiado',
        body: 'Te lembrarei em 10 minutos',
        android: {
          channelId: 'habits-progress',
          importance: AndroidImportance.LOW,
          autoCancel: true,
        },
      });
    } catch (error) {
      console.error('❌ Erro ao agendar snooze:', error);
    }
  }

  /**
   * Quick Complete - Completar via notificação
   */
  async handleQuickComplete(habitId: string): Promise<void> {
    try {
      // Buscar dados do hábito
      const { data: habitData, error: habitError } = await supabase
        .from('habits')
        .select('id, name, has_target, target_value, target_unit, points_base, user_id')
        .eq('id', habitId)
        .single();

      if (habitError || !habitData) {
        console.warn('Hábito não encontrado');
        return;
      }

      // Tipar explicitamente
      const habit = habitData as {
        id: string;
        name: string;
        has_target: boolean;
        target_value: number | null;
        target_unit: string | null;
        points_base: number;
        user_id: string;
      };

      // Se tem meta numérica, não pode completar via notificação
      if (habit.has_target) {
        await notifee.displayNotification({
          title: '📊 Meta Numérica',
          body: `Abra o app para registrar o valor de "${habit.name}"`,
          android: {
            channelId: 'habits-progress',
            importance: AndroidImportance.HIGH,
          },
        });
        return;
      }

      // Verificar se já foi completado hoje
      const today = new Date();
      const startOfToday = startOfDay(today).toISOString();
      const endOfToday = endOfDay(today).toISOString();

      const { data: existing } = await supabase
        .from('completions')
        .select('id')
        .eq('habit_id', habitId)
        .gte('completed_at', startOfToday)
        .lte('completed_at', endOfToday)
        .maybeSingle();

      if (existing) {
        await notifee.displayNotification({
          title: '✅ Já completado!',
          body: 'Você já completou este hábito hoje.',
          android: {
            channelId: 'habits-progress',
            importance: AndroidImportance.LOW,
          },
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
      await (supabase.rpc as any)('increment_points', {
        user_id_param: habit.user_id,
        points_param: habit.points_base,
      });

      // Feedback de sucesso
      await notifee.displayNotification({
        title: '🎉 Hábito completado!',
        body: `+${habit.points_base} pontos ganhos!`,
        android: {
          channelId: 'habits-progress',
          importance: AndroidImportance.HIGH,
          sound: 'default',
        },
      });

      console.log('✅ Hábito completado via notificação');
    } catch (error) {
      console.error('❌ Erro ao completar hábito:', error);
    }
  }

  /**
   * 🧪 TESTE: Notificação com botões
   */
  async testNotificationWithActions(): Promise<void> {
    try {
      const trigger: TimestampTrigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: Date.now() + 3000, // 3 segundos
      };

      await notifee.createTriggerNotification(
        {
          title: '🎯 TESTE DE BOTÕES',
          body: '👇 Expanda para ver os botões!',
          data: {
            habitId: 'test-123',
            habitName: 'Teste',
            type: 'test',
          },
          android: {
            channelId: 'habits',
            importance: AndroidImportance.HIGH,
            sound: 'default',
            pressAction: { id: 'default' },
            actions: [
              {
                title: '⏰ ADIAR',
                pressAction: { id: 'snooze' },
              },
              {
                title: '✅ COMPLETAR',
                pressAction: { id: 'complete' },
              },
            ],
            category: AndroidCategory.REMINDER,
          },
        },
        trigger
      );

      console.log('✅ Teste agendado para 3s');
    } catch (error) {
      console.error('❌ Erro no teste:', error);
    }
  }

  /**
   * Listar notificações agendadas
   */
  async getAllScheduledNotifications(): Promise<any[]> {
    try {
      const notifications = await notifee.getTriggerNotifications();
      console.log(`📋 ${notifications.length} notificações agendadas`);
      return notifications;
    } catch (error) {
      console.error('❌ Erro ao listar:', error);
      return [];
    }
  }

  /**
   * Cancelar todas as notificações
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      await notifee.cancelAllNotifications();
      console.log('✅ Todas as notificações canceladas');
    } catch (error) {
      console.error('❌ Erro ao cancelar todas:', error);
    }
  }
}

export const notificationNotifeeService = new NotificationNotifeeService();