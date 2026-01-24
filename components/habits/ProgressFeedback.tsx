// components/habits/ProgressFeedback.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Habit } from '@/types/database';
import { Ionicons } from '@expo/vector-icons';

interface ProgressFeedbackProps {
  habit: Habit;
  currentValue: number;
  pointsEarned: number;
  percentage: number;
  streakAction: 'increment' | 'freeze' | 'reset';
}

export const ProgressFeedback: React.FC<ProgressFeedbackProps> = ({
  habit,
  currentValue,
  pointsEarned,
  percentage,
  streakAction,
}) => {
  // Não mostrar nada para hábitos binários
  if (!habit.has_target || !habit.target_value) {
    return null;
  }

  const remaining = habit.target_value - currentValue;
  const remainingPercentage = 100 - percentage;

  // 🎉 Meta Completa (≥ 100%)
  if (percentage >= 100) {
    return (
      <View style={[styles.container, styles.successContainer]}>
        <View style={styles.iconContainer}>
          <Ionicons name="checkmark-circle" size={24} color="#10b981" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.successTitle}>🎉 Meta completa!</Text>
          <Text style={styles.successText}>
            +{pointsEarned} pontos ganhos • Streak aumentado!
          </Text>
        </View>
      </View>
    );
  }

  // 💪 Progresso Bom (50-99%)
  if (percentage >= 50) {
    return (
      <View style={[styles.container, styles.freezeContainer]}>
        <View style={styles.iconContainer}>
          <Ionicons name="flash" size={24} color="#f59e0b" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.freezeTitle}>💪 Bom progresso!</Text>
          <Text style={styles.freezeText}>
            {percentage.toFixed(0)}% completo • Faltam {remaining.toFixed(1)} {habit.target_unit} para pontuar
          </Text>
          <Text style={styles.streakInfo}>
            ⚡ Streak congelado (sem punição!)
          </Text>
        </View>
      </View>
    );
  }

  // ⚠️ Progresso Baixo (< 50%)
  return (
    <View style={[styles.container, styles.warningContainer]}>
      <View style={styles.iconContainer}>
        <Ionicons name="alert-circle" size={24} color="#ef4444" />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.warningTitle}>⚠️ Progresso parcial</Text>
        <Text style={styles.warningText}>
          {percentage.toFixed(0)}% completo • Faltam {remaining.toFixed(1)} {habit.target_unit} para pontuar
        </Text>
        <Text style={styles.streakInfo}>
          🔄 Streak resetado (sem punição!)
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
    gap: 12,
  },
  successContainer: {
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  freezeContainer: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  warningContainer: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  iconContainer: {
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
    gap: 4,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#065f46',
    marginBottom: 2,
  },
  successText: {
    fontSize: 14,
    color: '#047857',
    lineHeight: 20,
  },
  freezeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400e',
    marginBottom: 2,
  },
  freezeText: {
    fontSize: 14,
    color: '#b45309',
    lineHeight: 20,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#991b1b',
    marginBottom: 2,
  },
  warningText: {
    fontSize: 14,
    color: '#dc2626',
    lineHeight: 20,
  },
  streakInfo: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: 4,
  },
});

// 🆕 Versão compacta para lista de hábitos
export const ProgressBadge: React.FC<{
  percentage: number;
  pointsEarned: number;
}> = ({ percentage, pointsEarned }) => {
  if (pointsEarned > 0) {
    return (
      <View style={badgeStyles.successBadge}>
        <Ionicons name="checkmark-circle" size={16} color="#10b981" />
        <Text style={badgeStyles.successText}>100%</Text>
      </View>
    );
  }

  if (percentage >= 50) {
    return (
      <View style={badgeStyles.freezeBadge}>
        <Ionicons name="flash" size={16} color="#f59e0b" />
        <Text style={badgeStyles.freezeText}>{percentage.toFixed(0)}%</Text>
      </View>
    );
  }

  return (
    <View style={badgeStyles.warningBadge}>
      <Ionicons name="alert-circle" size={16} color="#ef4444" />
      <Text style={badgeStyles.warningText}>{percentage.toFixed(0)}%</Text>
    </View>
  );
};

const badgeStyles = StyleSheet.create({
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#dcfce7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  successText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065f46',
  },
  freezeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  freezeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400e',
  },
  warningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  warningText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#991b1b',
  },
});