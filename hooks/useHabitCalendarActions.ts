import { useCallback, useState } from 'react';
import { retroactiveCompletionService } from '@/services/retroactiveCompletionService';
import { hapticFeedback } from '@/utils/haptics';

interface UseHabitCalendarActionsParams {
  // Tipagem do hábito do projeto (Habit) — usando `any` aqui para não
  // depender de um import específico que pode variar; substitua pelo
  // tipo real (`Habit` de '@/types/database') se preferir tipagem estrita.
  habit: any;
  userId: string | undefined;
  onSuccessMessage: (message: string) => void;
  refetch: () => Promise<void>;
}

export function useHabitCalendarActions({ habit, userId, onSuccessMessage, refetch }: UseHabitCalendarActionsParams) {
  const [showUncompleteConfirm, setShowUncompleteConfirm] = useState(false);
  const [pendingUncompleteDate, setPendingUncompleteDate] = useState<Date | null>(null);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [pendingProgressDate, setPendingProgressDate] = useState<Date | null>(null);
  const [pendingProgressCurrentValue, setPendingProgressCurrentValue] = useState(0);

  const handleCalendarDayPress = useCallback(async (date: Date, isCompleted: boolean, currentValue?: number) => {
    if (!habit || !userId) return;

    // Hábito com meta numérica: sempre abre o modal de progresso
    if (habit.has_target) {
      setPendingProgressDate(date);
      setPendingProgressCurrentValue(currentValue || 0);
      setShowProgressModal(true);
      return;
    }

    // Hábito sem meta: alterna conclusão
    if (isCompleted) {
      setPendingUncompleteDate(date);
      setShowUncompleteConfirm(true);
      return;
    }

    const result = await retroactiveCompletionService.completeRetroactively(habit, date, userId);

    if (result.success) {
      await retroactiveCompletionService.recalculateStreak(habit.id);
      hapticFeedback.success();
      onSuccessMessage(result.message);
      await refetch();
    } else {
      onSuccessMessage(result.message);
    }
  }, [habit, userId, onSuccessMessage, refetch]);

  const handleConfirmUncomplete = useCallback(async () => {
    if (!habit || !userId || !pendingUncompleteDate) {
      setShowUncompleteConfirm(false);
      setPendingUncompleteDate(null);
      return;
    }

    const result = await retroactiveCompletionService.uncompleteRetroactively(habit, pendingUncompleteDate, userId);

    if (result.success) {
      await retroactiveCompletionService.recalculateStreak(habit.id);
      hapticFeedback.success();
      onSuccessMessage(result.message);
      await refetch();
    } else {
      onSuccessMessage(result.message);
    }

    setShowUncompleteConfirm(false);
    setPendingUncompleteDate(null);
  }, [habit, userId, pendingUncompleteDate, onSuccessMessage, refetch]);

  const cancelUncomplete = useCallback(() => {
    setShowUncompleteConfirm(false);
    setPendingUncompleteDate(null);
  }, []);

  const handleProgressConfirm = useCallback(async (value: number, mode: 'add' | 'replace') => {
    if (!habit || !userId || !pendingProgressDate) {
      setShowProgressModal(false);
      setPendingProgressDate(null);
      setPendingProgressCurrentValue(0);
      return;
    }

    const finalValue = mode === 'add' ? pendingProgressCurrentValue + value : value;

    // Se já existe uma conclusão registrada, apaga antes de recriar
    if (pendingProgressCurrentValue > 0) {
      await retroactiveCompletionService.uncompleteRetroactively(habit, pendingProgressDate, userId);
    }

    const result = await retroactiveCompletionService.completeRetroactively(habit, pendingProgressDate, userId, finalValue);

    if (result.success) {
      await retroactiveCompletionService.recalculateStreak(habit.id);
      hapticFeedback.success();
      onSuccessMessage(result.message);
      await refetch();
    } else {
      onSuccessMessage(result.message);
    }

    setShowProgressModal(false);
    setPendingProgressDate(null);
    setPendingProgressCurrentValue(0);
  }, [habit, userId, pendingProgressDate, pendingProgressCurrentValue, onSuccessMessage, refetch]);

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