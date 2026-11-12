import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import {
  ReminderReliabilityStatus,
  getManufacturerTip,
  getReminderReliability,
} from '@/services/reminderReliabilityService';
import { exactAlarmService } from '@/services/exactAlarmService';

// Estáveis entre renders (o cartão é React.memo).
const openBatterySettings = () => exactAlarmService.openBatteryOptimizationSettings();
const openExactAlarmSettings = () => exactAlarmService.openAlarmSettings();
const manufacturerTip = getManufacturerTip();

/**
 * Estado das permissões que afetam os lembretes (Android). Reconsulta ao
 * voltar para o primeiro plano: o usuário ajusta tudo nas configurações do
 * sistema e volta para o app.
 */
export function useReminderReliability() {
  const [status, setStatus] = useState<ReminderReliabilityStatus | null>(null);

  const refresh = useCallback(async () => {
    if (Platform.OS !== 'android') return;
    setStatus(await getReminderReliability());
  }, []);

  useEffect(() => {
    refresh();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  return {
    status,
    manufacturerTip,
    openBatterySettings,
    openExactAlarmSettings,
  };
}
