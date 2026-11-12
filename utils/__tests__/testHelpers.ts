// utils/__tests__/testHelpers.ts
import { Habit } from '@/types/database';

/** "Hoje" fixo dos testes: quarta-feira, 11/11/2026, 15h (horário local). */
export const NOW = new Date('2026-11-11T15:00:00');

/** Data/hora LOCAL (o fuso dos testes é America/Sao_Paulo, ver jest.global-setup.js). */
export const local = (day: string, time = '12:00') => new Date(`${day}T${time}:00`);

/** Conclusão em um dia local (por padrão ao meio-dia). */
export const doneAt = (day: string, time = '12:00') => ({ completed_at: local(day, time).toISOString() });

export function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'habit-1',
    user_id: 'user-1',
    name: 'Ler',
    description: null,
    type: 'positive',
    color: '#3B82F6',
    icon: 'star',
    frequency_type: 'daily',
    frequency_days: null,
    has_target: false,
    target_value: null,
    target_unit: null,
    frequency_goal_value: null,
    frequency_goal_period: null,
    frequency_goal_custom_days: null,
    is_active: true,
    created_at: local('2026-10-01').toISOString(),
    updated_at: local('2026-10-01').toISOString(),
    ...overrides,
  };
}
