// app/settings/privacy.tsx
import { DeleteAccountButton } from '@/components/account/DeleteAccountButton';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/hooks/useAuth';
import { router } from 'expo-router';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';

export default function PrivacySettingsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { 
        backgroundColor: colors.background, 
        borderBottomColor: colors.border,
        paddingTop: insets.top + 16,
      }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Icon name="chevronLeft" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Dados e Privacidade
        </Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Informações sobre dados */}
        <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
          <View style={styles.infoHeader}>
            <Icon name="shield" size={20} color={colors.primary} />
            <Text style={[styles.infoTitle, { color: colors.textPrimary }]}>
              Seus Dados
            </Text>
          </View>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Seus dados são armazenados de forma segura e utilizados exclusivamente para o funcionamento do aplicativo. Não compartilhamos suas informações com terceiros.
          </Text>

          <View style={[styles.dataItem, { borderTopColor: colors.border }]}>
            <View style={styles.dataLeft}>
              <Icon name="mail" size={16} color={colors.textSecondary} />
              <Text style={[styles.dataLabel, { color: colors.textSecondary }]}>Email</Text>
            </View>
            <Text style={[styles.dataValue, { color: colors.textPrimary }]} numberOfLines={1}>
              {user?.email}
            </Text>
          </View>

          <View style={[styles.dataItem, { borderTopColor: colors.border }]}>
            <View style={styles.dataLeft}>
              <Icon name="activity" size={16} color={colors.textSecondary} />
              <Text style={[styles.dataLabel, { color: colors.textSecondary }]}>Dados coletados</Text>
            </View>
            <Text style={[styles.dataValue, { color: colors.textPrimary }]}>
              Hábitos, completions, streaks
            </Text>
          </View>

          <View style={[styles.dataItem, { borderTopColor: colors.border }]}>
            <View style={styles.dataLeft}>
              <Icon name="lock" size={16} color={colors.textSecondary} />
              <Text style={[styles.dataLabel, { color: colors.textSecondary }]}>Criptografia</Text>
            </View>
            <Text style={[styles.dataValue, { color: colors.success }]}>
              Ativa (TLS/SSL)
            </Text>
          </View>
        </View>

        {/* Seus direitos */}
        <View style={[styles.rightsCard, { backgroundColor: colors.surface }]}>
          <View style={styles.infoHeader}>
            <Icon name="info" size={20} color={colors.primary} />
            <Text style={[styles.infoTitle, { color: colors.textPrimary }]}>
              Seus Direitos (LGPD)
            </Text>
          </View>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            De acordo com a Lei Geral de Proteção de Dados, você tem direito a:
          </Text>

          <View style={styles.rightsList}>
            <View style={styles.rightItem}>
              <Icon name="check" size={14} color={colors.success} />
              <Text style={[styles.rightText, { color: colors.textSecondary }]}>
                Acessar seus dados pessoais
              </Text>
            </View>
            <View style={styles.rightItem}>
              <Icon name="check" size={14} color={colors.success} />
              <Text style={[styles.rightText, { color: colors.textSecondary }]}>
                Corrigir dados incompletos ou incorretos
              </Text>
            </View>
            <View style={styles.rightItem}>
              <Icon name="check" size={14} color={colors.success} />
              <Text style={[styles.rightText, { color: colors.textSecondary }]}>
                Solicitar a exclusão de seus dados
              </Text>
            </View>
            <View style={styles.rightItem}>
              <Icon name="check" size={14} color={colors.success} />
              <Text style={[styles.rightText, { color: colors.textSecondary }]}>
                Revogar consentimento a qualquer momento
              </Text>
            </View>
          </View>
        </View>

        {/* Zona de Perigo */}
        <View style={[styles.dangerZone, { backgroundColor: colors.surface, borderColor: '#fee2e2' }]}>
          <View style={styles.dangerZoneHeader}>
            <Icon name="alertTriangle" size={18} color="#ef4444" />
            <Text style={styles.dangerZoneTitle}>Zona de Perigo</Text>
          </View>
          <Text style={[styles.dangerZoneDescription, { color: colors.textSecondary }]}>
            A exclusão da conta é permanente e não pode ser desfeita. Todos os seus dados serão apagados, incluindo hábitos, completions, streaks e pontos.
          </Text>
          <DeleteAccountButton />
        </View>

        <View style={{ height: Math.max(40, insets.bottom) }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerButton: {
    padding: 8,
    minWidth: 40,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginHorizontal: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  infoCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  dataItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  dataLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dataLabel: {
    fontSize: 14,
  },
  dataValue: {
    fontSize: 14,
    fontWeight: '600',
    maxWidth: '50%',
    textAlign: 'right',
  },
  rightsCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  rightsList: {
    gap: 10,
  },
  rightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rightText: {
    fontSize: 14,
    flex: 1,
  },
  dangerZone: {
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  dangerZoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  dangerZoneTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
  dangerZoneDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
});