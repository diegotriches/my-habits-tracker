import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useProfileStats } from '@/hooks/useProfileStats';
import ProfileHeader from '@/components/profile/ProfileHeader';
import StatsCard from '@/components/profile/StatsCard';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { profile, loading: profileLoading, refetch: refetchProfile } = useProfile();
  const { stats, loading: statsLoading, refetch: refetchStats } = useProfileStats();

  const loading = profileLoading || statsLoading;

  const handleLogout = () => {
    Alert.alert(
      'Sair',
      'Tem certeza que deseja sair da sua conta?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/login' as any);
          },
        },
      ]
    );
  };

  const handleRefresh = async () => {
    await Promise.all([refetchProfile(), refetchStats()]);
  };

  const getLevelTitle = (level: number) => {
    if (level >= 10) return 'Divino';
    if (level >= 9) return 'Titã';
    if (level >= 8) return 'Imortal';
    if (level >= 7) return 'Lenda';
    if (level >= 6) return 'Mestre';
    if (level >= 5) return 'Persistente';
    if (level >= 4) return 'Dedicado';
    if (level >= 3) return 'Aprendiz';
    if (level >= 2) return 'Iniciante';
    return 'Novato';
  };

  if (loading && !profile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Erro ao carregar perfil</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={handleRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Perfil</Text>
      </View>

      {/* Profile Header com Avatar e Nível */}
      <ProfileHeader profile={profile} levelTitle={getLevelTitle(profile.level)} />

      {/* Estatísticas Rápidas */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Estatísticas</Text>
        <StatsCard
          stats={[
            {
              icon: '📅',
              value: stats.daysActive,
              label: 'Dias Ativos',
            },
            {
              icon: '✅',
              value: stats.totalCompletions,
              label: 'Completados',
            },
            {
              icon: '🔥',
              value: stats.bestStreak,
              label: 'Melhor Streak',
            },
          ]}
        />
      </View>

      {/* Informações da Conta */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Conta</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{user?.email}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Total de Hábitos</Text>
            <Text style={styles.infoValue}>{stats.totalHabits}</Text>
          </View>
        </View>
      </View>

      {/* Configurações */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Configurações</Text>
        
        <TouchableOpacity style={styles.settingItem} disabled>
          <View style={styles.settingLeft}>
            <Text style={styles.settingIcon}>🎨</Text>
            <Text style={styles.settingText}>Tema</Text>
          </View>
          <Text style={styles.settingValue}>Claro</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem} disabled>
          <View style={styles.settingLeft}>
            <Text style={styles.settingIcon}>🔔</Text>
            <Text style={styles.settingText}>Notificações</Text>
          </View>
          <Text style={styles.settingValue}>Em breve</Text>
        </TouchableOpacity>

        <View style={styles.comingSoonNote}>
          <Text style={styles.comingSoonText}>
            💡 Tema escuro e notificações em desenvolvimento
          </Text>
        </View>
      </View>

      {/* Ações */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Sair da Conta</Text>
        </TouchableOpacity>
      </View>

      {/* Versão */}
      <View style={styles.footer}>
        <Text style={styles.versionText}>My Habits Tracker v1.0.0</Text>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  errorText: {
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  section: {
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#f9fafb',
  },
  infoCard: {
    backgroundColor: '#fff',
    paddingVertical: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingIcon: {
    fontSize: 20,
  },
  settingText: {
    fontSize: 16,
    color: '#1f2937',
  },
  settingValue: {
    fontSize: 14,
    color: '#9ca3af',
  },
  comingSoonNote: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  comingSoonText: {
    fontSize: 12,
    color: '#92400e',
    lineHeight: 18,
  },
  logoutButton: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  logoutButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  versionText: {
    fontSize: 12,
    color: '#9ca3af',
  },
});