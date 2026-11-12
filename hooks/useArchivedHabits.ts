// hooks/useArchivedHabits.ts
import { useCallback, useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { supabase } from '@/services/supabase';
import { HABITS_CHANGED_EVENT } from '@/services/habitEvents';
import { Habit } from '@/types/database';
import { errorMessageFor } from '@/utils/networkErrors';
import { useAuth } from './useAuth';

/**
 * Hábitos arquivados (tela settings/archived), do mais recente para o mais
 * antigo. Sem cache offline: a lista só serve para restaurar, e restaurar
 * exige conexão.
 */
export function useArchivedHabits() {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchArchived = useCallback(async () => {
    if (!user) return;
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .not('archived_at', 'is', null)
      .order('archived_at', { ascending: false });
    if (fetchError) {
      setError(errorMessageFor(fetchError, 'Não foi possível carregar os hábitos arquivados.'));
    } else {
      setHabits(data ?? []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void fetchArchived();
  }, [fetchArchived]);

  // Restaurar (aqui ou nos detalhes) e arquivar mudam a lista.
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(HABITS_CHANGED_EVENT, () => {
      void fetchArchived();
    });
    return () => subscription.remove();
  }, [fetchArchived]);

  return { habits, loading, error, refresh: fetchArchived };
}
