// services/notificationService.ts
// Wrapper unificado — usa expo-notifications em todas as plataformas.
// O ExactAlarmService (AlarmManager nativo) é chamado internamente
// pelo notificationNotifeeService que foi substituído pelo notifications.ts.

import { notificationService as expoNotifications } from './notifications';

export const notificationService = expoNotifications;

export type NotificationSound = 'default' | 'water' | 'bell' | 'chime' | 'silence';