// services/notificationService.ts
// Wrapper ULTRA-SEGURO para Expo Go

import { Platform } from 'react-native';
import { notificationService as expoNotifications } from './notifications';
import { notificationNotifeeService as mockNotifications } from './notificationsNotifee.mock';

/**
 * Service unificado de notificações
 * 
 * NO EXPO GO (desenvolvimento):
 * - Android: Mock do Notifee (sem botões, mas funciona)
 * - iOS: Expo Notifications nativo
 * 
 * NA BUILD STANDALONE:
 * - Para usar Notifee real, mude manualmente antes da build
 * - Descomente a linha do import e use notifeeReal
 */

// 🔒 SEMPRE usar mock no Expo Go (não tenta importar Notifee)
const androidService = mockNotifications as any; // Type cast para evitar erro de tipos privados

// 🔓 PARA BUILD: Descomente estas linhas:
// import { notificationNotifeeService as notifeeReal } from './notificationsNotifee';
// const androidService = notifeeReal as any;

export const notificationService = Platform.select({
  android: androidService,
  ios: expoNotifications,
  default: expoNotifications,
}) as any; // Type cast final

export type NotificationSound = 'default' | 'water' | 'bell' | 'chime' | 'silence';

console.log('📱 Notification Service:', Platform.OS === 'android' ? 'Mock (Expo Go)' : 'Expo Native (iOS)');