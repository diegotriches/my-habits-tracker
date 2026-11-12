// services/dataTransferService.ts
import { DeviceEventEmitter } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { format } from 'date-fns';
import { fetchAllRows, supabase } from './supabase';
import { retroactiveCompletionService } from './retroactiveCompletionService';
import { reminderSyncService } from './reminderSyncService';
import { progressNotificationScheduler } from './progressNotificationScheduler';
import {
  CompletionInsert,
  FrequencyGoalPeriod,
  HabitFrequencyType,
  HabitInsert,
  HabitType,
  ReminderInsert,
} from '@/types/database';
import { MAX_REMINDERS } from '@/constants/HabitForm';

/**
 * Exportação e importação dos dados de hábitos.
 *
 * - Backup em JSON (reimportável): hábitos, conclusões e lembretes, sem
 *   nenhum id do banco — o arquivo pode ser importado em qualquer conta.
 * - Histórico em CSV (só exportação), para abrir numa planilha.
 * - Importação mescla por nome: hábito com o mesmo nome de um existente
 *   recebe só os dias que faltam e os lembretes de horários que ainda não
 *   tem; os demais são criados. Importar o mesmo arquivo de novo não duplica
 *   nada — inclusive para completar uma importação que falhou no meio.
 */

export const BACKUP_FORMAT = 'my-habits-tracker/backup';
export const BACKUP_VERSION = 1;

/** Emitido após uma importação, para as telas buscarem os dados de novo. */
export const DATA_IMPORTED_EVENT = 'HabitDataImported';

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

export interface ImportPreview {
  habitsToCreate: number;
  habitsToMerge: number;
  completions: number;
  /** Hábitos do arquivo ignorados por dados inválidos. */
  skipped: number;
}

export interface ImportSummary {
  habitsCreated: number;
  habitsMerged: number;
  completionsAdded: number;
  remindersAdded: number;
}

const INSERT_BATCH = 500;

const nameKey = (name: string) => name.trim().toLocaleLowerCase('pt-BR');
const localDay = (iso: string) => format(new Date(iso), 'yyyy-MM-dd');

// ---------------------------------------------------------------------------
// Exportação
// ---------------------------------------------------------------------------

function fetchAllCompletions(habitIds: string[]) {
  return fetchAllRows((from, to) =>
    supabase
      .from('completions')
      .select('habit_id, completed_at, value_achieved')
      .in('habit_id', habitIds)
      .order('completed_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to)
  );
}

export async function buildBackup(userId: string): Promise<BackupFile> {
  const { data: habits, error: habitsError } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });
  if (habitsError) throw habitsError;

  const habitIds = (habits ?? []).map(h => h.id);
  const completions = habitIds.length > 0 ? await fetchAllCompletions(habitIds) : [];

  const { data: reminders, error: remindersError } = habitIds.length > 0
    ? await supabase
        .from('reminders')
        .select('habit_id, time, days_of_week, is_active, sound')
        .in('habit_id', habitIds)
    : { data: [], error: null };
  if (remindersError) throw remindersError;

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    habits: (habits ?? []).map(h => ({
      name: h.name,
      description: h.description,
      type: h.type,
      color: h.color,
      icon: h.icon,
      frequency_type: h.frequency_type,
      frequency_days: h.frequency_days,
      has_target: h.has_target,
      target_value: h.target_value,
      target_unit: h.target_unit,
      frequency_goal_value: h.frequency_goal_value,
      frequency_goal_period: h.frequency_goal_period,
      frequency_goal_custom_days: h.frequency_goal_custom_days,
      created_at: h.created_at,
      completions: completions
        .filter(c => c.habit_id === h.id)
        .map(c => ({ completed_at: c.completed_at, value_achieved: c.value_achieved })),
      reminders: (reminders ?? [])
        .filter(r => r.habit_id === h.id)
        .map(r => ({ time: r.time, days_of_week: r.days_of_week, is_active: r.is_active, sound: r.sound })),
    })),
  };
}

