// utils/orphanNotifications.ts
//
// Quais notificações agendadas no expo-notifications são restos a cancelar —
// lógica pura, coberta por testes. Usada pela ressincronização ao abrir o app
// (services/reminderSyncService.ts).
//
// Por que existem restos: excluir um hábito em versões antigas nem sempre
// cancelava as notificações de progresso, e o backup automático do Android
// restaura a lista de agendamentos do expo-notifications ao reinstalar o app —
// então um hábito excluído há meses podia voltar a notificar.

export interface ScheduledNotificationLike {
  identifier: string;
  /** `content.data` da notificação agendada. */
  data?: Record<string, unknown> | null;
}

/**
 * Devolve os ids a cancelar:
 * - qualquer notificação de um hábito que não está em uso (excluído,
 *   arquivado ou de outra conta);
 * - no Android, lembretes (`habit_reminder`) do expo-notifications, mesmo de
 *   hábitos ativos: lá os lembretes são alarmes nativos, e esses são de
 *   versões antigas — tocariam em dobro.
 *
 * Notificações sem `habitId` (ex.: testes) ficam.
 */
export function findOrphanNotificationIds(
  scheduled: ScheduledNotificationLike[],
  activeHabitIds: ReadonlySet<string>,
  platform: string
): string[] {
  return scheduled
    .filter(({ data }) => {
      const habitId = data?.habitId;
      if (typeof habitId !== 'string') return false;
      if (!activeHabitIds.has(habitId)) return true;
      return platform === 'android' && data?.type === 'habit_reminder';
    })
    .map((n) => n.identifier);
}
