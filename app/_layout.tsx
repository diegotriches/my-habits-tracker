// app/_layout.tsx
import { NotificationHandler } from '@/components/notifications/NotificationHandler';
import { useAuth } from '@/hooks/useAuth';
import { Slot, useRouter, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { ThemeProvider } from '../contexts/ThemeContext';

function RootLayoutNav() {
  const { isAuthenticated, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

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