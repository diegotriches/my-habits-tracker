import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useProfile } from '../../hooks/useProfile';
import { calculateLevel } from '../../utils/points';
import { useTheme } from '@/app/contexts/ThemeContext';
import { Icon } from '@/components/ui/Icon';

export const LevelProgressCard: React.FC = () => {
  const { colors } = useTheme();
  const { profile } = useProfile();

  if (!profile) return null;

  const currentLevel = calculateLevel(profile.total_points);
  const nextLevel = currentLevel + 1;
  
  // Pontos necessários para o próximo nível
  const pointsForNextLevel = Math.pow(nextLevel, 2) * 100;
  const pointsForCurrentLevel = Math.pow(currentLevel, 2) * 100;
  const pointsInCurrentLevel = profile.total_points - pointsForCurrentLevel;
  const pointsNeededForLevel = pointsForNextLevel - pointsForCurrentLevel;
  
  const progress = (pointsInCurrentLevel / pointsNeededForLevel) * 100;
  const progressClamped = Math.min(Math.max(progress, 0), 100);

  // Título e ícone baseado no nível
  const getLevelInfo = (level: number) => {
    if (level < 5) return { title: 'Iniciante', icon: 'rocket' as const };
    if (level < 10) return { title: 'Aprendiz', icon: 'zap' as const };
    if (level < 20) return { title: 'Dedicado', icon: 'target' as const };
    if (level < 30) return { title: 'Expert', icon: 'trophy' as const };
    if (level < 50) return { title: 'Mestre', icon: 'crown' as const };
    return { title: 'Lenda', icon: 'sparkles' as const };
  };

  const levelInfo = getLevelInfo(currentLevel);

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Nível Atual</Text>
        <View style={styles.badgeContainer}>
          <Icon name={levelInfo.icon} size={16} color={colors.secondary} />
          <Text style={[styles.badge, { color: colors.secondary }]}>
            {levelInfo.title}
          </Text>
        </View>
      </View>

      <View style={styles.levelContainer}>
        <Text style={[styles.level, { color: colors.secondary }]}>{currentLevel}</Text>
        <View style={styles.divider}>
          <Icon name="chevronRight" size={24} color={colors.border} />
        </View>
        <Text style={[styles.nextLevel, { color: colors.textTertiary }]}>{nextLevel}</Text>
      </View>

      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBarBackground, { backgroundColor: colors.surfaceElevated }]}>
          <View 
            style={[
              styles.progressBarFill,
              { 
                width: `${progressClamped}%`,
                backgroundColor: colors.secondary 
              }
            ]} 
          />
        </View>
      </View>

      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {profile.total_points.toLocaleString()}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Pontos Totais
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {(pointsForNextLevel - profile.total_points).toLocaleString()}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Para Próximo Nível
          </Text>
        </View>
      </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badge: {
    fontSize: 16,
    fontWeight: '600',
  },
  levelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  level: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  divider: {
    marginHorizontal: 20,
    alignItems: 'center',
  },
  nextLevel: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  progressBarContainer: {
    marginBottom: 20,
  },
  progressBarBackground: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
});