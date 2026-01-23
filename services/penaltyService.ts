import { supabase } from '@/services/supabase';
import { PENALTY_CONFIG, PENALTY_REASONS, GRACE_PERIOD } from '@/constants/PenaltyConfig';
import { differenceInHours, startOfDay, subDays, startOfWeek, endOfWeek } from 'date-fns';

interface HabitData {
  id: string;
  user_id: string;
  difficulty: 'easy' | 'medium' | 'hard';
  name: string;
  frequency_type: 'daily' | 'weekly' | 'custom';
  frequency_days: number[] | null;
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
  habitName?: string;
}

const penaltiesTable = () => supabase.from('penalties') as any;
const habitsTable = () => supabase.from('habits') as any;
const profilesTable = () => supabase.from('profiles') as any;
const streaksTable = () => supabase.from('streaks') as any;
const completionsTable = () => supabase.from('completions') as any;

/**
 * 🆕 Calcula quantos dias o hábito deveria ser feito por semana
 */
function getExpectedDaysPerWeek(habit: HabitData): number {
  if (habit.frequency_type === 'daily') return 7;
  if (habit.frequency_type === 'weekly' && habit.frequency_days) {
    return habit.frequency_days.length;
  }
  return 7;
}

/**
 * 🆕 Verifica se o hábito atingiu a meta semanal
 */
async function checkWeeklyGoal(habitId: string): Promise<{
  completed: number;
  expected: number;
  metGoal: boolean;
}> {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 0 }); // Domingo
  const weekEnd = endOfWeek(now, { weekStartsOn: 0 }); // Sábado

  // Buscar conclusões desta semana
  const { data: completions } = await completionsTable()
    .select('id')
    .eq('habit_id', habitId)
    .gte('completed_at', weekStart.toISOString())
    .lte('completed_at', weekEnd.toISOString());

  // Buscar dados do hábito
  const { data: habit } = await habitsTable()
    .select('frequency_type, frequency_days')
    .eq('id', habitId)
    .single();

  const completed = completions?.length || 0;
  const expected = habit ? getExpectedDaysPerWeek(habit) : 7;
  const metGoal = completed >= expected;

  return { completed, expected, metGoal };
}

export const penaltyService = {
  /**
   * 🔄 NOVA LÓGICA: Verifica penalidades baseado em META SEMANAL
   */
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

      // Buscar streak
      const { data: streak } = await streaksTable()
        .select('*')
        .eq('habit_id', habitId)
        .single();

      // Se nunca foi completado, não aplica penalidade ainda
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

      // 🆕 LÓGICA PARA HÁBITOS DIÁRIOS
      if (habit.frequency_type === 'daily') {
        // Se completou nas últimas 24h, está ok
        if (hoursSinceLastCompletion < 24) {
          return {
            penaltyApplied: false,
            pointsLost: 0,
            reason: null,
            message: 'Hábito em dia! ✅',
          };
        }

        // Verificar se já aplicou penalidade hoje
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

        // Grace period (48h)
        if (GRACE_PERIOD.enabled && hoursSinceLastCompletion < 48) {
          return {
            penaltyApplied: false,
            pointsLost: 0,
            reason: null,
            message: '💙 Período de graça! Você tem até amanhã.',
          };
        }

        // Aplicar penalidade para hábito diário
        let reason: string;
        let pointsLost: number;
        const difficulty = habit.difficulty as 'easy' | 'medium' | 'hard';

        if (hoursSinceLastCompletion >= 72) {
          reason = PENALTY_REASONS.CONSECUTIVE_MISS;
          pointsLost = PENALTY_CONFIG[difficulty].consecutiveMiss;
        } else if (streak.current_streak > 0) {
          reason = PENALTY_REASONS.STREAK_BROKEN;
          pointsLost = PENALTY_CONFIG[difficulty].streakBroken;
        } else {
          reason = PENALTY_REASONS.MISSED_DAY;
          pointsLost = PENALTY_CONFIG[difficulty].missedDay;
        }

        await this.applyPenalty(habit.user_id, habitId, pointsLost, reason);

        return {
          penaltyApplied: true,
          pointsLost,
          reason,
          message: `Penalidade aplicada: -${pointsLost} pontos`,
          habitName: habit.name,
        };
      }

      // 🆕 LÓGICA PARA HÁBITOS SEMANAIS
      if (habit.frequency_type === 'weekly') {
        const now = new Date();
        const dayOfWeek = now.getDay();

        // Só verifica penalidades aos DOMINGOS (fim da semana)
        // Isso dá tempo da pessoa completar a meta durante a semana
        if (dayOfWeek !== 0) {
          return {
            penaltyApplied: false,
            pointsLost: 0,
            reason: null,
            message: 'Penalidades semanais verificadas aos domingos',
          };
        }

        // Verificar se já aplicou penalidade esta semana
        const weekStart = startOfWeek(now, { weekStartsOn: 0 });
        const { data: existingPenalty } = await penaltiesTable()
          .select('id')
          .eq('habit_id', habitId)
          .gte('penalty_date', weekStart.toISOString())
          .maybeSingle();

        if (existingPenalty) {
          return {
            penaltyApplied: false,
            pointsLost: 0,
            reason: null,
            message: 'Penalidade semanal já aplicada',
          };
        }

        // Verificar meta semanal
        const { completed, expected, metGoal } = await checkWeeklyGoal(habitId);

        if (metGoal) {
          return {
            penaltyApplied: false,
            pointsLost: 0,
            reason: null,
            message: `Meta semanal atingida! ${completed}/${expected} ✅`,
          };
        }

        // Não atingiu a meta → aplicar penalidade
        const difficulty = habit.difficulty as 'easy' | 'medium' | 'hard';
        const reason = 'weekly_goal_not_met';
        const pointsLost = PENALTY_CONFIG[difficulty].missedDay * (expected - completed);

        await this.applyPenalty(habit.user_id, habitId, pointsLost, reason);

        return {
          penaltyApplied: true,
          pointsLost,
          reason,
          message: `Meta semanal não atingida: ${completed}/${expected}. -${pointsLost} pontos`,
          habitName: habit.name,
        };
      }

      // Frequência custom: sem penalidades por enquanto
      return {
        penaltyApplied: false,
        pointsLost: 0,
        reason: null,
        message: 'Hábitos customizados não têm penalidades',
      };
    } catch (error) {
      return {
        penaltyApplied: false,
        pointsLost: 0,
        reason: null,
        message: 'Erro ao verificar penalidades',
      };
    }
  },

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

      // Resetar streak
      await streaksTable()
        .update({ current_streak: 0 })
        .eq('habit_id', habitId);
    } catch (error) {
      throw error;
    }
  },

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
      return {
        totalPenalties: 0,
        totalPointsLost: 0,
        byReason: {},
      };
    }
  },

  /**
   * 🆕 Helper para verificar progresso semanal de um hábito
   */
  async getWeeklyProgress(habitId: string) {
    return await checkWeeklyGoal(habitId);
  },
};