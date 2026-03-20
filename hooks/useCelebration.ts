// hooks/useCelebration.ts
import { useState, useCallback } from 'react';

export function useCelebration() {
  const [isVisible, setIsVisible] = useState(false);

  const celebrate = useCallback(() => {
    setIsVisible(true);
  }, []);

  const closeCelebration = useCallback(() => {
    setIsVisible(false);
  }, []);

  return {
    isVisible,
    celebrate,
    closeCelebration,
  };
}