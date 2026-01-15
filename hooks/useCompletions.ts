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
          habits (*)
        `)
        .gte('completed_at', startOfToday)
        .lte('completed_at', endOfToday);

      if (fetchError) throw fetchError;

      // Filtrar apenas completions dos hábitos do usuário
      const userCompletions = (data || []).filter(
        (c: any) => c.habits?.user_id === user.id
      );

      setCompletions(userCompletions as Completion[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar completions');
      console.error('Error fetching completions:', err);
    } finally {
      setLoading(false);
    }
  };

  // Verificar se um hábito foi completado hoje
  const isCompletedToday = (habitId: string): boolean => {
    return completions.some(c => c.habit_id === habitId);
  };

  // Completar um hábito
  const completeHabit = async (habit: Habit, streak?: Streak) => {
    try {
      if (!user) throw new Error('Usuário não autenticado');

      // Verificar se já foi completado hoje
      if (isCompletedToday(habit.id)) {
        return { data: null, error: 'Hábito já completado hoje' };
      }

      // Calcular pontos
      const currentStreak = streak?.current_streak || 0;
      const pointsEarned = calculateCompletionPoints(habit, currentStreak);

      // Criar completion
      const completionData: CompletionInsert = {
        habit_id: habit.id,
        completed_at: new Date().toISOString(),
        value_achieved: null,
        points_earned: pointsEarned,
        was_synced: true,
      };

      const { data: completion, error: completionError } = await (supabase
        .from('completions') as any)
        .insert(completionData)
        .select()
        .single();

      if (completionError) throw completionError;

      // Atualizar streak
      const newStreak = currentStreak + 1;
      const bestStreak = Math.max(streak?.best_streak || 0, newStreak);

      const { error: streakError } = await (supabase
        .from('streaks') as any)
        .update({
          current_streak: newStreak,
          best_streak: bestStreak,
          last_completion_date: new Date().toISOString().split('T')[0],
        })
        .eq('habit_id', habit.id);

      if (streakError) throw streakError;

      // Atualizar pontos do perfil
      const { data: profile } = await supabase
        .from('profiles')
        .select('total_points')
        .eq('id', user.id)
        .single();

      const currentPoints = (profile as any)?.total_points || 0;
      const newTotalPoints = currentPoints + pointsEarned;

      const { error: profileError } = await (supabase
        .from('profiles') as any)
        .update({ total_points: newTotalPoints })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Adicionar à lista local
      setCompletions(prev => [...prev, completion]);

      return { 
        data: { 
          completion, 
          pointsEarned, 
          newStreak,
          totalPoints: newTotalPoints 
        }, 
        error: null 
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao completar hábito';
      setError(errorMsg);
      return { data: null, error: errorMsg };
    }
  };

  // Descompletar um hábito (remover completion de hoje)
  const uncompleteHabit = async (habitId: string) => {
    try {
      if (!user) throw new Error('Usuário não autenticado');

      // Buscar completion de hoje
      const today = new Date();
      const startOfToday = startOfDay(today).toISOString();
      const endOfToday = endOfDay(today).toISOString();

      const { data: todayCompletion, error: fetchError } = await supabase
        .from('completions')
        .select('*')
        .eq('habit_id', habitId)
        .gte('completed_at', startOfToday)
        .lte('completed_at', endOfToday)
        .single();

      if (fetchError) throw fetchError;
      if (!todayCompletion) throw new Error('Completion não encontrada');

      const completionId = (todayCompletion as any).id;
      const pointsToDeduct = (todayCompletion as any).points_earned;

      // Deletar completion
      const { error: deleteError } = await supabase
        .from('completions')
        .delete()
        .eq('id', completionId);

      if (deleteError) throw deleteError;

      // Reverter pontos do perfil
      const { data: profile } = await supabase
        .from('profiles')
        .select('total_points')
        .eq('id', user.id)
        .single();

      const currentPoints = (profile as any)?.total_points || 0;
      const newTotalPoints = Math.max(0, currentPoints - pointsToDeduct);

      const { error: profileError } = await (supabase
        .from('profiles') as any)
        .update({ total_points: newTotalPoints })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Atualizar streak (decrementar)
      const { data: streak } = await supabase
        .from('streaks')
        .select('*')
        .eq('habit_id', habitId)
        .single();

      if (streak) {
        const currentStreak = (streak as any).current_streak || 0;
        const newStreak = Math.max(0, currentStreak - 1);
        
        const { error: streakError } = await (supabase
          .from('streaks') as any)
          .update({
            current_streak: newStreak,
          })
          .eq('habit_id', habitId);

        if (streakError) throw streakError;
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

  // Calcular total de pontos de hoje
  const getTodayPoints = (): number => {
    return completions.reduce((total, c) => total + c.points_earned, 0);
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
    getTodayPoints,
    refetch: fetchTodayCompletions,
  };
};