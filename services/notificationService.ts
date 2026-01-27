// services/notificationService.ts
import { Platform } from 'react-native';
import { notificationService as expoNotifications } from './notifications';
import { notificationNotifeeService as notifeeReal } from './notificationsNotifee';

// 🔓 CONFIGURADO PARA BUILD (Notifee Real)
// Para voltar ao Expo Go: comente linha 4 e descomente linha abaixo
// import { notificationNotifeeService as mockNotifications } from './notificationsNotifee.mock';

const androidService = notifeeReal as any;
// Para Expo Go: const androidService = mockNotifications as any;

export const notificationService = Platform.select({
  android: androidService,
  ios: expoNotifications,
  default: expoNotifications,
}) as any;

export type NotificationSound = 'default' | 'water' | 'bell' | 'chime' | 'silence';

console.log('📱 Notification Service (Android): NOTIFEE REAL');