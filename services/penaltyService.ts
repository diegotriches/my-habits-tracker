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
  has_target: boolean;
  target_value: number | null;
  created_at: string;
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
 * Calcula quantos dias o hábito deveria ser feito por semana
 */
function getExpectedDaysPerWeek(habit: HabitData): number {
  if (habit.frequency_type === 'daily') return 7;
  if (habit.frequency_type === 'weekly' && habit.frequency_days) {
    return habit.frequency_days.length;
  }
  return 7;
}

/**
 * ✅ CORRIGIDO: Verifica se o hábito atingiu a meta semanal
 * Considera apenas dias APÓS a criação do hábito
 */
async function checkWeeklyGoal(habitId: string): Promise<{
  completed: number;
  expected: number;
  metGoal: boolean;
}> {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 0 }); // Domingo
  const weekEnd = endOfWeek(now, { weekStartsOn: 0 }); // Sábado

  // 🆕 Buscar data de criação do hábito
  const { data: habit } = await habitsTable()
    .select('frequency_type, frequency_days, created_at')
    .eq('id', habitId)
    .single();

  if (!habit) {
    return { completed: 0, expected: 0, metGoal: false };
  }

  const habitCreatedAt = new Date(habit.created_at);
  
  // 🆕 Determinar data de início real (o mais recente entre início da semana e criação do hábito)
  const effectiveStartDate = habitCreatedAt > weekStart ? habitCreatedAt : weekStart;

  // Buscar conclusões desta semana (apenas APÓS a criação do hábito)
  const { data: completions } = await completionsTable()
    .select('id, completed_at')
    .eq('habit_id', habitId)
    .gte('completed_at', effectiveStartDate.toISOString())
    .lte('completed_at', weekEnd.toISOString());

  const completed = completions?.length || 0;

  // 🆕 Calcular dias esperados apenas para dias válidos (após criação)
  let expected = 0;
  
  if (habit.frequency_type === 'daily') {
    // Para hábitos diários, conta quantos dias válidos existem
    const effectiveStart = startOfDay(effectiveStartDate);
    const end = startOfDay(weekEnd);
    const totalDaysInWeek = Math.ceil((end.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    expected = Math.min(totalDaysInWeek, 7);
  } else if (habit.frequency_type === 'weekly' && habit.frequency_days) {
    // Para hábitos semanais, conta apenas dias da semana que são >= data de criação
    const validDays = habit.frequency_days.filter((dayOfWeek: number) => {
      // Encontrar a data desse dia da semana nesta semana
      const dayDate = new Date(weekStart);
      dayDate.setDate(weekStart.getDate() + dayOfWeek);
      
      // Só conta se for após ou no mesmo dia da criação do hábito
      return startOfDay(dayDate) >= startOfDay(habitCreatedAt);
    });
    expected = validDays.length;
  } else {
    expected = getExpectedDaysPerWeek(habit);
  }

  const metGoal = completed >= expected;

  console.log(`📊 checkWeeklyGoal para hábito ${habitId}:`, {
    habitCreatedAt: habitCreatedAt.toLocaleDateString(),
    weekStart: weekStart.toLocaleDateString(),
    effectiveStartDate: effectiveStartDate.toLocaleDateString(),
    completed,
    expected,
    metGoal,
  });

  return { completed, expected, metGoal };
}

/**
 * 🆕 Verifica se há progresso parcial registrado hoje
 * Retorna { hasProgress, percentage }
 */
async function checkTodayProgress(habitId: string, habit: HabitData): Promise<{
  hasProgress: boolean;
  percentage: number;
  pointsEarned: number;
}> {
  const today = startOfDay(new Date()).toISOString();
  const tomorrow = startOfDay(new Date(Date.now() + 86400000)).toISOString();

  const { data: completion } = await completionsTable()
    .select('value_achieved, points_earned')
    .eq('habit_id', habitId)
    .gte('completed_at', today)
    .lt('completed_at', tomorrow)
    .maybeSingle();

  if (!completion) {
    return { hasProgress: false, percentage: 0, pointsEarned: 0 };
  }

  // Se não é meta numérica, considera 100%
  if (!habit.has_target || !habit.target_value) {
    return { 
      hasProgress: true, 
      percentage: 100, 
      pointsEarned: completion.points_earned || 0 
    };
  }

  // Calcular percentual
  const currentValue = completion.value_achieved || 0;
  const percentage = (currentValue / habit.target_value) * 100;

  return { 
    hasProgress: true, 
    percentage, 
    pointsEarned: completion.points_earned || 0 
  };
}

export const penaltyService = {
  /**
   * 🔄 ATUALIZADO: Verifica penalidades respeitando progresso parcial
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

      // 🆕 Verificar se há progresso parcial hoje
      const { hasProgress, percentage, pointsEarned } = await checkTodayProgress(habitId, habit);

      // Se teve QUALQUER progresso (mesmo que < 100%), NÃO aplica penalidade
      if (hasProgress) {
        if (pointsEarned > 0) {
          return {
            penaltyApplied: false,
            pointsLost: 0,
            reason: null,
            message: `Meta completa! ${percentage.toFixed(0)}% ✅`,
          };
        } else {
          return {
            penaltyApplied: false,
            pointsLost: 0,
            reason: null,
            message: `Progresso parcial registrado (${percentage.toFixed(0)}%). Sem penalidade! 💪`,
          };
        }
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
        // ✅ CORRIGIDO: Verificar se o hábito já existia ontem
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const habitCreatedAt = new Date(habit.created_at);

        if (startOfDay(yesterday) < startOfDay(habitCreatedAt)) {
          return {
            penaltyApplied: false,
            pointsLost: 0,
            reason: null,
            message: 'Hábito criado recentemente, sem penalidades ainda',
          };
        }

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

        // Aplicar penalidade para hábito diário (apenas se NÃO teve progresso)
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
        if (dayOfWeek !== 0) {
          return {
            penaltyApplied: false,
            pointsLost: 0,
            reason: null,
            message: 'Penalidades semanais verificadas aos domingos',
          };
        }

        // ✅ CORRIGIDO: Verificar se o hábito foi criado esta semana
        const weekStart = startOfWeek(now, { weekStartsOn: 0 });
        const habitCreatedAt = new Date(habit.created_at);

        // Se o hábito foi criado NESTA semana, não aplica penalidade ainda
        if (habitCreatedAt >= weekStart) {
          return {
            penaltyApplied: false,
            pointsLost: 0,
            reason: null,
            message: 'Hábito criado esta semana, sem penalidades ainda',
          };
        }

        // Verificar se já aplicou penalidade esta semana
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

        // Verificar meta semanal (agora com lógica corrigida)
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
      console.error('Erro ao verificar penalidades:', error);
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
      console.error('Erro ao aplicar penalidade:', error);
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
      console.error('Erro ao verificar todos os hábitos:', error);
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
      console.error('Erro ao buscar histórico de penalidades:', error);
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
      console.error('Erro ao buscar estatísticas de penalidades:', error);
      return {
        totalPenalties: 0,
        totalPointsLost: 0,
        byReason: {},
      };
    }
  },

  /**
   * Helper para verificar progresso semanal de um hábito
   */
  async getWeeklyProgress(habitId: string) {
    return await checkWeeklyGoal(habitId);
  },
};