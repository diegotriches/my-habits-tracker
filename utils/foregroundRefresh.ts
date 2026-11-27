// utils/foregroundRefresh.ts
//
// Quando atualizar os dados ao voltar para o app — lógica pura, coberta por
// testes (usada por hooks/useForegroundRefresh.ts).
import { isSameDay } from 'date-fns';

/** Tempo mínimo em segundo plano para buscar de novo (trocas rápidas de app não contam). */
export const FOREGROUND_REFRESH_MIN_MS = 5 * 60 * 1000;

export interface ForegroundRefreshDecision {
  refresh: boolean;
  /** O dia mudou enquanto o app estava em segundo plano. */
  dayChanged: boolean;
}

/**
 * Decide se a volta ao primeiro plano pede uma nova busca: depois de
 * `minMs` em segundo plano, ou sempre que o dia mudou nesse meio-tempo
 * (streaks podem ter vencido e o "hoje" é outro).
 *
 * @param backgroundAt quando o app foi para o segundo plano (null = não foi)
 */
export function foregroundRefreshDecision(
  backgroundAt: Date | null,
  now: Date,
  minMs: number = FOREGROUND_REFRESH_MIN_MS
): ForegroundRefreshDecision {
  if (!backgroundAt) return { refresh: false, dayChanged: false };
  const dayChanged = !isSameDay(backgroundAt, now);
  const elapsed = now.getTime() - backgroundAt.getTime();
  return { refresh: dayChanged || elapsed >= minMs, dayChanged };
}
