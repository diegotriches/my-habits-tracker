import React from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { ReminderSetup } from '@/components/habits/ReminderSetup';
import {
  ProgressNotificationSettings,
  ProgressNotificationConfig,
} from '@/components/habits/ProgressNotificationSettings';
import { useTheme } from '@/contexts/ThemeContext';

interface HabitNotificationsModalProps {
  visible: boolean;
  onClose: () => void;
  habitId: string;
  habitName: string;
  habitType: string;
  hasTarget: boolean;
  config: ProgressNotificationConfig;
  onChange: (config: ProgressNotificationConfig) => void;
  hasPermission: boolean;
  onRequestPermission: () => void;
  saving: boolean;
  themeColor: string;
}

export const HabitNotificationsModal = React.memo(function HabitNotificationsModal({
  visible,
  onClose,
  habitId,
  habitName,
  habitType,
  hasTarget,
  config,
  onChange,
  hasPermission,
  onRequestPermission,
  saving,
  themeColor,
}: HabitNotificationsModalProps) {
  const { colors } = useTheme();
  const screenHeight = Dimensions.get('window').height;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          <View style={styles.modalHandle}>
            <View style={[styles.modalHandleBar, { backgroundColor: colors.border }]} />
          </View>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Notificações</Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={{ maxHeight: screenHeight * 0.6 }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={{ marginBottom: 20 }}>
              <ReminderSetup habitId={habitId} habitName={habitName} />
            </View>

            <View style={{ marginBottom: 12 }}>
              <ProgressNotificationSettings
                config={config}
                onChange={onChange}
                hasPermission={hasPermission}
                onRequestPermission={onRequestPermission}
                hasTarget={hasTarget}
                habitType={habitType as any}
              />
              {saving && (
                <View style={[styles.savingIndicator, { backgroundColor: colors.surface }]}>
                  <ActivityIndicator size="small" color={themeColor} />
                  <Text style={[styles.savingText, { color: themeColor }]}>Salvando...</Text>
                </View>
              )}
            </View>
          </ScrollView>
          <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.modalConfirmButton, { backgroundColor: colors.primary }]}
              onPress={onClose}
            >
              <Text style={styles.modalConfirmText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24 },
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
  modalConfirmButton: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalConfirmText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  savingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
    marginHorizontal: 20,
  },
  savingText: { fontSize: 13, fontWeight: '600' },
});
