import { dayAccessibilityHint, dayAccessibilityLabel } from '../a11y';
import { local } from './testHelpers';

const wed = local('2026-11-11');

describe('dayAccessibilityLabel', () => {
  it('diz o dia por extenso e o estado', () => {
    expect(dayAccessibilityLabel(wed, { status: 'done' })).toBe(
      'quarta-feira, 11 de novembro, feito'
    );
    expect(dayAccessibilityLabel(wed, { status: 'missed' })).toBe(
      'quarta-feira, 11 de novembro, não feito'
    );
    expect(dayAccessibilityLabel(wed, { status: 'unscheduled' })).toBe(
      'quarta-feira, 11 de novembro, não programado'
    );
    expect(dayAccessibilityLabel(wed, { status: 'future' })).toBe(
      'quarta-feira, 11 de novembro, dia futuro'
    );
  });

  it('anuncia quando é hoje', () => {
    expect(dayAccessibilityLabel(wed, { status: 'done', isToday: true })).toBe(
      'hoje, quarta-feira, 11 de novembro, feito'
    );
  });

  it('hábito negativo: marcado é "evitado"', () => {
    expect(dayAccessibilityLabel(wed, { status: 'done', isNegative: true })).toMatch(/evitado$/);
    expect(dayAccessibilityLabel(wed, { status: 'missed', isNegative: true })).toMatch(
      /não marcado$/
    );
  });

  it('meta numérica: percentual ou meta atingida', () => {
    expect(dayAccessibilityLabel(wed, { status: 'done', percentage: 60 })).toMatch(/60% da meta$/);
    expect(dayAccessibilityLabel(wed, { status: 'done', percentage: 120 })).toMatch(
      /meta atingida$/
    );
  });
});

describe('dayAccessibilityHint', () => {
  it('orienta a ação conforme o estado', () => {
    expect(dayAccessibilityHint('done')).toBe('Toque para desmarcar ou alterar');
    expect(dayAccessibilityHint('missed')).toBe('Toque para marcar');
    expect(dayAccessibilityHint('future')).toBeUndefined();
  });
});
