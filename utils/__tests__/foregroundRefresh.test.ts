import { foregroundRefreshDecision } from '../foregroundRefresh';
import { local } from './testHelpers';

const MIN = 5 * 60 * 1000;

describe('foregroundRefreshDecision', () => {
  it('troca rápida de app: não busca', () => {
    expect(
      foregroundRefreshDecision(local('2026-11-11', '15:00'), local('2026-11-11', '15:02'), MIN)
    ).toEqual({ refresh: false, dayChanged: false });
  });

  it('depois do tempo mínimo em segundo plano: busca', () => {
    expect(
      foregroundRefreshDecision(local('2026-11-11', '15:00'), local('2026-11-11', '15:05'), MIN)
    ).toEqual({ refresh: true, dayChanged: false });
  });

  it('virou o dia, mesmo que por pouco tempo: busca e avisa', () => {
    expect(
      foregroundRefreshDecision(local('2026-11-11', '23:59'), local('2026-11-12', '00:01'), MIN)
    ).toEqual({ refresh: true, dayChanged: true });
  });

  it('sem ter ido para o segundo plano: não busca', () => {
    expect(foregroundRefreshDecision(null, local('2026-11-11', '15:00'), MIN)).toEqual({
      refresh: false,
      dayChanged: false,
    });
  });
});
