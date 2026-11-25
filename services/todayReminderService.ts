// services/todayReminderService.ts
//
// Hábito concluído hoje não é lembrado de novo hoje: o alarme de hoje vai para
// a próxima semana e as notificações de progresso de hoje saem. Desmarcar
// devolve o que ainda está por vir hoje.
//
// Funciona offline: a ressincronização (reminderSyncService), que lê o banco,
// grava aqui um "plano" com os lembretes e as configurações de progresso dos
// hábitos em uso; ao marcar/desmarcar hoje, o app usa esse plano sem precisar
// de conexão. Toda marcação passa pela fila de saída (completionOutbox), que
// chama `onOpEnqueued`; o "Feito" da notificação chama `markDoneToday`.
//
// Com o app fechado não há JS rodando: aí é o próprio AlarmReceiver que, antes
// de mostrar um lembrete, confere a fila nativa do "Feito"
// (PendingCompletionStorage.hasCompletionOnDay) e não mostra o lembrete de um
// hábito já feito no dia.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { exactAlarmService } from './exactAlarmService';
import {
  ProgressPeriodsConfig,
  progressNotificationScheduler,
} from './progressNotificationScheduler';
import type { CompletionOp } from '@/utils/completionOps';
import { countsAsDone, localDayKey } from '@/utils/reminderSchedule';

const PLAN_KEY = 'reminder_plan_v1';

export interface PlanHabit {
  id: string;
  name: string;
  has_target: boolean;
  target_value: number | null;
  /** Configuração das notificações de progresso (null = sem). */
  progress: ProgressPeriodsConfig | null;
}

export interface PlanReminder {
  id: string;
  habitId: string;
  time: string;
  days: number[];
  sound: string;
}

export interface ReminderPlan {
  userId: string;
  habits: PlanHabit[];
  reminders: PlanReminder[];
}

async function readPlan(userId: string): Promise<ReminderPlan | null> {
  try {
    const raw = await AsyncStorage.getItem(PLAN_KEY);
    const plan = raw ? (JSON.parse(raw) as ReminderPlan) : null;
    return plan && plan.userId === userId ? plan : null;
  } catch {
    return null;
  }
}

/** Reagenda o que é de hoje para um hábito, conforme esteja feito ou não. */
async function applyTodayState(plan: ReminderPlan, habitId: string, done: boolean): Promise<void> {
  const habit = plan.habits.find((h) => h.id === habitId);
  if (!habit) return; // fora de uso (excluído/arquivado) ou plano desatualizado

  if (Platform.OS === 'android') {
    const today = new Date().getDay();
    for (const r of plan.reminders) {
      if (r.habitId !== habitId || !r.days.includes(today)) continue;
      try {
        // Mesmo id do alarme (`${reminderId}_${dia}`): substitui o de hoje.
        await exactAlarmService.scheduleWeeklyReminders(
          habitId,
          habit.name,
          r.time,
          [today],
          r.id,
          {
            sound: r.sound,
            hasTarget: habit.has_target,
            minLeadMs: 0,
            skipToday: done,
          }
        );
      } catch (error) {
        console.warn('Erro ao reagendar o lembrete de hoje:', r.id, error);
      }
    }
  }

  if (habit.progress?.enabled) {
    await progressNotificationScheduler.scheduleWindow(
      { id: habit.id, name: habit.name, is_active: true, archived_at: null },
      habit.progress,
      done
    );
  }
}

export const todayReminderService = {
  /** Gravado pela ressincronização, a partir do banco. */
  async savePlan(plan: ReminderPlan): Promise<void> {
    try {
      await AsyncStorage.setItem(PLAN_KEY, JSON.stringify(plan));
    } catch (error) {
      console.warn('Erro ao salvar o plano de lembretes:', error);
    }
  },

  /** Chamado pela fila de saída a cada marcação/desmarcação. */
  async onOpEnqueued(op: Pick<CompletionOp, 'userId' | 'habitId' | 'day' | 'kind' | 'value'>) {
    if (op.day !== localDayKey(new Date())) return; // só hoje importa
    const plan = await readPlan(op.userId);
    const habit = plan?.habits.find((h) => h.id === op.habitId);
    if (!plan || !habit) return;
    const done = op.kind === 'complete' && countsAsDone(habit, op.value);
    await applyTodayState(plan, op.habitId, done);
  },

  /** "Feito" da notificação, gravado ao enviar a fila nativa. */
  async markDoneToday(userId: string, habitId: string): Promise<void> {
    const plan = await readPlan(userId);
    if (plan) await applyTodayState(plan, habitId, true);
  },

  /** No logout: o plano é da conta que saiu. */
  async clear(): Promise<void> {
    try {
      await AsyncStorage.removeItem(PLAN_KEY);
    } catch {
      // sem efeito: o plano de outra conta já é ignorado por readPlan
    }
  },
};
