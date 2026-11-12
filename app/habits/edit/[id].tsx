// app/habits/edit/[id].tsx
import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
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
import { BottomSheetModal } from '@/components/ui/BottomSheetModal';
import { CompactColorSelector } from '@/components/habits/CompactColorSelector';
import { FrequencySelector } from '@/components/habits/FrequencySelector';
import { TargetInput } from '@/components/habits/TargetInput';
import { HabitTypeIndicator } from '@/components/habits/HabitTypeIndicator';
import {
  useEditHabitForm,
  MAX_NAME_LENGTH,
  MAX_DESCRIPTION_LENGTH,
} from '@/hooks/useEditHabitForm';
import { hapticFeedback } from '@/utils/haptics';
import { useTheme } from '../../../contexts/ThemeContext';

export default function EditHabitScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const {
    loading,
    saving,
    name,
    setName,
    description,
    setDescription,
    habitType,
    selectedColor,
    setSelectedColor,
    hasTarget,
    setHasTarget,
    targetValue,
    setTargetValue,
    targetUnit,
    setTargetUnit,
    showTargetInline,
    setShowTargetInline,
    frequencyType,
    setFrequencyType,
    frequencyDays,
    setFrequencyDays,
    hasFrequencyGoal,
    setHasFrequencyGoal,
    frequencyGoalValue,
    setFrequencyGoalValue,
    frequencyGoalPeriod,
    setFrequencyGoalPeriod,
    frequencyGoalCustomDays,
    setFrequencyGoalCustomDays,
    showFrequencyModal,
    openFrequencyModal,
    cancelFrequencyModal,
    confirmFrequencyModal,
    getFrequencySummary,
    getTargetSummary,
    getAllUnits,
    handleSubmit,
  } = useEditHabitForm(id as string);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const isNegative = habitType === 'negative';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* HEADER */}
        <View
          style={[
            styles.header,
            { backgroundColor: colors.background, borderBottomColor: colors.border },
          ]}
        >
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

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
        >
          {/* TIPO */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Tipo de Hábito</Text>
            <HabitTypeIndicator isNegative={isNegative} />
          </View>

          {/* NOME */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Nome *</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                },
              ]}
              placeholder={isNegative ? 'Ex: Não fumar...' : 'Ex: Meditar, Ler...'}
              placeholderTextColor={colors.textTertiary}
              value={name}
              onChangeText={setName}
              maxLength={MAX_NAME_LENGTH}
            />
          </View>

          {/* DESCRIÇÃO */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Descrição (opcional)</Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                },
              ]}
              placeholder="Adicione detalhes..."
              placeholderTextColor={colors.textTertiary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={2}
              maxLength={MAX_DESCRIPTION_LENGTH}
            />
          </View>

          {/* COR */}
          <View style={styles.section}>
            <CompactColorSelector
              selectedColor={selectedColor}
              onColorSelect={(color) => {
                hapticFeedback.selection();
                setSelectedColor(color);
              }}
            />
          </View>

          <View style={[styles.separator, { borderTopColor: colors.border }]} />

          {/* FREQUÊNCIA */}
          <TouchableOpacity
            style={[
              styles.summaryRow,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={openFrequencyModal}
            activeOpacity={0.7}
          >
            <View style={[styles.summaryIconCircle, { backgroundColor: colors.primaryLight }]}>
              <Icon name="calendar" size={18} color={colors.primary} />
            </View>
            <View style={styles.summaryTextContainer}>
              <Text style={[styles.summaryLabel, { color: colors.textPrimary }]}>Frequência</Text>
              <Text style={[styles.summaryValue, { color: colors.textSecondary }]}>
                {getFrequencySummary()}
              </Text>
            </View>
            <Icon name="chevronRight" size={18} color={colors.textTertiary} />
          </TouchableOpacity>

          {/* META NUMÉRICA — INLINE */}
          <TouchableOpacity
            style={[
              styles.summaryRow,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={() => {
              hapticFeedback.light();
              setShowTargetInline((v) => !v);
            }}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.summaryIconCircle,
                { backgroundColor: hasTarget ? colors.successLight : colors.borderLight },
              ]}
            >
              <Icon
                name="target"
                size={18}
                color={hasTarget ? colors.success : colors.textTertiary}
              />
            </View>
            <View style={styles.summaryTextContainer}>
              <Text style={[styles.summaryLabel, { color: colors.textPrimary }]}>
                Meta Numérica
              </Text>
              <Text
                style={[
                  styles.summaryValue,
                  { color: hasTarget ? colors.success : colors.textSecondary },
                ]}
              >
                {getTargetSummary()}
              </Text>
            </View>
            <Icon
              name={showTargetInline ? 'chevronUp' : 'chevronRight'}
              size={18}
              color={colors.textTertiary}
            />
          </TouchableOpacity>

          {/* Painel inline de meta */}
          {showTargetInline && (
            <View
              style={[
                styles.inlinePanel,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: colors.textPrimary, marginBottom: 0 }]}>
                    Ativar meta numérica
                  </Text>
                  <Text style={[styles.helperText, { color: colors.textTertiary }]}>
                    {hasTarget ? 'Registre valores diários' : 'Ex: Beber 2L de água por dia'}
                  </Text>
                </View>
                <Switch
                  value={hasTarget}
                  onValueChange={(v) => {
                    hapticFeedback.selection();
                    setHasTarget(v);
                  }}
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
          )}

          {/* DICA */}
          <View
            style={[
              styles.tipCard,
              { backgroundColor: colors.primaryLight, borderColor: colors.primary },
            ]}
          >
            <Icon name="bell" size={16} color={colors.primary} />
            <Text style={[styles.tipText, { color: colors.primary }]}>
              <Text style={styles.tipBold}>Dica:</Text> Configure lembretes e alertas na página de
              detalhes do hábito!
            </Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* MODAL: FREQUÊNCIA */}
        <BottomSheetModal
          visible={showFrequencyModal}
          onCancel={cancelFrequencyModal}
          onConfirm={confirmFrequencyModal}
          title="Frequência"
        >
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
      </View>
    </KeyboardAvoidingView>
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
  separator: { borderTopWidth: 1, marginVertical: 8, marginBottom: 16 },
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
  inlinePanel: { borderRadius: 14, borderWidth: 1, padding: 16, marginTop: -4, marginBottom: 10 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
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
});
