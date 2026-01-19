import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { penaltyService } from '@/services/penaltyService';

export const usePenalties = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [penaltyHistory, setPenaltyHistory] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalPenalties: 0,
    totalPointsLost: 0,
    byReason: {},
  });

  // Verificar penalidades ao montar o componente
  useEffect(() => {
    if (user) {
      checkPenalties();
      loadPenaltyHistory();
      loadStats();
    }
  }, [user]);

  // Verificar penalidades de todos os hábitos
  const checkPenalties = async (showAlert: boolean = false) => {
    if (!user?.id) {
      return [];
    }

    try {
      setChecking(true);
      const results = await penaltyService.checkAllHabits(user.id);
      
      // ✅ FIX: Removido Alert.alert
      // Retorna os resultados e deixa o componente decidir como mostrar
      // Agora usa PenaltyNotification que já está implementado
      
      return results;
    } catch (error) {
      // ✅ FIX: Console.error removido
      return [];
    } finally {
      setChecking(false);
    }
  };

  // Carregar histórico de penalidades
  const loadPenaltyHistory = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const { data } = await penaltyService.getPenaltyHistory(user.id);
      setPenaltyHistory(data || []);
    } catch (error) {
      // ✅ FIX: Console.error removido
    } finally {
      setLoading(false);
    }
  };

  // Carregar estatísticas
  const loadStats = async () => {
    if (!user?.id) return;

    try {
      const statsData = await penaltyService.getPenaltyStats(user.id);
      setStats(statsData);
    } catch (error) {
      // ✅ FIX: Console.error removido
    }
  };

  // Refresh manual
  const refresh = async () => {
    await Promise.all([
      checkPenalties(),
      loadPenaltyHistory(),
      loadStats(),
    ]);
  };

  return {
    loading,
    checking,
    penaltyHistory,
    stats,
    checkPenalties,
    refresh,
  };
};