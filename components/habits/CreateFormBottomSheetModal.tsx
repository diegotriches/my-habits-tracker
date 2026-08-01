import React from 'react';
import { Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Icon } from '@/components/ui/Icon';

interface CreateFormBottomSheetModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  children: React.ReactNode;
  // Estilos vindos de createStyles(colors) da tela de criação e o objeto
  // de cores do tema — passados como props em vez de duplicar o
  // StyleSheet aqui, para manter a aparência idêntica à original.
  styles: any;
  colors: any;
}

/**
 * Assim como o BottomSheetModal de components/ui/, este componente vive
 * no módulo — não dentro do corpo de CreateHabitScreen. Definir um
 * componente dentro de outro componente faz o React recriá-lo a cada
 * render do pai (nova identidade de tipo a cada vez), forçando
 * desmontagem/remontagem da subárvore do modal a cada tecla digitada.
 */
export function CreateFormBottomSheetModal({
  visible,
  onCancel,
  onConfirm,
  title,
  children,
  styles,
  colors,
}: CreateFormBottomSheetModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onCancel}>
      <Pressable style={styles.modalOverlay} onPress={onCancel}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalKeyboardView}
        >
          <Pressable style={[styles.modalContent, { backgroundColor: colors.background }]} onPress={Keyboard.dismiss}>
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
              style={styles.modalBody}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {children}
              <View style={{ height: 40 }} />
            </ScrollView>
            <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.modalConfirmButton, { backgroundColor: colors.primary }]}
                onPress={onConfirm}
              >
                <Text style={styles.modalConfirmText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}