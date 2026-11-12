// services/exactAlarmService.ts
import { NativeModules, Platform, DeviceEventEmitter } from 'react-native';

const { ExactAlarmModule } = NativeModules;

/**
 * Service que usa AlarmManager nativo para agendar alarmes exatos.
 * As notificações são disparadas diretamente pelo AlarmReceiver.java
 * via NotificationCompat — sem dependência de Notifee.
 *
 * O botão "Feito" na notificação não depende do JS: o AlarmReceiver grava a
 * conclusão numa fila local (PendingCompletionStorage) e envia, via
 * LocalBroadcastManager, o broadcast
 * "com.dtriches.myhabitstracker.HABIT_COMPLETE_LOCAL". Se o app estiver
 * aberto, o ExactAlarmModule o repassa ao JS como o evento
 * "PendingCompletionsChanged" (onPendingCompletionsChanged); a fila é lida
 * com getPendingCompletions() — ver services/pendingCompletionService.ts.
 */

/** Conclusão feita pelo botão "Feito" e ainda não enviada ao banco. */
export interface PendingCompletion {
  id: string;
  habitId: string;
  /** Horário do toque, em ms desde a epoch. */
  completedAt: number;
}

export interface ScheduleReminderOptions {
  /** Som do lembrete; define o canal de notificação no Android. */
  sound?: string;
  /** Hábito com meta numérica: a notificação mostra "Registrar" em vez de "Feito". */
  hasTarget?: boolean;
  /**
   * Antecedência mínima para agendar ainda hoje; abaixo dela a ocorrência vai
   * para a semana seguinte. O padrão (2 min) é para quando o usuário
   * cria/edita o lembrete; a ressincronização usa 0 para não pular um
   * lembrete de hoje que está prestes a disparar.
   */
  minLeadMs?: number;
}

class ExactAlarmService {
  /**
   * Agenda lembretes semanais usando AlarmManager.
   */
  async scheduleWeeklyReminders(
    habitId: string,
    habitName: string,
    time: string,
    daysOfWeek: number[],
    reminderId: string,
    {
      sound = 'default',
      hasTarget = false,
      minLeadMs = 2 * 60 * 1000,
    }: ScheduleReminderOptions = {}
  ): Promise<string[]> {
    if (Platform.OS !== 'android') return [];

    const [hours, minutes] = time.split(':').map(Number);
    const alarmIds: string[] = [];

    console.log('Agendando lembretes semanais:', { habitName, time, daysOfWeek });

    for (const dayOfWeek of daysOfWeek) {
      const nextOccurrence = this.getNextOccurrence(dayOfWeek, hours, minutes, minLeadMs);
      // O reminderId entra no id para que vários lembretes do mesmo hábito
      // não compartilhem o mesmo PendingIntent (um sobrescreveria o outro).
      const alarmId = `${reminderId}_${dayOfWeek}`;

      await this.scheduleExactAlarm(alarmId, nextOccurrence.getTime(), {
        habitId,
        habitName,
        reminderId,
        dayOfWeek: String(dayOfWeek),
        time,
        sound,
        hasTarget,
      });

      alarmIds.push(alarmId);
    }

    console.log(`${alarmIds.length} alarmes agendados`);
    return alarmIds;
  }

  /**
   * Agenda um alarme exato
   */
  async scheduleExactAlarm(
    alarmId: string,
    timestamp: number,
    data: {
      habitId: string;
      habitName: string;
      reminderId?: string;
      dayOfWeek?: string;
      time?: string;
      sound?: string;
      hasTarget?: boolean;
    }
  ): Promise<string> {
    if (Platform.OS !== 'android') throw new Error('ExactAlarmService só funciona no Android');
    if (!ExactAlarmModule) throw new Error('ExactAlarmModule não disponível');

    console.log('Agendando alarme:', {
      alarmId,
      scheduledFor: new Date(timestamp).toLocaleString(),
      ...data,
    });

    const result = await ExactAlarmModule.scheduleExactAlarm(alarmId, timestamp, data);
    console.log('Alarme agendado:', result);
    return result;
  }

  /**
   * Cancela um alarme
   */
  async cancelAlarm(alarmId: string): Promise<void> {
    if (Platform.OS !== 'android') return;
    if (!ExactAlarmModule) return;

    try {
      await ExactAlarmModule.cancelAlarm(alarmId);
      console.log('Alarme cancelado:', alarmId);
    } catch (error) {
      console.error('Erro ao cancelar alarme:', error);
    }
  }

