import { useCallback, useState } from 'react';
import { Habit, Completion } from '@/types/database';
import { retroactiveCompletionService } from '@/services/retroactiveCompletionService';

function formatProgressMessage(
  isUpdate: boolean,
  mode: 'add' | 'replace' | undefined,
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

interface UseHabitCompletionActionsParams {
  habits: Habit[];
  userId: string | undefined;
  weeklyCompletions: Completion[];
  selectedWeekStart: Date;
  getStreak: (habitId: string) => any; // Streak do projeto
  completeHabit: (habit: Habit, streak: any, value?: number, mode?: 'add' | 'replace') => Promise<{ data: any; error: any }>;
  uncompleteHabit: (habitId: string) => Promise<{ error: any }>;
  isCompletedToday: (habitId: string) => boolean;
  updateStreakWithFrequency: (habitId: string, habit: Habit, completed: boolean) => Promise<{ data?: any }>;
  fetchStreaks: (habitIds: string[]) => Promise<void>;
  celebrate: () => void;
  refetchCompletions: () => Promise<void>;
  refetchWeeklyCompletions: (weekStart: Date) => Promise<void>;
  // Mutação otimista local (de useWeeklyCompletions), para refletir
  // marcações/desmarcações retroativas na UI sem esperar a rede.
  addOptimisticCompletion: (completion: Completion) => void;
  removeCompletionById: (id: string) => void;
  removeCompletionForDate: (habitId: string, date: Date) => void;
}

export function useHabitCompletionActions({
  habits,
  userId,
  weeklyCompletions,
  selectedWeekStart,
  getStreak,
  completeHabit,
  uncompleteHabit,
  isCompletedToday,
  updateStreakWithFrequency,
  fetchStreaks,
  celebrate,
  refetchCompletions,
  refetchWeeklyCompletions,
  addOptimisticCompletion,
  removeCompletionById,
  removeCompletionForDate,
}: UseHabitCompletionActionsParams) {
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showUncompleteConfirm, setShowUncompleteConfirm] = useState(false);
  const [selectedHabitId, setSelectedHabitId] = useState('');
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);

  // Substitui o antigo (window as any).__tempRetroDate. Aquele padrão
  // não era limpo em todo caminho de cancelamento — em especial, o
  // "Cancelar" da confirmação de desmarcar dia passado nunca zerava a
  // variável, então uma data retroativa podia vazar para a próxima
  // interação com o modal de meta numérica. Aqui cancelUncomplete e
  // cancelProgress sempre limpam este estado.
  const [pendingRetroDate, setPendingRetroDate] = useState<Date | null>(null);

  const showResultMessage = useCallback((message: string) => {
    setSuccessMessage(message);
    setShowSuccessToast(true);
  }, []);

  const handleEditProgress = useCallback((habitId: string) => {
    const habit = habits.find(h => h.id === habitId);
    if (!habit || !habit.has_target) return;
    setSelectedHabit(habit);
    setShowProgressModal(true);
  }, [habits]);

  // ===== CONCLUSÃO RETROATIVA — hábito com meta (via modal) =====
  const handleConfirmProgress = useCallback((value: number, mode: 'add' | 'replace') => {
    if (!selectedHabit || !userId) return;

    if (pendingRetroDate) {
      const habit = selectedHabit;
      const date = pendingRetroDate;
      const optimisticId = makeOptimisticId(habit.id, date);

      // Feedback imediato: marca o dia como feito na UI antes de
      // esperar a resposta do servidor.
      addOptimisticCompletion({
        id: optimisticId,
        habit_id: habit.id,
        completed_at: date.toISOString(),
        value_achieved: value,
        was_synced: false,
        created_at: new Date().toISOString(),
      });
      setPendingRetroDate(null);
      setShowProgressModal(false);
      setSelectedHabit(null);

      // Requisição em segundo plano — não bloqueia a UI, permite
      // seguir marcando o próximo dia imediatamente.
      (async () => {
        const result = await retroactiveCompletionService.completeRetroactively(habit, date, userId, value);
        if (result.success) {
          await retroactiveCompletionService.recalculateStreak(habit.id);
          await fetchStreaks([habit.id]);
        } else {
          removeCompletionById(optimisticId);
          showResultMessage(result.message);
        }
      })();
      return;
    }

    (async () => {
      const streak = getStreak(selectedHabit.id);
      const { data, error } = await completeHabit(selectedHabit, streak, value, mode);

      if (!error && data) {
        await updateStreakWithFrequency(selectedHabit.id, selectedHabit, true);
        const finalValue = data.achievedValue || 0;
        const percentage = selectedHabit.target_value
          ? (finalValue / selectedHabit.target_value) * 100
          : 0;
        const isUpdate = 'wasUpdate' in data && data.wasUpdate;

        showResultMessage(formatProgressMessage(isUpdate, mode, value, finalValue, selectedHabit.target_unit || '', percentage));
        setTimeout(() => celebrate(), 1000);
        await refetchWeeklyCompletions(selectedWeekStart);
      }
    })();

    setShowProgressModal(false);
    setSelectedHabit(null);
  }, [selectedHabit, userId, pendingRetroDate, addOptimisticCompletion, removeCompletionById, fetchStreaks, showResultMessage, getStreak, completeHabit, updateStreakWithFrequency, celebrate, refetchWeeklyCompletions, selectedWeekStart]);

  const cancelProgress = useCallback(() => {
    setShowProgressModal(false);
    setSelectedHabit(null);
    setPendingRetroDate(null);
  }, []);

  // ===== CONCLUSÃO RETROATIVA — hábito sem meta (toque direto no dia) =====
  const handleRetroactiveComplete = useCallback((habit: Habit, date: Date) => {
    if (!userId) return;

    const optimisticId = makeOptimisticId(habit.id, date);

    // Feedback imediato: preenche o dia no card na hora.
    addOptimisticCompletion({
      id: optimisticId,
      habit_id: habit.id,
      completed_at: date.toISOString(),
      value_achieved: null,
      was_synced: false,
      created_at: new Date().toISOString(),
    });

    // Requisição em segundo plano — permite tocar no próximo dia
    // imediatamente, sem esperar esta terminar.
    (async () => {
      const result = await retroactiveCompletionService.completeRetroactively(habit, date, userId);
      if (result.success) {
        await retroactiveCompletionService.recalculateStreak(habit.id);
        await fetchStreaks([habit.id]);
      } else {
        // Reverte a marcação otimista e avisa o usuário.
        removeCompletionById(optimisticId);
        showResultMessage(result.message);
      }
    })();
  }, [userId, addOptimisticCompletion, removeCompletionById, fetchStreaks, showResultMessage]);

  const handleComplete = useCallback(async (habitId: string, achievedValue?: number, mode?: 'add' | 'replace') => {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;

    if (habit.has_target) {
      if (achievedValue !== undefined && achievedValue > 0 && mode) {
        const streak = getStreak(habitId);
        const { data, error } = await completeHabit(habit, streak, achievedValue, mode);
        if (!error && data) {
          await updateStreakWithFrequency(habitId, habit, true);
          const finalValue = data.achievedValue || 0;
          const percentage = habit.target_value ? (finalValue / habit.target_value) * 100 : 0;
          const isUpdate = 'wasUpdate' in data && data.wasUpdate;
          showResultMessage(formatProgressMessage(isUpdate, mode, achievedValue, finalValue, habit.target_unit || '', percentage));
          setTimeout(() => celebrate(), 1000);
          await refetchWeeklyCompletions(selectedWeekStart);
        } else if (error) {
          showResultMessage('Erro ao registrar progresso');
        }
      }
      return;
    }

    const isCompleted = isCompletedToday(habitId);
    if (isCompleted) {
      setSelectedHabitId(habitId);
      setShowUncompleteConfirm(true);
      return;
    }

    const streak = getStreak(habitId);
    const { data, error } = await completeHabit(habit, streak, achievedValue, mode);

    if (error) {
      showResultMessage('Erro ao completar hábito');
    } else if (data) {
      const streakResult = await updateStreakWithFrequency(habitId, habit, true);
      const updatedStreak = streakResult.data;
      const streakDays = updatedStreak?.current_streak || 0;
      showResultMessage(streakDays > 1 ? `Completado! ${streakDays} dias seguidos!` : 'Completado!');
      setTimeout(() => celebrate(), 1000);
      await refetchWeeklyCompletions(selectedWeekStart);
    }
  }, [habits, getStreak, completeHabit, updateStreakWithFrequency, showResultMessage, celebrate, refetchWeeklyCompletions, selectedWeekStart, isCompletedToday]);

  const handleDayPress = useCallback(async (habit: Habit, date: Date) => {
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    const isPast = date < today && !isToday;

    if (isPast && userId) {
      const completion = weeklyCompletions.find(c => {
        const compDate = new Date(c.completed_at);
        return compDate.toDateString() === date.toDateString() && c.habit_id === habit.id;
      });

      if (completion) {
        setSelectedHabitId(habit.id);
        setPendingRetroDate(date);
        setShowUncompleteConfirm(true);
      } else {
        if (habit.has_target) {
          setSelectedHabit(habit);
          setPendingRetroDate(date);
          setShowProgressModal(true);
        } else {
          // Não aguarda: a marcação é otimista e roda em segundo
          // plano, então o usuário já pode tocar no próximo dia.
          handleRetroactiveComplete(habit, date);
        }
      }
      return;
    }

    if (isToday) {
      if (habit.has_target) {
        handleEditProgress(habit.id);
      } else {
        await handleComplete(habit.id);
      }
    }
  }, [userId, weeklyCompletions, handleRetroactiveComplete, handleEditProgress, handleComplete]);

  // ===== DESMARCAR RETROATIVO =====
  const handleConfirmUncomplete = useCallback(async () => {
    const habit = habits.find(h => h.id === selectedHabitId);
    if (!habit || !userId) {
      setShowUncompleteConfirm(false);
      setSelectedHabitId('');
      setPendingRetroDate(null);
      return;
    }

    if (pendingRetroDate) {
      const date = pendingRetroDate;
      // Guarda a completion atual para restaurar se a requisição falhar.
      const existingCompletion = weeklyCompletions.find(c =>
        c.habit_id === habit.id && new Date(c.completed_at).toDateString() === date.toDateString()
      );

      // Feedback imediato: some com a marcação do dia na hora.
      removeCompletionForDate(habit.id, date);
      setPendingRetroDate(null);
      setShowUncompleteConfirm(false);
      setSelectedHabitId('');

      (async () => {
        const result = await retroactiveCompletionService.uncompleteRetroactively(habit, date, userId);
        if (result.success) {
          await retroactiveCompletionService.recalculateStreak(habit.id);
          await fetchStreaks([habit.id]);
        } else {
          // Reverte: restaura a completion removida e avisa o usuário.
          if (existingCompletion) addOptimisticCompletion(existingCompletion);
          showResultMessage(result.message);
        }
      })();
      return;
    }

    const { error } = await uncompleteHabit(selectedHabitId);
    if (error) {
      showResultMessage('Erro ao desmarcar hábito');
    } else {
      await updateStreakWithFrequency(selectedHabitId, habit, false);
      showResultMessage('Hábito desmarcado');
      await refetchWeeklyCompletions(selectedWeekStart);
    }

    setShowUncompleteConfirm(false);
    setSelectedHabitId('');
  }, [habits, selectedHabitId, userId, pendingRetroDate, weeklyCompletions, removeCompletionForDate, addOptimisticCompletion, fetchStreaks, showResultMessage, uncompleteHabit, updateStreakWithFrequency, refetchWeeklyCompletions, selectedWeekStart]);

  const cancelUncomplete = useCallback(() => {
    setShowUncompleteConfirm(false);
    setSelectedHabitId('');
    setPendingRetroDate(null);
  }, []);

  return {
    showSuccessToast, setShowSuccessToast, successMessage,
    showUncompleteConfirm, handleConfirmUncomplete, cancelUncomplete,
    showProgressModal, selectedHabit, handleConfirmProgress, cancelProgress,
    handleDayPress,
    handleComplete,
  };
}