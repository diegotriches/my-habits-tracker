import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import { hapticFeedback } from '@/utils/haptics';
import React, { useState } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface Insight {
  type: 'success' | 'warning' | 'info';
  title: string;
  message: string;
  icon: 'trendingUp' | 'alert' | 'info' | 'star' | 'calendar';
}

interface Props {
  insights: Insight[];
}

export const InsightsCard: React.FC<Props> = ({ insights }) => {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const rotation = useSharedValue(0);

  const toggleExpanded = () => {
    hapticFeedback.selection();
    setExpanded(!expanded);
    rotation.value = withSpring(expanded ? 0 : 180, {
      damping: 15,
      stiffness: 150,
    });
  };

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'success':
        return colors.success;
      case 'warning':
        return colors.warning;
      case 'info':
      default:
        return colors.info;
    }
  };

  if (insights.length === 0) {
    return null;
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <TouchableOpacity
        style={styles.header}
        onPress={toggleExpanded}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <View style={[styles.iconContainer, { backgroundColor: colors.infoLight }]}>
            <Icon name="sparkles" size={20} color={colors.info} />
          </View>
          <View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Insights Personalizados
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {insights.length} {insights.length === 1 ? 'insight' : 'insights'} para você
            </Text>
          </View>
        </View>
        <Animated.View style={chevronStyle}>
          <Icon name="chevronDown" size={24} color={colors.textSecondary} />
        </Animated.View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.content}>
          {insights.map((insight, index) => (
            <View
              key={index}
              style={[
                styles.insightItem,
                { borderLeftColor: getInsightColor(insight.type) },
                index === insights.length - 1 && styles.lastInsightItem,
              ]}
            >
              <View
                style={[
                  styles.insightIconContainer,
                  {
                    backgroundColor:
                      insight.type === 'success'
                        ? colors.successLight
                        : insight.type === 'warning'
                        ? colors.warningLight
                        : colors.infoLight,
                  },
                ]}
              >
                <Icon
                  name={insight.icon}
                  size={16}
                  color={getInsightColor(insight.type)}
                />
              </View>
              <View style={styles.insightContent}>
                <Text style={[styles.insightTitle, { color: colors.textPrimary }]}>
                  {insight.title}
                </Text>
                <Text style={[styles.insightMessage, { color: colors.textSecondary }]}>
                  {insight.message}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
  },
  content: {
    marginTop: 16,
    paddingTop: 16,
  },
  insightItem: {
    flexDirection: 'row',
    gap: 12,
    paddingLeft: 12,
    paddingVertical: 12,
    borderLeftWidth: 3,
    marginBottom: 12,
  },
  lastInsightItem: {
    marginBottom: 0,
  },
  insightIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  insightMessage: {
    fontSize: 13,
    lineHeight: 18,
  },
});