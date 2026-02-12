// constants/GameConfig.ts

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

export const FREQUENCY_CONFIG = {
  daily: {
    label: 'Diário',
    description: 'Todos os dias',
  },
  weekly: {
    label: 'Semanal',
    description: '1x por semana',
  },
  custom: {
    label: 'Personalizado',
    description: 'Escolha os dias',
  },
} as const;

export const HABIT_TYPE_CONFIG = {
  positive: {
    label: 'Positivo',
    description: 'Fazer algo',
    color: '#10B981',
  },
  negative: {
    label: 'Negativo',
    description: 'Evitar algo',
    color: '#EF4444',
  },
} as const;