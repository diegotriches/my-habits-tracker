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
import { useTheme } from '../../contexts/ThemeContext';

export default function StatsScreen() {
  const { colors } = useTheme();
  const { 
    dailyStats, 
    weekdayStats, 
    topStreaks, 
    generalStats, 
    loading, 
    refresh 
  } = useStats();

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
    return <StatsSkeleton />;
  }

  // Empty state - usuário sem hábitos ainda
  if (!loading && generalStats && generalStats.total_habits === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
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
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
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