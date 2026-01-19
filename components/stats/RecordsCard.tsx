import { Icon } from '@/components/ui/Icon';
import { AnimatedPressableComponent } from '@/components/ui/AnimatedPressable';
import { useTheme } from '@/contexts/ThemeContext';
import { hapticFeedback } from '@/utils/haptics';
import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface Record {
  id: string;
  title: string;
  value: string | number;
  subtitle?: string;
  icon: 'trophy' | 'flame' | 'star' | 'crown' | 'zap';
  color: string;
  onPress?: () => void;
}

interface Props {
  records: Record[];
}

export const RecordsCard: React.FC<Props> = ({ records }) => {
  const { colors } = useTheme();

  if (records.length === 0) {
    return null;
  }

  const handleRecordPress = (record: Record) => {
    hapticFeedback.light();
    record.onPress?.();
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.headerIconContainer, { backgroundColor: colors.warningLight }]}>
            <Icon name="trophy" size={24} color={colors.warning} />
          </View>
          <View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Seus Recordes
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Conquistas pessoais
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.recordsList}>
        {records.map((record, index) => (
          <AnimatedPressableComponent
            key={record.id}
            scale={0.98}
            onPress={() => handleRecordPress(record)}
            style={[
              styles.recordItem,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
              },
              index === records.length - 1 && styles.lastRecordItem,
            ]}
          >
            <View
              style={[
                styles.recordIconContainer,
                { backgroundColor: record.color + '20' },
              ]}
            >
              <Icon name={record.icon} size={24} color={record.color} />
            </View>

            <View style={styles.recordContent}>
              <Text style={[styles.recordTitle, { color: colors.textPrimary }]}>
                {record.title}
              </Text>
              {record.subtitle && (
                <Text style={[styles.recordSubtitle, { color: colors.textSecondary }]}>
                  {record.subtitle}
                </Text>
              )}
            </View>

            <View style={styles.recordValue}>
              <Text style={[styles.recordValueText, { color: colors.textPrimary }]}>
                {record.value}
              </Text>
              {record.onPress && (
                <Icon name="chevronRight" size={20} color={colors.textTertiary} />
              )}
            </View>
          </AnimatedPressableComponent>
        ))}
      </View>

      {/* Badge de Total */}
      <View style={[styles.totalBadge, { backgroundColor: colors.primaryLight }]}>
        <Icon name="sparkles" size={16} color={colors.primary} />
        <Text style={[styles.totalBadgeText, { color: colors.primary }]}>
          {records.length} {records.length === 1 ? 'recorde' : 'recordes'} pessoais
        </Text>
      </View>
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
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
  },
  recordsList: {
    gap: 8,
  },
  recordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  lastRecordItem: {},
  recordIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recordContent: {
    flex: 1,
  },
  recordTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  recordSubtitle: {
    fontSize: 12,
  },
  recordValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recordValueText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  totalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  totalBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
});