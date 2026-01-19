// hooks/useHabits.ts
import { useState, useEffect } from 'react';
import { supabase } from '@/services/supabase';
import { useAuth } from './useAuth';
import { Habit, HabitInsert } from '@/types/database';

const habitsTable = () => supabase.from('habits') as any;

export const useHabits = () => {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchHabits();
    }
  }, [user]);

  const fetchHabits = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await habitsTable()
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setHabits(data as Habit[] || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar hábitos');
    } finally {
      setLoading(false);
    }
  };

  const getHabit = async (habitId: string) => {
    try {
      const { data, error: fetchError } = await habitsTable()
        .select('*')
        .eq('id', habitId)
        .single();

      if (fetchError) {
        return { data: null, error: fetchError.message };
      }

      return { data, error: null };
    } catch (err) {
      return { 
        data: null, 
        error: err instanceof Error ? err.message : 'Erro ao buscar hábito' 
      };
    }
  };

  // 🔧 FIX: Aceitar TODOS os campos do hábito
  const createHabit = async (habitData: {
    name: string;
    description?: string;
    type?: 'positive' | 'negative';
    frequency_type?: 'daily' | 'weekly' | 'custom';
    frequency_days?: number[];
    has_target?: boolean; // 🆕 Campo de meta
    target_value?: number | null; // 🆕 Valor da meta
    target_unit?: string | null; // 🆕 Unidade da meta
    difficulty: 'easy' | 'medium' | 'hard';
    color: string;
    points_base: number;
    icon?: string;
  }) => {
    if (!user?.id) {
      return { data: null, error: 'Usuário não autenticado' };
    }

    try {
      // 🔧 FIX: Incluir TODOS os campos, inclusive metas
      const dataToInsert: Partial<HabitInsert> = {
        user_id: user.id,
        name: habitData.name,
        description: habitData.description || null,
        type: habitData.type || 'positive',
        frequency_type: habitData.frequency_type || 'daily',
        frequency_days: habitData.frequency_days || null,
        // 🆕 Campos de meta numérica
        has_target: habitData.has_target || false,
        target_value: habitData.target_value || null,
        target_unit: habitData.target_unit || null,
        difficulty: habitData.difficulty,
        color: habitData.color,
        points_base: habitData.points_base,
        icon: habitData.icon || 'star',
        is_active: true,
      };

      // 🔧 DEBUG
      console.log('📤 Enviando para Supabase:', dataToInsert);

      const { data, error: insertError } = await habitsTable()
        .insert(dataToInsert)
        .select()
        .single();

      if (insertError) {
        console.error('❌ Erro do Supabase:', insertError);
        return { data: null, error: insertError.message };
      }

      console.log('✅ Hábito criado no banco:', data);

      // Adicionar à lista local
      setHabits([data as Habit, ...habits]);

      return { data, error: null };
    } catch (err) {
      console.error('❌ Erro catch:', err);
      return { 
        data: null, 
        error: err instanceof Error ? err.message : 'Erro ao criar hábito' 
      };
    }
  };

  const updateHabit = async (
    habitId: string, 
    updates: {
      name?: string;
      description?: string | null;
      difficulty?: 'easy' | 'medium' | 'hard';
      color?: string;
      points_base?: number;
      has_target?: boolean; // 🆕
      target_value?: number | null; // 🆕
      target_unit?: string | null; // 🆕
    }
  ) => {
    try {
      const { data, error: updateError } = await habitsTable()
        .update(updates)
        .eq('id', habitId)
        .select()
        .single();

      if (updateError) {
        return { data: null, error: updateError.message };
      }

      setHabits(habits.map(h => h.id === habitId ? data as Habit : h));

      return { data, error: null };
    } catch (err) {
      return { 
        data: null, 
        error: err instanceof Error ? err.message : 'Erro ao atualizar hábito' 
      };
    }
  };

  const deleteHabit = async (habitId: string) => {
    try {
      const { error: deleteError } = await habitsTable()
        .update({ is_active: false })
        .eq('id', habitId);

      if (deleteError) {
        return { error: deleteError.message };
      }

      setHabits(habits.filter(h => h.id !== habitId));

      return { error: null };
    } catch (err) {
      return { 
        error: err instanceof Error ? err.message : 'Erro ao deletar hábito' 
      };
    }
  };

  const toggleHabitActive = async (habitId: string, isActive: boolean) => {
    try {
      const { error: updateError } = await habitsTable()
        .update({ is_active: isActive })
        .eq('id', habitId);

      if (updateError) {
        return { error: updateError.message };
      }

      if (isActive) {
        const { data } = await getHabit(habitId);
        if (data) {
          setHabits([data as Habit, ...habits]);
        }
      } else {
        setHabits(habits.filter(h => h.id !== habitId));
      }

      return { error: null };
    } catch (err) {
      return { 
        error: err instanceof Error ? err.message : 'Erro ao atualizar status' 
      };
    }
  };

  const refresh = async () => {
    await fetchHabits();
  };

  return {
    habits,
    loading,
    error,
    getHabit,
    createHabit,
    updateHabit,
    deleteHabit,
    toggleHabitActive,
    refresh,
  };
};