// components/notifications/NotificationHandler.tsx
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { notificationService } from '@/services/notificationService';
import notifee, { EventType } from '@notifee/react-native';

/**
 * Handler global de notificações
 * Registra onForegroundEvent dentro do componente React
 */
export function NotificationHandler() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    console.log('🔔 Registrando onForegroundEvent no NotificationHandler...');

    const unsubscribe = notifee.onForegroundEvent(({ type, detail }) => {
      console.log('🔔🔔🔔 [HANDLER] EVENT:', type);
      console.log('🔔🔔🔔 [HANDLER] ACTION:', detail?.pressAction?.id);
      console.log('🔔🔔🔔 [HANDLER] DETAIL:', JSON.stringify(detail, null, 2));

      if (type === EventType.ACTION_PRESS) {
        const actionId = detail.pressAction?.id;
        const data = detail.notification?.data;

        console.log('👆 BOTÃO PRESSIONADO:', actionId);

        if (!actionId || !data?.habitId) {
          console.warn('⚠️ Dados insuficientes');
          return;
        }

        // Remover notificação
        if (detail.notification?.id) {
          notifee.cancelNotification(detail.notification.id);
        }

        if (actionId === 'snooze') {
          console.log('⏰ Snooze via foreground handler');
          notificationService.handleSnooze(
            data.habitId as string,
            data.habitName as string
          );
        } else if (actionId === 'complete') {
          console.log('✅ Complete via foreground handler');
          notificationService.handleQuickComplete(data.habitId as string);
        }
      }

      if (type === EventType.PRESS && detail.notification?.data?.habitId) {
        console.log('📱 Navegando para hábito:', detail.notification.data.habitId);
        router.push(`/habits/${detail.notification.data.habitId}` as any);
      }
    });

    console.log('✅ onForegroundEvent registrado no NotificationHandler');

    // Inicializar serviço de notificações (canais, etc)
    notificationService.initialize((habitId: string) => {
      console.log('🔗 Navegando para hábito:', habitId);
      router.push(`/habits/${habitId}` as any);
    });

    // Solicitar permissões
    setupPermissions();

    return () => {
      console.log('🔔 Removendo onForegroundEvent');
      unsubscribe();
    };
  }, [user]);

  const setupPermissions = async () => {
    const hasPermission = await notificationService.requestPermissions();

    if (hasPermission) {
      console.log('✅ Permissões concedidas');
    } else {
      console.log('❌ Permissões negadas');
    }
  };

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

    return () => {
      subscription.remove();
    };
  }, [onRefresh]);
}