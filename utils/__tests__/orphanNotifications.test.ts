import { findOrphanNotificationIds } from '../orphanNotifications';

const active = new Set(['ativo']);
const n = (identifier: string, data: Record<string, unknown> | null) => ({ identifier, data });

describe('findOrphanNotificationIds', () => {
  it('cancela notificações de hábitos que não estão em uso', () => {
    const scheduled = [
      n('progresso-excluido', { habitId: 'excluido', type: 'progress_check' }),
      n('progresso-ativo', { habitId: 'ativo', type: 'progress_check' }),
      n('adiado-excluido', { habitId: 'excluido', type: 'snooze_reminder' }),
    ];
    expect(findOrphanNotificationIds(scheduled, active, 'android')).toEqual([
      'progresso-excluido',
      'adiado-excluido',
    ]);
  });

  it('Android: lembrete do expo-notifications é resto de versão antiga, mesmo de hábito ativo', () => {
    const scheduled = [n('lembrete', { habitId: 'ativo', type: 'habit_reminder' })];
    expect(findOrphanNotificationIds(scheduled, active, 'android')).toEqual(['lembrete']);
  });

  it('iOS: lembrete de hábito ativo fica (lá os lembretes são do expo-notifications)', () => {
    const scheduled = [n('lembrete', { habitId: 'ativo', type: 'habit_reminder' })];
    expect(findOrphanNotificationIds(scheduled, active, 'ios')).toEqual([]);
  });

  it('notificações sem hábito ficam', () => {
    const scheduled = [n('teste', { type: 'test' }), n('vazia', null), n('sem-data', {})];
    expect(findOrphanNotificationIds(scheduled, active, 'android')).toEqual([]);
  });

  it('sem hábitos em uso, toda notificação de hábito sai', () => {
    const scheduled = [n('a', { habitId: 'ativo', type: 'progress_check' })];
    expect(findOrphanNotificationIds(scheduled, new Set(), 'ios')).toEqual(['a']);
  });
});
