import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GeneralStats } from '../../hooks/useStats';

interface Props {
  stats: GeneralStats | null;
}

export const SummaryCards: React.FC<Props> = ({ stats }) => {
  const { colors } = useTheme();

  if (!stats) return null;

  const formatDate = (dateString: string) => {
    if (dateString === 'Nenhum') return dateString;
    const date = new Date(dateString);
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
        Resumo Geral
      </Text>
      
      <View style={styles.grid}>
        {/* Card 1 - Hábitos Ativos */}
        <View style={[styles.card, { 
          backgroundColor: colors.surface,
          borderLeftColor: colors.secondary 
        }]}>
          <Icon name="target" size={24} color={colors.secondary} />
          <Text style={[styles.cardValue, { color: colors.textPrimary }]}>
            {stats.active_habits}
          </Text>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
            Hábitos Ativos
          </Text>
          <Text style={[styles.cardSubtext, { color: colors.textTertiary }]}>
            de {stats.total_habits} total
          </Text>
        </View>

        {/* Card 2 - Taxa de Conclusão */}
        <View style={[styles.card, { 
          backgroundColor: colors.surface,
          borderLeftColor: colors.success 
        }]}>
          <Icon name="trendingUp" size={24} color={colors.success} />
          <Text style={[styles.cardValue, { color: colors.textPrimary }]}>
            {stats.completion_rate}%
          </Text>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
            Taxa de Sucesso
          </Text>
          <Text style={[styles.cardSubtext, { color: colors.textTertiary }]}>
            últimos 30 dias
          </Text>
        </View>

        {/* Card 3 - Total de Completions */}
        <View style={[styles.card, { 
          backgroundColor: colors.surface,
          borderLeftColor: colors.primary 
        }]}>
          <Icon name="checkCircle" size={24} color={colors.primary} />
          <Text style={[styles.cardValue, { color: colors.textPrimary }]}>
            {stats.total_completions}
          </Text>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
            Completions
          </Text>
          <Text style={[styles.cardSubtext, { color: colors.textTertiary }]}>
            no total
          </Text>
        </View>

        {/* Card 4 - Melhor Dia */}
        <View style={[styles.card, { 
          backgroundColor: colors.surface,
          borderLeftColor: colors.warning 
        }]}>
          <Icon name="star" size={24} color={colors.warning} />
          <Text style={[styles.cardValue, { color: colors.textPrimary }]}>
            {stats.best_day_count}
          </Text>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
            Melhor Dia
          </Text>
          <Text style={[styles.cardSubtext, { color: colors.textTertiary }]}>
            {formatDate(stats.best_day)}
          </Text>
        </View>
      </View>

      {/* Card Grande - Hábito Mais Consistente */}
      <View style={[styles.largeCard, { 
        backgroundColor: colors.surface,
        borderLeftColor: colors.warning 
      }]}>
        <View style={styles.largeCardHeader}>
          <Icon name="trophy" size={32} color={colors.warning} />
          <View style={styles.largeCardInfo}>
            <Text style={[styles.largeCardLabel, { color: colors.textSecondary }]}>
              Hábito Mais Consistente
            </Text>
            <Text style={[styles.largeCardValue, { color: colors.textPrimary }]} numberOfLines={1}>
              {stats.most_consistent_habit}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  card: {
    width: '48%',
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 4,
  },
  cardValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  cardSubtext: {
    fontSize: 11,
  },
  largeCard: {
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 4,
  },
  largeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  largeCardInfo: {
    flex: 1,
  },
  largeCardLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  largeCardValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});