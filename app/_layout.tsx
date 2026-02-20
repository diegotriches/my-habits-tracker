// app/_layout.tsx
import { NotificationHandler } from '@/components/notifications/NotificationHandler';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Slot, useRouter, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View, Text } from 'react-native';
import { ThemeProvider } from '../contexts/ThemeContext';
import * as Linking from 'expo-linking';
import * as Updates from 'expo-updates';
import { exactAlarmService } from '@/services/exactAlarmService';
import { soundPreviewService } from '@/services/soundPreview';

// REGISTRAR HeadlessJS Task (só executa uma vez)
if (__DEV__) {
  console.log('Registrando HeadlessJS task...');
}
exactAlarmService.registerHeadlessTask();

// Configurar canal de preview de som (Android)
soundPreviewService.setupPreviewChannel();

// Estado global para OAuth processing (fora do componente)
let globalOAuthProcessing = false;

function RootLayoutNav() {
  const { isAuthenticated, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [isOAuthReloading, setIsOAuthReloading] = React.useState(false);
  const [isProcessingOAuth, setIsProcessingOAuth] = React.useState(false);

  // Verificar atualizações OTA ao abrir o app
  useEffect(() => {
    async function checkForUpdates() {
      if (__DEV__) return;

      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch (error) {
        console.log('Erro ao verificar atualizações:', error);
      }
    }

    checkForUpdates();
  }, []);

  // Verificar se está recarregando após OAuth
  useEffect(() => {
    const checkOAuthReload = async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const oauthReload = await AsyncStorage.getItem('oauth_reload_in_progress');
      
      if (oauthReload === 'true') {
        setIsOAuthReloading(true);
        await AsyncStorage.removeItem('oauth_reload_in_progress');
        await new Promise(resolve => setTimeout(resolve, 1500));
        setIsOAuthReloading(false);
      }
    };
    
    checkOAuthReload();
  }, []);

  // Atualizar estado local quando global mudar
  useEffect(() => {
    const checkInterval = setInterval(() => {
      if (globalOAuthProcessing !== isProcessingOAuth) {
        setIsProcessingOAuth(globalOAuthProcessing);
      }
    }, 100);
    
    return () => clearInterval(checkInterval);
  }, [isProcessingOAuth]);

  // LISTENER DE DEEP LINKS - Processa OAuth callback
  useEffect(() => {
    const handleDeepLink = async (url: string) => {
      if (url.includes('auth/callback')) {
        globalOAuthProcessing = true;
        
        try {
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          const processedKey = 'oauth_callback_processed';
          const alreadyProcessed = await AsyncStorage.getItem(processedKey);
          
          if (alreadyProcessed) return;
          
          await AsyncStorage.setItem(processedKey, 'true');
          
          const hashIndex = url.indexOf('#');
          if (hashIndex === -1) return;

          const hashParams = new URLSearchParams(url.substring(hashIndex + 1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');

          if (!accessToken) return;

          const { supabase } = require('@/services/supabase');
          
          supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          }).then((result: any) => {
            // Session set
          }).catch((err: any) => {
            console.error('setSession error:', err);
          });

          await new Promise(resolve => setTimeout(resolve, 3000));
          
          await AsyncStorage.removeItem(processedKey);
          globalOAuthProcessing = false;
          await AsyncStorage.setItem('oauth_reload_in_progress', 'true');
          
          if (__DEV__) {
            const { DevSettings } = require('react-native');
            DevSettings.reload();
          } else {
            await Updates.reloadAsync();
          }
          
        } catch (err) {
          console.error('Error processing OAuth:', err);
          globalOAuthProcessing = false;
        }
      }
    };

    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Controle de autenticação e navegação
  useEffect(() => {
    if (isOAuthReloading || isProcessingOAuth) return;

    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, loading, segments, isOAuthReloading, isProcessingOAuth]);

  if (loading || isOAuthReloading || isProcessingOAuth) {
    const loadingMessage = isProcessingOAuth 
      ? 'Autenticando...' 
      : isOAuthReloading 
      ? 'Carregando sua conta...' 
      : 'Carregando...';
    
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>{loadingMessage}</Text>
      </View>
    );
  }

  return (
    <>
      {isAuthenticated && <NotificationHandler />}
      <Slot />
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <RootLayoutNav />
      </ThemeProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
});