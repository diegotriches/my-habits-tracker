// components/habits/HabitCalendar.tsx
import { useTheme } from '@/contexts/ThemeContext';
import { eachDayOfInterval, endOfMonth, format, isSameDay, startOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface HabitCalendarProps {
  completionDates: string[];
  color?: string;
}

export default function HabitCalendar({ completionDates, color }: HabitCalendarProps) {
  const { colors } = useTheme();
  const habitColor = color || colors.primary;

  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  
  const prevMonthStart = startOfMonth(subMonths(today, 1));
  const allDays = eachDayOfInterval({ start: prevMonthStart, end: monthEnd });
  
  const completionDateObjects = completionDates.map(dateStr => new Date(dateStr));
  
  const isCompleted = (day: Date) => {
    return completionDateObjects.some(completionDate => 
      isSameDay(day, completionDate)
    );
  };

  const monthName = format(monthStart, 'MMMM yyyy', { locale: ptBR });

  const weeks: Date[][] = [];
  let currentWeek: Date[] = [];
  
  allDays.forEach((day, index) => {
    const dayOfWeek = day.getDay();
    
    if (dayOfWeek === 0 && currentWeek.length > 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    
    currentWeek.push(day);
    
    if (index === allDays.length - 1) {
      weeks.push(currentWeek);
    }
  });

  const displayWeeks = weeks.slice(-5);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Text style={[styles.monthTitle, { color: colors.textPrimary }]}>
        {monthName}
      </Text>
      
      {/* Header dos dias da semana */}
      <View style={styles.weekDaysHeader}>
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, index) => (
          <Text key={index} style={[styles.weekDayText, { color: colors.textSecondary }]}>
            {day}
          </Text>
        ))}
      </View>

      {/* Grid de dias */}
      <View style={styles.calendar}>
        {displayWeeks.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.week}>
            {week.map((day, dayIndex) => {
              const completed = isCompleted(day);
              const isToday = isSameDay(day, today);
              const isCurrentMonth = day.getMonth() === today.getMonth();
              
              return (
                <View
                  key={dayIndex}
                  style={[
                    styles.day,
                    { backgroundColor: colors.borderLight },
                    completed && { backgroundColor: habitColor },
                    isToday && { borderWidth: 2, borderColor: colors.primary },
                    !isCurrentMonth && { opacity: 0.3 },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      { color: colors.textSecondary },
                      completed && { color: colors.textInverse, fontWeight: '600' },
                      !isCurrentMonth && { color: colors.textDisabled },
                    ]}
                  >
                    {format(day, 'd')}
                  </Text>
                </View>
              );
            })}
          </View>
        ))}
      </View>

      {/* Legenda */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: colors.borderLight }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>
            Não completado
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: habitColor }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>
            Completado
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'capitalize',
  },
  weekDaysHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '600',
    width: 32,
    textAlign: 'center',
  },
  calendar: {
    gap: 4,
  },
  week: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 4,
  },
  day: {
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayText: {
    fontSize: 12,
    fontWeight: '500',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendBox: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
  },
});