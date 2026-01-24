// components/notifications/NotificationHandler.tsx
import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { notificationService } from '@/services/notifications';
import { progressNotificationScheduler } from '@/services/progressNotificationScheduler';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

/**
 * Componente invisível que gerencia listeners de notificações
 * Deve ser montado no _layout.tsx para funcionar globalmente
 */
export function NotificationHandler() {
  const { user } = useAuth();
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    if (!user) return;

    // 🔧 Setup handlers de notificação
    setupNotificationHandlers();

    // Listener 1: Quando notificação chega (app em foreground)
    notificationListener.current = Notifications.addNotificationReceivedListener(
      async (notification) => {
        const data = notification.request.content.data;
        
        // 🆕 Android: Verificar se hoje é um dos dias programados
        if (Platform.OS === 'android' && data?.scheduledDays && data?.type === 'habit_reminder') {
          const today = new Date().getDay(); // 0 = domingo, 6 = sábado
          const scheduledDays = data.scheduledDays as number[];
          
          if (!scheduledDays.includes(today)) {
            // Hoje não é dia programado, não processar
            return;
          }
        }
        
        // Se for notificação de progresso, processar
        if (data?.type === 'progress_notification' && data?.habitId && data?.period) {
          await progressNotificationScheduler.processProgressNotification(
            data.habitId as string,
            data.period as any
          );
        }
      }
    );

    // Listener 2: Quando usuário interage com a notificação
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      async (response) => {
        const data = response.notification.request.content.data;
        const actionId = response.actionIdentifier;

        // 🆕 Android: Verificar se hoje é um dos dias programados
        if (Platform.OS === 'android' && data?.scheduledDays && data?.type === 'habit_reminder') {
          const today = new Date().getDay();
          const scheduledDays = data.scheduledDays as number[];
          
          if (!scheduledDays.includes(today)) {
            // Hoje não é dia programado, não processar
            return;
          }
        }

        // Ação: Snooze (adiar 10min)
        if (actionId === 'snooze' && data?.habitId && data?.habitName) {
          await notificationService.handleSnooze(
            data.habitId as string,
            data.habitName as string
          );
          return;
        }

        // Ação: Quick Complete (marcar como feito)
        if (actionId === 'complete' && data?.habitId) {
          await notificationService.handleQuickComplete(data.habitId as string);
          return;
        }

        // Click na notificação (sem ação específica) → Abrir hábito
        if (data?.habitId && actionId === Notifications.DEFAULT_ACTION_IDENTIFIER) {
          router.push(`/habits/${data.habitId}` as any);
          return;
        }
      }
    );

    // Cleanup
    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [user]);

  // Setup inicial
  const setupNotificationHandlers = async () => {
    // Solicitar permissões
    const hasPermission = await notificationService.requestPermissions();
    
    if (hasPermission) {
      // Configurar handler de deep link
      notificationService.setupNotificationHandlers((habitId) => {
        router.push(`/habits/${habitId}` as any);
      });
    }
  };

  // Componente invisível - não renderiza nada
  return null;
}

/**
 * Hook para verificar notificações quando app volta do background
 */
export function useNotificationRefresh(onRefresh: () => Promise<void>) {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active') {
        // App voltou para foreground - atualizar dados
        await onRefresh();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [onRefresh]);
}