// hooks/useForegroundRefresh.ts
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import {
  FOREGROUND_REFRESH_MIN_MS,
  ForegroundRefreshDecision,
  foregroundRefreshDecision,
} from '@/utils/foregroundRefresh';

/**
 * Chama `onRefresh` quando o app volta para o primeiro plano depois de um
 * tempo em segundo plano (ou de uma virada de dia) — para a tela mostrar o
 * que mudou nesse meio-tempo (outro aparelho, streaks vencidos) sem o
 * usuário precisar puxar para atualizar. A busca deve ser silenciosa.
 */
export function useForegroundRefresh(
  onRefresh: (decision: ForegroundRefreshDecision) => void,
  minBackgroundMs: number = FOREGROUND_REFRESH_MIN_MS
): void {
  // Em ref: as telas passam callbacks novos a cada render, e o listener do
  // AppState não deve ser recriado por isso.
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    let backgroundAt: Date | null = null;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        backgroundAt = new Date();
        return;
      }
      if (state !== 'active') return; // 'inactive' (iOS): passagem, não conta
      const decision = foregroundRefreshDecision(backgroundAt, new Date(), minBackgroundMs);
      backgroundAt = null;
      if (decision.refresh) onRefreshRef.current(decision);
    });
    return () => subscription.remove();
  }, [minBackgroundMs]);
}
