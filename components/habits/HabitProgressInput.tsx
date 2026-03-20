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
  const [scaleAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      // Pré-preencher com o valor atual (0 se não tiver nada)
      setInputValue(currentValue > 0 ? String(currentValue) : '');
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
    if (!inputValue || isNaN(value) || value < 0) return;
    // Sempre substitui — o usuário edita o valor diretamente
    onConfirm(value, 'replace');
  };

  const getFinalValue = (): number => {
    const value = parseFloat(inputValue);
    if (!inputValue || isNaN(value)) return 0;
    return value;
  };

  const getProgressPercentage = (): number => {
    return Math.min((getFinalValue() / targetValue) * 100, 100);
  };

  const getProgressColor = (): string => {
    const percentage = getProgressPercentage();
    if (percentage >= 100) return colors.success;
    if (percentage >= 80) return colors.primary;
    if (percentage >= 50) return colors.warning;
    return colors.textSecondary;
  };

  const isValid = (): boolean => {
    const value = parseFloat(inputValue);
    return inputValue !== '' && !isNaN(value) && value >= 0;
  };

  if (!visible) return null;

  const finalValue = getFinalValue();
  const percentage = getProgressPercentage();

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
            { backgroundColor: colors.background, transform: [{ scale: scaleAnim }] },
          ]}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                {currentValue > 0 ? 'Atualizar Progresso' : 'Registrar Progresso'}
              </Text>
              <Text style={[styles.habitName, { color: colors.textSecondary }]}>
                {habitName}
              </Text>
            </View>

            {/* Content */}
            <View style={styles.content}>

              {/* Input — pré-preenchido com valor atual */}
              <View style={[styles.inputContainer, {
                backgroundColor: colors.surface,
                borderColor: colors.border,
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
                  selectTextOnFocus
                />
                <Text style={[styles.unit, { color: colors.textSecondary }]}>
                  {targetUnit}
                </Text>
              </View>

              {/* Meta do dia */}
              <View style={[styles.targetInfo, {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              }]}>
                <Text style={[styles.targetLabel, { color: colors.textSecondary }]}>
                  Meta do dia:
                </Text>
                <Text style={[styles.targetValue, { color: colors.textPrimary }]}>
                  {targetValue} {targetUnit}
                </Text>
              </View>

              {/* Barra de progresso */}
              {inputValue !== '' && (
                <View style={styles.progressContainer}>
                  <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${percentage}%`,
                          backgroundColor: getProgressColor(),
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.progressText, { color: getProgressColor() }]}>
                    {finalValue} {targetUnit} • {percentage.toFixed(0)}% da meta
                  </Text>
                </View>
              )}

              {/* Badge de conquista */}
              {percentage >= 100 && (
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
  targetLabel: { fontSize: 14 },
  targetValue: { fontSize: 16, fontWeight: '600' },
  progressContainer: { marginBottom: 8 },
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
  achievementText: { fontSize: 14, fontWeight: '600' },
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
  cancelText: { fontSize: 16, fontWeight: '600' },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmText: { fontSize: 16, fontWeight: '600' },
});