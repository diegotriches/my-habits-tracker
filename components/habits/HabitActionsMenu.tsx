import React from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { IconName } from '@/constants/Icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useActionsMenu } from '@/hooks/useActionsMenu';

export interface HabitActionsMenuItem {
  key: string;
  icon: IconName;
  label: string;
  color?: string;
  onPress: () => void;
}

interface HabitActionsMenuProps {
  items: HabitActionsMenuItem[];
  topOffset: number;
  loading?: boolean;
}

export const HabitActionsMenu = React.memo(function HabitActionsMenu({
  items,
  topOffset,
  loading,
}: HabitActionsMenuProps) {
  const { colors } = useTheme();
  const { visible, menuAnim, triggerScale, toggle, close, handlePressIn, handlePressOut } =
    useActionsMenu();

  const handleItemPress = (onPress: () => void) => {
    close();
    onPress();
  };

  return (
    <>
      <Animated.View style={{ transform: [{ scale: triggerScale }] }}>
        <TouchableOpacity
          onPress={toggle}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={styles.triggerButton}
          disabled={loading}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {loading ? (
            <ActivityIndicator size={18} color={colors.danger} />
          ) : (
            <Icon name="more" size={22} color={colors.textPrimary} />
          )}
        </TouchableOpacity>
      </Animated.View>

      <Modal
        visible={visible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={close}
      >
        <Pressable style={styles.overlay} onPress={close}>
          <Animated.View
            style={[
              styles.menu,
              {
                top: topOffset,
                backgroundColor: colors.surface,
                borderColor: colors.border,
                opacity: menuAnim,
                transform: [
                  { scale: menuAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
                  {
                    translateY: menuAnim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }),
                  },
                ],
              },
            ]}
          >
            {items.map((item, index) => (
              <React.Fragment key={item.key}>
                <TouchableOpacity
                  style={styles.item}
                  onPress={() => handleItemPress(item.onPress)}
                  activeOpacity={0.7}
                >
                  <Icon name={item.icon} size={18} color={item.color || colors.textPrimary} />
                  <Text style={[styles.itemText, { color: item.color || colors.textPrimary }]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
                {index < items.length - 1 && (
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                )}
              </React.Fragment>
            ))}
          </Animated.View>
        </Pressable>
      </Modal>
    </>
  );
});

const styles = StyleSheet.create({
  triggerButton: { padding: 8 },
  overlay: { flex: 1 },
  menu: {
    position: 'absolute',
    right: 20,
    minWidth: 170,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  itemText: { fontSize: 15, fontWeight: '600' },
  divider: { height: 1, marginHorizontal: 8 },
});
