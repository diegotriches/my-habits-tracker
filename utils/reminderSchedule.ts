// utils/reminderSchedule.ts
//
// Quando cada lembrete e notificação de progresso deve tocar — lógica pura,
// coberta por testes. Regra central: hábito já concluído hoje não é lembrado
// de novo hoje; volta no próximo dia agendado.

import { addDays, format, isSameDay } from 'date-fns';

type TimeParts = { hours: number; minutes: number };

/** "21:30" ou "21:30:00" → horas e minutos. */
export function parseTime(time: string): TimeParts {
  const [hours, minutes] = time.split(':').map(Number);
  return { hours: hours || 0, minutes: minutes || 0 };
}

/**
 * Próxima ocorrência de um lembrete semanal (dia da semana 0 = domingo).
 *
 * - Nunca no passado: um horário que já passou (ou é agora) vai para a
 *   próxima semana; `minLeadMs` exige essa antecedência mínima para hoje.
 * - `skipToday`: hábito já concluído hoje — a ocorrência de hoje é pulada e
 *   o alarme fica para o mesmo dia da semana seguinte.
 */
export function nextWeeklyOccurrence(
  dayOfWeek: number,
  time: string,
  now: Date,
  { minLeadMs = 0, skipToday = false }: { minLeadMs?: number; skipToday?: boolean } = {}
): Date {
  const { hours, minutes } = parseTime(time);
  const result = new Date(now);
  result.setHours(hours, minutes, 0, 0);

  let daysUntil = dayOfWeek - now.getDay();
  if (daysUntil < 0) daysUntil += 7;
  if (daysUntil === 0 && (skipToday || result.getTime() - now.getTime() <= minLeadMs)) {
    daysUntil = 7;
  }
  return addDays(result, daysUntil);
}

export interface ProgressPeriodTime {
  period: 'morning' | 'afternoon' | 'evening';
  time: string;
}

/**
 * Datas das notificações de progresso dos próximos `windowDays` dias (hoje
 * incluído), sem as que já passaram e — se a meta de hoje já foi atingida —
 * sem as de hoje. Elas são agendadas uma a uma, e não como repetição diária,
 * justamente para poder pular o dia concluído; o app renova a janela ao abrir.
 */
export function progressWindowDates(
  periods: ProgressPeriodTime[],
  now: Date,
  doneToday: boolean,
  windowDays: number
): { period: ProgressPeriodTime['period']; date: Date }[] {
  const result: { period: ProgressPeriodTime['period']; date: Date }[] = [];
  for (let d = 0; d < windowDays; d++) {
    if (d === 0 && doneToday) continue;
    for (const { period, time } of periods) {
      const { hours, minutes } = parseTime(time);
      const date = addDays(new Date(now), d);
      date.setHours(hours, minutes, 0, 0);
      if (date.getTime() <= now.getTime()) continue;
      result.push({ period, date });
    }
  }
  return result.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/** Hábito com meta numérica só conta como feito ao atingir o valor. */
export function countsAsDone(
  habit: { has_target: boolean; target_value: number | null },
  valueAchieved: number | null | undefined
): boolean {
  if (!habit.has_target || !habit.target_value) return true;
  return (valueAchieved ?? 0) >= habit.target_value;
}

/** Ids dos hábitos concluídos hoje (dia local), pela regra de `countsAsDone`. */
export function habitsDoneToday(
  habits: { id: string; has_target: boolean; target_value: number | null }[],
  completions: { habit_id: string; completed_at: string; value_achieved: number | null }[],
  now: Date
): Set<string> {
  const byId = new Map(habits.map((h) => [h.id, h]));
  const done = new Set<string>();
  for (const c of completions) {
    const habit = byId.get(c.habit_id);
    if (!habit || !isSameDay(new Date(c.completed_at), now)) continue;
    if (countsAsDone(habit, c.value_achieved)) done.add(habit.id);
  }
  return done;
}

/** Dia local (yyyy-MM-dd) — o mesmo formato do `day` das operações da fila. */
export const localDayKey = (date: Date) => format(date, 'yyyy-MM-dd');
