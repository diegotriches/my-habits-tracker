// components/habits/PeriodStatsCard.tsx
import { AnimatedPressableComponent } from '@/components/ui/AnimatedPressable';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import { hapticFeedback } from '@/utils/haptics';
import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface PeriodStatsCardProps {
  label: string;
  percentage: number;
  completed: number;
  total: number;
  color: string;
}

export function PeriodStatsCard({
  label,
  percentage,
  completed,
  total,
  color,
}: PeriodStatsCardProps) {
  const { colors } = useTheme();
  const [showTooltip, setShowTooltip] = useState(false);

  const radius = 35;
  const strokeWidth = 6;
  const circumference = 2 * Math.PI * radius;
  const progress = circumference - (percentage / 100) * circumference;

  const handlePress = () => {
    hapticFeedback.light();
    setShowTooltip(true);
  };

  const handleCloseTooltip = () => {
    hapticFeedback.light();
    setShowTooltip(false);
  };

  const getPeriodDescription = () => {
    switch (label) {
      case 'Semana':
        return 'Últimos 7 dias';
      case 'Mês':
        return 'Últimos 30 dias';
      case 'Semestre':
        return 'Últimos 180 dias';
      case 'Ano':
        return 'Últimos 365 dias';
      default:
        return label;
    }
  };

  const getMotivationalMessage = () => {
    if (percentage >= 90) {
      return '🎉 Excelente! Continue assim!';
    } else if (percentage >= 70) {
      return '👍 Muito bem! Você está indo ótimo!';
    } else if (percentage >= 50) {
      return '💪 Bom trabalho! Continue firme!';
    } else if (percentage >= 30) {
      return '📈 Há espaço para melhorar!';
    } else {
      return '🌱 Cada passo conta! Não desista!';
    }
  };

  return (
    <>
      <AnimatedPressableComponent
        scale={0.97}
        onPress={handlePress}
        style={[styles.card, { backgroundColor: colors.surface }]}
      >
        <View style={styles.labelContainer}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            {label}
          </Text>
          <Icon name="info" size={12} color={colors.textTertiary} />
        </View>

        {/* Círculo de Progresso */}
        <View style={styles.circleContainer}>
          <Svg width={80} height={80}>
            {/* Círculo de fundo */}
            <Circle
              cx={40}
              cy={40}
              r={radius}
              stroke={colors.border}
              strokeWidth={strokeWidth}
              fill="none"
            />
            {/* Círculo de progresso */}
            <Circle
              cx={40}
              cy={40}
              r={radius}
              stroke={color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={progress}
              strokeLinecap="round"
              rotation="-90"
              origin="40, 40"
            />
          </Svg>
          <View style={styles.percentageContainer}>
            <Text style={[styles.percentage, { color }]}>
              {percentage.toFixed(0)}%
            </Text>
          </View>
        </View>

        {/* Detalhes */}
        <Text style={[styles.details, { color: colors.textTertiary }]}>
          {completed}/{total} dias
        </Text>
      </AnimatedPressableComponent>

      {/* Tooltip Modal */}
      <Modal
        visible={showTooltip}
        transparent
        animationType="fade"
        onRequestClose={handleCloseTooltip}
      >
        <Pressable style={styles.modalOverlay} onPress={handleCloseTooltip}>
          <View style={[styles.tooltipContainer, { backgroundColor: colors.surface }]}>
            <View style={styles.tooltipHeader}>
              <View style={[styles.tooltipIconCircle, { backgroundColor: color + '20' }]}>
                <Icon name="info" size={20} color={color} />
              </View>
              <Text style={[styles.tooltipTitle, { color: colors.textPrimary }]}>
                {label}
              </Text>
            </View>

            <View style={styles.tooltipContent}>
              <Text style={[styles.tooltipDescription, { color: colors.textSecondary }]}>
                {getPeriodDescription()}
              </Text>

              <View style={[styles.tooltipStats, { backgroundColor: colors.background }]}>
                <View style={styles.tooltipStatRow}>
                  <Text style={[styles.tooltipStatLabel, { color: colors.textSecondary }]}>
                    Dias programados:
                  </Text>
                  <Text style={[styles.tooltipStatValue, { color: colors.textPrimary }]}>
                    {total}
                  </Text>
                </View>

                <View style={styles.tooltipStatRow}>
                  <Text style={[styles.tooltipStatLabel, { color: colors.textSecondary }]}>
                    Dias completados:
                  </Text>
                  <Text style={[styles.tooltipStatValue, { color: colors.success }]}>
                    {completed}
                  </Text>
                </View>

                <View style={styles.tooltipStatRow}>
                  <Text style={[styles.tooltipStatLabel, { color: colors.textSecondary }]}>
                    Dias faltantes:
                  </Text>
                  <Text style={[styles.tooltipStatValue, { color: colors.textPrimary }]}>
                    {total - completed}
                  </Text>
                </View>

                <View style={styles.tooltipStatRow}>
                  <Text style={[styles.tooltipStatLabel, { color: colors.textSecondary }]}>
                    Taxa de sucesso:
                  </Text>
                  <Text style={[styles.tooltipStatValue, { color }]}>
                    {percentage.toFixed(1)}%
                  </Text>
                </View>
              </View>

              <View style={[styles.motivationalBox, { backgroundColor: color + '15' }]}>
                <Text style={[styles.motivationalText, { color }]}>
                  {getMotivationalMessage()}
                </Text>
              </View>

              <Text style={[styles.tooltipNote, { color: colors.textTertiary }]}>
                💡 Apenas os dias programados para este hábito são contabilizados
              </Text>
            </View>

            <Pressable
              style={[styles.closeButton, { backgroundColor: colors.primary }]}
              onPress={handleCloseTooltip}
            >
              <Text style={[styles.closeButtonText, { color: colors.textInverse }]}>
                Entendi
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  circleContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  percentageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  percentage: {
    fontSize: 18,
    fontWeight: '700',
  },
  details: {
    fontSize: 11,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  tooltipContainer: {
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  tooltipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 24,
    paddingBottom: 16,
  },
  tooltipIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tooltipTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  tooltipContent: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  tooltipDescription: {
    fontSize: 14,
    marginBottom: 16,
  },
  tooltipStats: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  tooltipStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  tooltipStatLabel: {
    fontSize: 14,
  },
  tooltipStatValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  motivationalBox: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  motivationalText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  tooltipNote: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  closeButton: {
    margin: 20,
    marginTop: 0,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});