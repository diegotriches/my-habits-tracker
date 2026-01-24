// components/habits/HabitWeeklyRow.tsx
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import { Completion, Habit, Streak } from '@/types/database';
import { getDayShortName } from '@/utils/habitHelpers';
import { hapticFeedback } from '@/utils/haptics';
import { addDays, isFuture, isSameDay, startOfWeek } from 'date-fns';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { styles } from './HabitWeeklyRowStyles';

interface HabitWeeklyRowProps {
  habit: Habit;
  streak?: Streak;
  completions: Completion[];
  onDayPress: (habit: Habit, date: Date) => void;
  onHabitPress: (habitId: string) => void;
  isDueToday?: boolean;
}

export function HabitWeeklyRow({
  habit,
  streak,
  completions,
  onDayPress,
  onHabitPress,
  isDueToday = true,
}: HabitWeeklyRowProps) {
  const { colors } = useTheme();
  const isNegative = habit.type === 'negative';
  const habitColor = isNegative ? colors.warning : habit.color;
  
  // Calcular semana atual (Domingo a Sábado)
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // ========== HELPERS DE DADOS ==========

  /**
   * Verificar se foi completado no dia
   */
  const isCompletedOnDay = (date: Date): boolean => {
    return completions.some(c => {
      const completionDate = new Date(c.completed_at);
      return isSameDay(completionDate, date);
    });
  };

  /**
   * Verificar se é dia programado
   */
  const isScheduledDay = (date: Date): boolean => {
    if (habit.frequency_type === 'daily') return true;
    if (habit.frequency_type === 'weekly' && habit.frequency_days) {
      const dayOfWeek = date.getDay();
      return habit.frequency_days.includes(dayOfWeek);
    }
    return true;
  };

  /**
   * Pegar completion do dia (para metas numéricas)
   */
  const getCompletionForDay = (date: Date): Completion | undefined => {
    return completions.find(c => {
      const completionDate = new Date(c.completed_at);
      return isSameDay(completionDate, date);
    });
  };

  /**
   * Calcular percentual de progresso para meta numérica
   */
  const getProgressPercentage = (completion: Completion | undefined): number => {
    if (!habit.has_target || !habit.target_value || !completion) return 0;
    
    const currentValue = completion.value_achieved || 0;
    return Math.round((currentValue / habit.target_value) * 100);
  };

  /**
   * Verificar se atingiu a meta (≥ 100%)
   */
  const hasMetTarget = (completion: Completion | undefined): boolean => {
    if (!habit.has_target || !habit.target_value || !completion) return false;
    
    const currentValue = completion.value_achieved || 0;
    return currentValue >= habit.target_value;
  };

  /**
   * Calcular progresso semanal
   */
  const getWeeklyProgress = (): { completedDays: number; expectedDays: number; progress: number } => {
    const completedDays = weekDays.filter(day => isCompletedOnDay(day)).length;
    const expectedDays = habit.frequency_type === 'daily' 
      ? 7 
      : habit.frequency_days?.length || 7;
    const progress = expectedDays > 0 ? (completedDays / expectedDays) * 100 : 0;
    
    return { completedDays, expectedDays, progress };
  };

  // ========== HANDLERS ==========

  /**
   * 🔧 FIX: Click no card inteiro abre as estatísticas
   */
  const handleHabitPress = () => {
    hapticFeedback.light();
    onHabitPress(habit.id);
  };

  /**
   * Click no dia para registrar/editar progresso
   */
  const handleDayPress = (date: Date) => {
    if (isFuture(date)) {
      hapticFeedback.error();
      return;
    }
    
    hapticFeedback.selection();
    onDayPress(habit, date);
  };

  // ========== RENDER ==========

  /**
   * Renderizar checkbox do dia
   */
  const renderDayCheckbox = (date: Date, index: number) => {
    const isCompleted = isCompletedOnDay(date);
    const isScheduled = isScheduledDay(date);
    const isDayFuture = isFuture(date);
    const isToday = isSameDay(date, today);
    const completion = getCompletionForDay(date);
    
    const metTarget = hasMetTarget(completion);
    const percentage = getProgressPercentage(completion);

    // ========== DETERMINAR ESTILO DO CHECKBOX ==========
    
    let checkboxColor = colors.border;
    let checkIcon: 'check' | 'shield' | 'star' | null = null;
    let badgeContent: React.ReactNode = null;

    if (isDayFuture) {
      // Dia futuro - desabilitado
      checkboxColor = colors.divider;
    } else if (isCompleted) {
      if (habit.has_target) {
        // 🆕 META NUMÉRICA
        if (metTarget) {
          // ≥ 100% - Meta completa
          checkboxColor = colors.success;
          checkIcon = 'star';
          badgeContent = (
            <Text style={[styles.badgeText, { color: colors.textInverse }]}>
              100%
            </Text>
          );
        } else if (percentage >= 50) {
          // 50-99% - Progresso bom
          checkboxColor = colors.warning;
          badgeContent = (
            <Text style={[styles.badgeText, { color: colors.textInverse }]}>
              {percentage}%
            </Text>
          );
        } else {
          // 1-49% - Progresso baixo
          checkboxColor = colors.danger;
          badgeContent = (
            <Text style={[styles.badgeText, { color: colors.textInverse }]}>
              {percentage}%
            </Text>
          );
        }
      } else {
        // HÁBITO BINÁRIO
        checkboxColor = isNegative ? colors.warning : colors.success;
        checkIcon = isNegative ? 'shield' : 'check';
      }
    } else if (isScheduled && !isCompleted && !isDayFuture) {
      // Dia programado mas não completado
      checkboxColor = colors.danger + '40';
    }

    return (
      <TouchableOpacity
        key={index}
        style={[
          styles.dayCheckbox,
          { borderColor: checkboxColor },
          isCompleted && { backgroundColor: checkboxColor },
          isToday && styles.todayCheckbox,
          isDayFuture && styles.futureCheckbox,
        ]}
        onPress={() => handleDayPress(date)}
        disabled={isDayFuture}
      >
        {/* Ícone ou Badge de Percentual */}
        {checkIcon && !badgeContent ? (
          <Icon 
            name={checkIcon} 
            size={14} 
            color={colors.textInverse} 
          />
        ) : (
          badgeContent
        )}
        
        {/* Indicador de "hoje" */}
        {isToday && !isCompleted && (
          <View style={[styles.todayDot, { backgroundColor: colors.primary }]} />
        )}
      </TouchableOpacity>
    );
  };

  const { completedDays, expectedDays, progress } = getWeeklyProgress();

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { 
          backgroundColor: colors.background,
          borderColor: colors.border,
        },
        !isDueToday && { opacity: 0.7 },
      ]}
      onPress={handleHabitPress} // 🔧 FIX: Agora abre o hábito
      activeOpacity={0.7}
    >
      {/* Indicador de cor lateral */}
      <View style={[styles.colorIndicator, { backgroundColor: habitColor }]} />

      {/* Informações do hábito */}
      <View style={styles.habitInfo}>
        <View style={styles.habitHeader}>
          <View style={styles.habitNameRow}>
            {isNegative && (
              <Icon name="xCircle" size={16} color={colors.warning} />
            )}
            <Text 
              style={[styles.habitName, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {habit.name}
            </Text>
          </View>

          {/* Progresso e Streak */}
          <View style={styles.statsRow}>
            <Text style={[styles.progressText, { color: colors.textSecondary }]}>
              {completedDays}/{expectedDays}
            </Text>
            
            {streak && streak.current_streak > 0 && (
              <View style={[styles.streakBadge, { backgroundColor: colors.streakLight }]}>
                <Icon name="flame" size={10} color={colors.streak} />
                <Text style={[styles.streakText, { color: colors.streak }]}>
                  {streak.current_streak}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Grid de dias da semana */}
        <View style={styles.weekGrid}>
          <View style={styles.dayLabels}>
            {weekDays.map((date, i) => (
              <Text 
                key={i} 
                style={[
                  styles.dayLabel, 
                  { color: colors.textTertiary },
                  isSameDay(date, today) && { 
                    color: colors.primary,
                    fontWeight: '700' 
                  }
                ]}
              >
                {getDayShortName(date.getDay())[0]}
              </Text>
            ))}
          </View>

          <View style={styles.dayCheckboxes}>
            {weekDays.map((date, i) => renderDayCheckbox(date, i))}
          </View>
        </View>

        {/* Barra de progresso */}
        <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
          <View 
            style={[
              styles.progressFill,
              { 
                width: `${progress}%`,
                backgroundColor: progress >= 100 ? colors.success : habitColor,
              }
            ]}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}