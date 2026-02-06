// app/_layout.tsx
import { NotificationHandler } from '@/components/notifications/NotificationHandler';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Slot, useRouter, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View, Text } from 'react-native';
import { ThemeProvider } from '../contexts/ThemeContext';
import * as Linking from 'expo-linking';
import { notifeeEventHandlers } from '@/services/notifeeEventHandlers';
import { exactAlarmService } from '@/services/exactAlarmService';

// REGISTRAR HeadlessJS Task (só executa uma vez)
if (__DEV__) {
  console.log('📝 Registrando HeadlessJS task...');
}
exactAlarmService.registerHeadlessTask();

// CONFIGURAR Event Handlers do Notifee (só executa uma vez)
if (__DEV__) {
  console.log('🔔 Configurando event handlers do Notifee...');
}
notifeeEventHandlers.setupEventHandlers();

// ✅ Estado global para OAuth processing (fora do componente)
let globalOAuthProcessing = false;

function RootLayoutNav() {
  const { isAuthenticated, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [isOAuthReloading, setIsOAuthReloading] = React.useState(false);
  const [isProcessingOAuth, setIsProcessingOAuth] = React.useState(false);

  // ✅ Verificar se está recarregando após OAuth
  useEffect(() => {
    const checkOAuthReload = async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const oauthReload = await AsyncStorage.getItem('oauth_reload_in_progress');
      
      if (oauthReload === 'true') {
        console.log('⚠️ App recarregou após OAuth - mostrando loading...');
        setIsOAuthReloading(true);
        
        await AsyncStorage.removeItem('oauth_reload_in_progress');
        
        // Aguardar sessão carregar completamente
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        setIsOAuthReloading(false);
        console.log('✅ OAuth reload completo');
      }
    };
    
    checkOAuthReload();
  }, []);

  // ✅ Atualizar estado local quando global mudar
  useEffect(() => {
    const checkInterval = setInterval(() => {
      if (globalOAuthProcessing !== isProcessingOAuth) {
        console.log('🔄 Atualizando estado OAuth:', globalOAuthProcessing);
        setIsProcessingOAuth(globalOAuthProcessing);
      }
    }, 100);
    
    return () => clearInterval(checkInterval);
  }, [isProcessingOAuth]);

  // ✅ LISTENER DE DEEP LINKS - Processa OAuth callback
  useEffect(() => {
    console.log('🔗 Configurando listener de deep links...');

    const handleDeepLink = async (url: string) => {
      console.log('📍 Deep link recebido:', url);
      
      if (url.includes('auth/callback')) {
        console.log('🔐 ============ PROCESSANDO OAUTH CALLBACK ============');
        
        // ✅ Marcar que estamos processando OAuth (estado global)
        globalOAuthProcessing = true;
        console.log('⚠️ OAuth processamento iniciado - mostrando loading...');
        
        try {
          // ✅ Salvar flag para detectar se já processamos
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          const processedKey = 'oauth_callback_processed';
          const alreadyProcessed = await AsyncStorage.getItem(processedKey);
          
          if (alreadyProcessed) {
            console.log('⏭️ Callback já processado anteriormente, ignorando...');
            return;
          }
          
          console.log('✅ Primeira vez processando este callback');
          await AsyncStorage.setItem(processedKey, 'true');
          
          const hashIndex = url.indexOf('#');
          if (hashIndex === -1) {
            console.error('❌ Hash não encontrado na URL');
            return;
          }

          const hashParams = new URLSearchParams(url.substring(hashIndex + 1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');

          console.log('🔑 Tokens:', {
            hasAccessToken: !!accessToken,
            hasRefreshToken: !!refreshToken,
          });

          if (!accessToken) {
            console.error('❌ No access token');
            return;
          }

          console.log('💾 Creating session...');
          const { supabase } = require('@/services/supabase');
          
          console.log('📞 Calling setSession (não aguardar)...');
          
          // ✅ NÃO AGUARDAR - apenas chamar
          supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          }).then((result: any) => {
            console.log('📊 setSession completed:', {
              hasData: !!result.data,
              hasError: !!result.error,
            });
          }).catch((err: any) => {
            console.error('❌ setSession error:', err);
          });

          console.log('✅ setSession called (processing in background)');
          console.log('⏳ Aguardando 3 segundos para sessão ser salva...');
          
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          console.log('✅ ============ TEMPO EXPIRADO - RECARREGANDO ============');
          console.log('🔄 Recarregando app AGORA...');
          
          // Limpar flags antes do reload
          await AsyncStorage.removeItem(processedKey);
          await AsyncStorage.removeItem('oauth_processing');
          
          // ✅ Marcar que estamos recarregando após OAuth
          await AsyncStorage.setItem('oauth_reload_in_progress', 'true');
          
          const { DevSettings } = require('react-native');
          DevSettings.reload();
          
        } catch (err) {
          console.error('❌ Error processing OAuth:', err);
          console.error('❌ Error details:', JSON.stringify(err, null, 2));
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
  }, []); // ✅ SEM dependências - não recria

  // 🔧 Controle de autenticação e navegação
  useEffect(() => {
    // ✅ Se estiver processando ou recarregando OAuth, não fazer nada
    if (isOAuthReloading || isProcessingOAuth) {
      console.log('⏳ Aguardando OAuth completar...');
      return;
    }
    
    console.log('🔄 Navigation Check:', {
      isAuthenticated,
      loading,
      segments: segments.join('/'),
    });

    if (loading) {
      console.log('⏳ Still loading...');
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      console.log('➡️ Redirecting to login');
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      console.log('➡️ Redirecting to tabs');
      router.replace('/(tabs)');
    } else {
      console.log('✅ Already in correct place');
    }
  }, [isAuthenticated, loading, segments, isOAuthReloading, isProcessingOAuth]);

  // ✅ Mostrar loading durante OAuth reload ou processamento
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

// ✅ AuthProvider FORA do Expo Router - nunca será remontado
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