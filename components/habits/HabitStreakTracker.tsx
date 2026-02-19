// components/habits/HabitStreakTracker.tsx
import React, { useState, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay,
  addMonths,
  subMonths,
  parseISO,
  differenceInDays,
  isToday,
  isFuture,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTheme } from '@/contexts/ThemeContext';
import { Icon } from '@/components/ui/Icon';
import { hapticFeedback } from '@/utils/haptics';

interface DayData {
  date: string;
  completed: boolean;
  value?: number;
  targetValue?: number;
}

interface HabitStreakTrackerProps {
  data: DayData[];
  habitColor: string;
  hasTarget?: boolean;
  onDayPress?: (date: Date, isCompleted: boolean) => void;
}

interface Streak {
  length: number;
  startDate: string;
  endDate: string;
}

export function HabitStreakTracker({ 
  data, 
  habitColor,
  hasTarget = false,
  onDayPress,
}: HabitStreakTrackerProps) {
  const { colors } = useTheme();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // ========== CALCULAR SEQUÊNCIAS ==========
  const calculateStreaks = useMemo(() => {
    if (!data || data.length === 0) return { streaks: [], currentStreak: 0, bestStreak: 0 };

    const sortedData = [...data].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const streaks: Streak[] = [];
    let currentStreakLength = 0;
    let currentStreakStart = '';
    let lastDate: Date | null = null;

    for (const day of sortedData) {
      const currentDate = parseISO(day.date);

      if (day.completed) {
        if (currentStreakLength === 0) {
          currentStreakStart = day.date;
          currentStreakLength = 1;
        } else if (lastDate && differenceInDays(currentDate, lastDate) === 1) {
          currentStreakLength++;
        } else {
          if (currentStreakLength > 0) {
            streaks.push({
              length: currentStreakLength,
              startDate: currentStreakStart,
              endDate: sortedData[sortedData.indexOf(day) - 1].date,
            });
          }
          currentStreakStart = day.date;
          currentStreakLength = 1;
        }
        lastDate = currentDate;
      } else {
        if (currentStreakLength > 0) {
          streaks.push({
            length: currentStreakLength,
            startDate: currentStreakStart,
            endDate: sortedData[sortedData.indexOf(day) - 1].date,
          });
          currentStreakLength = 0;
        }
        lastDate = null;
      }
    }

    if (currentStreakLength > 0) {
      streaks.push({
        length: currentStreakLength,
        startDate: currentStreakStart,
        endDate: sortedData[sortedData.length - 1].date,
      });
    }

    const today = new Date();
    let currentStreak = 0;
    
    for (let i = sortedData.length - 1; i >= 0; i--) {
      const dayDate = parseISO(sortedData[i].date);
      const daysDiff = differenceInDays(today, dayDate);
      
      if (daysDiff > currentStreak) break;
      if (sortedData[i].completed && daysDiff === currentStreak) {
        currentStreak++;
      } else {
        break;
      }
    }

    const bestStreak = streaks.length > 0 ? Math.max(...streaks.map(s => s.length)) : 0;

    return {
      streaks: streaks.sort((a, b) => b.length - a.length).slice(0, 10),
      currentStreak,
      bestStreak,
    };
  }, [data]);

  // ========== CALCULAR ESTATÍSTICAS DO MÊS ==========
  const monthStats = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    
    const monthDays = data.filter(day => {
      const date = parseISO(day.date);
      return date >= monthStart && date <= monthEnd;
    });

    const completed = monthDays.filter(d => d.completed).length;
    const total = monthDays.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { completed, total, percentage };
  }, [data, currentMonth]);

  // ========== GERAR CALENDÁRIO DO MÊS ==========
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const firstDayOfWeek = monthStart.getDay();
    const emptyDays = Array(firstDayOfWeek).fill(null);

    return [...emptyDays, ...days];
  }, [currentMonth]);

  const getDayStatus = (date: Date | null) => {
    if (!date) return null;
    
    const dayData = data.find(d => isSameDay(parseISO(d.date), date));
    
    if (!dayData) return 'empty';
    if (dayData.completed) return 'completed';
    return 'missed';
  };

  // ========== HANDLERS ==========
  const goToPreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const canGoNext = () => {
    const nextMonth = addMonths(currentMonth, 1);
    return nextMonth <= new Date();
  };

  const handleDayPress = (day: Date) => {
    if (!onDayPress) return;
    if (isFuture(day) && !isToday(day)) return;

    hapticFeedback.light();

    const status = getDayStatus(day);
    const isCompleted = status === 'completed';

    onDayPress(day, isCompleted);
  };

  // ========== RENDER VAZIO ==========
  if (!data || data.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.surface }]}>
        <Icon name="activity" size={32} color={colors.textTertiary} />
        <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
          Complete hábitos para ver estatísticas
        </Text>
      </View>
    );
  }

  const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  // ========== RENDER DAY ==========
  const renderDay = (day: Date | null, index: number) => {
    if (!day) {
      return <View key={index} style={styles.dayCell} />;
    }

    const status = getDayStatus(day);
    const isCurrentDay = isToday(day);
    const isFutureDay = isFuture(day) && !isCurrentDay;
    const isClickable = !!onDayPress && !isFutureDay;

    // Determine styles based on status
    let bgColor = 'transparent';
    let borderColor = 'transparent';
    let borderWidth = 0;
    let textColor = colors.text;

    if (isFutureDay) {
      // Future: subtle gray
      bgColor = colors.border + '30';
      textColor = colors.textTertiary;
    } else if (status === 'completed') {
      // Completed: filled with habit color
      bgColor = habitColor;
      textColor = '#FFFFFF';
    } else if (status === 'missed') {
      // Missed (past, not done): border only in habit color, no fill
      bgColor = 'transparent';
      borderColor = habitColor + '45';
      borderWidth = 1.5;
      textColor = colors.textSecondary;
    } else {
      // Empty (no data for this day): very subtle
      bgColor = colors.border + '20';
      textColor = colors.textTertiary;
    }

    // Today: prominent border to highlight current day
    if (isCurrentDay) {
      borderColor = colors.primary;
      borderWidth = 2.5;
      if (status !== 'completed') {
        textColor = colors.primary;
      }
    }

    const dayContent = (
      <View
        style={[
          styles.dayCircle,
          {
            backgroundColor: bgColor,
            borderWidth: borderWidth,
            borderColor: borderColor,
          },
        ]}
      >
        <Text style={[styles.dayText, { color: textColor }]}>
          {format(day, 'd')}
        </Text>
        {/* Today dot indicator when not completed */}
        {isCurrentDay && status !== 'completed' && (
          <View style={[styles.todayDot, { backgroundColor: colors.primary }]} />
        )}
      </View>
    );

    return (
      <View key={index} style={styles.dayCell}>
        {isClickable ? (
          <TouchableOpacity
            style={styles.dayTouchable}
            onPress={() => handleDayPress(day)}
            activeOpacity={0.6}
          >
            {dayContent}
          </TouchableOpacity>
        ) : (
          dayContent
        )}
      </View>
    );
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.surface }]}
      showsVerticalScrollIndicator={false}
    >
      {/* ========== CALENDÁRIO MENSAL ========== */}
      <View style={styles.section}>
        {/* Header com navegação */}
        <View style={styles.calendarHeader}>
          <TouchableOpacity onPress={goToPreviousMonth} style={styles.navButton}>
            <Icon name="chevronLeft" size={24} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.monthHeaderCenter}>
            <Text style={[styles.monthTitle, { color: colors.text }]}>
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </Text>
            {monthStats.total > 0 && (
              <Text style={[styles.monthStatsText, { color: colors.textSecondary }]}>
                {monthStats.completed}/{monthStats.total} dias • {monthStats.percentage}%
              </Text>
            )}
          </View>

          <TouchableOpacity 
            onPress={goToNextMonth} 
            style={styles.navButton}
            disabled={!canGoNext()}
          >
            <Icon 
              name="chevronRight" 
              size={24} 
              color={canGoNext() ? colors.text : colors.textTertiary} 
            />
          </TouchableOpacity>
        </View>

        {/* Dica de interação */}
        {onDayPress && (
          <View style={[styles.hintContainer, { backgroundColor: colors.primaryLight }]}>
            <Icon name="info" size={14} color={colors.primary} />
            <Text style={[styles.hintText, { color: colors.primary }]}>
              Toque em um dia para marcar ou desmarcar
            </Text>
          </View>
        )}

        {/* Legenda */}
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: habitColor }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>Feito</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDotOutline, { borderColor: habitColor + '45' }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>Não feito</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDotBorder, { borderColor: colors.primary }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>Hoje</Text>
          </View>
        </View>

        {/* Dias da semana */}
        <View style={styles.weekDaysRow}>
          {weekDays.map((day, index) => (
            <View key={index} style={styles.weekDayCell}>
              <Text style={[styles.weekDayText, { color: colors.textTertiary }]}>
                {day}
              </Text>
            </View>
          ))}
        </View>

        {/* Grid de dias */}
        <View style={styles.calendarGrid}>
          {calendarDays.map((day, index) => renderDay(day, index))}
        </View>
      </View>

      {/* ========== GRÁFICO DE SEQUÊNCIAS ========== */}
      {calculateStreaks.streaks.length > 0 && (
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Icon name="trendingUp" size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Histórico de Sequências
            </Text>
          </View>

          <View style={styles.streaksChart}>
            {calculateStreaks.streaks.map((streak, index) => {
              const maxStreak = calculateStreaks.bestStreak;
              const percentage = (streak.length / maxStreak) * 100;

              return (
                <View key={index} style={styles.streakRow}>
                  <Text style={[styles.streakIndex, { color: colors.textTertiary }]}>
                    #{index + 1}
                  </Text>

                  <View style={styles.streakBarContainer}>
                    <View
                      style={[
                        styles.streakBar,
                        {
                          width: `${percentage}%`,
                          backgroundColor: habitColor,
                        },
                      ]}
                    />
                  </View>

                  <Text style={[styles.streakValue, { color: colors.text }]}>
                    {streak.length} {streak.length === 1 ? 'dia' : 'dias'}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Espaçamento final */}
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },

  // ========== SECTIONS ==========
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },

  // ========== CALENDÁRIO ==========
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  monthHeaderCenter: {
    alignItems: 'center',
  },
  navButton: {
    padding: 8,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  monthStatsText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  hintText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // ========== LEGENDA ==========
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendDotOutline: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  legendDotBorder: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  legendText: {
    fontSize: 11,
    fontWeight: '500',
  },

  // ========== GRID ==========
  weekDaysRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDayCell: {
    flex: 1,
    alignItems: 'center',
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '600',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    padding: 2,
  },
  dayTouchable: {
    flex: 1,
  },
  dayCircle: {
    flex: 1,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayText: {
    fontSize: 12,
    fontWeight: '600',
  },
  todayDot: {
    position: 'absolute',
    bottom: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
  },

  // ========== STREAKS CHART ==========
  streaksChart: {
    gap: 12,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  streakIndex: {
    fontSize: 12,
    fontWeight: '600',
    width: 24,
  },
  streakBarContainer: {
    flex: 1,
    height: 28,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  streakBar: {
    height: '100%',
    borderRadius: 6,
    minWidth: 28,
  },
  streakValue: {
    fontSize: 12,
    fontWeight: '600',
    width: 60,
    textAlign: 'right',
  },

  // ========== EMPTY STATE ==========
  emptyContainer: {
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});