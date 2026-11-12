// services/reminderSyncService.ts
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { exactAlarmService } from './exactAlarmService';
import { notificationService } from './notifications';
import { Habit, Reminder, ReminderUpdate } from '@/types/database';

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

const sameIds = (a: string[] | null, b: string[]) =>
  !!a && a.length === b.length && a.every((id, i) => id === b[i]);

let inFlight: Promise<boolean> | null = null;
let rerunRequested = false;

/**
 * Ressincroniza os alarmes nativos do aparelho com os lembretes ativos do
 * banco. Os alarmes vivem só no aparelho (AlarmManager + AlarmStorage), então
 * se perdem ao reinstalar o app, limpar os dados ou trocar de celular,
 * enquanto os lembretes continuam ativos no banco — e paravam de tocar em
 * silêncio. Também remove alarmes órfãos (lembretes desativados/excluídos em
 * outro aparelho, outro usuário que usou o app, ids legados
 * `${habitId}_${dia}`).
 *
 * Idempotente: reagendar com o mesmo id substitui o alarme existente. Só
 * Android — no iOS os lembretes ficam no expo-notifications, junto com as
 * notificações de progresso, e um "cancelar tudo" as apagaria.
 */
export const reminderSyncService = {
  /**
   * Chamado ao abrir o app e depois de editar um hábito (o nome e a meta vão
   * gravados no alarme). Nunca roda duas vezes em paralelo; se for chamado
   * durante uma sincronização, roda mais uma vez depois dela, porque a atual
   * pode ter lido o banco antes da mudança.
   */
  /** Devolve se a última rodada conseguiu ler o banco (false: ex. offline). */
  syncReminders(userId: string): Promise<boolean> {
    if (inFlight) {
      rerunRequested = true;
      return inFlight;
    }
    inFlight = (async () => {
      let ok = false;
      do {
        rerunRequested = false;
        ok = await runSync(userId);
      } while (rerunRequested);
      return ok;
    })().finally(() => {
      inFlight = null;
    });
    return inFlight;
  },
};

async function runSync(userId: string): Promise<boolean> {
  // Nada a sincronizar não é falha: não há o que tentar de novo.
  if (Platform.OS !== 'android') return true;

  try {
    if (!(await notificationService.hasPermission())) return true;

    const { data: habitsData, error: habitsError } = await supabase
      .from('habits')
      .select('id, name, has_target')
      .eq('user_id', userId)
      .eq('is_active', true);
    // Sem os dados do banco (ex.: offline) não mexe em nada: cancelar e não
    // conseguir reagendar deixaria o usuário sem lembretes.
    if (habitsError) throw habitsError;

    const habits = (habitsData ?? []) as Pick<Habit, 'id' | 'name' | 'has_target'>[];
    const habitsById = new Map(habits.map(h => [h.id, h]));

    let reminders: Reminder[] = [];
    if (habits.length > 0) {
      const { data: remindersData, error: remindersError } = await supabase
        .from('reminders')
        .select('*')
        .in('habit_id', habits.map(h => h.id))
        .eq('is_active', true);
      if (remindersError) throw remindersError;
      reminders = (remindersData ?? []) as Reminder[];
    }

    // Limpa tudo o que está persistido (inclui órfãos) e reagenda só o que
    // está ativo. O snooze pendente não é persistido e sobrevive.
    await exactAlarmService.cancelAllAlarms();

    let scheduled = 0;
    for (const reminder of reminders) {
      const habit = habitsById.get(reminder.habit_id);
      const days = reminder.days_of_week ?? ALL_DAYS;
      if (!habit || days.length === 0) continue;

      try {
        const alarmIds = await exactAlarmService.scheduleWeeklyReminders(
          reminder.habit_id,
          habit.name,
          reminder.time,
          days,
          reminder.id,
          { sound: reminder.sound ?? 'default', hasTarget: habit.has_target, minLeadMs: 0 }
        );
        scheduled += alarmIds.length;

        // Atualiza os ids salvos se mudaram (ex.: formato legado).
        if (!sameIds(reminder.notification_ids, alarmIds)) {
          const update: ReminderUpdate = { notification_ids: alarmIds };
          const { error } = await supabase
            .from('reminders')
            .update(update)
            .eq('id', reminder.id);
          if (error) console.warn('Erro ao salvar ids do lembrete:', error);
        }
      } catch (error) {
        // Um lembrete com problema não impede os demais.
        console.error('Erro ao reagendar lembrete:', reminder.id, error);
      }
    }

    console.log(`Lembretes ressincronizados: ${reminders.length} lembretes, ${scheduled} alarmes`);
    return true;
  } catch (error) {
    console.error('Erro ao ressincronizar lembretes:', error);
    return false;
  }
}
