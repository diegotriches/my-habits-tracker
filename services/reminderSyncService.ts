// services/reminderSyncService.ts
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { supabase } from './supabase';
import { exactAlarmService } from './exactAlarmService';
import { notificationService } from './notificationService';
import { Habit, ProgressNotification, Reminder, ReminderUpdate } from '@/types/database';
import { findOrphanNotificationIds } from '@/utils/orphanNotifications';
import { habitsDoneToday } from '@/utils/reminderSchedule';
import { endOfDay, startOfDay } from 'date-fns';
import { applyPendingOps, completionOutbox } from './completionOutbox';
import { progressNotificationScheduler } from './progressNotificationScheduler';
import { PlanHabit, todayReminderService } from './todayReminderService';

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
 * Idempotente: reagendar com o mesmo id substitui o alarme existente. Os
 * alarmes nativos são só do Android — no iOS os lembretes ficam no
 * expo-notifications, junto com as notificações de progresso, e um "cancelar
 * tudo" as apagaria.
 *
 * Em todas as plataformas, também cancela no expo-notifications o que sobrou
 * de hábitos fora de uso (ex.: notificações de progresso de um hábito
 * excluído, restauradas pelo backup do Android ao reinstalar) e, no Android,
 * lembretes legados de antes dos alarmes nativos.
 */
export const reminderSyncService = {
  /**
   * Chamado ao abrir o app e depois de editar um hábito (o nome e a meta vão
   * gravados no alarme). Nunca roda duas vezes em paralelo; se for chamado
   * durante uma sincronização, roda mais uma vez depois dela, porque a atual
   * pode ter lido o banco antes da mudança.
   */
  /**
   * Para depois de mudar lembretes, notificações de progresso ou a lista de
   * hábitos: reagenda tudo (pulando hoje para quem já concluiu) e atualiza o
   * plano salvo no aparelho — senão marcar o hábito usaria o plano antigo e
   * poderia reagendar um lembrete apagado. Não espera a conclusão.
   */
  syncCurrentUser(): void {
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) void reminderSyncService.syncReminders(session.user.id);
    });
  },

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

/**
 * Lista do que está agendado no expo-notifications, lida ANTES de consultar
 * os hábitos: uma notificação agendada depois da leitura (ex.: de um hábito
 * criado enquanto a sincronização roda) não entra na lista e não corre o
 * risco de ser cancelada por engano.
 */
async function readScheduledNotifications() {
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.warn('Erro ao ler as notificações agendadas:', error);
    return [];
  }
}

/** Cancela notificações de hábitos fora de uso e lembretes legados (ver utils). */
async function cancelOrphanNotifications(
  scheduled: Notifications.NotificationRequest[],
  activeHabitIds: Set<string>
): Promise<void> {
  const orphanIds = findOrphanNotificationIds(
    scheduled.map((n) => ({ identifier: n.identifier, data: n.content.data })),
    activeHabitIds,
    Platform.OS
  );
  for (const id of orphanIds) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch (error) {
      console.warn('Erro ao cancelar notificação órfã:', id, error);
    }
  }
  if (orphanIds.length > 0) console.log(`Notificações órfãs canceladas: ${orphanIds.length}`);
}

/**
 * Hábitos concluídos hoje: o que está no banco mais as marcações ainda na
 * fila de saída (feitas offline). Sem conseguir ler, ninguém é pulado — o
 * pior caso é um lembrete a mais, nunca um a menos.
 */
async function fetchDoneToday(
  userId: string,
  habits: Pick<Habit, 'id' | 'has_target' | 'target_value'>[]
): Promise<Set<string>> {
  if (habits.length === 0) return new Set();
  const now = new Date();
  try {
    const { data, error } = await supabase
      .from('completions')
      .select('*')
      .in(
        'habit_id',
        habits.map((h) => h.id)
      )
      .gte('completed_at', startOfDay(now).toISOString())
      .lte('completed_at', endOfDay(now).toISOString());
    if (error) throw error;
    const withPending = applyPendingOps(data ?? [], await completionOutbox.getPendingOps(userId));
    return habitsDoneToday(habits, withPending, now);
  } catch (error) {
    console.warn('Erro ao ler as conclusões de hoje:', error);
    return new Set();
  }
}

