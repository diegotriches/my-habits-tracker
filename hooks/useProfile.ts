import { useState, useEffect } from 'react';
import { supabase } from '@/services/supabase';
import { Profile } from '@/types/database';
import { useAuth } from './useAuth';
import { calculateLevel } from '@/utils/points';

export const useProfile = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Buscar perfil do usuário
  const fetchProfile = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchError) throw fetchError;

      if (!data) throw new Error('Perfil não encontrado');

      // Calcular nível baseado nos pontos
      const totalPoints = (data as any).total_points || 0;
      const currentLevel = calculateLevel(totalPoints);
      
      // Atualizar nível se mudou
      const profileLevel = (data as any).level || 1;
      if (currentLevel !== profileLevel) {
        const { error: updateError } = await (supabase
          .from('profiles') as any)
          .update({ level: currentLevel })
          .eq('id', user.id);

        if (!updateError) {
          (data as any).level = currentLevel;
        }
      }

      setProfile(data as Profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar perfil');
      // ✅ FIX: Console.error removido
    } finally {
      setLoading(false);
    }
  };

  // Carregar perfil quando o usuário estiver disponível
  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  return {
    profile,
    loading,
    error,
    refetch: fetchProfile,
  };
};