/** Uma linha por conclusão, separada por ';' (padrão do Excel em pt-BR). */
export function backupToCsv(backup: BackupFile): string {
  const cell = (value: string) =>
    /[;"\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

  const rows = backup.habits.flatMap(h =>
    h.completions.map(c => {
      const date = new Date(c.completed_at);
      return [
        h.name,
        format(date, 'yyyy-MM-dd'),
        format(date, 'HH:mm'),
        c.value_achieved === null ? '' : String(c.value_achieved).replace('.', ','),
        h.has_target ? h.target_unit ?? '' : '',
      ];
    })
  );
  rows.sort((a, b) => (a[1] + a[2]).localeCompare(b[1] + b[2]));

  const lines = [['Hábito', 'Data', 'Horário', 'Valor', 'Unidade'], ...rows].map(r => r.map(cell).join(';'));
  // BOM: sem ele o Excel abre o UTF-8 com os acentos quebrados.
  return '﻿' + lines.join('\r\n') + '\r\n';
}

async function writeAndShare(fileName: string, content: string, mimeType: string, dialogTitle: string) {
  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true });
  file.write(content);
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Compartilhamento de arquivos indisponível neste aparelho');
  }
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle });
}

export async function exportBackup(userId: string): Promise<number> {
  const backup = await buildBackup(userId);
  const fileName = `habitos-backup-${format(new Date(), 'yyyy-MM-dd')}.json`;
  await writeAndShare(fileName, JSON.stringify(backup, null, 2), 'application/json', 'Salvar backup dos hábitos');
  return backup.habits.length;
}

