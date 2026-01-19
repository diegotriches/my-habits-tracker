// app/(tabs)/profile.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useProfileStats } from '@/hooks/useProfileStats';
import { usePenalties } from '@/hooks/usePenalties';
import { useTheme } from '../contexts/ThemeContext';
import { Icon } from '@/components/ui/Icon';
import ProfileHeader from '@/components/profile/ProfileHeader';
import StatsCard from '@/components/profile/StatsCard';
import { PenaltyHistory } from '@/components/penalties/PenaltyHistory';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ErrorState } from '@/components/ui/ErrorState';
import { ProfileSkeleton } from '@/components/skeletons/ProfileSkeleton';

type ThemeMode = 'light' | 'dark' | 'system';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { profile, loading: profileLoading, refetch: refetchProfile } = useProfile();
  const { stats, loading: statsLoading, refetch: refetchStats } = useProfileStats();
  const { penaltyHistory, stats: penaltyStats } = usePenalties();
  const { colors, themeMode, setThemeMode } = useTheme();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const loading = profileLoading || statsLoading;

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    await signOut();
    setShowLogoutConfirm(false);
    router.replace('/(auth)/login' as any);
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

  const handleThemeChange = (mode: ThemeMode) => {
    setThemeMode(mode);
  };

  // Loading inicial com skeleton
  if (loading && !profile) {
    return <ProfileSkeleton />;
  }

  // Erro ao carregar perfil
  if (!profile) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ErrorState
          title="Não foi possível carregar o perfil"
          message="Verifique sua conexão e tente novamente."
          onRetry={refetchProfile}
        />
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        refreshControl={
          <RefreshControl 
            refreshing={loading} 
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Perfil</Text>
        </View>

        {/* Profile Header com Avatar e Nível */}
        <ProfileHeader profile={profile} levelTitle={getLevelTitle(profile.level)} />

        {/* Estatísticas Rápidas */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, backgroundColor: colors.surface }]}>
            Estatísticas
          </Text>
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

        {/* Seção de Penalidades */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, backgroundColor: colors.surface }]}>
            Penalidades
          </Text>

          {/* Card de Estatísticas de Penalidades */}
          <View style={[styles.penaltyStatsCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={styles.penaltyStatItem}>
              <Text style={[styles.penaltyStatValue, { color: colors.textPrimary }]}>
                {penaltyStats.totalPenalties}
              </Text>
              <Text style={[styles.penaltyStatLabel, { color: colors.textSecondary }]}>Total</Text>
            </View>
            <View style={[styles.penaltyDivider, { backgroundColor: colors.divider }]} />
            <View style={styles.penaltyStatItem}>
              <Text style={[styles.penaltyStatValue, { color: colors.danger }]}>
                {penaltyStats.totalPointsLost}
              </Text>
              <Text style={[styles.penaltyStatLabel, { color: colors.textSecondary }]}>
                Pontos Perdidos
              </Text>
            </View>
          </View>

          {/* Histórico */}
          <View style={styles.historyContainer}>
            <PenaltyHistory penalties={penaltyHistory} />
          </View>
        </View>

        {/* Informações da Conta */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, backgroundColor: colors.surface }]}>
            Conta
          </Text>
          <View style={[styles.infoCard, { backgroundColor: colors.background }]}>
            <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Email</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]} numberOfLines={1}>
                {user?.email}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Total de Hábitos</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{stats.totalHabits}</Text>
            </View>
          </View>
        </View>

        {/* Configurações */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, backgroundColor: colors.surface }]}>
            Configurações
          </Text>

          {/* Tema Section */}
          <View style={[styles.settingGroup, { backgroundColor: colors.background }]}>
            <View style={[styles.settingHeader, { borderBottomColor: colors.border }]}>
              <Icon name="palette" size={20} color={colors.textSecondary} />
              <Text style={[styles.settingHeaderText, { color: colors.textPrimary }]}>
                Aparência
              </Text>
            </View>

            {/* Light Mode */}
            <TouchableOpacity
              onPress={() => handleThemeChange('light')}
              style={[styles.themeOption, { borderBottomColor: colors.border }]}
            >
              <View style={styles.themeLeft}>
                <Icon name="sun" size={20} color={colors.textSecondary} />
                <Text style={[styles.themeText, { color: colors.textPrimary }]}>Claro</Text>
              </View>
              {themeMode === 'light' && (
                <Icon name="check" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>

            {/* Dark Mode */}
            <TouchableOpacity
              onPress={() => handleThemeChange('dark')}
              style={[styles.themeOption, { borderBottomColor: colors.border }]}
            >
              <View style={styles.themeLeft}>
                <Icon name="moon" size={20} color={colors.textSecondary} />
                <Text style={[styles.themeText, { color: colors.textPrimary }]}>Escuro</Text>
              </View>
              {themeMode === 'dark' && (
                <Icon name="check" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>

            {/* System Mode */}
            <TouchableOpacity
              onPress={() => handleThemeChange('system')}
              style={styles.themeOption}
            >
              <View style={styles.themeLeft}>
                <Icon name="palette" size={20} color={colors.textSecondary} />
                <Text style={[styles.themeText, { color: colors.textPrimary }]}>Automático</Text>
              </View>
              {themeMode === 'system' && (
                <Icon name="check" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
          </View>

          {/* Notificações */}
          <TouchableOpacity
            style={[styles.settingItem, { backgroundColor: colors.background, borderBottomColor: colors.border }]}
            onPress={() => router.push('/settings/notifications' as any)}
          >
            <View style={styles.settingLeft}>
              <Icon name="bell" size={20} color={colors.textSecondary} />
              <Text style={[styles.settingText, { color: colors.textPrimary }]}>Notificações</Text>
            </View>
            <Icon name="chevronRight" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Ações */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={[styles.logoutButton, { backgroundColor: colors.background, borderColor: colors.danger }]} 
            onPress={handleLogout}
          >
            <Icon name="logout" size={20} color={colors.danger} />
            <Text style={[styles.logoutButtonText, { color: colors.danger }]}>Sair da Conta</Text>
          </TouchableOpacity>
        </View>

        {/* Versão */}
        <View style={styles.footer}>
          <Text style={[styles.versionText, { color: colors.textTertiary }]}>
            My Habits Tracker v1.1.0
          </Text>
          <Text style={[styles.copyrightText, { color: colors.textDisabled }]}>
            Feito com ❤️ para seu crescimento
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Confirmação de Logout */}
      <ConfirmDialog
        visible={showLogoutConfirm}
        title="Sair da Conta"
        message="Tem certeza que deseja sair? Você precisará fazer login novamente."
        confirmText="Sair"
        cancelText="Cancelar"
        confirmColor="danger"
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  section: {
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  penaltyStatsCard: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 12,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  penaltyStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  penaltyStatValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  penaltyStatLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  penaltyDivider: {
    width: 1,
    marginHorizontal: 20,
  },
  historyContainer: {
    marginHorizontal: 20,
  },
  infoCard: {
    paddingVertical: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    maxWidth: '60%',
  },
  settingGroup: {
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 12,
    overflow: 'hidden',
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  settingHeaderText: {
    fontSize: 14,
    fontWeight: '600',
  },
  themeOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  themeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  themeText: {
    fontSize: 15,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingText: {
    fontSize: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  versionText: {
    fontSize: 12,
    marginBottom: 4,
  },
  copyrightText: {
    fontSize: 11,
  },
});