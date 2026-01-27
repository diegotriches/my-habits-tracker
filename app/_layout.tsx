// app/_layout.tsx
import { NotificationHandler } from '@/components/notifications/NotificationHandler';
import { useAuth } from '@/hooks/useAuth';
import { notificationService } from '@/services/notificationService';
import { Slot, useRouter, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { ThemeProvider } from '../contexts/ThemeContext';

function RootLayoutNav() {
  const { isAuthenticated, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // 🔔 Inicializar Notifee (APENAS UMA VEZ)
  useEffect(() => {
    const initNotifications = async () => {
      try {
        console.log('🔔 Inicializando sistema de notificações...');
        
        // Inicializar com callback de navegação
        await notificationService.initialize?.((habitId: string) => {
          console.log('📱 Navegando para hábito via notificação:', habitId);
          router.push(`/habits/${habitId}`);
        });

        // Solicitar permissões
        const hasPermission = await notificationService.requestPermissions();
        if (hasPermission) {
          console.log('✅ Permissões de notificação concedidas');
        } else {
          console.warn('⚠️ Permissões de notificação negadas');
        }
      } catch (error) {
        console.error('❌ Erro ao inicializar notificações:', error);
      }
    };

    initNotifications();
  }, []); // Array vazio = executa apenas uma vez

  // 🔧 Controle de autenticação e navegação
  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      // Usuário não autenticado, redirecionar para login
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Usuário autenticado, redirecionar para home
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, loading, segments]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <>
      {/* 🆕 Handler de Notificações - Gerencia listeners globalmente */}
      {isAuthenticated && <NotificationHandler />}
      
      {/* Conteúdo principal */}
      <Slot />
    </>
  );
}

// ✅ EXPORT DEFAULT NA RAIZ (não dentro de função)
export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutNav />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});