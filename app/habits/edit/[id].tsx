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
import { ProgressNotificationSettings, ProgressNotificationConfig } from '@/components/habits/ProgressNotificationSettings';
import { DIFFICULTY_CONFIG, HABIT_COLORS } from '@/constants/GameConfig';
import { useHabits } from '@/hooks/useHabits';
import { useAuth } from '@/hooks/useAuth';
import { notificationService } from '@/services/notifications';
import { progressNotificationScheduler } from '@/services/progressNotificationScheduler';
import { supabase } from '@/services/supabase';
import { Habit, ProgressNotification } from '@/types/database';
import { hapticFeedback } from '@/utils/haptics';
import { useTheme } from '../../../contexts/ThemeContext';
// 🆕 Import dos helpers tipados
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

  // Estados de notificações
  const [hasPermission, setHasPermission] = useState(false);
  const [progressNotificationConfig, setProgressNotificationConfig] = useState<ProgressNotificationConfig>({
    enabled: false,
    morningEnabled: true,
    morningTime: '08:00:00',
    afternoonEnabled: true,
    afternoonTime: '15:00:00',
    eveningEnabled: true,
    eveningTime: '21:00:00',
  });

  useEffect(() => {
    loadHabit();
    checkNotificationPermission();
  }, [id]);

  const checkNotificationPermission = async () => {
    const permission = await notificationService.hasPermission();
    setHasPermission(permission);
  };

  const requestNotificationPermission = async () => {
    const granted = await notificationService.requestPermissions();
    setHasPermission(granted);

    if (!granted) {
      Alert.alert('Permissão Negada', 'Ative as notificações nas configurações do dispositivo.');
    }
  };

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
      await loadProgressNotificationSettings(habitData.id);
    }

    setLoading(false);
  };

  const loadProgressNotificationSettings = async (habitId: string) => {
    try {
      const { data, error } = await supabase
        .from('habit_progress_notifications')
        .select('*')
        .eq('habit_id', habitId)
        .maybeSingle();

      if (error) {
        console.error('Erro ao carregar configurações:', error);
        return;
      }

      if (data) {
        const config = data as ProgressNotification;
        setProgressNotificationConfig({
          enabled: config.enabled,
          morningEnabled: config.morning_enabled,
          morningTime: config.morning_time,
          afternoonEnabled: config.afternoon_enabled,
          afternoonTime: config.afternoon_time,
          eveningEnabled: config.evening_enabled,
          eveningTime: config.evening_time,
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configurações de progresso:', error);
    }
  };

  /**
   * 🆕 Mostrar confirmação com preview de impacto
   */
  const confirmTargetChange = async (
    newTargetValue: number
  ): Promise<boolean> => {
    return new Promise(async (resolve) => {
      const oldValue = originalTargetValue || 0;
      const isIncrease = newTargetValue > oldValue;
      const percentChange = Math.abs(((newTargetValue - oldValue) / oldValue) * 100);

      // Calcular impacto
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

    // Validação de meta numérica
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

    // Verificar se a meta mudou
    const newTargetValue = parseFloat(targetValue);
    const targetChanged = hasTarget && originalHasTarget && newTargetValue !== originalTargetValue;

    // Pedir confirmação se a meta mudou
    if (targetChanged) {
      const confirmed = await confirmTargetChange(newTargetValue);
      if (!confirmed) return;
    }

    hapticFeedback.medium();
    setSaving(true);

    try {
      // Atualizar dados básicos do hábito
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

      // 🆕 Recalcular pontos se a meta mudou (usando helper tipado)
      let pointsDifference = 0;
      if (targetChanged && originalTargetValue) {
        try {
          // Recalcular completions
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

          // Atualizar perfil se houve mudança
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

      // Atualizar configurações de notificações de progresso
      if (hasTarget) {
        try {
          const { data: existingConfig } = await supabase
            .from('habit_progress_notifications')
            .select('id')
            .eq('habit_id', id as string)
            .maybeSingle();

          if (existingConfig) {
            await (supabase.from('habit_progress_notifications') as any)
              .update({
                enabled: progressNotificationConfig.enabled,
                morning_enabled: progressNotificationConfig.morningEnabled,
                morning_time: progressNotificationConfig.morningTime,
                afternoon_enabled: progressNotificationConfig.afternoonEnabled,
                afternoon_time: progressNotificationConfig.afternoonTime,
                evening_enabled: progressNotificationConfig.eveningEnabled,
                evening_time: progressNotificationConfig.eveningTime,
              })
              .eq('habit_id', id as string);

            if (progressNotificationConfig.enabled) {
              await progressNotificationScheduler.updateNotificationSchedule(id as string, user.id);
            } else {
              await progressNotificationScheduler.disableProgressNotifications(id as string);
            }
          } else {
            await (supabase.from('habit_progress_notifications') as any)
              .insert({
                habit_id: id as string,
                user_id: user.id,
                enabled: progressNotificationConfig.enabled,
                morning_enabled: progressNotificationConfig.morningEnabled,
                morning_time: progressNotificationConfig.morningTime,
                afternoon_enabled: progressNotificationConfig.afternoonEnabled,
                afternoon_time: progressNotificationConfig.afternoonTime,
                evening_enabled: progressNotificationConfig.eveningEnabled,
                evening_time: progressNotificationConfig.eveningTime,
              });

            if (progressNotificationConfig.enabled) {
              await progressNotificationScheduler.scheduleProgressNotifications(id as string, user.id);
            }
          }
        } catch (progressError) {
          console.error('Erro ao atualizar notificações de progresso:', progressError);
        }
      }

      setSaving(false);
      hapticFeedback.success();

      // Mensagem de sucesso personalizada
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
      {/* Header */}
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

          {/* Aviso de mudança de meta */}
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
                    { borderColor: colors.border },
                    isSelected && {
                      borderColor: config.color,
                      backgroundColor: config.color + '10',
                    },
                  ]}
                  onPress={() => {
                    hapticFeedback.selection();
                    setDifficulty(key);
                  }}
                >
                  <Text
                    style={[
                      styles.difficultyLabel,
                      { color: colors.textSecondary },
                      isSelected && { color: config.color },
                    ]}
                  >
                    {config.label}
                  </Text>
                  <Text style={[styles.difficultyPoints, { color: colors.textTertiary }]}>
                    +{config.points} pts
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Cor */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Cor</Text>
          <View style={styles.colorContainer}>
            {HABIT_COLORS.map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorOption,
                  { backgroundColor: color },
                  selectedColor === color && styles.colorOptionSelected,
                ]}
                onPress={() => {
                  hapticFeedback.selection();
                  setSelectedColor(color);
                }}
              />
            ))}
          </View>
        </View>

        {/* NOTIFICAÇÕES DE PROGRESSO */}
        {hasTarget && (
          <View style={styles.section}>
            <ProgressNotificationSettings
              config={progressNotificationConfig}
              onChange={setProgressNotificationConfig}
              hasPermission={hasPermission}
              onRequestPermission={requestNotificationPermission}
            />
          </View>
        )}

        {/* Info Card */}
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

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  cancelButton: {
    fontSize: 16,
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  helperText: {
    fontSize: 12,
    marginTop: 6,
    fontStyle: 'italic',
  },
  typeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  typeLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  typeDescription: {
    fontSize: 12,
  },
  lockBadge: {
    padding: 6,
    borderRadius: 6,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 12,
  },
  targetInputs: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  targetValueContainer: {
    flex: 1,
  },
  targetUnitContainer: {
    flex: 2,
  },
  targetLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
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
  warningText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  difficultyContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  difficultyOption: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  difficultyLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  difficultyPoints: {
    fontSize: 12,
  },
  colorContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  infoCard: {
    flexDirection: 'row',
    gap: 8,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  infoBold: {
    fontWeight: '600',
  },
});