import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { addDays, format, startOfDay } from 'date-fns';

const currentDayKey = () => format(new Date(), 'yyyy-MM-dd');

/**
 * Dia local atual ('yyyy-MM-dd'), atualizado na virada da meia-noite e
 * sempre que o app volta para o primeiro plano. O AppState é necessário
 * porque os timers do JS ficam suspensos com o app em segundo plano, então
 * só o timeout não garante a atualização.
 */
export function useCurrentDay(): string {
  const [day, setDay] = useState(currentDayKey);

  useEffect(() => {
    // +1s de folga para não disparar alguns ms antes da meia-noite.
    const msUntilMidnight = startOfDay(addDays(new Date(), 1)).getTime() - Date.now() + 1000;
    const timer = setTimeout(() => setDay(currentDayKey()), msUntilMidnight);

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setDay(currentDayKey());
    });

    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, [day]);

  return day;
}
