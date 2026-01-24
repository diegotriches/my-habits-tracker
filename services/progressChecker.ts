// services/progressChecker.ts
import { supabase } from './supabase';
import { Habit, Completion } from '@/types/database';
import { startOfDay, endOfDay } from 'date-fns';

// 🆕 Tipos adicionais
export interface ProgressStatus {
  habitId: string;
  habitName: string;
  targetValue: number | null;
  targetUnit: string | null;
  currentValue: number;
  percentage: number;
  isCompleted: boolean;
}

export type ProgressMessageType = 
  | 'completed' 
  | 'high_progress' 
  | 'moderate_progress' 
  | 'low_progress' 
  | 'no_progress';

export type NotificationPeriod = 'morning' | 'afternoon' | 'evening';

export interface NotificationMessage {
  title: string;
  body: string;
  type: ProgressMessageType;
  urgency: 'low' | 'medium' | 'high';
}

/**
 * Service para verificar progresso de hábitos e gerar mensagens de notificação
 */
class ProgressCheckerService {
  /**
   * 🔧 CORRIGIDO: Busca o progresso de hoje para um hábito específico
   */
  async getTodayProgress(habitId: string): Promise<ProgressStatus | null> {
    try {
      // Buscar dados do hábito
      const { data: habit, error: habitError } = await supabase
        .from('habits')
        .select('*')
        .eq('id', habitId)
        .single();

      if (habitError || !habit) {
        console.error('Erro ao buscar hábito:', habitError);
        return null;
      }

      const habitData = habit as Habit;

      // Se não tem meta numérica, não faz sentido verificar progresso
      if (!habitData.has_target) {
        return null;
      }

      // 🔧 CORRIGIDO: Usar range em vez de eq
      const today = new Date();
      const startOfToday = startOfDay(today).toISOString();
      const endOfToday = endOfDay(today).toISOString();

      const { data: completion, error: completionError } = await supabase
        .from('completions')
        .select('*')
        .eq('habit_id', habitId)
        .gte('completed_at', startOfToday)
        .lte('completed_at', endOfToday)
        .maybeSingle();

      if (completionError) {
        console.error('Erro ao buscar completion:', completionError);
      }

      const completionData = completion as Completion | null;
      const currentValue = completionData?.value_achieved || 0;
      const targetValue = habitData.target_value || 0;
      const percentage = targetValue > 0 ? (currentValue / targetValue) * 100 : 0;

      return {
        habitId: habitData.id,
        habitName: habitData.name,
        targetValue: habitData.target_value,
        targetUnit: habitData.target_unit,
        currentValue,
        percentage: Math.min(percentage, 100),
        isCompleted: percentage >= 100,
      };
    } catch (error) {
      console.error('Erro ao verificar progresso:', error);
      return null;
    }
  }

  /**
   * Calcula a porcentagem de progresso
   */
  calculatePercentage(current: number, target: number): number {
    if (target <= 0) return 0;
    return Math.min((current / target) * 100, 100);
  }

  /**
   * Determina o tipo de mensagem baseado na porcentagem
   */
  getMessageType(percentage: number): ProgressMessageType {
    if (percentage >= 100) return 'completed';
    if (percentage >= 70) return 'high_progress';
    if (percentage >= 30) return 'moderate_progress';
    if (percentage > 0) return 'low_progress';
    return 'no_progress';
  }

