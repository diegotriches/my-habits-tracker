import { Icon } from '@/components/ui/Icon';
import { IconName } from '@/constants/Icons';
import { useTheme } from '@/contexts/ThemeContext';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface StatItem {
  label: string;
  value: string | number;
  icon?: string; // Emoji (legacy support)
  iconName?: IconName; // Lucide icon (novo)
  iconColor?: string;
}

interface StatsCardProps {
  stats: StatItem[];
}

export default function StatsCard({ stats }: StatsCardProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {stats.map((stat, index) => (
        <View
          key={index}
          style={[
            styles.statItem,
            index < stats.length - 1 && [styles.statItemBorder, { borderRightColor: colors.border }],
          ]}
        >
          {/* Ícone: Prioriza Lucide, fallback para emoji */}
          {stat.iconName ? (
            <View style={styles.iconContainer}>
              <Icon 
                name={stat.iconName} 
                size={24} 
                color={stat.iconColor || colors.primary} 
              />
            </View>
          ) : stat.icon ? (
            <Text style={styles.iconEmoji}>{stat.icon}</Text>
          ) : null}

          <Text style={[styles.value, { color: colors.textPrimary }]}>
            {stat.value}
          </Text>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            {stat.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statItemBorder: {
    borderRightWidth: 1,
  },
  iconContainer: {
    marginBottom: 8,
  },
  iconEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  value: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    textAlign: 'center',
  },
});