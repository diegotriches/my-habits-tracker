import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { createClient, PostgrestError, Session } from '@supabase/supabase-js';
import { Database } from '@/types/database';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Renova o token só com o app em primeiro plano (recomendação do Supabase
// para React Native) — e logo ao voltar, o que também cobre voltar a ficar
// online depois de abrir o app offline com o token expirado.
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});

// Chave padrão em que o supabase-js guarda a sessão (sb-<ref>-auth-token).
// Não configure outra storageKey no createClient: deslogaria todo mundo.
const AUTH_STORAGE_KEY = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`;

/**
 * Lê a sessão salva no aparelho sem tentar renová-la. Usada para abrir o app
 * offline: com o token expirado e sem rede, o getSession() devolve null (a
 * renovação falha), embora a sessão continue salva e válida para renovar
 * assim que houver conexão.
 */
export async function readStoredSession(): Promise<Session | null> {
  try {
    const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as Session;
    return session?.user ? session : null;
  } catch {
    return null;
  }
}

// O Supabase devolve no máximo 1000 linhas por consulta (sem erro: o resto
// simplesmente não vem).
const PAGE_SIZE = 1000;

/**
 * Busca todas as linhas de uma consulta, página por página. `query` recebe o
 * intervalo e deve devolver a consulta com `.range(from, to)` aplicado, com
 * ordenação estável (ex.: data + id como desempate) — senão linhas podem se
 * repetir ou faltar entre páginas.
 */
export async function fetchAllRows<T>(
  query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: PostgrestError | null }>
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await query(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

// Helper para verificar se está autenticado
export const isAuthenticated = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
};

// Helper para pegar usuário atual
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// Helper para logout
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};