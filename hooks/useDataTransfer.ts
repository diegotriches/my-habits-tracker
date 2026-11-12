import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useAuth } from './useAuth';
import { ensureOnline } from '@/services/network';
import { errorMessageFor } from '@/utils/networkErrors';
import {
  BackupFormatError,
  exportBackup,
  exportHistoryCsv,
  importBackup,
  parseBackup,
  pickBackupFile,
  previewImport,
} from '@/services/dataTransferService';

export type DataTransferTask = 'backup' | 'csv' | 'import';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function confirm(title: string, message: string, confirmText: string): Promise<boolean> {
  return new Promise(resolve => {
    Alert.alert(title, message, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmText, onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}

/** Exportar backup (JSON), exportar histórico (CSV) e importar backup. */
export function useDataTransfer() {
  const { user } = useAuth();
  const [busy, setBusy] = useState<DataTransferTask | null>(null);

  const runExport = useCallback(async (task: 'backup' | 'csv') => {
    if (!user || busy) return;
    if (!(await ensureOnline())) return;
    setBusy(task);
    try {
      if (task === 'backup') await exportBackup(user.id);
      else await exportHistoryCsv(user.id);
    } catch (error) {
      console.error('Erro ao exportar dados:', error);
      Alert.alert('Erro', errorMessageFor(error, 'Não foi possível exportar os dados.'));
    } finally {
      setBusy(null);
    }
  }, [user, busy]);

  const runImport = useCallback(async () => {
    if (!user || busy) return;
    if (!(await ensureOnline())) return;

    let text: string | null;
    try {
      text = await pickBackupFile();
    } catch (error) {
      console.error('Erro ao abrir o arquivo:', error);
      Alert.alert('Erro', 'Não foi possível abrir o arquivo.');
      return;
    }
    if (!text) return; // cancelou

    setBusy('import');
    try {
      const { backup, skipped } = parseBackup(text);
      if (backup.habits.length === 0) {
        Alert.alert('Nada para importar', 'O arquivo não tem nenhum hábito válido.');
        return;
      }

      const preview = await previewImport(backup, user.id, skipped);
      const lines = [
        `${plural(preview.habitsToCreate, 'hábito novo', 'hábitos novos')} e ` +
          `${plural(preview.habitsToMerge, 'já existente', 'já existentes')} (que recebem só os dias que faltam).`,
        `${plural(preview.completions, 'conclusão', 'conclusões')} no arquivo.`,
      ];
      if (preview.skipped > 0) {
        lines.push(`${plural(preview.skipped, 'hábito ignorado', 'hábitos ignorados')} por dados inválidos.`);
      }
      setBusy(null);
      if (!(await confirm('Importar backup?', lines.join('\n\n'), 'Importar'))) return;

      setBusy('import');
      const summary = await importBackup(backup, user.id);
      Alert.alert(
        'Importação concluída',
        [
          `${plural(summary.habitsCreated, 'hábito criado', 'hábitos criados')}, ` +
            `${plural(summary.habitsMerged, 'mesclado', 'mesclados')}.`,
          `${plural(summary.completionsAdded, 'conclusão adicionada', 'conclusões adicionadas')}.`,
          `${plural(summary.remindersAdded, 'lembrete adicionado', 'lembretes adicionados')}.`,
        ].join('\n')
      );
    } catch (error) {
      if (error instanceof BackupFormatError) {
        Alert.alert('Arquivo inválido', error.message);
      } else {
        console.error('Erro ao importar dados:', error);
        // Importar de novo é seguro: completa o que faltou sem duplicar.
        Alert.alert(
          'Erro',
          errorMessageFor(error, 'A importação não terminou. Você pode importar o mesmo arquivo de novo: o que já entrou não será duplicado.')
        );
      }
    } finally {
      setBusy(null);
    }
  }, [user, busy]);

  return {
    busy,
    exportBackup: useCallback(() => runExport('backup'), [runExport]),
    exportCsv: useCallback(() => runExport('csv'), [runExport]),
    importBackup: runImport,
  };
}
