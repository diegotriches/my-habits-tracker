// app/(tabs)/profile.tsx
import ProfileHeader from '@/components/profile/ProfileHeader';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ErrorState } from '@/components/ui/ErrorState';
import { Icon } from '@/components/ui/Icon';
import { IconName } from '@/constants/Icons';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { ProfileSkeleton } from '@/components/skeletons/ProfileSkeleton';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

type ThemeMode = 'light' | 'dark' | 'system';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { profile, loading: profileLoading, refetch: refetchProfile } = useProfile();
  const { colors, themeMode, setThemeMode } = useTheme();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showAppearanceModal, setShowAppearanceModal] = useState(false);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    await signOut();
    setShowLogoutConfirm(false);
    router.replace('/(auth)/login' as any);
  };

  const handleRefresh = async () => {
    await refetchProfile();
  };

  const handleThemeChange = (mode: ThemeMode) => {
    setThemeMode(mode);
  };

  const getThemeLabel = (): string => {
    switch (themeMode) {
      case 'light': return 'Claro';
      case 'dark': return 'Escuro';
      case 'system': return 'Automático';
    }
  };

  const getThemeIcon = (): IconName => {
    switch (themeMode) {
      case 'light': return 'sun';
      case 'dark': return 'moon';
      case 'system': return 'palette';
    }
  };

  if (profileLoading && !profile) {
    return <ProfileSkeleton />;
  }

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

  const themeOptions: Array<{ mode: ThemeMode; icon: IconName; label: string; description: string }> = [
    { mode: 'light', icon: 'sun', label: 'Claro', description: 'Tema claro padrão' },
    { mode: 'dark', icon: 'moon', label: 'Escuro', description: 'Ideal para ambientes escuros' },
    { mode: 'system', icon: 'palette', label: 'Automático', description: 'Segue as configurações do sistema' },
  ];

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        refreshControl={
          <RefreshControl
            refreshing={profileLoading}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Perfil</Text>
        </View>

        {/* Profile Header com Avatar */}
        <ProfileHeader profile={profile} />

        {/* Informações da Conta */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Conta
          </Text>
          <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
              <View style={styles.infoLeft}>
                <Icon name="mail" size={16} color={colors.textSecondary} />
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Email</Text>
              </View>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]} numberOfLines={1}>
                {user?.email}
              </Text>
            </View>
          </View>
        </View>

        {/* Configurações */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Configurações
          </Text>

          {/* Aparência */}
          <TouchableOpacity
            style={[styles.settingItem, { backgroundColor: colors.surface }]}
            onPress={() => setShowAppearanceModal(true)}
          >
            <View style={styles.settingLeft}>
              <Icon name={getThemeIcon()} size={20} color={colors.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingText, { color: colors.textPrimary }]}>Aparência</Text>
                <Text style={[styles.settingSubtext, { color: colors.textTertiary }]}>{getThemeLabel()}</Text>
              </View>
            </View>
            <Icon name="chevronRight" size={20} color={colors.textTertiary} />
          </TouchableOpacity>

          {/* Notificações */}
          <TouchableOpacity
            style={[styles.settingItem, { backgroundColor: colors.surface }]}
            onPress={() => router.push('/settings/notifications' as any)}
          >
            <View style={styles.settingLeft}>
              <Icon name="bell" size={20} color={colors.textSecondary} />
              <Text style={[styles.settingText, { color: colors.textPrimary }]}>Notificações</Text>
            </View>
            <Icon name="chevronRight" size={20} color={colors.textTertiary} />
          </TouchableOpacity>

          {/* Dados e Privacidade */}
          <TouchableOpacity
            style={[styles.settingItem, { backgroundColor: colors.surface }]}
            onPress={() => router.push('/settings/privacy' as any)}
          >
            <View style={styles.settingLeft}>
              <Icon name="shield" size={20} color={colors.textSecondary} />
              <Text style={[styles.settingText, { color: colors.textPrimary }]}>Dados e Privacidade</Text>
            </View>
            <Icon name="chevronRight" size={20} color={colors.textTertiary} />
          </TouchableOpacity>

          {/* Testes Avançados (apenas em DEV) */}
          {__DEV__ && (
            <TouchableOpacity
              style={[
                styles.settingItem,
                {
                  backgroundColor: colors.surface,
                  borderWidth: 2,
                  borderColor: colors.info + '40',
                },
              ]}
              onPress={() => router.push('/debug/notifications' as any)}
            >
              <View style={styles.settingLeft}>
                <Icon name="code" size={20} color={colors.info} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingText, { color: colors.info, fontWeight: '600' }]}>
                    Testes de Notificação
                  </Text>
                  <Text style={[styles.settingSubtext, { color: colors.info }]}>
                    Modo Desenvolvedor
                  </Text>
                </View>
              </View>
              <Icon name="chevronRight" size={20} color={colors.info} />
            </TouchableOpacity>
          )}
        </View>

        {/* Ações */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.logoutButton, { backgroundColor: colors.surface, borderColor: colors.danger }]}
            onPress={handleLogout}
          >
            <Icon name="logout" size={20} color={colors.danger} />
            <Text style={[styles.logoutButtonText, { color: colors.danger }]}>Sair da Conta</Text>
          </TouchableOpacity>
        </View>

        {/* Versão */}
        <View style={styles.footer}>
          <Text style={[styles.versionText, { color: colors.textTertiary }]}>
            My Habits Tracker v1.2.0
          </Text>
          {__DEV__ && (
            <View style={[styles.devModeBadge, { backgroundColor: colors.infoLight }]}>
              <Text style={[styles.devModeText, { color: colors.info }]}>
                Modo Desenvolvedor Ativo
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal Aparência */}
      <Modal
        visible={showAppearanceModal}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowAppearanceModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowAppearanceModal(false)}>
          <Pressable
            style={[styles.modalContent, { backgroundColor: colors.background }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHandle}>
              <View style={[styles.modalHandleBar, { backgroundColor: colors.border }]} />
            </View>

            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Aparência</Text>
              <TouchableOpacity
                onPress={() => setShowAppearanceModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {themeOptions.map((option) => {
                const isActive = themeMode === option.mode;
                return (
                  <TouchableOpacity
                    key={option.mode}
                    style={[
                      styles.themeOption,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                      isActive && { borderColor: colors.primary, backgroundColor: colors.primaryLight },
                    ]}
                    onPress={() => handleThemeChange(option.mode)}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.themeIconCircle,
                      { backgroundColor: isActive ? colors.primary + '20' : colors.borderLight },
                    ]}>
                      <Icon
                        name={option.icon}
                        size={22}
                        color={isActive ? colors.primary : colors.textSecondary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[
                        styles.themeLabel,
                        { color: isActive ? colors.primary : colors.textPrimary },
                      ]}>
                        {option.label}
                      </Text>
                      <Text style={[styles.themeDescription, { color: colors.textTertiary }]}>
                        {option.description}
                      </Text>
                    </View>
                    {isActive && (
                      <Icon name="check" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.modalConfirmButton, { backgroundColor: colors.primary }]}
                onPress={() => setShowAppearanceModal(false)}
              >
                <Text style={styles.modalConfirmText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

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
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 28, fontWeight: 'bold' },
  section: { marginTop: 16 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  infoCard: {
    borderRadius: 12,
    marginHorizontal: 20,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  infoLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: '600', maxWidth: '60%' },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 10,
  },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  settingText: { fontSize: 15 },
  settingSubtext: { fontSize: 12, marginTop: 2 },
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
  logoutButtonText: { fontSize: 16, fontWeight: '600' },
  footer: { alignItems: 'center', paddingVertical: 20 },
  versionText: { fontSize: 12, marginBottom: 4 },
  devModeBadge: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  devModeText: { fontSize: 11, fontWeight: '600' },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalHandle: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  modalHandleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalBody: {
    padding: 20,
    gap: 10,
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 14,
  },
  themeIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  themeDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'android' ? 48 : 16,
    borderTopWidth: 1,
  },
  modalConfirmButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});