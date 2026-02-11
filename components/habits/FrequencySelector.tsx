// components/habits/FrequencySelector.tsx
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import { FrequencyGoalPeriod } from '@/types/database';
import { hapticFeedback } from '@/utils/haptics';
import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type FrequencyMode = 'daily' | 'weekly' | 'goal';

interface FrequencySelectorProps {
  frequencyType: 'daily' | 'weekly' | 'custom';
  selectedDays: number[];
  onFrequencyTypeChange: (type: 'daily' | 'weekly' | 'custom') => void;
  onDaysChange: (days: number[]) => void;
  // Meta de frequência
  hasFrequencyGoal: boolean;
  frequencyGoalValue: number;
  frequencyGoalPeriod: FrequencyGoalPeriod;
  frequencyGoalCustomDays: number;
  onFrequencyGoalToggle: (enabled: boolean) => void;
  onFrequencyGoalValueChange: (value: number) => void;
  onFrequencyGoalPeriodChange: (period: FrequencyGoalPeriod) => void;
  onFrequencyGoalCustomDaysChange: (days: number) => void;
}

const WEEKDAYS = [
  { id: 1, label: 'Seg', full: 'Segunda' },
  { id: 2, label: 'Ter', full: 'Terça' },
  { id: 3, label: 'Qua', full: 'Quarta' },
  { id: 4, label: 'Qui', full: 'Quinta' },
  { id: 5, label: 'Sex', full: 'Sexta' },
  { id: 6, label: 'Sáb', full: 'Sábado' },
  { id: 0, label: 'Dom', full: 'Domingo' },
];

