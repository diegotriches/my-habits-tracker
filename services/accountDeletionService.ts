// services/accountDeletionService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { notificationService } from './notifications';
import { exactAlarmService } from './exactAlarmService';

/**
 * Exclui a conta do usuário logado.
 *
 * A exclusão em si (dados, avatar e usuário do Supabase Auth) roda na Edge
 * Function `delete-account`, a única com a chave de serviço necessária para
 * remover do Auth. Só depois que ela confirma é que o aparelho é limpo
 * (alarmes nativos, fila de conclusões, AsyncStorage) e a sessão encerrada —
 * se a função falhar, nada local é apagado e o erro sobe para a UI.
 */
export async function deleteAccount(): Promise<void> {
  const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
  if (error) throw error;

  // Os alarmes vivem no AlarmManager do aparelho e continuariam tocando.
  try {
    await notificationService.cancelAllNotifications();
    const pending = await exactAlarmService.getPendingCompletions();
    await exactAlarmService.removePendingCompletions(pending.map(p => p.id));
  } catch (cleanupError) {
    // A conta já foi excluída: falha na limpeza local não deve virar erro.
    console.warn('Erro ao limpar notificações locais:', cleanupError);
  }

  await AsyncStorage.clear();
  // 'local': o usuário já não existe no servidor, então só descarta a
  // sessão do aparelho em vez de chamar o logout remoto.
  await supabase.auth.signOut({ scope: 'local' });
}
