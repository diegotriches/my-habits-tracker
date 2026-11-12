// types/database.ts
// Tipos do banco usados pelo app. O schema vem de `types/supabase.ts`, gerado
// a partir do banco — não edite aquele arquivo; regenere com:
//   npx supabase gen types typescript --project-id <ref> --schema public > types/supabase.ts
import type { Database } from './supabase'

export type { Database, Json } from './supabase'

export type HabitType = Database['public']['Enums']['habit_type']
export type HabitFrequencyType = Database['public']['Enums']['habit_frequency_type']

// Tipos auxiliares
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Habit = Database['public']['Tables']['habits']['Row']
export type Completion = Database['public']['Tables']['completions']['Row']
export type Streak = Database['public']['Tables']['streaks']['Row']
export type Reminder = Database['public']['Tables']['reminders']['Row']
export type NotificationSettings = Database['public']['Tables']['notification_settings']['Row']

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
export type ReminderUpdate = Database['public']['Tables']['reminders']['Update']
export type NotificationSettingsUpdate = Database['public']['Tables']['notification_settings']['Update']

// Tipos para meta de frequência
export type FrequencyGoalPeriod = Database['public']['Enums']['frequency_goal_period']

export interface FrequencyGoalConfig {
  enabled: boolean
  value: number
  period: FrequencyGoalPeriod
  customDays?: number
}

// Tipos auxiliares para notificações de progresso
export type NotificationPeriod = 'morning' | 'afternoon' | 'evening'

export interface PeriodNotificationConfig {
  enabled: boolean
  time: string
  notificationId: string | null
}

export interface ProgressStatus {
  habitId: string
  habitName: string
  targetValue: number | null
  targetUnit: string | null
  currentValue: number
  percentage: number
  isCompleted: boolean
}

export type ProgressMessageType = 
  | 'no_progress'
  | 'low_progress'
  | 'moderate_progress'
  | 'high_progress'
  | 'completed'

export interface NotificationMessage {
  title: string
  body: string
  type: ProgressMessageType
  urgency: 'low' | 'medium' | 'high'
}