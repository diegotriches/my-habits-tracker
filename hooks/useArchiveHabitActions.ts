// hooks/useArchiveHabitActions.ts
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { hapticFeedback } from '@/utils/haptics';
import { errorMessageFor } from '@/utils/networkErrors';
import { ensureOnline } from '@/services/network';
import { archiveHabit, restoreHabit } from '@/services/habitArchiveService';
import { useAuth } from './useAuth';

interface Options {
  /** Depois de arquivar (ex.: voltar da tela de detalhes). */
  onArchived?: () => void;
  /** Depois de restaurar (ex.: recarregar o hábito na tela). */
  onRestored?: () => void;
}

/** Arquivar (com confirmação) e restaurar um hábito. Ambos exigem conexão. */
export function useArchiveHabitActions({ onArchived, onRestored }: Options = {}) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);

  const confirmArchive = useCallback(
    (habitId: string, habitName: string | undefined) => {
      hapticFeedback.warning();
      Alert.alert(
        'Arquivar hábito?',
        `"${habitName ?? 'Este hábito'}" sai da tela inicial e para de enviar lembretes. ` +
          'O histórico fica guardado, e você pode restaurá-lo quando quiser em ' +
          'Perfil → Hábitos arquivados.',
        [
          { text: 'Cancelar', style: 'cancel', onPress: () => hapticFeedback.light() },
          {
            text: 'Arquivar',
            onPress: async () => {
              if (!(await ensureOnline())) return;
              setBusy(true);
              const { error } = await archiveHabit(habitId);
              setBusy(false);
              if (error) {
                hapticFeedback.error();
                Alert.alert('Erro', errorMessageFor(error, 'Não foi possível arquivar o hábito.'));
                return;
              }
              hapticFeedback.success();
              onArchived?.();
            },
          },
        ]
      );
    },
    [onArchived]
  );

  /** Devolve se restaurou. */
  const restore = useCallback(
    async (habitId: string): Promise<boolean> => {
      if (!user || !(await ensureOnline())) return false;
      setBusy(true);
      const { error } = await restoreHabit(habitId, user.id);
      setBusy(false);
      if (error) {
        hapticFeedback.error();
        Alert.alert('Erro', errorMessageFor(error, 'Não foi possível restaurar o hábito.'));
        return false;
      }
      hapticFeedback.success();
      onRestored?.();
      return true;
    },
    [user, onRestored]
  );

  return { busy, confirmArchive, restore };
}
