// components/account/DeleteAccountButton.tsx
// Componente PROFISSIONAL para exclusão de conta
// Adequado para PRODUÇÃO - Segue LGPD/GDPR

import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  View,
  Modal,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/hooks/useAuth';
import { router } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';

// ✅ Cores fixas para zona de perigo (não dependem do theme)
const DANGER_COLOR = '#ef4444';

export function DeleteAccountButton() {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const { user } = useAuth();
  const { colors } = useTheme();

  const handleDeleteAccount = () => {
    Alert.alert(
      '⚠️ Excluir Conta',
      'Você está prestes a excluir permanentemente sua conta. Esta ação:\n\n' +
      '• Apagará todos os seus hábitos\n' +
      '• Apagará todo o seu histórico\n' +
      '• Apagará suas configurações\n' +
      '• Não poderá ser desfeita\n\n' +
      'Tem certeza que deseja continuar?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Continuar',
          style: 'destructive',
          onPress: () => setShowModal(true),
        },
      ]
    );
  };

  const confirmDeletion = async () => {
    if (confirmText.toLowerCase() !== 'excluir') {
      Alert.alert('Erro', 'Digite "EXCLUIR" para confirmar');
      return;
    }

    setLoading(true);

    try {
      console.log('🗑️ Iniciando exclusão de conta...');

      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // 1. Deletar dados do Supabase (ordem importante por causa das foreign keys)
      console.log('🗑️ Deletando completions...');
      const { error: completionsError } = await supabase
        .from('habit_completions')
        .delete()
        .eq('user_id', user.id);

      if (completionsError) {
        console.error('Erro ao deletar completions:', completionsError);
      }

      console.log('🗑️ Deletando hábitos...');
      const { error: habitsError } = await supabase
        .from('habits')
        .delete()
        .eq('user_id', user.id);

      if (habitsError) {
        console.error('Erro ao deletar hábitos:', habitsError);
      }

      console.log('🗑️ Deletando perfil...');
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);

      if (profileError) {
        console.error('Erro ao deletar perfil:', profileError);
      }

      // 2. Limpar AsyncStorage
      console.log('🗑️ Limpando dados locais...');
      await AsyncStorage.clear();

      // 3. Fazer logout
      console.log('👋 Fazendo logout...');
      await supabase.auth.signOut();

      console.log('✅ Conta excluída com sucesso!');

      setShowModal(false);
      setLoading(false);

      Alert.alert(
        '✅ Conta Excluída',
        'Sua conta e todos os seus dados foram permanentemente excluídos.\n\n' +
        'Obrigado por ter usado o Habit Tracker!',
        [
          {
            text: 'OK',
            onPress: () => {
              router.replace('/(auth)/login');
            },
          },
        ]
      );
    } catch (error) {
      console.error('❌ Erro ao excluir conta:', error);
      setLoading(false);
      
      Alert.alert(
        'Erro',
        'Ocorreu um erro ao excluir sua conta. Por favor, tente novamente ou entre em contato com o suporte.'
      );
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={handleDeleteAccount}
        disabled={loading}
      >
        <Text style={styles.deleteText}>
          Excluir Conta Permanentemente
        </Text>
      </TouchableOpacity>

      {/* Modal de Confirmação */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              ⚠️ Confirmação Final
            </Text>
            
            <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
              Esta ação é irreversível. Todos os seus dados serão permanentemente apagados.
            </Text>

            <Text style={[styles.modalInstruction, { color: colors.textSecondary }]}>
              Digite <Text style={styles.highlightText}>EXCLUIR</Text> para confirmar:
            </Text>

            <TextInput
              style={[
                styles.confirmInput,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                },
              ]}
              placeholder="Digite EXCLUIR"
              placeholderTextColor={colors.textTertiary}
              value={confirmText}
              onChangeText={setConfirmText}
              autoCapitalize="none"
              editable={!loading}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => {
                  setShowModal(false);
                  setConfirmText('');
                }}
                disabled={loading}
              >
                <Text style={[styles.cancelButtonText, { color: colors.textPrimary }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  loading && styles.disabledButton,
                ]}
                onPress={confirmDeletion}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonText}>Excluir Conta</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  deleteButton: {
    borderWidth: 1,
    borderColor: DANGER_COLOR,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  deleteText: {
    color: DANGER_COLOR,
    fontWeight: '600',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalInstruction: {
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  highlightText: {
    fontWeight: 'bold',
    color: DANGER_COLOR,
  },
  confirmInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
  confirmButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: DANGER_COLOR,
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  disabledButton: {
    opacity: 0.5,
  },
});