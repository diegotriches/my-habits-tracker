// components/habits/ViewModeSelector.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import { hapticFeedback } from '@/utils/haptics';

export type ViewMode = 'cards' | 'weekly' | 'compact';

interface Props {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export const ViewModeSelector: React.FC<Props> = ({ mode, onChange }) => {
  const { colors } = useTheme();

  const handlePress = (newMode: ViewMode) => {
    if (newMode !== mode) {
      hapticFeedback.selection();
      onChange(newMode);
    }
  };

  const modes: Array<{ key: ViewMode; icon: any; label: string }> = [
    { key: 'cards', icon: 'home', label: 'Cards' },
    { key: 'compact', icon: 'list', label: 'Lista' },
    { key: 'weekly', icon: 'calendar', label: 'Semanal' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {modes.map((item) => {
        const isActive = mode === item.key;
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