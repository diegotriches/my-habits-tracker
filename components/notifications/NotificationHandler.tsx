// components/notifications/NotificationHandler.tsx
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useAuth } from '@/hooks/useAuth';
import { notificationService } from '@/services/notificationService';
import { exactAlarmService } from '@/services/exactAlarmService';

/**
 * Handler global de notificações usando expo-notifications.
 * Substitui o NotificationHandler baseado em Notifee.
 *
 * Responsabilidades:
 * - Solicitar permissões ao montar
 * - Escutar respostas a notificações (botões Adiar/Feito, toque no corpo)
 * - Escutar evento nativo HabitCompleteFromNotification (botão "Feito" do AlarmReceiver)
 * - Navegar para o hábito ao tocar na notificação
 */
export function NotificationHandler() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    console.log('Registrando handlers de notificacao...');

    // Configurar handler de exibição
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    // Listener: usuário interagiu com a notificação (toque ou botão)
    const responseListener = Notifications.addNotificationResponseReceivedListener(
      async (response) => {
        const actionId = response.actionIdentifier;
        const data = response.notification.request.content.data as any;

        console.log('Interacao com notificacao:', { actionId, habitId: data?.habitId });

        if (!data?.habitId) return;

        if (actionId === 'snooze') {
          await notificationService.handleSnooze(data.habitId, data.habitName);
          return;
        }

        if (actionId === 'complete') {
          await notificationService.handleQuickComplete(data.habitId);
          return;
        }

        // Toque no corpo da notificação — navegar para o hábito
        if (actionId === Notifications.DEFAULT_ACTION_IDENTIFIER) {
          console.log('Navegando para habito:', data.habitId);
          router.push(`/habits/${data.habitId}` as any);
        }
      }
    );

    // Listener: evento nativo do botão "Feito" do AlarmReceiver.java
    const unsubscribeComplete = exactAlarmService.onHabitComplete(
      async (habitId, habitName) => {
        console.log('Botao Feito nativo pressionado:', habitId);
        await notificationService.handleQuickComplete(habitId);
      }
    );

    // Solicitar permissões
    notificationService.requestPermissions().then((granted) => {
      console.log('Permissao de notificacao:', granted ? 'concedida' : 'negada');
    });

    console.log('Handlers de notificacao registrados');

    return () => {
      responseListener.remove();
      unsubscribeComplete();
    };
  }, [user]);

  return null;
}

/**
 * Hook para refresh quando app volta do background
 */
export function useNotificationRefresh(onRefresh: () => Promise<void>) {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active') {
        await onRefresh();
      }
    });
    return () => subscription.remove();
  }, [onRefresh]);
}