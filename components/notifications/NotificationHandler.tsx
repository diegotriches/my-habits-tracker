// components/notifications/NotificationHandler.tsx
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { notificationService } from '@/services/notificationService';

/**
 * Handler global de notificações
 * Usa o wrapper que escolhe automaticamente:
 * - Mock no Expo Go
 * - Notifee na build standalone
 */
export function NotificationHandler() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    console.log('🔔 Inicializando notification handler...');

    // Inicializar com callback de navegação (tipado)
    notificationService.initialize((habitId: string) => {
      console.log('🔗 Navegando para hábito:', habitId);
      router.push(`/habits/${habitId}` as any);
    });

    // Solicitar permissões
    setupPermissions();

    return () => {
      console.log('🔔 Notification handler desmontado');
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