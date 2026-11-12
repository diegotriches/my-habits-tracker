import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { supabase } from '@/services/supabase';
import { notificationService } from '@/services/notificationService';
import { progressNotificationScheduler } from '@/services/progressNotificationScheduler';
import { hapticFeedback } from '@/utils/haptics';
import { ProgressNotification } from '@/types/database';
import { ProgressNotificationConfig } from '@/components/habits/ProgressNotificationSettings';
import { ensureOnline } from '@/services/network';

const DEFAULT_CONFIG: ProgressNotificationConfig = {
  enabled: false,
  morningEnabled: true,
  morningTime: '08:00:00',
  afternoonEnabled: true,
  afternoonTime: '15:00:00',
  eveningEnabled: true,
  eveningTime: '21:00:00',
};

export function useHabitProgressNotifications(habitId: string | undefined, userId: string | undefined) {
  const [hasPermission, setHasPermission] = useState(false);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<ProgressNotificationConfig>(DEFAULT_CONFIG);

  const checkNotificationPermission = useCallback(async () => {
    const permission = await notificationService.hasPermission();
    setHasPermission(permission);
  }, []);

  useEffect(() => {
    checkNotificationPermission();
  }, [checkNotificationPermission]);

  const loadSettings = useCallback(async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('habit_progress_notifications')
        .select('*')
        .eq('habit_id', id)
        .maybeSingle();

      if (error) return;

      if (data) {
        const savedConfig = data as ProgressNotification;
        setConfig({
          enabled: savedConfig.enabled,
          morningEnabled: savedConfig.morning_enabled,
          morningTime: savedConfig.morning_time,
          afternoonEnabled: savedConfig.afternoon_enabled,
          afternoonTime: savedConfig.afternoon_time,
          eveningEnabled: savedConfig.evening_enabled,
          eveningTime: savedConfig.evening_time,
        });
      }
    } catch {
      // Erro silencioso
    }
  }, []);

  useEffect(() => {
    if (habitId) {
      loadSettings(habitId);
    }
  }, [habitId, loadSettings]);

  const requestNotificationPermission = useCallback(async () => {
    const granted = await notificationService.requestPermissions();
    setHasPermission(granted);
    if (!granted) {
      Alert.alert('Permissão Negada', 'Ative as notificações nas configurações do dispositivo.');
    }
  }, []);

  const handleChange = useCallback(async (newConfig: ProgressNotificationConfig) => {
    // Sem conexão, mantém a configuração anterior em vez de mudar e falhar.
    if (userId && habitId && !(await ensureOnline())) return;
    setConfig(newConfig);
    if (!userId || !habitId) return;

    setSaving(true);
    hapticFeedback.light();

    try {
      const { data: existingConfig } = await supabase
        .from('habit_progress_notifications')
        .select('id')
        .eq('habit_id', habitId)
        .maybeSingle();

      if (existingConfig) {
        await supabase.from('habit_progress_notifications')
          .update({
            enabled: newConfig.enabled,
            morning_enabled: newConfig.morningEnabled,
            morning_time: newConfig.morningTime,
            afternoon_enabled: newConfig.afternoonEnabled,
            afternoon_time: newConfig.afternoonTime,
            evening_enabled: newConfig.eveningEnabled,
            evening_time: newConfig.eveningTime,
          })
          .eq('habit_id', habitId);

        if (newConfig.enabled) {
          await progressNotificationScheduler.updateNotificationSchedule(habitId, userId);
        } else {
          await progressNotificationScheduler.disableProgressNotifications(habitId);
        }
      } else {
        await supabase.from('habit_progress_notifications')
          .insert({
            habit_id: habitId,
            user_id: userId,
            enabled: newConfig.enabled,
            morning_enabled: newConfig.morningEnabled,
            morning_time: newConfig.morningTime,
            afternoon_enabled: newConfig.afternoonEnabled,
            afternoon_time: newConfig.afternoonTime,
            evening_enabled: newConfig.eveningEnabled,
            evening_time: newConfig.eveningTime,
          });

        if (newConfig.enabled) {
          await progressNotificationScheduler.scheduleProgressNotifications(habitId, userId);
        }
      }

      hapticFeedback.success();
    } catch {
      hapticFeedback.error();
      Alert.alert('Erro', 'Não foi possível salvar as configurações de notificação');
    } finally {
      setSaving(false);
    }
  }, [habitId, userId]);

  const summary = useMemo((): string => {
    const parts: string[] = [];
    if (config.enabled) {
      const count = [config.morningEnabled, config.afternoonEnabled, config.eveningEnabled].filter(Boolean).length;
      parts.push(`progresso ${count > 0 ? `(${count}x/dia)` : 'ativo'}`);
    }
    if (parts.length === 0) return 'Toque para configurar lembretes';
    return parts.join(' · ');
  }, [config]);

  return {
    config,
    hasPermission,
    saving,
    requestNotificationPermission,
    handleChange,
    summary,
  };
}