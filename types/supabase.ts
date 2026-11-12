export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      completions: {
        Row: {
          completed_at: string
          created_at: string
          habit_id: string
          id: string
          value_achieved: number | null
          was_synced: boolean
        }
        Insert: {
          completed_at: string
          created_at?: string
          habit_id: string
          id?: string
          value_achieved?: number | null
          was_synced?: boolean
        }
        Update: {
          completed_at?: string
          created_at?: string
          habit_id?: string
          id?: string
          value_achieved?: number | null
          was_synced?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "completions_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_progress_notifications: {
        Row: {
          afternoon_enabled: boolean
          afternoon_notification_id: string | null
          afternoon_time: string
          created_at: string
          enabled: boolean
          evening_enabled: boolean
          evening_notification_id: string | null
          evening_time: string
          habit_id: string
          id: string
          max_notifications_per_day: number
          min_interval_hours: number
          morning_enabled: boolean
          morning_notification_id: string | null
          morning_time: string
          updated_at: string
          user_id: string
        }
        Insert: {
          afternoon_enabled?: boolean
          afternoon_notification_id?: string | null
          afternoon_time?: string
          created_at?: string
          enabled?: boolean
          evening_enabled?: boolean
          evening_notification_id?: string | null
          evening_time?: string
          habit_id: string
          id?: string
          max_notifications_per_day?: number
          min_interval_hours?: number
          morning_enabled?: boolean
          morning_notification_id?: string | null
          morning_time?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          afternoon_enabled?: boolean
          afternoon_notification_id?: string | null
          afternoon_time?: string
          created_at?: string
          enabled?: boolean
          evening_enabled?: boolean
          evening_notification_id?: string | null
          evening_time?: string
          habit_id?: string
          id?: string
          max_notifications_per_day?: number
          min_interval_hours?: number
          morning_enabled?: boolean
          morning_notification_id?: string | null
          morning_time?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_progress_notifications_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: true
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          color: string
          created_at: string
          description: string | null
          frequency_days: number[] | null
          frequency_goal_custom_days: number | null
          frequency_goal_period:
            | Database["public"]["Enums"]["frequency_goal_period"]
            | null
          frequency_goal_value: number | null
          frequency_type: Database["public"]["Enums"]["habit_frequency_type"]
          has_target: boolean
          icon: string
          id: string
          is_active: boolean
          name: string
          target_unit: string | null
          target_value: number | null
          type: Database["public"]["Enums"]["habit_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          frequency_days?: number[] | null
          frequency_goal_custom_days?: number | null
          frequency_goal_period?:
            | Database["public"]["Enums"]["frequency_goal_period"]
            | null
          frequency_goal_value?: number | null
          frequency_type: Database["public"]["Enums"]["habit_frequency_type"]
          has_target?: boolean
          icon?: string
          id?: string
          is_active?: boolean
          name: string
          target_unit?: string | null
          target_value?: number | null
          type: Database["public"]["Enums"]["habit_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          frequency_days?: number[] | null
          frequency_goal_custom_days?: number | null
          frequency_goal_period?:
            | Database["public"]["Enums"]["frequency_goal_period"]
            | null
          frequency_goal_value?: number | null
          frequency_type?: Database["public"]["Enums"]["habit_frequency_type"]
          has_target?: boolean
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          target_unit?: string | null
          target_value?: number | null
          type?: Database["public"]["Enums"]["habit_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          created_at: string
          default_snooze_minutes: number
          default_sound: string
          enabled: boolean
          id: string
          quiet_hours_enabled: boolean
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          smart_notifications: boolean
          updated_at: string
          user_id: string
          vibration_enabled: boolean
        }
        Insert: {
          created_at?: string
          default_snooze_minutes?: number
          default_sound?: string
          enabled?: boolean
          id?: string
          quiet_hours_enabled?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          smart_notifications?: boolean
          updated_at?: string
          user_id: string
          vibration_enabled?: boolean
        }
        Update: {
          created_at?: string
          default_snooze_minutes?: number
          default_sound?: string
          enabled?: boolean
          id?: string
          quiet_hours_enabled?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          smart_notifications?: boolean
          updated_at?: string
          user_id?: string
          vibration_enabled?: boolean
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          created_at: string
          days_of_week: number[] | null
          habit_id: string
          id: string
          is_active: boolean
          notification_ids: string[] | null
          sound: string | null
          time: string
        }
        Insert: {
          created_at?: string
          days_of_week?: number[] | null
          habit_id: string
          id?: string
          is_active?: boolean
          notification_ids?: string[] | null
          sound?: string | null
          time: string
        }
        Update: {
          created_at?: string
          days_of_week?: number[] | null
          habit_id?: string
          id?: string
          is_active?: boolean
          notification_ids?: string[] | null
          sound?: string | null
          time?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      streaks: {
        Row: {
          best_streak: number
          current_streak: number
          habit_id: string
          id: string
          last_completion_date: string | null
          updated_at: string
        }
        Insert: {
          best_streak?: number
          current_streak?: number
          habit_id: string
          id?: string
          last_completion_date?: string | null
          updated_at?: string
        }
        Update: {
          best_streak?: number
          current_streak?: number
          habit_id?: string
          id?: string
          last_completion_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "streaks_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: true
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      frequency_goal_period: "week" | "month" | "custom"
      habit_frequency_type: "daily" | "weekly" | "custom"
      habit_type: "positive" | "negative"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      frequency_goal_period: ["week", "month", "custom"],
      habit_frequency_type: ["daily", "weekly", "custom"],
      habit_type: ["positive", "negative"],
    },
  },
} as const
