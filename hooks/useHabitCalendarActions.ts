import { useCallback, useState } from 'react';
import { isSameDay } from 'date-fns';
import { Completion, Habit } from '@/types/database';
import { completionDayFields, completionOutbox } from '@/services/completionOutbox';
import { hapticFeedback } from '@/utils/haptics';

function makeOptimisticId(habitId: string, date: Date): string {
  return `optimistic-${habitId}-${date.getTime()}-${Math.random().toString(36).slice(2)}`;
}

const SAVE_FAILED_MESSAGE = 'Não foi possível salvar a marcação';

interface UseHabitCalendarActionsParams {
  habit: Habit | null;
  userId: string | undefined;
  completions: Completion[];
  onSuccessMessage: (message: string) => void;
  // Mutação otimista local (de useHabitDetails), para refletir as marcações
  // na UI sem esperar a rede nem disparar o loading de tela cheia.
  addOptimisticCompletion: (completion: Completion) => void;
  removeCompletionById: (id: string) => void;
  removeCompletionForDate: (date: Date) => void;
  // Sincroniza só o streak em segundo plano, sem re-disparar loading.
  refetchStreak: () => Promise<void>;
}

/**
 * Marcações pelo calendário dos detalhes. A UI muda na hora e a operação vai
 * para a fila de saída (services/completionOutbox.ts), que a envia agora ou,
 * sem conexão, depois; a UI só reverte em erro definitivo.
 */
export function useHabitCalendarActions({
  habit,
  userId,
  completions,
  onSuccessMessage,
  addOptimisticCompletion,
  removeCompletionById,
  removeCompletionForDate,
  refetchStreak,
}: UseHabitCalendarActionsParams) {
  const [showUncompleteConfirm, setShowUncompleteConfirm] = useState(false);
  const [pendingUncompleteDate, setPendingUncompleteDate] = useState<Date | null>(null);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [pendingProgressDate, setPendingProgressDate] = useState<Date | null>(null);
  const [pendingProgressCurrentValue, setPendingProgressCurrentValue] = useState(0);

  const findCompletion = useCallback((date: Date) => {
    return completions.find(c => isSameDay(new Date(c.completed_at), date));
  }, [completions]);

  /** Marca o dia (ou grava o valor final, em hábitos com meta). */
  const markDay = useCallback((date: Date, value: number | null) => {
    if (!habit || !userId) return;
    const existing = findCompletion(date);
    const fields = completionDayFields(date);
    const optimisticId = makeOptimisticId(habit.id, date);

    if (existing) removeCompletionForDate(date);
    addOptimisticCompletion({
      id: optimisticId,
      habit_id: habit.id,
      completed_at: fields.completedAt,
      value_achieved: value,
      was_synced: false,
      created_at: new Date().toISOString(),
    });

    void completionOutbox
      .enqueue({ userId, habitId: habit.id, kind: 'complete', value, ...fields })
      .then(result => {
        if (result === 'synced') void refetchStreak();
        if (result === 'dropped') {
          removeCompletionById(optimisticId);
          if (existing) addOptimisticCompletion(existing);
          onSuccessMessage(SAVE_FAILED_MESSAGE);
        }
      });
  }, [habit, userId, findCompletion, removeCompletionForDate, addOptimisticCompletion, removeCompletionById, refetchStreak, onSuccessMessage]);

  const handleCalendarDayPress = useCallback((date: Date, isCompleted: boolean, currentValue?: number) => {
    if (!habit || !userId) return;

    // Hábito com meta numérica: sempre abre o modal de progresso
    if (habit.has_target) {
      setPendingProgressDate(date);
      setPendingProgressCurrentValue(currentValue || 0);
      setShowProgressModal(true);
      return;
    }

    // Hábito sem meta, já completado: abre confirmação de desmarcar
    if (isCompleted) {
      setPendingUncompleteDate(date);
      setShowUncompleteConfirm(true);
      return;
    }

    markDay(date, null);
    hapticFeedback.success();
  }, [habit, userId, markDay]);

  const handleConfirmUncomplete = useCallback(() => {
    const date = pendingUncompleteDate;
    setShowUncompleteConfirm(false);
    setPendingUncompleteDate(null);
    if (!habit || !userId || !date) return;

    const existing = findCompletion(date);
    removeCompletionForDate(date);

    void completionOutbox
      .enqueue({ userId, habitId: habit.id, kind: 'uncomplete', value: null, ...completionDayFields(date) })
      .then(result => {
        if (result === 'synced') void refetchStreak();
        if (result === 'dropped') {
          if (existing) addOptimisticCompletion(existing);
          onSuccessMessage(SAVE_FAILED_MESSAGE);
        }
      });
  }, [habit, userId, pendingUncompleteDate, findCompletion, removeCompletionForDate, addOptimisticCompletion, refetchStreak, onSuccessMessage]);

  const cancelUncomplete = useCallback(() => {
    setShowUncompleteConfirm(false);
    setPendingUncompleteDate(null);
  }, []);

  const handleProgressConfirm = useCallback((value: number, mode: 'add' | 'replace') => {
    const date = pendingProgressDate;
    const finalValue = mode === 'add' ? pendingProgressCurrentValue + value : value;
    setShowProgressModal(false);
    setPendingProgressDate(null);
    setPendingProgressCurrentValue(0);
    if (!date) return;

    // A fila grava o valor final direto (atualiza o registro do dia, se
    // houver) — antes era "apagar e recriar", em duas requisições.
    markDay(date, finalValue);
  }, [pendingProgressDate, pendingProgressCurrentValue, markDay]);

  const cancelProgress = useCallback(() => {
    setShowProgressModal(false);
    setPendingProgressDate(null);
    setPendingProgressCurrentValue(0);
  }, []);

  return {
    handleCalendarDayPress,
    showUncompleteConfirm,
    handleConfirmUncomplete,
    cancelUncomplete,
    showProgressModal,
    pendingProgressCurrentValue,
    handleProgressConfirm,
    cancelProgress,
  };
}
