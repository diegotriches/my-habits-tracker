// hooks/useHabitOrder.ts
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'habit_order';

export function useHabitOrder(habitIds: string[]) {
  const [orderedIds, setOrderedIds] = useState<string[]>([]);

  // Carregar ordem salva
  useEffect(() => {
    if (habitIds.length === 0) return;
    loadOrder(habitIds);
  }, [habitIds.join(',')]);

  const loadOrder = async (ids: string[]) => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (!saved) {
        setOrderedIds(ids);
        return;
      }

      const savedOrder: string[] = JSON.parse(saved);

      // Mesclar: manter ordem salva para os que existem, adicionar novos no final
      const existing = savedOrder.filter(id => ids.includes(id));
      const newIds = ids.filter(id => !savedOrder.includes(id));
      const merged = [...existing, ...newIds];

      setOrderedIds(merged);
    } catch {
      setOrderedIds(ids);
    }
  };

  const saveOrder = useCallback(async (newOrder: string[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newOrder));
    } catch {
      // Falha silenciosa
    }
  }, []);

  const updateOrder = useCallback((newOrder: string[]) => {
    setOrderedIds(newOrder);
    saveOrder(newOrder);
  }, [saveOrder]);

  return { orderedIds, updateOrder };
}