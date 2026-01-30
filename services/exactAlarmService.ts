// services/exactAlarmService.ts
import { NativeModules, Platform, AppRegistry } from 'react-native';
import notifee, {
  AndroidImportance,
  AndroidStyle,
  AndroidVisibility,
  AndroidCategory,
} from '@notifee/react-native';

const { ExactAlarmModule } = NativeModules;

/**
 * Service que usa AlarmManager nativo + Notifee
 * Garante que notificações disparem no horário EXATO
 */
class ExactAlarmService {
  
  /**
   * Registra a HeadlessJS task que dispara notificações
   * DEVE ser chamado uma vez no início do app
   */
  registerHeadlessTask(): void {
    if (Platform.OS !== 'android') return;

    console.log('📝 Registrando HeadlessJS task: HabitAlarmTask');

    AppRegistry.registerHeadlessTask('HabitAlarmTask', () => async (data: any) => {
      console.log('🔔 HeadlessJS Task disparada!', data);

      try {
        const {
          habitId,
          habitName,
          title = '⏰ Hora do seu hábito!',
          body = `${habitName} - Expanda para ver as opções`,
          reminderId,
          dayOfWeek,
          time,
        } = data;

        console.log('📊 Criando notificação Notifee...');

        // Criar notificação Notifee com BOTÕES
        await notifee.displayNotification({
          title,
          body,
          data: {
            habitId,
            habitName,
            reminderId,
            dayOfWeek,
            time,
            type: 'habit_reminder',
          },
          android: {
            channelId: 'habits',
            importance: AndroidImportance.HIGH,
            
            // ✅ BOTÕES DE AÇÃO
            actions: [
              {
                title: '⏰ Adiar',
                pressAction: { id: 'snooze' },
                icon: 'ic_launcher',
              },
              {
                title: '✅ Feito',
                pressAction: { id: 'complete' },
                icon: 'ic_launcher',
              },
            ],

            style: {
              type: AndroidStyle.BIGTEXT,
              text: `${habitName}\n\n👇 Toque para expandir e ver os botões de ação`,
            },

            smallIcon: 'ic_launcher',
            color: '#3B82F6',
            showTimestamp: true,
            autoCancel: false,
            ongoing: false,
            visibility: AndroidVisibility.PUBLIC,
            category: AndroidCategory.REMINDER,
            
            pressAction: {
              id: 'default',
              launchActivity: 'default',
            },

            sound: 'default',
          },
        });

        console.log('✅ Notificação Notifee disparada!');

      } catch (error) {
        console.error('❌ Erro ao disparar notificação:', error);
      }
    });
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
      title?: string;
      body?: string;
      reminderId?: string;
      dayOfWeek?: string;
      time?: string;
    }
  ): Promise<string> {
    if (Platform.OS !== 'android') {
      throw new Error('ExactAlarmService só funciona no Android');
    }

    if (!ExactAlarmModule) {
      throw new Error('ExactAlarmModule não está disponível. Verifique a configuração nativa.');
    }

    console.log('📅 Agendando alarme exato:', {
      alarmId,
      timestamp,
      scheduledFor: new Date(timestamp).toLocaleString(),
      ...data,
    });

    try {
      const result = await ExactAlarmModule.scheduleExactAlarm(alarmId, timestamp, data);
      console.log('✅ Alarme agendado:', result);
      return result;
    } catch (error) {
      console.error('❌ Erro ao agendar alarme:', error);
      throw error;
    }
  }

  /**
   * Cancela um alarme
   */
  async cancelAlarm(alarmId: string): Promise<void> {
    if (Platform.OS !== 'android') return;

    if (!ExactAlarmModule) {
      console.warn('ExactAlarmModule não disponível');
      return;
    }

    console.log('🗑️ Cancelando alarme:', alarmId);

    try {
      await ExactAlarmModule.cancelAlarm(alarmId);
      console.log('✅ Alarme cancelado');
    } catch (error) {
      console.error('❌ Erro ao cancelar alarme:', error);
    }
  }

  /**
   * Verifica se pode agendar alarmes exatos
   */
  async canScheduleExactAlarms(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;

    if (!ExactAlarmModule) {
      console.warn('ExactAlarmModule não disponível');
      return false;
    }

    try {
      const can = await ExactAlarmModule.canScheduleExactAlarms();
      console.log('📱 Pode agendar alarmes exatos:', can);
      return can;
    } catch (error) {
      console.error('❌ Erro ao verificar permissão:', error);
      return false;
    }
  }

  /**
   * Abre as configurações de alarmes exatos
   */
  async openAlarmSettings(): Promise<void> {
    if (Platform.OS !== 'android') return;

    if (!ExactAlarmModule) {
      console.warn('ExactAlarmModule não disponível');
      return;
    }

    try {
      await ExactAlarmModule.openAlarmSettings();
      console.log('✅ Configurações abertas');
    } catch (error) {
      console.error('❌ Erro ao abrir configurações:', error);
    }
  }

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
    const [hours, minutes] = time.split(':').map(Number);
    const alarmIds: string[] = [];

    console.log('🔔 Agendando lembretes semanais com AlarmManager:', {
      habitName,
      time,
      daysOfWeek,
    });

    for (const dayOfWeek of daysOfWeek) {
      const nextOccurrence = this.getNextOccurrence(dayOfWeek, hours, minutes);
      const timestamp = nextOccurrence.getTime();

      const alarmId = `${habitId}_${dayOfWeek}`;

      await this.scheduleExactAlarm(alarmId, timestamp, {
        habitId,
        habitName,
        reminderId,
        dayOfWeek: String(dayOfWeek),
        time,
      });

      alarmIds.push(alarmId);
    }

    console.log(`✅ ${alarmIds.length} alarmes agendados`);
    return alarmIds;
  }

  /**
   * Calcula próxima ocorrência
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
      console.log('⚠️ Horário muito próximo! Pulando para próxima semana');
    }

    result.setDate(result.getDate() + daysUntil);

    console.log('📅 Próxima ocorrência:', {
      dayOfWeek,
      currentDay,
      time: `${hours}:${minutes}`,
      daysUntil,
      scheduled: result.toLocaleString(),
    });

    return result;
  }

  /**
   * Cancela todos os alarmes de um hábito
   */
  async cancelHabitAlarms(habitId: string, daysOfWeek: number[]): Promise<void> {
    console.log('🗑️ Cancelando alarmes do hábito:', habitId);

    for (const dayOfWeek of daysOfWeek) {
      const alarmId = `${habitId}_${dayOfWeek}`;
      await this.cancelAlarm(alarmId);
    }

    console.log('✅ Alarmes cancelados');
  }
}

export const exactAlarmService = new ExactAlarmService();