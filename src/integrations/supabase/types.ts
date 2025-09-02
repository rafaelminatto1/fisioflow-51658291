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
          cancellation_reason: string | null
          created_at: string
          created_by: string | null
          duration: number
          end_time: string | null
          id: string
          notes: string | null
          patient_id: string
          reminder_sent: boolean | null
          room: string | null
          status: string
          therapist_id: string | null
          type: string
          updated_at: string
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          cancellation_reason?: string | null
          created_at?: string
          created_by?: string | null
          duration?: number
          end_time?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          reminder_sent?: boolean | null
          room?: string | null
          status?: string
          therapist_id?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          cancellation_reason?: string | null
          created_at?: string
          created_by?: string | null
          duration?: number
          end_time?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          reminder_sent?: boolean | null
          room?: string | null
          status?: string
          therapist_id?: string | null
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
          {
            foreignKeyName: "appointments_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          id: string
          ip_address: unknown | null
          new_values: Json | null
          old_values: Json | null
          record_id: string
          table_name: string
          timestamp: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          record_id: string
          table_name: string
          timestamp?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string
          table_name?: string
          timestamp?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      clinic_settings: {
        Row: {
          address: Json | null
          appointment_duration: number | null
          cnpj: string | null
          created_at: string | null
          email: string | null
          holiday_dates: string[] | null
          id: string
          logo_url: string | null
          max_appointments_per_day: number | null
          name: string
          phone: string | null
          updated_at: string | null
          working_hours: Json | null
        }
        Insert: {
          address?: Json | null
          appointment_duration?: number | null
          cnpj?: string | null
          created_at?: string | null
          email?: string | null
          holiday_dates?: string[] | null
          id?: string
          logo_url?: string | null
          max_appointments_per_day?: number | null
          name: string
          phone?: string | null
          updated_at?: string | null
          working_hours?: Json | null
        }
        Update: {
          address?: Json | null
          appointment_duration?: number | null
          cnpj?: string | null
          created_at?: string | null
          email?: string | null
          holiday_dates?: string[] | null
          id?: string
          logo_url?: string | null
          max_appointments_per_day?: number | null
          name?: string
          phone?: string | null
          updated_at?: string | null
          working_hours?: Json | null
        }
        Relationships: []
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
          chief_complaint: string | null
          coffito_code: string | null
          content: string
          created_at: string
          created_by: string
          current_history: string | null
          diagnosis: string | null
          functional_assessment: Json | null
          icd10: string | null
          id: string
          patient_id: string
          physical_exam: Json | null
          session_number: number | null
          therapist_id: string | null
          title: string
          treatment_plan: Json | null
          type: string
          updated_at: string
          vital_signs: Json | null
        }
        Insert: {
          chief_complaint?: string | null
          coffito_code?: string | null
          content: string
          created_at?: string
          created_by: string
          current_history?: string | null
          diagnosis?: string | null
          functional_assessment?: Json | null
          icd10?: string | null
          id?: string
          patient_id: string
          physical_exam?: Json | null
          session_number?: number | null
          therapist_id?: string | null
          title: string
          treatment_plan?: Json | null
          type: string
          updated_at?: string
          vital_signs?: Json | null
        }
        Update: {
          chief_complaint?: string | null
          coffito_code?: string | null
          content?: string
          created_at?: string
          created_by?: string
          current_history?: string | null
          diagnosis?: string | null
          functional_assessment?: Json | null
          icd10?: string | null
          id?: string
          patient_id?: string
          physical_exam?: Json | null
          session_number?: number | null
          therapist_id?: string | null
          title?: string
          treatment_plan?: Json | null
          type?: string
          updated_at?: string
          vital_signs?: Json | null
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
          {
            foreignKeyName: "medical_records_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          delivery_method: string | null
          id: string
          message: string
          metadata: Json | null
          read: boolean | null
          recipient_id: string | null
          scheduled_for: string | null
          sent_at: string | null
          status: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string | null
          delivery_method?: string | null
          id?: string
          message: string
          metadata?: Json | null
          read?: boolean | null
          recipient_id?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string | null
          title: string
          type: string
        }
        Update: {
          created_at?: string | null
          delivery_method?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          read?: boolean | null
          recipient_id?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          allergies: string | null
          birth_date: string
          blood_type: string | null
          consent_data: boolean | null
          consent_image: boolean | null
          created_at: string
          created_by: string | null
          email: string | null
          emergency_contact: string | null
          gender: string
          height_cm: number | null
          id: string
          insurance_info: Json | null
          main_condition: string
          medical_history: string | null
          medications: string | null
          name: string
          occupation: string | null
          phone: string | null
          profile_id: string | null
          progress: number
          referral_source: string | null
          status: string
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          address?: string | null
          allergies?: string | null
          birth_date: string
          blood_type?: string | null
          consent_data?: boolean | null
          consent_image?: boolean | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          emergency_contact?: string | null
          gender: string
          height_cm?: number | null
          id?: string
          insurance_info?: Json | null
          main_condition: string
          medical_history?: string | null
          medications?: string | null
          name: string
          occupation?: string | null
          phone?: string | null
          profile_id?: string | null
          progress?: number
          referral_source?: string | null
          status?: string
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          address?: string | null
          allergies?: string | null
          birth_date?: string
          blood_type?: string | null
          consent_data?: boolean | null
          consent_image?: boolean | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          emergency_contact?: string | null
          gender?: string
          height_cm?: number | null
          id?: string
          insurance_info?: Json | null
          main_condition?: string
          medical_history?: string | null
          medications?: string | null
          name?: string
          occupation?: string | null
          phone?: string | null
          profile_id?: string | null
          progress?: number
          referral_source?: string | null
          status?: string
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "patients_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          available_hours: Json | null
          avatar_url: string | null
          bio: string | null
          birth_date: string | null
          consultation_fee: number | null
          cpf: string | null
          created_at: string
          crefito: string | null
          emergency_contact: Json | null
          experience_years: number | null
          full_name: string
          id: string
          is_active: boolean | null
          last_login_at: string | null
          license_expiry: string | null
          notification_preferences: Json | null
          onboarding_completed: boolean | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          specialties: string[] | null
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          available_hours?: Json | null
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          consultation_fee?: number | null
          cpf?: string | null
          created_at?: string
          crefito?: string | null
          emergency_contact?: Json | null
          experience_years?: number | null
          full_name: string
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          license_expiry?: string | null
          notification_preferences?: Json | null
          onboarding_completed?: boolean | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          specialties?: string[] | null
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          available_hours?: Json | null
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          consultation_fee?: number | null
          cpf?: string | null
          created_at?: string
          crefito?: string | null
          emergency_contact?: Json | null
          experience_years?: number | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          license_expiry?: string | null
          notification_preferences?: Json | null
          onboarding_completed?: boolean | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          specialties?: string[] | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      treatment_sessions: {
        Row: {
          appointment_id: string | null
          attachments: Json | null
          created_at: string
          created_by: string
          duration_minutes: number | null
          equipment_used: string[] | null
          evolution_notes: string
          exercise_plan_id: string | null
          homework_assigned: string | null
          id: string
          next_session_goals: string | null
          observations: string
          pain_level: number
          patient_id: string
          patient_response: string | null
          session_number: number | null
          techniques_used: string[] | null
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          attachments?: Json | null
          created_at?: string
          created_by: string
          duration_minutes?: number | null
          equipment_used?: string[] | null
          evolution_notes: string
          exercise_plan_id?: string | null
          homework_assigned?: string | null
          id?: string
          next_session_goals?: string | null
          observations: string
          pain_level: number
          patient_id: string
          patient_response?: string | null
          session_number?: number | null
          techniques_used?: string[] | null
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          attachments?: Json | null
          created_at?: string
          created_by?: string
          duration_minutes?: number | null
          equipment_used?: string[] | null
          evolution_notes?: string
          exercise_plan_id?: string | null
          homework_assigned?: string | null
          id?: string
          next_session_goals?: string | null
          observations?: string
          pain_level?: number
          patient_id?: string
          patient_response?: string | null
          session_number?: number | null
          techniques_used?: string[] | null
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
      get_patient_full_info: {
        Args: { patient_uuid: string }
        Returns: Json
      }
      validate_cpf: {
        Args: { cpf_input: string }
        Returns: boolean
      }
    }
    Enums: {
      user_role:
        | "admin"
        | "fisioterapeuta"
        | "estagiario"
        | "paciente"
        | "parceiro"
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
    Enums: {
      user_role: [
        "admin",
        "fisioterapeuta",
        "estagiario",
        "paciente",
        "parceiro",
      ],
    },
  },
} as const
