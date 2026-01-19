// app/(tabs)/stats.tsx
import React from 'react';
import { 
  View, 
  ScrollView, 
  StyleSheet, 
  RefreshControl, 
  Text,
} from 'react-native';
import { router } from 'expo-router';
import { useStats } from '@/hooks/useStats';
import { useTheme } from '../contexts/ThemeContext';
import { Icon } from '@/components/ui/Icon';
import { LevelProgressCard } from '@/components/stats/LevelProgressCard';
import { CompletionChart } from '@/components/stats/CompletionChart';
import { StreaksList } from '@/components/stats/StreaksList';
import { SummaryCards } from '@/components/stats/SummaryCards';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatsSkeleton } from '@/components/skeletons/StatsSkeleton';

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

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
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
          onButtonPress={() => router.push('/habits/create' as any)}
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

      {/* Gráfico de Progresso */}
      <CompletionChart dailyStats={dailyStats} weekdayStats={weekdayStats} />

      {/* Cards de Resumo */}
      <SummaryCards stats={generalStats} />

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