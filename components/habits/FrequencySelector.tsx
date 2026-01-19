// components/habits/FrequencySelector.tsx
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type FrequencyType = 'daily' | 'weekly' | 'custom';

interface FrequencySelectorProps {
  frequencyType: FrequencyType;
  selectedDays: number[];
  onFrequencyTypeChange: (type: FrequencyType) => void;
  onDaysChange: (days: number[]) => void;
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
}: FrequencySelectorProps) {
  const { colors } = useTheme();
  
  const toggleDay = (dayId: number) => {
    if (selectedDays.includes(dayId)) {
      onDaysChange(selectedDays.filter(d => d !== dayId));
    } else {
      onDaysChange([...selectedDays, dayId].sort());
    }
  };

  const selectAllDays = () => {
    onDaysChange([0, 1, 2, 3, 4, 5, 6]);
  };

  const selectWeekdays = () => {
    onDaysChange([1, 2, 3, 4, 5]);
  };

  const selectWeekends = () => {
    onDaysChange([0, 6]);
  };

  return (
    <View style={styles.container}>
      {/* Seletor de Tipo */}
      <View style={styles.typeSelector}>
        <TouchableOpacity
          style={[
            styles.typeButton,
            { borderColor: colors.border, backgroundColor: colors.surface },
            frequencyType === 'daily' && { 
              backgroundColor: colors.primaryLight,
              borderColor: colors.primary 
            },
          ]}
          onPress={() => {
            onFrequencyTypeChange('daily');
            onDaysChange([0, 1, 2, 3, 4, 5, 6]);
          }}
        >
          <Icon 
            name="calendar" 
            size={16} 
            color={frequencyType === 'daily' ? colors.primary : colors.textSecondary} 
          />
          <Text style={[
            styles.typeButtonText,
            { color: colors.textSecondary },
            frequencyType === 'daily' && { color: colors.primary },
          ]}>
            Diário
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.typeButton,
            { borderColor: colors.border, backgroundColor: colors.surface },
            frequencyType === 'weekly' && { 
              backgroundColor: colors.primaryLight,
              borderColor: colors.primary 
            },
          ]}
          onPress={() => {
            onFrequencyTypeChange('weekly');
            if (selectedDays.length === 7) {
              onDaysChange([1, 2, 3, 4, 5]);
            }
          }}
        >
          <Icon 
            name="calendar" 
            size={16} 
            color={frequencyType === 'weekly' ? colors.primary : colors.textSecondary} 
          />
          <Text style={[
            styles.typeButtonText,
            { color: colors.textSecondary },
            frequencyType === 'weekly' && { color: colors.primary },
          ]}>
            Semanal
          </Text>
        </TouchableOpacity>
      </View>

      {/* Seleção de Dias da Semana */}
      {frequencyType === 'weekly' && (
        <>
          <View style={styles.daysContainer}>
            {WEEKDAYS.map((day) => (
              <TouchableOpacity
                key={day.id}
                style={[
                  styles.dayButton,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  selectedDays.includes(day.id) && { 
                    backgroundColor: colors.primary,
                    borderColor: colors.primary 
                  },
                ]}
                onPress={() => toggleDay(day.id)}
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

          {/* Atalhos */}
          <View style={styles.shortcuts}>
            <TouchableOpacity
              style={[styles.shortcutButton, { 
                backgroundColor: colors.surface,
                borderColor: colors.border 
              }]}
              onPress={selectAllDays}
            >
              <Text style={[styles.shortcutText, { color: colors.textSecondary }]}>
                Todos
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.shortcutButton, { 
                backgroundColor: colors.surface,
                borderColor: colors.border 
              }]}
              onPress={selectWeekdays}
            >
              <Text style={[styles.shortcutText, { color: colors.textSecondary }]}>
                Dias úteis
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.shortcutButton, { 
                backgroundColor: colors.surface,
                borderColor: colors.border 
              }]}
              onPress={selectWeekends}
            >
              <Text style={[styles.shortcutText, { color: colors.textSecondary }]}>
                Fins de semana
              </Text>
            </TouchableOpacity>
          </View>

          {/* Preview */}
          <View style={[styles.preview, { 
            backgroundColor: colors.infoLight,
            borderLeftColor: colors.info 
          }]}>
            <Text style={[styles.previewLabel, { color: colors.info }]}>
              Frequência:
            </Text>
            <Text style={[styles.previewText, { color: colors.info }]}>
              {selectedDays.length === 7
                ? 'Todos os dias'
                : selectedDays.length === 0
                ? 'Nenhum dia selecionado'
                : selectedDays.length === 1
                ? `1 dia por semana`
                : `${selectedDays.length} dias por semana`}
            </Text>
          </View>
        </>
      )}

      {/* Preview para Daily */}
      {frequencyType === 'daily' && (
        <View style={[styles.preview, { 
          backgroundColor: colors.infoLight,
          borderLeftColor: colors.info 
        }]}>
          <Text style={[styles.previewLabel, { color: colors.info }]}>
            Frequência:
          </Text>
          <Text style={[styles.previewText, { color: colors.info }]}>
            Todos os dias da semana
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 12 },
  typeSelector: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 2,
  },
  typeButtonText: { fontSize: 14, fontWeight: '600' },
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
  preview: {
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
  },
  previewLabel: { fontSize: 12, marginBottom: 4 },
  previewText: { fontSize: 14, fontWeight: '600' },
});