// components/habits/FrequencyGoalInput.tsx
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import { FrequencyGoalPeriod } from '@/types/database';
import { hapticFeedback } from '@/utils/haptics';
import { IconName } from '@/constants/Icons';
import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface FrequencyGoalInputProps {
  value: number;
  period: FrequencyGoalPeriod;
  customDays: number;
  onValueChange: (value: number) => void;
  onPeriodChange: (period: FrequencyGoalPeriod) => void;
  onCustomDaysChange: (days: number) => void;
}

const PERIOD_OPTIONS: Array<{ key: FrequencyGoalPeriod; label: string; icon: IconName }> = [
  { key: 'week', label: 'por semana', icon: 'calendar' },
  { key: 'month', label: 'por mês', icon: 'activity' },
  { key: 'custom', label: 'personalizado', icon: 'settings' },
];

export function FrequencyGoalInput({
  value,
  period,
  customDays,
  onValueChange,
  onPeriodChange,
  onCustomDaysChange,
}: FrequencyGoalInputProps) {
  const { colors } = useTheme();

  const handleValueChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    const num = parseInt(cleaned, 10);
    if (cleaned === '') {
      onValueChange(0);
    } else if (!isNaN(num) && num <= 999) {
      onValueChange(num);
    }
  };

  const handleCustomDaysChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    const num = parseInt(cleaned, 10);
    if (cleaned === '') {
      onCustomDaysChange(0);
    } else if (!isNaN(num) && num <= 9999) {
      onCustomDaysChange(num);
    }
  };

  const getMaxForPeriod = (): number => {
    switch (period) {
      case 'week': return 7;
      case 'month': return 31;
      case 'custom': return customDays || 999;
    }
  };

  const getPeriodLabel = (): string => {
    switch (period) {
      case 'week': return 'semana';
      case 'month': return 'mês';
      case 'custom': return `${customDays || '?'} dias`;
    }
  };

  const isValueValid = value > 0 && value <= getMaxForPeriod();
  const isCustomDaysValid = period !== 'custom' || customDays > 0;

  return (
    <View style={styles.container}>
      {/* Seletor de período */}
      <View style={styles.periodContainer}>
        {PERIOD_OPTIONS.map((option) => {
          const isSelected = period === option.key;
          return (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.periodOption,
                { backgroundColor: colors.surface, borderColor: colors.border },
                isSelected && { borderColor: colors.primary, backgroundColor: colors.primaryLight },
              ]}
              onPress={() => {
                hapticFeedback.selection();
                onPeriodChange(option.key);
              }}
            >
              <Icon
                name={option.icon}
                size={16}
                color={isSelected ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.periodLabel,
                  { color: colors.textSecondary },
                  isSelected && { color: colors.primary, fontWeight: '600' },
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Input de valor + período */}
      <View style={styles.inputRow}>
        <TextInput
          style={[
            styles.valueInput,
            {
              backgroundColor: colors.surface,
              borderColor: isValueValid || value === 0 ? colors.border : colors.danger,
              color: colors.textPrimary,
            },
          ]}
          placeholder="0"
          placeholderTextColor={colors.textTertiary}
          value={value > 0 ? value.toString() : ''}
          onChangeText={handleValueChange}
          keyboardType="number-pad"
          maxLength={3}
        />

        <Text style={[styles.timesLabel, { color: colors.textSecondary }]}>
          {value === 1 ? 'vez' : 'vezes'}
        </Text>

        {period === 'custom' ? (
          <>
            <Text style={[styles.inLabel, { color: colors.textSecondary }]}>em</Text>
            <TextInput
              style={[
                styles.daysInput,
                {
                  backgroundColor: colors.surface,
                  borderColor: isCustomDaysValid ? colors.border : colors.danger,
                  color: colors.textPrimary,
                },
              ]}
              placeholder="0"
              placeholderTextColor={colors.textTertiary}
              value={customDays > 0 ? customDays.toString() : ''}
              onChangeText={handleCustomDaysChange}
              keyboardType="number-pad"
              maxLength={4}
            />
            <Text style={[styles.daysLabel, { color: colors.textSecondary }]}>dias</Text>
          </>
        ) : (
          <Text style={[styles.periodText, { color: colors.textPrimary }]}>
            por {getPeriodLabel()}
          </Text>
        )}
      </View>

      {/* Validação visual */}
      {value > 0 && value > getMaxForPeriod() && (
        <View style={[styles.warningContainer, { backgroundColor: colors.warningLight }]}>
          <Icon name="alertCircle" size={14} color={colors.warning} />
          <Text style={[styles.warningText, { color: colors.warning }]}>
            O valor não pode exceder {getMaxForPeriod()} para {getPeriodLabel()}
          </Text>
        </View>
      )}

      {/* Preview da meta */}
      {isValueValid && isCustomDaysValid && (
        <View style={[styles.preview, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
          <Icon name="target" size={16} color={colors.primary} />
          <Text style={[styles.previewText, { color: colors.primary }]}>
            Meta: {value} {value === 1 ? 'vez' : 'vezes'} por {getPeriodLabel()}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    gap: 12,
  },
  periodContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  periodOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 2,
  },
  periodLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  valueInput: {
    width: 60,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 18,
    fontWeight: '700',
    borderWidth: 1.5,
    textAlign: 'center',
  },
  timesLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  inLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  daysInput: {
    width: 64,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 18,
    fontWeight: '700',
    borderWidth: 1.5,
    textAlign: 'center',
  },
  daysLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  periodText: {
    fontSize: 15,
    fontWeight: '600',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  warningText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  previewText: {
    fontSize: 14,
    fontWeight: '600',
  },
});