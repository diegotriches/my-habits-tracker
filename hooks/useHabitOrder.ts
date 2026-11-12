// hooks/useHabitOrder.ts
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'habit_order';

export function useHabitOrder(habitIds: string[]) {
  const [orderedIds, setOrderedIds] = useState<string[]>([]);

  // Carregar ordem salva. A chave em texto evita recarregar quando o array
  // muda de identidade com os mesmos ids; o `cancelled` descarta uma leitura
  // antiga que chegue depois de uma mais nova (lista mudando rápido).
  const idsKey = habitIds.join(',');
  useEffect(() => {
    if (!idsKey) return;
    let cancelled = false;
    loadSavedOrder(idsKey.split(',')).then((order) => {
      if (!cancelled) setOrderedIds(order);
    });
    return () => {
      cancelled = true;
    };
  }, [idsKey]);

  const saveOrder = useCallback(async (newOrder: string[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newOrder));
    } catch {
      // Falha silenciosa
    }
  }, []);

  const updateOrder = useCallback(
    (newOrder: string[]) => {
      setOrderedIds(newOrder);
      saveOrder(newOrder);
    },
    [saveOrder]
  );

  return { orderedIds, updateOrder };
}

/** Ordem salva, mantendo a dos ids que ainda existem e pondo os novos no fim. */
async function loadSavedOrder(ids: string[]): Promise<string[]> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (!saved) return ids;
    const savedOrder: string[] = JSON.parse(saved);
    const existing = savedOrder.filter((id) => ids.includes(id));
    const newIds = ids.filter((id) => !savedOrder.includes(id));
    return [...existing, ...newIds];
  } catch {
    return ids;
  }
}
