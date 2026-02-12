// hooks/useCompletions.ts
import { useState, useEffect } from 'react';
import { supabase } from '@/services/supabase';
import { Completion, CompletionInsert, Habit, Streak } from '@/types/database';
import { useAuth } from './useAuth';
import { startOfDay, endOfDay } from 'date-fns';

export const useCompletions = () => {
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchTodayCompletions = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const today = new Date();
      const startOfToday = startOfDay(today).toISOString();
      const endOfToday = endOfDay(today).toISOString();

      const { data, error: fetchError } = await supabase
        .from('completions')
        .select(`
          *,
          habits!inner (*)
        `)
        .eq('habits.user_id', user.id)
        .gte('completed_at', startOfToday)
        .lte('completed_at', endOfToday);

      if (fetchError) throw fetchError;

      setCompletions(data as Completion[] || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar completions');
    } finally {
      setLoading(false);
    }
  };

  const isCompletedToday = (habitId: string): boolean => {
    return completions.some(c => c.habit_id === habitId);
  };

  const calculateProgressPercentage = (currentValue: number, targetValue: number | null): number => {
    if (!targetValue || targetValue === 0) return 0;
    return (currentValue / targetValue) * 100;
  };

  const completeHabit = async (
    habit: Habit,
    streak?: Streak,
    achievedValue?: number,
    mode: 'add' | 'replace' = 'replace'
  ) => {
    try {
      if (!user) throw new Error('Usuário não autenticado');

      if (habit.has_target && !achievedValue) {
        return { data: null, error: 'Valor da meta é obrigatório para este hábito' };
      }

      const today = new Date();
      const startOfToday = startOfDay(today).toISOString();
      const endOfToday = endOfDay(today).toISOString();

      const { data: existingCompletionData, error: fetchExistingError } = await supabase
        .from('completions')
        .select('*')
        .eq('habit_id', habit.id)
        .gte('completed_at', startOfToday)
        .lte('completed_at', endOfToday)
        .maybeSingle();

      if (fetchExistingError) throw fetchExistingError;

      const existingCompletion = existingCompletionData as Completion | null;

      // Se já existe e tem meta numérica, ATUALIZA
      if (existingCompletion && habit.has_target && achievedValue) {
        return await updateCompletion(
          existingCompletion.id,
          habit,
          streak,
          achievedValue,
          mode,
          existingCompletion.value_achieved || 0
        );
      }

      // Se já existe e não é mensurável, não faz nada
      if (existingCompletion && !habit.has_target) {
        return { data: null, error: 'Hábito já completado hoje' };
      }

      const finalValue = achievedValue || 0;

      // Criar completion
      const completionData: CompletionInsert = {
        habit_id: habit.id,
        completed_at: new Date().toISOString(),
        value_achieved: achievedValue || null,
        was_synced: true,
      };

      const { data: completionResponse, error: completionError } = await (supabase.from('completions') as any)
        .insert(completionData)
        .select()
        .single();

      if (completionError) throw completionError;

      const completion = completionResponse as Completion;

      // Adicionar à lista local
      setCompletions(prev => [...prev, completion]);

      return {
        data: {
          completion,
          achievedValue: finalValue,
          percentage: habit.target_value ? calculateProgressPercentage(finalValue, habit.target_value) : 100,
        },
        error: null,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao completar hábito';
      setError(errorMsg);
      return { data: null, error: errorMsg };
    }
  };

  const updateCompletion = async (
    completionId: string,
    habit: Habit,
    streak: Streak | undefined,
    newValue: number,
    mode: 'add' | 'replace',
    currentValue: number
  ) => {
    try {
      if (!user) throw new Error('Usuário não autenticado');

      const finalValue = mode === 'add' ? currentValue + newValue : newValue;

      const completionUpdate = {
        value_achieved: finalValue,
      };

      const { data: updatedCompletionData, error: updateError } = await (supabase.from('completions') as any)
        .update(completionUpdate)
        .eq('id', completionId)
        .select()
        .single();

      if (updateError) throw updateError;

      const updatedCompletion = updatedCompletionData as Completion;

      // Atualizar lista local
      setCompletions(prev =>
        prev.map(c => c.id === completionId ? updatedCompletion : c)
      );

      return {
        data: {
          completion: updatedCompletion,
          achievedValue: finalValue,
          percentage: habit.target_value ? calculateProgressPercentage(finalValue, habit.target_value) : 100,
          wasUpdate: true,
        },
        error: null,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao atualizar progresso';
      setError(errorMsg);
      return { data: null, error: errorMsg };
    }
  };

  const uncompleteHabit = async (habitId: string) => {
    try {
      if (!user) throw new Error('Usuário não autenticado');

      const today = new Date();
      const startOfToday = startOfDay(today).toISOString();
      const endOfToday = endOfDay(today).toISOString();

      const { data: todayCompletionData, error: fetchError } = await supabase
        .from('completions')
        .select('*')
        .eq('habit_id', habitId)
        .gte('completed_at', startOfToday)
        .lte('completed_at', endOfToday)
        .single();

      if (fetchError) throw fetchError;
      if (!todayCompletionData) throw new Error('Completion não encontrada');

      const todayCompletion = todayCompletionData as Completion;
      const completionId = todayCompletion.id;

      // Deletar completion
      const { error: deleteError } = await supabase
        .from('completions')
        .delete()
        .eq('id', completionId);

      if (deleteError) throw deleteError;

      // Atualizar streak
      const { data: streakData, error: streakFetchError } = await supabase
        .from('streaks')
        .select('*')
        .eq('habit_id', habitId)
        .maybeSingle();

      if (!streakFetchError && streakData) {
        const streak = streakData as Streak;
        const newStreak = Math.max(0, (streak.current_streak || 0) - 1);

        await (supabase.from('streaks') as any)
          .update({ current_streak: newStreak })
          .eq('habit_id', habitId);
      }

      // Remover da lista local
      setCompletions(prev => prev.filter(c => c.id !== completionId));

      return { error: null };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao descompletar hábito';
      setError(errorMsg);
      return { error: errorMsg };
    }
  };

  const getCompletion = (habitId: string): Completion | undefined => {
    return completions.find(c => c.habit_id === habitId);
  };

  const getProgressStatus = (habit: Habit): {
    hasProgress: boolean;
    percentage: number;
  } => {
    const completion = getCompletion(habit.id);

    if (!completion || !habit.has_target || !habit.target_value) {
      return {
        hasProgress: !!completion,
        percentage: completion ? 100 : 0,
      };
    }

    const currentValue = completion.value_achieved || 0;
    const percentage = calculateProgressPercentage(currentValue, habit.target_value);

    return {
      hasProgress: true,
      percentage,
    };
  };

  useEffect(() => {
    if (user) {
      fetchTodayCompletions();
    }
  }, [user]);

  return {
    completions,
    loading,
    error,
    completeHabit,
    uncompleteHabit,
    isCompletedToday,
    getCompletion,
    getProgressStatus,
    refetch: fetchTodayCompletions,
  };
};