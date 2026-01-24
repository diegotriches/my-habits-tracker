// hooks/useCompletions.ts
import { useState, useEffect } from 'react';
import { supabase } from '@/services/supabase';
import { Completion, CompletionInsert, Habit, Streak } from '@/types/database';
import { useAuth } from './useAuth';
import { calculateCompletionPoints } from '@/utils/points';
import { startOfDay, endOfDay } from 'date-fns';

export const useCompletions = () => {
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Buscar completions de hoje
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

  // Verificar se um hábito foi completado hoje
  const isCompletedToday = (habitId: string): boolean => {
    return completions.some(c => c.habit_id === habitId);
  };

  // 🆕 Calcular percentual de progresso
  const calculateProgressPercentage = (currentValue: number, targetValue: number | null): number => {
    if (!targetValue || targetValue === 0) return 0;
    return (currentValue / targetValue) * 100;
  };

  // 🆕 Verificar se deve pontuar (≥ 100% da meta)
  const shouldEarnPoints = (habit: Habit, achievedValue: number): boolean => {
    if (!habit.has_target || !habit.target_value) {
      return true; // Hábitos binários sempre pontuam
    }
    
    const percentage = calculateProgressPercentage(achievedValue, habit.target_value);
    return percentage >= 100;
  };

  // 🆕 Verificar tratamento de streak baseado no progresso
  const getStreakAction = (habit: Habit, achievedValue: number): 'increment' | 'freeze' | 'reset' => {
    if (!habit.has_target || !habit.target_value) {
      return 'increment'; // Hábitos binários sempre incrementam
    }

    const percentage = calculateProgressPercentage(achievedValue, habit.target_value);
    
    if (percentage >= 100) return 'increment'; // Meta completa
    if (percentage >= 50) return 'freeze';     // Progresso parcial bom
    return 'reset';                            // Progresso muito baixo
  };

  // Completar ou atualizar hábito
  const completeHabit = async (
    habit: Habit, 
    streak?: Streak, 
    achievedValue?: number,
    mode: 'add' | 'replace' = 'replace'
  ) => {
    try {
      if (!user) throw new Error('Usuário não autenticado');

      // Validação de meta numérica
      if (habit.has_target && !achievedValue) {
        return { data: null, error: 'Valor da meta é obrigatório para este hábito' };
      }

      // Buscar completion existente
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

      // 🆕 Determinar se deve pontuar
      const finalValue = achievedValue || 0;
      const earnPoints = shouldEarnPoints(habit, finalValue);
      const streakAction = getStreakAction(habit, finalValue);

      // Calcular pontos (0 se não completou meta)
      let pointsEarned = 0;
      
      if (earnPoints) {
        const currentStreak = streak?.current_streak || 0;
        pointsEarned = calculateCompletionPoints(habit, currentStreak);

        // Bônus adicional se atingiu 100% da meta
        if (habit.has_target && habit.target_value) {
          const percentage = calculateProgressPercentage(finalValue, habit.target_value);
          if (percentage >= 100) {
            const bonus = Math.floor(pointsEarned * 0.2);
            pointsEarned += bonus;
          }
        }
      }

      // Criar completion
      const completionData: CompletionInsert = {
        habit_id: habit.id,
        completed_at: new Date().toISOString(),
        value_achieved: achievedValue || null,
        points_earned: pointsEarned,
        was_synced: true,
      };

      const { data: completionResponse, error: completionError } = await (supabase.from('completions') as any)
        .insert(completionData)
        .select()
        .single();

      if (completionError) throw completionError;

      const completion = completionResponse as Completion;

      // 🆕 Atualizar pontos do perfil (apenas se ganhou pontos)
      let newTotalPoints = 0;
      if (earnPoints && pointsEarned > 0) {
        const { data: profileData, error: profileFetchError } = await supabase
          .from('profiles')
          .select('total_points')
          .eq('id', user.id)
          .single();

        if (profileFetchError) throw profileFetchError;

        const profile = profileData as { total_points: number };
        const currentPoints = profile.total_points || 0;
        newTotalPoints = currentPoints + pointsEarned;

        const { error: profileError } = await (supabase.from('profiles') as any)
          .update({ total_points: newTotalPoints })
          .eq('id', user.id);

        if (profileError) throw profileError;
      }

      // 🆕 Gerenciar streak baseado na ação
      let newStreak = streak?.current_streak || 0;
      
      if (streakAction === 'increment') {
        newStreak = (streak?.current_streak || 0) + 1;
        
        const { error: streakError } = await (supabase.from('streaks') as any)
          .update({ 
            current_streak: newStreak,
            best_streak: Math.max(newStreak, streak?.best_streak || 0),
            last_completion_date: startOfDay(new Date()).toISOString()
          })
          .eq('habit_id', habit.id);

        if (streakError) throw streakError;
      } else if (streakAction === 'reset') {
        newStreak = 0;
        
        const { error: streakError } = await (supabase.from('streaks') as any)
          .update({ 
            current_streak: 0,
            last_completion_date: startOfDay(new Date()).toISOString()
          })
          .eq('habit_id', habit.id);

        if (streakError) throw streakError;
      }
      // streakAction === 'freeze': não faz nada com o streak

      // Adicionar à lista local
      setCompletions(prev => [...prev, completion]);

      // 🆕 Retornar informações detalhadas
      return { 
        data: { 
          completion, 
          pointsEarned, 
          newStreak,
          totalPoints: newTotalPoints,
          achievedValue: finalValue,
          percentage: habit.target_value ? calculateProgressPercentage(finalValue, habit.target_value) : 100,
          earnedPoints: earnPoints,
          streakAction,
        }, 
        error: null 
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao completar hábito';
      setError(errorMsg);
      return { data: null, error: errorMsg };
    }
  };

  // Atualizar completion existente
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

      // Calcular valor final baseado no modo
      const finalValue = mode === 'add' ? currentValue + newValue : newValue;

      // 🆕 Determinar se deve pontuar
      const earnPoints = shouldEarnPoints(habit, finalValue);
      const streakAction = getStreakAction(habit, finalValue);

      // Recalcular pontos com o novo valor (0 se não completou meta)
      let pointsEarned = 0;
      
      if (earnPoints) {
        const currentStreak = streak?.current_streak || 0;
        pointsEarned = calculateCompletionPoints(habit, currentStreak);

        // Bônus se atingiu meta
        if (habit.target_value) {
          const percentage = calculateProgressPercentage(finalValue, habit.target_value);
          if (percentage >= 100) {
            const bonus = Math.floor(pointsEarned * 0.2);
            pointsEarned += bonus;
          }
        }
      }

      // Buscar pontos antigos
      const { data: oldCompletionData, error: oldCompletionError } = await supabase
        .from('completions')
        .select('points_earned')
        .eq('id', completionId)
        .single();

      if (oldCompletionError) throw oldCompletionError;

      const oldCompletion = oldCompletionData as { points_earned: number };
      const oldPoints = oldCompletion.points_earned || 0;
      const pointsDifference = pointsEarned - oldPoints;

      const completionUpdate = {
        value_achieved: finalValue,
        points_earned: pointsEarned,
      };

      const { data: updatedCompletionData, error: updateError } = await (supabase.from('completions') as any)
        .update(completionUpdate)
        .eq('id', completionId)
        .select()
        .single();

      if (updateError) throw updateError;

      const updatedCompletion = updatedCompletionData as Completion;

      // 🆕 Atualizar pontos do perfil (apenas se mudou)
      let newTotalPoints = 0;
      if (pointsDifference !== 0) {
        const { data: profileData, error: profileFetchError } = await supabase
          .from('profiles')
          .select('total_points')
          .eq('id', user.id)
          .single();

        if (profileFetchError) throw profileFetchError;

        const profile = profileData as { total_points: number };
        const currentTotalPoints = profile.total_points || 0;
        newTotalPoints = Math.max(0, currentTotalPoints + pointsDifference);

        const { error: profileError } = await (supabase.from('profiles') as any)
          .update({ total_points: newTotalPoints })
          .eq('id', user.id);

        if (profileError) throw profileError;
      }

      // 🆕 Gerenciar streak baseado na nova ação
      let newStreak = streak?.current_streak || 0;
      
      if (streakAction === 'increment') {
        // Se antes não pontuava e agora pontua, incrementa
        if (!shouldEarnPoints(habit, currentValue) && earnPoints) {
          newStreak = (streak?.current_streak || 0) + 1;
          
          const { error: streakError } = await (supabase.from('streaks') as any)
            .update({ 
              current_streak: newStreak,
              best_streak: Math.max(newStreak, streak?.best_streak || 0),
              last_completion_date: startOfDay(new Date()).toISOString()
            })
            .eq('habit_id', habit.id);

          if (streakError) throw streakError;
        }
      } else if (streakAction === 'reset') {
        // Se antes pontuava e agora caiu abaixo de 50%, reseta
        if (shouldEarnPoints(habit, currentValue) || calculateProgressPercentage(currentValue, habit.target_value || 1) >= 50) {
          newStreak = 0;
          
          const { error: streakError } = await (supabase.from('streaks') as any)
            .update({ 
              current_streak: 0,
              last_completion_date: startOfDay(new Date()).toISOString()
            })
            .eq('habit_id', habit.id);

          if (streakError) throw streakError;
        }
      }

      // Atualizar lista local
      setCompletions(prev => 
        prev.map(c => c.id === completionId ? updatedCompletion : c)
      );

      return {
        data: {
          completion: updatedCompletion,
          pointsEarned,
          pointsDifference,
          newStreak,
          totalPoints: newTotalPoints,
          achievedValue: finalValue,
          percentage: habit.target_value ? calculateProgressPercentage(finalValue, habit.target_value) : 100,
          earnedPoints: earnPoints,
          streakAction,
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

  // Descompletar um hábito
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
      const pointsToDeduct = todayCompletion.points_earned;

      // Deletar completion
      const { error: deleteError } = await supabase
        .from('completions')
        .delete()
        .eq('id', completionId);

      if (deleteError) throw deleteError;

      // Reverter pontos do perfil (apenas se tinha pontos)
      if (pointsToDeduct > 0) {
        const { data: profileData, error: profileFetchError } = await supabase
          .from('profiles')
          .select('total_points')
          .eq('id', user.id)
          .single();

        if (profileFetchError) throw profileFetchError;

        const profile = profileData as { total_points: number };
        const currentPoints = profile.total_points || 0;
        const newTotalPoints = Math.max(0, currentPoints - pointsToDeduct);

        const { error: profileError } = await (supabase.from('profiles') as any)
          .update({ total_points: newTotalPoints })
          .eq('id', user.id);

        if (profileError) throw profileError;
      }

      // Atualizar streak (apenas se tinha pontos, ou seja, completou 100%)
      if (pointsToDeduct > 0) {
        const { data: streakData, error: streakFetchError } = await supabase
          .from('streaks')
          .select('*')
          .eq('habit_id', habitId)
          .maybeSingle();

        if (streakFetchError) throw streakFetchError;

        if (streakData) {
          const streak = streakData as Streak;
          const currentStreak = streak.current_streak || 0;
          const newStreak = Math.max(0, currentStreak - 1);
          
          const { error: streakError } = await (supabase.from('streaks') as any)
            .update({ current_streak: newStreak })
            .eq('habit_id', habitId);

          if (streakError) throw streakError;
        }
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

  // Buscar completion específico
  const getCompletion = (habitId: string): Completion | undefined => {
    return completions.find(c => c.habit_id === habitId);
  };

  // Calcular total de pontos de hoje
  const getTodayPoints = (): number => {
    return completions.reduce((total, c) => total + c.points_earned, 0);
  };

  // 🆕 Obter status de progresso de um hábito
  const getProgressStatus = (habit: Habit): {
    hasProgress: boolean;
    percentage: number;
    earnedPoints: boolean;
    streakAction: 'increment' | 'freeze' | 'reset';
  } => {
    const completion = getCompletion(habit.id);
    
    if (!completion || !habit.has_target || !habit.target_value) {
      return {
        hasProgress: !!completion,
        percentage: completion ? 100 : 0,
        earnedPoints: !!completion,
        streakAction: 'increment',
      };
    }

    const currentValue = completion.value_achieved || 0;
    const percentage = calculateProgressPercentage(currentValue, habit.target_value);
    
    return {
      hasProgress: true,
      percentage,
      earnedPoints: shouldEarnPoints(habit, currentValue),
      streakAction: getStreakAction(habit, currentValue),
    };
  };

  // Carregar completions quando o usuário estiver disponível
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
    getTodayPoints,
    getProgressStatus, // 🆕 Novo método
    refetch: fetchTodayCompletions,
  };
};