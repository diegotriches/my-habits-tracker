import { useState, useEffect } from 'react';
import { supabase } from '@/services/supabase';
import { Habit, HabitInsert, HabitUpdate } from '@/types/database';
import { useAuth } from './useAuth';

export const useHabits = () => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Buscar hábitos do usuário
  const fetchHabits = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setHabits(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar hábitos');
      console.error('Error fetching habits:', err);
    } finally {
      setLoading(false);
    }
  };

  // Criar novo hábito
  const createHabit = async (habitData: Omit<HabitInsert, 'user_id'>) => {
    try {
      if (!user) throw new Error('Usuário não autenticado');

      const newHabit = {
        ...habitData,
        user_id: user.id,
      };

      const { data, error: createError } = await (supabase
        .from('habits')
        .insert(newHabit as any) as any)
        .select()
        .single();

      if (createError) throw createError;

      // Adicionar à lista local
      if (data) {
        setHabits(prev => [data, ...prev]);
      }
      
      return { data, error: null };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao criar hábito';
      setError(errorMsg);
      return { data: null, error: errorMsg };
    }
  };

  // Atualizar hábito
  const updateHabit = async (id: string, updates: HabitUpdate) => {
    try {
      const { data, error: updateError } = await (supabase
        .from('habits') as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Atualizar na lista local
      if (data) {
        setHabits(prev =>
          prev.map(habit => (habit.id === id ? data : habit))
        );
      }

      return { data, error: null };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao atualizar hábito';
      setError(errorMsg);
      return { data: null, error: errorMsg };
    }
  };

  // Deletar hábito (soft delete)
  const deleteHabit = async (id: string) => {
    try {
      const { error: deleteError } = await (supabase
        .from('habits') as any)
        .update({ is_active: false })
        .eq('id', id);

      if (deleteError) throw deleteError;

      // Remover da lista local
      setHabits(prev => prev.filter(habit => habit.id !== id));

      return { error: null };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao deletar hábito';
      setError(errorMsg);
      return { error: errorMsg };
    }
  };

  // Buscar um hábito específico
  const getHabit = async (id: string) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('habits')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      return { data, error: null };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao buscar hábito';
      return { data: null, error: errorMsg };
    }
  };

  // Carregar hábitos quando o usuário estiver disponível
  useEffect(() => {
    if (user) {
      fetchHabits();
    }
  }, [user]);

  return {
    habits,
    loading,
    error,
    createHabit,
    updateHabit,
    deleteHabit,
    getHabit,
    refetch: fetchHabits,
  };
};