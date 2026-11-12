// services/offlineCache.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Cache de leitura para abrir o app sem conexão (modo offline, fase 2 — ver
 * docs/offline-mode.md). As telas mostram o cache na hora e atualizam do
 * banco em seguida; cada busca bem-sucedida regrava o cache.
 *
 * - Cada entrada guarda o usuário: o cache de outra conta nunca é exibido.
 * - O prefixo tem versão: ao mudar o formato dos dados, suba CACHE_VERSION e
 *   os caches antigos passam a ser ignorados (e são limpos no logout).
 * - Só leitura: as marcações feitas offline ficam na fila de saída
 *   (completionOutbox) e são aplicadas por cima do cache.
 */

const CACHE_VERSION = 1;
const PREFIX = `offline_cache_v${CACHE_VERSION}:`;
const ANY_VERSION_PREFIX = 'offline_cache_v';

interface CacheEntry<T> {
  userId: string;
  savedAt: string;
  data: T;
}

export async function readCache<T>(key: string, userId: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry<T>;
    return entry.userId === userId ? entry.data : null;
  } catch (error) {
    console.warn('Cache offline ilegível:', key, error);
    return null;
  }
}

export async function writeCache<T>(key: string, userId: string, data: T): Promise<void> {
  try {
    const entry: CacheEntry<T> = { userId, savedAt: new Date().toISOString(), data };
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(entry));
  } catch (error) {
    // Falha no cache nunca deve quebrar a tela: no pior caso, não abre offline.
    console.warn('Erro ao gravar cache offline:', key, error);
  }
}

/**
 * Mantém só as chaves de um grupo (ex.: semanas da home) que `keep` aceitar,
 * para o cache não crescer para sempre.
 */
export async function pruneCache(group: string, keep: (key: string) => boolean): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const stale = keys.filter((k) => k.startsWith(PREFIX + group) && !keep(k.slice(PREFIX.length)));
    if (stale.length > 0) await AsyncStorage.multiRemove(stale);
  } catch (error) {
    console.warn('Erro ao limpar cache offline:', error);
  }
}

/** Apaga todo o cache offline (de qualquer versão). Chamado no logout. */
export async function clearOfflineCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((k) => k.startsWith(ANY_VERSION_PREFIX));
    if (cacheKeys.length > 0) await AsyncStorage.multiRemove(cacheKeys);
  } catch (error) {
    console.warn('Erro ao apagar cache offline:', error);
  }
}
