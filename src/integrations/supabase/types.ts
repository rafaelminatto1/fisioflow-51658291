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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          appointment_date: string
          appointment_time: string
          created_at: string
          created_by: string | null
          duration: number
          id: string
          notes: string | null
          patient_id: string
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          created_at?: string
          created_by?: string | null
          duration?: number
          id?: string
          notes?: string | null
          patient_id: string
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          created_at?: string
          created_by?: string | null
          duration?: number
          id?: string
          notes?: string | null
          patient_id?: string
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_plan_items: {
        Row: {
          exercise_id: string
          exercise_plan_id: string
          id: string
          notes: string | null
          order_index: number
          reps: number
          rest_time: number
          sets: number
        }
        Insert: {
          exercise_id: string
          exercise_plan_id: string
          id?: string
          notes?: string | null
          order_index?: number
          reps?: number
          rest_time?: number
          sets?: number
        }
        Update: {
          exercise_id?: string
          exercise_plan_id?: string
          id?: string
          notes?: string | null
          order_index?: number
          reps?: number
          rest_time?: number
          sets?: number
        }
        Relationships: [
          {
            foreignKeyName: "exercise_plan_items_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_plan_items_exercise_plan_id_fkey"
            columns: ["exercise_plan_id"]
            isOneToOne: false
            referencedRelation: "exercise_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_plans: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          patient_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          patient_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          patient_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "exercise_plans_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          category: string
          contraindications: string | null
          created_at: string
          created_by: string | null
          description: string
          difficulty: string
          duration: string
          equipment: string[] | null
          id: string
          instructions: string
          name: string
          target_muscles: string[]
          updated_at: string
        }
        Insert: {
          category: string
          contraindications?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          difficulty: string
          duration: string
          equipment?: string[] | null
          id?: string
          instructions: string
          name: string
          target_muscles: string[]
          updated_at?: string
        }
        Update: {
          category?: string
          contraindications?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          difficulty?: string
          duration?: string
          equipment?: string[] | null
          id?: string
          instructions?: string
          name?: string
          target_muscles?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercises_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      medical_records: {
        Row: {
          content: string
          created_at: string
          created_by: string
          id: string
          patient_id: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          id?: string
          patient_id: string
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          patient_id?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "medical_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_progress: {
        Row: {
          created_at: string
          created_by: string
          exercise_compliance: number
          functional_score: number
          id: string
          notes: string | null
          pain_level: number
          patient_id: string
          progress_date: string
        }
        Insert: {
          created_at?: string
          created_by: string
          exercise_compliance: number
          functional_score: number
          id?: string
          notes?: string | null
          pain_level: number
          patient_id: string
          progress_date?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          exercise_compliance?: number
          functional_score?: number
          id?: string
          notes?: string | null
          pain_level?: number
          patient_id?: string
          progress_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_progress_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "patient_progress_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          birth_date: string
          created_at: string
          created_by: string | null
          email: string | null
          emergency_contact: string | null
          gender: string
          id: string
          main_condition: string
          medical_history: string | null
          name: string
          phone: string | null
          progress: number
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          birth_date: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          emergency_contact?: string | null
          gender: string
          id?: string
          main_condition: string
          medical_history?: string | null
          name: string
          phone?: string | null
          progress?: number
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          birth_date?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          emergency_contact?: string | null
          gender?: string
          id?: string
          main_condition?: string
          medical_history?: string | null
          name?: string
          phone?: string | null
          progress?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          crefito: string | null
          full_name: string
          id: string
          phone: string | null
          role: string
          specialties: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          crefito?: string | null
          full_name: string
          id?: string
          phone?: string | null
          role?: string
          specialties?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          crefito?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          role?: string
          specialties?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      treatment_sessions: {
        Row: {
          appointment_id: string | null
          created_at: string
          created_by: string
          evolution_notes: string
          exercise_plan_id: string | null
          id: string
          next_session_goals: string | null
          observations: string
          pain_level: number
          patient_id: string
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          created_by: string
          evolution_notes: string
          exercise_plan_id?: string | null
          id?: string
          next_session_goals?: string | null
          observations: string
          pain_level: number
          patient_id: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          created_by?: string
          evolution_notes?: string
          exercise_plan_id?: string | null
          id?: string
          next_session_goals?: string | null
          observations?: string
          pain_level?: number
          patient_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatment_sessions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "treatment_sessions_exercise_plan_id_fkey"
            columns: ["exercise_plan_id"]
            isOneToOne: false
            referencedRelation: "exercise_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_sessions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
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
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
