// hooks/useStreaks.ts
import { useState, useEffect } from 'react';
import { supabase } from '@/services/supabase';
import { Streak, Habit } from '@/types/database';
import { useAuth } from './useAuth';
import { shouldHabitAppearOnDate } from '@/utils/habitHelpers';

const streaksTable = () => (supabase.from('streaks') as any);

export const useStreaks = () => {
  const { user } = useAuth();
  const [streaks, setStreaks] = useState<Streak[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      // Auto-fetch pode ser feito aqui se necessário
    }
  }, [user]);

  // Buscar streaks de múltiplos hábitos
  const fetchStreaks = async (habitIds: string[]) => {
    if (!user || habitIds.length === 0) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await streaksTable()
        .select('*')
        .in('habit_id', habitIds);

      if (fetchError) throw fetchError;

      setStreaks(data as Streak[] || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar streaks');
    } finally {
      setLoading(false);
    }
  };

  // Buscar streak de um hábito específico
  const getStreak = (habitId: string): Streak | undefined => {
    return streaks.find(s => s.habit_id === habitId);
  };

  // 🆕 Verifica se o streak deve ser quebrado baseado na frequência
  const shouldBreakStreak = async (habit: Habit, lastCompletionDate: string | null): Promise<boolean> => {
    if (!lastCompletionDate) return false;

    const today = new Date();
    const lastCompletion = new Date(lastCompletionDate);
    
    // Se completou hoje, não quebra
    if (isSameDay(lastCompletion, today)) {
      return false;
    }

    // 🔧 FIX: Verificar apenas dias em que o hábito deveria ser feito
    let currentDate = new Date(lastCompletion);
    currentDate.setDate(currentDate.getDate() + 1); // Começa no dia seguinte à última completion

    while (currentDate < today) {
      // Se é um dia em que o hábito deveria aparecer, o streak foi quebrado
      if (shouldHabitAppearOnDate(habit, currentDate)) {
        return true; // Tinha que fazer e não fez = streak quebrado
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // 🔧 Verificar se hoje é dia do hábito
    if (shouldHabitAppearOnDate(habit, today)) {
      // Hoje é dia do hábito e ainda não completou
      // Mas ainda tem tempo, então não quebra ainda
      return false;
    }

    // Não era pra fazer em nenhum dia desde a última completion
    return false;
  };

  // 🆕 Atualizar streak considerando frequência
  const updateStreakWithFrequency = async (
    habitId: string,
    habit: Habit,
    wasCompleted: boolean
  ) => {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Buscar streak atual
      const { data: streakData, error: fetchError } = await streaksTable()
        .select('*')
        .eq('habit_id', habitId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      const currentStreak = streakData as Streak | null;

      if (wasCompleted) {
        // 🔧 Completou hoje: incrementar streak
        const lastCompletionDate = currentStreak?.last_completion_date;
        let newStreakValue = 1;

        if (lastCompletionDate) {
          const lastDate = new Date(lastCompletionDate);
          const todayDate = new Date(today);

          // Verificar se deve continuar o streak
          const shouldContinue = await shouldContinueStreak(habit, lastDate, todayDate);
          
          if (shouldContinue) {
            newStreakValue = (currentStreak?.current_streak || 0) + 1;
          }
        }

        const bestStreak = Math.max(
          currentStreak?.best_streak || 0,
          newStreakValue
        );

        if (currentStreak) {
          // Atualizar streak existente
          await streaksTable()
            .update({
              current_streak: newStreakValue,
              best_streak: bestStreak,
              last_completion_date: today,
            })
            .eq('habit_id', habitId);
        } else {
          // Criar novo streak
          await streaksTable()
            .insert({
              habit_id: habitId,
              current_streak: newStreakValue,
              best_streak: newStreakValue,
              last_completion_date: today,
            });
        }

        // Atualizar lista local
        const updatedStreak: Streak = {
          id: currentStreak?.id || '',
          habit_id: habitId,
          current_streak: newStreakValue,
          best_streak: bestStreak,
          last_completion_date: today,
          updated_at: new Date().toISOString(),
        };

        setStreaks(prev => {
          const filtered = prev.filter(s => s.habit_id !== habitId);
          return [...filtered, updatedStreak];
        });

        return { data: updatedStreak, error: null };
      } else {
        // 🔧 Descompletou: decrementar streak
        if (currentStreak) {
          const newStreakValue = Math.max(0, currentStreak.current_streak - 1);

          await streaksTable()
            .update({ current_streak: newStreakValue })
            .eq('habit_id', habitId);

          const updatedStreak: Streak = {
            ...currentStreak,
            current_streak: newStreakValue,
          };

          setStreaks(prev =>
            prev.map(s => s.habit_id === habitId ? updatedStreak : s)
          );

          return { data: updatedStreak, error: null };
        }
      }

      return { data: null, error: null };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao atualizar streak';
      setError(errorMsg);
      return { data: null, error: errorMsg };
    }
  };

  // 🆕 Verifica se deve continuar o streak
  const shouldContinueStreak = async (
    habit: Habit,
    lastDate: Date,
    currentDate: Date
  ): Promise<boolean> => {
    // Se for o mesmo dia, não incrementa
    if (isSameDay(lastDate, currentDate)) {
      return false;
    }

    // 🔧 Verificar se pulou algum dia obrigatório
    let checkDate = new Date(lastDate);
    checkDate.setDate(checkDate.getDate() + 1);

    while (checkDate < currentDate) {
      if (shouldHabitAppearOnDate(habit, checkDate)) {
        // Encontrou um dia que deveria fazer mas não fez
        return false; // Streak quebrado, começa do zero
      }
      checkDate.setDate(checkDate.getDate() + 1);
    }

    // Não pulou nenhum dia obrigatório, continua o streak
    return true;
  };

  // 🆕 Verificar e quebrar streaks expirados (executar diariamente)
  const checkExpiredStreaks = async (habits: Habit[]) => {
    try {
      const today = new Date();
      
      for (const habit of habits) {
        // Só verifica se o hábito deveria ser feito hoje
        if (!shouldHabitAppearOnDate(habit, today)) {
          continue;
        }

        const streak = getStreak(habit.id);
        if (!streak || !streak.last_completion_date) {
          continue;
        }

        const shouldBreak = await shouldBreakStreak(habit, streak.last_completion_date);
        
        if (shouldBreak) {
          // Quebrar streak
          await streaksTable()
            .update({ current_streak: 0 })
            .eq('habit_id', habit.id);

          // Atualizar local
          setStreaks(prev =>
            prev.map(s =>
              s.habit_id === habit.id
                ? { ...s, current_streak: 0 }
                : s
            )
          );
        }
      }
    } catch (err) {
      console.error('Erro ao verificar streaks expirados:', err);
    }
  };

  return {
    streaks,
    loading,
    error,
    fetchStreaks,
    getStreak,
    updateStreakWithFrequency,
    checkExpiredStreaks,
  };
};

// Helper: Verifica se duas datas são o mesmo dia
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}