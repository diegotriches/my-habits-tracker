// app/_layout.tsx
import { NotificationHandler } from '@/components/notifications/NotificationHandler';
import { useAuth } from '@/hooks/useAuth';
import { Slot, useRouter, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { ThemeProvider } from '../contexts/ThemeContext';
import { supabase } from '@/services/supabase';
import * as Linking from 'expo-linking';
import { notifeeEventHandlers } from '@/services/notifeeEventHandlers';
 import { exactAlarmService } from '@/services/exactAlarmService';

// ✅ FUNÇÃO PARA PROCESSAR OAUTH CALLBACK
const processOAuthCallback = async (url: string) => {
  try {
    console.log('🔐 ============ PROCESSANDO OAUTH ============');
    console.log('📍 URL Completa:', url);

    // Verificar se é callback do OAuth
    if (!url.includes('auth/callback')) {
      console.log('ℹ️ Não é callback OAuth, ignorando');
      return;
    }

    console.log('✅ É callback OAuth, processando...');

    // Extrair tokens do hash fragment
    const hashIndex = url.indexOf('#');
    if (hashIndex === -1) {
      console.error('❌ Hash não encontrado na URL');
      return;
    }

    const hashParams = new URLSearchParams(url.substring(hashIndex + 1));
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');

    console.log('📊 Tokens extraídos:');
    console.log('  - Access Token:', accessToken ? '✅ Presente' : '❌ Ausente');
    console.log('  - Refresh Token:', refreshToken ? '✅ Presente' : '❌ Ausente');

    if (!accessToken) {
      console.error('❌ Access token não encontrado');
      return;
    }

    console.log('🔑 Criando sessão no Supabase...');

    // Criar sessão
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken || '',
    });

    if (error) {
      console.error('❌ Erro ao criar sessão:', error);
      throw error;
    }

    console.log('✅ Sessão criada com sucesso!');
    console.log('👤 Usuário:', data.user?.email);
    console.log('🆔 User ID:', data.user?.id);

    // Garantir que perfil existe
    if (data.user) {
      console.log('🔍 Verificando perfil...');

      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', data.user.id)
        .maybeSingle();

      if (!existingProfile) {
        console.log('📝 Criando perfil...');

        const displayName = data.user.email?.split('@')[0] || 'Usuário';

        await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            display_name: displayName,
            level: 1,
            total_points: 0,
          } as any);

        console.log('✅ Perfil criado');
      } else {
        console.log('✅ Perfil já existe');
      }
    }

    console.log('✅ ============ LOGIN COMPLETO ============');

    // Forçar navegação imediata
    const { useRouter } = require('expo-router');
    const router = useRouter();
    router.replace('/(tabs)');

  } catch (error) {
    console.error('❌ Erro ao processar OAuth:', error);
  }
};

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

function RootLayoutNav() {
  const { isAuthenticated, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // ✅ LISTENER DE DEEP LINKS COM PROCESSAMENTO OAUTH
  useEffect(() => {
    console.log('🔗 Configurando listener de deep links...');

    // Processar URL inicial (se app foi aberto via deep link)
    Linking.getInitialURL().then(url => {
      console.log('📍 URL Inicial:', url);
      if (url) {
        processOAuthCallback(url);
      }
    });

    // Listener para novas URLs
    const subscription = Linking.addEventListener('url', ({ url }) => {
      console.log('📍 ✨ NOVA URL RECEBIDA:', url);
      console.log('📍 ✨ Timestamp:', new Date().toISOString());
      processOAuthCallback(url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

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
      {/* 🔔 Handler de Notificações - Gerencia TUDO (inicialização + listeners) */}
      {isAuthenticated && <NotificationHandler />}

      {/* Conteúdo principal */}
      <Slot />
    </>
  );
}

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