// Configurações do sistema de gamificação

export const DIFFICULTY_POINTS = {
  easy: 10,
  medium: 20,
  hard: 30,
} as const;

export const FREQUENCY_MULTIPLIERS = {
  daily: 1.0,
  five_per_week: 1.2,
  three_per_week: 1.5,
  weekly: 2.0,
} as const;

export const STREAK_BONUSES = [
  { days: 7, multiplier: 1.5, label: '1 Semana' },
  { days: 14, multiplier: 2.0, label: '2 Semanas' },
  { days: 30, multiplier: 2.5, label: '1 Mês' },
  { days: 90, multiplier: 3.0, label: '3 Meses' },
] as const;

export const PENALTY_CONFIG = {
  MISSED_DAY_MULTIPLIER: 0.5, // Perde 50% dos pontos base
  STREAK_BREAK_PENALTY: 100, // Penalidade fixa ao quebrar streak 7+
  STREAK_BREAK_THRESHOLD: 7, // Dias mínimos para aplicar penalidade extra
} as const;

export const HABIT_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#84CC16', // Lime
  '#6366F1', // Indigo
] as const;

export const HABIT_ICONS = [
  'star',
  'heart',
  'fire',
  'trophy',
  'target',
  'book',
  'dumbbell',
  'apple',
  'moon',
  'sun',
  'water',
  'meditation',
  'coffee',
  'music',
  'art',
] as const;

export const DIFFICULTY_CONFIG = {
  easy: {
    label: 'Fácil',
    color: '#10B981',
    points: DIFFICULTY_POINTS.easy,
    description: 'Hábitos simples do dia a dia',
  },
  medium: {
    label: 'Médio',
    color: '#F59E0B',
    points: DIFFICULTY_POINTS.medium,
    description: 'Requer esforço moderado',
  },
  hard: {
    label: 'Difícil',
    color: '#EF4444',
    points: DIFFICULTY_POINTS.hard,
    description: 'Desafiador e exige disciplina',
  },
} as const;

export const FREQUENCY_CONFIG = {
  daily: {
    label: 'Diário',
    description: 'Todos os dias',
    multiplier: FREQUENCY_MULTIPLIERS.daily,
  },
  weekly: {
    label: 'Semanal',
    description: '1x por semana',
    multiplier: FREQUENCY_MULTIPLIERS.weekly,
  },
  custom: {
    label: 'Personalizado',
    description: 'Escolha os dias',
    multiplier: 1.0,
  },
} as const;

export const HABIT_TYPE_CONFIG = {
  positive: {
    label: 'Positivo',
    description: 'Fazer algo',
    color: '#10B981',
    icon: '✅',
  },
  negative: {
    label: 'Negativo',
    description: 'Evitar algo',
    color: '#EF4444',
    icon: '🚫',
  },
} as const;