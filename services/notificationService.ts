// services/notificationService.ts
import { Platform } from 'react-native';
import { notificationService as expoNotifications } from './notifications';
import { notificationNotifeeService as notifeeReal } from './notificationsNotifee';

// CONFIGURADO PARA BUILD (Notifee Real)
const androidService = notifeeReal as any;

export const notificationService = Platform.select({
  android: androidService,
  ios: expoNotifications,
  default: expoNotifications,
}) as any;

export type NotificationSound = 'default' | 'water' | 'bell' | 'chime' | 'silence';