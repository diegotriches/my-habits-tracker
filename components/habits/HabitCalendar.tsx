import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameDay, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface HabitCalendarProps {
  completionDates: string[]; // Array de datas ISO string
  color?: string;
}

export default function HabitCalendar({ completionDates, color = '#3b82f6' }: HabitCalendarProps) {
  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  
  // Pegar também o mês anterior
  const prevMonthStart = startOfMonth(subMonths(today, 1));
  
  // Todos os dias dos últimos 2 meses
  const allDays = eachDayOfInterval({ start: prevMonthStart, end: monthEnd });
  
  // Converter datas de completion para Date objects
  const completionDateObjects = completionDates.map(dateStr => new Date(dateStr));
  
  // Verificar se um dia foi completado
  const isCompleted = (day: Date) => {
    return completionDateObjects.some(completionDate => 
      isSameDay(day, completionDate)
    );
  };

  // Pegar nome do mês
  const monthName = format(monthStart, 'MMMM yyyy', { locale: ptBR });

  // Organizar dias em semanas
  const weeks: Date[][] = [];
  let currentWeek: Date[] = [];
  
  allDays.forEach((day, index) => {
    const dayOfWeek = day.getDay();
    
    // Se é domingo e não é o primeiro dia, começar nova semana
    if (dayOfWeek === 0 && currentWeek.length > 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    
    currentWeek.push(day);
    
    // Se é o último dia, adicionar a semana
    if (index === allDays.length - 1) {
      weeks.push(currentWeek);
    }
  });

  // Mostrar apenas últimas 5 semanas (aproximadamente um mês)
  const displayWeeks = weeks.slice(-5);

  return (
    <View style={styles.container}>
      <Text style={styles.monthTitle}>{monthName}</Text>
      
      {/* Header dos dias da semana */}
      <View style={styles.weekDaysHeader}>
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, index) => (
          <Text key={index} style={styles.weekDayText}>
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
                    completed && { backgroundColor: color },
                    isToday && styles.today,
                    !isCurrentMonth && styles.otherMonth,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      completed && styles.dayTextCompleted,
                      !isCurrentMonth && styles.dayTextOtherMonth,
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
          <View style={[styles.legendBox, { backgroundColor: '#f3f4f6' }]} />
          <Text style={styles.legendText}>Não completado</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: color }]} />
          <Text style={styles.legendText}>Completado</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
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
    color: '#6b7280',
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
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  today: {
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  otherMonth: {
    opacity: 0.3,
  },
  dayText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  dayTextCompleted: {
    color: '#fff',
    fontWeight: '600',
  },
  dayTextOtherMonth: {
    color: '#9ca3af',
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
    color: '#6b7280',
  },
});