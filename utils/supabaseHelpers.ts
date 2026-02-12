// utils/supabaseHelpers.ts

/**
 * Type-safe helpers para queries do Supabase
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
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;

  return data as Profile;
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
 * Type guard para verificar se um objeto é um Completion válido
 */
export const isValidCompletion = (obj: any): obj is Completion => {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.habit_id === 'string' &&
    typeof obj.completed_at === 'string'
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
    typeof obj.has_target === 'boolean'
  );
};