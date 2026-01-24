// components/habits/HabitCompactRow.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Alert } from 'react-native';
import { Habit, Streak, Completion } from '@/types/database';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import { hapticFeedback } from '@/utils/haptics';

interface Props {
  habit: Habit;
  streak?: Streak;
  completion?: Completion;
  isCompleted: boolean;
  isDueToday: boolean;
  onPress: () => void;
  onComplete: (achievedValue?: number, mode?: 'add' | 'replace') => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onEditProgress?: () => void; // 🆕 Callback específico para editar progresso de metas
}

export const HabitCompactRow: React.FC<Props> = ({
  habit,
  streak,
  completion,
  isCompleted,
  isDueToday,
  onPress,
  onComplete,
  onEdit,
  onDelete,
  onEditProgress, // 🆕
}) => {
  const { colors } = useTheme();
  const [isLoading, setIsLoading] = useState(false);

  // ========== CÁLCULOS DE PROGRESSO ==========

  /**
   * Calcular percentual de progresso
   */
  const getProgress = (): number => {
    if (!habit.has_target || !completion) return 0;
    const current = completion.value_achieved || 0;
    const target = habit.target_value || 1;
    return Math.min((current / target) * 100, 100);
  };

  /**
   * Determinar status do progresso
   */
  const getProgressStatus = (): {
    color: string;
    icon: 'star' | 'alertTriangle' | 'xCircle' | 'check';
    label: string;
  } => {
    if (!habit.has_target) {
      return {
        color: habit.color,
        icon: 'check',
        label: 'Completo',
      };
    }

    const progress = getProgress();

    if (progress >= 100) {
      return {
        color: colors.success,
        icon: 'star',
        label: 'Meta completa!',
      };
    } else if (progress >= 50) {
      return {
        color: colors.warning,
        icon: 'alertTriangle',
        label: 'Bom progresso',
      };
    } else if (progress > 0) {
      return {
        color: colors.danger,
        icon: 'xCircle',
        label: 'Progresso baixo',
      };
    } else {
      return {
        color: colors.border,
        icon: 'xCircle',
        label: 'Não iniciado',
      };
    }
  };

  /**
   * Verificar se ganhou pontos
   */
  const earnedPoints = (): boolean => {
    if (!habit.has_target) return isCompleted;
    return getProgress() >= 100;
  };

  const progress = getProgress();
  const status = getProgressStatus();

  // ========== HANDLERS ==========

  /**
   * Completar/Descompletar hábito
   */
  const handleComplete = async () => {
    if (isLoading || !isDueToday) return;

    hapticFeedback.medium();

    // 🆕 Para hábitos com meta numérica
    if (habit.has_target) {
      // Se tem callback específico de edição, usa ele
      if (onEditProgress) {
        onEditProgress();
      } else {
        // Fallback: abre tela de detalhes
        onPress();
      }
    } else {
      // Para hábitos binários, permite marcar E desmarcar
      setIsLoading(true);
      try {
        await onComplete();
        hapticFeedback.success();
      } catch (error) {
        hapticFeedback.error();
      } finally {
        setIsLoading(false);
      }
    }
  };

  /**
   * Long press - mostrar menu de opções
   */
  const handleLongPress = () => {
    hapticFeedback.medium();

    const options = ['Ver Detalhes', 'Editar', 'Excluir', 'Cancelar'];
    const destructiveButtonIndex = 2;
    const cancelButtonIndex = 3;

    Alert.alert(
      habit.name,
      isDueToday ? 'O que deseja fazer?' : 'Este hábito não está programado para hoje',
      [
        {
          text: 'Ver Detalhes',
          onPress: () => {
            hapticFeedback.light();
            onPress();
          },
        },
        ...(onEdit
          ? [
              {
                text: 'Editar',
                onPress: () => {
                  hapticFeedback.light();
                  onEdit();
                },
              },
            ]
          : []),
        ...(onDelete
          ? [
              {
                text: 'Excluir',
                style: 'destructive' as const,
                onPress: () => {
                  hapticFeedback.error();
                  Alert.alert(
                    'Confirmar Exclusão',
                    `Tem certeza que deseja excluir "${habit.name}"? Esta ação não pode ser desfeita.`,
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      {
                        text: 'Excluir',
                        style: 'destructive',
                        onPress: onDelete,
                      },
                    ]
                  );
                },
              },
            ]
          : []),
        {
          text: 'Cancelar',
          style: 'cancel' as const,
        },
      ]
    );
  };

  // ========== RENDER ==========

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderLeftColor: habit.color,
          opacity: isDueToday ? 1 : 0.6,
        },
      ]}
      onPress={onPress}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
      delayLongPress={500}
    >
      {/* Esquerda: Indicador de Cor + Nome */}
      <View style={styles.left}>
        {/* 🆕 Apenas indicador de cor (removido emoji) */}
        <View
          style={[
            styles.colorIndicator,
            { backgroundColor: habit.color },
          ]}
        />

        <View style={styles.info}>
          <Text
            style={[styles.name, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {habit.name}
          </Text>

          {/* 🆕 Mostrar progresso para metas numéricas */}
          {habit.has_target && (
            <View style={styles.targetRow}>
              <Text
                style={[styles.target, { color: colors.textTertiary }]}
                numberOfLines={1}
              >
                {completion?.value_achieved || 0} / {habit.target_value}{' '}
                {habit.target_unit}
              </Text>

              {/* 🆕 Badge de status */}
              {isCompleted && (
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: status.color + '20' },
                  ]}
                >
                  <Icon name={status.icon} size={10} color={status.color} />
                  <Text style={[styles.statusText, { color: status.color }]}>
                    {Math.round(progress)}%
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* 🆕 Indicador "Não programado hoje" */}
          {!isDueToday && (
            <Text style={[styles.notDueText, { color: colors.textTertiary }]}>
              Não programado para hoje
            </Text>
          )}
        </View>
      </View>

      {/* Centro: Progresso ou Streak */}
      <View style={styles.center}>
        {habit.has_target ? (
          <View style={styles.progressContainer}>
            {/* 🆕 Barra de progresso com cores */}
            <View
              style={[styles.progressBar, { backgroundColor: colors.border }]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: status.color,
                    width: `${progress}%`,
                  },
                ]}
              />
            </View>

            {/* 🆕 Badge de pontos ganhos */}
            {earnedPoints() && (
              <View
                style={[
                  styles.pointsBadge,
                  { backgroundColor: colors.successLight },
                ]}
              >
                <Text style={[styles.pointsText, { color: colors.success }]}>
                  +{habit.points_base}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <>
            {/* Streak para hábitos binários */}
            {streak && streak.current_streak > 0 && (
              <View
                style={[
                  styles.streakBadge,
                  { backgroundColor: colors.streakLight },
                ]}
              >
                <Icon name="flame" size={12} color={colors.streak} />
                <Text style={[styles.streakText, { color: colors.streak }]}>
                  {streak.current_streak}
                </Text>
              </View>
            )}

            {/* 🆕 Badge de pontos ganhos para binários */}
            {isCompleted && (
              <View
                style={[
                  styles.pointsBadge,
                  { backgroundColor: colors.successLight },
                ]}
              >
                <Text style={[styles.pointsText, { color: colors.success }]}>
                  +{habit.points_base}
                </Text>
              </View>
            )}
          </>
        )}
      </View>

      {/* Direita: Checkbox Melhorado */}
      <TouchableOpacity
        style={[
          styles.checkbox,
          {
            borderColor: isCompleted ? status.color : colors.border,
            backgroundColor: isCompleted ? status.color : 'transparent',
          },
        ]}
        onPress={handleComplete}
        disabled={isLoading || !isDueToday}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        {isLoading ? (
          <View style={styles.loadingDot} />
        ) : isCompleted ? (
          habit.has_target ? (
            // 🆕 Para metas numéricas, mostrar % ou ícone
            progress >= 100 ? (
              <Icon name="star" size={16} color="#FFFFFF" />
            ) : (
              <Text style={styles.checkboxPercent}>{Math.round(progress)}%</Text>
            )
          ) : (
            // Para binários, mostrar check
            <Icon name="check" size={16} color="#FFFFFF" />
          )
        ) : null}
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  colorIndicator: {
    width: 4,
    height: 36,
    borderRadius: 2,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  target: {
    fontSize: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  notDueText: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 2,
  },
  center: {
    marginRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressBar: {
    width: 60,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  pointsBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pointsText: {
    fontSize: 10,
    fontWeight: '700',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  streakText: {
    fontSize: 12,
    fontWeight: '600',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxPercent: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
});