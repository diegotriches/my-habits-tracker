// services/reminderSyncService.ts
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { exactAlarmService } from './exactAlarmService';
import { notificationService } from './notifications';
import { Habit, Reminder, ReminderUpdate } from '@/types/database';

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

const sameIds = (a: string[] | null, b: string[]) =>
  !!a && a.length === b.length && a.every((id, i) => id === b[i]);

let inFlight: Promise<void> | null = null;

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
  syncReminders(userId: string): Promise<void> {
    // Evita duas sincronizações simultâneas (ex.: o efeito do usuário
    // disparar de novo enquanto a anterior ainda roda).
    if (!inFlight) {
      inFlight = runSync(userId).finally(() => {
        inFlight = null;
      });
    }
    return inFlight;
  },
};

async function runSync(userId: string): Promise<void> {
  if (Platform.OS !== 'android') return;

  try {
    if (!(await notificationService.hasPermission())) return;

    const { data: habitsData, error: habitsError } = await supabase
      .from('habits')
      .select('id, name')
      .eq('user_id', userId)
      .eq('is_active', true);
    // Sem os dados do banco (ex.: offline) não mexe em nada: cancelar e não
    // conseguir reagendar deixaria o usuário sem lembretes.
    if (habitsError) throw habitsError;

    const habits = (habitsData ?? []) as Pick<Habit, 'id' | 'name'>[];
    const habitNames = new Map(habits.map(h => [h.id, h.name]));

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
      const habitName = habitNames.get(reminder.habit_id);
      const days = reminder.days_of_week ?? ALL_DAYS;
      if (!habitName || days.length === 0) continue;

      try {
        const alarmIds = await exactAlarmService.scheduleWeeklyReminders(
          reminder.habit_id,
          habitName,
          reminder.time,
          days,
          reminder.id,
          0
        );
        scheduled += alarmIds.length;

        // Atualiza os ids salvos se mudaram (ex.: formato legado).
        if (!sameIds(reminder.notification_ids, alarmIds)) {
          const update: ReminderUpdate = { notification_ids: alarmIds };
          // `as never`: o tipo Database atual faz o supabase-js inferir
          // `never` no update; o payload já está tipado acima.
          const { error } = await supabase
            .from('reminders')
            .update(update as never)
            .eq('id', reminder.id);
          if (error) console.warn('Erro ao salvar ids do lembrete:', error);
        }
      } catch (error) {
        // Um lembrete com problema não impede os demais.
        console.error('Erro ao reagendar lembrete:', reminder.id, error);
      }
    }

    console.log(`Lembretes ressincronizados: ${reminders.length} lembretes, ${scheduled} alarmes`);
  } catch (error) {
    console.error('Erro ao ressincronizar lembretes:', error);
  }
}
