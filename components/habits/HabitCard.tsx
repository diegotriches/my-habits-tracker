// components/habits/HabitCard.tsx
import { Icon } from '@/components/ui/Icon';
import { AnimatedPressableComponent } from '@/components/ui/AnimatedPressable';
import { DIFFICULTY_CONFIG } from '@/constants/GameConfig';
import { useTheme } from '@/contexts/ThemeContext';
import { Completion, Habit, Streak } from '@/types/database';
import { formatSelectedDays } from '@/utils/habitHelpers';
import { hapticFeedback } from '@/utils/haptics';
import React, { useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { HabitProgressInput } from './HabitProgressInput';

interface HabitCardProps {
  habit: Habit;
  onPress?: () => void;
  onComplete?: (achievedValue?: number, mode?: 'add' | 'replace') => void;
  isCompleted?: boolean;
  streak?: Streak;
  completion?: Completion;
}

export default function HabitCard({
  habit,
  onPress,
  onComplete,
  isCompleted = false,
  streak,
  completion,
}: HabitCardProps) {
  const { colors } = useTheme();
  const difficultyConfig = DIFFICULTY_CONFIG[habit.difficulty];
  const hasStreak = (streak?.current_streak || 0) > 0;
  const isNegative = habit.type === 'negative';

  const [showProgressInput, setShowProgressInput] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);
  const checkScale = useRef(new Animated.Value(0)).current;
  const pointsAnim = useRef(new Animated.Value(0)).current;
  const pointsOpacity = useRef(new Animated.Value(0)).current;

  const handleComplete = (e: any) => {
    e.stopPropagation();
    
    if (!onComplete) return;

    hapticFeedback.light();

    if (habit.has_target && habit.target_value && habit.target_unit) {
      setShowProgressInput(true);
      return;
    }

    if (isCompleted) return;

    hapticFeedback.success();

    Animated.sequence([
      Animated.timing(checkScale, {
        toValue: 1.3,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.spring(checkScale, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start();

    setShowAnimation(true);
    Animated.parallel([
      Animated.timing(pointsAnim, {
        toValue: -30,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(pointsOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(pointsOpacity, {
          toValue: 0,
          duration: 400,
          delay: 200,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      setShowAnimation(false);
      pointsAnim.setValue(0);
      pointsOpacity.setValue(0);
    });

    onComplete();
  };

  const handleProgressConfirm = (achievedValue: number, mode: 'add' | 'replace') => {
    setShowProgressInput(false);
    hapticFeedback.success();
    onComplete?.(achievedValue, mode);
  };

  const handleCardPress = () => {
    hapticFeedback.light();
    onPress?.();
  };

  const getProgressPercentage = () => {
    if (!habit.has_target || !completion?.value_achieved || !habit.target_value) {
      return 0;
    }
    return Math.min((completion.value_achieved / habit.target_value) * 100, 100);
  };

  const isFullyCompleted = () => {
    if (!habit.has_target) {
      return isCompleted;
    }
    return getProgressPercentage() >= 100;
  };

  // 🆕 Cor do card baseada no tipo
  const cardColor = isNegative ? colors.warning : habit.color;
  const successColor = isNegative ? colors.warning : colors.success;

  const renderCheckButton = () => {
    if (!habit.has_target) {
      return (
        <Animated.View style={{ transform: [{ scale: isCompleted ? checkScale : 1 }] }}>
          <TouchableOpacity
            style={[
              styles.checkButton,
              { backgroundColor: colors.surface },
              isCompleted && { backgroundColor: successColor },
            ]}
            onPress={handleComplete}
          >
            {isCompleted ? (
              <Icon 
                name={isNegative ? "shield" : "check"} 
                size={24} 
                color={colors.textInverse} 
              />
            ) : (
              <View style={[styles.checkCircle, { borderColor: colors.border }]} />
            )}
          </TouchableOpacity>
        </Animated.View>
      );
    }

    const percentage = getProgressPercentage();
    const fullyCompleted = percentage >= 100;

    return (
      <TouchableOpacity
        style={[
          styles.checkButton,
          { backgroundColor: colors.surface },
          fullyCompleted && { backgroundColor: successColor },
          !fullyCompleted && percentage > 0 && { backgroundColor: colors.primaryLight },
        ]}
        onPress={handleComplete}
      >
        {fullyCompleted ? (
          <Icon 
            name={isNegative ? "shield" : "check"} 
            size={24} 
            color={colors.textInverse} 
          />
        ) : percentage > 0 ? (
          <View style={styles.partialCheckContainer}>
            <Svg width={24} height={24} viewBox="0 0 24 24">
              <Circle
                cx={12}
                cy={12}
                r={10}
                fill="none"
                stroke={colors.border}
                strokeWidth={2}
              />
              <Circle
                cx={12}
                cy={12}
                r={10}
                fill="none"
                stroke={cardColor}
                strokeWidth={2}
                strokeDasharray={`${(percentage / 100) * 62.83} 62.83`}
                strokeLinecap="round"
                rotation="-90"
                origin="12, 12"
              />
            </Svg>
            <Text style={[styles.partialCheckText, { color: cardColor }]}>
              {percentage.toFixed(0)}
            </Text>
          </View>
        ) : (
          <View style={[styles.checkCircle, { borderColor: colors.border }]} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <>
      <AnimatedPressableComponent
        scale={0.97}
        onPress={handleCardPress}
        style={[
          styles.card,
          { backgroundColor: colors.background, borderColor: colors.border },
          isFullyCompleted() && { opacity: 0.7 },
        ]}
      >
        <View style={styles.content}>
          <View style={[styles.colorIndicator, { backgroundColor: cardColor }]} />

          <View style={styles.info}>
            <View style={styles.nameRow}>
              {/* 🆕 Ícone do tipo de hábito */}
              {isNegative && (
                <Icon name="xCircle" size={16} color={colors.warning} />
              )}
              <Text style={[styles.name, { color: colors.textPrimary }]}>{habit.name}</Text>
              {hasStreak && (
                <View style={[
                  styles.streakBadge, 
                  { backgroundColor: isNegative ? colors.warningLight : colors.streakLight }
                ]}>
                  <Icon 
                    name="flame" 
                    size={12} 
                    color={isNegative ? colors.warning : colors.streak} 
                  />
                  <Text style={[
                    styles.streakText, 
                    { color: isNegative ? colors.warning : colors.streak }
                  ]}>
                    {streak?.current_streak}
                  </Text>
                </View>
              )}
            </View>
            
            {habit.frequency_type === 'weekly' && habit.frequency_days && (
              <View style={[styles.frequencyBadge, { backgroundColor: colors.infoLight }]}>
                <Icon name="calendar" size={11} color={colors.info} />
                <Text style={[styles.frequencyText, { color: colors.info }]}>
                  {formatSelectedDays(habit.frequency_days)}
                </Text>
              </View>
            )}
            
            {habit.description && (
              <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
                {habit.description}
              </Text>
            )}

            {habit.has_target && completion && habit.target_value && habit.target_unit && (
              <View style={styles.targetProgress}>
                <View style={styles.targetHeader}>
                  <Text style={[styles.targetLabel, { color: colors.textPrimary }]}>
                    {completion.value_achieved || 0} / {habit.target_value} {habit.target_unit}
                  </Text>
                  <Text style={[
                    styles.targetPercentage,
                    { color: colors.textSecondary },
                    getProgressPercentage() >= 100 && { color: successColor },
                  ]}>
                    {getProgressPercentage().toFixed(0)}%
                  </Text>
                </View>
                
                <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                  <View 
                    style={[
                      styles.progressFill,
                      { 
                        width: `${getProgressPercentage()}%`,
                        backgroundColor: getProgressPercentage() >= 100 ? successColor : cardColor,
                      }
                    ]}
                  />
                </View>

                {getProgressPercentage() >= 100 && (
                  <View style={[
                    styles.achievementBadge, 
                    { backgroundColor: isNegative ? colors.warningLight : colors.successLight }
                  ]}>
                    <Icon name="sparkles" size={11} color={successColor} />
                    <Text style={[styles.achievementText, { color: successColor }]}>
                      {isNegative ? 'Manteve-se firme!' : 'Meta atingida!'}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {habit.has_target && !completion && (
              <View style={[styles.targetHint, { 
                backgroundColor: colors.infoLight,
                borderLeftColor: colors.info 
              }]}>
                <Text style={[styles.targetHintText, { color: colors.info }]}>
                  Toque para registrar progresso
                </Text>
              </View>
            )}

            <View style={styles.footer}>
              <View style={[styles.badge, { backgroundColor: difficultyConfig.color + '20' }]}>
                <Text style={[styles.badgeText, { color: difficultyConfig.color }]}>
                  {difficultyConfig.label}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Icon name="star" size={12} color={colors.primary} />
                <Text style={[styles.points, { color: colors.primary }]}>
                  +{habit.points_base} pts
                </Text>
              </View>
            </View>
          </View>

          {renderCheckButton()}
        </View>

        {showAnimation && (
          <Animated.View
            style={[
              styles.floatingPoints,
              {
                transform: [{ translateY: pointsAnim }],
                opacity: pointsOpacity,
              },
            ]}
          >
            <Text style={[styles.floatingPointsText, { color: successColor }]}>
              +{habit.points_base} pts
            </Text>
          </Animated.View>
        )}
      </AnimatedPressableComponent>

      {habit.has_target && habit.target_value && habit.target_unit && (
        <HabitProgressInput
          visible={showProgressInput}
          habitName={habit.name}
          targetValue={habit.target_value}
          targetUnit={habit.target_unit}
          currentValue={completion?.value_achieved || 0}
          onConfirm={handleProgressConfirm}
          onCancel={() => setShowProgressInput(false)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  colorIndicator: {
    width: 4,
    height: '100%',
    borderRadius: 2,
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  info: { flex: 1, marginLeft: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  name: { fontSize: 16, fontWeight: '600', flex: 1 },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
  },
  streakText: { fontSize: 12, fontWeight: '600' },
  frequencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginBottom: 6,
    alignSelf: 'flex-start',
  },
  frequencyText: { fontSize: 11, fontWeight: '500' },
  description: { fontSize: 14, marginBottom: 8 },
  targetProgress: { marginBottom: 8 },
  targetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  targetLabel: { fontSize: 13, fontWeight: '600' },
  targetPercentage: { fontSize: 12, fontWeight: '600' },
  progressBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  achievementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  achievementText: { fontSize: 11, fontWeight: '600' },
  targetHint: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginBottom: 8,
    borderLeftWidth: 2,
  },
  targetHintText: { fontSize: 12, fontStyle: 'italic' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  points: { fontSize: 12, fontWeight: '600' },
  checkButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  partialCheckContainer: {
    position: 'relative',
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  partialCheckText: {
    position: 'absolute',
    fontSize: 9,
    fontWeight: '700',
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
  },
  floatingPoints: {
    position: 'absolute',
    top: 16,
    right: 70,
    zIndex: 10,
  },
  floatingPointsText: {
    fontSize: 18,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});