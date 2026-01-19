// components/habits/CompletionHistory.tsx
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

interface Completion {
  id: string;
  completed_at: string;
  points_earned: number;
}

interface Props {
  completions: Completion[];
  color: string;
}

export const CompletionHistory: React.FC<Props> = ({ completions, color }) => {
  const { colors } = useTheme();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hoje';
    }

    if (date.toDateString() === yesterday.toDateString()) {
      return 'Ontem';
    }

    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    
    return `${date.getDate()} de ${months[date.getMonth()]}`;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const renderItem = ({ item }: { item: Completion }) => (
    <View style={styles.item}>
      <View style={[styles.indicator, { backgroundColor: color }]} />
      <View style={[styles.content, { borderBottomColor: colors.border }]}>
        <View style={styles.row}>
          <Text style={[styles.date, { color: colors.textPrimary }]}>
            {formatDate(item.completed_at)}
          </Text>
          <Text style={[styles.time, { color: colors.textTertiary }]}>
            {formatTime(item.completed_at)}
          </Text>
        </View>
        <View style={[styles.pointsBadge, { backgroundColor: colors.successLight }]}>
          <Text style={[styles.pointsText, { color: colors.success }]}>
            +{item.points_earned} pts
          </Text>
        </View>
      </View>
    </View>
  );

  if (completions.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Histórico</Text>
        <View style={styles.emptyState}>
          <Icon name="file" size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Nenhuma conclusão ainda
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
            Complete este hábito para ver seu histórico
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Histórico</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Últimas {Math.min(completions.length, 30)} conclusões
        </Text>
      </View>

      <FlatList
        data={completions.slice(0, 30)}
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
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  list: {
    gap: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  row: {
    flex: 1,
  },
  date: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  time: {
    fontSize: 13,
  },
  pointsBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pointsText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
});