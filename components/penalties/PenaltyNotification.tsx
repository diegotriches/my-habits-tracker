import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { PENALTY_MESSAGES } from '@/constants/PenaltyConfig';
import { useTheme } from '@/app/contexts/ThemeContext';
import { Icon } from '@/components/ui/Icon';

interface Props {
  pointsLost: number;
  reason: string;
  habitName?: string;
  onDismiss: () => void;
}

export const PenaltyNotification: React.FC<Props> = ({
  pointsLost,
  reason,
  habitName,
  onDismiss,
}) => {
  const { colors } = useTheme();

  const getMessage = () => {
    const baseMessage = PENALTY_MESSAGES[reason as keyof typeof PENALTY_MESSAGES] || 'Penalidade aplicada';
    return habitName ? `${habitName}: ${baseMessage}` : baseMessage;
  };

  return (
    <View 
      style={[
        styles.container, 
        { 
          backgroundColor: colors.dangerLight,
          borderLeftColor: colors.danger 
        }
      ]}
    >
      <View style={styles.content}>
        <Icon name="alert" size={24} color={colors.danger} />
        
        <View style={styles.textContainer}>
          <Text style={[styles.message, { color: colors.danger }]}>
            {getMessage()}
          </Text>
          <Text style={[styles.points, { color: colors.danger }]}>
            -{pointsLost} pontos
          </Text>
        </View>
        
        <TouchableOpacity style={styles.closeButton} onPress={onDismiss}>
          <Icon name="close" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderLeftWidth: 4,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  textContainer: {
    flex: 1,
  },
  message: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  points: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});