  /**
   * Cancela todos os alarmes de um hábito (de qualquer lembrete, snooze
   * pendente e ids legados `${habitId}_${dia}`).
   */
  async cancelHabitAlarms(habitId: string): Promise<void> {
    if (Platform.OS !== 'android') return;
    if (!ExactAlarmModule) return;

    try {
      const count: number = await ExactAlarmModule.cancelAlarmsForHabit(habitId);
      console.log(`Alarmes do hábito cancelados (${count}):`, habitId);
    } catch (error) {
      console.error('Erro ao cancelar alarmes do hábito:', error);
    }
  }

  /**
   * Cancela todos os alarmes persistidos.
   */
  async cancelAllAlarms(): Promise<void> {
    if (Platform.OS !== 'android') return;
    if (!ExactAlarmModule) return;

    try {
      const count: number = await ExactAlarmModule.cancelAllAlarms();
      console.log(`Todos os alarmes cancelados (${count})`);
    } catch (error) {
      console.error('Erro ao cancelar todos os alarmes:', error);
    }
  }

  /**
   * Verifica se pode agendar alarmes exatos
   */
  async canScheduleExactAlarms(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    if (!ExactAlarmModule) return false;

    try {
      const can = await ExactAlarmModule.canScheduleExactAlarms();
      console.log('Pode agendar alarmes exatos:', can);
      return can;
    } catch {
      return false;
    }
  }

  /**
   * Abre as configurações de alarmes exatos (Android 12+)
   */
  async openAlarmSettings(): Promise<void> {
    if (Platform.OS !== 'android') return;
    if (!ExactAlarmModule) return;

    try {
      await ExactAlarmModule.openAlarmSettings();
    } catch (error) {
      console.error('Erro ao abrir configurações:', error);
    }
  }

  /** Se o app está fora da otimização de bateria do Android. */
  async isIgnoringBatteryOptimizations(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    if (!ExactAlarmModule) return false;
    try {
      return await ExactAlarmModule.isIgnoringBatteryOptimizations();
    } catch {
      return false;
    }
  }

  /** Abre a tela de otimização de bateria do sistema. */
  async openBatteryOptimizationSettings(): Promise<void> {
    if (Platform.OS !== 'android' || !ExactAlarmModule) return;
    try {
      await ExactAlarmModule.openBatteryOptimizationSettings();
    } catch (error) {
      console.error('Erro ao abrir otimização de bateria:', error);
    }
  }

  /** Lê a fila de conclusões feitas pelo botão "Feito". */
  async getPendingCompletions(): Promise<PendingCompletion[]> {
    if (Platform.OS !== 'android' || !ExactAlarmModule) return [];
    return await ExactAlarmModule.getPendingCompletions();
  }

  /** Remove da fila as conclusões já processadas. */
  async removePendingCompletions(ids: string[]): Promise<void> {
    if (Platform.OS !== 'android' || !ExactAlarmModule || ids.length === 0) return;
    await ExactAlarmModule.removePendingCompletions(ids);
  }

  /**
   * Avisa quando o botão "Feito" enfileira uma conclusão com o app aberto
   * (evento "PendingCompletionsChanged" emitido pelo ExactAlarmModule).
   */
  onPendingCompletionsChanged(callback: () => void): () => void {
    const subscription = DeviceEventEmitter.addListener('PendingCompletionsChanged', () => {
      console.log('Fila de conclusoes da notificacao alterada');
      callback();
    });
    return () => subscription.remove();
  }

  /**
   * Calcula próxima ocorrência de um dia/horário
   */
  private getNextOccurrence(
    dayOfWeek: number,
    hours: number,
    minutes: number,
    minLeadMs: number
  ): Date {
    const now = new Date();
    const result = new Date();

    result.setHours(hours, minutes, 0, 0);

    const currentDay = result.getDay();
    let daysUntil = dayOfWeek - currentDay;
    const diffMs = result.getTime() - now.getTime();

    // `<=` garante que um horário que já passou (ou é exatamente agora) nunca
    // seja agendado no passado, mesmo com minLeadMs = 0.
    if (daysUntil < 0) {
      daysUntil += 7;
    } else if (daysUntil === 0 && diffMs <= minLeadMs) {
      daysUntil += 7;
      console.log('Horario muito proximo, pulando para proxima semana');
    }

    result.setDate(result.getDate() + daysUntil);

    console.log('Proxima ocorrencia:', {
      dayOfWeek,
      scheduled: result.toLocaleString(),
    });

    return result;
  }
}

export const exactAlarmService = new ExactAlarmService();
