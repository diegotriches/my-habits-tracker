import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Keyboard } from 'react-native';
import { router } from 'expo-router';
import { useHabits } from '@/hooks/useHabits';
import { useAuth } from '@/hooks/useAuth';
import { Habit, FrequencyGoalPeriod } from '@/types/database';
import { hapticFeedback } from '@/utils/haptics';
import { errorMessageFor } from '@/utils/networkErrors';
import { ensureOnline } from '@/services/network';
import { reminderSyncService } from '@/services/reminderSyncService';

const TARGET_UNITS = {
  volume: ['litros', 'ml', 'copos'],
  distance: ['km', 'metros', 'passos'],
  time: ['horas', 'minutos'],
  count: ['páginas', 'exercícios', 'vezes', 'unidades'],
  weight: ['kg', 'gramas'],
};

export const MIN_NAME_LENGTH = 3;
export const MAX_NAME_LENGTH = 50;
export const MAX_DESCRIPTION_LENGTH = 200;

type FrequencyType = 'daily' | 'weekly' | 'custom';

interface FrequencySnapshot {
  frequencyType: FrequencyType;
  frequencyDays: number[];
  hasFrequencyGoal: boolean;
  frequencyGoalValue: number;
  frequencyGoalPeriod: FrequencyGoalPeriod;
  frequencyGoalCustomDays: number;
}

