// utils/networkErrors.ts

/** Mensagem para ações que exigem conexão (o modo offline só cobre marcações). */
export const OFFLINE_ACTION_MESSAGE =
  'Sem conexão. Esta ação precisa de internet — tente de novo quando estiver online.';

/**
 * Se o erro é falta de conexão (o fetch do React Native falha com
 * "Network request failed"; o supabase-js repassa essa mensagem).
 */
export function isNetworkError(error: unknown): boolean {
  const message =
    typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : (error as { message?: string })?.message;
  return !!message && /network request failed|failed to fetch|fetch failed/i.test(message);
}

/** A mensagem de "sem conexão" se o erro for de rede; senão, `fallback`. */
export function errorMessageFor(error: unknown, fallback: string): string {
  return isNetworkError(error) ? OFFLINE_ACTION_MESSAGE : fallback;
}
