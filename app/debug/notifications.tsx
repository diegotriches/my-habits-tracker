// app/debug/notifications.tsx - VERSÃO COMPLETA COM TODOS OS TESTES
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { notificationService } from '@/services/notificationService';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { diagnosticService } from '@/services/notificationsDiagnostic';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  Platform,
} from 'react-native';

export default function NotificationTestScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [testResults, setTestResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [isExpoGo, setIsExpoGo] = useState(false);

  useEffect(() => {
    loadDeviceInfo();
    checkEnvironment();
  }, []);

  const checkEnvironment = () => {
    const isRunningInExpoGo = Constants.appOwnership === 'expo';
    setIsExpoGo(isRunningInExpoGo);

    if (isRunningInExpoGo) {
      addResult('⚠️ Rodando no Expo Go', 'info');
      addResult('📦 Usando Mock de Notificações', 'info');
      addResult('✅ Notificações funcionam, mas SEM botões', 'info');
      addResult('🏗️ Para testar botões: faça build standalone', 'info');
    } else {
      addResult('🚀 Rodando em Build Standalone', 'success');
      addResult('✅ Notifee nativo ativado', 'success');
      addResult('🎯 Botões de ação funcionam!', 'success');
    }
  };

  const loadDeviceInfo = async () => {
    const info = {
      brand: Device.brand,
      manufacturer: Device.manufacturer,
      modelName: Device.modelName,
      osVersion: Device.osVersion,
      platformApiLevel: Device.platformApiLevel,
    };
    setDeviceInfo(info);

    addResult(`📱 ${info.manufacturer} ${info.modelName}`, 'info');
    addResult(`🤖 Android ${info.osVersion} (API ${info.platformApiLevel})`, 'info');
  };

  const addResult = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    setTestResults(prev => [`${emoji} ${message}`, ...prev]);
  };

  const testPermissions = async () => {
    setLoading(true);
    addResult('🔍 Verificando permissões...', 'info');

    try {
      const hasPermission = await notificationService.hasPermission();

      if (hasPermission) {
        addResult('Permissão já concedida!', 'success');
      } else {
        addResult('Solicitando permissão...', 'info');
        const granted = await notificationService.requestPermissions();

        if (granted) {
          addResult('Permissão concedida!', 'success');
        } else {
          addResult('Permissão negada', 'error');
        }
      }
    } catch (error) {
      addResult(`Erro: ${error}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // TESTE IMEDIATO
  const testImmediateNotification = async () => {
    setLoading(true);
    addResult('🧪 Teste IMEDIATO (3s)...', 'info');

    try {
      const hasPermission = await notificationService.hasPermission();
      if (!hasPermission) {
        addResult('❌ SEM PERMISSÃO!', 'error');
        addResult('Execute "Verificar Permissões" primeiro', 'info');
        setLoading(false);
        return;
      }

      addResult('✅ Permissão OK', 'success');
      addResult('🔔 Usando testNotificationWithActions...', 'info');

      await notificationService.testNotificationWithActions();

      addResult('✅ Notificação agendada para 3s!', 'success');
      addResult('', 'info');
      addResult('⏰ AGUARDE 3 SEGUNDOS', 'success');
      addResult('📱 Expanda quando aparecer', 'info');

      setTimeout(() => {
        addResult('⏰ DEVE TER CHEGADO!', 'success');
        Alert.alert(
          '📱 Chegou?',
          'A notificação deve ter aparecido AGORA!\n\nSe chegou:\n✅ Sistema funcionando!\n\nSe NÃO chegou:\n❌ Problema na configuração',
          [{ text: 'OK' }]
        );
      }, 4000);

    } catch (error) {
      addResult(`❌ ERRO: ${error}`, 'error');
      console.error('Erro completo:', error);
    } finally {
      setLoading(false);
    }
  };

  // DEBUG CANAL NOTIFEE
  const debugNotifeeChannel = async () => {
    setLoading(true);
    addResult('🔍 Verificando canal Notifee...', 'info');

    try {
      const notifee = require('@notifee/react-native').default;
      const { AndroidImportance } = require('@notifee/react-native');

      const channels = await notifee.getChannels();

      addResult(`📢 Total de canais: ${channels.length}`, 'info');

      const habitsChannel = channels.find((c: any) => c.id === 'habits');

      if (!habitsChannel) {
        addResult('❌ Canal "habits" NÃO EXISTE!', 'error');
        addResult('Isso é um PROBLEMA GRAVE', 'error');
        addResult('', 'info');
        addResult('Solução: Recriando canal...', 'info');

        await notifee.createChannel({
          id: 'habits',
          name: 'Lembretes de Hábitos',
          importance: AndroidImportance.HIGH,
          sound: 'default',
          vibration: true,
        });

        addResult('✅ Canal recriado!', 'success');
      } else {
        addResult('✅ Canal existe!', 'success');
        addResult(`   Nome: ${habitsChannel.name}`, 'info');

        const importanceText = [
          'NONE (0)',
          'MIN (1)',
          'LOW (2)',
          'DEFAULT (3)',
          'HIGH (4)',
          'MAX (5)'
        ][habitsChannel.importance] || 'Unknown';

        addResult(`   Importância: ${importanceText}`, 'info');

        if (habitsChannel.importance < 3) {
          addResult('⚠️ IMPORTÂNCIA MUITO BAIXA!', 'error');
          addResult('Botões podem não aparecer', 'error');
        } else {
          addResult('✅ Importância adequada', 'success');
        }

        addResult(`   Som: ${habitsChannel.sound || 'Nenhum'}`, 'info');
        addResult(`   Vibração: ${habitsChannel.vibration ? 'Sim' : 'Não'}`, 'info');
      }

      const settings = await notifee.getNotificationSettings();

      addResult('', 'info');
      addResult('📱 Status de Permissões:', 'info');
      addResult(`   Authorization: ${settings.authorizationStatus}`, 'info');

      if (settings.authorizationStatus < 1) {
        addResult('❌ PERMISSÃO NEGADA!', 'error');
      } else {
        addResult('✅ Permissão concedida', 'success');
      }

      const importanceText = habitsChannel
        ? [
          'NONE (0)',
          'MIN (1)',
          'LOW (2)',
          'DEFAULT (3)',
          'HIGH (4)',
          'MAX (5)'
        ][habitsChannel.importance] || 'Unknown'
        : 'N/A';

      Alert.alert(
        '🔍 Debug Completo',
        habitsChannel
          ? `Canal existe\nImportância: ${importanceText}\nPermissão: ${settings.authorizationStatus >= 1 ? 'OK' : 'NEGADA'}`
          : 'Canal não existe! Foi recriado agora.',
        [{ text: 'OK' }]
      );

    } catch (error) {
      addResult(`❌ Erro: ${error}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // TESTE DIRETO - displayNotification com botões (sem trigger)
  const testDirectNotification = async () => {
    setLoading(true);
    addResult('🧪 Disparando notificação DIRETA...', 'info');

    try {
      const notifee = require('@notifee/react-native').default;
      const { AndroidImportance } = require('@notifee/react-native');

      await notifee.displayNotification({
        title: '🧪 TESTE DIRETO',
        body: 'Toque nos botões abaixo',
        data: {
          habitId: 'test-direto-123',
          habitName: 'Teste Direto',
        },
        android: {
          channelId: 'habits',
          importance: AndroidImportance.HIGH,
          smallIcon: 'ic_launcher',
          actions: [
            {
              title: '⏰ Adiar',
              pressAction: { id: 'snooze' },
            },
            {
              title: '✅ Feito',
              pressAction: { id: 'complete' },
            },
          ],
          pressAction: { id: 'default' },
        },
      });

      addResult('✅ Notificação disparada!', 'success');
      addResult('👆 Toque nos botões e veja o console', 'info');
      addResult('📋 Procure por logs: 🔔 [FOREGROUND]', 'info');
    } catch (error) {
      addResult(`❌ Erro: ${error}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // 🆕 DIAGNÓSTICO NOTIFEE - Verifica se o módulo nativo está funcional
  const testNotifeeDiagnostic = async () => {
    setLoading(true);
    addResult('🔬 Iniciando diagnóstico Notifee...', 'info');

    try {
      const notifee = require('@notifee/react-native').default;
      const { EventType } = require('@notifee/react-native');

      // Teste 1: Módulo nativo responde?
      addResult('', 'info');
      addResult('--- Teste 1: Módulo nativo ---', 'info');
      const initial = await notifee.getInitialNotification();
      addResult(`getInitialNotification: ${initial ? 'tem dados' : 'null (ok)'}`, 'success');

      // Teste 2: EventType disponível?
      addResult('', 'info');
      addResult('--- Teste 2: EventType ---', 'info');
      addResult(`DISMISSED: ${EventType.DISMISSED}`, 'info');
      addResult(`PRESS: ${EventType.PRESS}`, 'info');
      addResult(`ACTION_PRESS: ${EventType.ACTION_PRESS}`, 'info');
      addResult(`DELIVERED: ${EventType.DELIVERED}`, 'info');
      console.log('🧪 EVENT TYPES:', JSON.stringify(EventType));

      // Teste 3: onForegroundEvent é função?
      addResult('', 'info');
      addResult('--- Teste 3: API disponível ---', 'info');
      addResult(`onForegroundEvent: ${typeof notifee.onForegroundEvent}`, 'info');
      addResult(`onBackgroundEvent: ${typeof notifee.onBackgroundEvent}`, 'info');
      addResult(`displayNotification: ${typeof notifee.displayNotification}`, 'info');

      // Teste 4: Canais
      addResult('', 'info');
      addResult('--- Teste 4: Canais ---', 'info');
      const channels = await notifee.getChannels();
      addResult(`Total de canais: ${channels.length}`, 'info');
      channels.forEach((ch: any) => {
        addResult(`  - ${ch.id} (importance: ${ch.importance})`, 'info');
      });

      // Teste 5: Notificações pendentes
      addResult('', 'info');
      addResult('--- Teste 5: Notificações ---', 'info');
      const displayed = await notifee.getDisplayedNotifications();
      addResult(`Exibidas agora: ${displayed.length}`, 'info');
      const triggered = await notifee.getTriggerNotifications();
      addResult(`Agendadas: ${triggered.length}`, 'info');

      // Teste 6: Registrar listener AGORA e confirmar
      addResult('', 'info');
      addResult('--- Teste 6: Listener ao vivo ---', 'info');
      addResult('Registrando onForegroundEvent AGORA...', 'info');
      
      const unsubscribe = notifee.onForegroundEvent(({ type, detail }: any) => {
        const msg = `🔔 EVENTO CAPTURADO! type=${type} action=${detail?.pressAction?.id || 'none'}`;
        console.log(msg);
        addResult(msg, 'success');
      });

      addResult('✅ Listener registrado!', 'success');
      addResult('', 'info');
      addResult('📌 AGORA dispare o "Teste DIRETO" e clique nos botões', 'info');
      addResult('📌 Os eventos devem aparecer AQUI no log', 'info');

      // Guardar unsubscribe para limpar depois (opcional)
      console.log('🧪 Unsubscribe function:', typeof unsubscribe);

    } catch (error) {
      addResult(`❌ Erro diagnóstico: ${error}`, 'error');
      console.error('Erro completo:', error);
    } finally {
      setLoading(false);
    }
  };

  const listScheduledNotifications = async () => {
    setLoading(true);
    addResult('📋 Listando notificações...', 'info');

    try {
      const notifications = await notificationService.getAllScheduledNotifications();

      if (notifications.length === 0) {
        addResult('Nenhuma notificação agendada', 'info');
      } else {
        addResult(`${notifications.length} notificações agendadas:`, 'success');

        notifications.forEach((item: any, index: number) => {
          const title = item.notification?.title || item.content?.title || 'Sem título';
          const habitName = item.notification?.data?.habitName || item.content?.data?.habitName;

          addResult(`${index + 1}. ${title}`, 'info');
          if (habitName) {
            addResult(`   Hábito: ${habitName}`, 'info');
          }
        });
      }
    } catch (error) {
      addResult(`Erro: ${error}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const cancelAllNotifications = async () => {
    Alert.alert(
      'Cancelar Todas?',
      'Isso vai cancelar TODAS as notificações agendadas',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            addResult('Cancelando todas...', 'info');

            try {
              const notifications = await notificationService.getAllScheduledNotifications();

              for (const notif of notifications) {
                const id = notif.id || notif.notification?.id;
                if (id) {
                  await notificationService.cancelNotification(id);
                }
              }

              addResult(`${notifications.length} notificações canceladas!`, 'success');
            } catch (error) {
              addResult(`Erro: ${error}`, 'error');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const clearLog = () => {
    setTestResults([]);
    addResult('Log limpo!', 'success');
    checkEnvironment();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrowLeft" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          🚀 Testes de Notificações
        </Text>
        <TouchableOpacity onPress={clearLog}>
          <Icon name="trash" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {isExpoGo && (
          <View style={[styles.warningBanner, { backgroundColor: colors.warningLight }]}>
            <Icon name="alertCircle" size={20} color={colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.warningTitle, { color: colors.warning }]}>
                Expo Go - Modo Limitado
              </Text>
              <Text style={[styles.warningText, { color: colors.warning }]}>
                Botões de notificação não funcionam no Expo Go.
                {'\n'}Faça uma build standalone para testar.
              </Text>
            </View>
          </View>
        )}

        <View style={[styles.infoBanner, { backgroundColor: colors.primaryLight }]}>
          <Icon name="info" size={20} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.primary }]}>
            {isExpoGo
              ? 'Usando Mock - Notificações básicas funcionam'
              : 'Usando Notifee - Botões funcionam 100%!'
            }
          </Text>
        </View>

        {deviceInfo && (
          <View style={[styles.deviceCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.deviceText, { color: colors.textPrimary }]}>
              {deviceInfo.manufacturer} {deviceInfo.modelName}
            </Text>
            <Text style={[styles.deviceSubtext, { color: colors.textSecondary }]}>
              Android {deviceInfo.osVersion} • API {deviceInfo.platformApiLevel}
            </Text>
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          🔔 Testes de Notificação
        </Text>

        <TestButton
          title="1. Verificar Permissões"
          subtitle="Solicita permissão de notificações"
          icon="shield"
          onPress={testPermissions}
          loading={loading}
          colors={colors}
        />

        {/* TESTE IMEDIATO */}
        <TestButton
          title="2. Teste Imediato (3s)"
          subtitle="Notificação agora + 3 segundos"
          icon="zap"
          onPress={testImmediateNotification}
          loading={loading}
          colors={colors}
          highlight
        />

        {/* DEBUG CANAL */}
        <TestButton
          title="3. Debug Canal Notifee"
          subtitle="Verificar configuração do canal"
          icon="settings"
          onPress={debugNotifeeChannel}
          loading={loading}
          colors={colors}
        />

        {/* TESTE DIRETO - SEM TRIGGER */}
        <TestButton
          title="🧪 Teste DIRETO (sem trigger)"
          subtitle="displayNotification com botões - teste foreground"
          icon="bell"
          onPress={testDirectNotification}
          loading={loading}
          colors={colors}
          highlight
        />

        {/* 🆕 DIAGNÓSTICO NOTIFEE */}
        <TestButton
          title="🔬 Diagnóstico Notifee"
          subtitle="Verifica módulo nativo + registra listener ao vivo"
          icon="activity"
          onPress={testNotifeeDiagnostic}
          loading={loading}
          colors={colors}
          highlight
        />

        <TestButton
          title="4. Listar Agendadas"
          subtitle="Mostra todas as notificações"
          icon="list"
          onPress={listScheduledNotifications}
          loading={loading}
          colors={colors}
        />

        <TestButton
          title="5. Cancelar Todas"
          subtitle="Remove todos os lembretes"
          icon="alertCircle"
          onPress={cancelAllNotifications}
          loading={loading}
          colors={colors}
          danger
        />

        <TestButton
          title="🧪 DIAGNÓSTICO COMPLETO"
          subtitle="Executar todos os testes"
          icon="activity"
          onPress={() => diagnosticService.runAllTests()}
          loading={loading}
          colors={colors}
          highlight
        />

        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          📊 Log de Testes
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

interface TestButtonProps {
  title: string;
  subtitle: string;
  icon: any;
  onPress: () => void;
  loading: boolean;
  colors: any;
  danger?: boolean;
  highlight?: boolean;
}

function TestButton({ title, subtitle, icon, onPress, loading, colors, danger, highlight }: TestButtonProps) {
  return (
    <TouchableOpacity
      style={[
        styles.testButton,
        {
          backgroundColor: highlight ? colors.primaryLight : colors.surface,
          borderColor: danger ? colors.danger : highlight ? colors.primary : colors.border,
        },
        (danger || highlight) && { borderWidth: 2 },
      ]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.7}
    >
      <View style={[
        styles.iconContainer,
        { backgroundColor: danger ? colors.dangerLight : highlight ? colors.primary : colors.primaryLight }
      ]}>
        <Icon
          name={icon}
          size={24}
          color={danger ? colors.danger : highlight ? '#FFFFFF' : colors.primary}
        />
      </View>

      <View style={styles.buttonContent}>
        <Text style={[
          styles.buttonTitle,
          { color: danger ? colors.danger : highlight ? colors.primary : colors.textPrimary }
        ]}>
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center', marginRight: 32 },
  content: { flex: 1, paddingHorizontal: 20 },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    gap: 12,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 12,
    lineHeight: 18,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    gap: 12,
  },
  infoText: { flex: 1, fontSize: 13, fontWeight: '600' },
  deviceCard: {
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
  },
  deviceText: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  deviceSubtext: { fontSize: 13 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 24, marginBottom: 12 },
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
  buttonContent: { flex: 1 },
  buttonTitle: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  buttonSubtitle: { fontSize: 13 },
  logContainer: { padding: 16, borderRadius: 12, minHeight: 200, marginTop: 8 },
  emptyLog: { textAlign: 'center', fontSize: 14, paddingVertical: 40 },
  logItem: { fontSize: 13, lineHeight: 20, marginBottom: 8, fontFamily: 'monospace' },
});