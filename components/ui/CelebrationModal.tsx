import React, { useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withDelay,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useTheme } from '@/contexts/ThemeContext';
import { Icon } from './Icon';
import { Confetti } from './Confetti';
import { hapticFeedback } from '@/utils/haptics';

const { width } = Dimensions.get('window');

interface CelebrationModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  icon?: 'flame' | 'trophy' | 'star' | 'crown' | 'rocket' | 'sparkles';
  streak?: number;
}

export function CelebrationModal({
  visible,
  onClose,
  title,
  message,
  icon = 'trophy',
  streak,
}: CelebrationModalProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(0);
  const iconScale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      hapticFeedback.success();

      opacity.value = withTiming(1, { duration: 200 });
      scale.value = withSpring(1, { damping: 15, stiffness: 150 });
      iconScale.value = withSequence(
        withDelay(200, withSpring(1.2, { damping: 10 })),
        withSpring(1, { damping: 15 })
      );
    } else {
      opacity.value = 0;
      scale.value = 0;
      iconScale.value = 0;
    }
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const handleClose = () => {
    opacity.value = withTiming(0, { duration: 200 });
    scale.value = withTiming(0, { duration: 200 }, (finished) => {
      if (finished) {
        runOnJS(onClose)();
      }
    });
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={styles.backdropPressable} onPress={handleClose} />

        <Animated.View style={[styles.container, { backgroundColor: colors.surface }, containerStyle]}>
          {/* Icon */}
          <Animated.View style={[styles.iconContainer, { backgroundColor: colors.primaryLight }, iconStyle]}>
            <Icon name={icon} size={48} color={colors.primary} />
          </Animated.View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>

          {/* Message */}
          <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>

          {/* Streak stat */}
          {streak !== undefined && (
            <View style={styles.stats}>
              <View style={[styles.statItem, { backgroundColor: colors.background }]}>
                <Icon name="flame" size={20} color={colors.streak} />
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>{streak}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>dias</Text>
              </View>
            </View>
          )}

          {/* Close Button */}
          <Pressable style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleClose}>
            <Text style={styles.buttonText}>Continuar</Text>
          </Pressable>
        </Animated.View>

        <Confetti visible={visible} particleCount={60} />
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdropPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    width: width - 64,
    maxWidth: 400,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  stats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 14,
  },
  button: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});