export async function exportHistoryCsv(userId: string): Promise<number> {
  const backup = await buildBackup(userId);
  const fileName = `habitos-historico-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  await writeAndShare(fileName, backupToCsv(backup), 'text/csv', 'Exportar histórico');
  return backup.habits.reduce((sum, h) => sum + h.completions.length, 0);
}

// ---------------------------------------------------------------------------
// Leitura e validação do arquivo
// ---------------------------------------------------------------------------

export class BackupFormatError extends Error {}

const HABIT_TYPES: HabitType[] = ['positive', 'negative'];
const FREQUENCY_TYPES: HabitFrequencyType[] = ['daily', 'weekly', 'custom'];
const GOAL_PERIODS: FrequencyGoalPeriod[] = ['week', 'month', 'custom'];

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const numOrNull = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const strOrNull = (v: unknown) => (typeof v === 'string' ? v : null);
const validDays = (v: unknown) =>
  Array.isArray(v) && v.every(d => Number.isInteger(d) && d >= 0 && d <= 6) ? (v as number[]) : null;
const validDate = (v: unknown) => typeof v === 'string' && !Number.isNaN(new Date(v).getTime());

function sanitizeHabit(raw: unknown): BackupHabit | null {
  if (!isRecord(raw)) return null;
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (!name || name.length > 100) return null;
  if (!HABIT_TYPES.includes(raw.type as HabitType)) return null;
  if (!FREQUENCY_TYPES.includes(raw.frequency_type as HabitFrequencyType)) return null;

  const completions = (Array.isArray(raw.completions) ? raw.completions : [])
    .filter((c): c is Record<string, unknown> => isRecord(c) && validDate(c.completed_at))
    .map(c => ({ completed_at: c.completed_at as string, value_achieved: numOrNull(c.value_achieved) }));

  const reminders = (Array.isArray(raw.reminders) ? raw.reminders : [])
    .filter((r): r is Record<string, unknown> =>
      isRecord(r) && typeof r.time === 'string' && /^\d{2}:\d{2}(:\d{2})?$/.test(r.time))
    .map(r => ({
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
    raw = JSON.parse(text.replace(/^﻿/, ''));
  } catch {
    throw new BackupFormatError('O arquivo não é um backup válido (JSON ilegível).');
  }
  if (!isRecord(raw) || raw.format !== BACKUP_FORMAT || !Array.isArray(raw.habits)) {
    throw new BackupFormatError('O arquivo não é um backup do My Habits Tracker.');
  }
  if (typeof raw.version !== 'number' || raw.version > BACKUP_VERSION) {
    throw new BackupFormatError('Este backup foi gerado por uma versão mais nova do app. Atualize o app para importá-lo.');
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

/** Abre o seletor de arquivos e devolve o texto escolhido (null se cancelar). */
export async function pickBackupFile(): Promise<string | null> {
  // '*/*': backups vindos do Drive/WhatsApp costumam chegar como
  // application/octet-stream; o conteúdo é validado em parseBackup.
  const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
  if (result.canceled || result.assets.length === 0) return null;
  return await new File(result.assets[0].uri).text();
}

// ---------------------------------------------------------------------------
// Importação
// ---------------------------------------------------------------------------

async function fetchExistingHabits(userId: string): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from('habits')
    .select('id, name')
    .eq('user_id', userId)
    .eq('is_active', true);
  if (error) throw error;
  return new Map((data ?? []).map(h => [nameKey(h.name), h.id]));
}

export async function previewImport(backup: BackupFile, userId: string, skipped: number): Promise<ImportPreview> {
  const existing = await fetchExistingHabits(userId);
  const keys = new Set(backup.habits.map(h => nameKey(h.name)));
  let merge = 0;
  for (const key of keys) if (existing.has(key)) merge++;
  return {
    habitsToCreate: keys.size - merge,
    habitsToMerge: merge,
    completions: backup.habits.reduce((sum, h) => sum + h.completions.length, 0),
    skipped,
  };
}

export async function importBackup(backup: BackupFile, userId: string): Promise<ImportSummary> {
  const existing = await fetchExistingHabits(userId);
  const summary: ImportSummary = { habitsCreated: 0, habitsMerged: 0, completionsAdded: 0, remindersAdded: 0 };
  const touchedHabits = new Set<string>();

  for (const h of backup.habits) {
    const key = nameKey(h.name);
    let habitId = existing.get(key);
    const merged = !!habitId;

    if (!habitId) {
      const insert: HabitInsert = {
        user_id: userId,
        name: h.name,
        description: h.description,
        type: h.type,
        color: h.color,
        icon: h.icon,
        frequency_type: h.frequency_type,
        frequency_days: h.frequency_days,
        has_target: h.has_target,
        target_value: h.target_value,
        target_unit: h.target_unit,
        frequency_goal_value: h.frequency_goal_value,
        frequency_goal_period: h.frequency_goal_period,
        frequency_goal_custom_days: h.frequency_goal_custom_days,
        created_at: h.created_at,
        is_active: true,
      };
      const { data, error } = await supabase.from('habits').insert(insert).select('id').single();
      if (error) throw error;
      habitId = data.id;
      existing.set(key, habitId);
      summary.habitsCreated++;
      // Mesmo padrão da criação de hábito pelo app.
      try {
        await progressNotificationScheduler.createDefaultSettings(habitId, userId);
      } catch (e) {
        console.warn('Erro ao criar configuração padrão de progresso:', e);
      }
    } else {
      summary.habitsMerged++;
    }

    // Conclusões: um registro por dia local, sem repetir dias que já existem.
    const knownDays = new Set<string>();
    if (merged) {
      for (const c of await fetchAllCompletions([habitId])) knownDays.add(localDay(c.completed_at));
    }
    const toInsert: CompletionInsert[] = [];
    for (const c of h.completions) {
      const day = localDay(c.completed_at);
      if (knownDays.has(day)) continue;
      knownDays.add(day);
      toInsert.push({ habit_id: habitId, completed_at: c.completed_at, value_achieved: c.value_achieved, was_synced: true });
    }
    for (let i = 0; i < toInsert.length; i += INSERT_BATCH) {
      const { error } = await supabase.from('completions').insert(toInsert.slice(i, i + INSERT_BATCH));
      if (error) throw error;
    }
    summary.completionsAdded += toInsert.length;
    if (toInsert.length > 0 || !merged) touchedHabits.add(habitId);

    // Lembretes: só horários que o hábito ainda não tem, até o limite do app.
    const { data: current, error: remindersError } = await supabase
      .from('reminders')
      .select('time, is_active')
      .eq('habit_id', habitId);
    if (remindersError) throw remindersError;
    const knownTimes = new Set((current ?? []).map(r => r.time.slice(0, 5)));
    let activeCount = (current ?? []).filter(r => r.is_active).length;
    for (const r of h.reminders) {
      if (knownTimes.has(r.time)) continue;
      if (r.is_active && activeCount >= MAX_REMINDERS) continue;
      // notification_ids vazio: os alarmes são agendados pela ressincronização.
      const reminder: ReminderInsert = {
        habit_id: habitId,
        time: r.time,
        days_of_week: r.days_of_week,
        is_active: r.is_active,
        sound: r.sound,
        notification_ids: [],
      };
      const { error } = await supabase.from('reminders').insert(reminder);
      if (error) throw error;
      knownTimes.add(r.time);
      if (r.is_active) activeCount++;
      summary.remindersAdded++;
    }
  }

  for (const habitId of touchedHabits) {
    await retroactiveCompletionService.recalculateStreak(habitId);
  }
  if (summary.remindersAdded > 0) {
    await reminderSyncService.syncReminders(userId);
  }

  DeviceEventEmitter.emit(DATA_IMPORTED_EVENT);
  return summary;
}
