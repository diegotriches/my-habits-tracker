// app/debug/notifications.tsx - VERSÃO DEBUG APRIMORADA
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { notificationService } from '@/services/notifications';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  Platform,
} from 'react-native';

// Interface estendida para suportar android.actions
interface NotificationContentWithActions extends Notifications.NotificationContentInput {
  android?: {
    channelId?: string;
    actions?: Array<{
      identifier: string;
      title: string;
      buttonTitle: string;
      options?: {
        opensAppToForeground?: boolean;
      };
    }>;
  };
}

export default function NotificationTestScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [testResults, setTestResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);

  useEffect(() => {
    loadDeviceInfo();
  }, []);

  const loadDeviceInfo = async () => {
    const info = {
      brand: Device.brand,
      manufacturer: Device.manufacturer,
      modelName: Device.modelName,
      osName: Device.osName,
      osVersion: Device.osVersion,
      platformApiLevel: Device.platformApiLevel,
      deviceName: Device.deviceName,
      isDevice: Device.isDevice,
    };
    setDeviceInfo(info);
    
    addResult(`📱 Dispositivo: ${info.manufacturer} ${info.modelName}`, 'info');
    addResult(`🤖 Android: ${info.osVersion} (API ${info.platformApiLevel})`, 'info');
    addResult(`🏭 Marca: ${info.brand}`, 'info');
  };

  const addResult = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    setTestResults(prev => [`${emoji} ${message}`, ...prev]);
  };

  // ========== TESTE DE PERMISSÃO ==========

  const testPermissions = async () => {
    setLoading(true);
    addResult('🔍 Verificando permissões...', 'info');

    try {
      const { status, canAskAgain, granted } = await Notifications.getPermissionsAsync();
      
      addResult(`Status: ${status}`, 'info');
      addResult(`Pode perguntar novamente: ${canAskAgain}`, 'info');
      addResult(`Concedido: ${granted}`, 'info');

      if (status !== 'granted') {
        addResult('Solicitando permissão...', 'info');
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        addResult(`Novo status: ${newStatus}`, newStatus === 'granted' ? 'success' : 'error');
      } else {
        addResult('Permissão já concedida!', 'success');
      }

      // Verificar configurações do canal
      if (Platform.OS === 'android') {
        const channel = await Notifications.getNotificationChannelAsync('habits');
        if (channel) {
          addResult(`Canal 'habits' existe`, 'success');
          addResult(`  - Importância: ${channel.importance}`, 'info');
          addResult(`  - Som: ${channel.sound || 'padrão'}`, 'info');
        } else {
          addResult(`Canal 'habits' NÃO existe!`, 'error');
          addResult(`Criando canal...`, 'info');
          await notificationService.requestPermissions();
          addResult(`Canal criado!`, 'success');
        }
      }
    } catch (error) {
      addResult(`Erro: ${error}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // ========== TESTE DE NOTIFICAÇÃO COM AÇÕES - VERSÃO VERBOSE ==========

  const testNotificationWithActionsVerbose = async () => {
    setLoading(true);
    addResult('🧪 Iniciando teste de ações (Android)...', 'info');

    try {
      if (Platform.OS !== 'android') {
        addResult('⚠️ Este teste é específico para Android', 'info');
        setLoading(false);
        return;
      }

      addResult('📋 Configurando notificação...', 'info');

      const content: NotificationContentWithActions = {
        title: '🎯 TESTE DE BOTÕES',
        body: '👇 EXPANDA para ver os botões de ação',
        sound: true,
        data: {
          habitId: 'test-habit-android',
          habitName: 'Teste Android',
          type: 'habit_reminder',
          testTimestamp: Date.now(),
        },
        priority: Notifications.AndroidNotificationPriority.MAX, // Mudado para MAX
        android: {
          channelId: 'habits',
          actions: [
            {
              identifier: 'snooze',
              title: '⏰ Adiar 10 minutos',
              buttonTitle: '⏰ ADIAR',
              options: {
                opensAppToForeground: false,
              },
            },
            {
              identifier: 'complete',
              title: '✅ Marcar como feito',
              buttonTitle: '✅ COMPLETAR',
              options: {
                opensAppToForeground: false,
              },
            },
          ],
        },
      };

      addResult('📤 Agendando notificação para 3s...', 'info');
      addResult('📱 Priority: MAX', 'info');
      addResult('🔔 Canal: habits', 'info');
      addResult('🎬 Actions: 2 botões', 'info');

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: content as Notifications.NotificationContentInput,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 3,
        },
      });

      addResult(`✅ Agendada! ID: ${notificationId}`, 'success');
      addResult('', 'info');
      addResult('📍 INSTRUÇÕES:', 'info');
      addResult('1. Aguarde 3 segundos', 'info');
      addResult('2. Quando aparecer, PUXE A NOTIFICAÇÃO PARA BAIXO', 'info');
      addResult('3. Ou toque na seta/ícone para expandir', 'info');
      addResult('4. Os botões devem aparecer embaixo do texto', 'info');
      
      // Adicionar alerta visual
      setTimeout(() => {
        addResult('⏰ NOTIFICAÇÃO DEVE TER CHEGADO AGORA!', 'success');
        Alert.alert(
          '📱 Verifique a Notificação',
          'A notificação acabou de ser enviada!\n\nExpanda ela para ver os botões:\n• Puxe para baixo\n• Ou toque no ícone ▼',
          [{ text: 'OK' }]
        );
      }, 3500);

    } catch (error) {
      addResult(`❌ Erro: ${error}`, 'error');
      console.error('Erro completo:', error);
    } finally {
      setLoading(false);
    }
  };

  // ========== TESTE ALTERNATIVO: NOTIFICAÇÃO COM ESTILO EXPANDIDO ==========

  const testExpandedNotification = async () => {
    setLoading(true);
    addResult('🧪 Testando notificação expandida...', 'info');

    try {
      if (Platform.OS !== 'android') {
        addResult('⚠️ Teste específico para Android', 'info');
        setLoading(false);
        return;
      }

      const content: any = {
        title: '📊 Notificação Expandida',
        body: 'Esta notificação tem estilo BIG_TEXT para expandir automaticamente',
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
        android: {
          channelId: 'habits',
          // Estilo expandido
          style: {
            type: 'bigText',
            text: 'Este é um texto longo que deve fazer a notificação expandir automaticamente. Tente puxar para baixo para ver se os botões aparecem.',
          },
          actions: [
            {
              identifier: 'test1',
              title: 'Botão 1',
              buttonTitle: '🔵 BOTÃO 1',
            },
            {
              identifier: 'test2',
              title: 'Botão 2',
              buttonTitle: '🟢 BOTÃO 2',
            },
            {
              identifier: 'test3',
              title: 'Botão 3',
              buttonTitle: '🟡 BOTÃO 3',
            },
          ],
        },
      };

      await Notifications.scheduleNotificationAsync({
        content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 3,
        },
      });

      addResult('✅ Notificação expandida agendada para 3s', 'success');
      addResult('Esta deve expandir mais facilmente', 'info');

    } catch (error) {
      addResult(`❌ Erro: ${error}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // ========== TESTE: VERIFICAR CANAL ==========

  const testChannel = async () => {
    setLoading(true);
    addResult('🔍 Verificando canais de notificação...', 'info');

    try {
      if (Platform.OS !== 'android') {
        addResult('⚠️ Canais são específicos do Android', 'info');
        setLoading(false);
        return;
      }

      const channels = await Notifications.getNotificationChannelsAsync();
      addResult(`📋 Total de canais: ${channels.length}`, 'info');

      for (const channel of channels) {
        addResult(``, 'info');
        addResult(`📢 Canal: ${channel.name}`, 'info');
        addResult(`  - ID: ${channel.id}`, 'info');
        addResult(`  - Importância: ${channel.importance}`, 'info');
        addResult(`  - Som: ${channel.sound || 'nenhum'}`, 'info');
        addResult(`  - Vibração: ${channel.enableVibrate ? 'sim' : 'não'}`, 'info');
      }

      // Verificar especificamente o canal 'habits'
      const habitsChannel = await Notifications.getNotificationChannelAsync('habits');
      if (habitsChannel) {
        addResult(``, 'info');
        addResult(`✅ Canal 'habits' configurado corretamente`, 'success');
        if (habitsChannel.importance < 3) {
          addResult(`⚠️ Importância baixa (${habitsChannel.importance})`, 'error');
          addResult(`Recomendado: 4 ou 5 para mostrar actions`, 'info');
        }
      } else {
        addResult(`❌ Canal 'habits' não encontrado!`, 'error');
      }

    } catch (error) {
      addResult(`❌ Erro: ${error}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // ========== VERIFICAR DEVICE INFO ==========

  const showDeviceInfo = () => {
    if (!deviceInfo) {
      Alert.alert('Carregando...', 'Informações do dispositivo ainda não carregadas');
      return;
    }

    const info = `
📱 Dispositivo: ${deviceInfo.manufacturer} ${deviceInfo.modelName}
🤖 Android: ${deviceInfo.osVersion}
📊 API Level: ${deviceInfo.platformApiLevel}
🏷️ Marca: ${deviceInfo.brand}
📱 Nome: ${deviceInfo.deviceName}
🔧 É dispositivo físico: ${deviceInfo.isDevice ? 'Sim' : 'Não (Emulador)'}

⚠️ AVISOS IMPORTANTES:

${deviceInfo.manufacturer === 'Xiaomi' ? '⚠️ XIAOMI detectado!\n- Vá em Configurações > Apps > Seu App\n- Ative "Exibir notificações pop-up"\n- Ative "Notificações flutuantes"\n\n' : ''}
${deviceInfo.manufacturer === 'Huawei' ? '⚠️ HUAWEI detectado!\n- Pode ter restrições em notificações\n- Verifique configurações de bateria\n\n' : ''}
${deviceInfo.manufacturer === 'Samsung' ? '⚠️ SAMSUNG detectado!\n- Verifique modo "Não perturbe"\n- Vá em Configurações > Notificações\n\n' : ''}
${deviceInfo.platformApiLevel < 24 ? '⚠️ API LEVEL < 24!\n- Actions requerem Android 7.0+ (API 24)\n- Seu dispositivo não suporta botões\n\n' : ''}
`;

    Alert.alert('📱 Informações do Dispositivo', info);
  };

  // ========== LIMPAR LOG ==========

  const clearLog = () => {
    setTestResults([]);
    addResult('Log limpo!', 'success');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrowLeft" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          🧪 Debug de Notificações
        </Text>
        <TouchableOpacity onPress={clearLog}>
          <Icon name="trash" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Banner de Aviso */}
        {deviceInfo && deviceInfo.platformApiLevel < 24 && (
          <View style={[styles.warningBanner, { backgroundColor: colors.dangerLight }]}>
            <Icon name="alertTriangle" size={20} color={colors.danger} />
            <Text style={[styles.warningText, { color: colors.danger }]}>
              Seu Android é muito antigo (API {deviceInfo.platformApiLevel}). Actions requerem API 24+
            </Text>
          </View>
        )}

        {/* Info do Dispositivo */}
        <TouchableOpacity
          style={[styles.infoCard, { backgroundColor: colors.surface }]}
          onPress={showDeviceInfo}
        >
          <Icon name="info" size={20} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.textPrimary }]}>
            {deviceInfo 
              ? `${deviceInfo.manufacturer} ${deviceInfo.modelName} • Android ${deviceInfo.osVersion}`
              : 'Carregando informações...'
            }
          </Text>
          <Icon name="chevronRight" size={16} color={colors.textTertiary} />
        </TouchableOpacity>

        {/* Testes Principais */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          🔔 Testes de Notificação
        </Text>

        <TestButton
          title="1. Verificar Permissões e Canal"
          subtitle="Analisa configurações completas"
          icon="shield"
          onPress={testPermissions}
          loading={loading}
          colors={colors}
        />

        <TestButton
          title="2. Teste de Botões (Verbose)"
          subtitle="Versão detalhada com instruções"
          icon="target"
          onPress={testNotificationWithActionsVerbose}
          loading={loading}
          colors={colors}
        />

        <TestButton
          title="3. Notificação Expandida"
          subtitle="Testa com estilo BIG_TEXT"
          icon="maximize"
          onPress={testExpandedNotification}
          loading={loading}
          colors={colors}
        />

        <TestButton
          title="4. Verificar Canais"
          subtitle="Lista todos os canais configurados"
          icon="list"
          onPress={testChannel}
          loading={loading}
          colors={colors}
        />

        {/* Log de Resultados */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          📊 Log de Debug
        </Text>

        <View style={[styles.logContainer, { backgroundColor: colors.surface }]}>
          {testResults.length === 0 ? (
            <Text style={[styles.emptyLog, { color: colors.textTertiary }]}>
              Execute um teste para ver os resultados
            </Text>
          ) : (
            testResults.map((result, index) => (
              <Text key={index} style={[styles.logItem, { color: colors.textSecondary }]}>
                {result}
              </Text>
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ========== COMPONENTE DE BOTÃO ==========

interface TestButtonProps {
  title: string;
  subtitle: string;
  icon: any;
  onPress: () => void;
  loading: boolean;
  colors: any;
  danger?: boolean;
}

function TestButton({ title, subtitle, icon, onPress, loading, colors, danger }: TestButtonProps) {
  return (
    <TouchableOpacity
      style={[
        styles.testButton,
        { 
          backgroundColor: colors.surface,
          borderColor: danger ? colors.danger : colors.border,
        },
        danger && { borderWidth: 2 },
      ]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.7}
    >
      <View style={[
        styles.iconContainer,
        { backgroundColor: danger ? colors.dangerLight : colors.primaryLight }
      ]}>
        <Icon name={icon} size={24} color={danger ? colors.danger : colors.primary} />
      </View>

      <View style={styles.buttonContent}>
        <Text style={[styles.buttonTitle, { color: danger ? colors.danger : colors.textPrimary }]}>
          {title}
        </Text>
        <Text style={[styles.buttonSubtitle, { color: colors.textTertiary }]}>
          {subtitle}
        </Text>
      </View>

      <Icon name="chevronRight" size={20} color={colors.textTertiary} />
    </TouchableOpacity>
  );
}

// ========== ESTILOS ==========

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    marginRight: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    gap: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 12,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  buttonContent: {
    flex: 1,
  },
  buttonTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  buttonSubtitle: {
    fontSize: 13,
  },
  logContainer: {
    padding: 16,
    borderRadius: 12,
    minHeight: 200,
    marginTop: 8,
  },
  emptyLog: {
    textAlign: 'center',
    fontSize: 14,
    paddingVertical: 40,
  },
  logItem: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 8,
    fontFamily: 'monospace',
  },
});