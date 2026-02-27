// app/settings/edit-profile.tsx
import { Icon } from '@/components/ui/Icon';
import { SuccessToast } from '@/components/ui/SuccessToast';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/services/supabase';
import { hapticFeedback } from '@/utils/haptics';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';

export default function EditProfileScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { profile, refetch: refetchProfile } = useProfile();
  const insets = useSafeAreaInsets();

  // Nome
  const [displayName, setDisplayName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const nameChanged = displayName.trim() !== (profile?.display_name || '');

  // Senha
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Toast
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    if (profile?.display_name) {
      setDisplayName(profile.display_name);
    }
  }, [profile]);

  const handleBack = () => {
    hapticFeedback.light();
    router.back();
  };

  const handleSaveName = async () => {
    if (!user || !nameChanged) return;

    const trimmed = displayName.trim();
    if (trimmed.length < 2) {
      setToastMessage('O nome deve ter pelo menos 2 caracteres');
      setShowToast(true);
      return;
    }

    setSavingName(true);
    try {
      const { error } = await (supabase.from('profiles') as any)
        .update({ display_name: trimmed })
        .eq('id', user.id);

      if (error) throw error;

      hapticFeedback.success();
      await refetchProfile();
      setToastMessage('Nome atualizado com sucesso!');
      setShowToast(true);
    } catch (error) {
      console.error('Erro ao salvar nome:', error);
      hapticFeedback.error();
      setToastMessage('Erro ao atualizar nome');
      setShowToast(true);
    } finally {
      setSavingName(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError('');

    if (newPassword.length < 6) {
      setPasswordError('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('As senhas não coincidem');
      return;
    }

    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      hapticFeedback.success();
      setNewPassword('');
      setConfirmPassword('');
      setToastMessage('Senha alterada com sucesso!');
      setShowToast(true);
    } catch (error: any) {
      console.error('Erro ao alterar senha:', error);
      hapticFeedback.error();
      setPasswordError(error?.message || 'Erro ao alterar senha');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SuccessToast
        visible={showToast}
        message={toastMessage}
        duration={3000}
        onHide={() => setShowToast(false)}
      />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <Icon name="arrowLeft" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Editar Perfil</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Seção: Informações Pessoais */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Informações Pessoais
          </Text>

          {/* Email (somente leitura) */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>E-mail</Text>
            <View style={[styles.readOnlyField, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Icon name="mail" size={18} color={colors.textTertiary} />
              <Text style={[styles.readOnlyText, { color: colors.textTertiary }]}>
                {user?.email}
              </Text>
              <Icon name="lock" size={14} color={colors.textTertiary} />
            </View>
          </View>

          {/* Nome */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Nome</Text>
            <View style={[
              styles.inputWrapper,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}>
              <Icon name="profile" size={18} color={colors.textTertiary} />
              <TextInput
                style={[styles.textInput, { color: colors.textPrimary }]}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Seu nome"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="words"
                maxLength={50}
              />
            </View>
          </View>

          {/* Botão Salvar Nome */}
          <TouchableOpacity
            style={[
              styles.saveButton,
              { backgroundColor: nameChanged ? colors.primary : colors.border },
            ]}
            onPress={handleSaveName}
            disabled={!nameChanged || savingName}
            activeOpacity={0.7}
          >
            {savingName ? (
              <ActivityIndicator size={18} color="#FFFFFF" />
            ) : (
              <Text style={[
                styles.saveButtonText,
                { color: nameChanged ? '#FFFFFF' : colors.textTertiary },
              ]}>
                Salvar Nome
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Seção: Alterar Senha */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Alterar Senha
          </Text>

          {/* Nova Senha */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Nova senha</Text>
            <View style={[
              styles.inputWrapper,
              { backgroundColor: colors.surface, borderColor: passwordError ? colors.danger : colors.border },
            ]}>
              <Icon name="lock" size={18} color={colors.textTertiary} />
              <TextInput
                style={[styles.textInput, { color: colors.textPrimary }]}
                value={newPassword}
                onChangeText={(text) => {
                  setNewPassword(text);
                  setPasswordError('');
                }}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor={colors.textTertiary}
                secureTextEntry={!showNewPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowNewPassword(!showNewPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon
                  name={showNewPassword ? 'eyeOff' : 'eye'}
                  size={18}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirmar Senha */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Confirmar nova senha</Text>
            <View style={[
              styles.inputWrapper,
              { backgroundColor: colors.surface, borderColor: passwordError ? colors.danger : colors.border },
            ]}>
              <Icon name="lock" size={18} color={colors.textTertiary} />
              <TextInput
                style={[styles.textInput, { color: colors.textPrimary }]}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  setPasswordError('');
                }}
                placeholder="Repita a nova senha"
                placeholderTextColor={colors.textTertiary}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon
                  name={showConfirmPassword ? 'eyeOff' : 'eye'}
                  size={18}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Erro */}
          {passwordError ? (
            <View style={styles.errorContainer}>
              <Icon name="alertCircle" size={14} color={colors.danger} />
              <Text style={[styles.errorText, { color: colors.danger }]}>{passwordError}</Text>
            </View>
          ) : null}

          {/* Botão Alterar Senha */}
          <TouchableOpacity
            style={[
              styles.saveButton,
              { backgroundColor: newPassword.length >= 6 ? colors.primary : colors.border },
            ]}
            onPress={handleChangePassword}
            disabled={newPassword.length < 6 || savingPassword}
            activeOpacity={0.7}
          >
            {savingPassword ? (
              <ActivityIndicator size={18} color="#FFFFFF" />
            ) : (
              <Text style={[
                styles.saveButtonText,
                { color: newPassword.length >= 6 ? '#FFFFFF' : colors.textTertiary },
              ]}>
                Alterar Senha
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  headerSpacer: { width: 40 },
  scrollContent: { flex: 1 },
  content: { padding: 20 },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  fieldContainer: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginLeft: 4,
  },
  readOnlyField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    opacity: 0.6,
  },
  readOnlyText: {
    flex: 1,
    fontSize: 15,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: Platform.OS === 'ios' ? 0 : 10,
  },
  saveButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
    marginLeft: 4,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '500',
  },
});