export function FrequencySelector({
  frequencyType,
  selectedDays,
  onFrequencyTypeChange,
  onDaysChange,
  hasFrequencyGoal,
  frequencyGoalValue,
  frequencyGoalPeriod,
  frequencyGoalCustomDays,
  onFrequencyGoalToggle,
  onFrequencyGoalValueChange,
  onFrequencyGoalPeriodChange,
  onFrequencyGoalCustomDaysChange,
}: FrequencySelectorProps) {
  const { colors } = useTheme();

  // Determinar modo ativo
  const activeMode: FrequencyMode = hasFrequencyGoal ? 'goal' : frequencyType === 'weekly' ? 'weekly' : 'daily';

  const handleModeChange = (mode: FrequencyMode) => {
    hapticFeedback.selection();

    if (mode === 'daily') {
      onFrequencyGoalToggle(false);
      onFrequencyTypeChange('daily');
      onDaysChange([0, 1, 2, 3, 4, 5, 6]);
    } else if (mode === 'weekly') {
      onFrequencyGoalToggle(false);
      onFrequencyTypeChange('weekly');
      if (selectedDays.length === 7 || selectedDays.length === 0) {
        onDaysChange([1, 2, 3, 4, 5]);
      }
    } else if (mode === 'goal') {
      onFrequencyGoalToggle(true);
      onFrequencyTypeChange('daily');
      onDaysChange([0, 1, 2, 3, 4, 5, 6]);
      if (frequencyGoalValue === 0) {
        onFrequencyGoalValueChange(3);
      }
    }
  };

  const toggleDay = (dayId: number) => {
    if (selectedDays.includes(dayId)) {
      onDaysChange(selectedDays.filter(d => d !== dayId));
    } else {
      onDaysChange([...selectedDays, dayId].sort());
    }
  };

  const selectAllDays = () => onDaysChange([0, 1, 2, 3, 4, 5, 6]);
  const selectWeekdays = () => onDaysChange([1, 2, 3, 4, 5]);
  const selectWeekends = () => onDaysChange([0, 6]);

  const handleGoalValueChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    const num = parseInt(cleaned, 10);
    if (cleaned === '') {
      onFrequencyGoalValueChange(0);
    } else if (!isNaN(num) && num <= 999) {
      onFrequencyGoalValueChange(num);
    }
  };

  const handleCustomDaysChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    const num = parseInt(cleaned, 10);
    if (cleaned === '') {
      onFrequencyGoalCustomDaysChange(0);
    } else if (!isNaN(num) && num <= 9999) {
      onFrequencyGoalCustomDaysChange(num);
    }
  };

  const getMaxForPeriod = (): number => {
    switch (frequencyGoalPeriod) {
      case 'week': return 7;
      case 'month': return 31;
      case 'custom': return frequencyGoalCustomDays || 9999;
    }
  };

  const getGoalPeriodLabel = (): string => {
    switch (frequencyGoalPeriod) {
      case 'week': return 'semana';
      case 'month': return 'mês';
      case 'custom': return `${frequencyGoalCustomDays || '?'} dias`;
    }
  };

  const isGoalValid = frequencyGoalValue > 0 
    && frequencyGoalValue <= getMaxForPeriod()
    && (frequencyGoalPeriod !== 'custom' || frequencyGoalCustomDays > 0);

  return (
    <View style={styles.container}>
      {/* Seletor de Modo */}
      <View style={styles.modeSelector}>
        {/* Diário */}
        <TouchableOpacity
          style={[
            styles.modeButton,
            { borderColor: colors.border, backgroundColor: colors.surface },
            activeMode === 'daily' && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
          ]}
          onPress={() => handleModeChange('daily')}
        >
          <Icon name="calendar" size={16} color={activeMode === 'daily' ? colors.primary : colors.textSecondary} />
          <Text style={[
            styles.modeButtonText,
            { color: colors.textSecondary },
            activeMode === 'daily' && { color: colors.primary },
          ]}>
            Diário
          </Text>
        </TouchableOpacity>

        {/* Semanal */}
        <TouchableOpacity
          style={[
            styles.modeButton,
            { borderColor: colors.border, backgroundColor: colors.surface },
            activeMode === 'weekly' && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
          ]}
          onPress={() => handleModeChange('weekly')}
        >
          <Icon name="checkCircle" size={16} color={activeMode === 'weekly' ? colors.primary : colors.textSecondary} />
          <Text style={[
            styles.modeButtonText,
            { color: colors.textSecondary },
            activeMode === 'weekly' && { color: colors.primary },
          ]}>
            Semanal
          </Text>
        </TouchableOpacity>

        {/* Meta de Frequência */}
        <TouchableOpacity
          style={[
            styles.modeButton,
            { borderColor: colors.border, backgroundColor: colors.surface },
            activeMode === 'goal' && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
          ]}
          onPress={() => handleModeChange('goal')}
        >
          <Icon name="target" size={16} color={activeMode === 'goal' ? colors.primary : colors.textSecondary} />
          <Text style={[
            styles.modeButtonText,
            { color: colors.textSecondary },
            activeMode === 'goal' && { color: colors.primary },
          ]}>
            Meta
          </Text>
        </TouchableOpacity>
      </View>

      {/* ===== CONTEÚDO: DIAS ESPECÍFICOS ===== */}
      {activeMode === 'weekly' && (
        <>
          <View style={styles.daysContainer}>
            {WEEKDAYS.map((day) => (
              <TouchableOpacity
                key={day.id}
                style={[
                  styles.dayButton,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  selectedDays.includes(day.id) && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => {
                  hapticFeedback.light();
                  toggleDay(day.id);
                }}
              >
                <Text style={[
                  styles.dayButtonText,
                  { color: colors.textSecondary },
                  selectedDays.includes(day.id) && { color: colors.textInverse },
                ]}>
                  {day.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.shortcuts}>
            <TouchableOpacity
              style={[styles.shortcutButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => { hapticFeedback.light(); selectAllDays(); }}
            >
              <Text style={[styles.shortcutText, { color: colors.textSecondary }]}>Todos</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.shortcutButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => { hapticFeedback.light(); selectWeekdays(); }}
            >
              <Text style={[styles.shortcutText, { color: colors.textSecondary }]}>Dias úteis</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.shortcutButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => { hapticFeedback.light(); selectWeekends(); }}
            >
              <Text style={[styles.shortcutText, { color: colors.textSecondary }]}>Fins de semana</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* ===== CONTEÚDO: META DE FREQUÊNCIA ===== */}
      {activeMode === 'goal' && (
        <View style={styles.goalContainer}>
          {/* Seletor de período */}
          <View style={styles.goalPeriodRow}>
            {([
              { key: 'week' as FrequencyGoalPeriod, label: 'Semana' },
              { key: 'month' as FrequencyGoalPeriod, label: 'Mês' },
              { key: 'custom' as FrequencyGoalPeriod, label: 'Personalizado' },
            ]).map((option) => {
              const isSelected = frequencyGoalPeriod === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.goalPeriodOption,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    isSelected && { borderColor: colors.primary, backgroundColor: colors.primaryLight },
                  ]}
                  onPress={() => {
                    hapticFeedback.selection();
                    onFrequencyGoalPeriodChange(option.key);
                  }}
                >
                  <Text style={[
                    styles.goalPeriodText,
                    { color: colors.textSecondary },
                    isSelected && { color: colors.primary, fontWeight: '600' },
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Inputs de valor */}
          <View style={styles.goalInputRow}>
            <TextInput
              style={[styles.goalValueInput, {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.textPrimary,
              }]}
              placeholder="0"
              placeholderTextColor={colors.textTertiary}
              value={frequencyGoalValue > 0 ? frequencyGoalValue.toString() : ''}
              onChangeText={handleGoalValueChange}
              keyboardType="number-pad"
              maxLength={3}
            />
            <Text style={[styles.goalTimesLabel, { color: colors.textSecondary }]}>
              {frequencyGoalValue === 1 ? 'vez' : 'vezes'}
            </Text>

            {frequencyGoalPeriod === 'custom' ? (
              <>
                <Text style={[styles.goalInLabel, { color: colors.textSecondary }]}>em</Text>
                <TextInput
                  style={[styles.goalDaysInput, {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  }]}
                  placeholder="0"
                  placeholderTextColor={colors.textTertiary}
                  value={frequencyGoalCustomDays > 0 ? frequencyGoalCustomDays.toString() : ''}
                  onChangeText={handleCustomDaysChange}
                  keyboardType="number-pad"
                  maxLength={4}
                />
                <Text style={[styles.goalDaysLabel, { color: colors.textSecondary }]}>dias</Text>
              </>
            ) : (
              <Text style={[styles.goalPeriodLabel, { color: colors.textPrimary }]}>
                por {getGoalPeriodLabel()}
              </Text>
            )}
          </View>

          {/* Validação */}
          {frequencyGoalValue > 0 && frequencyGoalValue > getMaxForPeriod() && (
            <View style={[styles.warningContainer, { backgroundColor: colors.warningLight }]}>
              <Icon name="alertCircle" size={14} color={colors.warning} />
              <Text style={[styles.warningText, { color: colors.warning }]}>
                O valor não pode exceder {getMaxForPeriod()} para {getGoalPeriodLabel()}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* ===== PREVIEW ===== */}
      <View style={[styles.preview, { backgroundColor: colors.infoLight, borderLeftColor: colors.info }]}>
        <Text style={[styles.previewLabel, { color: colors.info }]}>Frequência:</Text>
        <Text style={[styles.previewText, { color: colors.info }]}>
          {activeMode === 'daily' && 'Todos os dias'}
          {activeMode === 'weekly' && (
            selectedDays.length === 7
              ? 'Todos os dias'
              : selectedDays.length === 0
                ? 'Nenhum dia selecionado'
                : `${selectedDays.length} ${selectedDays.length === 1 ? 'dia' : 'dias'} por semana`
          )}
          {activeMode === 'goal' && (
            isGoalValid
              ? `${frequencyGoalValue} ${frequencyGoalValue === 1 ? 'vez' : 'vezes'} por ${getGoalPeriodLabel()}`
              : 'Configure a meta acima'
          )}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 12 },

  // Mode selector
  modeSelector: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 2,
  },
  modeButtonText: { fontSize: 12, fontWeight: '600' },

  // Weekly days
  daysContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  dayButton: {
    width: '13%',
    aspectRatio: 1,
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayButtonText: { fontSize: 12, fontWeight: '600' },
  shortcuts: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  shortcutButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
  },
  shortcutText: { fontSize: 12, fontWeight: '500' },

  // Goal
  goalContainer: { gap: 12, marginBottom: 12 },
  goalPeriodRow: { flexDirection: 'row', gap: 8 },
  goalPeriodOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 2,
  },
  goalPeriodText: { fontSize: 12, fontWeight: '500' },
  goalInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  goalValueInput: {
    width: 60,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 18,
    fontWeight: '700',
    borderWidth: 1.5,
    textAlign: 'center',
  },
  goalTimesLabel: { fontSize: 15, fontWeight: '500' },
  goalInLabel: { fontSize: 15, fontWeight: '500' },
  goalDaysInput: {
    width: 64,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 18,
    fontWeight: '700',
    borderWidth: 1.5,
    textAlign: 'center',
  },
  goalDaysLabel: { fontSize: 15, fontWeight: '500' },
  goalPeriodLabel: { fontSize: 15, fontWeight: '600' },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  warningText: { fontSize: 12, fontWeight: '500', flex: 1 },

  // Preview
  preview: { padding: 12, borderRadius: 8, borderLeftWidth: 3 },
  previewLabel: { fontSize: 12, marginBottom: 4 },
  previewText: { fontSize: 14, fontWeight: '600' },
});