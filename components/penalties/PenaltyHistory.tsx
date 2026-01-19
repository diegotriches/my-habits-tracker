import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { PENALTY_MESSAGES } from '@/constants/PenaltyConfig';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTheme } from '@/app/contexts/ThemeContext';
import { Icon } from '@/components/ui/Icon';

interface Penalty {
  id: string;
  points_lost: number;
  reason: string;
  penalty_date: string;
  created_at: string;
  habits: {
    name: string;
    color: string;
  };
}

interface Props {
  penalties: Penalty[];
}

export const PenaltyHistory: React.FC<Props> = ({ penalties }) => {
  const { colors } = useTheme();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "d 'de' MMMM", { locale: ptBR });
  };

  const renderItem = ({ item }: { item: Penalty }) => (
    <View 
      style={[
        styles.item, 
        { borderBottomColor: colors.border }
      ]}
    >
      <View style={[styles.indicator, { backgroundColor: item.habits.color }]} />
      <View style={styles.content}>
        <View style={styles.row}>
          <Text style={[styles.habitName, { color: colors.textPrimary }]} numberOfLines={1}>
            {item.habits.name}
          </Text>
          <Text style={[styles.date, { color: colors.textTertiary }]}>
            {formatDate(item.penalty_date)}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.reason, { color: colors.textSecondary }]}>
            {PENALTY_MESSAGES[item.reason as keyof typeof PENALTY_MESSAGES]}
          </Text>
          <Text style={[styles.points, { color: colors.danger }]}>
            -{item.points_lost} pts
          </Text>
        </View>
      </View>
    </View>
  );

  if (penalties.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.surface }]}>
        <View style={[styles.emptyIconContainer, { backgroundColor: colors.surfaceElevated }]}>
          <Icon name="trophy" size={48} color={colors.success} />
        </View>
        <Text style={[styles.emptyText, { color: colors.textPrimary }]}>
          Nenhuma penalidade!
        </Text>
        <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
          Continue assim, você está indo muito bem!
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <FlatList
        data={penalties}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        contentContainerStyle={styles.list}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
  },
  list: {
    gap: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  indicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  habitName: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  date: {
    fontSize: 12,
  },
  reason: {
    fontSize: 13,
    flex: 1,
  },
  points: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    borderRadius: 12,
    padding: 20,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
});