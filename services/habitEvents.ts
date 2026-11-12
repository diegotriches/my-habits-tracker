// services/habitEvents.ts
//
// Cada tela tem a sua instância do useHabits (não há store global). Quando a
// lista de hábitos muda em uma delas — criar, editar, excluir, arquivar,
// restaurar —, este evento avisa as outras para buscarem de novo. Sem ele, a
// home só via um hábito novo ou excluído depois de puxar para atualizar.
import { DeviceEventEmitter } from 'react-native';

export const HABITS_CHANGED_EVENT = 'HabitsChanged';

export function emitHabitsChanged(): void {
  DeviceEventEmitter.emit(HABITS_CHANGED_EVENT);
}
