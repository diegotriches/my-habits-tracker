// hooks/useCelebration.ts
import { useState, useCallback } from 'react';

export interface CelebrationData {
  title: string;
  message: string;
  icon: 'flame' | 'trophy' | 'star' | 'crown' | 'rocket' | 'sparkles';
  streak?: number;
}

/**
 * Hook para gerenciar celebrações de milestones
 */
export function useCelebration() {
  const [celebrationData, setCelebrationData] = useState<CelebrationData | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  /**
   * Verifica se deve mostrar celebração baseado no streak
   */
  const checkStreakMilestone = useCallback((currentStreak: number) => {
    const milestones = [
      { days: 7, icon: 'flame' as const, title: 'Primeira Semana!', message: 'Você manteve o hábito por 7 dias consecutivos!' },
      { days: 14, icon: 'star' as const, title: 'Duas Semanas!', message: 'Incrível! 14 dias de consistência!' },
      { days: 30, icon: 'trophy' as const, title: 'Um Mês Completo!', message: 'Parabéns! 30 dias de dedicação!' },
      { days: 60, icon: 'crown' as const, title: 'Dois Meses!', message: 'Você é imparável! 60 dias seguidos!' },
      { days: 90, icon: 'rocket' as const, title: 'Três Meses!', message: 'Extraordinário! 90 dias de pura disciplina!' },
      { days: 180, icon: 'sparkles' as const, title: 'Meio Ano!', message: 'Uau! 180 dias transformando sua vida!' },
      { days: 365, icon: 'crown' as const, title: 'UM ANO COMPLETO!', message: 'LENDÁRIO! Você é um verdadeiro mestre dos hábitos!' },
    ];

    const milestone = milestones.find(m => m.days === currentStreak);

    if (milestone) {
      setCelebrationData({
        ...milestone,
        streak: currentStreak,
      });
      setIsVisible(true);
      return true;
    }

    return false;
  }, []);

  /**
   * Verifica se deve mostrar celebração para meta atingida
   */
  const checkTargetAchievement = useCallback((habitName: string) => {
    setCelebrationData({
      title: 'Meta Atingida!',
      message: `Parabéns! Você completou 100% da meta de "${habitName}"!`,
      icon: 'sparkles',
    });
    setIsVisible(true);
  }, []);

  const closeCelebration = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => {
      setCelebrationData(null);
    }, 300);
  }, []);

  return {
    celebrationData,
    isVisible,
    checkStreakMilestone,
    checkTargetAchievement,
    closeCelebration,
  };
}