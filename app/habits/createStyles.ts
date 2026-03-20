// app/habits/createStyles.ts
import { StyleSheet, Dimensions, Platform } from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const styles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cancelButton: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  helperText: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 4,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  habitTypeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  habitTypeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  habitTypeOptionPositive: {
    borderColor: colors.success,
    backgroundColor: colors.successLight,
  },
  habitTypeOptionNegative: {
    borderColor: colors.warning,
    backgroundColor: colors.warningLight,
  },
  habitTypeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  habitTypeLabelPositive: {
    color: colors.success,
  },
  habitTypeLabelNegative: {
    color: colors.warning,
  },
  habitTypeDescription: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  metaSeparator: {
    borderTopWidth: 1,
    marginVertical: 8,
    marginBottom: 16,
  },

  // ===== SUMMARY ROWS (compact buttons) =====
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
  summaryTextContainer: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: '500',
  },

  // ===== BOTTOM SHEET MODAL =====
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalKeyboardView: {
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.85,
    minHeight: SCREEN_HEIGHT * 0.3,
  },
  modalHandle: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  modalHandleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
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
  modalSection: {
    marginBottom: 16,
  },
  modalSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  modalSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  modalSectionSubtitle: {
    fontSize: 12,
    marginBottom: 12,
  },
  modalDivider: {
    height: 1,
    marginVertical: 8,
  },

  // ===== REMINDERS (inside modal) =====
  permissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  permissionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  remindersList: {
    gap: 8,
    marginBottom: 12,
  },
  reminderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  reminderTime: {
    fontSize: 14,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    marginBottom: 8,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  pickerContainer: {
    marginTop: 12,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  pickerButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  pickerButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  pickerButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  reminderBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  reminderBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  inlinePanel: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginTop: -4,
    marginBottom: 10,
  },
});