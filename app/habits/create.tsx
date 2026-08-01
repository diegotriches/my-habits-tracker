// app/habits/create.tsx
import React, { useMemo } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { FrequencySelector } from '@/components/habits/FrequencySelector';
import { TargetInput } from '@/components/habits/TargetInput';
import { ProgressNotificationSettings } from '@/components/habits/ProgressNotificationSettings';
import { CompactColorSelector } from '@/components/habits/CompactColorSelector';
import { HabitTypeSelector } from '@/components/habits/HabitTypeSelector';
import { CreateFormBottomSheetModal } from '@/components/habits/CreateFormBottomSheetModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Icon } from '@/components/ui/Icon';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { SuccessToast } from '@/components/ui/SuccessToast';
import { MAX_NAME_LENGTH, MAX_DESCRIPTION_LENGTH } from '@/constants/HabitForm';
import { MAX_REMINDERS, useCreateHabitForm } from '@/hooks/useCreateHabitForm';
import { hapticFeedback } from '@/utils/haptics';
import { useTheme } from '../../contexts/ThemeContext';
import { styles as createStylesFn } from './createStyles';

export default function CreateHabitScreen() {
  const { colors } = useTheme();
  // Memoizado: createStylesFn(colors) recriava o objeto de estilos
  // inteiro a cada render (a cada tecla digitada em qualquer campo),
  // o que também anula a memoização dos componentes filhos que
  // recebem `styles` como prop.
  const styles = useMemo(() => createStylesFn(colors), [colors]);

  const {
    loading,
    name, setName,
    description, setDescription,
    habitType, setHabitType,
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
    hasPermission,
    requestNotificationPermission,
    reminders,
    showTimePicker, setShowTimePicker,
    currentTime, setCurrentTime,
    progressNotificationConfig, setProgressNotificationConfig,
    showFrequencyModal,
    openFrequencyModal,
    cancelFrequencyModal,
    confirmFrequencyModal,
    showRemindersModal,
    openRemindersModal,
    cancelRemindersModal,
    confirmRemindersModal,
    handleAddReminder,
    handleRemoveReminder,
    onTimeChange,
    formatTime,
    getFrequencySummary,
    getTargetSummary,
    getRemindersSummary,
    getAllUnits,
    handleSubmit,
    handleCancel,
    showCancelConfirm,
    confirmDiscard,
    dismissDiscardConfirm,
    showSuccessToast, setShowSuccessToast,
    showErrorToast, setShowErrorToast,
    errorMessage,
  } = useCreateHabitForm();

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.container}>
        <LoadingOverlay visible={loading} message="Criando hábito..." />
        <SuccessToast visible={showSuccessToast} message="Hábito criado com sucesso!" onHide={() => setShowSuccessToast(false)} />
        <SuccessToast visible={showErrorToast} message={errorMessage} onHide={() => setShowErrorToast(false)} />
        <ConfirmDialog
          visible={showCancelConfirm}
          title="Descartar Hábito?"
          message="Você tem alterações não salvas. Deseja realmente sair?"
          confirmText="Descartar"
          cancelText="Continuar Editando"
          confirmColor="danger"
          onConfirm={confirmDiscard}
          onCancel={dismissDiscardConfirm}
        />

        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel}>
            <Text style={styles.cancelButton}>Cancelar</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Novo Hábito</Text>
          <TouchableOpacity onPress={handleSubmit} disabled={loading}>
            <Text style={[styles.saveButton, loading && styles.saveButtonDisabled]}>Salvar</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
        >
          {/* TIPO DE HÁBITO */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tipo de Hábito</Text>
            <HabitTypeSelector habitType={habitType} onChange={setHabitType} styles={styles} colors={colors} />
          </View>

          {/* NOME */}
          <View style={styles.section}>
            <Text style={styles.label}>Nome *</Text>
            <TextInput
              style={styles.input}
              placeholder={habitType === 'positive' ? "Ex: Meditar, Ler..." : "Ex: Não fumar..."}
              placeholderTextColor={colors.textTertiary}
              value={name}
              onChangeText={setName}
              maxLength={MAX_NAME_LENGTH}
            />
          </View>

          {/* DESCRIÇÃO */}
          <View style={styles.section}>
            <Text style={styles.label}>Descrição (opcional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
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
              onColorSelect={(color) => { hapticFeedback.selection(); setSelectedColor(color); }}
            />
          </View>

          <View style={[styles.metaSeparator, { borderTopColor: colors.border }]} />

          {/* FREQUÊNCIA */}
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

          {/* META NUMÉRICA — INLINE */}
          <TouchableOpacity
            style={[styles.summaryRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => { hapticFeedback.light(); setShowTargetInline(v => !v); }}
            activeOpacity={0.7}
          >
            <View style={[styles.summaryIconCircle, { backgroundColor: hasTarget ? colors.successLight : colors.borderLight }]}>
              <Icon name="target" size={18} color={hasTarget ? colors.success : colors.textTertiary} />
            </View>
            <View style={styles.summaryTextContainer}>
              <Text style={[styles.summaryLabel, { color: colors.textPrimary }]}>Meta Numérica</Text>
              <Text style={[styles.summaryValue, { color: hasTarget ? colors.success : colors.textSecondary }]}>
                {getTargetSummary()}
              </Text>
            </View>
            <Icon name={showTargetInline ? "chevronUp" : "chevronRight"} size={18} color={colors.textTertiary} />
          </TouchableOpacity>

          {/* Painel inline de meta */}
          {showTargetInline && (
            <View style={[
              styles.inlinePanel ?? {
                borderRadius: 14, borderWidth: 1, padding: 16, marginTop: -4, marginBottom: 10,
              },
              { backgroundColor: colors.surface, borderColor: colors.border }
            ]}>
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { marginBottom: 0 }]}>Ativar meta numérica</Text>
                  <Text style={[styles.helperText, { marginTop: 4 }]}>
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
          )}

          {/* LEMBRETES */}
          <TouchableOpacity
            style={[styles.summaryRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={openRemindersModal}
            activeOpacity={0.7}
          >
            <View style={[styles.summaryIconCircle, {
              backgroundColor: (reminders.length > 0 || progressNotificationConfig.enabled) ? colors.warningLight : colors.borderLight
            }]}>
              <Icon name="bell" size={18} color={(reminders.length > 0 || progressNotificationConfig.enabled) ? colors.warning : colors.textTertiary} />
            </View>
            <View style={styles.summaryTextContainer}>
              <Text style={[styles.summaryLabel, { color: colors.textPrimary }]}>Lembretes</Text>
              <Text style={[styles.summaryValue, {
                color: (reminders.length > 0 || progressNotificationConfig.enabled) ? colors.warning : colors.textSecondary
              }]}>{getRemindersSummary()}</Text>
            </View>
            <Icon name="chevronRight" size={18} color={colors.textTertiary} />
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* MODAL: FREQUÊNCIA */}
        <CreateFormBottomSheetModal
          visible={showFrequencyModal}
          onCancel={cancelFrequencyModal}
          onConfirm={confirmFrequencyModal}
          title="Frequência"
          styles={styles}
          colors={colors}
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
        </CreateFormBottomSheetModal>

        {/* MODAL: LEMBRETES */}
        <CreateFormBottomSheetModal
          visible={showRemindersModal}
          onCancel={cancelRemindersModal}
          onConfirm={confirmRemindersModal}
          title="Lembretes"
          styles={styles}
          colors={colors}
        >
          {!hasPermission && (
            <TouchableOpacity
              style={[styles.permissionButton, { backgroundColor: colors.primary }]}
              onPress={async () => { hapticFeedback.light(); await requestNotificationPermission(); }}
            >
              <Icon name="unlock" size={16} color={colors.textInverse} />
              <Text style={[styles.permissionButtonText, { color: colors.textInverse }]}>Permitir Notificações</Text>
            </TouchableOpacity>
          )}

          {hasPermission && (
            <>
              <View style={styles.modalSection}>
                <View style={styles.modalSectionHeader}>
                  <Icon name="clock" size={16} color={colors.textPrimary} />
                  <Text style={[styles.modalSectionTitle, { color: colors.textPrimary }]}>Horários de Lembrete</Text>
                </View>
                <Text style={[styles.modalSectionSubtitle, { color: colors.textSecondary }]}>
                  Receba notificações nos horários definidos
                </Text>

                {reminders.length > 0 && (
                  <View style={styles.remindersList}>
                    {reminders.map((reminder) => (
                      <View key={reminder.id} style={[styles.reminderItem, { borderColor: colors.border }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Icon name="bell" size={14} color={colors.primary} />
                          <Text style={[styles.reminderTime, { color: colors.textPrimary }]}>{formatTime(reminder.time)}</Text>
                        </View>
                        <TouchableOpacity onPress={() => handleRemoveReminder(reminder.id)}>
                          <Icon name="trash" size={16} color={colors.danger} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                {reminders.length < MAX_REMINDERS && (
                  <TouchableOpacity
                    style={[styles.addButton, { borderColor: colors.primary }]}
                    onPress={() => { hapticFeedback.light(); setShowTimePicker(true); }}
                  >
                    <Icon name="add" size={14} color={colors.primary} />
                    <Text style={[styles.addButtonText, { color: colors.primary }]}>Adicionar horário</Text>
                  </TouchableOpacity>
                )}

                {showTimePicker && (
                  <View style={[styles.pickerContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <DateTimePicker
                      value={currentTime}
                      mode="time"
                      is24Hour={true}
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={onTimeChange}
                    />
                    {Platform.OS === 'ios' && (
                      <View style={styles.pickerButtons}>
                        <TouchableOpacity
                          onPress={() => { hapticFeedback.light(); setShowTimePicker(false); setCurrentTime(new Date()); }}
                          style={[styles.pickerButton, { backgroundColor: colors.surface }]}
                        >
                          <Text style={[styles.pickerButtonText, { color: colors.textSecondary }]}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => { hapticFeedback.selection(); handleAddReminder(); }}
                          style={[styles.pickerButton, { backgroundColor: colors.primary }]}
                        >
                          <Text style={[styles.pickerButtonText, { color: colors.textInverse }]}>Confirmar</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}
              </View>

              <View style={[styles.modalDivider, { backgroundColor: colors.border }]} />

              <ProgressNotificationSettings
                config={progressNotificationConfig}
                onChange={setProgressNotificationConfig}
                hasPermission={hasPermission}
                onRequestPermission={requestNotificationPermission}
                hasTarget={hasTarget}
                habitType={habitType}
              />
            </>
          )}
        </CreateFormBottomSheetModal>
      </View>
    </KeyboardAvoidingView>
  );
}