/** Configurações de progresso dos hábitos em uso, por hábito. */
async function fetchProgressConfigs(habitIds: string[]) {
  const byHabit = new Map<string, ProgressNotification>();
  if (habitIds.length === 0) return byHabit;
  const { data, error } = await supabase
    .from('habit_progress_notifications')
    .select('*')
    .in('habit_id', habitIds);
  if (error) {
    console.warn('Erro ao ler as configurações de progresso:', error);
    return byHabit;
  }
  for (const config of data ?? []) byHabit.set(config.habit_id, config);
  return byHabit;
}

async function runSync(userId: string): Promise<boolean> {
  try {
    // Sem permissão nada toca: nada a sincronizar, e isso não é falha.
    if (!(await notificationService.hasPermission())) return true;

    const scheduledNotifications = await readScheduledNotifications();

    const { data: habitsData, error: habitsError } = await supabase
      .from('habits')
      .select('id, name, has_target, target_value, is_active, archived_at')
      .eq('user_id', userId)
      .eq('is_active', true)
      // Arquivado não toca; ao restaurar, esta mesma sincronização o reagenda.
      .is('archived_at', null);
    // Sem os dados do banco (ex.: offline) não mexe em nada: cancelar e não
    // conseguir reagendar deixaria o usuário sem lembretes.
    if (habitsError) throw habitsError;

    const habits = habitsData ?? [];
    const habitsById = new Map(habits.map((h) => [h.id, h]));

    // Todas as plataformas: restos de hábitos excluídos/arquivados (ex.:
    // notificações de progresso de versões antigas ou restauradas pelo
    // backup do Android ao reinstalar).
    await cancelOrphanNotifications(scheduledNotifications, new Set(habitsById.keys()));

    // Hábitos já concluídos hoje não são lembrados de novo hoje.
    const doneToday = await fetchDoneToday(userId, habits);

    // Notificações de progresso: renova a janela dos próximos dias (todas as
    // plataformas), sem as de hoje para quem já atingiu a meta.
    const progressConfigs = await fetchProgressConfigs(habits.map((h) => h.id));
    for (const habit of habits) {
      const config = progressConfigs.get(habit.id);
      // Também com as notificações desligadas: scheduleWindow cancela restos.
      if (config) {
        await progressNotificationScheduler.scheduleWindow(habit, config, doneToday.has(habit.id));
      }
    }

    let reminders: Reminder[] = [];
    if (habits.length > 0) {
      const { data: remindersData, error: remindersError } = await supabase
        .from('reminders')
        .select('*')
        .in(
          'habit_id',
          habits.map((h) => h.id)
        )
        .eq('is_active', true);
      if (remindersError) throw remindersError;
      reminders = (remindersData ?? []) as Reminder[];
    }

    // Plano salvo no aparelho: permite pular/devolver o lembrete de hoje ao
    // marcar/desmarcar, mesmo sem conexão (todayReminderService).
    const planHabits: PlanHabit[] = habits.map((h) => ({
      id: h.id,
      name: h.name,
      has_target: h.has_target,
      target_value: h.target_value,
      progress: progressConfigs.get(h.id) ?? null,
    }));
    await todayReminderService.savePlan({
      userId,
      habits: planHabits,
      reminders: reminders.map((r) => ({
        id: r.id,
        habitId: r.habit_id,
        time: r.time,
        days: r.days_of_week ?? ALL_DAYS,
        sound: r.sound ?? 'default',
      })),
    });

    // Os alarmes nativos dos lembretes são só do Android.
    if (Platform.OS !== 'android') return true;

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
          {
            sound: reminder.sound ?? 'default',
            hasTarget: habit.has_target,
            minLeadMs: 0,
            skipToday: doneToday.has(reminder.habit_id),
          }
        );
        scheduled += alarmIds.length;

        // Atualiza os ids salvos se mudaram (ex.: formato legado).
        if (!sameIds(reminder.notification_ids, alarmIds)) {
          const update: ReminderUpdate = { notification_ids: alarmIds };
          const { error } = await supabase.from('reminders').update(update).eq('id', reminder.id);
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
