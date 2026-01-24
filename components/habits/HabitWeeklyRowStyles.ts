// components/habits/HabitWeeklyRow.styles.ts
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  // ========== CONTAINER ==========
  container: {
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },

  colorIndicator: {
    width: 4,
  },

  habitInfo: {
    flex: 1,
    padding: 12,
  },

  // ========== HEADER ==========
  habitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },

  habitNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },

  habitName: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },

  // ========== STATS ==========
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  progressText: {
    fontSize: 13,
    fontWeight: '600',
  },

  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },

  streakText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // ========== WEEK GRID ==========
  weekGrid: {
    marginBottom: 8,
  },

  dayLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },

  dayLabel: {
    fontSize: 11,
    fontWeight: '600',
    width: 32,
    textAlign: 'center',
  },

  dayCheckboxes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  // ========== DAY CHECKBOX ==========
  dayCheckbox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },

  todayCheckbox: {
    borderWidth: 2.5,
  },

  futureCheckbox: {
    opacity: 0.4,
  },

  todayDot: {
    position: 'absolute',
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
  },

  badgeText: {
    fontSize: 9,
    fontWeight: '700',
  },

  // ========== PROGRESS BAR ==========
  progressBar: {
    height: 3,
    borderRadius: 1.5,
    overflow: 'hidden',
    marginTop: 4,
  },

  progressFill: {
    height: '100%',
    borderRadius: 1.5,
  },
});