export function useEditHabitForm(habitId: string) {
  const { user } = useAuth();
  const { getHabit, updateHabit } = useHabits();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Básico
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [habitType, setHabitType] = useState<'positive' | 'negative'>('positive');
  const [selectedColor, setSelectedColor] = useState<string>('');

  // Meta
  const [hasTarget, setHasTarget] = useState(false);
  const [targetValue, setTargetValue] = useState('');
  const [targetUnit, setTargetUnit] = useState('');
  const [showTargetInline, setShowTargetInline] = useState(false);

  // Frequência
  const [frequencyType, setFrequencyType] = useState<FrequencyType>('daily');
  const [frequencyDays, setFrequencyDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [hasFrequencyGoal, setHasFrequencyGoal] = useState(false);
  const [frequencyGoalValue, setFrequencyGoalValue] = useState(0);
  const [frequencyGoalPeriod, setFrequencyGoalPeriod] = useState<FrequencyGoalPeriod>('week');
  const [frequencyGoalCustomDays, setFrequencyGoalCustomDays] = useState(0);

  const [showFrequencyModal, setShowFrequencyModal] = useState(false);
  const frequencySnapshot = useRef<FrequencySnapshot | null>(null);

  const loadHabit = useCallback(async () => {
    const { data, error } = await getHabit(habitId);

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

    setHasTarget(h.has_target);
    if (h.has_target) {
      setTargetValue(h.target_value?.toString() || '');
      setTargetUnit(h.target_unit || '');
    }

    setFrequencyType(h.frequency_type || 'daily');
    setFrequencyDays(h.frequency_days || [0, 1, 2, 3, 4, 5, 6]);

    const goalValue = h.frequency_goal_value;
    const goalPeriod = h.frequency_goal_period;
    const goalCustomDays = h.frequency_goal_custom_days;

    if (goalValue && goalValue > 0) {
      setHasFrequencyGoal(true);
      setFrequencyGoalValue(goalValue);
      setFrequencyGoalPeriod(goalPeriod || 'week');
      setFrequencyGoalCustomDays(goalCustomDays || 0);
    }

    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habitId]);

  useEffect(() => {
    loadHabit();
  }, [loadHabit]);

  // ===== SUMMARIES =====

  const getFrequencySummary = useCallback((): string => {
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
  }, [hasFrequencyGoal, frequencyGoalPeriod, frequencyGoalCustomDays, frequencyGoalValue, frequencyType, frequencyDays]);

  const getTargetSummary = useCallback((): string => {
    if (!hasTarget) return 'Desativada';
    if (targetValue && targetUnit) return `${targetValue} ${targetUnit}/dia`;
    return 'Configurar...';
  }, [hasTarget, targetValue, targetUnit]);

  // ===== FREQUENCY MODAL HANDLERS =====

  const openFrequencyModal = useCallback(() => {
    frequencySnapshot.current = {
      frequencyType, frequencyDays: [...frequencyDays],
      hasFrequencyGoal, frequencyGoalValue, frequencyGoalPeriod, frequencyGoalCustomDays,
    };
    hapticFeedback.light();
    setShowFrequencyModal(true);
  }, [frequencyType, frequencyDays, hasFrequencyGoal, frequencyGoalValue, frequencyGoalPeriod, frequencyGoalCustomDays]);

  const cancelFrequencyModal = useCallback(() => {
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
  }, []);

  const confirmFrequencyModal = useCallback(() => {
    frequencySnapshot.current = null;
    setShowFrequencyModal(false);
  }, []);

  // ===== VALIDATION & SUBMIT =====

  const getMaxForPeriod = useCallback((): number => {
    switch (frequencyGoalPeriod) {
      case 'week': return 7;
      case 'month': return 31;
      case 'custom': return frequencyGoalCustomDays || 9999;
      default: return 9999;
    }
  }, [frequencyGoalPeriod, frequencyGoalCustomDays]);

  const validateForm = useCallback((): string | null => {
    const trimmedName = name.trim();
    if (!trimmedName) return 'Digite um nome para o hábito';
    if (trimmedName.length < MIN_NAME_LENGTH) return `O nome deve ter pelo menos ${MIN_NAME_LENGTH} caracteres`;
    if (trimmedName.length > MAX_NAME_LENGTH) return `O nome deve ter no máximo ${MAX_NAME_LENGTH} caracteres`;
    if (description.trim().length > MAX_DESCRIPTION_LENGTH) return `A descrição deve ter no máximo ${MAX_DESCRIPTION_LENGTH} caracteres`;

    if (hasTarget) {
      const value = parseFloat(targetValue);
      if (!targetValue || isNaN(value)) return 'Digite um valor válido para a meta';
      if (value <= 0) return 'O valor da meta deve ser maior que zero';
      if (value > 999999) return 'O valor da meta é muito alto';
      if (!targetUnit.trim()) return 'Selecione uma unidade para a meta';
    }

    if (hasFrequencyGoal) {
      if (frequencyGoalValue <= 0) return 'Digite quantas vezes para a meta de frequência';
      if (frequencyGoalValue > getMaxForPeriod()) return `A meta não pode exceder ${getMaxForPeriod()} vezes neste período`;
      if (frequencyGoalPeriod === 'custom' && frequencyGoalCustomDays <= 0) return 'Digite o número de dias para a meta personalizada';
    }

    if (!hasFrequencyGoal && frequencyType === 'weekly' && frequencyDays.length === 0) return 'Selecione pelo menos um dia da semana';

    return null;
  }, [name, description, hasTarget, targetValue, targetUnit, hasFrequencyGoal, frequencyGoalValue, frequencyGoalPeriod, frequencyGoalCustomDays, frequencyType, frequencyDays, getMaxForPeriod]);

  const handleSubmit = useCallback(async () => {
    Keyboard.dismiss();
    const validationError = validateForm();
    if (validationError) {
      hapticFeedback.error();
      Alert.alert('Erro', validationError);
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

      if (!(await ensureOnline())) {
        setSaving(false);
        return;
      }

      const { error: habitError } = await updateHabit(habitId, updates);

      if (habitError) {
        setSaving(false);
        Alert.alert('Erro', errorMessageFor(habitError, habitError));
        return;
      }

      // Nome e meta numérica vão gravados nos alarmes ("Feito" x
      // "Registrar"): reagenda em segundo plano para refletir a edição já
      // na próxima notificação.
      reminderSyncService.syncReminders(user.id);

      setSaving(false);
      hapticFeedback.success();
      Alert.alert('Sucesso!', 'Hábito atualizado com sucesso!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      setSaving(false);
      Alert.alert('Erro', 'Ocorreu um erro ao salvar o hábito');
    }
  }, [validateForm, user?.id, name, description, selectedColor, hasTarget, targetValue, targetUnit, frequencyType, frequencyDays, hasFrequencyGoal, frequencyGoalValue, frequencyGoalPeriod, frequencyGoalCustomDays, habitId, updateHabit]);

  const getAllUnits = useCallback(() => Object.values(TARGET_UNITS).flat(), []);

  return {
    loading,
    saving,
    name, setName,
    description, setDescription,
    habitType,
    selectedColor, setSelectedColor,
    hasTarget, setHasTarget,
    targetValue, setTargetValue,
    targetUnit, setTargetUnit,
    showTargetInline, setShowTargetInline,
    frequencyType, setFrequencyType,
    frequencyDays, setFrequencyDays,
    hasFrequencyGoal, setHasFrequencyGoal,
    frequencyGoalValue, setFrequencyGoalValue,
    frequencyGoalPeriod, setFrequencyGoalPeriod,
    frequencyGoalCustomDays, setFrequencyGoalCustomDays,
    showFrequencyModal,
    openFrequencyModal,
    cancelFrequencyModal,
    confirmFrequencyModal,
    getFrequencySummary,
    getTargetSummary,
    getAllUnits,
    handleSubmit,
  };
}