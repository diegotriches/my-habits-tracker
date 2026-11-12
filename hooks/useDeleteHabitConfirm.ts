import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { hapticFeedback } from '@/utils/haptics';
import { errorMessageFor } from '@/utils/networkErrors';

export function useDeleteHabitConfirm(
  habitId: string,
  habitName: string | undefined,
  deleteHabit: (id: string) => Promise<{ error: string | null }>
) {
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = useCallback(() => {
    hapticFeedback.warning();
    Alert.alert(
      'Deletar Hábito',
      `Tem certeza que deseja deletar "${habitName}"? Esta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel', onPress: () => hapticFeedback.light() },
        {
          text: 'Deletar',
          style: 'destructive',
          onPress: async () => {
            hapticFeedback.heavy();
            setDeleting(true);
            const { error } = await deleteHabit(habitId);
            setDeleting(false);

            if (error) {
              hapticFeedback.error();
              Alert.alert('Erro', errorMessageFor(error, error));
            } else {
              hapticFeedback.success();
              Alert.alert('Sucesso', 'Hábito deletado com sucesso', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            }
          },
        },
      ]
    );
  }, [habitId, habitName, deleteHabit]);

  return { deleting, confirmDelete };
}