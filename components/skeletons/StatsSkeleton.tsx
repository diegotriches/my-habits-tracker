import { useTheme } from '@/contexts/ThemeContext';
import React, { useEffect, useRef } from 'react';
import { Animated, ScrollView, StyleSheet, View } from 'react-native';

export const StatsSkeleton: React.FC = () => {
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
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]} 
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <View style={styles.header}>
        <Animated.View style={[styles.title, { opacity, backgroundColor: skeletonColor }]} />
        <Animated.View style={[styles.subtitle, { opacity, backgroundColor: skeletonColor }]} />
      </View>

      {/* Level Card */}
      <Animated.View style={[styles.card, styles.levelCard, { 
        opacity,
        backgroundColor: colors.surface 
      }]}>
        <View style={[styles.levelHeader, { backgroundColor: skeletonColor }]} />
        <View style={[styles.progressBar, { backgroundColor: skeletonColor }]} />
        <View style={[styles.levelFooter, { backgroundColor: skeletonColor }]} />
      </Animated.View>

      {/* Chart Card */}
      <Animated.View style={[styles.card, styles.chartCard, { 
        opacity,
        backgroundColor: colors.surface 
      }]}>
        <View style={[styles.chartHeader, { backgroundColor: skeletonColor }]} />
        <View style={[styles.chartArea, { backgroundColor: skeletonColor }]} />
      </Animated.View>

      {/* Summary Cards */}
      <View style={styles.summaryGrid}>
        <Animated.View style={[styles.summaryCard, { 
          opacity,
          backgroundColor: colors.surface 
        }]}>
          <View style={[styles.summaryIcon, { backgroundColor: skeletonColor }]} />
          <View style={[styles.summaryValue, { backgroundColor: skeletonColor }]} />
          <View style={[styles.summaryLabel, { backgroundColor: skeletonColor }]} />
        </Animated.View>

        <Animated.View style={[styles.summaryCard, { 
          opacity,
          backgroundColor: colors.surface 
        }]}>
          <View style={[styles.summaryIcon, { backgroundColor: skeletonColor }]} />
          <View style={[styles.summaryValue, { backgroundColor: skeletonColor }]} />
          <View style={[styles.summaryLabel, { backgroundColor: skeletonColor }]} />
        </Animated.View>
      </View>

      {/* Streaks List */}
      <Animated.View style={[styles.card, { 
        opacity,
        backgroundColor: colors.surface 
      }]}>
        <View style={[styles.listHeader, { backgroundColor: skeletonColor }]} />
        <View style={[styles.listItem, { backgroundColor: skeletonColor }]} />
        <View style={[styles.listItem, { backgroundColor: skeletonColor }]} />
        <View style={[styles.listItem, { backgroundColor: skeletonColor }]} />
      </Animated.View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    width: 200,
    height: 32,
    borderRadius: 4,
    marginBottom: 8,
  },
  subtitle: {
    width: 150,
    height: 16,
    borderRadius: 4,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  levelCard: {
    height: 120,
  },
  levelHeader: {
    width: '60%',
    height: 20,
    borderRadius: 4,
    marginBottom: 16,
  },
  progressBar: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    marginBottom: 12,
  },
  levelFooter: {
    width: '40%',
    height: 14,
    borderRadius: 4,
  },
  chartCard: {
    height: 250,
  },
  chartHeader: {
    width: 120,
    height: 18,
    borderRadius: 4,
    marginBottom: 16,
  },
  chartArea: {
    flex: 1,
    borderRadius: 8,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 12,
  },
  summaryValue: {
    width: 40,
    height: 24,
    borderRadius: 4,
    marginBottom: 8,
  },
  summaryLabel: {
    width: 60,
    height: 12,
    borderRadius: 4,
  },
  listHeader: {
    width: 120,
    height: 18,
    borderRadius: 4,
    marginBottom: 16,
  },
  listItem: {
    height: 60,
    borderRadius: 8,
    marginBottom: 12,
  },
});