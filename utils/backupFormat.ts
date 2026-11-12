// utils/backupFormat.ts
//
// Formato do backup de hábitos — lógica pura (sem banco nem arquivos): tipos,
// validação do JSON importado e geração do CSV. Usada pelo
// services/dataTransferService.ts e coberta por testes. Ao mudar o formato,
// suba BACKUP_VERSION e mantenha a leitura das versões anteriores.
import { format } from 'date-fns';
import { FrequencyGoalPeriod, HabitFrequencyType, HabitType } from '@/types/database';

export const BACKUP_FORMAT = 'my-habits-tracker/backup';
export const BACKUP_VERSION = 1;

export interface BackupCompletion {
  completed_at: string;
  value_achieved: number | null;
}

export interface BackupReminder {
  time: string;
  days_of_week: number[] | null;
  is_active: boolean;
  sound: string | null;
}

export interface BackupHabit {
  name: string;
  description: string | null;
  type: HabitType;
  color: string;
  icon: string;
  frequency_type: HabitFrequencyType;
  frequency_days: number[] | null;
  has_target: boolean;
  target_value: number | null;
  target_unit: string | null;
  frequency_goal_value: number | null;
  frequency_goal_period: FrequencyGoalPeriod | null;
  frequency_goal_custom_days: number | null;
  created_at: string;
  completions: BackupCompletion[];
  reminders: BackupReminder[];
}

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  habits: BackupHabit[];
}

/** Uma linha por conclusão, separada por ';' (padrão do Excel em pt-BR). */
export function backupToCsv(backup: BackupFile): string {
  const cell = (value: string) =>
    /[;"\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

  const rows = backup.habits.flatMap((h) =>
    h.completions.map((c) => {
      const date = new Date(c.completed_at);
      return [
        h.name,
        format(date, 'yyyy-MM-dd'),
        format(date, 'HH:mm'),
        c.value_achieved === null ? '' : String(c.value_achieved).replace('.', ','),
        h.has_target ? (h.target_unit ?? '') : '',
      ];
    })
  );
  rows.sort((a, b) => (a[1] + a[2]).localeCompare(b[1] + b[2]));

  const lines = [['Hábito', 'Data', 'Horário', 'Valor', 'Unidade'], ...rows].map((r) =>
    r.map(cell).join(';')
  );
  // BOM: sem ele o Excel abre o UTF-8 com os acentos quebrados.
  return '\uFEFF' + lines.join('\r\n') + '\r\n';
}

export class BackupFormatError extends Error {}

const HABIT_TYPES: HabitType[] = ['positive', 'negative'];
const FREQUENCY_TYPES: HabitFrequencyType[] = ['daily', 'weekly', 'custom'];
const GOAL_PERIODS: FrequencyGoalPeriod[] = ['week', 'month', 'custom'];

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const numOrNull = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const strOrNull = (v: unknown) => (typeof v === 'string' ? v : null);
const validDays = (v: unknown) =>
  Array.isArray(v) && v.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)
    ? (v as number[])
    : null;
const validDate = (v: unknown) => typeof v === 'string' && !Number.isNaN(new Date(v).getTime());

function sanitizeHabit(raw: unknown): BackupHabit | null {
  if (!isRecord(raw)) return null;
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (!name || name.length > 100) return null;
  if (!HABIT_TYPES.includes(raw.type as HabitType)) return null;
  if (!FREQUENCY_TYPES.includes(raw.frequency_type as HabitFrequencyType)) return null;

  const completions = (Array.isArray(raw.completions) ? raw.completions : [])
    .filter((c): c is Record<string, unknown> => isRecord(c) && validDate(c.completed_at))
    .map((c) => ({
      completed_at: c.completed_at as string,
      value_achieved: numOrNull(c.value_achieved),
    }));

  const reminders = (Array.isArray(raw.reminders) ? raw.reminders : [])
    .filter(
      (r): r is Record<string, unknown> =>
        isRecord(r) && typeof r.time === 'string' && /^\d{2}:\d{2}(:\d{2})?$/.test(r.time)
    )
    .map((r) => ({
      time: (r.time as string).slice(0, 5),
      days_of_week: validDays(r.days_of_week),
      is_active: r.is_active !== false,
      sound: strOrNull(r.sound),
    }));

  return {
    name,
    description: strOrNull(raw.description),
    type: raw.type as HabitType,
    color: typeof raw.color === 'string' ? raw.color : '#3B82F6',
    icon: typeof raw.icon === 'string' ? raw.icon : 'star',
    frequency_type: raw.frequency_type as HabitFrequencyType,
    frequency_days: validDays(raw.frequency_days),
    has_target: raw.has_target === true,
    target_value: numOrNull(raw.target_value),
    target_unit: strOrNull(raw.target_unit),
    frequency_goal_value: numOrNull(raw.frequency_goal_value),
    frequency_goal_period: GOAL_PERIODS.includes(raw.frequency_goal_period as FrequencyGoalPeriod)
      ? (raw.frequency_goal_period as FrequencyGoalPeriod)
      : null,
    frequency_goal_custom_days: numOrNull(raw.frequency_goal_custom_days),
    created_at: validDate(raw.created_at) ? (raw.created_at as string) : new Date().toISOString(),
    completions,
    reminders,
  };
}

/** Lê e valida o arquivo. Hábitos com dados inválidos são pulados e contados. */
export function parseBackup(text: string): { backup: BackupFile; skipped: number } {
  let raw: unknown;
  try {
    raw = JSON.parse(text.replace(/^\uFEFF/, ''));
  } catch {
    throw new BackupFormatError('O arquivo não é um backup válido (JSON ilegível).');
  }
  if (!isRecord(raw) || raw.format !== BACKUP_FORMAT || !Array.isArray(raw.habits)) {
    throw new BackupFormatError('O arquivo não é um backup do My Habits Tracker.');
  }
  if (typeof raw.version !== 'number' || raw.version > BACKUP_VERSION) {
    throw new BackupFormatError(
      'Este backup foi gerado por uma versão mais nova do app. Atualize o app para importá-lo.'
    );
  }

  const habits = raw.habits.map(sanitizeHabit);
  const valid = habits.filter((h): h is BackupHabit => h !== null);
  return {
    backup: {
      format: BACKUP_FORMAT,
      version: raw.version,
      exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : '',
      habits: valid,
    },
    skipped: habits.length - valid.length,
  };
}
