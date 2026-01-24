// components/habits/HabitPreviewCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import { DIFFICULTY_CONFIG } from '@/constants/GameConfig';

interface HabitPreviewCardProps {
  name: string;
  color: string;
  difficulty: 'easy' | 'medium' | 'hard';
  hasTarget: boolean;
  targetValue?: string;
  targetUnit?: string;
  habitType: 'positive' | 'negative';
}

export const HabitPreviewCard: React.FC<HabitPreviewCardProps> = ({
  name,
  color,
  difficulty,
  hasTarget,
  targetValue,
  targetUnit,
  habitType,
}) => {
  const { colors } = useTheme();
  const points = DIFFICULTY_CONFIG[difficulty].points;
  
  const displayName = name.trim() || 'Nome do Hábito';
  const isNegative = habitType === 'negative';

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <Icon 
          name="eye" 
          size={14} 
          color={colors.textTertiary} 
        />
        <Text style={[styles.label, { color: colors.textTertiary }]}>
          Preview
        </Text>
      </View>

      <View style={styles.habitCard}>
        {/* Indicador de Cor */}
        <View style={[styles.colorIndicator, { backgroundColor: color }]} />

        {/* Conteúdo */}
        <View style={styles.content}>
          <View style={styles.row}>
            {isNegative && (
              <Icon name="xCircle" size={16} color={colors.warning} />
            )}
            <Text 
              style={[styles.habitName, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {displayName}
            </Text>
          </View>

          {hasTarget && targetValue && targetUnit && (
            <Text style={[styles.target, { color: colors.textSecondary }]}>
              0 / {targetValue} {targetUnit}
            </Text>
          )}

          <View style={styles.footer}>
            <View style={[styles.badge, { backgroundColor: color + '20' }]}>
              <Text style={[styles.badgeText, { color }]}>
                +{points} pts
              </Text>
            </View>

            {hasTarget && (
              <View style={styles.progressPreview}>
                <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                  <View 
                    style={[
                      styles.progressFill,
                      { backgroundColor: color, width: '0%' }
                    ]} 
                  />
                </View>
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  habitCard: {
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  colorIndicator: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: 12,
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  habitName: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  target: {
    fontSize: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  progressPreview: {
    flex: 1,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
});