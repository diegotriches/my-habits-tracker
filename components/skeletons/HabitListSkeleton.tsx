import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '@/app/contexts/ThemeContext';

interface HabitListSkeletonProps {
  count?: number;
}

export const HabitListSkeleton: React.FC<HabitListSkeletonProps> = ({ count = 5 }) => {
  const { colors } = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const skeletonColor = colors.surfaceElevated;

  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, index) => (
        <Animated.View
          key={index}
          style={[styles.card, { 
            opacity,
            backgroundColor: colors.surface 
          }]}
        >
          <View style={[styles.colorIndicator, { backgroundColor: skeletonColor }]} />
          
          <View style={styles.content}>
            <View style={styles.header}>
              <View style={[styles.titleSkeleton, { backgroundColor: skeletonColor }]} />
              <View style={[styles.streakSkeleton, { backgroundColor: skeletonColor }]} />
            </View>
            
            <View style={[styles.descriptionSkeleton, { backgroundColor: skeletonColor }]} />
            
            <View style={styles.footer}>
              <View style={[styles.badgeSkeleton, { backgroundColor: skeletonColor }]} />
              <View style={[styles.pointsSkeleton, { backgroundColor: skeletonColor }]} />
            </View>
          </View>

          <View style={[styles.checkButtonSkeleton, { backgroundColor: skeletonColor }]} />
        </Animated.View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  card: {
    borderRadius: 16,
    marginBottom: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorIndicator: {
    width: 4,
    height: 60,
    borderRadius: 2,
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleSkeleton: {
    width: '60%',
    height: 16,
    borderRadius: 4,
  },
  streakSkeleton: {
    width: 40,
    height: 20,
    borderRadius: 10,
  },
  descriptionSkeleton: {
    width: '80%',
    height: 14,
    borderRadius: 4,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    gap: 8,
  },
  badgeSkeleton: {
    width: 60,
    height: 24,
    borderRadius: 6,
  },
  pointsSkeleton: {
    width: 50,
    height: 24,
    borderRadius: 6,
  },
  checkButtonSkeleton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginLeft: 12,
  },
});