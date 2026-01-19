import React from 'react';
import { Pressable, PressableProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface AnimatedPressableComponentProps extends PressableProps {
  children: React.ReactNode;
  scale?: number;
  hapticFeedback?: 'light' | 'medium' | 'heavy' | 'selection' | 'none';
}

/**
 * Pressable com animação de escala ao pressionar
 * Adiciona feedback visual suave e profissional
 */
export function AnimatedPressableComponent({
  children,
  scale = 0.95,
  hapticFeedback = 'none',
  onPress,
  onPressIn,
  onPressOut,
  ...props
}: AnimatedPressableComponentProps) {
  const pressed = useSharedValue(false);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: withSpring(pressed.value ? scale : 1, {
          damping: 15,
          stiffness: 300,
        }),
      },
    ],
  }));

  const handlePressIn = (e: any) => {
    pressed.value = true;
    onPressIn?.(e);
  };

  const handlePressOut = (e: any) => {
    pressed.value = false;
    onPressOut?.(e);
  };

  const handlePress = async (e: any) => {
    // Trigger haptic feedback if specified
    if (hapticFeedback !== 'none') {
      const { hapticFeedback: haptics } = await import('@/utils/haptics');
      haptics[hapticFeedback]?.();
    }
    onPress?.(e);
  };

  return (
    <AnimatedPressable
      style={animatedStyle}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      {...props}
    >
      {children}
    </AnimatedPressable>
  );
}