// app/(tabs)/stats.tsx
import { StatsSkeleton } from '@/components/skeletons/StatsSkeleton';
import { ComparisonCard } from '@/components/stats/ComparisonCard';
import { CompletionChart } from '@/components/stats/CompletionChart';
import { InsightsCard } from '@/components/stats/InsightsCard';
import { RecordsCard } from '@/components/stats/RecordsCard';
import { StreaksList } from '@/components/stats/StreaksList';
import { SummaryCards } from '@/components/stats/SummaryCards';
import StatsCard from '@/components/profile/StatsCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { useAdvancedStats } from '@/hooks/useAdvancedStats';
import { useStats } from '@/hooks/useStats';
import { useProfileStats } from '@/hooks/useProfileStats';
import { hapticFeedback } from '@/utils/haptics';
import { router } from 'expo-router';
import React from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';

export default function StatsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    dailyStats,
    weekdayStats,
    topStreaks,
    generalStats,
    loading,
    refresh,
  } = useStats();

  const {
    stats: profileStats,
    loading: profileStatsLoading,
    refetch: refetchProfileStats,
  } = useProfileStats();

  const {
    insights,
    weekComparison,
    monthComparison,
    records,
    loading: advancedLoading,
  } = useAdvancedStats(dailyStats, generalStats);

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    hapticFeedback.light();
    setRefreshing(true);
    await Promise.all([refresh(), refetchProfileStats()]);
    setRefreshing(false);
    hapticFeedback.success();
  };

  if (loading && !refreshing && !generalStats) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Estatísticas</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Acompanhe seu progresso
          </Text>
        </View>
        <StatsSkeleton />
      </View>
    );
  }

  if (!loading && generalStats && generalStats.total_habits === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Estatísticas</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Acompanhe seu progresso
          </Text>
        </View>
        <EmptyState
          icon="trendingUp"
          title="Sem estatísticas ainda"
          subtitle="Comece criando hábitos e completando-os para ver suas estatísticas!"
          buttonText="Criar Primeiro Hábito"
          onButtonPress={() => {
            hapticFeedback.light();
            router.push('/habits/create' as any);
          }}
        />
      </View>
    );
  }

  const getMotivationalMessage = () => {
    if (!generalStats) return '';
    const completions = generalStats.total_completions;
    if (completions >= 100) return "Você é incrível! Mais de 100 hábitos completados!";
    if (completions >= 50) return "Meio caminho para 100! Continue assim!";
    if (completions >= 10) return "Ótimo começo! Você está no caminho certo!";
    return "Cada passo conta! Continue firme!";
  };

  const getMotivationalIcon = () => {
    if (!generalStats) return 'sparkles';
    const completions = generalStats.total_completions;
    if (completions >= 100) return 'trophy';
    if (completions >= 50) return 'rocket';
    if (completions >= 10) return 'target';
    return 'star';
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 20 }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
          progressViewOffset={insets.top}
        />
      }
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Estatísticas</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Acompanhe seu progresso
        </Text>
      </View>

      {/* Estatísticas Rápidas (movidas do Perfil) */}
      <View style={styles.quickStatsContainer}>
        <StatsCard
          stats={[
            {
              iconName: 'calendar',
              iconColor: colors.primary,
              value: profileStats.daysActive,
              label: 'Dias Ativos',
            },
            {
              iconName: 'checkCircle',
              iconColor: colors.success,
              value: profileStats.totalCompletions,
              label: 'Completados',
            },
            {
              iconName: 'flame',
              iconColor: colors.streak,
              value: profileStats.bestStreak,
              label: 'Melhor Streak',
            },
          ]}
        />
      </View>

      {/* Insights Personalizados */}
      {insights.length > 0 && <InsightsCard insights={insights} />}

      {/* Comparação de Períodos */}
      {dailyStats.length > 7 && (
        <ComparisonCard
          weekComparison={weekComparison}
          monthComparison={monthComparison}
        />
      )}

      {/* Gráfico de Progresso */}
      <CompletionChart dailyStats={dailyStats} weekdayStats={weekdayStats} />

      {/* Cards de Resumo */}
      <SummaryCards stats={generalStats} />

      {/* Recordes Pessoais */}
      {records.length > 0 && <RecordsCard records={records} />}

      {/* Lista de Melhores Streaks */}
      <StreaksList streaks={topStreaks} />

      {/* Card Motivacional */}
      {generalStats && generalStats.total_completions > 0 && (
        <View style={[styles.motivationalCard, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
            <Icon name={getMotivationalIcon()} size={32} color={colors.primary} />
          </View>
          <Text style={[styles.motivationalText, { color: colors.textPrimary }]}>
            {getMotivationalMessage()}
          </Text>
        </View>
      )}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  header: { marginBottom: 24 },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { fontSize: 16 },
  quickStatsContainer: {
    marginBottom: 16,
  },
  motivationalCard: {
    borderRadius: 16, padding: 24, marginTop: 16, alignItems: 'center', borderWidth: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3,
  },
  iconCircle: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  motivationalText: { fontSize: 16, textAlign: 'center', lineHeight: 24, fontWeight: '500' },
  bottomSpacer: { height: 20 },
});