// components/habits/HabitWeeklyRowStyles.ts
import { StyleSheet } from 'react-native';

export const createWeeklyRowStyles = (colors: any, habitColor?: string) => StyleSheet.create({
  // ========== CONTAINER ==========
  container: {
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 2.5,
    backgroundColor: colors.background,
    borderColor: habitColor ? habitColor + '40' : colors.border,
    shadowColor: habitColor || '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
    flexDirection: 'row',
    overflow: 'hidden',
  },

  colorIndicator: {
    width: 5,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    position: 'absolute',
    left: -1,
    top: -1,
    bottom: -1,
  },

  habitInfo: {
    flex: 1,
    padding: 14,
    paddingLeft: 16,
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
    fontSize: 16,
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
    borderRadius: 8,
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
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 4,
  },

  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});

// Static styles fallback (for backward compatibility)
export const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 2.5,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  colorIndicator: { width: 5, borderTopLeftRadius: 16, borderBottomLeftRadius: 16, position: 'absolute', left: -1, top: -1, bottom: -1 },
  habitInfo: { flex: 1, padding: 14, paddingLeft: 16 },
  habitHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  habitNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  habitName: { fontSize: 16, fontWeight: '600', flex: 1 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressText: { fontSize: 13, fontWeight: '600' },
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  streakText: { fontSize: 11, fontWeight: '700' },
  weekGrid: { marginBottom: 8 },
  dayLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  dayLabel: { fontSize: 11, fontWeight: '600', width: 32, textAlign: 'center' },
  dayCheckboxes: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCheckbox: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  todayCheckbox: { borderWidth: 2.5 },
  futureCheckbox: { opacity: 0.4 },
  todayDot: { position: 'absolute', bottom: 2, width: 4, height: 4, borderRadius: 2 },
  badgeText: { fontSize: 9, fontWeight: '700' },
  progressBar: { height: 4, borderRadius: 2, overflow: 'hidden', marginTop: 4 },
  progressFill: { height: '100%', borderRadius: 2 },
});