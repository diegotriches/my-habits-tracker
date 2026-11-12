import { useCallback, useState } from 'react';
import { isFuture, isSameDay } from 'date-fns';
import { Habit, Completion } from '@/types/database';
import { completionDayFields, completionOutbox } from '@/services/completionOutbox';
import type { OptimisticOp, SettleOptimistic } from './useWeeklyCompletions';

function formatProgressMessage(
  isUpdate: boolean,
  mode: 'add' | 'replace',
  value: number,
  finalValue: number,
  unit: string,
  percentage: number
): string {
  if (isUpdate && mode === 'add') {
    return `Adicionado ${value} ${unit}! Total: ${finalValue} ${unit} (${percentage.toFixed(0)}%)`;
  }
  if (isUpdate && mode === 'replace') {
    return `Atualizado para ${finalValue} ${unit} (${percentage.toFixed(0)}%)`;
  }
  return `Registrado ${finalValue} ${unit} (${percentage.toFixed(0)}%)`;
}

function makeOptimisticId(habitId: string, date: Date): string {
  return `optimistic-${habitId}-${date.getTime()}-${Math.random().toString(36).slice(2)}`;
}

const SAVE_FAILED_MESSAGE = 'Não foi possível salvar a marcação';

interface UseHabitCompletionActionsParams {
  userId: string | undefined;
  weeklyCompletions: Completion[];
  fetchStreaks: (habitIds: string[]) => Promise<void>;
  celebrate: () => void;
  // Mutação otimista (de useWeeklyCompletions): applyOptimistic reflete a
  // marcação/desmarcação na UI na hora e a protege de refetches até a fila
  // enviá-la; as outras duas revertem a UI em caso de erro definitivo.
  applyOptimistic: (op: OptimisticOp) => SettleOptimistic;
  addOptimisticCompletion: (completion: Completion) => void;
  removeCompletionById: (id: string) => void;
}

/**
 * Marcações da home. Hoje e dias passados seguem o mesmo fluxo: a UI muda na
 * hora e a operação vai para a fila de saída (services/completionOutbox.ts),
 * que a envia agora ou, sem conexão, depois. A UI só reverte em erro
 * definitivo — nunca por falta de rede.
 */
