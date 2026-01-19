import React, { useEffect } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { useTheme } from '@/contexts/ThemeContext';

const { width, height } = Dimensions.get('window');

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  rotation: number;
  delay: number;
}

interface ConfettiProps {
  visible: boolean;
  onComplete?: () => void;
  particleCount?: number;
}

/**
 * Componente de celebração com confetti
 * Usado quando usuário atinge milestones importantes
 */
export function Confetti({ 
  visible, 
  onComplete, 
  particleCount = 50 
}: ConfettiProps) {
  const { colors } = useTheme();
  const opacity = useSharedValue(0);

  // Cores do confetti baseadas no tema
  const confettiColors = [
    colors.primary,
    colors.success,
    colors.warning,
    colors.streak,
    colors.points,
    colors.level,
  ];

  // Gerar peças de confetti aleatórias
  const pieces: ConfettiPiece[] = Array.from({ length: particleCount }, (_, i) => ({
    id: i,
    x: Math.random() * width,
    color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
    rotation: Math.random() * 360,
    delay: Math.random() * 300,
  }));

  useEffect(() => {
    if (visible) {
      opacity.value = withSequence(
        withTiming(1, { duration: 100 }),
        withDelay(
          2000,
          withTiming(0, { duration: 500 }, (finished) => {
            if (finished && onComplete) {
              runOnJS(onComplete)();
            }
          })
        )
      );
    } else {
      opacity.value = 0;
    }
  }, [visible]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, containerStyle]} pointerEvents="none">
      {pieces.map((piece) => (
        <ConfettiPiece key={piece.id} {...piece} />
      ))}
    </Animated.View>
  );
}

function ConfettiPiece({ x, color, rotation, delay }: Omit<ConfettiPiece, 'id'>) {
  const translateY = useSharedValue(-20);
  const translateX = useSharedValue(0);
  const rotate = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    const startAnimation = () => {
      translateY.value = withDelay(
        delay,
        withTiming(height + 50, {
          duration: 2500,
          easing: Easing.out(Easing.cubic),
        })
      );

      translateX.value = withDelay(
        delay,
        withSpring((Math.random() - 0.5) * 100, {
          damping: 10,
          stiffness: 50,
        })
      );

      rotate.value = withDelay(
        delay,
        withTiming(rotation + 720, {
          duration: 2500,
          easing: Easing.linear,
        })
      );

      scale.value = withDelay(
        delay,
        withSequence(
          withSpring(1.2, { damping: 8 }),
          withTiming(0.8, { duration: 2000 })
        )
      );
    };

    startAnimation();
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.piece,
        {
          left: x,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  piece: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 2,
  },
});