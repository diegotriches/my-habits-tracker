import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Habit, Streak } from '@/types/database';
import { DIFFICULTY_CONFIG } from '@/constants/GameConfig';

interface HabitCardProps {
  habit: Habit;
  onPress?: () => void;
  onComplete?: () => void;
  isCompleted?: boolean;
  streak?: Streak;
}

export default function HabitCard({
  habit,
  onPress,
  onComplete,
  isCompleted = false,
  streak,
}: HabitCardProps) {
  const difficultyConfig = DIFFICULTY_CONFIG[habit.difficulty];
  const hasStreak = (streak?.current_streak || 0) > 0;

  return (
    <TouchableOpacity
      style={[styles.card, isCompleted && styles.cardCompleted]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        {/* Indicador de cor */}
        <View style={[styles.colorIndicator, { backgroundColor: habit.color }]} />

        {/* Informações do hábito */}
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{habit.name}</Text>
            {hasStreak && (
              <View style={styles.streakBadge}>
                <Text style={styles.streakIcon}>🔥</Text>
                <Text style={styles.streakText}>{streak?.current_streak}</Text>
              </View>
            )}
          </View>
          
          {habit.description && (
            <Text style={styles.description} numberOfLines={2}>
              {habit.description}
            </Text>
          )}

          <View style={styles.footer}>
            <View style={[styles.badge, { backgroundColor: difficultyConfig.color + '20' }]}>
              <Text style={[styles.badgeText, { color: difficultyConfig.color }]}>
                {difficultyConfig.label}
              </Text>
            </View>

            <Text style={styles.points}>+{habit.points_base} pts</Text>
          </View>
        </View>

        {/* Botão de completar */}
        <TouchableOpacity
          style={[styles.checkButton, isCompleted && styles.checkButtonCompleted]}
          onPress={(e) => {
            e.stopPropagation();
            onComplete?.();
          }}
        >
          {isCompleted ? (
            <Text style={styles.checkIcon}>✓</Text>
          ) : (
            <View style={styles.checkCircle} />
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardCompleted: {
    opacity: 0.7,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  colorIndicator: {
    width: 4,
    height: '100%',
    borderRadius: 2,
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
  },
  streakIcon: {
    fontSize: 12,
  },
  streakText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f59e0b',
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  points: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
  },
  checkButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  checkButtonCompleted: {
    backgroundColor: '#10b981',
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d1d5db',
  },
  checkIcon: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
});