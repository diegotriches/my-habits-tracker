// app/habits/edit/[id].tsx
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Switch,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Icon } from '@/components/ui/Icon';
import { CompactColorSelector } from '@/components/habits/CompactColorSelector';
import { HABIT_COLORS } from '@/constants/GameConfig';
import { useHabits } from '@/hooks/useHabits';
import { useAuth } from '@/hooks/useAuth';
import { Habit } from '@/types/database';
import { hapticFeedback } from '@/utils/haptics';
import { useTheme } from '../../../contexts/ThemeContext';

export default function EditHabitScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { getHabit, updateHabit } = useHabits();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Estados básicos
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [habitType, setHabitType] = useState<'positive' | 'negative'>('positive');
  const [selectedColor, setSelectedColor] = useState<string>(HABIT_COLORS[0]);
  
  // Estados de meta numérica
  const [hasTarget, setHasTarget] = useState(false);
  const [targetValue, setTargetValue] = useState('');
  const [targetUnit, setTargetUnit] = useState('');

  useEffect(() => {
    loadHabit();
  }, [id]);

  const loadHabit = async () => {
    const { data, error } = await getHabit(id as string);
    
    if (error || !data) {
      Alert.alert('Erro', 'Não foi possível carregar o hábito');
      router.back();
      return;
    }

    const habitData = data as Habit;

    setName(habitData.name);
    setDescription(habitData.description || '');
    setHabitType(habitData.type);
    setSelectedColor(habitData.color);
    
    // Carregar dados de meta
    setHasTarget(habitData.has_target);
    
    if (habitData.has_target) {
      setTargetValue(habitData.target_value?.toString() || '');
      setTargetUnit(habitData.target_unit || '');
    }

    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Erro', 'Digite um nome para o hábito');
      return;
    }

    if (hasTarget) {
      if (!targetValue || parseFloat(targetValue) <= 0) {
        Alert.alert('Erro', 'Digite um valor de meta válido');
        return;
      }
      if (!targetUnit.trim()) {
        Alert.alert('Erro', 'Digite uma unidade para a meta');
        return;
      }
    }

    if (!user?.id) {
      Alert.alert('Erro', 'Usuário não autenticado');
      return;
    }

    hapticFeedback.medium();
    setSaving(true);

    try {
      const updates: any = {
        name: name.trim(),
        description: description.trim() || null,
        color: selectedColor,
        has_target: hasTarget,
        target_value: hasTarget ? parseFloat(targetValue) : null,
        target_unit: hasTarget ? targetUnit.trim() : null,
      };

      const { error: habitError } = await updateHabit(id as string, updates);

      if (habitError) {
        setSaving(false);
        Alert.alert('Erro', habitError);
        return;
      }

      setSaving(false);
      hapticFeedback.success();

      Alert.alert('Sucesso!', 'Hábito atualizado com sucesso!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      setSaving(false);
      console.error('Erro ao salvar:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao salvar o hábito');
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const isNegative = habitType === 'negative';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.cancelButton, { color: colors.textSecondary }]}>Cancelar</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Editar Hábito</Text>
        <TouchableOpacity onPress={handleSubmit} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={[styles.saveButton, { color: colors.primary }]}>Salvar</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* TIPO DE HÁBITO (SOMENTE LEITURA) */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Tipo de Hábito</Text>
          <View style={[
            styles.typeIndicator,
            { 
              backgroundColor: isNegative ? colors.warningLight : colors.successLight,
              borderColor: isNegative ? colors.warning : colors.success,
            }
          ]}>
            <Icon 
              name={isNegative ? "xCircle" : "check"} 
              size={20} 
              color={isNegative ? colors.warning : colors.success} 
            />
            <View style={{ flex: 1 }}>
              <Text style={[
                styles.typeLabel,
                { color: isNegative ? colors.warning : colors.success }
              ]}>
                {isNegative ? 'Hábito Negativo' : 'Hábito Positivo'}
              </Text>
              <Text style={[styles.typeDescription, { color: colors.textSecondary }]}>
                {isNegative 
                  ? 'Evitar algo que você quer parar de fazer'
                  : 'Criar um novo hábito saudável'}
              </Text>
            </View>
            <View style={[styles.lockBadge, { backgroundColor: colors.surface }]}>
              <Icon name="lock" size={12} color={colors.textTertiary} />
            </View>
          </View>
          <Text style={[styles.helperText, { color: colors.textTertiary }]}>
            O tipo de hábito não pode ser alterado após a criação
          </Text>
        </View>

        {/* Nome */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Nome do Hábito *</Text>
          <TextInput
            style={[styles.input, { 
              backgroundColor: colors.surface,
              borderColor: colors.border,
              color: colors.textPrimary 
            }]}
            placeholder={
              isNegative 
                ? "Ex: Não fumar, Evitar doces..." 
                : "Ex: Meditar, Ler, Exercitar..."
            }
            placeholderTextColor={colors.textTertiary}
            value={name}
            onChangeText={setName}
            maxLength={50}
          />
        </View>

        {/* Descrição */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Descrição (opcional)</Text>
          <TextInput
            style={[styles.input, styles.textArea, { 
              backgroundColor: colors.surface,
              borderColor: colors.border,
              color: colors.textPrimary 
            }]}
            placeholder={
              isNegative
                ? "Por que você quer evitar isso?"
                : "Adicione detalhes sobre seu hábito..."
            }
            placeholderTextColor={colors.textTertiary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            maxLength={200}
          />
        </View>

        {/* META NUMÉRICA */}
        <View style={styles.section}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: colors.textPrimary, marginBottom: 4 }]}>
                Tem meta numérica?
              </Text>
              <Text style={[styles.helperText, { color: colors.textTertiary, marginBottom: 0 }]}>
                {hasTarget 
                  ? 'Você pode alterar o valor da meta a qualquer momento'
                  : 'Permite acompanhar progresso com valores'
                }
              </Text>
            </View>
            <Switch
              value={hasTarget}
              onValueChange={(value) => {
                hapticFeedback.selection();
                setHasTarget(value);
                if (!value) {
                  setTargetValue('');
                  setTargetUnit('');
                }
              }}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.background}
            />
          </View>

          {hasTarget && (
            <View style={styles.targetInputs}>
              <View style={styles.targetValueContainer}>
                <Text style={[styles.targetLabel, { color: colors.textSecondary }]}>Valor *</Text>
                <TextInput
                  style={[styles.targetInput, { 
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.textPrimary 
                  }]}
                  placeholder="2"
                  placeholderTextColor={colors.textTertiary}
                  value={targetValue}
                  onChangeText={setTargetValue}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.targetUnitContainer}>
                <Text style={[styles.targetLabel, { color: colors.textSecondary }]}>Unidade *</Text>
                <TextInput
                  style={[styles.targetInput, { 
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.textPrimary 
                  }]}
                  placeholder="litros"
                  placeholderTextColor={colors.textTertiary}
                  value={targetUnit}
                  onChangeText={setTargetUnit}
                  maxLength={20}
                />
              </View>
            </View>
          )}
        </View>

        {/* Cor Compacta */}
        <View style={styles.section}>
          <CompactColorSelector
            selectedColor={selectedColor}
            onColorSelect={(color) => {
              hapticFeedback.selection();
              setSelectedColor(color);
            }}
          />
        </View>

        {/* Dica sobre notificações */}
        <View style={[styles.tipCard, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
          <Icon name="bell" size={16} color={colors.primary} />
          <Text style={[styles.tipText, { color: colors.primary }]}>
            <Text style={styles.tipBold}>Dica:</Text> Configure lembretes e alertas na página de detalhes do hábito após salvar!
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  cancelButton: { fontSize: 16 },
  saveButton: { fontSize: 16, fontWeight: '600' },
  content: { flex: 1, padding: 16 },
  section: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  helperText: { fontSize: 12, marginTop: 4 },
  typeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  typeLabel: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  typeDescription: { fontSize: 12 },
  lockBadge: { padding: 6, borderRadius: 6 },
  input: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
  },
  textArea: { height: 70, textAlignVertical: 'top' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 12,
  },
  targetInputs: { flexDirection: 'row', gap: 12, marginTop: 12 },
  targetValueContainer: { flex: 1 },
  targetUnitContainer: { flex: 2 },
  targetLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  targetInput: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
  },
  tipText: { flex: 1, fontSize: 13, lineHeight: 19 },
  tipBold: { fontWeight: '700' },
});