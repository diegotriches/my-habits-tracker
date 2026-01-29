// app/debug/notifications.tsx - VERSÃO COMPLETA COM TODOS OS TESTES
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { notificationService } from '@/services/notificationService';
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

  const testNotificationWithButtons = async () => {
    setLoading(true);
    
    if (isExpoGo) {
      addResult('⚠️ Notificação SEM botões (Expo Go)', 'info');
      addResult('📦 Mock enviará notificação básica', 'info');
    } else {
      addResult('🧪 Agendando notificação com botões...', 'info');
    }

    try {
      await notificationService.testNotificationWithActions();
      
      addResult('✅ Notificação agendada para 3s!', 'success');
      addResult('', 'info');
      addResult('📍 AGUARDE 3 SEGUNDOS', 'info');
      
      if (!isExpoGo) {
        addResult('👇 Quando aparecer, EXPANDA a notificação', 'info');
        addResult('✨ Os botões [ADIAR] e [COMPLETAR] vão aparecer!', 'success');
      } else {
        addResult('ℹ️ Notificação básica (sem botões no Expo Go)', 'info');
        addResult('🏗️ Para botões: eas build --profile preview', 'info');
      }
      
      setTimeout(() => {
        addResult('⏰ DEVE TER CHEGADO AGORA!', 'success');
        Alert.alert(
          '📱 Verifique a Notificação',
          isExpoGo 
            ? 'A notificação foi enviada!\n\n⚠️ No Expo Go os botões não aparecem.\n\nPara testar botões, faça uma build standalone.'
            : 'A notificação acabou de ser enviada!\n\nExpanda para ver os BOTÕES:\n• [⏰ ADIAR]\n• [✅ COMPLETAR]',
          [{ text: 'OK' }]
        );
      }, 3500);

    } catch (error) {
      addResult(`Erro: ${error}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // 🆕 TESTE IMEDIATO
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

      // ✅ USAR O MESMO MÉTODO QUE FUNCIONA!
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

  // 🆕 DEBUG CANAL NOTIFEE
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

        <TestButton
          title={isExpoGo ? "2. Teste Básico 📦" : "2. Teste de BOTÕES 🎯"}
          subtitle={isExpoGo 
            ? "Notificação básica (sem botões)"
            : "Notificação com [ADIAR] e [COMPLETAR]"
          }
          icon="target"
          onPress={testNotificationWithButtons}
          loading={loading}
          colors={colors}
          highlight
        />

        {/* 🆕 NOVO */}
        {!isExpoGo && (
          <TestButton
            title="🚨 TESTE IMEDIATO (3s)"
            subtitle="Notificação agora + 3 segundos"
            icon="zap"
            onPress={testImmediateNotification}
            loading={loading}
            colors={colors}
            highlight
          />
        )}

        {/* 🆕 NOVO */}
        {!isExpoGo && (
          <TestButton
            title="🔍 Debug Canal Notifee"
            subtitle="Verificar configuração do canal"
            icon="settings"
            onPress={debugNotifeeChannel}
            loading={loading}
            colors={colors}
          />
        )}

        <TestButton
          title="3. Listar Agendadas"
          subtitle="Mostra todas as notificações"
          icon="list"
          onPress={listScheduledNotifications}
          loading={loading}
          colors={colors}
        />

        <TestButton
          title="4. Cancelar Todas"
          subtitle="Remove todos os lembretes"
          icon="alertCircle"
          onPress={cancelAllNotifications}
          loading={loading}
          colors={colors}
          danger
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