// components/habits/TargetInput.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Pressable,
} from 'react-native';
import { useTheme } from '@/app/contexts/ThemeContext';
import { Icon } from '@/components/ui/Icon';

interface TargetInputProps {
  value: string;
  unit: string;
  onValueChange: (value: string) => void;
  onUnitChange: (unit: string) => void;
  availableUnits: string[];
}

export function TargetInput({
  value,
  unit,
  onValueChange,
  onUnitChange,
  availableUnits,
}: TargetInputProps) {
  const { colors } = useTheme();
  const [showUnitPicker, setShowUnitPicker] = useState(false);

  const popularUnits = [
    'litros', 'km', 'minutos', 'horas', 'páginas', 'vezes'
  ];

  const otherUnits = availableUnits.filter(u => !popularUnits.includes(u));

  const handleValueChange = (text: string) => {
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    if (parts.length === 2 && parts[1].length > 2) return;

    onValueChange(cleaned);
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        {/* Input de Valor */}
        <View style={styles.valueContainer}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
            Valor
          </Text>
          <TextInput
            style={[styles.valueInput, { 
              backgroundColor: colors.surface,
              borderColor: colors.border,
              color: colors.textPrimary 
            }]}
            placeholder="0"
            placeholderTextColor={colors.textTertiary}
            value={value}
            onChangeText={handleValueChange}
            keyboardType="decimal-pad"
            maxLength={8}
          />
        </View>

        {/* Seletor de Unidade */}
        <View style={styles.unitContainer}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
            Unidade
          </Text>
          <TouchableOpacity
            style={[styles.unitButton, { 
              backgroundColor: colors.surface,
              borderColor: colors.border 
            }]}
            onPress={() => setShowUnitPicker(true)}
          >
            <Text style={[
              styles.unitButtonText,
              { color: unit ? colors.textPrimary : colors.textTertiary }
            ]}>
              {unit || 'Selecione'}
            </Text>
            <Icon name="chevronDown" size={12} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Preview da Meta */}
      {value && unit && (
        <View style={[styles.preview, { 
          backgroundColor: colors.successLight,
          borderColor: colors.success 
        }]}>
          <Text style={[styles.previewLabel, { color: colors.success }]}>
            Meta diária:
          </Text>
          <Text style={[styles.previewValue, { color: colors.success }]}>
            {value} {unit}
          </Text>
        </View>
      )}

      {/* Modal de Seleção de Unidade */}
      <Modal
        visible={showUnitPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowUnitPicker(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowUnitPicker(false)}
        >
          <Pressable 
            style={[styles.modalContent, { backgroundColor: colors.background }]} 
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Selecionar Unidade
              </Text>
              <TouchableOpacity onPress={() => setShowUnitPicker(false)}>
                <Icon name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.unitList} showsVerticalScrollIndicator={false}>
              {/* Unidades Populares */}
              <View style={styles.unitSection}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                  Mais Usadas
                </Text>
                <View style={styles.unitGrid}>
                  {popularUnits.map((u) => (
                    <TouchableOpacity
                      key={u}
                      style={[
                        styles.unitOption,
                        { backgroundColor: colors.surface, borderColor: colors.border },
                        unit === u && { 
                          backgroundColor: colors.primaryLight,
                          borderColor: colors.primary 
                        },
                      ]}
                      onPress={() => {
                        onUnitChange(u);
                        setShowUnitPicker(false);
                      }}
                    >
                      <Text style={[
                        styles.unitOptionText,
                        { color: colors.textSecondary },
                        unit === u && { color: colors.primary, fontWeight: '600' },
                      ]}>
                        {u}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Outras Unidades */}
              {otherUnits.length > 0 && (
                <View style={styles.unitSection}>
                  <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                    Outras
                  </Text>
                  <View style={styles.unitGrid}>
                    {otherUnits.map((u) => (
                      <TouchableOpacity
                        key={u}
                        style={[
                          styles.unitOption,
                          { backgroundColor: colors.surface, borderColor: colors.border },
                          unit === u && { 
                            backgroundColor: colors.primaryLight,
                            borderColor: colors.primary 
                          },
                        ]}
                        onPress={() => {
                          onUnitChange(u);
                          setShowUnitPicker(false);
                        }}
                      >
                        <Text style={[
                          styles.unitOptionText,
                          { color: colors.textSecondary },
                          unit === u && { color: colors.primary, fontWeight: '600' },
                        ]}>
                          {u}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 12 },
  inputRow: { flexDirection: 'row', gap: 12 },
  valueContainer: { flex: 1 },
  unitContainer: { flex: 1.5 },
  inputLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  valueInput: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '600',
    borderWidth: 1,
  },
  unitButton: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  unitButtonText: { fontSize: 16, fontWeight: '500' },
  preview: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewLabel: { fontSize: 14 },
  previewValue: { fontSize: 14, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: '600' },
  unitList: { padding: 20 },
  unitSection: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  unitGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  unitOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  unitOptionText: { fontSize: 14, fontWeight: '500' },
});