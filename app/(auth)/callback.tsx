// app/auth/callback.tsx (VERSÃO MELHORADA)
import { supabase } from '@/services/supabase';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, Alert } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * Tela de callback do OAuth (Google Sign In)
 * Processa os tokens retornados e redireciona para o app
 */
export default function AuthCallbackScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Autenticando...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    handleOAuthCallback();
  }, []);

  const handleOAuthCallback = async () => {
    try {
      console.log('🔐 ============ OAUTH CALLBACK ============');
      console.log('📍 URL Params recebidos:', JSON.stringify(params, null, 2));

      setMessage('Processando autenticação...');

      // Extrair tokens de diferentes formatos possíveis
      let accessToken: string | null = null;
      let refreshToken: string | null = null;

      // Formato 1: Query params diretos (params.access_token)
      if (params.access_token) {
        console.log('✅ Tokens encontrados nos query params');
        accessToken = params.access_token as string;
        refreshToken = (params.refresh_token as string) || '';
      }
      
      // Formato 2: Hash fragment (window.location.hash)
      if (!accessToken && typeof window !== 'undefined' && window.location?.hash) {
        console.log('🔍 Tentando extrair do hash...');
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        accessToken = hashParams.get('access_token');
        refreshToken = hashParams.get('refresh_token') || '';
        
        if (accessToken) {
          console.log('✅ Tokens encontrados no hash');
        }
      }

      // Formato 3: URL completa como string
      if (!accessToken && params.url) {
        console.log('🔍 Tentando extrair da URL completa...');
        const url = params.url as string;
        const hashIndex = url.indexOf('#');
        
        if (hashIndex !== -1) {
          const hashParams = new URLSearchParams(url.substring(hashIndex + 1));
          accessToken = hashParams.get('access_token');
          refreshToken = hashParams.get('refresh_token') || '';
          
          if (accessToken) {
            console.log('✅ Tokens encontrados na URL completa');
          }
        }
      }

      console.log('📊 Resultado da extração:');
      console.log('  - Access Token:', accessToken ? '✅ Presente' : '❌ Ausente');
      console.log('  - Refresh Token:', refreshToken ? '✅ Presente' : '❌ Ausente');

      if (!accessToken) {
        throw new Error('❌ Tokens de autenticação não encontrados na URL de callback');
      }

      setMessage('Criando sessão...');
      await processTokens(accessToken, refreshToken || '');
      
    } catch (err) {
      console.error('❌ Erro no callback OAuth:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao autenticar';
      setError(errorMessage);
      setStatus('error');
      setMessage('Erro na autenticação');
      
      // Mostrar alert com o erro
      Alert.alert(
        'Erro no Login',
        errorMessage,
        [
          {
            text: 'Voltar ao Login',
            onPress: () => router.replace('/(auth)/login'),
          },
        ]
      );
    }
  };

  const processTokens = async (accessToken: string, refreshToken: string) => {
    try {
      console.log('🔑 ============ PROCESSANDO TOKENS ============');
      console.log('📝 Criando sessão no Supabase...');

      // Definir sessão no Supabase
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        console.error('❌ Erro ao criar sessão:', error);
        throw error;
      }

      console.log('✅ Sessão criada com sucesso!');
      console.log('👤 Usuário:', data.user?.email);
      console.log('📧 Email verificado:', data.user?.email_confirmed_at ? 'Sim' : 'Não');
      console.log('🆔 User ID:', data.user?.id);

      // Garantir que perfil existe
      if (data.user) {
        setMessage('Verificando perfil...');
        await ensureProfileExists(data.user.id, data.user.email || '');
      }

      console.log('✅ ============ LOGIN COMPLETO ============');
      setStatus('success');
      setMessage('Login realizado com sucesso!');

      // Pequeno delay para mostrar a mensagem de sucesso
      setTimeout(() => {
        console.log('🏠 Redirecionando para home...');
        router.replace('/(tabs)');
      }, 1000);

    } catch (err) {
      console.error('❌ Erro ao processar tokens:', err);
      throw err;
    }
  };

  const ensureProfileExists = async (userId: string, email: string) => {
    try {
      console.log('🔍 Verificando se perfil existe...');

      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('❌ Erro ao buscar perfil:', fetchError);
        throw fetchError;
      }

      if (existingProfile) {
        console.log('✅ Perfil já existe');
        return;
      }

      console.log('📝 Perfil não existe, criando...');

      const displayName = email.split('@')[0] || 'Usuário';
      
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          display_name: displayName,
          level: 1,
          total_points: 0,
        } as any);

      if (insertError) {
        // Pode ser erro de conflito se o trigger já criou
        if (insertError.code === '23505') {
          console.log('ℹ️ Perfil já foi criado (conflito)');
          return;
        }
        console.error('❌ Erro ao criar perfil:', insertError);
        throw insertError;
      }

      console.log('✅ Perfil criado com sucesso');
    } catch (error) {
      console.error('❌ Erro em ensureProfileExists:', error);
      // Não lançar erro - apenas logar
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {status === 'loading' && (
          <>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.title, { color: colors.textPrimary, marginTop: 24 }]}>
              {message}
            </Text>
            <Text style={[styles.message, { color: colors.textSecondary }]}>
              Aguarde enquanto processamos seu login
            </Text>
          </>
        )}

        {status === 'success' && (
          <>
            <Text style={[styles.emoji, { marginBottom: 16 }]}>✅</Text>
            <Text style={[styles.title, { color: colors.success }]}>
              Login realizado!
            </Text>
            <Text style={[styles.message, { color: colors.textSecondary }]}>
              Redirecionando para o app...
            </Text>
          </>
        )}

        {status === 'error' && (
          <>
            <Text style={[styles.emoji, { marginBottom: 16 }]}>❌</Text>
            <Text style={[styles.title, { color: colors.danger }]}>
              Erro na autenticação
            </Text>
            <Text style={[styles.message, { color: colors.textSecondary }]}>
              {error}
            </Text>
            <Text style={[styles.redirect, { color: colors.textTertiary }]}>
              Toque em "Voltar ao Login" no alerta
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emoji: {
    fontSize: 64,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  redirect: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
  },
});