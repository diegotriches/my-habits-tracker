// components/habits/HabitProgressInput.tsx
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import React, { useEffect, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface HabitProgressInputProps {
  visible: boolean;
  habitName: string;
  targetValue: number;
  targetUnit: string;
  currentValue?: number;
  onConfirm: (achievedValue: number, mode: 'add' | 'replace') => void;
  onCancel: () => void;
}

export function HabitProgressInput({
  visible,
  habitName,
  targetValue,
  targetUnit,
  currentValue = 0,
  onConfirm,
  onCancel,
}: HabitProgressInputProps) {
  const { colors } = useTheme();
  const [inputValue, setInputValue] = useState('');
  const [mode, setMode] = useState<'add' | 'replace'>('add');
  const [scaleAnim] = useState(new Animated.Value(0));

  const hasCurrentValue = currentValue > 0;

  useEffect(() => {
    if (visible) {
      setInputValue('');
      setMode('add');
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
      }).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible]);

  const handleValueChange = (text: string) => {
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    
    if (parts.length > 2) return;
    if (parts.length === 2 && parts[1].length > 2) return;

    setInputValue(cleaned);
  };

  const handleConfirm = () => {
    const value = parseFloat(inputValue);
    if (!inputValue || isNaN(value) || value <= 0) {
      return;
    }
    onConfirm(value, mode);
  };

  const getFinalValue = () => {
    const value = parseFloat(inputValue);
    if (!inputValue || isNaN(value)) return currentValue;
    
    if (mode === 'add') {
      return currentValue + value;
    }
    return value;
  };

  const getProgressPercentage = () => {
    const finalValue = getFinalValue();
    return Math.min((finalValue / targetValue) * 100, 100);
  };

  const getProgressColor = () => {
    const percentage = getProgressPercentage();
    if (percentage >= 100) return colors.success;
    if (percentage >= 80) return colors.primary;
    if (percentage >= 50) return colors.warning;
    return colors.textSecondary;
  };

  const isValid = () => {
    const value = parseFloat(inputValue);
    return inputValue && !isNaN(value) && value > 0;
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Animated.View 
          style={[
            styles.modalContainer,
            { backgroundColor: colors.background, transform: [{ scale: scaleAnim }] }
          ]}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                {hasCurrentValue ? 'Atualizar Progresso' : 'Registrar Progresso'}
              </Text>
              <Text style={[styles.habitName, { color: colors.textSecondary }]}>
                {habitName}
              </Text>
            </View>

            {/* Content */}
            <View style={styles.content}>
              {/* Valor Atual */}
              {hasCurrentValue && (
                <View style={[styles.currentValueCard, { 
                  backgroundColor: colors.infoLight,
                  borderColor: colors.info 
                }]}>
                  <Text style={[styles.currentValueLabel, { color: colors.info }]}>
                    Progresso atual:
                  </Text>
                  <Text style={[styles.currentValueText, { color: colors.info }]}>
                    {currentValue} {targetUnit}
                  </Text>
                  <View style={[styles.currentProgressBar, { backgroundColor: colors.primaryLight }]}>
                    <View 
                      style={[
                        styles.currentProgressFill,
                        { 
                          width: `${Math.min((currentValue / targetValue) * 100, 100)}%`,
                          backgroundColor: colors.primary,
                        }
                      ]}
                    />
                  </View>
                </View>
              )}

              {/* Modo: Adicionar ou Substituir */}
              {hasCurrentValue && (
                <View style={styles.modeSelector}>
                  <TouchableOpacity
                    style={[
                      styles.modeButton,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                      mode === 'add' && { 
                        backgroundColor: colors.primaryLight,
                        borderColor: colors.primary 
                      },
                    ]}
                    onPress={() => setMode('add')}
                  >
                    <Icon name="add" size={16} color={mode === 'add' ? colors.primary : colors.textSecondary} />
                    <Text style={[
                      styles.modeButtonText,
                      { color: colors.textSecondary },
                      mode === 'add' && { color: colors.primary },
                    ]}>
                      Adicionar
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.modeButton,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                      mode === 'replace' && { 
                        backgroundColor: colors.primaryLight,
                        borderColor: colors.primary 
                      },
                    ]}
                    onPress={() => setMode('replace')}
                  >
                    <Icon name="refresh" size={16} color={mode === 'replace' ? colors.primary : colors.textSecondary} />
                    <Text style={[
                      styles.modeButtonText,
                      { color: colors.textSecondary },
                      mode === 'replace' && { color: colors.primary },
                    ]}>
                      Substituir
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Input */}
              <View style={[styles.inputContainer, { 
                backgroundColor: colors.surface,
                borderColor: colors.border 
              }]}>
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  placeholder="0"
                  placeholderTextColor={colors.textTertiary}
                  value={inputValue}
                  onChangeText={handleValueChange}
                  keyboardType="decimal-pad"
                  maxLength={8}
                  autoFocus
                />
                <Text style={[styles.unit, { color: colors.textSecondary }]}>
                  {targetUnit}
                </Text>
              </View>

              {/* Preview do cálculo */}
              {hasCurrentValue && mode === 'add' && inputValue && (
                <View style={[styles.calculationPreview, { backgroundColor: colors.successLight }]}>
                  <Text style={[styles.calculationText, { color: colors.success }]}>
                    {currentValue} + {inputValue} = {getFinalValue()} {targetUnit}
                  </Text>
                </View>
              )}

              {/* Meta */}
              <View style={[styles.targetInfo, { 
                backgroundColor: colors.surface,
                borderColor: colors.border 
              }]}>
                <Text style={[styles.targetLabel, { color: colors.textSecondary }]}>
                  Meta do dia:
                </Text>
                <Text style={[styles.targetValue, { color: colors.textPrimary }]}>
                  {targetValue} {targetUnit}
                </Text>
              </View>

              {/* Barra de Progresso */}
              {inputValue && (
                <View style={styles.progressContainer}>
                  <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                    <View 
                      style={[
                        styles.progressFill,
                        { 
                          width: `${getProgressPercentage()}%`,
                          backgroundColor: getProgressColor(),
                        }
                      ]}
                    />
                  </View>
                  <Text style={[styles.progressText, { color: getProgressColor() }]}>
                    {getFinalValue().toFixed(1)} {targetUnit} • {getProgressPercentage().toFixed(0)}% da meta
                  </Text>
                </View>
              )}

              {/* Badge de conquista */}
              {getProgressPercentage() >= 100 && (
                <View style={[styles.achievementBadge, { backgroundColor: colors.successLight }]}>
                  <Icon name="sparkles" size={20} color={colors.success} />
                  <Text style={[styles.achievementText, { color: colors.success }]}>
                    Meta atingida!
                  </Text>
                </View>
              )}
            </View>

            {/* Botões */}
            <View style={[styles.buttons, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: colors.surface }]}
                onPress={onCancel}
              >
                <Text style={[styles.cancelText, { color: colors.textSecondary }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  { backgroundColor: colors.primary },
                  !isValid() && { backgroundColor: colors.border },
                ]}
                onPress={handleConfirm}
                disabled={!isValid()}
              >
                <Text style={[
                  styles.confirmText,
                  { color: colors.textInverse },
                  !isValid() && { color: colors.textDisabled },
                ]}>
                  Confirmar
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    padding: 24,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  habitName: {
    fontSize: 14,
  },
  content: {
    padding: 24,
  },
  currentValueCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  currentValueLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  currentValueText: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  currentProgressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  currentProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  modeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 2,
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  calculationPreview: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  calculationText: {
    fontSize: 14,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 2,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    fontSize: 32,
    fontWeight: '700',
  },
  unit: {
    fontSize: 20,
    fontWeight: '600',
    marginLeft: 8,
  },
  targetInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  targetLabel: {
    fontSize: 14,
  },
  targetValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressContainer: {
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  achievementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
  },
  achievementText: {
    fontSize: 14,
    fontWeight: '600',
  },
  buttons: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmText: {
    fontSize: 16,
    fontWeight: '600',
  },
});