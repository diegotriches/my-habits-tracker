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

export const PENALTY_REASONS = {
  MISSED_DAY: 'missed_day',
  STREAK_BROKEN: 'streak_broken',
  CONSECUTIVE_MISS: 'consecutive_miss',
} as const;

export const PENALTY_MESSAGES = {
  missed_day: 'Você perdeu um dia 😔',
  streak_broken: 'Sua sequência foi quebrada! 💔',
  consecutive_miss: 'Dias consecutivos perdidos 🚨',
};

// Número de horas para considerar "dia perdido"
export const MISSED_DAY_THRESHOLD_HOURS = 24;

// Sistema de perdão
export const GRACE_PERIOD = {
  enabled: true,
  daysAllowed: 1, // 1 dia de perdão por ciclo de streak
};