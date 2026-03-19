// services/exactAlarmService.ts
import { NativeModules, Platform, DeviceEventEmitter } from 'react-native';

const { ExactAlarmModule } = NativeModules;

/**
 * Service que usa AlarmManager nativo para agendar alarmes exatos.
 * As notificações são disparadas diretamente pelo AlarmReceiver.java
 * via NotificationCompat — sem dependência de Notifee.
 *
 * O botão "Feito" na notificação envia um broadcast local
 * "com.dtriches.myhabitstracker.HABIT_COMPLETE" que este service
 * escuta e repassa para o JS via DeviceEventEmitter.
 */
class ExactAlarmService {

  /**
   * Agenda lembretes semanais usando AlarmManager
   */
  async scheduleWeeklyReminders(
    habitId: string,
    habitName: string,
    time: string,
    daysOfWeek: number[],
    reminderId: string
  ): Promise<string[]> {
    if (Platform.OS !== 'android') return [];

    const [hours, minutes] = time.split(':').map(Number);
    const alarmIds: string[] = [];

    console.log('Agendando lembretes semanais:', { habitName, time, daysOfWeek });

    for (const dayOfWeek of daysOfWeek) {
      const nextOccurrence = this.getNextOccurrence(dayOfWeek, hours, minutes);
      const alarmId = `${habitId}_${dayOfWeek}`;

      await this.scheduleExactAlarm(alarmId, nextOccurrence.getTime(), {
        habitId,
        habitName,
        reminderId,
        dayOfWeek: String(dayOfWeek),
        time,
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
   * Cancela todos os alarmes de um hábito
   */
  async cancelHabitAlarms(habitId: string, daysOfWeek: number[]): Promise<void> {
    console.log('Cancelando alarmes do hábito:', habitId);
    for (const dayOfWeek of daysOfWeek) {
      await this.cancelAlarm(`${habitId}_${dayOfWeek}`);
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

  /**
   * Registra listener para o evento de conclusão vindo do botão nativo
   * O AlarmReceiver envia broadcast "HABIT_COMPLETE" quando o usuário
   * toca em "Feito" na notificação.
   */
  onHabitComplete(callback: (habitId: string, habitName: string) => void): () => void {
    const subscription = DeviceEventEmitter.addListener(
      'HabitCompleteFromNotification',
      (event: { habitId: string; habitName: string }) => {
        console.log('Evento HabitComplete recebido:', event);
        callback(event.habitId, event.habitName);
      }
    );
    return () => subscription.remove();
  }

  /**
   * Calcula próxima ocorrência de um dia/horário
   */
  private getNextOccurrence(dayOfWeek: number, hours: number, minutes: number): Date {
    const now = new Date();
    const result = new Date();

    result.setHours(hours, minutes, 0, 0);

    const currentDay = result.getDay();
    let daysUntil = dayOfWeek - currentDay;
    const minBuffer = 2 * 60 * 1000;
    const diffMs = result.getTime() - now.getTime();

    if (daysUntil < 0) {
      daysUntil += 7;
    } else if (daysUntil === 0 && diffMs < minBuffer) {
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