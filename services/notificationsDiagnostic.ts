// services/notificationsDiagnostic.ts - TESTE DIAGNÓSTICO COMPLETO
import notifee, {
  TriggerType,
  TimestampTrigger,
  AndroidImportance,
  EventType,
} from '@notifee/react-native';
import { Platform, Alert } from 'react-native';

/**
 * Service de diagnóstico para identificar o problema exato
 */
class NotificationDiagnosticService {
  
  /**
   * TESTE 1: Notificação em 30 segundos (sem actions, mínimo)
   */
  async test1_Simple30Seconds(): Promise<void> {
    console.log('🧪 TESTE 1: Notificação simples em 30 segundos');
    
    const triggerTime = Date.now() + 30000; // 30 segundos
    
    console.log('⏰ Agora:', new Date().toLocaleString());
    console.log('⏰ Agendado:', new Date(triggerTime).toLocaleString());
    
    try {
      const id = await notifee.createTriggerNotification(
        {
          title: '🧪 TESTE 1 - Simples',
          body: 'Deve aparecer em 30 segundos',
          android: {
            channelId: 'habits',
            importance: AndroidImportance.HIGH,
          },
        },
        {
          type: TriggerType.TIMESTAMP,
          timestamp: triggerTime,
        }
      );
      
      console.log('✅ Teste 1 criado:', id);
      Alert.alert(
        '🧪 Teste 1 Agendado',
        `ID: ${id}\n\nSe aparecer AGORA = Problema no Notifee\nSe aparecer em 30s = Notifee OK!`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('❌ Erro teste 1:', error);
    }
  }

  /**
   * TESTE 2: Notificação em 1 minuto (com actions)
   */
  async test2_WithActions1Minute(): Promise<void> {
    console.log('🧪 TESTE 2: Com botões em 1 minuto');
    
    const triggerTime = Date.now() + 60000; // 1 minuto
    
    console.log('⏰ Agora:', new Date().toLocaleString());
    console.log('⏰ Agendado:', new Date(triggerTime).toLocaleString());
    
    try {
      const id = await notifee.createTriggerNotification(
        {
          title: '🧪 TESTE 2 - Com Botões',
          body: 'Deve aparecer em 1 minuto',
          android: {
            channelId: 'habits',
            importance: AndroidImportance.HIGH,
            actions: [
              {
                title: '⏰ Botão 1',
                pressAction: { id: 'btn1' },
              },
              {
                title: '✅ Botão 2',
                pressAction: { id: 'btn2' },
              },
            ],
          },
        },
        {
          type: TriggerType.TIMESTAMP,
          timestamp: triggerTime,
        }
      );
      
      console.log('✅ Teste 2 criado:', id);
      Alert.alert(
        '🧪 Teste 2 Agendado',
        `ID: ${id}\n\nSe aparecer AGORA = Problema com actions\nSe aparecer em 1min = Actions OK!`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('❌ Erro teste 2:', error);
    }
  }

  /**
   * TESTE 3: Verificar permissões de alarmes exatos
   */
  async test3_CheckAlarmPermission(): Promise<void> {
    console.log('🧪 TESTE 3: Verificar permissão de alarmes exatos');
    
    if (Platform.OS !== 'android') {
      Alert.alert('⚠️', 'Teste apenas para Android');
      return;
    }

    try {
      const settings = await notifee.getNotificationSettings();
      
      console.log('📱 Settings:', settings);
      
      // Tentar criar uma notificação de teste
      const testTime = Date.now() + 10000; // 10 segundos
      
      const id = await notifee.createTriggerNotification(
        {
          title: '🧪 TESTE 3 - Permissão',
          body: 'Teste de permissão (10s)',
          android: {
            channelId: 'habits',
            importance: AndroidImportance.HIGH,
          },
        },
        {
          type: TriggerType.TIMESTAMP,
          timestamp: testTime,
        }
      );
      
      console.log('✅ Teste 3 criado:', id);
      
      // Verificar se foi agendado
      const scheduled = await notifee.getTriggerNotifications();
      const found = scheduled.find(n => n.notification.id === id);
      
      if (found) {
        console.log('✅ Encontrado nas agendadas:', found.trigger);
        
        Alert.alert(
          '✅ Permissão Parece OK',
          `Notificação foi agendada!\n\n` +
          `ID: ${id}\n` +
          `Trigger: ${JSON.stringify(found.trigger)}\n\n` +
          `Aguarde 10s para ver se dispara no horário correto.`,
          [{ text: 'OK' }]
        );
      } else {
        console.log('❌ NÃO encontrado nas agendadas!');
        
        Alert.alert(
          '❌ PROBLEMA DE PERMISSÃO!',
          `A notificação foi criada mas NÃO foi agendada!\n\n` +
          `Isso indica que:\n` +
          `1. Permissão de alarmes exatos está DESATIVADA\n` +
          `2. OU o Android está bloqueando\n\n` +
          `Vá em: Configurações → Apps → My Habits Tracker → Alarmes e lembretes → ATIVAR`,
          [{ text: 'OK' }]
        );
      }
      
    } catch (error) {
      console.error('❌ Erro teste 3:', error);
      Alert.alert('❌ Erro', `${error}`);
    }
  }

  /**
   * TESTE 4: Listener de eventos
   */
  setupEventListener(): void {
    console.log('🧪 TESTE 4: Configurando listener de eventos');
    
    let eventCount = 0;
    
    notifee.onForegroundEvent(({ type, detail }) => {
      eventCount++;
      
      const eventNames: { [key: number]: string } = {
        0: 'UNKNOWN',
        1: 'DISMISSED',
        2: 'PRESS',
        3: 'ACTION_PRESS',
        4: 'DELIVERED',
        5: 'APP_BLOCKED',
        6: 'CHANNEL_BLOCKED',
        7: 'CHANNEL_GROUP_BLOCKED',
        8: 'TRIGGER_NOTIFICATION_CREATED',
      };
      
      const eventName = eventNames[type] || `UNKNOWN(${type})`;
      
      console.log(`🔔 [${eventCount}] Event: ${eventName} (${type})`);
      console.log('   Detail:', JSON.stringify(detail, null, 2));
      
      // Se for DELIVERED (4) logo após criação = PROBLEMA!
      if (type === EventType.DELIVERED || type === 4) {
        const notification = detail.notification;
        const title = notification?.title || 'Unknown';
        
        if (title.includes('TESTE')) {
          console.log('⚠️ DELIVERED IMEDIATO detectado!');
          
          Alert.alert(
            '🚨 PROBLEMA CONFIRMADO!',
            `Notificação "${title}" foi DELIVERED imediatamente!\n\n` +
            `Isso confirma que o Android está ignorando o trigger timestamp.\n\n` +
            `Possíveis causas:\n` +
            `1. Permissão de alarmes exatos desativada\n` +
            `2. Bug do Notifee com Android 16\n` +
            `3. Restrições do Samsung`,
            [{ text: 'OK' }]
          );
        }
      }
    });
    
    console.log('✅ Listener configurado');
  }

  /**
   * TESTE 5: Comparar com displayNotification (imediata)
   */
  async test5_ImmediateVsScheduled(): Promise<void> {
    console.log('🧪 TESTE 5: Imediata vs Agendada');
    
    try {
      // 1. Notificação IMEDIATA (sem trigger)
      await notifee.displayNotification({
        title: '🟢 IMEDIATA',
        body: 'Esta deve aparecer AGORA',
        android: {
          channelId: 'habits',
          importance: AndroidImportance.HIGH,
        },
      });
      
      console.log('✅ Imediata enviada');
      
      // 2. Notificação AGENDADA para 15 segundos
      const scheduledTime = Date.now() + 15000;
      
      const id = await notifee.createTriggerNotification(
        {
          title: '🔵 AGENDADA (15s)',
          body: 'Esta deve aparecer em 15 segundos',
          android: {
            channelId: 'habits',
            importance: AndroidImportance.HIGH,
          },
        },
        {
          type: TriggerType.TIMESTAMP,
          timestamp: scheduledTime,
        }
      );
      
      console.log('✅ Agendada criada:', id);
      
      Alert.alert(
        '🧪 Teste 5',
        `VERDE (imediata) = Apareceu agora\n` +
        `AZUL (agendada) = Deve aparecer em 15s\n\n` +
        `Se AMBAS aparecerem agora = PROBLEMA CONFIRMADO!`,
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('❌ Erro teste 5:', error);
    }
  }

  /**
   * EXECUTAR TODOS OS TESTES
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 Executando TODOS os testes de diagnóstico...');
    
    this.setupEventListener();
    
    Alert.alert(
      '🚀 Testes de Diagnóstico',
      'Vamos executar 5 testes em sequência:\n\n' +
      '1. Simples (30s)\n' +
      '2. Com botões (1min)\n' +
      '3. Permissões\n' +
      '4. Listener (já ativo)\n' +
      '5. Imediata vs Agendada\n\n' +
      'Acompanhe os logs!',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Executar',
          onPress: async () => {
            await this.test1_Simple30Seconds();
            
            setTimeout(async () => {
              await this.test2_WithActions1Minute();
            }, 2000);
            
            setTimeout(async () => {
              await this.test3_CheckAlarmPermission();
            }, 4000);
            
            setTimeout(async () => {
              await this.test5_ImmediateVsScheduled();
            }, 6000);
            
            console.log('✅ Todos os testes iniciados!');
          },
        },
      ]
    );
  }
}

export const diagnosticService = new NotificationDiagnosticService();