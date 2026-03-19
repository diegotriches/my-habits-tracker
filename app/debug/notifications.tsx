// app/debug/notifications.tsx
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { notificationService } from '@/services/notificationService';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
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
    const running = Constants.appOwnership === 'expo';
    setIsExpoGo(running);
    if (running) {
      addResult('Rodando no Expo Go', 'info');
      addResult('Notificacoes basicas funcionam, sem botoes nativos', 'info');
    } else {
      addResult('Rodando em Build Standalone', 'success');
      addResult('expo-notifications + AlarmManager nativo ativos', 'success');
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
    addResult(`${info.manufacturer} ${info.modelName}`, 'info');
    addResult(`Android ${info.osVersion} (API ${info.platformApiLevel})`, 'info');
  };

  const addResult = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const prefix = type === 'success' ? '[OK]' : type === 'error' ? '[ERRO]' : '[INFO]';
    setTestResults(prev => [`${prefix} ${message}`, ...prev]);
  };

  // ---------------------------------------------------------------------------
  // Testes
  // ---------------------------------------------------------------------------

  const testPermissions = async () => {
    setLoading(true);
    addResult('Verificando permissoes...', 'info');
    try {
      const has = await notificationService.hasPermission();
      if (has) {
        addResult('Permissao ja concedida', 'success');
      } else {
        const granted = await notificationService.requestPermissions();
        addResult(granted ? 'Permissao concedida' : 'Permissao negada', granted ? 'success' : 'error');
      }
    } catch (e) {
      addResult(`Erro: ${e}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const testImmediateNotification = async () => {
    setLoading(true);
    addResult('Agendando notificacao de teste (5s)...', 'info');
    try {
      const has = await notificationService.hasPermission();
      if (!has) {
        addResult('Sem permissao — execute "Verificar Permissoes" primeiro', 'error');
        return;
      }
      await notificationService.scheduleTestNotification('Habito de Teste');
      addResult('Notificacao agendada para 5 segundos', 'success');
      setTimeout(() => addResult('Deve ter chegado agora!', 'success'), 6000);
    } catch (e) {
      addResult(`Erro: ${e}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const testDebugChannel = async () => {
    setLoading(true);
    addResult('Verificando canal "habits"...', 'info');
    try {
      if (Platform.OS !== 'android') {
        addResult('Verificacao de canal e apenas Android', 'info');
        return;
      }
      const channel = await Notifications.getNotificationChannelAsync('habits');
      if (!channel) {
        addResult('Canal "habits" nao existe — rode "Verificar Permissoes" para criá-lo', 'error');
        return;
      }
      const importanceLabels = ['NONE', 'MIN', 'LOW', 'DEFAULT', 'HIGH', 'MAX'];
      addResult(`Canal existe: ${channel.name}`, 'success');
      addResult(`Importancia: ${importanceLabels[channel.importance] ?? channel.importance}`, 'info');
      addResult(`Som: ${channel.sound ?? 'padrao'}`, 'info');
      addResult(`Vibracao: ${channel.enableVibrate ? 'Sim' : 'Nao'}`, 'info');
    } catch (e) {
      addResult(`Erro: ${e}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const listScheduledNotifications = async () => {
    setLoading(true);
    addResult('Listando notificacoes agendadas...', 'info');
    try {
      const notifications = await notificationService.getAllScheduledNotifications();
      if (notifications.length === 0) {
        addResult('Nenhuma notificacao agendada', 'info');
      } else {
        addResult(`${notifications.length} notificacoes agendadas:`, 'success');
        notifications.forEach((n, i) => {
          const title = n.content?.title ?? 'Sem titulo';
          const habitName = (n.content?.data as any)?.habitName;
          addResult(`${i + 1}. ${title}${habitName ? ` — ${habitName}` : ''}`, 'info');
        });
      }
    } catch (e) {
      addResult(`Erro: ${e}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const cancelAllNotifications = () => {
    Alert.alert(
      'Cancelar Todas?',
      'Isso vai cancelar TODAS as notificacoes agendadas.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            addResult('Cancelando todas...', 'info');
            try {
              await notificationService.cancelAllNotifications();
              addResult('Todas as notificacoes canceladas', 'success');
            } catch (e) {
              addResult(`Erro: ${e}`, 'error');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const runAllTests = async () => {
    setLoading(true);
    addResult('--- Iniciando diagnostico completo ---', 'info');
    await testPermissions();
    await testDebugChannel();
    await listScheduledNotifications();
    addResult('--- Diagnostico concluido ---', 'success');
    setLoading(false);
  };

  const clearLog = () => {
    setTestResults([]);
    checkEnvironment();
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrowLeft" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Testes de Notificacoes
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
                Expo Go — Modo Limitado
              </Text>
              <Text style={[styles.warningText, { color: colors.warning }]}>
                Botoes de notificacao nao funcionam no Expo Go.
                {'\n'}Faca uma build standalone para testar.
              </Text>
            </View>
          </View>
        )}

        <View style={[styles.infoBanner, { backgroundColor: colors.primaryLight }]}>
          <Icon name="info" size={20} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.primary }]}>
            {isExpoGo
              ? 'Expo Go — notificacoes basicas apenas'
              : 'Build Standalone — expo-notifications + AlarmManager'}
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
          Testes de Notificacao
        </Text>

        <TestButton title="1. Verificar Permissoes" subtitle="Solicita permissao de notificacoes" icon="shield" onPress={testPermissions} loading={loading} colors={colors} />
        <TestButton title="2. Teste Imediato (5s)" subtitle="Agenda notificacao para daqui 5 segundos" icon="zap" onPress={testImmediateNotification} loading={loading} colors={colors} highlight />
        <TestButton title="3. Debug Canal" subtitle="Verifica configuracao do canal habits" icon="settings" onPress={testDebugChannel} loading={loading} colors={colors} />
        <TestButton title="4. Listar Agendadas" subtitle="Mostra todas as notificacoes" icon="list" onPress={listScheduledNotifications} loading={loading} colors={colors} />
        <TestButton title="5. Cancelar Todas" subtitle="Remove todos os lembretes" icon="alertCircle" onPress={cancelAllNotifications} loading={loading} colors={colors} danger />
        <TestButton title="Diagnostico Completo" subtitle="Executa todos os testes em sequencia" icon="activity" onPress={runAllTests} loading={loading} colors={colors} highlight />

        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Log de Testes
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

// ---------------------------------------------------------------------------
// TestButton
// ---------------------------------------------------------------------------

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
        { backgroundColor: danger ? colors.dangerLight : highlight ? colors.primary : colors.primaryLight },
      ]}>
        <Icon name={icon} size={24} color={danger ? colors.danger : highlight ? '#FFFFFF' : colors.primary} />
      </View>
      <View style={styles.buttonContent}>
        <Text style={[styles.buttonTitle, { color: danger ? colors.danger : highlight ? colors.primary : colors.textPrimary }]}>
          {title}
        </Text>
        <Text style={[styles.buttonSubtitle, { color: colors.textTertiary }]}>{subtitle}</Text>
      </View>
      <Icon name="chevronRight" size={20} color={colors.textTertiary} />
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16, borderBottomWidth: 1 },
  backButton: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center', marginRight: 32 },
  content: { flex: 1, paddingHorizontal: 20 },
  warningBanner: { flexDirection: 'row', alignItems: 'flex-start', padding: 16, borderRadius: 12, marginTop: 16, gap: 12 },
  warningTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  warningText: { fontSize: 12, lineHeight: 18 },
  infoBanner: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginTop: 16, gap: 12 },
  infoText: { flex: 1, fontSize: 13, fontWeight: '600' },
  deviceCard: { padding: 16, borderRadius: 12, marginTop: 12 },
  deviceText: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  deviceSubtext: { fontSize: 13 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 24, marginBottom: 12 },
  testButton: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1 },
  iconContainer: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  buttonContent: { flex: 1 },
  buttonTitle: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  buttonSubtitle: { fontSize: 13 },
  logContainer: { padding: 16, borderRadius: 12, minHeight: 200, marginTop: 8 },
  emptyLog: { textAlign: 'center', fontSize: 14, paddingVertical: 40 },
  logItem: { fontSize: 13, lineHeight: 20, marginBottom: 8, fontFamily: 'monospace' },
});