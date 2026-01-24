// utils/supabaseHelpers.ts

/**
 * 🛡️ Type-safe helpers para queries do Supabase
 * 
 * Esses helpers resolvem problemas de inferência de tipos
 * e tornam o código mais limpo e seguro.
 */

import { supabase } from '@/services/supabase';
import { Completion, Profile, Habit } from '@/types/database';

/**
 * Type-safe query para completions
 */
export const getCompletions = async (habitId: string) => {
  const { data, error } = await supabase
    .from('completions')
    .select('*')
    .eq('habit_id', habitId);

  if (error) throw error;

  return (data || []) as Completion[];
};

/**
 * Type-safe query para profile
 */
export const getProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('total_points')
    .eq('id', userId)
    .single();

  if (error) throw error;

  return data as { total_points: number };
};

/**
 * Type-safe update de completion
 */
export const updateCompletion = async (
  completionId: string,
  updates: Partial<Completion>
) => {
  const { error } = await (supabase.from('completions') as any)
    .update(updates)
    .eq('id', completionId);

  if (error) throw error;
};

/**
 * Type-safe update de profile
 */
export const updateProfile = async (
  userId: string,
  updates: Partial<Profile>
) => {
  const { error } = await (supabase.from('profiles') as any)
    .update(updates)
    .eq('id', userId);

  if (error) throw error;
};

/**
 * Type-safe query para habit
 */
export const getHabit = async (habitId: string) => {
  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .eq('id', habitId)
    .single();

  if (error) throw error;

  return data as Habit;
};

/**
 * Helper para recalcular pontos de completions
 * com tipos totalmente seguros
 */
export const recalculateCompletionPoints = async (
  habitId: string,
  newTargetValue: number,
  difficulty: 'easy' | 'medium' | 'hard',
  pointsConfig: { easy: number; medium: number; hard: number }
) => {
  try {
    // 1. Buscar completions
    const completions = await getCompletions(habitId);

    if (completions.length === 0) return 0;

    let totalPointsDifference = 0;

    // 2. Recalcular cada completion
    for (const completion of completions) {
      const oldPoints = completion.points_earned || 0;
      const currentValue = completion.value_achieved || 0;
      const newPercentage = (currentValue / newTargetValue) * 100;

      // 3. Aplicar regra: só pontua se ≥ 100%
      let newPoints = 0;
      if (newPercentage >= 100) {
        const basePoints = pointsConfig[difficulty];
        newPoints = basePoints + Math.floor(basePoints * 0.2); // +20% bônus
      }

      // 4. Atualizar se mudou
      if (newPoints !== oldPoints) {
        await updateCompletion(completion.id, { points_earned: newPoints });
        totalPointsDifference += (newPoints - oldPoints);
      }
    }

    return totalPointsDifference;
  } catch (error) {
    console.error('Erro ao recalcular pontos:', error);
    throw error;
  }
};

/**
 * Helper para atualizar pontos do perfil
 */
export const updateProfilePoints = async (
  userId: string,
  pointsDifference: number
) => {
  try {
    const profile = await getProfile(userId);
    const newTotalPoints = Math.max(0, profile.total_points + pointsDifference);
    
    await updateProfile(userId, { total_points: newTotalPoints });
    
    return newTotalPoints;
  } catch (error) {
    console.error('Erro ao atualizar pontos do perfil:', error);
    throw error;
  }
};

/**
 * Type guard para verificar se um objeto é um Completion válido
 */
export const isValidCompletion = (obj: any): obj is Completion => {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.habit_id === 'string' &&
    typeof obj.completed_at === 'string' &&
    typeof obj.points_earned === 'number'
  );
};

/**
 * Type guard para verificar se um objeto é um Habit válido
 */
export const isValidHabit = (obj: any): obj is Habit => {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.difficulty === 'string' &&
    typeof obj.has_target === 'boolean'
  );
};

/**
 * Batch update de completions (mais eficiente)
 */
export const batchUpdateCompletions = async (
  updates: Array<{ id: string; points_earned: number }>
) => {
  try {
    const promises = updates.map(({ id, points_earned }) =>
      updateCompletion(id, { points_earned })
    );

    await Promise.all(promises);
  } catch (error) {
    console.error('Erro no batch update:', error);
    throw error;
  }
};

/**
 * Calcular impacto de mudança de meta (preview)
 */
export const calculateTargetChangeImpact = async (
  habitId: string,
  oldTargetValue: number,
  newTargetValue: number
) => {
  try {
    const completions = await getCompletions(habitId);

    let willKeepPoints = 0;
    let willLosePoints = 0;
    let willGainPoints = 0;
    let totalPointsDiff = 0;

    for (const completion of completions) {
      const value = completion.value_achieved || 0;
      const oldPoints = completion.points_earned || 0;
      
      const oldPercentage = (value / oldTargetValue) * 100;
      const newPercentage = (value / newTargetValue) * 100;

      const hadPoints = oldPercentage >= 100;
      const willHavePoints = newPercentage >= 100;

      if (hadPoints && willHavePoints) {
        willKeepPoints++;
      } else if (hadPoints && !willHavePoints) {
        willLosePoints++;
        totalPointsDiff -= oldPoints;
      } else if (!hadPoints && willHavePoints) {
        willGainPoints++;
        // Estimar pontos que será ganho (precisaria da dificuldade)
      }
    }

    return {
      totalCompletions: completions.length,
      willKeepPoints,
      willLosePoints,
      willGainPoints,
      estimatedPointsDiff: totalPointsDiff,
    };
  } catch (error) {
    console.error('Erro ao calcular impacto:', error);
    return {
      totalCompletions: 0,
      willKeepPoints: 0,
      willLosePoints: 0,
      willGainPoints: 0,
      estimatedPointsDiff: 0,
    };
  }
};