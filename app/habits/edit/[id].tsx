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
import { DIFFICULTY_CONFIG, HABIT_COLORS } from '@/constants/GameConfig';
import { useHabits } from '@/hooks/useHabits';
import { useAuth } from '@/hooks/useAuth';
import { Habit } from '@/types/database';
import { hapticFeedback } from '@/utils/haptics';
import { useTheme } from '../../../contexts/ThemeContext';
import { 
  recalculateCompletionPoints, 
  updateProfilePoints,
  calculateTargetChangeImpact 
} from '@/utils/supabaseHelpers';

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
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [selectedColor, setSelectedColor] = useState<string>(HABIT_COLORS[0]);
  
  // Estados de meta numérica
  const [hasTarget, setHasTarget] = useState(false);
  const [targetValue, setTargetValue] = useState('');
  const [targetUnit, setTargetUnit] = useState('');
  const [originalHasTarget, setOriginalHasTarget] = useState(false);
  const [originalTargetValue, setOriginalTargetValue] = useState<number | null>(null);

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
    setDifficulty(habitData.difficulty);
    setSelectedColor(habitData.color);
    
    // Carregar dados de meta
    setHasTarget(habitData.has_target);
    setOriginalHasTarget(habitData.has_target);
    setOriginalTargetValue(habitData.target_value);
    
    if (habitData.has_target) {
      setTargetValue(habitData.target_value?.toString() || '');
      setTargetUnit(habitData.target_unit || '');
    }

    setLoading(false);
  };

  const confirmTargetChange = async (
    newTargetValue: number
  ): Promise<boolean> => {
    return new Promise(async (resolve) => {
      const oldValue = originalTargetValue || 0;
      const isIncrease = newTargetValue > oldValue;
      const percentChange = Math.abs(((newTargetValue - oldValue) / oldValue) * 100);

      const impact = await calculateTargetChangeImpact(
        id as string,
        oldValue,
        newTargetValue
      );

      Alert.alert(
        '⚠️ Alterar Meta',
        `Você está ${isIncrease ? 'aumentando' : 'diminuindo'} sua meta de ${oldValue} para ${newTargetValue} ${targetUnit} (${percentChange.toFixed(0)}% de mudança).\n\n` +
        `📊 Impacto em ${impact.totalCompletions} registros:\n` +
        `✅ ${impact.willKeepPoints} mantêm pontos\n` +
        `${isIncrease ? '📉' : '📈'} ${isIncrease ? impact.willLosePoints : impact.willGainPoints} dias afetados\n\n` +
        `Isso irá recalcular os pontos de todos os registros anteriores.\n\n` +
        `Deseja continuar?`,
        [
          {
            text: 'Cancelar',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'Confirmar',
            style: 'default',
            onPress: () => resolve(true),
          },
        ]
      );
    });
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

    const newTargetValue = parseFloat(targetValue);
    const targetChanged = hasTarget && originalHasTarget && newTargetValue !== originalTargetValue;

    if (targetChanged) {
      const confirmed = await confirmTargetChange(newTargetValue);
      if (!confirmed) return;
    }

    hapticFeedback.medium();
    setSaving(true);

    try {
      const updates: any = {
        name: name.trim(),
        description: description.trim() || null,
        difficulty,
        points_base: DIFFICULTY_CONFIG[difficulty].points,
        color: selectedColor,
        has_target: hasTarget,
        target_value: hasTarget ? newTargetValue : null,
        target_unit: hasTarget ? targetUnit.trim() : null,
      };

      const { error: habitError } = await updateHabit(id as string, updates);

      if (habitError) {
        setSaving(false);
        Alert.alert('Erro', habitError);
        return;
      }

      let pointsDifference = 0;
      if (targetChanged && originalTargetValue) {
        try {
          const pointsConfig = {
            easy: DIFFICULTY_CONFIG.easy.points,
            medium: DIFFICULTY_CONFIG.medium.points,
            hard: DIFFICULTY_CONFIG.hard.points,
          };

          pointsDifference = await recalculateCompletionPoints(
            id as string,
            newTargetValue,
            difficulty,
            pointsConfig
          );

          if (pointsDifference !== 0) {
            await updateProfilePoints(user.id, pointsDifference);
          }
        } catch (recalcError) {
          console.error('Erro ao recalcular:', recalcError);
          Alert.alert(
            'Aviso',
            'Hábito atualizado, mas houve um erro ao recalcular pontos. Tente novamente.'
          );
        }
      }

      setSaving(false);
      hapticFeedback.success();

      const successMessage = targetChanged
        ? `Hábito atualizado!\n\n${pointsDifference >= 0 
            ? `+${pointsDifference} pontos adicionados` 
            : `${pointsDifference} pontos removidos`} após recálculo.`
        : 'Hábito atualizado com sucesso!';

      Alert.alert('Sucesso!', successMessage, [
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

          {hasTarget && originalHasTarget && parseFloat(targetValue) !== originalTargetValue && targetValue !== '' && (
            <View style={[styles.warningCard, { backgroundColor: colors.warningLight, borderColor: colors.warning }]}>
              <Icon name="alertTriangle" size={16} color={colors.warning} />
              <Text style={[styles.warningText, { color: colors.warning }]}>
                Alterar a meta irá recalcular os pontos de todos os registros anteriores
              </Text>
            </View>
          )}
        </View>

        {/* Dificuldade */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Dificuldade</Text>
          <View style={styles.difficultyContainer}>
            {(Object.keys(DIFFICULTY_CONFIG) as Array<'easy' | 'medium' | 'hard'>).map((key) => {
              const config = DIFFICULTY_CONFIG[key];
              const isSelected = difficulty === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.difficultyOption,
                    { 
                      borderColor: isSelected ? config.color : colors.border,
                      backgroundColor: isSelected ? config.color + '15' : colors.surface,
                    },
                  ]}
                  onPress={() => {
                    hapticFeedback.selection();
                    setDifficulty(key);
                  }}
                >
                  <Text style={[
                    styles.difficultyLabel,
                    { color: isSelected ? config.color : colors.textSecondary },
                  ]}>
                    {config.label}
                  </Text>
                  <Text style={[
                    styles.difficultyPoints,
                    { color: isSelected ? config.color : colors.textTertiary },
                  ]}>
                    +{config.points}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
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

        {/* ✅ Info Card */}
        <View style={[styles.infoCard, { backgroundColor: colors.infoLight }]}>
          <Icon name="info" size={16} color={colors.info} />
          <Text style={[styles.infoText, { color: colors.info }]}>
            {hasTarget ? (
              <>
                Você ganhará <Text style={styles.infoBold}>+{DIFFICULTY_CONFIG[difficulty].points} pontos</Text> quando atingir <Text style={styles.infoBold}>{targetValue || '?'} {targetUnit || '?'}</Text> por dia!
              </>
            ) : isNegative ? (
              <>
                Você ganhará <Text style={styles.infoBold}>+{DIFFICULTY_CONFIG[difficulty].points} pontos</Text> toda vez que resistir e evitar este hábito!
              </>
            ) : (
              <>
                Você ganhará <Text style={styles.infoBold}>+{DIFFICULTY_CONFIG[difficulty].points} pontos</Text> toda vez que completar este hábito!
              </>
            )}
          </Text>
        </View>

        {/* 💡 Dica sobre notificações */}
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
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
  },
  warningText: { flex: 1, fontSize: 12, lineHeight: 18 },
  difficultyContainer: { flexDirection: 'row', gap: 8 },
  difficultyOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
  },
  difficultyLabel: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  difficultyPoints: { fontSize: 11, fontWeight: '700' },
  infoCard: {
    flexDirection: 'row',
    gap: 8,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 12,
  },
  infoText: { flex: 1, fontSize: 14, lineHeight: 20 },
  infoBold: { fontWeight: '600' },
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