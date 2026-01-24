// types/database.ts
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string | null
          avatar_url: string | null
          level: number
          total_points: number
          current_rank: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          avatar_url?: string | null
          level?: number
          total_points?: number
          current_rank?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string | null
          avatar_url?: string | null
          level?: number
          total_points?: number
          current_rank?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      habits: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          type: 'positive' | 'negative'
          frequency_type: 'daily' | 'weekly' | 'custom'
          frequency_days: number[] | null
          has_target: boolean
          target_value: number | null
          target_unit: string | null
          difficulty: 'easy' | 'medium' | 'hard'
          points_base: number
          color: string
          icon: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          type: 'positive' | 'negative'
          frequency_type: 'daily' | 'weekly' | 'custom'
          frequency_days?: number[] | null
          has_target?: boolean
          target_value?: number | null
          target_unit?: string | null
          difficulty: 'easy' | 'medium' | 'hard'
          points_base: number
          color?: string
          icon?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          type?: 'positive' | 'negative'
          frequency_type?: 'daily' | 'weekly' | 'custom'
          frequency_days?: number[] | null
          has_target?: boolean
          target_value?: number | null
          target_unit?: string | null
          difficulty?: 'easy' | 'medium' | 'hard'
          points_base?: number
          color?: string
          icon?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      completions: {
        Row: {
          id: string
          habit_id: string
          completed_at: string
          value_achieved: number | null
          points_earned: number
          was_synced: boolean
          created_at: string
        }
        Insert: {
          id?: string
          habit_id: string
          completed_at: string
          value_achieved?: number | null
          points_earned: number
          was_synced?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          habit_id?: string
          completed_at?: string
          value_achieved?: number | null
          points_earned?: number
          was_synced?: boolean
          created_at?: string
        }
      }
      streaks: {
        Row: {
          id: string
          habit_id: string
          current_streak: number
          best_streak: number
          last_completion_date: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          habit_id: string
          current_streak?: number
          best_streak?: number
          last_completion_date?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          habit_id?: string
          current_streak?: number
          best_streak?: number
          last_completion_date?: string | null
          updated_at?: string
        }
      }
      reminders: {
        Row: {
          id: string
          habit_id: string
          time: string
          days_of_week: number[] | null
          is_active: boolean
          notification_ids: string[] | null
          sound: string | null
          created_at: string
        }
        Insert: {
          id?: string
          habit_id: string
          time: string
          days_of_week?: number[] | null
          is_active?: boolean
          notification_ids?: string[] | null
          sound?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          habit_id?: string
          time?: string
          days_of_week?: number[] | null
          is_active?: boolean
          notification_ids?: string[] | null
          sound?: string | null
          created_at?: string
        }
      }
      penalties: {
        Row: {
          id: string
          habit_id: string
          missed_date: string
          points_deducted: number
          created_at: string
        }
        Insert: {
          id?: string
          habit_id: string
          missed_date: string
          points_deducted: number
          created_at?: string
        }
        Update: {
          id?: string
          habit_id?: string
          missed_date?: string
          points_deducted?: number
          created_at?: string
        }
      }
      levels: {
        Row: {
          level: number
          points_required: number
          title: string
          badge_icon: string | null
        }
        Insert: {
          level: number
          points_required: number
          title: string
          badge_icon?: string | null
        }
        Update: {
          level?: number
          points_required?: number
          title?: string
          badge_icon?: string | null
        }
      }
      sync_queue: {
        Row: {
          id: string
          user_id: string | null
          table_name: string
          operation: 'insert' | 'update' | 'delete'
          record_id: string | null
          data: Json | null
          created_at: string
          synced_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          table_name: string
          operation: 'insert' | 'update' | 'delete'
          record_id?: string | null
          data?: Json | null
          created_at?: string
          synced_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          table_name?: string
          operation?: 'insert' | 'update' | 'delete'
          record_id?: string | null
          data?: Json | null
          created_at?: string
          synced_at?: string | null
        }
      }
      notification_settings: {
        Row: {
          id: string
          user_id: string
          enabled: boolean
          default_sound: string
          vibration_enabled: boolean
          smart_notifications: boolean
          quiet_hours_enabled: boolean
          quiet_hours_start: string | null
          quiet_hours_end: string | null
          default_snooze_minutes: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          enabled?: boolean
          default_sound?: string
          vibration_enabled?: boolean
          smart_notifications?: boolean
          quiet_hours_enabled?: boolean
          quiet_hours_start?: string | null
          quiet_hours_end?: string | null
          default_snooze_minutes?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          enabled?: boolean
          default_sound?: string
          vibration_enabled?: boolean
          smart_notifications?: boolean
          quiet_hours_enabled?: boolean
          quiet_hours_start?: string | null
          quiet_hours_end?: string | null
          default_snooze_minutes?: number
          created_at?: string
          updated_at?: string
        }
      }
      // 🆕 TABELA DE NOTIFICAÇÕES DE PROGRESSO
      habit_progress_notifications: {
        Row: {
          id: string
          habit_id: string
          user_id: string
          enabled: boolean
          morning_enabled: boolean
          morning_time: string
          afternoon_enabled: boolean
          afternoon_time: string
          evening_enabled: boolean
          evening_time: string
          morning_notification_id: string | null
          afternoon_notification_id: string | null
          evening_notification_id: string | null
          max_notifications_per_day: number
          min_interval_hours: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          habit_id: string
          user_id: string
          enabled?: boolean
          morning_enabled?: boolean
          morning_time?: string
          afternoon_enabled?: boolean
          afternoon_time?: string
          evening_enabled?: boolean
          evening_time?: string
          morning_notification_id?: string | null
          afternoon_notification_id?: string | null
          evening_notification_id?: string | null
          max_notifications_per_day?: number
          min_interval_hours?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          habit_id?: string
          user_id?: string
          enabled?: boolean
          morning_enabled?: boolean
          morning_time?: string
          afternoon_enabled?: boolean
          afternoon_time?: string
          evening_enabled?: boolean
          evening_time?: string
          morning_notification_id?: string | null
          afternoon_notification_id?: string | null
          evening_notification_id?: string | null
          max_notifications_per_day?: number
          min_interval_hours?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      user_rankings: {
        Row: {
          id: string | null
          display_name: string | null
          avatar_url: string | null
          level: number | null
          total_points: number | null
          level_title: string | null
          badge_icon: string | null
          rank: number | null
        }
      }
      habit_stats: {
        Row: {
          habit_id: string | null
          user_id: string | null
          name: string | null
          difficulty: string | null
          total_completions: number | null
          current_streak: number | null
          best_streak: number | null
          total_points_earned: number | null
          last_completed_at: string | null
        }
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Tipos auxiliares para facilitar o uso
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Habit = Database['public']['Tables']['habits']['Row']
export type Completion = Database['public']['Tables']['completions']['Row']
export type Streak = Database['public']['Tables']['streaks']['Row']
export type Reminder = Database['public']['Tables']['reminders']['Row']
export type Penalty = Database['public']['Tables']['penalties']['Row']
export type Level = Database['public']['Tables']['levels']['Row']
export type NotificationSettings = Database['public']['Tables']['notification_settings']['Row']

// 🆕 TIPOS PARA NOTIFICAÇÕES DE PROGRESSO
export type ProgressNotification = Database['public']['Tables']['habit_progress_notifications']['Row']
export type ProgressNotificationInsert = Database['public']['Tables']['habit_progress_notifications']['Insert']
export type ProgressNotificationUpdate = Database['public']['Tables']['habit_progress_notifications']['Update']

// Tipos para insert
export type HabitInsert = Database['public']['Tables']['habits']['Insert']
export type CompletionInsert = Database['public']['Tables']['completions']['Insert']
export type ReminderInsert = Database['public']['Tables']['reminders']['Insert']
export type NotificationSettingsInsert = Database['public']['Tables']['notification_settings']['Insert']

// Tipos para update
export type HabitUpdate = Database['public']['Tables']['habits']['Update']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']
export type NotificationSettingsUpdate = Database['public']['Tables']['notification_settings']['Update']

// 🆕 TIPOS AUXILIARES PARA NOTIFICAÇÕES DE PROGRESSO

/**
 * Período do dia para notificação
 */
export type NotificationPeriod = 'morning' | 'afternoon' | 'evening'

/**
 * Configuração de notificação por período
 */
export interface PeriodNotificationConfig {
  enabled: boolean
  time: string
  notificationId: string | null
}

/**
 * Status do progresso do hábito
 */
export interface ProgressStatus {
  habitId: string
  habitName: string
  targetValue: number | null
  targetUnit: string | null
  currentValue: number
  percentage: number
  isCompleted: boolean
}

/**
 * Tipo de mensagem de notificação baseado no progresso
 */
export type ProgressMessageType = 
  | 'no_progress'      // 0%
  | 'low_progress'     // 1-29%
  | 'moderate_progress' // 30-69%
  | 'high_progress'    // 70-99%
  | 'completed'        // 100%+

/**
 * Template de mensagem de notificação
 */
export interface NotificationMessage {
  title: string
  body: string
  type: ProgressMessageType
  urgency: 'low' | 'medium' | 'high'
}