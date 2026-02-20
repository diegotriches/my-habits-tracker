// services/soundPreview.ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { NotificationSound } from './notifications';

/**
 * Serviço para reproduzir preview dos sons de notificação.
 * Usa notificações locais instantâneas para tocar o som exato
 * que o usuário receberá — a forma mais fiel de preview.
 */
class SoundPreviewService {
  private lastNotificationId: string | null = null;

  /**
   * Toca um preview do som selecionado via notificação instantânea
   */
  async playPreview(sound: NotificationSound, habitName?: string): Promise<void> {
    try {
      // Cancelar preview anterior se ainda existir
      if (this.lastNotificationId) {
        try {
          await Notifications.dismissNotificationAsync(this.lastNotificationId);
        } catch {
          // Ignora se já foi dismissada
        }
      }

      // Som silencioso: não precisa tocar nada
      if (sound === 'silence') {
        return;
      }

      const soundFile = this.getSoundFile(sound);

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🔊 Preview do som',
          body: habitName ? `Som para: ${habitName}` : 'Testando som da notificação',
          sound: soundFile,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          ...(Platform.OS === 'android' && {
            channelId: 'sound-preview',
          }),
        },
        trigger: null, // Instantâneo
      });

      this.lastNotificationId = id;

      // Auto-dismiss após 3 segundos para não poluir
      setTimeout(async () => {
        try {
          await Notifications.dismissNotificationAsync(id);
        } catch {
          // Ignora se já foi dismissada pelo usuário
        }
      }, 3000);
    } catch (error) {
      console.error('Erro ao tocar preview:', error);
    }
  }

  /**
   * Configura o canal de preview (Android)
   */
  async setupPreviewChannel(): Promise<void> {
    if (Platform.OS !== 'android') return;

    try {
      await Notifications.setNotificationChannelAsync('sound-preview', {
        name: 'Preview de Sons',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 100],
        sound: 'default',
        enableVibrate: true,
      });
    } catch (error) {
      console.warn('Erro ao criar canal de preview:', error);
    }
  }

  private getSoundFile(sound: NotificationSound): string | boolean {
    switch (sound) {
      case 'default':
        return true;
      case 'water':
        return 'water_drop.wav';
      case 'bell':
        return 'bell.wav';
      case 'chime':
        return 'chime.wav';
      case 'silence':
        return false;
      default:
        return true;
    }
  }
}

export const soundPreviewService = new SoundPreviewService();