  /**
   * Gera mensagem de notificação baseada no progresso e período do dia
   */
  getNotificationMessage(
    progress: ProgressStatus,
    period: NotificationPeriod
  ): NotificationMessage {
    const { habitName, percentage, targetValue, targetUnit, currentValue } = progress;
    const messageType = this.getMessageType(percentage);

    // MANHÃ (08:00) - Lembrete inicial
    if (period === 'morning') {
      if (percentage === 0) {
        return {
          title: '☀️ Bom dia!',
          body: `Lembre-se da sua meta: ${habitName}`,
          type: messageType,
          urgency: 'low',
        };
      } else {
        return {
          title: '☀️ Bom dia!',
          body: `Continue: ${habitName} (${Math.round(percentage)}% completo)`,
          type: messageType,
          urgency: 'low',
        };
      }
    }

    // TARDE (15:00) - Verificação de progresso
    if (period === 'afternoon') {
      if (percentage === 0) {
        return {
          title: `⚠️ ${habitName}`,
          body: 'Você ainda não registrou progresso hoje',
          type: messageType,
          urgency: 'medium',
        };
      } else if (percentage < 30) {
        return {
          title: `💪 ${habitName}`,
          body: `Você está em ${Math.round(percentage)}%. Continue!`,
          type: messageType,
          urgency: 'medium',
        };
      } else if (percentage < 70) {
        return {
          title: `🔥 ${habitName}`,
          body: `Ótimo progresso: ${Math.round(percentage)}%!`,
          type: messageType,
          urgency: 'low',
        };
      } else {
        return {
          title: `🎯 ${habitName}`,
          body: `Quase lá: ${Math.round(percentage)}% completo!`,
          type: messageType,
          urgency: 'low',
        };
      }
    }

    // NOITE (21:00) - Urgência final
    if (period === 'evening') {
      const remaining = targetValue && currentValue < targetValue 
        ? targetValue - currentValue 
        : 0;

      if (percentage === 0) {
        return {
          title: '🚨 Última chance!',
          body: `${habitName}: ainda não começou hoje`,
          type: messageType,
          urgency: 'high',
        };
      } else if (percentage < 50) {
        return {
          title: '🚨 Última chance!',
          body: `${habitName}: faltam ${remaining} ${targetUnit}`,
          type: messageType,
          urgency: 'high',
        };
      } else if (percentage < 100) {
        return {
          title: '🔥 Quase lá!',
          body: `${habitName}: não desista agora! ${Math.round(percentage)}%`,
          type: messageType,
          urgency: 'medium',
        };
      } else {
        return {
          title: '🎉 Meta atingida!',
          body: `${habitName}: ${targetValue} ${targetUnit} completo!`,
          type: messageType,
          urgency: 'low',
        };
      }
    }

    // Fallback
    return {
      title: `📊 ${habitName}`,
      body: `Progresso: ${Math.round(percentage)}%`,
      type: messageType,
      urgency: 'low',
    };
  }

  /**
   * Verifica se deve enviar notificação baseado no progresso
   */
  shouldNotify(progress: ProgressStatus, period: NotificationPeriod): boolean {
    const { percentage } = progress;

    // Se já completou 100%, não notifica mais
    if (percentage >= 100) {
      return false;
    }

    // Manhã: sempre notifica (lembrete inicial)
    if (period === 'morning') {
      return true;
    }

    // Tarde: notifica se progresso < 100%
    if (period === 'afternoon') {
      return percentage < 100;
    }

    // Noite: notifica apenas se progresso < 70% (urgência final)
    if (period === 'evening') {
      return percentage < 70;
    }

    return false;
  }

  /**
   * Busca todos os hábitos que precisam de notificação de progresso
   */
  async getHabitsNeedingProgressNotification(
    userId: string,
    period: NotificationPeriod
  ): Promise<Array<{ habit: Habit; progress: ProgressStatus }>> {
    try {
      // Buscar configurações de notificação habilitadas
      const { data: configs, error: configError } = await supabase
        .from('habit_progress_notifications')
        .select(`
          *,
          habits!inner (*)
        `)
        .eq('user_id', userId)
        .eq('enabled', true)
        .eq(`${period}_enabled`, true);

      if (configError) {
        console.error('Erro ao buscar configurações:', configError);
        return [];
      }

      if (!configs || configs.length === 0) {
        return [];
      }

      const results: Array<{ habit: Habit; progress: ProgressStatus }> = [];

      for (const config of configs) {
        const habit = (config as any).habits as Habit;

        // Verifica se o hábito tem meta numérica
        if (!habit.has_target) continue;

        // Verifica se o hábito está programado para hoje
        if (!this.isHabitDueToday(habit)) continue;

        // Busca progresso
        const progress = await this.getTodayProgress(habit.id);
        if (!progress) continue;

        // Verifica se deve notificar
        if (!this.shouldNotify(progress, period)) continue;

        results.push({ habit, progress });
      }

      return results;
    } catch (error) {
      console.error('Erro ao buscar hábitos para notificação:', error);
      return [];
    }
  }

  /**
   * Verifica se o hábito deve ser realizado hoje
   */
  private isHabitDueToday(habit: Habit): boolean {
    if (habit.frequency_type === 'daily') {
      return true;
    }

    if (habit.frequency_type === 'weekly' && habit.frequency_days) {
      const today = new Date().getDay();
      return habit.frequency_days.includes(today);
    }

    return false;
  }
}

export const progressCheckerService = new ProgressCheckerService();