import { useTheme } from '@/contexts/ThemeContext';
import React, { useEffect, useRef } from 'react';
import { Animated, ScrollView, StyleSheet, View } from 'react-native';

export const ProfileSkeleton: React.FC = () => {
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
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { 
        backgroundColor: colors.surface,
        borderBottomColor: colors.border 
      }]}>
        <Animated.View style={[styles.headerTitle, { opacity, backgroundColor: skeletonColor }]} />
      </View>

      {/* Profile Header */}
      <Animated.View style={[styles.profileHeader, { 
        opacity,
        backgroundColor: colors.surface 
      }]}>
        <View style={[styles.avatar, { backgroundColor: skeletonColor }]} />
        <View style={[styles.levelBadge, { backgroundColor: skeletonColor }]} />
        <View style={[styles.username, { backgroundColor: skeletonColor }]} />
        <View style={[styles.levelTitle, { backgroundColor: skeletonColor }]} />
      </Animated.View>

      {/* Stats Cards */}
      <View style={styles.section}>
        <Animated.View style={[styles.sectionTitle, { opacity, backgroundColor: skeletonColor }]} />
        <Animated.View style={[styles.statsCard, { 
          opacity,
          backgroundColor: colors.surface 
        }]}>
          <View style={styles.statItem}>
            <View style={[styles.statValue, { backgroundColor: skeletonColor }]} />
            <View style={[styles.statLabel, { backgroundColor: skeletonColor }]} />
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <View style={[styles.statValue, { backgroundColor: skeletonColor }]} />
            <View style={[styles.statLabel, { backgroundColor: skeletonColor }]} />
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <View style={[styles.statValue, { backgroundColor: skeletonColor }]} />
            <View style={[styles.statLabel, { backgroundColor: skeletonColor }]} />
          </View>
        </Animated.View>
      </View>

      {/* Penalties Section */}
      <View style={styles.section}>
        <Animated.View style={[styles.sectionTitle, { opacity, backgroundColor: skeletonColor }]} />
        <Animated.View style={[styles.card, { 
          opacity,
          backgroundColor: colors.surface 
        }]}>
          <View style={[styles.cardLine, { backgroundColor: skeletonColor }]} />
          <View style={[styles.cardLine, { backgroundColor: skeletonColor }]} />
        </Animated.View>
      </View>

      {/* Account Info */}
      <View style={styles.section}>
        <Animated.View style={[styles.sectionTitle, { opacity, backgroundColor: skeletonColor }]} />
        <Animated.View style={[styles.card, { 
          opacity,
          backgroundColor: colors.surface 
        }]}>
          <View style={[styles.cardLine, { backgroundColor: skeletonColor }]} />
          <View style={[styles.cardLine, { backgroundColor: skeletonColor }]} />
        </Animated.View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    width: 120,
    height: 32,
    borderRadius: 4,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  levelBadge: {
    width: 60,
    height: 28,
    borderRadius: 14,
    marginBottom: 12,
  },
  username: {
    width: 150,
    height: 20,
    borderRadius: 4,
    marginBottom: 8,
  },
  levelTitle: {
    width: 100,
    height: 16,
    borderRadius: 4,
  },
  section: {
    marginTop: 12,
  },
  sectionTitle: {
    marginHorizontal: 20,
    marginVertical: 12,
    width: 120,
    height: 16,
    borderRadius: 4,
  },
  statsCard: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    width: 40,
    height: 24,
    borderRadius: 4,
    marginBottom: 8,
  },
  statLabel: {
    width: 60,
    height: 12,
    borderRadius: 4,
  },
  statDivider: {
    width: 1,
    marginHorizontal: 20,
  },
  card: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  cardLine: {
    height: 16,
    borderRadius: 4,
    marginBottom: 12,
  },
});