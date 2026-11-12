import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  BackupFile,
  BackupFormatError,
  backupToCsv,
  parseBackup,
} from '../backupFormat';
import { local } from './testHelpers';

const habit = (overrides: Record<string, unknown> = {}) => ({
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
  created_at: '2026-10-01T15:00:00.000Z',
  completions: [{ completed_at: '2026-11-10T15:00:00.000Z', value_achieved: null }],
  reminders: [{ time: '08:00', days_of_week: [1, 3, 5], is_active: true, sound: 'bell' }],
  ...overrides,
});

const file = (habits: unknown[], extra: Record<string, unknown> = {}) =>
  JSON.stringify({
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: '2026-11-12T00:00:00.000Z',
    habits,
    ...extra,
  });

describe('parseBackup', () => {
  it('lê um backup válido', () => {
    const { backup, skipped } = parseBackup(file([habit()]));
    expect(skipped).toBe(0);
    expect(backup.habits).toHaveLength(1);
    expect(backup.habits[0]).toMatchObject({
      name: 'Ler',
      type: 'positive',
      frequency_type: 'daily',
    });
    expect(backup.habits[0].reminders[0]).toEqual({
      time: '08:00',
      days_of_week: [1, 3, 5],
      is_active: true,
      sound: 'bell',
    });
  });

  it('aceita o BOM que editores costumam colocar no início', () => {
    expect(parseBackup('\uFEFF' + file([habit()])).backup.habits).toHaveLength(1);
  });

  it('rejeita JSON ilegível', () => {
    expect(() => parseBackup('{ não é json')).toThrow(BackupFormatError);
  });

  it('rejeita arquivos que não são backup do app', () => {
    expect(() => parseBackup(JSON.stringify({ habits: [] }))).toThrow(BackupFormatError);
    expect(() => parseBackup(JSON.stringify([1, 2, 3]))).toThrow(BackupFormatError);
  });

  it('rejeita backup de uma versão mais nova do formato', () => {
    expect(() => parseBackup(file([habit()], { version: BACKUP_VERSION + 1 }))).toThrow(
      /versão mais nova/
    );
  });

  it('pula hábitos inválidos e conta quantos foram pulados', () => {
    const { backup, skipped } = parseBackup(
      file([
        habit(),
        habit({ name: '' }),
        habit({ type: 'neutro' }),
        habit({ frequency_type: 'mensal' }),
        'não é um objeto',
      ])
    );
    expect(backup.habits).toHaveLength(1);
    expect(skipped).toBe(4);
  });

  it('descarta conclusões com data inválida e lembretes com horário inválido', () => {
    const { backup } = parseBackup(
      file([
        habit({
          completions: [
            { completed_at: 'ontem' },
            { completed_at: '2026-11-10T15:00:00.000Z', value_achieved: 'x' },
          ],
          reminders: [{ time: '8h' }, { time: '20:30:00' }],
        }),
      ])
    );
    expect(backup.habits[0].completions).toEqual([
      { completed_at: '2026-11-10T15:00:00.000Z', value_achieved: null },
    ]);
    // Horário com segundos é normalizado para HH:MM.
    expect(backup.habits[0].reminders.map((r) => r.time)).toEqual(['20:30']);
  });

  it('dias da semana fora de 0–6 invalidam só aquele campo', () => {
    const { backup } = parseBackup(file([habit({ frequency_days: [1, 9] })]));
    expect(backup.habits[0].frequency_days).toBeNull();
  });

  it('mantém a data de arquivamento; backups antigos (sem o campo) vêm não arquivados', () => {
    const archived = parseBackup(file([habit({ archived_at: '2026-11-01T12:00:00.000Z' })]));
    expect(archived.backup.habits[0].archived_at).toBe('2026-11-01T12:00:00.000Z');
    expect(parseBackup(file([habit()])).backup.habits[0].archived_at).toBeNull();
    expect(
      parseBackup(file([habit({ archived_at: 'ontem' })])).backup.habits[0].archived_at
    ).toBeNull();
  });

  it('usa padrões para cor e ícone ausentes', () => {
    const { backup } = parseBackup(file([habit({ color: undefined, icon: 42 })]));
    expect(backup.habits[0]).toMatchObject({ color: '#3B82F6', icon: 'star' });
  });
});

describe('backupToCsv', () => {
  const backup = (habits: BackupFile['habits']): BackupFile => ({
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: '',
    habits,
  });
  const base = parseBackup(file([habit()])).backup.habits[0];

  it('começa com BOM e cabeçalho, separado por ponto e vírgula', () => {
    const csv = backupToCsv(backup([]));
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv.slice(1).split('\r\n')[0]).toBe('Hábito;Data;Horário;Valor;Unidade');
  });

  it('uma linha por conclusão, no dia e hora locais, em ordem cronológica', () => {
    const csv = backupToCsv(
      backup([
        {
          ...base,
          completions: [
            { completed_at: local('2026-11-10', '21:30').toISOString(), value_achieved: null },
            { completed_at: local('2026-11-09', '07:05').toISOString(), value_achieved: null },
          ],
        },
      ])
    );
    const rows = csv.slice(1).trim().split('\r\n').slice(1);
    expect(rows).toEqual(['Ler;2026-11-09;07:05;;', 'Ler;2026-11-10;21:30;;']);
  });

  it('valores com vírgula decimal e unidade só em hábitos com meta', () => {
    const csv = backupToCsv(
      backup([
        {
          ...base,
          has_target: true,
          target_unit: 'km',
          completions: [{ completed_at: local('2026-11-10').toISOString(), value_achieved: 5.5 }],
        },
      ])
    );
    expect(csv).toContain('Ler;2026-11-10;12:00;5,5;km');
  });

  it('escapa nomes com ponto e vírgula ou aspas', () => {
    const csv = backupToCsv(
      backup([
        {
          ...base,
          name: 'Ler; "livros"',
          completions: [{ completed_at: local('2026-11-10').toISOString(), value_achieved: null }],
        },
      ])
    );
    expect(csv).toContain('"Ler; ""livros""";2026-11-10');
  });
});
