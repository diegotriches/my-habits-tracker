import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export default function RootLayout() {
  const { isAuthenticated, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

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

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});