// services/pendingCompletionService.ts
import { DeviceEventEmitter } from 'react-native';
import { endOfDay, startOfDay } from 'date-fns';
import { supabase } from './supabase';
import { exactAlarmService } from './exactAlarmService';
import { retroactiveCompletionService } from './retroactiveCompletionService';
import { CompletionInsert, Habit } from '@/types/database';

/** Emitido quando conclusões vindas da notificação foram gravadas no banco. */
export const COMPLETIONS_SYNCED_EVENT = 'HabitCompletionsSynced';

/**
 * - `completed`: gravada agora.
 * - `skipped`: não há o que gravar (já concluído nesse dia, hábito excluído,
 *   inativo, de outra conta ou com meta numérica) — pode sair da fila.
 * - `retry`: falha temporária (ex.: sem rede) — fica na fila.
 */
export type NotificationCompletionResult = 'completed' | 'skipped' | 'retry';

/**
 * Registra a conclusão de um hábito feita pela notificação, no dia local do
 * toque. Idempotente: se o dia já está concluído, não insere de novo — então
 * reprocessar um item da fila (ex.: o app morreu antes de removê-lo) é seguro.
 */
export async function completeHabitFromNotification(
  habitId: string,
  completedAt: Date
): Promise<NotificationCompletionResult> {
  try {
    const { data: habitData, error: habitError } = await supabase
      .from('habits')
      .select('id, has_target, is_active')
      .eq('id', habitId)
      .maybeSingle();
    if (habitError) throw habitError;

    const habit = habitData as Pick<Habit, 'id' | 'has_target' | 'is_active'> | null;
    // Sem linha: excluído ou de outra conta (RLS). Meta numérica precisa de
    // um valor, que a notificação não tem.
    if (!habit || !habit.is_active || habit.has_target) return 'skipped';

    const { data: existing, error: existingError } = await supabase
      .from('completions')
      .select('id')
      .eq('habit_id', habitId)
      .gte('completed_at', startOfDay(completedAt).toISOString())
      .lte('completed_at', endOfDay(completedAt).toISOString())
      .limit(1);
    if (existingError) throw existingError;
    if (existing && existing.length > 0) return 'skipped';

    const completion: CompletionInsert = {
      habit_id: habitId,
      completed_at: completedAt.toISOString(),
      was_synced: true,
    };
    const { error: insertError } = await supabase.from('completions').insert(completion);
    if (insertError) throw insertError;

    return 'completed';
  } catch (error) {
    console.error('Erro ao registrar conclusao da notificacao:', error);
    return 'retry';
  }
}

let inFlight: Promise<void> | null = null;

/**
 * Envia ao banco as conclusões que o botão "Feito" deixou na fila local
 * (Android). Chamado ao abrir o app, ao voltar para o primeiro plano e quando
 * o botão é tocado com o app aberto.
 */
export const pendingCompletionService = {
  drain(): Promise<void> {
    if (!inFlight) {
      inFlight = runDrain().finally(() => {
        inFlight = null;
      });
    }
    return inFlight;
  },
};

async function runDrain(): Promise<void> {
  try {
    const pending = await exactAlarmService.getPendingCompletions();
    if (pending.length === 0) return;

    const processed: string[] = [];
    const changedHabits = new Set<string>();

    for (const item of pending) {
      const result = await completeHabitFromNotification(item.habitId, new Date(item.completedAt));
      if (result === 'retry') continue;
      processed.push(item.id);
      if (result === 'completed') changedHabits.add(item.habitId);
    }

    await exactAlarmService.removePendingCompletions(processed);

    for (const habitId of changedHabits) {
      await retroactiveCompletionService.recalculateStreak(habitId);
    }

    console.log(
      `Fila da notificacao: ${pending.length} item(ns), ${changedHabits.size} gravado(s), ` +
      `${pending.length - processed.length} para tentar depois`
    );

    if (changedHabits.size > 0) {
      DeviceEventEmitter.emit(COMPLETIONS_SYNCED_EVENT);
    }
  } catch (error) {
    console.error('Erro ao processar fila de conclusoes:', error);
  }
}
