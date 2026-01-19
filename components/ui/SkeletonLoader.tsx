// components/ui/SkeletonLoader.tsx
import { useTheme } from '@/contexts/ThemeContext';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

interface SkeletonLoaderProps {
  count?: number;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ count = 3 }) => {
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

  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, index) => (
        <Animated.View
          key={index}
          style={[
            styles.skeletonCard,
            { backgroundColor: colors.surface, opacity }
          ]}
        >
          <View style={styles.skeletonHeader}>
            <View style={[styles.skeletonCircle, { backgroundColor: colors.border }]} />
            <View style={styles.skeletonTextContainer}>
              <View style={[styles.skeletonTitle, { backgroundColor: colors.border }]} />
              <View style={[styles.skeletonSubtitle, { backgroundColor: colors.border }]} />
            </View>
          </View>
          <View style={styles.skeletonFooter}>
            <View style={[styles.skeletonBadge, { backgroundColor: colors.border }]} />
            <View style={[styles.skeletonBadge, { backgroundColor: colors.border }]} />
          </View>
        </Animated.View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  skeletonCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  skeletonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  skeletonTextContainer: {
    flex: 1,
  },
  skeletonTitle: {
    height: 16,
    borderRadius: 4,
    marginBottom: 8,
    width: '70%',
  },
  skeletonSubtitle: {
    height: 12,
    borderRadius: 4,
    width: '40%',
  },
  skeletonFooter: {
    flexDirection: 'row',
    gap: 8,
  },
  skeletonBadge: {
    height: 24,
    width: 60,
    borderRadius: 12,
  },
});