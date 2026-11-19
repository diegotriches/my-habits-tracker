// hooks/useReorderHint.ts
import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SEEN_KEY = 'hint_reorder_seen_v1';

/**
 * Dica única "segure um hábito para mudar a ordem": aparece com dois hábitos
 * ou mais, até o usuário dispensá-la ou reordenar pela primeira vez. É uma
 * dica de interface, do aparelho (não da conta).
 */
export function useReorderHint(habitCount: number) {
  // null = ainda lendo (não mostra, para não piscar)
  const [seen, setSeen] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(SEEN_KEY)
      .then((value) => {
        if (!cancelled) setSeen(value === '1');
      })
      .catch(() => {
        if (!cancelled) setSeen(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = useCallback(() => {
    setSeen(true);
    AsyncStorage.setItem(SEEN_KEY, '1').catch(() => {});
  }, []);

  return { visible: seen === false && habitCount >= 2, dismiss };
}
