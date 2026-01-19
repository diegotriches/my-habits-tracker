// components/ui/HabitCompletionAnimation.tsx
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import React, { useEffect } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

interface HabitCompletionAnimationProps {
  points: number;
  onComplete?: () => void;
}

export const HabitCompletionAnimation: React.FC<HabitCompletionAnimationProps> = ({
  points,
  onComplete,
}) => {
  const { colors } = useTheme();
  const scaleAnim = new Animated.Value(0);
  const opacityAnim = new Animated.Value(0);
  const translateYAnim = new Animated.Value(0);

  useEffect(() => {
    // Animação do check (pop)
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1.2,
          friction: 3,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();

    // Animação dos pontos (subindo e desaparecendo)
    Animated.sequence([
      Animated.delay(300),
      Animated.parallel([
        Animated.timing(translateYAnim, {
          toValue: -50,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 1000,
          delay: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      if (onComplete) onComplete();
    });
  }, []);

  return (
    <View style={styles.container}>
      {/* Check Icon Animado */}
      <Animated.View
        style={[
          styles.checkContainer,
          {
            backgroundColor: colors.background,
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        <Icon name="checkCircle" size={60} color={colors.success} />
      </Animated.View>

      {/* Pontos Animados */}
      <Animated.Text
        style={[
          styles.pointsText,
          {
            color: colors.success,
            transform: [{ translateY: translateYAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        +{points} pts
      </Animated.Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    pointerEvents: 'none',
  },
  checkContainer: {
    borderRadius: 50,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  pointsText: {
    position: 'absolute',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 80,
  },
});