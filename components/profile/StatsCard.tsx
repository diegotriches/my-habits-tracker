import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StatItem {
  label: string;
  value: string | number;
  icon?: string;
}

interface StatsCardProps {
  stats: StatItem[];
}

export default function StatsCard({ stats }: StatsCardProps) {
  return (
    <View style={styles.container}>
      {stats.map((stat, index) => (
        <View
          key={index}
          style={[
            styles.statItem,
            index < stats.length - 1 && styles.statItemBorder,
          ]}
        >
          {stat.icon && <Text style={styles.icon}>{stat.icon}</Text>}
          <Text style={styles.value}>{stat.value}</Text>
          <Text style={styles.label}>{stat.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
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
    borderRightColor: '#e5e7eb',
  },
  icon: {
    fontSize: 24,
    marginBottom: 8,
  },
  value: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
});