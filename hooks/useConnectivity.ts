import { useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { useAuth } from './useAuth';
import { completionOutbox, OUTBOX_CHANGED_EVENT } from '@/services/completionOutbox';
import { isOfflineState } from '@/services/network';

/** Conexão atual e quantas marcações deste usuário aguardam envio. */
export function useConnectivity() {
  const netInfo = useNetInfo();
  const { user } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    const userId = user.id;
    const refresh = async () => {
      setPendingCount((await completionOutbox.getPendingOps(userId)).length);
    };
    void refresh();
    const subscription = DeviceEventEmitter.addListener(OUTBOX_CHANGED_EVENT, refresh);
    return () => subscription.remove();
  }, [user?.id]);

  return { isOffline: isOfflineState(netInfo), pendingCount };
}
