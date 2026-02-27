// hooks/useStreaks.ts
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/services/supabase';
import { Streak, Habit } from '@/types/database';
import { useAuth } from './useAuth';
import { retroactiveCompletionService } from '@/services/retroactiveCompletionService';

const streaksTable = () => (supabase.from('streaks') as any);

export const useStreaks = () => {
  const { user } = useAuth();
  const [streaks, setStreaks] = useState<Streak[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasRecalculated = useRef(false);

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

  /**
   * Atualizar streak após completar/descompletar.
   * Delega para recalculateStreak que usa a lógica correta
   * baseada no tipo de frequência do hábito.
   */
  const updateStreakWithFrequency = async (
    habitId: string,
    habit: Habit,
    wasCompleted: boolean
  ) => {
    try {
      // Garantir que o streak existe antes de recalcular
      await ensureStreakExists(habitId);

      // Delegar para recalculateStreak que tem a lógica
      // correta para cada tipo de frequência
      await retroactiveCompletionService.recalculateStreak(habitId);

      // Buscar o streak atualizado do banco
      const { data: updatedData } = await streaksTable()
        .select('*')
        .eq('habit_id', habitId)
        .maybeSingle();

      const updatedStreak = updatedData as Streak | null;

      if (updatedStreak) {
        // Atualizar lista local
        setStreaks(prev => {
          const filtered = prev.filter(s => s.habit_id !== habitId);
          return [...filtered, updatedStreak];
        });
      }

      return { data: updatedStreak, error: null };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao atualizar streak';
      setError(errorMsg);
      return { data: null, error: errorMsg };
    }
  };

  /**
   * Recalcular todos os streaks ao abrir o app.
   * Garante que cada hábito tenha um registro de streak e
   * recalcula usando a lógica unificada.
   */
  const checkExpiredStreaks = async (habits: Habit[]) => {
    // Evitar recalcular múltiplas vezes na mesma sessão
    if (hasRecalculated.current || habits.length === 0) return;
    hasRecalculated.current = true;

    try {
      console.log(`🔄 Recalculando streaks para ${habits.length} hábitos...`);

      for (const habit of habits) {
        // Garantir que existe registro de streak
        await ensureStreakExists(habit.id);

        // Recalcular usando a lógica unificada
        await retroactiveCompletionService.recalculateStreak(habit.id);
      }

      // Refetch todos os streaks atualizados
      const habitIds = habits.map(h => h.id);
      const { data } = await streaksTable()
        .select('*')
        .in('habit_id', habitIds);

      if (data) {
        setStreaks(data as Streak[]);
        console.log(`✅ Streaks recalculados:`, 
          (data as Streak[]).map(s => ({
            habit: s.habit_id.substring(0, 8),
            current: s.current_streak,
            best: s.best_streak,
          }))
        );
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

/**
 * Garante que existe um registro de streak para o hábito.
 * Cria um novo se não existir (com valores zerados).
 */
async function ensureStreakExists(habitId: string): Promise<void> {
  const { data: existing } = await streaksTable()
    .select('id')
    .eq('habit_id', habitId)
    .maybeSingle();

  if (!existing) {
    console.log(`📝 Criando registro de streak para hábito ${habitId.substring(0, 8)}`);
    await streaksTable().insert({
      habit_id: habitId,
      current_streak: 0,
      best_streak: 0,
      last_completion_date: null,
    });
  }
}