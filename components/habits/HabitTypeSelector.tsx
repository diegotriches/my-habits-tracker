import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { hapticFeedback } from '@/utils/haptics';

interface HabitTypeSelectorProps {
  habitType: 'positive' | 'negative';
  onChange: (type: 'positive' | 'negative') => void;
  // Estilos vindos de createStyles(colors) e cores do tema, passados
  // como props para reaproveitar exatamente a mesma aparência do original.
  styles: any;
  colors: any;
}

export const HabitTypeSelector = React.memo(function HabitTypeSelector({
  habitType,
  onChange,
  styles,
  colors,
}: HabitTypeSelectorProps) {
  const handleSelect = (type: 'positive' | 'negative') => {
    hapticFeedback.selection();
    onChange(type);
  };

  return (
    <View style={styles.habitTypeContainer}>
      <TouchableOpacity
        style={[styles.habitTypeOption, habitType === 'positive' && styles.habitTypeOptionPositive]}
        onPress={() => handleSelect('positive')}
      >
        <Icon
          name="check"
          size={20}
          color={habitType === 'positive' ? colors.success : colors.textSecondary}
        />
        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.habitTypeLabel,
              habitType === 'positive' && styles.habitTypeLabelPositive,
            ]}
          >
            Positivo
          </Text>
          <Text style={styles.habitTypeDescription}>Criar novo hábito</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.habitTypeOption, habitType === 'negative' && styles.habitTypeOptionNegative]}
        onPress={() => handleSelect('negative')}
      >
        <Icon
          name="xCircle"
          size={20}
          color={habitType === 'negative' ? colors.warning : colors.textSecondary}
        />
        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.habitTypeLabel,
              habitType === 'negative' && styles.habitTypeLabelNegative,
            ]}
          >
            Negativo
          </Text>
          <Text style={styles.habitTypeDescription}>Evitar algo ruim</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
});
