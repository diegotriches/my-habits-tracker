// components/habits/DayViewToggle.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import { hapticFeedback } from '@/utils/haptics';

export type DayViewMode = 'detailed' | 'compact';

interface Props {
  mode: DayViewMode;
  onChange: (mode: DayViewMode) => void;
}

export const DayViewToggle: React.FC<Props> = ({ mode, onChange }) => {
  const { colors } = useTheme();

  const handlePress = (newMode: DayViewMode) => {
    if (newMode !== mode) {
      hapticFeedback.light();
      onChange(newMode);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.border + '40' }]}>
      <TouchableOpacity
        style={[
          styles.option,
          mode === 'detailed' && { backgroundColor: colors.surface },
        ]}
        onPress={() => handlePress('detailed')}
        activeOpacity={0.7}
      >
        <Icon 
          name="maximize" 
          size={14} 
          color={mode === 'detailed' ? colors.textPrimary : colors.textTertiary} 
        />
        <Text 
          style={[
            styles.label,
            { color: mode === 'detailed' ? colors.textPrimary : colors.textTertiary }
          ]}
        >
          Detalhado
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.option,
          mode === 'compact' && { backgroundColor: colors.surface },
        ]}
        onPress={() => handlePress('compact')}
        activeOpacity={0.7}
      >
        <Icon 
          name="minimize" 
          size={14} 
          color={mode === 'compact' ? colors.textPrimary : colors.textTertiary} 
        />
        <Text 
          style={[
            styles.label,
            { color: mode === 'compact' ? colors.textPrimary : colors.textTertiary }
          ]}
        >
          Compacto
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 3,
    gap: 3,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});