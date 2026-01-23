// constants/PenaltyConfig.ts

/**
 * Configuração de penalidades por dificuldade
 */
export const PENALTY_CONFIG = {
  easy: {
    missedDay: 5,
    streakBroken: 10,
    consecutiveMiss: 15,
  },
  medium: {
    missedDay: 10,
    streakBroken: 20,
    consecutiveMiss: 30,
  },
  hard: {
    missedDay: 15,
    streakBroken: 30,
    consecutiveMiss: 45,
  },
} as const;

/**
 * Razões de penalidades
 */
export const PENALTY_REASONS = {
  MISSED_DAY: 'missed_day',
  STREAK_BROKEN: 'streak_broken',
  CONSECUTIVE_MISS: 'consecutive_miss',
  WEEKLY_GOAL_NOT_MET: 'weekly_goal_not_met', // 🆕 Nova razão para hábitos semanais
} as const;

/**
 * Mensagens amigáveis para cada razão
 */
export const PENALTY_MESSAGES = {
  missed_day: 'Você perdeu um dia 😔',
  streak_broken: 'Sua sequência foi quebrada! 💔',
  consecutive_miss: 'Dias consecutivos perdidos 🚨',
  weekly_goal_not_met: 'Meta semanal não atingida 📉', // 🆕
} as const;

/**
 * Número de horas para considerar "dia perdido"
 */
export const MISSED_DAY_THRESHOLD_HOURS = 24;

/**
 * Sistema de perdão / grace period
 * Para hábitos diários: 48h de tolerância antes de aplicar penalidade
 * Para hábitos semanais: verificação apenas aos domingos
 */
export const GRACE_PERIOD = {
  enabled: true,
  daysAllowed: 1, // 1 dia de perdão por ciclo de streak
  hours: 48, // 🆕 48 horas para hábitos diários (usado no penaltyService)
} as const;

/**
 * 🆕 Helper para obter mensagem amigável
 */
export function getPenaltyMessage(reason: string): string {
  return PENALTY_MESSAGES[reason as keyof typeof PENALTY_MESSAGES] || 'Penalidade aplicada';
}

/**
 * 🆕 Helper para calcular penalidade de meta semanal
 * Exemplo: Hábito 3x/semana, fez só 1x = 2 dias faltantes
 * Penalidade = missedDay × dias_faltantes
 */
export function calculateWeeklyGoalPenalty(
  difficulty: 'easy' | 'medium' | 'hard',
  daysMissed: number
): number {
  const basePoints = PENALTY_CONFIG[difficulty].missedDay;
  return basePoints * daysMissed;
}