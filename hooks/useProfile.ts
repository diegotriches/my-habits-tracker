// hooks/useProfile.ts
import { useState, useEffect } from 'react';
import { supabase } from '@/services/supabase';
import { Profile } from '@/types/database';
import { useAuth } from './useAuth';
import { readCache, writeCache } from '@/services/offlineCache';

export const useProfile = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchProfile = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Cache offline: nome e avatar do cabeçalho aparecem mesmo sem rede.
      const cached = await readCache<Profile>('profile', user.id);
      if (cached) {
        setProfile(prev => prev ?? cached);
        setLoading(false);
      }

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchError) throw fetchError;
      if (!data) throw new Error('Perfil não encontrado');

      setProfile(data as Profile);
      void writeCache('profile', user.id, data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar perfil');
    } finally {
      setLoading(false);
    }
  };

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