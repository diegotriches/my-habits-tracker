import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { HabitStreak } from '../../hooks/useStats';

interface Props {
  streaks: HabitStreak[];
}

export const StreaksList: React.FC<Props> = ({ streaks }) => {
  const { colors } = useTheme();

  if (streaks.length === 0) {
    return (
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Melhores Sequências
          </Text>
          <Icon name="flame" size={20} color={colors.streak} />
        </View>
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Nenhuma sequência ainda
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
            Complete hábitos consecutivos para criar sequências!
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.titleContainer}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Melhores Sequências
        </Text>
        <Icon name="flame" size={20} color={colors.streak} />
      </View>
      
      {streaks.map((streak, index) => (
        <View 
          key={streak.habit_id} 
          style={[styles.streakItem, { borderBottomColor: colors.border }]}
        >
          <View style={[styles.rank, { backgroundColor: colors.surfaceElevated }]}>
            <Text style={[styles.rankText, { color: colors.textSecondary }]}>
              #{index + 1}
            </Text>
          </View>
          
          <View style={styles.streakInfo}>
            <Text style={[styles.habitName, { color: colors.textPrimary }]} numberOfLines={1}>
              {streak.habit_name}
            </Text>
            <Text style={[styles.completions, { color: colors.textTertiary }]}>
              {streak.total_completions} {streak.total_completions === 1 ? 'conclusão' : 'conclusões'}
            </Text>
          </View>
          
          <View style={styles.streakStats}>
            <View style={[styles.streakBadge, { backgroundColor: colors.surfaceElevated }]}>
              <Text style={[styles.streakLabel, { color: colors.textSecondary }]}>
                Atual
              </Text>
              <Text style={[styles.streakValue, { color: colors.textPrimary }]}>
                {streak.current_streak}
              </Text>
            </View>
            <View style={[styles.streakBadge, styles.streakBadgeBest, { 
              backgroundColor: colors.warningLight 
            }]}>
              <Text style={[styles.streakLabel, styles.streakLabelBest, { 
                color: colors.warning 
              }]}>
                Melhor
              </Text>
              <Text style={[styles.streakValue, styles.streakValueBest, { 
                color: colors.warning 
              }]}>
                {streak.best_streak}
              </Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  streakItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  rank: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 14,
    fontWeight: '700',
  },
  streakInfo: {
    flex: 1,
    marginRight: 12,
  },
  habitName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  completions: {
    fontSize: 12,
  },
  streakStats: {
    flexDirection: 'row',
    gap: 8,
  },
  streakBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    minWidth: 50,
  },
  streakBadgeBest: {},
  streakLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginBottom: 2,
  },
  streakLabelBest: {},
  streakValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  streakValueBest: {},
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
});