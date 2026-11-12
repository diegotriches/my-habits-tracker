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
import { CompletionInsert, HabitInsert, ReminderInsert } from '@/types/database';
import { MAX_REMINDERS } from '@/constants/HabitForm';
import { BACKUP_FORMAT, BACKUP_VERSION, BackupFile, backupToCsv } from '@/utils/backupFormat';

// Reexportados: a UI importa daqui.
export {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  BackupFormatError,
  backupToCsv,
  parseBackup,
} from '@/utils/backupFormat';
export type {
  BackupCompletion,
  BackupFile,
  BackupHabit,
  BackupReminder,
} from '@/utils/backupFormat';

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

/** Emitido após uma importação, para as telas buscarem os dados de novo. */
export const DATA_IMPORTED_EVENT = 'HabitDataImported';

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

  const habitIds = (habits ?? []).map((h) => h.id);
  const completions = habitIds.length > 0 ? await fetchAllCompletions(habitIds) : [];

  const { data: reminders, error: remindersError } =
    habitIds.length > 0
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
    habits: (habits ?? []).map((h) => ({
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
        .filter((c) => c.habit_id === h.id)
        .map((c) => ({ completed_at: c.completed_at, value_achieved: c.value_achieved })),
      reminders: (reminders ?? [])
        .filter((r) => r.habit_id === h.id)
        .map((r) => ({
          time: r.time,
          days_of_week: r.days_of_week,
          is_active: r.is_active,
          sound: r.sound,
        })),
    })),
  };
}

async function writeAndShare(
  fileName: string,
  content: string,
  mimeType: string,
  dialogTitle: string
) {
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
  await writeAndShare(
    fileName,
    JSON.stringify(backup, null, 2),
    'application/json',
    'Salvar backup dos hábitos'
  );
  return backup.habits.length;
}

export async function exportHistoryCsv(userId: string): Promise<number> {
  const backup = await buildBackup(userId);
  const fileName = `habitos-historico-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  await writeAndShare(fileName, backupToCsv(backup), 'text/csv', 'Exportar histórico');
  return backup.habits.reduce((sum, h) => sum + h.completions.length, 0);
}

// ---------------------------------------------------------------------------
// Escolha do arquivo
// ---------------------------------------------------------------------------

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
  return new Map((data ?? []).map((h) => [nameKey(h.name), h.id]));
}

export async function previewImport(
  backup: BackupFile,
  userId: string,
  skipped: number
): Promise<ImportPreview> {
  const existing = await fetchExistingHabits(userId);
  const keys = new Set(backup.habits.map((h) => nameKey(h.name)));
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
  const summary: ImportSummary = {
    habitsCreated: 0,
    habitsMerged: 0,
    completionsAdded: 0,
    remindersAdded: 0,
  };
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
      toInsert.push({
        habit_id: habitId,
        completed_at: c.completed_at,
        value_achieved: c.value_achieved,
        was_synced: true,
      });
    }
    for (let i = 0; i < toInsert.length; i += INSERT_BATCH) {
      const { error } = await supabase
        .from('completions')
        .insert(toInsert.slice(i, i + INSERT_BATCH));
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
    const knownTimes = new Set((current ?? []).map((r) => r.time.slice(0, 5)));
    let activeCount = (current ?? []).filter((r) => r.is_active).length;
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
