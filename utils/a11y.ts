// utils/a11y.ts
//
// Rótulos para leitores de tela (TalkBack / VoiceOver) — lógica pura, testada.
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type DayStatus = 'future' | 'done' | 'missed' | 'unscheduled';

interface DayLabelOptions {
  status: DayStatus;
  isToday?: boolean;
  /** Hábito negativo: marcar significa "evitei". */
  isNegative?: boolean;
  /** Hábito com meta numérica: percentual da meta atingido no dia (0–100+). */
  percentage?: number | null;
}

/**
 * Rótulo de um dia nos círculos da home e no calendário dos detalhes, ex.:
 * "hoje, quarta-feira, 11 de novembro, feito" / "terça-feira, 10 de novembro,
 * 60% da meta". Sem ele, o leitor de tela anunciava só o número do dia (ou
 * nada) — sem dizer se estava feito.
 */
export function dayAccessibilityLabel(date: Date, options: DayLabelOptions): string {
  const { status, isToday, isNegative, percentage } = options;
  const day = format(date, "EEEE, d 'de' MMMM", { locale: ptBR });

  let state: string;
  switch (status) {
    case 'future':
      state = 'dia futuro';
      break;
    case 'missed':
      state = isNegative ? 'não marcado' : 'não feito';
      break;
    case 'unscheduled':
      state = 'não programado';
      break;
    case 'done':
      if (percentage != null) {
        state = percentage >= 100 ? 'meta atingida' : `${Math.round(percentage)}% da meta`;
      } else {
        state = isNegative ? 'evitado' : 'feito';
      }
      break;
  }

  return `${isToday ? 'hoje, ' : ''}${day}, ${state}`;
}

/** Dica de ação de um dia que pode ser tocado. */
export function dayAccessibilityHint(status: DayStatus): string | undefined {
  if (status === 'future') return undefined;
  return status === 'done' ? 'Toque para desmarcar ou alterar' : 'Toque para marcar';
}
