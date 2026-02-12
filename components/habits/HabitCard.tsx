// components/habits/HabitCard.tsx
import { Icon } from '@/components/ui/Icon';
import { AnimatedPressableComponent } from '@/components/ui/AnimatedPressable';
import { useTheme } from '@/contexts/ThemeContext';
import { Completion, Habit, Streak } from '@/types/database';
import { formatSelectedDays } from '@/utils/habitHelpers';
import { hapticFeedback } from '@/utils/haptics';
import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { HabitProgressInput } from './HabitProgressInput';
import { habitCardStyles } from './HabitCardStyles';

interface HabitCardProps {
  habit: Habit;
  onPress?: () => void;
  onComplete?: (achievedValue?: number, mode?: 'add' | 'replace') => void;
  isCompleted?: boolean;
  streak?: Streak;
  completion?: Completion;
  isDueToday?: boolean;
}

export default function HabitCard({
  habit,
  onPress,
  onComplete,
  isCompleted = false,
  streak,
  completion,
  isDueToday = true,
}: HabitCardProps) {
  const { colors } = useTheme();
  const isNegative = habit.type === 'negative';
  const cardColor = isNegative ? colors.warning : habit.color;
  const successColor = isNegative ? colors.warning : colors.success;
  const styles = habitCardStyles(colors, cardColor);
  const hasStreak = (streak?.current_streak || 0) > 0;

  const [showProgressInput, setShowProgressInput] = useState(false);

  const handleComplete = (e: any) => {
    e.stopPropagation();
    if (!onComplete) return;
    hapticFeedback.light();

    if (habit.has_target && habit.target_value && habit.target_unit) {
      setShowProgressInput(true);
      return;
    }

    hapticFeedback.success();
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
    if (!habit.has_target || !completion?.value_achieved || !habit.target_value) return 0;
    return Math.min((completion.value_achieved / habit.target_value) * 100, 100);
  };

  const isFullyCompleted = () => {
    if (!habit.has_target) return isCompleted;
    return getProgressPercentage() >= 100;
  };

  const renderCheckButton = () => {
    if (!habit.has_target) {
      return (
        <TouchableOpacity
          style={[styles.checkButton, { backgroundColor: isCompleted ? successColor : colors.surface }]}
          onPress={handleComplete}
        >
          {isCompleted ? (
            <Icon name={isNegative ? "shield" : "check"} size={24} color={colors.textInverse} />
          ) : (
            <View style={[styles.checkCircle, { borderColor: cardColor + '60' }]} />
          )}
        </TouchableOpacity>
      );
    }

    const percentage = getProgressPercentage();
    const fullyCompleted = percentage >= 100;
    let backgroundColor = colors.surface;
    if (fullyCompleted) backgroundColor = successColor;
    else if (percentage > 0) backgroundColor = colors.primaryLight;

    return (
      <TouchableOpacity style={[styles.checkButton, { backgroundColor }]} onPress={handleComplete}>
        {fullyCompleted ? (
          <Icon name={isNegative ? "shield" : "check"} size={24} color={colors.textInverse} />
        ) : percentage > 0 ? (
          <View style={styles.partialCheckContainer}>
            <Svg width={24} height={24} viewBox="0 0 24 24">
              <Circle cx={12} cy={12} r={10} fill="none" stroke={colors.border} strokeWidth={2} />
              <Circle cx={12} cy={12} r={10} fill="none" stroke={cardColor} strokeWidth={2}
                strokeDasharray={`${(percentage / 100) * 62.83} 62.83`}
                strokeLinecap="round" rotation="-90" origin="12, 12" />
            </Svg>
            <Text style={[styles.partialCheckText, { color: cardColor }]}>{percentage.toFixed(0)}</Text>
          </View>
        ) : (
          <View style={[styles.checkCircle, { borderColor: cardColor + '60' }]} />
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
          isFullyCompleted() && styles.cardCompleted,
          !isDueToday && !isCompleted && { opacity: 0.6 },
        ]}
      >
        <View style={styles.content}>
          <View style={[styles.colorIndicator, { backgroundColor: cardColor }]} />

          <View style={styles.info}>
            <View style={styles.nameRow}>
              {isNegative && <Icon name="xCircle" size={16} color={colors.warning} />}
              <Text style={styles.name}>{habit.name}</Text>
              {hasStreak && (
                <View style={[styles.streakBadge, { backgroundColor: isNegative ? colors.warningLight : colors.streakLight }]}>
                  <Icon name="flame" size={12} color={isNegative ? colors.warning : colors.streak} />
                  <Text style={[styles.streakText, { color: isNegative ? colors.warning : colors.streak }]}>
                    {streak?.current_streak}
                  </Text>
                </View>
              )}
            </View>

            {!isDueToday && !isCompleted && (
              <View style={styles.offDayBadge}>
                <Icon name="info" size={11} color={colors.info} />
                <Text style={styles.offDayText}>Fora do dia programado</Text>
              </View>
            )}

            {habit.frequency_type === 'weekly' && habit.frequency_days && isDueToday && (
              <View style={styles.frequencyBadge}>
                <Icon name="calendar" size={11} color={colors.info} />
                <Text style={styles.frequencyText}>{formatSelectedDays(habit.frequency_days)}</Text>
              </View>
            )}

            {habit.description && (
              <Text style={styles.description} numberOfLines={2}>{habit.description}</Text>
            )}

            {habit.has_target && completion && habit.target_value && habit.target_unit && (
              <View style={styles.targetProgress}>
                <View style={styles.targetHeader}>
                  <Text style={styles.targetLabel}>
                    {completion.value_achieved || 0} / {habit.target_value} {habit.target_unit}
                  </Text>
                  <Text style={[styles.targetPercentage, getProgressPercentage() >= 100 && { color: successColor }]}>
                    {getProgressPercentage().toFixed(0)}%
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, {
                    width: `${getProgressPercentage()}%`,
                    backgroundColor: getProgressPercentage() >= 100 ? successColor : cardColor,
                  }]} />
                </View>
                {getProgressPercentage() >= 100 && (
                  <View style={[styles.achievementBadge, { backgroundColor: isNegative ? colors.warningLight : colors.successLight }]}>
                    <Icon name="sparkles" size={11} color={successColor} />
                    <Text style={[styles.achievementText, { color: successColor }]}>
                      {isNegative ? 'Manteve-se firme!' : 'Meta atingida!'}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {habit.has_target && !completion && (
              <View style={styles.targetHint}>
                <Text style={styles.targetHintText}>Toque para registrar progresso</Text>
              </View>
            )}
          </View>

          {renderCheckButton()}
        </View>
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