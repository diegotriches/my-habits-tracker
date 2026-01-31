// app/(tabs)/stats.tsx
import { StatsSkeleton } from '@/components/skeletons/StatsSkeleton';
import { ComparisonCard } from '@/components/stats/ComparisonCard';
import { CompletionChart } from '@/components/stats/CompletionChart';
import { InsightsCard } from '@/components/stats/InsightsCard';
import { LevelProgressCard } from '@/components/stats/LevelProgressCard';
import { RecordsCard } from '@/components/stats/RecordsCard';
import { StreaksList } from '@/components/stats/StreaksList';
import { SummaryCards } from '@/components/stats/SummaryCards';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { useAdvancedStats } from '@/hooks/useAdvancedStats';
import { useStats } from '@/hooks/useStats';
import { usePenalties } from '@/hooks/usePenalties';
import { hapticFeedback } from '@/utils/haptics';
import { router } from 'expo-router';
import React from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
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
    refresh 
  } = useStats();

  // Hook de penalidades
  const { stats: penaltyStats } = usePenalties();

  // Hook de estatísticas avançadas
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
    await refresh();
    setRefreshing(false);
    hapticFeedback.success();
  };

  // Loading inicial com skeleton
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

  // Empty state - usuário sem hábitos ainda
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
          subtitle="Comece criando hábitos e completando-os para ver suas estatísticas incríveis!"
          buttonText="Criar Primeiro Hábito"
          onButtonPress={() => {
            hapticFeedback.light();
            router.push('/habits/create' as any);
          }}
        />
      </View>
    );
  }

  // Função para determinar mensagem motivacional
  const getMotivationalMessage = () => {
    if (!generalStats) return '';
    
    const completions = generalStats.total_completions;
    
    if (completions >= 100) {
      return "Você é incrível! Mais de 100 hábitos completados!";
    } else if (completions >= 50) {
      return "Meio caminho para 100! Continue assim!";
    } else if (completions >= 10) {
      return "Ótimo começo! Você está no caminho certo!";
    } else {
      return "Cada passo conta! Continue firme!";
    }
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

      {/* Card de Nível */}
      <LevelProgressCard />

      {/* 🆕 BOTÃO DE PENALIDADES */}
      {penaltyStats.totalPenalties > 0 && (
        <TouchableOpacity
          style={[styles.penaltiesButton, { 
            backgroundColor: colors.surface,
            borderColor: colors.danger + '40',
          }]}
          onPress={() => {
            hapticFeedback.light();
            router.push('/stats/penalties' as any);
          }}
          activeOpacity={0.7}
        >
          <View style={styles.penaltiesLeft}>
            <View style={[styles.penaltyIconCircle, { backgroundColor: colors.dangerLight }]}>
              <Icon name="alertTriangle" size={24} color={colors.danger} />
            </View>
            <View style={styles.penaltiesInfo}>
              <Text style={[styles.penaltiesTitle, { color: colors.textPrimary }]}>
                Penalidades
              </Text>
              <Text style={[styles.penaltiesSubtitle, { color: colors.textSecondary }]}>
                {penaltyStats.totalPenalties} {penaltyStats.totalPenalties === 1 ? 'penalidade' : 'penalidades'} • {penaltyStats.totalPointsLost} pontos perdidos
              </Text>
            </View>
          </View>
          <Icon name="chevronRight" size={20} color={colors.textTertiary} />
        </TouchableOpacity>
      )}

      {/* 🎯 NOVO: Insights Personalizados */}
      {insights.length > 0 && <InsightsCard insights={insights} />}

      {/* 🎯 NOVO: Comparação de Períodos */}
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

      {/* 🎯 NOVO: Recordes Pessoais */}
      {records.length > 0 && <RecordsCard records={records} />}

      {/* Lista de Melhores Streaks */}
      <StreaksList streaks={topStreaks} />

      {/* Card Motivacional */}
      {generalStats && generalStats.total_completions > 0 && (
        <View style={[styles.motivationalCard, { 
          backgroundColor: colors.surface,
          borderColor: colors.primary,
        }]}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
            <Icon name={getMotivationalIcon()} size={32} color={colors.primary} />
          </View>
          <Text style={[styles.motivationalText, { color: colors.textPrimary }]}>
            {getMotivationalMessage()}
          </Text>
        </View>
      )}

      {/* Espaçamento final */}
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
  },
  // 🆕 Estilos do botão de penalidades
  penaltiesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  penaltiesLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  penaltyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  penaltiesInfo: {
    flex: 1,
  },
  penaltiesTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  penaltiesSubtitle: {
    fontSize: 13,
  },
  motivationalCard: {
    borderRadius: 16,
    padding: 24,
    marginTop: 16,
    alignItems: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  motivationalText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
  },
  bottomSpacer: {
    height: 20,
  },
});