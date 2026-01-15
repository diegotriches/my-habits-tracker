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
          created_at: string
        }
        Insert: {
          id?: string
          habit_id: string
          time: string
          days_of_week?: number[] | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          habit_id?: string
          time?: string
          days_of_week?: number[] | null
          is_active?: boolean
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

// Tipos para insert
export type HabitInsert = Database['public']['Tables']['habits']['Insert']
export type CompletionInsert = Database['public']['Tables']['completions']['Insert']
export type ReminderInsert = Database['public']['Tables']['reminders']['Insert']

// Tipos para update
export type HabitUpdate = Database['public']['Tables']['habits']['Update']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']