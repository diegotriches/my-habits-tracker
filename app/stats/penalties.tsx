// app/stats/penalties.tsx
import { PenaltyHistory } from '@/components/penalties/PenaltyHistory';
import { Icon } from '@/components/ui/Icon';
import { usePenalties } from '@/hooks/usePenalties';
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
import { useTheme } from '../../contexts/ThemeContext';

export default function PenaltiesScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { penaltyHistory, stats } = usePenalties();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { 
        paddingTop: insets.top + 12,
        backgroundColor: colors.background,
        borderBottomColor: colors.border,
      }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Icon name="chevronLeft" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Penalidades
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Estatísticas de Penalidades */}
        <View style={[styles.statsCard, { 
          backgroundColor: colors.surface,
          borderColor: colors.border,
        }]}>
          <View style={styles.statItem}>
            <View style={[styles.statIconCircle, { backgroundColor: colors.warningLight }]}>
              <Icon name="alert" size={28} color={colors.warning} />
            </View>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {stats.totalPenalties}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {stats.totalPenalties === 1 ? 'Penalidade Total' : 'Penalidades Totais'}
            </Text>
          </View>

          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

          <View style={styles.statItem}>
            <View style={[styles.statIconCircle, { backgroundColor: colors.dangerLight }]}>
              <Icon name="trendingDown" size={28} color={colors.danger} />
            </View>
            <Text style={[styles.statValue, { color: colors.danger }]}>
              -{stats.totalPointsLost}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Pontos Perdidos
            </Text>
          </View>
        </View>

        {/* Informativo */}
        <View style={[styles.infoCard, { 
          backgroundColor: colors.infoLight,
          borderColor: colors.info,
        }]}>
          <Icon name="info" size={20} color={colors.info} />
          <Text style={[styles.infoText, { color: colors.info }]}>
            Penalidades são aplicadas quando você perde sua sequência (streak) de um hábito.
          </Text>
        </View>

        {/* Histórico */}
        <View style={styles.historySection}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Histórico
          </Text>
          
          {penaltyHistory.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
              <Icon name="checkCircle" size={48} color={colors.success} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                Nenhuma penalidade! 🎉
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Continue assim! Mantenha suas streaks ativas.
              </Text>
            </View>
          ) : (
            <PenaltyHistory penalties={penaltyHistory} />
          )}
        </View>

        {/* Dica */}
        <View style={[styles.tipCard, { 
          backgroundColor: colors.surface,
          borderColor: colors.primary,
        }]}>
          <View style={[styles.tipIconCircle, { backgroundColor: colors.primaryLight }]}>
            <Icon name="lightbulb" size={24} color={colors.primary} />
          </View>
          <View style={styles.tipContent}>
            <Text style={[styles.tipTitle, { color: colors.textPrimary }]}>
              Dica
            </Text>
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>
              Ative lembretes para seus hábitos e evite perder suas streaks!
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
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
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  statsCard: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 12,
  },
  statIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 13,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    marginHorizontal: 20,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  historySection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  emptyState: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  tipCard: {
    flexDirection: 'row',
    gap: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
  },
  tipIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipContent: {
    flex: 1,
    gap: 4,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  tipText: {
    fontSize: 13,
    lineHeight: 18,
  },
});