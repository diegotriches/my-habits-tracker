import { 
  DIFFICULTY_POINTS, 
  FREQUENCY_MULTIPLIERS, 
  STREAK_BONUSES,
  PENALTY_CONFIG 
} from '@/constants/GameConfig';
import { Habit, Streak } from '@/types/database';

/**
 * Calcula os pontos base de um hábito baseado na dificuldade
 */
export const getBasePoints = (difficulty: Habit['difficulty']): number => {
  return DIFFICULTY_POINTS[difficulty];
};

/**
 * Calcula o multiplicador de frequência
 * Para frequências customizadas, calcula baseado no número de dias
 */
export const getFrequencyMultiplier = (
  frequencyType: Habit['frequency_type'],
  frequencyDays?: number[] | null
): number => {
  if (frequencyType === 'custom' && frequencyDays) {
    const daysCount = frequencyDays.length;
    // Lógica: quanto menos dias, maior o multiplicador
    if (daysCount === 1) return 2.0;
    if (daysCount === 2) return 1.8;
    if (daysCount === 3) return 1.5;
    if (daysCount === 4) return 1.3;
    if (daysCount === 5) return 1.2;
    if (daysCount === 6) return 1.1;
    return 1.0; // 7 dias = diário
  }
  
  // Para daily e weekly, usar os valores do config
  if (frequencyType === 'daily' || frequencyType === 'weekly') {
    return FREQUENCY_MULTIPLIERS[frequencyType];
  }
  
  return 1.0;
};

/**
 * Calcula o multiplicador de streak baseado nos dias consecutivos
 */
export const getStreakMultiplier = (currentStreak: number): number => {
  // Encontra o maior bônus aplicável
  const bonus = STREAK_BONUSES
    .slice()
    .reverse()
    .find(b => currentStreak >= b.days);
  
  return bonus ? bonus.multiplier : 1.0;
};

/**
 * Calcula o total de pontos ganhos ao completar um hábito
 */
export const calculateCompletionPoints = (
  habit: Habit,
  currentStreak: number = 0
): number => {
  let points = getBasePoints(habit.difficulty);
  
  // Aplicar multiplicador de frequência
  const freqMultiplier = getFrequencyMultiplier(
    habit.frequency_type,
    habit.frequency_days
  );
  points *= freqMultiplier;
  
  // Aplicar multiplicador de streak
  const streakMultiplier = getStreakMultiplier(currentStreak);
  points *= streakMultiplier;
  
  return Math.floor(points);
};

/**
 * Calcula a penalidade por perder um dia
 */
export const calculateMissedDayPenalty = (
  habit: Habit,
  streak?: Streak
): number => {
  const basePoints = getBasePoints(habit.difficulty);
  let penalty = basePoints * PENALTY_CONFIG.MISSED_DAY_MULTIPLIER;
  
  // Penalidade extra se quebrar uma streak longa
  if (streak && streak.current_streak >= PENALTY_CONFIG.STREAK_BREAK_THRESHOLD) {
    penalty += PENALTY_CONFIG.STREAK_BREAK_PENALTY;
  }
  
  return Math.floor(penalty);
};

/**
 * Calcula o próximo nível baseado nos pontos totais
 */
export const calculateLevel = (totalPoints: number): number => {
  // Níveis e seus requisitos (de acordo com a tabela levels)
  if (totalPoints >= 30000) return 10;
  if (totalPoints >= 15000) return 9;
  if (totalPoints >= 8000) return 8;
  if (totalPoints >= 4000) return 7;
  if (totalPoints >= 2000) return 6;
  if (totalPoints >= 1000) return 5;
  if (totalPoints >= 500) return 4;
  if (totalPoints >= 250) return 3;
  if (totalPoints >= 100) return 2;
  return 1;
};

/**
 * Calcula quantos pontos faltam para o próximo nível
 */
export const calculatePointsToNextLevel = (
  currentPoints: number,
  currentLevel: number
): { pointsNeeded: number; nextLevelPoints: number } => {
  const levelThresholds = [0, 100, 250, 500, 1000, 2000, 4000, 8000, 15000, 30000];
  
  if (currentLevel >= 10) {
    return { pointsNeeded: 0, nextLevelPoints: 30000 };
  }
  
  const nextLevelPoints = levelThresholds[currentLevel];
  const pointsNeeded = nextLevelPoints - currentPoints;
  
  return { pointsNeeded, nextLevelPoints };
};

/**
 * Calcula o progresso percentual para o próximo nível
 */
export const calculateLevelProgress = (
  currentPoints: number,
  currentLevel: number
): number => {
  const levelThresholds = [0, 100, 250, 500, 1000, 2000, 4000, 8000, 15000, 30000];
  
  if (currentLevel >= 10) return 100;
  
  const currentLevelPoints = levelThresholds[currentLevel - 1];
  const nextLevelPoints = levelThresholds[currentLevel];
  
  const pointsInLevel = currentPoints - currentLevelPoints;
  const pointsRequiredForLevel = nextLevelPoints - currentLevelPoints;
  
  return Math.floor((pointsInLevel / pointsRequiredForLevel) * 100);
};

/**
 * Retorna informações sobre o próximo bônus de streak
 */
export const getNextStreakBonus = (currentStreak: number) => {
  const nextBonus = STREAK_BONUSES.find(b => currentStreak < b.days);
  
  if (!nextBonus) {
    return {
      achieved: true,
      daysToNext: 0,
      nextMultiplier: STREAK_BONUSES[STREAK_BONUSES.length - 1].multiplier,
      nextLabel: 'Máximo alcançado!',
    };
  }
  
  return {
    achieved: false,
    daysToNext: nextBonus.days - currentStreak,
    nextMultiplier: nextBonus.multiplier,
    nextLabel: nextBonus.label,
  };
};