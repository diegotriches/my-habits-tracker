// components/notifications/NotificationHandler.tsx
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useAuth } from '@/hooks/useAuth';
import { notificationService } from '@/services/notificationService';
import { exactAlarmService } from '@/services/exactAlarmService';
import { reminderSyncService } from '@/services/reminderSyncService';
import { pendingCompletionService } from '@/services/pendingCompletionService';
import { isOfflineState } from '@/services/network';
import NetInfo from '@react-native-community/netinfo';

/**
 * Handler global de notificações usando expo-notifications.
 * Substitui o NotificationHandler baseado em Notifee.
 *
 * Responsabilidades:
 * - Solicitar permissões ao montar
 * - Escutar respostas a notificações (botões Adiar/Feito, toque no corpo)
 * - Enviar ao banco as conclusões do botão "Feito" nativo (fila local do
 *   AlarmReceiver): ao abrir, ao voltar ao primeiro plano e no evento
 *   PendingCompletionsChanged
 * - Navegar para o hábito ao tocar na notificação
 * - Ressincronizar os alarmes nativos com os lembretes do banco (Android)
 * - Ao reconectar: enviar pendências e refazer a ressincronização que falhou
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

    // Botão "Feito" nativo: a conclusão fica na fila local até o JS enviá-la.
    pendingCompletionService.drain();
    const unsubscribeComplete = exactAlarmService.onPendingCompletionsChanged(() => {
      pendingCompletionService.drain();
    });
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') pendingCompletionService.drain();
    });

    // Solicitar permissões e, com elas, reagendar os lembretes ativos — os
    // alarmes nativos se perdem ao reinstalar o app ou trocar de celular.
    let remindersSynced = false;
    const syncReminders = () => {
      reminderSyncService.syncReminders(user.id).then((ok) => {
        remindersSynced = ok;
      });
    };
    notificationService.requestPermissions().then((granted) => {
      console.log('Permissao de notificacao:', granted ? 'concedida' : 'negada');
      if (granted) syncReminders();
    });

    // Quando a conexão volta: envia as marcações pendentes na hora (sem
    // esperar o usuário sair e voltar ao app) e refaz a ressincronização dos
    // lembretes se ela falhou — ex.: o app foi aberto offline.
    let wasOffline = false;
    const unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      const offline = isOfflineState(state);
      if (wasOffline && !offline) {
        console.log('Conexao restabelecida: enviando pendencias');
        pendingCompletionService.drain();
        if (!remindersSynced) syncReminders();
      }
      wasOffline = offline;
    });

    console.log('Handlers de notificacao registrados');

    return () => {
      responseListener.remove();
      unsubscribeComplete();
      appStateSubscription.remove();
      unsubscribeNetInfo();
    };
  }, [user]);

  return null;
}
