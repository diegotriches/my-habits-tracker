import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import { Profile } from '@/types/database';
import { calculateLevelProgress, calculatePointsToNextLevel } from '@/utils/points';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface ProfileHeaderProps {
  profile: Profile;
  levelTitle?: string;
}

export default function ProfileHeader({ profile, levelTitle }: ProfileHeaderProps) {
  const { colors } = useTheme();
  const progress = calculateLevelProgress(profile.total_points, profile.level);
  const { pointsNeeded, nextLevelPoints } = calculatePointsToNextLevel(
    profile.total_points,
    profile.level
  );

  const getLevelIcon = (level: number): { name: any; color: string } => {
    if (level >= 10) return { name: 'sparkles', color: colors.warning };
    if (level >= 8) return { name: 'crown', color: '#A855F7' };
    if (level >= 7) return { name: 'star', color: colors.warning };
    if (level >= 6) return { name: 'crown', color: colors.warning };
    if (level >= 5) return { name: 'trophy', color: colors.warning };
    if (level >= 4) return { name: 'zap', color: colors.success };
    if (level >= 3) return { name: 'target', color: colors.success };
    if (level >= 2) return { name: 'trendingUp', color: colors.primary };
    return { name: 'rocket', color: colors.primary };
  };

  const levelIcon = getLevelIcon(profile.level);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>
            {profile.display_name?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>
        <View style={[styles.levelBadge, { 
          backgroundColor: colors.success,
          borderColor: colors.surface 
        }]}>
          <Text style={styles.levelBadgeText}>{profile.level}</Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.textPrimary }]}>
          {profile.display_name || 'Usuário'}
        </Text>
        <View style={styles.levelInfo}>
          <Icon name={levelIcon.name} size={16} color={levelIcon.color} />
          <Text style={[styles.levelTitle, { color: colors.textSecondary }]}>
            {levelTitle || `Nível ${profile.level}`}
          </Text>
        </View>
        <Text style={[styles.points, { color: colors.primary }]}>
          {profile.total_points} pontos
        </Text>
      </View>

      {/* Progresso para próximo nível */}
      {profile.level < 10 && (
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressLabel, { color: colors.textPrimary }]}>
              Próximo nível
            </Text>
            <Text style={[styles.progressPoints, { color: colors.primary }]}>
              {pointsNeeded} pts restantes
            </Text>
          </View>
          <View style={[styles.progressBarContainer, { backgroundColor: colors.surfaceElevated }]}>
            <View style={[styles.progressBarFill, { 
              width: `${progress}%`,
              backgroundColor: colors.primary 
            }]} />
          </View>
          <Text style={[styles.progressSubtext, { color: colors.textTertiary }]}>
            {profile.total_points} / {nextLevelPoints} pontos
          </Text>
        </View>
      )}

      {profile.level >= 10 && (
        <View style={[styles.maxLevelBadge, { backgroundColor: colors.warningLight }]}>
          <Icon name="sparkles" size={16} color={colors.warning} />
          <Text style={[styles.maxLevelText, { color: colors.warning }]}>
            Nível Máximo Alcançado!
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  levelBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
  },
  levelBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  info: {
    alignItems: 'center',
    marginBottom: 20,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  levelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  levelTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  points: {
    fontSize: 14,
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
  },
  progressPoints: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressBarContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressSubtext: {
    fontSize: 12,
    textAlign: 'center',
  },
  maxLevelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  maxLevelText: {
    fontSize: 14,
    fontWeight: '600',
  },
});