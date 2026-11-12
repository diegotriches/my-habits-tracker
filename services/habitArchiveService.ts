// services/habitArchiveService.ts
//
// Arquivar tira o hábito da home e dos lembretes sem apagar nada: o histórico
// continua nos detalhes e na lista de arquivados, e restaurar o traz de volta
// como estava. A exclusão (is_active = false) é outra coisa e não tem volta.
//
// Os lembretes ficam ativos no banco enquanto o hábito está arquivado — só os
// alarmes do aparelho são cancelados. A ressincronização ignora hábitos
// arquivados, então, ao restaurar, ela mesma reagenda tudo.
import { supabase } from '@/services/supabase';
import { notificationService } from '@/services/notificationService';
import { progressNotificationScheduler } from '@/services/progressNotificationScheduler';
import { reminderSyncService } from '@/services/reminderSyncService';
import { streakService } from '@/services/streakService';
import { emitHabitsChanged } from '@/services/habitEvents';

type Result = { error: string | null };

export async function archiveHabit(habitId: string): Promise<Result> {
  const { error } = await supabase
    .from('habits')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', habitId);
  if (error) return { error: error.message };

  try {
    await notificationService.cancelHabitNotifications(habitId);
    await progressNotificationScheduler.cancelProgressNotifications(habitId);
  } catch (e) {
    // Não desfaz o arquivamento: a próxima ressincronização (ao abrir o app)
    // já não reagenda os lembretes de hábitos arquivados.
    console.warn('Erro ao cancelar os lembretes do hábito arquivado:', e);
  }

  emitHabitsChanged();
  return { error: null };
}

export async function restoreHabit(habitId: string, userId: string): Promise<Result> {
  const { error } = await supabase.from('habits').update({ archived_at: null }).eq('id', habitId);
  if (error) return { error: error.message };

  try {
    // Enquanto arquivado, o streak não era zerado pelos dias perdidos (o
    // checkExpiredStreaks só olha os hábitos da home).
    await streakService.recalculateStreak(habitId);
    await reminderSyncService.syncReminders(userId);
    await progressNotificationScheduler.scheduleProgressNotifications(habitId, userId);
  } catch (e) {
    console.warn('Erro ao reativar os lembretes do hábito restaurado:', e);
  }

  emitHabitsChanged();
  return { error: null };
}
