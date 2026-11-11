import { useCallback, useState } from 'react';
import { Completion } from '@/types/database';
import { retroactiveCompletionService } from '@/services/retroactiveCompletionService';
import { hapticFeedback } from '@/utils/haptics';

function makeOptimisticId(habitId: string, date: Date): string {
  return `optimistic-${habitId}-${date.getTime()}-${Math.random().toString(36).slice(2)}`;
}

interface UseHabitCalendarActionsParams {
  // Tipagem do hábito do projeto (Habit) — usando `any` aqui para não
  // depender de um import específico que pode variar; substitua pelo
  // tipo real (`Habit` de '@/types/database') se preferir tipagem estrita.
  habit: any;
  userId: string | undefined;
  completions: Completion[];
  onSuccessMessage: (message: string) => void;
  // Mutação otimista local (de useHabitDetails), para refletir
  // marcações/desmarcações retroativas na UI sem esperar a rede nem
  // disparar o loading de tela cheia.
  addOptimisticCompletion: (completion: Completion) => void;
  removeCompletionById: (id: string) => void;
  removeCompletionForDate: (date: Date) => void;
  // Sincroniza só o streak em segundo plano, sem re-disparar loading.
  refetchStreak: () => Promise<void>;
}

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

    // Feedback imediato: preenche o dia no calendário na hora.
    const optimisticId = makeOptimisticId(habit.id, date);
    addOptimisticCompletion({
      id: optimisticId,
      habit_id: habit.id,
      completed_at: date.toISOString(),
      value_achieved: null,
      was_synced: false,
      created_at: new Date().toISOString(),
    });
    hapticFeedback.success();

    // Requisição em segundo plano — não bloqueia a UI, permite marcar
    // o próximo dia imediatamente.
    (async () => {
      const result = await retroactiveCompletionService.completeRetroactively(habit, date, userId);
      if (result.success) {
        await retroactiveCompletionService.recalculateStreak(habit.id);
        await refetchStreak();
      } else {
        removeCompletionById(optimisticId);
        onSuccessMessage(result.message);
      }
    })();
  }, [habit, userId, addOptimisticCompletion, removeCompletionById, refetchStreak, onSuccessMessage]);

  const handleConfirmUncomplete = useCallback(() => {
    if (!habit || !userId || !pendingUncompleteDate) {
      setShowUncompleteConfirm(false);
      setPendingUncompleteDate(null);
      return;
    }

    const date = pendingUncompleteDate;
    // Guarda a completion atual para restaurar se a requisição falhar.
    const existingCompletion = completions.find(c => {
      const d = new Date(c.completed_at);
      return d.toDateString() === date.toDateString();
    });

    setShowUncompleteConfirm(false);
    setPendingUncompleteDate(null);

    // Feedback imediato: o dia esvazia na hora.
    removeCompletionForDate(date);

    (async () => {
      const result = await retroactiveCompletionService.uncompleteRetroactively(habit, date, userId);
      if (result.success) {
        await retroactiveCompletionService.recalculateStreak(habit.id);
        await refetchStreak();
      } else {
        if (existingCompletion) addOptimisticCompletion(existingCompletion);
        onSuccessMessage(result.message);
      }
    })();
  }, [habit, userId, pendingUncompleteDate, completions, removeCompletionForDate, addOptimisticCompletion, refetchStreak, onSuccessMessage]);

  const cancelUncomplete = useCallback(() => {
    setShowUncompleteConfirm(false);
    setPendingUncompleteDate(null);
  }, []);

  const handleProgressConfirm = useCallback((value: number, mode: 'add' | 'replace') => {
    if (!habit || !userId || !pendingProgressDate) {
      setShowProgressModal(false);
      setPendingProgressDate(null);
      setPendingProgressCurrentValue(0);
      return;
    }

    const date = pendingProgressDate;
    const finalValue = mode === 'add' ? pendingProgressCurrentValue + value : value;
    const hadExisting = pendingProgressCurrentValue > 0;
    const optimisticId = makeOptimisticId(habit.id, date);
    // Guarda a completion atual para restaurar se a requisição falhar.
    const existingCompletion = hadExisting
      ? completions.find(c => new Date(c.completed_at).toDateString() === date.toDateString())
      : undefined;

    setShowProgressModal(false);
    setPendingProgressDate(null);
    setPendingProgressCurrentValue(0);

    // Feedback imediato: mostra o dia já com o valor final confirmado.
    if (hadExisting) {
      removeCompletionForDate(date);
    }
    addOptimisticCompletion({
      id: optimisticId,
      habit_id: habit.id,
      completed_at: date.toISOString(),
      value_achieved: finalValue,
      was_synced: false,
      created_at: new Date().toISOString(),
    });

    (async () => {
      // Se já havia uma completion nesse dia, apaga antes de recriar
      // (mesma lógica do fluxo original).
      if (hadExisting) {
        const removed = await retroactiveCompletionService.uncompleteRetroactively(habit, date, userId);
        if (!removed.success) {
          // O valor antigo continua no banco: desfaz a troca na UI.
          removeCompletionById(optimisticId);
          if (existingCompletion) addOptimisticCompletion(existingCompletion);
          onSuccessMessage(removed.message);
          return;
        }
      }

      const result = await retroactiveCompletionService.completeRetroactively(habit, date, userId, finalValue);

      if (result.success) {
        await retroactiveCompletionService.recalculateStreak(habit.id);
        await refetchStreak();
      } else {
        // Se o valor antigo já foi apagado, não há o que restaurar: o
        // dia fica vazio, que é o estado real do banco.
        removeCompletionById(optimisticId);
        onSuccessMessage(result.message);
      }
    })();
  }, [habit, userId, completions, pendingProgressDate, pendingProgressCurrentValue, addOptimisticCompletion, removeCompletionById, removeCompletionForDate, refetchStreak, onSuccessMessage]);

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