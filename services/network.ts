// services/network.ts
import { Alert } from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { OFFLINE_ACTION_MESSAGE } from '@/utils/networkErrors';

/**
 * Sem conexão: sem rede, ou com rede mas sem acesso à internet. Enquanto o
 * NetInfo ainda não sabe (valores null, logo ao abrir), assume online — no
 * pior caso a ação é tentada e falha como antes.
 */
export function isOfflineState(
  state: Pick<NetInfoState, 'isConnected' | 'isInternetReachable'>
): boolean {
  return state.isConnected === false || state.isInternetReachable === false;
}

export async function isOffline(): Promise<boolean> {
  return isOfflineState(await NetInfo.fetch());
}

/**
 * Para ações que exigem conexão (o modo offline só cobre marcações): avisa
 * antes de tentar, em vez de falhar com uma mensagem genérica. Devolve se dá
 * para seguir.
 */
export async function ensureOnline(): Promise<boolean> {
  if (await isOffline()) {
    Alert.alert('Sem conexão', OFFLINE_ACTION_MESSAGE);
    return false;
  }
  return true;
}
