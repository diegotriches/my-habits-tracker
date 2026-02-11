// components/habits/TimePeriodSelector.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import { hapticFeedback } from '@/utils/haptics';

export type TimePeriod = 'day' | 'week';

interface Props {
  period: TimePeriod;
  onChange: (period: TimePeriod) => void;
}

export const TimePeriodSelector: React.FC<Props> = ({ period, onChange }) => {
  const { colors } = useTheme();

  const handlePress = (newPeriod: TimePeriod) => {
    if (newPeriod !== period) {
      hapticFeedback.selection();
      onChange(newPeriod);
    }
  };

  const periods: Array<{ key: TimePeriod; icon: any; label: string }> = [
    { key: 'day', icon: 'sunrise', label: 'Dia' },
    { key: 'week', icon: 'calendar', label: 'Semana' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {periods.map((item) => {
        const isActive = period === item.key;
        return (
          <TouchableOpacity
            key={item.key}
            style={[
              styles.option,
              isActive && { backgroundColor: colors.primary },
            ]}
            onPress={() => handlePress(item.key)}
            activeOpacity={0.7}
          >
            <Icon 
              name={item.icon} 
              size={18} 
              color={isActive ? '#FFFFFF' : colors.textSecondary} 
            />
            <Text 
              style={[
                styles.label,
                { color: isActive ? '#FFFFFF' : colors.textSecondary }
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
});