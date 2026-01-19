// hooks/useNotificationSettings.ts
import { useState, useEffect } from 'react';
import { supabase } from '@/services/supabase';
import { useAuth } from './useAuth';
import { NotificationSettings, NotificationSettingsUpdate } from '@/types/database';
import { NotificationSound } from '@/services/notifications';

const DEFAULT_SETTINGS: Omit<NotificationSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  enabled: true,
  default_sound: 'default',
  vibration_enabled: true,
  smart_notifications: true,
  quiet_hours_enabled: false,
  quiet_hours_start: '22:00',
  quiet_hours_end: '07:00',
  default_snooze_minutes: 10,
};

export function useNotificationSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Buscar configurações do usuário
   */
  const fetchSettings = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await (supabase
        .from('notification_settings') as any)
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      // Se não existir, criar com valores padrão
      if (!data) {
        const newSettings = await createSettings();
        setSettings(newSettings);
      } else {
        setSettings(data as NotificationSettings);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar configurações');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Criar configurações padrão para o usuário
   */
  const createSettings = async (): Promise<NotificationSettings | null> => {
    if (!user) return null;

    try {
      const { data, error } = await (supabase
        .from('notification_settings') as any)
        .insert({
          user_id: user.id,
          ...DEFAULT_SETTINGS,
        })
        .select()
        .single();

      if (error) throw error;

      return data as NotificationSettings;
    } catch (err) {
      console.error('Erro ao criar configurações:', err);
      return null;
    }
  };

  /**
   * Atualizar configurações
   */
  const updateSettings = async (
    updates: NotificationSettingsUpdate
  ): Promise<boolean> => {
    if (!user || !settings) return false;

    try {
      const { data, error } = await (supabase
        .from('notification_settings') as any)
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      setSettings(data as NotificationSettings);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar configurações');
      return false;
    }
  };

  /**
   * Toggle master (ativar/desativar todas notificações)
   */
  const toggleEnabled = async (): Promise<boolean> => {
    if (!settings) return false;
    return await updateSettings({ enabled: !settings.enabled });
  };

  /**
   * Atualizar som padrão
   */
  const updateDefaultSound = async (sound: NotificationSound): Promise<boolean> => {
    return await updateSettings({ default_sound: sound });
  };

  /**
   * Toggle vibração
   */
  const toggleVibration = async (): Promise<boolean> => {
    if (!settings) return false;
    return await updateSettings({ vibration_enabled: !settings.vibration_enabled });
  };

  /**
   * Toggle notificações inteligentes
   */
  const toggleSmartNotifications = async (): Promise<boolean> => {
    if (!settings) return false;
    return await updateSettings({ smart_notifications: !settings.smart_notifications });
  };

  /**
   * Toggle horário de silêncio
   */
  const toggleQuietHours = async (): Promise<boolean> => {
    if (!settings) return false;
    return await updateSettings({ quiet_hours_enabled: !settings.quiet_hours_enabled });
  };

  /**
   * Atualizar horários de silêncio
   */
  const updateQuietHours = async (
    start: string,
    end: string
  ): Promise<boolean> => {
    return await updateSettings({
      quiet_hours_start: start,
      quiet_hours_end: end,
    });
  };

  /**
   * Atualizar tempo de snooze padrão
   */
  const updateDefaultSnoozeMinutes = async (minutes: number): Promise<boolean> => {
    return await updateSettings({ default_snooze_minutes: minutes });
  };

  /**
   * Verificar se está em horário de silêncio
   */
  const isInQuietHours = (): boolean => {
    if (!settings || !settings.quiet_hours_enabled) return false;
    if (!settings.quiet_hours_start || !settings.quiet_hours_end) return false;

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const start = settings.quiet_hours_start;
    const end = settings.quiet_hours_end;

    // Horário normal (ex: 22:00 - 07:00 passa pela meia-noite)
    if (start > end) {
      return currentTime >= start || currentTime < end;
    }

    // Horário dentro do mesmo dia (ex: 14:00 - 18:00)
    return currentTime >= start && currentTime < end;
  };

  /**
   * Verificar se pode notificar agora (considera todas as regras)
   */
  const canNotifyNow = (): boolean => {
    if (!settings) return true;
    if (!settings.enabled) return false;
    if (isInQuietHours()) return false;
    return true;
  };

  /**
   * Resetar para configurações padrão
   */
  const resetToDefault = async (): Promise<boolean> => {
    return await updateSettings(DEFAULT_SETTINGS);
  };

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  return {
    settings,
    loading,
    error,
    updateSettings,
    toggleEnabled,
    updateDefaultSound,
    toggleVibration,
    toggleSmartNotifications,
    toggleQuietHours,
    updateQuietHours,
    updateDefaultSnoozeMinutes,
    isInQuietHours,
    canNotifyNow,
    resetToDefault,
    refetch: fetchSettings,
  };
}