export function useHabitCompletionActions({
  userId,
  weeklyCompletions,
  fetchStreaks,
  celebrate,
  applyOptimistic,
  addOptimisticCompletion,
  removeCompletionById,
}: UseHabitCompletionActionsParams) {
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showUncompleteConfirm, setShowUncompleteConfirm] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  // Hábito e dia do modal de progresso ou da confirmação de desmarcar.
  // Sempre limpos ao fechar/cancelar, para não vazar para a próxima ação.
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const showResultMessage = useCallback((message: string) => {
    setSuccessMessage(message);
    setShowSuccessToast(true);
  }, []);

  const findCompletion = useCallback(
    (habitId: string, date: Date) => {
      return weeklyCompletions.find(
        (c) => c.habit_id === habitId && isSameDay(new Date(c.completed_at), date)
      );
    },
    [weeklyCompletions]
  );

  const clearSelection = useCallback(() => {
    setSelectedHabit(null);
    setSelectedDate(null);
  }, []);

  /** Marca o dia (ou grava o valor final, em hábitos com meta). */
  const markDay = useCallback(
    (habit: Habit, date: Date, value: number | null) => {
      if (!userId) return;
      const existing = findCompletion(habit.id, date);
      const fields = completionDayFields(date);
      const optimisticId = makeOptimisticId(habit.id, date);

      // Com meta, o valor novo substitui o existente.
      const settleRemove = existing
        ? applyOptimistic({ kind: 'remove', habitId: habit.id, date })
        : null;
      const settleAdd = applyOptimistic({
        kind: 'add',
        completion: {
          id: optimisticId,
          habit_id: habit.id,
          completed_at: fields.completedAt,
          value_achieved: value,
          was_synced: false,
          created_at: new Date().toISOString(),
        },
      });

      void completionOutbox
        .enqueue({ userId, habitId: habit.id, kind: 'complete', value, ...fields })
        .then((result) => {
          const ok = result !== 'dropped';
          settleRemove?.(ok);
          settleAdd(ok);
          if (result === 'synced') void fetchStreaks([habit.id]);
          if (!ok) {
            removeCompletionById(optimisticId);
            if (existing) addOptimisticCompletion(existing);
            showResultMessage(SAVE_FAILED_MESSAGE);
          }
        });
    },
    [
      userId,
      findCompletion,
      applyOptimistic,
      fetchStreaks,
      removeCompletionById,
      addOptimisticCompletion,
      showResultMessage,
    ]
  );

  const unmarkDay = useCallback(
    (habit: Habit, date: Date) => {
      if (!userId) return;
      const existing = findCompletion(habit.id, date);
      const settle = applyOptimistic({ kind: 'remove', habitId: habit.id, date });

      void completionOutbox
        .enqueue({
          userId,
          habitId: habit.id,
          kind: 'uncomplete',
          value: null,
          ...completionDayFields(date),
        })
        .then((result) => {
          const ok = result !== 'dropped';
          settle(ok);
          if (result === 'synced') void fetchStreaks([habit.id]);
          if (!ok) {
            if (existing) addOptimisticCompletion(existing);
            showResultMessage(SAVE_FAILED_MESSAGE);
          }
        });
    },
    [
      userId,
      findCompletion,
      applyOptimistic,
      fetchStreaks,
      addOptimisticCompletion,
      showResultMessage,
    ]
  );

  const handleDayPress = useCallback(
    (habit: Habit, date: Date) => {
      if (!userId || isFuture(date)) return;
      const isToday = isSameDay(date, new Date());
      const completion = findCompletion(habit.id, date);

      // Meta numérica: hoje sempre abre o modal (para somar/ajustar); dias
      // passados só quando ainda não há registro.
      if (habit.has_target && (isToday || !completion)) {
        setSelectedHabit(habit);
        setSelectedDate(date);
        setShowProgressModal(true);
        return;
      }

      if (completion) {
        setSelectedHabit(habit);
        setSelectedDate(date);
        setShowUncompleteConfirm(true);
        return;
      }

      markDay(habit, date, null);
      if (isToday) {
        showResultMessage('Completado!');
        setTimeout(() => celebrate(), 1000);
      }
    },
    [userId, findCompletion, markDay, showResultMessage, celebrate]
  );

  const handleConfirmProgress = useCallback(
    (value: number, mode: 'add' | 'replace') => {
      const habit = selectedHabit;
      const date = selectedDate;
      setShowProgressModal(false);
      clearSelection();
      if (!habit || !date) return;

      const current = findCompletion(habit.id, date)?.value_achieved ?? 0;
      const finalValue = mode === 'add' ? current + value : value;
      markDay(habit, date, finalValue);

      if (isSameDay(date, new Date())) {
        const percentage = habit.target_value ? (finalValue / habit.target_value) * 100 : 0;
        showResultMessage(
          formatProgressMessage(
            current > 0,
            mode,
            value,
            finalValue,
            habit.target_unit || '',
            percentage
          )
        );
        setTimeout(() => celebrate(), 1000);
      }
    },
    [
      selectedHabit,
      selectedDate,
      clearSelection,
      findCompletion,
      markDay,
      showResultMessage,
      celebrate,
    ]
  );

  const cancelProgress = useCallback(() => {
    setShowProgressModal(false);
    clearSelection();
  }, [clearSelection]);

  const handleConfirmUncomplete = useCallback(() => {
    const habit = selectedHabit;
    const date = selectedDate;
    setShowUncompleteConfirm(false);
    clearSelection();
    if (!habit || !date) return;

    unmarkDay(habit, date);
    if (isSameDay(date, new Date())) showResultMessage('Hábito desmarcado');
  }, [selectedHabit, selectedDate, clearSelection, unmarkDay, showResultMessage]);

  const cancelUncomplete = useCallback(() => {
    setShowUncompleteConfirm(false);
    clearSelection();
  }, [clearSelection]);

  // Valor já registrado no dia escolhido (antes, o modal mostrava sempre o
  // valor de hoje, mesmo ao registrar um dia passado).
  const progressCurrentValue =
    selectedHabit && selectedDate
      ? (findCompletion(selectedHabit.id, selectedDate)?.value_achieved ?? 0)
      : 0;

  return {
    showSuccessToast,
    setShowSuccessToast,
    successMessage,
    showUncompleteConfirm,
    handleConfirmUncomplete,
    cancelUncomplete,
    showProgressModal,
    selectedHabit,
    progressCurrentValue,
    handleConfirmProgress,
    cancelProgress,
    handleDayPress,
  };
}
