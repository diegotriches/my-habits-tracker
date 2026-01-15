import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Profile } from '@/types/database';
import { calculateLevelProgress, calculatePointsToNextLevel } from '@/utils/points';

interface ProfileHeaderProps {
  profile: Profile;
  levelTitle?: string;
}

export default function ProfileHeader({ profile, levelTitle }: ProfileHeaderProps) {
  const progress = calculateLevelProgress(profile.total_points, profile.level);
  const { pointsNeeded, nextLevelPoints } = calculatePointsToNextLevel(
    profile.total_points,
    profile.level
  );

  const getLevelEmoji = (level: number) => {
    if (level >= 10) return '✨';
    if (level >= 8) return '💎';
    if (level >= 7) return '⭐';
    if (level >= 6) return '👑';
    if (level >= 5) return '🏆';
    if (level >= 4) return '🌳';
    if (level >= 3) return '🍀';
    if (level >= 2) return '🌿';
    return '🌱';
  };

  return (
    <View style={styles.container}>
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profile.display_name?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>
        <View style={styles.levelBadge}>
          <Text style={styles.levelBadgeText}>{profile.level}</Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.name}>{profile.display_name || 'Usuário'}</Text>
        <View style={styles.levelInfo}>
          <Text style={styles.levelEmoji}>{getLevelEmoji(profile.level)}</Text>
          <Text style={styles.levelTitle}>{levelTitle || `Nível ${profile.level}`}</Text>
        </View>
        <Text style={styles.points}>{profile.total_points} pontos</Text>
      </View>

      {/* Progresso para próximo nível */}
      {profile.level < 10 && (
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Próximo nível</Text>
            <Text style={styles.progressPoints}>
              {pointsNeeded} pts restantes
            </Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressSubtext}>
            {profile.total_points} / {nextLevelPoints} pontos
          </Text>
        </View>
      )}

      {profile.level >= 10 && (
        <View style={styles.maxLevelBadge}>
          <Text style={styles.maxLevelText}>✨ Nível Máximo Alcançado!</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 24,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  levelBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#10b981',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  levelBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  info: {
    alignItems: 'center',
    marginBottom: 20,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  levelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  levelEmoji: {
    fontSize: 16,
  },
  levelTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  points: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
  },
  progressSection: {
    width: '100%',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  progressPoints: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 4,
  },
  progressSubtext: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
  maxLevelBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  maxLevelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f59e0b',
  },
});