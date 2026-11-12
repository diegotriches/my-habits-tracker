// services/reminderReliabilityService.ts
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { exactAlarmService } from './exactAlarmService';

/**
 * O que pode atrasar ou impedir os lembretes no Android:
 * - `exactAlarms`: permissão "Alarmes e lembretes" (Android 12+). Sem ela,
 *   o AlarmManager agenda alarmes inexatos, que podem atrasar bastante.
 * - `batteryUnrestricted`: app fora da otimização de bateria do Android.
 * Fabricantes como Samsung e Xiaomi têm otimizações próprias, sem API para
 * verificar — para elas só existe a dica de getManufacturerTip().
 */
export interface ReminderReliabilityStatus {
  exactAlarms: boolean;
  batteryUnrestricted: boolean;
}

const PROMPT_SHOWN_KEY = 'reminder_reliability_prompt_shown';

export async function getReminderReliability(): Promise<ReminderReliabilityStatus> {
  const [exactAlarms, batteryUnrestricted] = await Promise.all([
    exactAlarmService.canScheduleExactAlarms(),
    exactAlarmService.isIgnoringBatteryOptimizations(),
  ]);
  return { exactAlarms, batteryUnrestricted };
}

export function needsAttention(status: ReminderReliabilityStatus): boolean {
  return !status.exactAlarms || !status.batteryUnrestricted;
}

/** Caminho para liberar o app nas otimizações próprias do fabricante. */
export function getManufacturerTip(): string | null {
  if (Platform.OS !== 'android') return null;
  const manufacturer = (Platform.constants.Manufacturer || '').toLowerCase();

  if (manufacturer.includes('samsung')) {
    return 'Na Samsung: Configurações → Bateria → Limites de uso em segundo plano → Apps que nunca entram em suspensão → adicione o app.';
  }
  if (['xiaomi', 'redmi', 'poco'].some((m) => manufacturer.includes(m))) {
    return 'Na Xiaomi: Configurações → Apps → Gerenciar apps → este app → ative o Início automático e, em Economia de bateria, escolha "Sem restrições".';
  }
  if (manufacturer.includes('huawei') || manufacturer.includes('honor')) {
    return 'Na Huawei/Honor: Configurações → Bateria → Inicialização de apps → desative "Gerenciar automaticamente" para este app e permita todas as opções.';
  }
  if (['oppo', 'realme', 'oneplus'].some((m) => manufacturer.includes(m))) {
    return 'Na Oppo/Realme/OnePlus: Configurações → Bateria → este app → permita a atividade em segundo plano e desative a otimização.';
  }
  return null;
}

/**
 * Aviso único, depois que o usuário cria o primeiro lembrete — o momento em
 * que a otimização de bateria passa a importar. Só aparece no Android, se
 * houver algo a ajustar, e uma vez por instalação.
 */
export async function maybePromptAfterFirstReminder(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    if (await AsyncStorage.getItem(PROMPT_SHOWN_KEY)) return;
    const status = await getReminderReliability();
    if (!needsAttention(status)) return;

    await AsyncStorage.setItem(PROMPT_SHOWN_KEY, 'true');
    Alert.alert(
      'Garanta seus lembretes',
      'O Android pode atrasar ou bloquear lembretes para economizar bateria. ' +
        'Leva menos de um minuto para liberar o app.',
      [
        { text: 'Agora não', style: 'cancel' },
        { text: 'Ajustar', onPress: () => router.push('/settings/notifications') },
      ]
    );
  } catch (error) {
    console.warn('Erro ao verificar lembretes confiáveis:', error);
  }
}
