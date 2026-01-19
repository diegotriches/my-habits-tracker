import { supabase } from '@/services/supabase';
import { PENALTY_CONFIG, PENALTY_REASONS, GRACE_PERIOD } from '@/constants/PenaltyConfig';
import { differenceInHours, startOfDay } from 'date-fns';

// ✅ FIX: Interface corrigida - reflete estrutura real das tabelas
interface HabitData {
  id: string;
  user_id: string;
  difficulty: 'easy' | 'medium' | 'hard';
  name: string;
  // Dados de streak virão da tabela 'streaks'
}

interface StreakData {
  habit_id: string;
  current_streak: number;
  last_completion_date: string | null;
}

interface PenaltyResult {
  penaltyApplied: boolean;
  pointsLost: number;
  reason: string | null;
  message: string;
}

const penaltiesTable = () => supabase.from('penalties') as any;
const habitsTable = () => supabase.from('habits') as any;
const profilesTable = () => supabase.from('profiles') as any;
const streaksTable = () => supabase.from('streaks') as any;

export const penaltyService = {
  // ✅ FIX: Corrigido - busca dados de habits E streaks
  async checkMissedDay(habitId: string): Promise<PenaltyResult> {
    try {
      // Buscar dados do hábito
      const { data: habit } = await habitsTable()
        .select('*')
        .eq('id', habitId)
        .single();

      if (!habit) {
        return {
          penaltyApplied: false,
          pointsLost: 0,
          reason: null,
          message: 'Hábito não encontrado',
        };
      }

      // ✅ FIX: Buscar streak da tabela correta
      const { data: streak } = await streaksTable()
        .select('*')
        .eq('habit_id', habitId)
        .single();

      // Se não tem streak, significa que nunca foi completado
      if (!streak || !streak.last_completion_date) {
        return {
          penaltyApplied: false,
          pointsLost: 0,
          reason: null,
          message: 'Hábito novo, sem penalidades ainda',
        };
      }

      const lastCompleted = new Date(streak.last_completion_date + 'T23:59:59');
      const now = new Date();
      const hoursSinceLastCompletion = differenceInHours(now, lastCompleted);

      // Se completou nas últimas 24h, está ok
      if (hoursSinceLastCompletion < 24) {
        return {
          penaltyApplied: false,
          pointsLost: 0,
          reason: null,
          message: 'Hábito em dia! ✅',
        };
      }

      // Verificar se já tem penalidade aplicada hoje
      const today = startOfDay(now).toISOString();
      const { data: existingPenalty } = await penaltiesTable()
        .select('id')
        .eq('habit_id', habitId)
        .gte('penalty_date', today)
        .maybeSingle();

      if (existingPenalty) {
        return {
          penaltyApplied: false,
          pointsLost: 0,
          reason: null,
          message: 'Penalidade já aplicada hoje',
        };
      }

      // ✅ FIX: Sistema de grace period simplificado
      // Verifica se há uma completion recente (últimas 48h)
      // Se sim, não aplica penalidade ainda
      if (GRACE_PERIOD.enabled && hoursSinceLastCompletion < 48) {
        return {
          penaltyApplied: false,
          pointsLost: 0,
          reason: null,
          message: '💙 Período de graça! Você tem até amanhã.',
        };
      }

      // Determinar tipo de penalidade
      let reason: string;
      let pointsLost: number;

      // ✅ FIX: Cast explícito para evitar erro de tipagem
      const difficulty = habit.difficulty as 'easy' | 'medium' | 'hard';

      if (hoursSinceLastCompletion >= 72) {
        // 3+ dias perdidos = penalidade maior
        reason = PENALTY_REASONS.CONSECUTIVE_MISS;
        pointsLost = PENALTY_CONFIG[difficulty].consecutiveMiss;
      } else if (streak.current_streak > 0) {
        // Quebrou uma streak
        reason = PENALTY_REASONS.STREAK_BROKEN;
        pointsLost = PENALTY_CONFIG[difficulty].streakBroken;
      } else {
        // Apenas perdeu um dia
        reason = PENALTY_REASONS.MISSED_DAY;
        pointsLost = PENALTY_CONFIG[difficulty].missedDay;
      }

      // Aplicar penalidade
      await this.applyPenalty(habit.user_id, habitId, pointsLost, reason);

      return {
        penaltyApplied: true,
        pointsLost,
        reason,
        message: `Penalidade aplicada: -${pointsLost} pontos`,
      };
    } catch (error) {
      // ✅ FIX: Console.error removido
      return {
        penaltyApplied: false,
        pointsLost: 0,
        reason: null,
        message: 'Erro ao verificar penalidades',
      };
    }
  },

  // ✅ FIX: Corrigido - atualiza streak na tabela correta
  async applyPenalty(
    userId: string,
    habitId: string,
    pointsLost: number,
    reason: string
  ): Promise<void> {
    try {
      // Registrar penalidade
      await penaltiesTable().insert({
        user_id: userId,
        habit_id: habitId,
        points_lost: pointsLost,
        reason,
        penalty_date: startOfDay(new Date()).toISOString(),
      });

      // Deduzir pontos do usuário
      const { data: profile } = await profilesTable()
        .select('total_points')
        .eq('id', userId)
        .single();

      if (profile) {
        const newPoints = Math.max(0, profile.total_points - pointsLost);
        await profilesTable()
          .update({ total_points: newPoints })
          .eq('id', userId);
      }

      // ✅ FIX: Resetar streak na tabela correta
      await streaksTable()
        .update({ current_streak: 0 })
        .eq('habit_id', habitId);
    } catch (error) {
      // ✅ FIX: Console.error removido
      throw error;
    }
  },

  // ✅ FIX: Corrigido - busca hábitos ativos
  async checkAllHabits(userId: string): Promise<PenaltyResult[]> {
    try {
      const { data: habits } = await habitsTable()
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (!habits || habits.length === 0) {
        return [];
      }

      const results: PenaltyResult[] = [];
      for (const habit of habits) {
        const result = await this.checkMissedDay(habit.id);
        if (result.penaltyApplied) {
          results.push(result);
        }
      }

      return results;
    } catch (error) {
      // ✅ FIX: Console.error removido
      return [];
    }
  },

  async getPenaltyHistory(userId: string, limit: number = 30) {
    try {
      const { data, error } = await penaltiesTable()
        .select(`
          *,
          habits (
            name,
            difficulty,
            color
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      // ✅ FIX: Console.error removido
      return { data: null, error };
    }
  },

  async getPenaltyStats(userId: string) {
    try {
      const { data: penalties } = await penaltiesTable()
        .select('points_lost, reason')
        .eq('user_id', userId);

      if (!penalties || penalties.length === 0) {
        return {
          totalPenalties: 0,
          totalPointsLost: 0,
          byReason: {},
        };
      }

      const totalPenalties = penalties.length;
      const totalPointsLost = penalties.reduce(
        (sum: number, p: any) => sum + p.points_lost,
        0
      );

      const byReason = penalties.reduce((acc: any, p: any) => {
        acc[p.reason] = (acc[p.reason] || 0) + 1;
        return acc;
      }, {});

      return {
        totalPenalties,
        totalPointsLost,
        byReason,
      };
    } catch (error) {
      // ✅ FIX: Console.error removido
      return {
        totalPenalties: 0,
        totalPointsLost: 0,
        byReason: {},
      };
    }
  },
};