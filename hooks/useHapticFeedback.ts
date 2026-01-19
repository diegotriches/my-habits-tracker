import { useCallback } from 'react';
import { hapticFeedback } from '@/utils/haptics';

/**
 * Hook para usar haptic feedback em componentes
 * Retorna funções memoizadas para melhor performance
 */
export function useHapticFeedback() {
  const triggerLight = useCallback(() => {
    hapticFeedback.light();
  }, []);

  const triggerMedium = useCallback(() => {
    hapticFeedback.medium();
  }, []);

  const triggerHeavy = useCallback(() => {
    hapticFeedback.heavy();
  }, []);

  const triggerSuccess = useCallback(() => {
    hapticFeedback.success();
  }, []);

  const triggerWarning = useCallback(() => {
    hapticFeedback.warning();
  }, []);

  const triggerError = useCallback(() => {
    hapticFeedback.error();
  }, []);

  const triggerSelection = useCallback(() => {
    hapticFeedback.selection();
  }, []);

  return {
    light: triggerLight,
    medium: triggerMedium,
    heavy: triggerHeavy,
    success: triggerSuccess,
    warning: triggerWarning,
    error: triggerError,
    selection: triggerSelection,
  };
}