// services/notifeeEventHandlers.ts
import notifee, { EventType, Event } from '@notifee/react-native';
import { supabase } from './supabase';
import { startOfDay, endOfDay } from 'date-fns';

/**
 * Configuração dos Event Handlers do Notifee
 * Gerencia ações dos botões: Snooze e Complete
 */
class NotifeeEventHandlers {
  
  /**
   * Configura o listener de FOREGROUND
   * BACKGROUND é registrado no nível do módulo (requisito Notifee)
   */
  setupEventHandlers(): void {
    console.log('🔔 Configurando event handlers do Notifee...');

    // FOREGROUND: App aberto
    notifee.onForegroundEvent(async (event) => {
      await this.handleEvent(event, 'FOREGROUND');
    });

    console.log('✅ Event handlers configurados');
  }

  /**
   * Handler principal de eventos (público para acesso do background handler)
   */
  async handleEvent(event: Event, context: 'FOREGROUND' | 'BACKGROUND'): Promise<void> {
    const { type, detail } = event;

    console.log(`🔔 [${context}] Event type: ${type}`);

    // EVENT TYPE 3 = ACTION_PRESS (usuário clicou em um botão)
    if (type === EventType.ACTION_PRESS) {
      const actionId = detail.pressAction?.id;
      const notification = detail.notification;

      console.log('👆 Botão pressionado:', actionId);
      console.log('📊 Dados da notificação:', notification?.data);

      if (!actionId || !notification?.data) {
        console.warn('⚠️ Dados insuficientes');
        return;
      }

      const { habitId, habitName } = notification.data as any;

      if (!habitId) {
        console.warn('⚠️ habitId não encontrado');
        return;
      }

      // Remover a notificação após clicar no botão
      if (notification?.id) {
        await notifee.cancelNotification(notification.id);
        console.log('🗑️ Notificação removida');
      }

      // Executar ação baseado no botão
      if (actionId === 'snooze') {
        await this.handleSnooze(habitId, habitName);
      } else if (actionId === 'complete') {
        await this.handleComplete(habitId, habitName);
      }
    }

    // EVENT TYPE 2 = PRESS (usuário clicou na notificação)
    if (type === EventType.PRESS) {
      console.log('👆 Notificação clicada (corpo)');
    }
  }

  /**
   * Handler do botão SNOOZE (Adiar 10 minutos)
   */
  private async handleSnooze(habitId: string, habitName: string): Promise<void> {
    try {
      console.log('⏰ Adiando notificação:', habitName);

      const snoozeTime = Date.now() + 10 * 60 * 1000;

      await notifee.displayNotification({
        title: '⏰ Lembrete adiado',
        body: `${habitName} - Você terá mais 10 minutos!`,
        data: {
          habitId,
          habitName,
          type: 'snooze_reminder',
        },
        android: {
          channelId: 'habits',
          importance: 4,
          smallIcon: 'ic_launcher',
          color: '#3B82F6',
          sound: 'default',
        },
      });

      console.log(`✅ Notificação de snooze criada para ${new Date(snoozeTime).toLocaleTimeString()}`);

      await notifee.createTriggerNotification(
        {
          title: '⏰ Hora do seu hábito!',
          body: `${habitName} - Última chance!`,
          data: {
            habitId,
            habitName,
            type: 'snooze_reminder',
          },
          android: {
            channelId: 'habits',
            importance: 4,
            smallIcon: 'ic_launcher',
            color: '#FFA500',
            sound: 'default',
            actions: [
              {
                title: '✅ Feito',
                pressAction: { id: 'complete' },
                icon: 'ic_launcher',
              },
            ],
          },
        },
        {
          type: 0, // TIMESTAMP
          timestamp: snoozeTime,
        }
      );

      console.log('✅ Snooze agendado com sucesso');

    } catch (error) {
      console.error('❌ Erro ao adiar:', error);
    }
  }

  /**
   * Handler do botão COMPLETE (Marcar como feito)
   */
  private async handleComplete(habitId: string, habitName: string): Promise<void> {
    try {
      console.log('✅ Completando hábito:', habitName);

      const habit = await this.getHabitData(habitId);

      if (!habit) {
        console.warn('⚠️ Hábito não encontrado');
        
        await notifee.displayNotification({
          title: '❌ Erro',
          body: 'Hábito não encontrado',
          android: {
            channelId: 'habits',
            importance: 4,
            smallIcon: 'ic_launcher',
          },
        });
        return;
      }

      if (habit.has_target) {
        console.log('📊 Hábito tem meta numérica - precisa abrir o app');
        
        await notifee.displayNotification({
          title: '📊 Meta Numérica',
          body: `Abra o app para registrar o valor de "${habitName}"`,
          android: {
            channelId: 'habits',
            importance: 4,
            smallIcon: 'ic_launcher',
            color: '#FFA500',
            pressAction: {
              id: 'open_app',
              launchActivity: 'default',
            },
          },
        });
        return;
      }

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
        console.log('ℹ️ Hábito já completado hoje');
        
        await notifee.displayNotification({
          title: '✅ Já completado!',
          body: 'Você já completou este hábito hoje.',
          android: {
            channelId: 'habits',
            importance: 4,
            smallIcon: 'ic_launcher',
            color: '#10B981',
          },
        });
        return;
      }

      const { error: insertError } = await (supabase
        .from('completions') as any)
        .insert({
          habit_id: habitId,
          completed_at: new Date().toISOString(),
          points_earned: habit.points_base,
          was_synced: true,
        });

      if (insertError) {
        throw insertError;
      }

      console.log('✅ Conclusão registrada no banco');

      const { error: rpcError } = await (supabase.rpc as any)('increment_points', {
        user_id_param: habit.user_id,
        points_param: habit.points_base,
      });

      if (rpcError) {
        console.warn('⚠️ Erro ao atualizar pontos:', rpcError);
      } else {
        console.log(`✅ +${habit.points_base} pontos adicionados`);
      }

      await notifee.displayNotification({
        title: '🎉 Hábito completado!',
        body: `${habitName}\n+${habit.points_base} pontos ganhos! 🌟`,
        android: {
          channelId: 'habits',
          importance: 4,
          smallIcon: 'ic_launcher',
          color: '#10B981',
          sound: 'default',
        },
      });

      console.log('🎉 Hábito completado com sucesso!');

    } catch (error) {
      console.error('❌ Erro ao completar hábito:', error);
      
      await notifee.displayNotification({
        title: '❌ Erro',
        body: 'Não foi possível completar o hábito',
        android: {
          channelId: 'habits',
          importance: 4,
          smallIcon: 'ic_launcher',
        },
      });
    }
  }

  /**
   * Buscar dados do hábito no banco
   */
  private async getHabitData(habitId: string): Promise<{
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
      console.error('❌ Erro ao buscar hábito:', error);
      return null;
    }
  }
}

export const notifeeEventHandlers = new NotifeeEventHandlers();