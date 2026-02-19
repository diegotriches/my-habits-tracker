// app/habits/edit/[id].tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Icon } from '@/components/ui/Icon';
import { CompactColorSelector } from '@/components/habits/CompactColorSelector';
import { FrequencySelector } from '@/components/habits/FrequencySelector';
import { TargetInput } from '@/components/habits/TargetInput';
import { HABIT_COLORS } from '@/constants/GameConfig';
import { useHabits } from '@/hooks/useHabits';
import { useAuth } from '@/hooks/useAuth';
import { Habit, FrequencyGoalPeriod } from '@/types/database';
import { hapticFeedback } from '@/utils/haptics';
import { useTheme } from '../../../contexts/ThemeContext';

const TARGET_UNITS = {
  volume: ['litros', 'ml', 'copos'],
  distance: ['km', 'metros', 'passos'],
  time: ['horas', 'minutos'],
  count: ['páginas', 'exercícios', 'vezes', 'unidades'],
  weight: ['kg', 'gramas'],
};

export default function EditHabitScreen() {
  const { colors } = useTheme();
  const screenHeight = Dimensions.get('window').height;
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { getHabit, updateHabit } = useHabits();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Basic state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [habitType, setHabitType] = useState<'positive' | 'negative'>('positive');
  const [selectedColor, setSelectedColor] = useState<string>(HABIT_COLORS[0]);

  // Target
  const [hasTarget, setHasTarget] = useState(false);
  const [targetValue, setTargetValue] = useState('');
  const [targetUnit, setTargetUnit] = useState('');

  // Frequency
  const [frequencyType, setFrequencyType] = useState<'daily' | 'weekly' | 'custom'>('daily');
  const [frequencyDays, setFrequencyDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [hasFrequencyGoal, setHasFrequencyGoal] = useState(false);
  const [frequencyGoalValue, setFrequencyGoalValue] = useState(0);
  const [frequencyGoalPeriod, setFrequencyGoalPeriod] = useState<FrequencyGoalPeriod>('week');
  const [frequencyGoalCustomDays, setFrequencyGoalCustomDays] = useState(0);

  // Modals
  const [showFrequencyModal, setShowFrequencyModal] = useState(false);
  const [showTargetModal, setShowTargetModal] = useState(false);

  // Snapshots for cancel
  const frequencySnapshot = useRef<any>(null);
  const targetSnapshot = useRef<any>(null);

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

    const h = data as Habit;

    setName(h.name);
    setDescription(h.description || '');
    setHabitType(h.type);
    setSelectedColor(h.color);

    // Target
    setHasTarget(h.has_target);
    if (h.has_target) {
      setTargetValue(h.target_value?.toString() || '');
      setTargetUnit(h.target_unit || '');
    }

    // Frequency
    setFrequencyType(h.frequency_type || 'daily');
    setFrequencyDays(h.frequency_days || [0, 1, 2, 3, 4, 5, 6]);

    const goalValue = (h as any).frequency_goal_value;
    const goalPeriod = (h as any).frequency_goal_period;
    const goalCustomDays = (h as any).frequency_goal_custom_days;

    if (goalValue && goalValue > 0) {
      setHasFrequencyGoal(true);
      setFrequencyGoalValue(goalValue);
      setFrequencyGoalPeriod(goalPeriod || 'week');
      setFrequencyGoalCustomDays(goalCustomDays || 0);
    }

    setLoading(false);
  };

  // ===== SUMMARIES =====

  const getFrequencySummary = (): string => {
    if (hasFrequencyGoal) {
      const periodLabel = frequencyGoalPeriod === 'week' ? 'semana'
        : frequencyGoalPeriod === 'month' ? 'mês'
        : `${frequencyGoalCustomDays || '?'} dias`;
      return frequencyGoalValue > 0
        ? `${frequencyGoalValue}x por ${periodLabel}`
        : 'Meta personalizada';
    }
    if (frequencyType === 'weekly') {
      if (frequencyDays.length === 7) return 'Todos os dias';
      if (frequencyDays.length === 0) return 'Nenhum dia';
      const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      if (frequencyDays.length <= 3) {
        return frequencyDays.map(d => dayLabels[d]).join(', ');
      }
      return `${frequencyDays.length} dias/semana`;
    }
    return 'Todos os dias';
  };

  const getTargetSummary = (): string => {
    if (!hasTarget) return 'Desativada';
    if (targetValue && targetUnit) return `${targetValue} ${targetUnit}/dia`;
    return 'Configurar...';
  };

  // ===== MODAL HANDLERS =====

  const openFrequencyModal = () => {
    frequencySnapshot.current = {
      frequencyType, frequencyDays: [...frequencyDays],
      hasFrequencyGoal, frequencyGoalValue, frequencyGoalPeriod, frequencyGoalCustomDays,
    };
    hapticFeedback.light();
    setShowFrequencyModal(true);
  };

  const cancelFrequencyModal = () => {
    if (frequencySnapshot.current) {
      const s = frequencySnapshot.current;
      setFrequencyType(s.frequencyType);
      setFrequencyDays(s.frequencyDays);
      setHasFrequencyGoal(s.hasFrequencyGoal);
      setFrequencyGoalValue(s.frequencyGoalValue);
      setFrequencyGoalPeriod(s.frequencyGoalPeriod);
      setFrequencyGoalCustomDays(s.frequencyGoalCustomDays);
    }
    setShowFrequencyModal(false);
  };

  const confirmFrequencyModal = () => {
    frequencySnapshot.current = null;
    setShowFrequencyModal(false);
  };

  const openTargetModal = () => {
    targetSnapshot.current = { hasTarget, targetValue, targetUnit };
    hapticFeedback.light();
    setShowTargetModal(true);
  };

  const cancelTargetModal = () => {
    if (targetSnapshot.current) {
      const s = targetSnapshot.current;
      setHasTarget(s.hasTarget);
      setTargetValue(s.targetValue);
      setTargetUnit(s.targetUnit);
    }
    setShowTargetModal(false);
  };

  const confirmTargetModal = () => {
    targetSnapshot.current = null;
    setShowTargetModal(false);
  };

  // ===== VALIDATION & SUBMIT =====

  const getMaxForPeriod = (): number => {
    switch (frequencyGoalPeriod) {
      case 'week': return 7;
      case 'month': return 31;
      case 'custom': return frequencyGoalCustomDays || 9999;
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Erro', 'Digite um nome para o hábito');
      return;
    }

    if (hasTarget) {
      const val = parseFloat(targetValue);
      if (!targetValue || isNaN(val) || val <= 0) {
        Alert.alert('Erro', 'Digite um valor de meta válido');
        return;
      }
      if (!targetUnit.trim()) {
        Alert.alert('Erro', 'Selecione uma unidade para a meta');
        return;
      }
    }

    if (hasFrequencyGoal) {
      if (frequencyGoalValue <= 0) {
        Alert.alert('Erro', 'Digite quantas vezes para a meta de frequência');
        return;
      }
      if (frequencyGoalValue > getMaxForPeriod()) {
        Alert.alert('Erro', `A meta não pode exceder ${getMaxForPeriod()} vezes neste período`);
        return;
      }
    }

    if (!hasFrequencyGoal && frequencyType === 'weekly' && frequencyDays.length === 0) {
      Alert.alert('Erro', 'Selecione pelo menos um dia da semana');
      return;
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
        frequency_type: frequencyType,
        frequency_days: frequencyType === 'weekly' ? frequencyDays : null,
        frequency_goal_value: hasFrequencyGoal ? frequencyGoalValue : null,
        frequency_goal_period: hasFrequencyGoal ? frequencyGoalPeriod : null,
        frequency_goal_custom_days: hasFrequencyGoal && frequencyGoalPeriod === 'custom'
          ? frequencyGoalCustomDays : null,
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
      Alert.alert('Erro', 'Ocorreu um erro ao salvar o hábito');
    }
  };

  const getAllUnits = () => Object.values(TARGET_UNITS).flat();

  // ===== BOTTOM SHEET MODAL =====

  const BottomSheetModal = ({
    visible, onCancel, onConfirm, title, children,
  }: {
    visible: boolean; onCancel: () => void; onConfirm: () => void; title: string; children: React.ReactNode;
  }) => (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onCancel}>
      <View style={styles.modalOverlay}>
        <Pressable style={{ flex: 1 }} onPress={onCancel} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHandle}>
              <View style={[styles.modalHandleBar, { backgroundColor: colors.border }]} />
            </View>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{title}</Text>
              <TouchableOpacity onPress={onCancel} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Icon name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={{ maxHeight: screenHeight * 0.55 }}
              contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              bounces={false}
            >
              {children}
            </ScrollView>
            <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity style={[styles.modalConfirmButton, { backgroundColor: colors.primary }]} onPress={onConfirm}>
                <Text style={styles.modalConfirmText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );

  // ===== RENDER =====

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
      {/* HEADER */}
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

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* TIPO (somente leitura) */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Tipo de Hábito</Text>
          <View style={[
            styles.typeIndicator,
            {
              backgroundColor: isNegative ? colors.warningLight : colors.successLight,
              borderColor: isNegative ? colors.warning : colors.success,
            }
          ]}>
            <Icon name={isNegative ? "xCircle" : "check"} size={20} color={isNegative ? colors.warning : colors.success} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.typeLabel, { color: isNegative ? colors.warning : colors.success }]}>
                {isNegative ? 'Hábito Negativo' : 'Hábito Positivo'}
              </Text>
              <Text style={[styles.typeDescription, { color: colors.textSecondary }]}>
                {isNegative ? 'Evitar algo que você quer parar' : 'Criar um novo hábito saudável'}
              </Text>
            </View>
            <View style={[styles.lockBadge, { backgroundColor: colors.surface }]}>
              <Icon name="lock" size={12} color={colors.textTertiary} />
            </View>
          </View>
        </View>

        {/* NOME */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Nome *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
            placeholder={isNegative ? "Ex: Não fumar..." : "Ex: Meditar, Ler..."}
            placeholderTextColor={colors.textTertiary}
            value={name}
            onChangeText={setName}
            maxLength={50}
          />
        </View>

        {/* DESCRIÇÃO */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Descrição (opcional)</Text>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
            placeholder="Adicione detalhes..."
            placeholderTextColor={colors.textTertiary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={2}
            maxLength={200}
          />
        </View>

        {/* COR */}
        <View style={styles.section}>
          <CompactColorSelector
            selectedColor={selectedColor}
            onColorSelect={(color) => { hapticFeedback.selection(); setSelectedColor(color); }}
          />
        </View>

        {/* SEPARADOR */}
        <View style={[styles.separator, { borderTopColor: colors.border }]} />

        {/* FREQUÊNCIA — BOTÃO RESUMO */}
        <TouchableOpacity
          style={[styles.summaryRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={openFrequencyModal}
          activeOpacity={0.7}
        >
          <View style={[styles.summaryIconCircle, { backgroundColor: colors.primaryLight }]}>
            <Icon name="calendar" size={18} color={colors.primary} />
          </View>
          <View style={styles.summaryTextContainer}>
            <Text style={[styles.summaryLabel, { color: colors.textPrimary }]}>Frequência</Text>
            <Text style={[styles.summaryValue, { color: colors.textSecondary }]}>{getFrequencySummary()}</Text>
          </View>
          <Icon name="chevronRight" size={18} color={colors.textTertiary} />
        </TouchableOpacity>

        {/* META NUMÉRICA — BOTÃO RESUMO */}
        <TouchableOpacity
          style={[styles.summaryRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={openTargetModal}
          activeOpacity={0.7}
        >
          <View style={[styles.summaryIconCircle, { backgroundColor: hasTarget ? colors.successLight : colors.borderLight }]}>
            <Icon name="target" size={18} color={hasTarget ? colors.success : colors.textTertiary} />
          </View>
          <View style={styles.summaryTextContainer}>
            <Text style={[styles.summaryLabel, { color: colors.textPrimary }]}>Meta Numérica</Text>
            <Text style={[styles.summaryValue, { color: hasTarget ? colors.success : colors.textSecondary }]}>{getTargetSummary()}</Text>
          </View>
          <Icon name="chevronRight" size={18} color={colors.textTertiary} />
        </TouchableOpacity>

        {/* DICA */}
        <View style={[styles.tipCard, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
          <Icon name="bell" size={16} color={colors.primary} />
          <Text style={[styles.tipText, { color: colors.primary }]}>
            <Text style={styles.tipBold}>Dica:</Text> Configure lembretes e alertas na página de detalhes do hábito!
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* MODAL: FREQUÊNCIA */}
      <BottomSheetModal visible={showFrequencyModal} onCancel={cancelFrequencyModal} onConfirm={confirmFrequencyModal} title="Frequência">
        <FrequencySelector
          frequencyType={frequencyType}
          selectedDays={frequencyDays}
          onFrequencyTypeChange={setFrequencyType}
          onDaysChange={setFrequencyDays}
          hasFrequencyGoal={hasFrequencyGoal}
          frequencyGoalValue={frequencyGoalValue}
          frequencyGoalPeriod={frequencyGoalPeriod}
          frequencyGoalCustomDays={frequencyGoalCustomDays}
          onFrequencyGoalToggle={setHasFrequencyGoal}
          onFrequencyGoalValueChange={setFrequencyGoalValue}
          onFrequencyGoalPeriodChange={setFrequencyGoalPeriod}
          onFrequencyGoalCustomDaysChange={setFrequencyGoalCustomDays}
        />
      </BottomSheetModal>

      {/* MODAL: META NUMÉRICA */}
      <BottomSheetModal visible={showTargetModal} onCancel={cancelTargetModal} onConfirm={confirmTargetModal} title="Meta Numérica">
        <View style={styles.modalSection}>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: colors.textPrimary, marginBottom: 0 }]}>Ativar meta numérica</Text>
              <Text style={[styles.helperText, { color: colors.textTertiary }]}>
                {hasTarget ? 'Registre valores diários' : 'Ex: Beber 2L de água por dia'}
              </Text>
            </View>
            <Switch
              value={hasTarget}
              onValueChange={(v) => { hapticFeedback.selection(); setHasTarget(v); }}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={hasTarget ? colors.primary : colors.surface}
            />
          </View>
          {hasTarget && (
            <TargetInput
              value={targetValue}
              unit={targetUnit}
              onValueChange={setTargetValue}
              onUnitChange={setTargetUnit}
              availableUnits={getAllUnits()}
            />
          )}
        </View>
      </BottomSheetModal>
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
  headerTitle: { fontSize: 18, fontWeight: '700' },
  cancelButton: { fontSize: 16 },
  saveButton: { fontSize: 16, fontWeight: '600' },
  content: { flex: 1, padding: 16 },
  section: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  helperText: { fontSize: 12, marginTop: 4 },
  input: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
  },
  textArea: { height: 70, textAlignVertical: 'top' },
  typeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
  },
  typeLabel: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  typeDescription: { fontSize: 12 },
  lockBadge: { padding: 6, borderRadius: 6 },
  separator: { borderTopWidth: 1, marginVertical: 8, marginBottom: 16 },

  // Summary rows
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  summaryIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryTextContainer: { flex: 1 },
  summaryLabel: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  summaryValue: { fontSize: 12, fontWeight: '500' },

  // Tip card
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    marginTop: 8,
  },
  tipText: { flex: 1, fontSize: 13, lineHeight: 19 },
  tipBold: { fontWeight: '700' },

  // Toggle
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  modalSection: { marginBottom: 16 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalHandle: { alignItems: 'center', paddingTop: 12, paddingBottom: 4 },
  modalHandleBar: { width: 40, height: 4, borderRadius: 2 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalFooter: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'android' ? 48 : 16,
    borderTopWidth: 1,
  },
  modalConfirmButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});