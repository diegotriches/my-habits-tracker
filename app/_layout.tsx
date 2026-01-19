// app/_layout.tsx
import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { notificationService } from '@/services/notifications';
import { ThemeProvider } from './contexts/ThemeContext';

function RootLayoutNav() {
  const { isAuthenticated, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Configurar listeners de notificações
  useEffect(() => {
    // Handler de navegação quando clicar na notificação
    const handleNavigationToHabit = (habitId: string) => {
      // Navegar para a tela de detalhes do hábito
      router.push(`/habits/${habitId}` as any);
    };

    // Configurar handlers de notificações (deep link + ações)
    notificationService.setupNotificationHandlers(handleNavigationToHabit);

    // Opcional: Solicitar permissões ao iniciar (se ainda não tiver)
    (async () => {
      const hasPermission = await notificationService.hasPermission();
      if (!hasPermission) {
        // Você pode pedir permissão aqui ou deixar para quando criar o primeiro hábito
        // await notificationService.requestPermissions();
      }
    })();

    // Cleanup não necessário - listeners são globais
  }, []);

  // Controle de autenticação e navegação
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

  return <Slot />;
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