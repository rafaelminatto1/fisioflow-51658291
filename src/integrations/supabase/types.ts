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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      achievements_log: {
        Row: {
          achievement_id: string
          achievement_title: string
          id: string
          patient_id: string
          unlocked_at: string | null
          xp_reward: number | null
        }
        Insert: {
          achievement_id: string
          achievement_title: string
          id?: string
          patient_id: string
          unlocked_at?: string | null
          xp_reward?: number | null
        }
        Update: {
          achievement_id?: string
          achievement_title?: string
          id?: string
          patient_id?: string
          unlocked_at?: string | null
          xp_reward?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "achievements_log_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "achievements_log_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "achievements_log_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      adaptation_history: {
        Row: {
          changes_applied: Json
          created_at: string | null
          effectiveness_score: number | null
          exercise_plan_id: string
          id: string
          notes: string | null
          patient_id: string
          results_after_days: number | null
          suggestion_id: string
        }
        Insert: {
          changes_applied: Json
          created_at?: string | null
          effectiveness_score?: number | null
          exercise_plan_id: string
          id?: string
          notes?: string | null
          patient_id: string
          results_after_days?: number | null
          suggestion_id: string
        }
        Update: {
          changes_applied?: Json
          created_at?: string | null
          effectiveness_score?: number | null
          exercise_plan_id?: string
          id?: string
          notes?: string | null
          patient_id?: string
          results_after_days?: number | null
          suggestion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "adaptation_history_exercise_plan_id_fkey"
            columns: ["exercise_plan_id"]
            isOneToOne: false
            referencedRelation: "exercise_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adaptation_history_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adaptation_history_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adaptation_history_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adaptation_history_suggestion_id_fkey"
            columns: ["suggestion_id"]
            isOneToOne: false
            referencedRelation: "adaptation_suggestions"
            referencedColumns: ["id"]
          },
        ]
      }
      adaptation_rules: {
        Row: {
          action_type: string
          adjustment_percentage: number
          condition_type: string
          created_at: string | null
          description: string
          id: string
          is_active: boolean | null
          threshold_value: number
          updated_at: string | null
        }
        Insert: {
          action_type: string
          adjustment_percentage: number
          condition_type: string
          created_at?: string | null
          description: string
          id?: string
          is_active?: boolean | null
          threshold_value: number
          updated_at?: string | null
        }
        Update: {
          action_type?: string
          adjustment_percentage?: number
          condition_type?: string
          created_at?: string | null
          description?: string
          id?: string
          is_active?: boolean | null
          threshold_value?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      adaptation_suggestions: {
        Row: {
          applied_at: string | null
          confidence_score: number
          created_at: string | null
          current_metrics: Json
          exercise_plan_id: string
          id: string
          patient_id: string
          rule_id: string
          status: string | null
          suggested_changes: Json
          updated_at: string | null
        }
        Insert: {
          applied_at?: string | null
          confidence_score: number
          created_at?: string | null
          current_metrics: Json
          exercise_plan_id: string
          id?: string
          patient_id: string
          rule_id: string
          status?: string | null
          suggested_changes: Json
          updated_at?: string | null
        }
        Update: {
          applied_at?: string | null
          confidence_score?: number
          created_at?: string | null
          current_metrics?: Json
          exercise_plan_id?: string
          id?: string
          patient_id?: string
          rule_id?: string
          status?: string | null
          suggested_changes?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "adaptation_suggestions_exercise_plan_id_fkey"
            columns: ["exercise_plan_id"]
            isOneToOne: false
            referencedRelation: "exercise_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adaptation_suggestions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adaptation_suggestions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adaptation_suggestions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adaptation_suggestions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "adaptation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      adherence_reports: {
        Row: {
          adherence_percentage: number
          average_functional_score: number
          average_pain_level: number
          completed_exercises: number
          created_at: string | null
          id: string
          patient_id: string
          period_end: string
          period_start: string
          plan_id: string
          progression_score: number
          recommendations: string[] | null
          total_exercises: number
          updated_at: string | null
        }
        Insert: {
          adherence_percentage?: number
          average_functional_score?: number
          average_pain_level?: number
          completed_exercises?: number
          created_at?: string | null
          id?: string
          patient_id: string
          period_end: string
          period_start: string
          plan_id: string
          progression_score?: number
          recommendations?: string[] | null
          total_exercises?: number
          updated_at?: string | null
        }
        Update: {
          adherence_percentage?: number
          average_functional_score?: number
          average_pain_level?: number
          completed_exercises?: number
          created_at?: string | null
          id?: string
          patient_id?: string
          period_end?: string
          period_start?: string
          plan_id?: string
          progression_score?: number
          recommendations?: string[] | null
          total_exercises?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "adherence_reports_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adherence_reports_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adherence_reports_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adherence_reports_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "exercise_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_cache: {
        Row: {
          cache_type: string
          confidence_score: number | null
          created_at: string | null
          expires_at: string
          id: string
          query_hash: string
          query_text: string
          response: string
          source: string
          usage_count: number | null
        }
        Insert: {
          cache_type?: string
          confidence_score?: number | null
          created_at?: string | null
          expires_at: string
          id?: string
          query_hash: string
          query_text: string
          response: string
          source: string
          usage_count?: number | null
        }
        Update: {
          cache_type?: string
          confidence_score?: number | null
          created_at?: string | null
          expires_at?: string
          id?: string
          query_hash?: string
          query_text?: string
          response?: string
          source?: string
          usage_count?: number | null
        }
        Relationships: []
      }
      ai_clinical_sessions: {
        Row: {
          ai_generated_soap: Json | null
          ai_suggestions: Json | null
          appointment_id: string | null
          approved_at: string | null
          audio_url: string | null
          created_at: string | null
          id: string
          patient_id: string
          therapist_approved: boolean | null
          therapist_id: string | null
          transcription: string | null
          updated_at: string | null
        }
        Insert: {
          ai_generated_soap?: Json | null
          ai_suggestions?: Json | null
          appointment_id?: string | null
          approved_at?: string | null
          audio_url?: string | null
          created_at?: string | null
          id?: string
          patient_id: string
          therapist_approved?: boolean | null
          therapist_id?: string | null
          transcription?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_generated_soap?: Json | null
          ai_suggestions?: Json | null
          appointment_id?: string | null
          approved_at?: string | null
          audio_url?: string | null
          created_at?: string | null
          id?: string
          patient_id?: string
          therapist_approved?: boolean | null
          therapist_id?: string | null
          transcription?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_clinical_sessions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_clinical_sessions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_clinical_sessions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "patient_appointment_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_clinical_sessions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "therapist_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_clinical_sessions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "today_appointments_with_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_exercise_prescriptions: {
        Row: {
          created_at: string
          id: string
          patient_id: string
          prescription_data: Json
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          patient_id: string
          prescription_data: Json
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          patient_id?: string
          prescription_data?: Json
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_exercise_prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_exercise_prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_exercise_prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_prompts: {
        Row: {
          category: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          name: string
          success_rate: number | null
          template: string
          updated_at: string | null
          usage_count: number | null
          variables: Json | null
        }
        Insert: {
          category: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          success_rate?: number | null
          template: string
          updated_at?: string | null
          usage_count?: number | null
          variables?: Json | null
        }
        Update: {
          category?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          success_rate?: number | null
          template?: string
          updated_at?: string | null
          usage_count?: number | null
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_prompts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_prompts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_prompts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "therapist_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_provider_accounts: {
        Row: {
          account_name: string
          created_at: string | null
          credentials_encrypted: string | null
          daily_limit: number | null
          daily_usage_count: number | null
          id: string
          is_active: boolean | null
          last_used_at: string | null
          provider: string
          reset_time: string | null
        }
        Insert: {
          account_name: string
          created_at?: string | null
          credentials_encrypted?: string | null
          daily_limit?: number | null
          daily_usage_count?: number | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          provider: string
          reset_time?: string | null
        }
        Update: {
          account_name?: string
          created_at?: string | null
          credentials_encrypted?: string | null
          daily_limit?: number | null
          daily_usage_count?: number | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          provider?: string
          reset_time?: string | null
        }
        Relationships: []
      }
      ai_queries: {
        Row: {
          context_data: Json | null
          created_at: string | null
          feedback: string | null
          id: string
          patient_id: string | null
          processing_time_ms: number | null
          query_text: string
          rating: number | null
          response_text: string
          source: string
          user_id: string | null
        }
        Insert: {
          context_data?: Json | null
          created_at?: string | null
          feedback?: string | null
          id?: string
          patient_id?: string | null
          processing_time_ms?: number | null
          query_text: string
          rating?: number | null
          response_text: string
          source: string
          user_id?: string | null
        }
        Update: {
          context_data?: Json | null
          created_at?: string | null
          feedback?: string | null
          id?: string
          patient_id?: string | null
          processing_time_ms?: number | null
          query_text?: string
          rating?: number | null
          response_text?: string
          source?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_queries_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_queries_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_queries_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_queries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_queries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_queries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "therapist_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_suggestions: {
        Row: {
          action_type: string
          created_at: string | null
          created_by: string | null
          id: string
          patient_id: string
          suggestion_text: string
          updated_at: string | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          patient_id: string
          suggestion_text: string
          updated_at?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          patient_id?: string
          suggestion_text?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_suggestions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_suggestions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_suggestions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_snapshots: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          metric_type: string
          metric_value: number
          snapshot_date: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          metric_type: string
          metric_value: number
          snapshot_date: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          metric_type?: string
          metric_value?: number
          snapshot_date?: string
        }
        Relationships: []
      }
      appointment_predictions: {
        Row: {
          appointment_id: string | null
          created_at: string | null
          id: string
          no_show_probability: number | null
          patient_id: string
          prediction_date: string | null
          recommended_actions: string[] | null
          risk_factors: Json | null
          was_accurate: boolean | null
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string | null
          id?: string
          no_show_probability?: number | null
          patient_id: string
          prediction_date?: string | null
          recommended_actions?: string[] | null
          risk_factors?: Json | null
          was_accurate?: boolean | null
        }
        Update: {
          appointment_id?: string | null
          created_at?: string | null
          id?: string
          no_show_probability?: number | null
          patient_id?: string
          prediction_date?: string | null
          recommended_actions?: string[] | null
          risk_factors?: Json | null
          was_accurate?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_predictions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_predictions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_predictions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "patient_appointment_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_predictions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "therapist_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_predictions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "today_appointments_with_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_series: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          patient_id: string
          recurrence_pattern: Json
          sessions_completed: number | null
          therapist_id: string | null
          total_sessions: number | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          patient_id: string
          recurrence_pattern: Json
          sessions_completed?: number | null
          therapist_id?: string | null
          total_sessions?: number | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          patient_id?: string
          recurrence_pattern?: Json
          sessions_completed?: number | null
          therapist_id?: string | null
          total_sessions?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_series_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_series_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_series_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_series_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_series_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_series_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapist_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_date: string
          appointment_time: string
          cancellation_reason: string | null
          confirmation_method: string | null
          confirmation_sent_at: string | null
          confirmation_status: string | null
          confirmed_at: string | null
          created_at: string | null
          date: string
          duration: number | null
          end_time: string | null
          id: string
          is_recurring: boolean | null
          notes: string | null
          organization_id: string | null
          package_id: string | null
          patient_id: string
          payment_amount: number | null
          payment_status: string | null
          recurring_until: string | null
          reminder_sent: boolean | null
          reminder_sent_24h: string | null
          reminder_sent_2h: string | null
          room: string | null
          series_id: string | null
          session_package_id: string | null
          start_time: string
          status: string | null
          therapist_id: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          cancellation_reason?: string | null
          confirmation_method?: string | null
          confirmation_sent_at?: string | null
          confirmation_status?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          date: string
          duration?: number | null
          end_time?: string | null
          id?: string
          is_recurring?: boolean | null
          notes?: string | null
          organization_id?: string | null
          package_id?: string | null
          patient_id: string
          payment_amount?: number | null
          payment_status?: string | null
          recurring_until?: string | null
          reminder_sent?: boolean | null
          reminder_sent_24h?: string | null
          reminder_sent_2h?: string | null
          room?: string | null
          series_id?: string | null
          session_package_id?: string | null
          start_time: string
          status?: string | null
          therapist_id?: string | null
          type?: string
          updated_at?: string | null
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          cancellation_reason?: string | null
          confirmation_method?: string | null
          confirmation_sent_at?: string | null
          confirmation_status?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          date?: string
          duration?: number | null
          end_time?: string | null
          id?: string
          is_recurring?: boolean | null
          notes?: string | null
          organization_id?: string | null
          package_id?: string | null
          patient_id?: string
          payment_amount?: number | null
          payment_status?: string | null
          recurring_until?: string | null
          reminder_sent?: boolean | null
          reminder_sent_24h?: string | null
          reminder_sent_2h?: string | null
          room?: string | null
          series_id?: string | null
          session_package_id?: string | null
          start_time?: string
          status?: string | null
          therapist_id?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_session_package_id_fkey"
            columns: ["session_package_id"]
            isOneToOne: false
            referencedRelation: "session_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapist_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_questions: {
        Row: {
          id: string
          meta_data: Json | null
          options: Json | null
          order_index: number | null
          placeholder: string | null
          required: boolean | null
          section_id: string | null
          title: string
          type: string
        }
        Insert: {
          id?: string
          meta_data?: Json | null
          options?: Json | null
          order_index?: number | null
          placeholder?: string | null
          required?: boolean | null
          section_id?: string | null
          title: string
          type: string
        }
        Update: {
          id?: string
          meta_data?: Json | null
          options?: Json | null
          order_index?: number | null
          placeholder?: string | null
          required?: boolean | null
          section_id?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_questions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "assessment_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_responses: {
        Row: {
          assessment_id: string | null
          created_at: string | null
          id: string
          question_id: string | null
          value_json: Json | null
          value_number: number | null
          value_text: string | null
        }
        Insert: {
          assessment_id?: string | null
          created_at?: string | null
          id?: string
          question_id?: string | null
          value_json?: Json | null
          value_number?: number | null
          value_text?: string | null
        }
        Update: {
          assessment_id?: string | null
          created_at?: string | null
          id?: string
          question_id?: string | null
          value_json?: Json | null
          value_number?: number | null
          value_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_responses_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "patient_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "assessment_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_sections: {
        Row: {
          description: string | null
          id: string
          order_index: number | null
          template_id: string | null
          title: string
        }
        Insert: {
          description?: string | null
          id?: string
          order_index?: number | null
          template_id?: string | null
          title: string
        }
        Update: {
          description?: string | null
          id?: string
          order_index?: number | null
          template_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_sections_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "assessment_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          title: string
          type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          title: string
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          title?: string
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      atestado_templates: {
        Row: {
          ativo: boolean
          conteudo: string
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          nome: string
          organization_id: string | null
          updated_at: string
          variaveis_disponiveis: Json | null
        }
        Insert: {
          ativo?: boolean
          conteudo: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome: string
          organization_id?: string | null
          updated_at?: string
          variaveis_disponiveis?: Json | null
        }
        Update: {
          ativo?: boolean
          conteudo?: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          organization_id?: string | null
          updated_at?: string
          variaveis_disponiveis?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "atestado_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          changes: Json | null
          id: string
          ip_address: unknown
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          session_id: string | null
          table_name: string
          timestamp: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          changes?: Json | null
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          session_id?: string | null
          table_name: string
          timestamp?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          changes?: Json | null
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          session_id?: string | null
          table_name?: string
          timestamp?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: unknown
          new_data: Json | null
          old_data: Json | null
          organization_id: string | null
          record_id: string | null
          table_name: string
          updated_at: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          organization_id?: string | null
          record_id?: string | null
          table_name: string
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          organization_id?: string | null
          record_id?: string | null
          table_name?: string
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      backup_logs: {
        Row: {
          backup_name: string
          backup_type: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          error_message: string | null
          file_path: string | null
          file_size_bytes: number | null
          id: string
          organization_id: string | null
          records_count: Json | null
          restored_at: string | null
          restored_by: string | null
          started_at: string | null
          status: string
          tables_included: string[] | null
        }
        Insert: {
          backup_name: string
          backup_type?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          file_path?: string | null
          file_size_bytes?: number | null
          id?: string
          organization_id?: string | null
          records_count?: Json | null
          restored_at?: string | null
          restored_by?: string | null
          started_at?: string | null
          status?: string
          tables_included?: string[] | null
        }
        Update: {
          backup_name?: string
          backup_type?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          file_path?: string | null
          file_size_bytes?: number | null
          id?: string
          organization_id?: string | null
          records_count?: Json | null
          restored_at?: string | null
          restored_by?: string | null
          started_at?: string | null
          status?: string
          tables_included?: string[] | null
        }
        Relationships: []
      }
      calendar_integrations: {
        Row: {
          access_token: string | null
          auto_send_events: boolean
          auto_sync_enabled: boolean
          calendar_email: string | null
          created_at: string
          default_calendar_id: string | null
          events_synced_count: number
          id: string
          is_connected: boolean
          last_synced_at: string | null
          provider: string
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          auto_send_events?: boolean
          auto_sync_enabled?: boolean
          calendar_email?: string | null
          created_at?: string
          default_calendar_id?: string | null
          events_synced_count?: number
          id?: string
          is_connected?: boolean
          last_synced_at?: string | null
          provider?: string
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          auto_send_events?: boolean
          auto_sync_enabled?: boolean
          calendar_email?: string | null
          created_at?: string
          default_calendar_id?: string | null
          events_synced_count?: number
          id?: string
          is_connected?: boolean
          last_synced_at?: string | null
          provider?: string
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      calendar_sync_logs: {
        Row: {
          action: string
          created_at: string
          event_id: string | null
          event_type: string | null
          external_event_id: string | null
          id: string
          integration_id: string
          message: string | null
          metadata: Json | null
          status: string
        }
        Insert: {
          action: string
          created_at?: string
          event_id?: string | null
          event_type?: string | null
          external_event_id?: string | null
          id?: string
          integration_id: string
          message?: string | null
          metadata?: Json | null
          status: string
        }
        Update: {
          action?: string
          created_at?: string
          event_id?: string | null
          event_type?: string | null
          external_event_id?: string | null
          id?: string
          integration_id?: string
          message?: string | null
          metadata?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_sync_logs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "calendar_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      centros_custo: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          nome: string
          organization_id: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          organization_id?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          organization_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "centros_custo_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_items: {
        Row: {
          created_at: string
          custo_unitario: number
          evento_id: string
          id: string
          quantidade: number
          status: string
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          custo_unitario?: number
          evento_id: string
          id?: string
          quantidade?: number
          status?: string
          tipo: string
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          custo_unitario?: number
          evento_id?: string
          id?: string
          quantidade?: number
          status?: string
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_items_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_items_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos_resumo"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_inventory: {
        Row: {
          category: string | null
          cost_per_unit: number | null
          created_at: string | null
          current_quantity: number | null
          expiration_date: string | null
          id: string
          is_active: boolean | null
          item_name: string
          last_restock_date: string | null
          location: string | null
          minimum_quantity: number | null
          organization_id: string | null
          supplier: string | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          cost_per_unit?: number | null
          created_at?: string | null
          current_quantity?: number | null
          expiration_date?: string | null
          id?: string
          is_active?: boolean | null
          item_name: string
          last_restock_date?: string | null
          location?: string | null
          minimum_quantity?: number | null
          organization_id?: string | null
          supplier?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          cost_per_unit?: number | null
          created_at?: string | null
          current_quantity?: number | null
          expiration_date?: string | null
          id?: string
          is_active?: boolean | null
          item_name?: string
          last_restock_date?: string | null
          location?: string | null
          minimum_quantity?: number | null
          organization_id?: string | null
          supplier?: string | null
          unit?: string | null
          updated_at?: string | null
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
      clinical_materials: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          download_count: number
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          is_public: boolean
          name: string
          organization_id: string | null
          specialty: Database["public"]["Enums"]["material_specialty"]
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          download_count?: number
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_public?: boolean
          name: string
          organization_id?: string | null
          specialty?: Database["public"]["Enums"]["material_specialty"]
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          download_count?: number
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_public?: boolean
          name?: string
          organization_id?: string | null
          specialty?: Database["public"]["Enums"]["material_specialty"]
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_materials_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_test_records: {
        Row: {
          created_at: string | null
          created_by: string | null
          date: string | null
          id: string
          notes: string | null
          patient_id: string
          result: string | null
          template_id: string
          updated_at: string | null
          values: Json
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          date?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          result?: string | null
          template_id: string
          updated_at?: string | null
          values?: Json
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          date?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          result?: string | null
          template_id?: string
          updated_at?: string | null
          values?: Json
        }
        Relationships: [
          {
            foreignKeyName: "clinical_test_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_test_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_test_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "therapist_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_test_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_test_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_test_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_test_records_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "clinical_test_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_test_templates: {
        Row: {
          calculation_formula: string | null
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          execution: string | null
          fields_definition: Json | null
          id: string
          media_placeholder_keywords: string[] | null
          media_urls: Json | null
          name: string
          name_en: string | null
          organization_id: string | null
          positive_sign: string | null
          purpose: string | null
          reference: string | null
          sensitivity_specificity: string | null
          tags: string[] | null
          target_joint: string | null
          type: string
          updated_at: string | null
          youtube_link: string | null
        }
        Insert: {
          calculation_formula?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          execution?: string | null
          fields_definition?: Json | null
          id?: string
          media_placeholder_keywords?: string[] | null
          media_urls?: Json | null
          name: string
          name_en?: string | null
          organization_id?: string | null
          positive_sign?: string | null
          purpose?: string | null
          reference?: string | null
          sensitivity_specificity?: string | null
          tags?: string[] | null
          target_joint?: string | null
          type?: string
          updated_at?: string | null
          youtube_link?: string | null
        }
        Update: {
          calculation_formula?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          execution?: string | null
          fields_definition?: Json | null
          id?: string
          media_placeholder_keywords?: string[] | null
          media_urls?: Json | null
          name?: string
          name_en?: string | null
          organization_id?: string | null
          positive_sign?: string | null
          purpose?: string | null
          reference?: string | null
          sensitivity_specificity?: string | null
          tags?: string[] | null
          target_joint?: string | null
          type?: string
          updated_at?: string | null
          youtube_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_test_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_test_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_test_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "therapist_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_test_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      comissoes: {
        Row: {
          created_at: string
          data_pagamento: string | null
          descontos: number | null
          id: string
          organization_id: string | null
          percentual_comissao: number | null
          periodo_fim: string
          periodo_inicio: string
          profissional_id: string
          status: string | null
          total_atendimentos: number | null
          updated_at: string
          valor_bruto: number | null
          valor_comissao: number | null
          valor_liquido: number | null
        }
        Insert: {
          created_at?: string
          data_pagamento?: string | null
          descontos?: number | null
          id?: string
          organization_id?: string | null
          percentual_comissao?: number | null
          periodo_fim: string
          periodo_inicio: string
          profissional_id: string
          status?: string | null
          total_atendimentos?: number | null
          updated_at?: string
          valor_bruto?: number | null
          valor_comissao?: number | null
          valor_liquido?: number | null
        }
        Update: {
          created_at?: string
          data_pagamento?: string | null
          descontos?: number | null
          id?: string
          organization_id?: string | null
          percentual_comissao?: number | null
          periodo_fim?: string
          periodo_inicio?: string
          profissional_id?: string
          status?: string | null
          total_atendimentos?: number | null
          updated_at?: string
          valor_bruto?: number | null
          valor_comissao?: number | null
          valor_liquido?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "comissoes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comissoes_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comissoes_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comissoes_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "therapist_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_logs: {
        Row: {
          appointment_id: string | null
          body: string
          cost: number | null
          created_at: string
          delivered_at: string | null
          error_message: string | null
          external_id: string | null
          failed_at: string | null
          id: string
          organization_id: string
          patient_id: string | null
          provider: string | null
          read_at: string | null
          recipient: string
          response_at: string | null
          response_received: boolean | null
          response_text: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["communication_status"]
          subject: string | null
          template_name: string | null
          type: Database["public"]["Enums"]["communication_type"]
        }
        Insert: {
          appointment_id?: string | null
          body: string
          cost?: number | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          external_id?: string | null
          failed_at?: string | null
          id?: string
          organization_id: string
          patient_id?: string | null
          provider?: string | null
          read_at?: string | null
          recipient: string
          response_at?: string | null
          response_received?: boolean | null
          response_text?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["communication_status"]
          subject?: string | null
          template_name?: string | null
          type: Database["public"]["Enums"]["communication_type"]
        }
        Update: {
          appointment_id?: string | null
          body?: string
          cost?: number | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          external_id?: string | null
          failed_at?: string | null
          id?: string
          organization_id?: string
          patient_id?: string | null
          provider?: string | null
          read_at?: string | null
          recipient?: string
          response_at?: string | null
          response_received?: boolean | null
          response_text?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["communication_status"]
          subject?: string | null
          template_name?: string | null
          type?: Database["public"]["Enums"]["communication_type"]
        }
        Relationships: [
          {
            foreignKeyName: "communication_logs_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_logs_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_logs_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "patient_appointment_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_logs_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "therapist_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_logs_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "today_appointments_with_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_logs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_logs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_logs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      conduct_library: {
        Row: {
          category: string
          conduct_text: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          organization_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          conduct_text: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          organization_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          conduct_text?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          organization_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conduct_library_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_financeiras: {
        Row: {
          appointment_id: string | null
          categoria: string | null
          comprovante_url: string | null
          created_at: string
          created_by: string | null
          data_pagamento: string | null
          data_vencimento: string
          descricao: string
          forma_pagamento: string | null
          fornecedor_id: string | null
          id: string
          observacoes: string | null
          organization_id: string | null
          parcela_atual: number | null
          parcelas: number | null
          patient_id: string | null
          profissional_id: string | null
          recorrencia_tipo: string | null
          recorrente: boolean | null
          status: string
          tipo: string
          updated_at: string
          valor: number
        }
        Insert: {
          appointment_id?: string | null
          categoria?: string | null
          comprovante_url?: string | null
          created_at?: string
          created_by?: string | null
          data_pagamento?: string | null
          data_vencimento: string
          descricao: string
          forma_pagamento?: string | null
          fornecedor_id?: string | null
          id?: string
          observacoes?: string | null
          organization_id?: string | null
          parcela_atual?: number | null
          parcelas?: number | null
          patient_id?: string | null
          profissional_id?: string | null
          recorrencia_tipo?: string | null
          recorrente?: boolean | null
          status?: string
          tipo: string
          updated_at?: string
          valor: number
        }
        Update: {
          appointment_id?: string | null
          categoria?: string | null
          comprovante_url?: string | null
          created_at?: string
          created_by?: string | null
          data_pagamento?: string | null
          data_vencimento?: string
          descricao?: string
          forma_pagamento?: string | null
          fornecedor_id?: string | null
          id?: string
          observacoes?: string | null
          organization_id?: string | null
          parcela_atual?: number | null
          parcelas?: number | null
          patient_id?: string | null
          profissional_id?: string | null
          recorrencia_tipo?: string | null
          recorrente?: boolean | null
          status?: string
          tipo?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "contas_financeiras_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_financeiras_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_financeiras_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "patient_appointment_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_financeiras_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "therapist_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_financeiras_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "today_appointments_with_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_financeiras_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_financeiras_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_financeiras_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_financeiras_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_financeiras_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_financeiras_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_financeiras_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_financeiras_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "therapist_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      contrato_templates: {
        Row: {
          ativo: boolean
          conteudo: string
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          nome: string
          organization_id: string | null
          tipo: string
          updated_at: string
          variaveis_disponiveis: Json | null
        }
        Insert: {
          ativo?: boolean
          conteudo: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome: string
          organization_id?: string | null
          tipo?: string
          updated_at?: string
          variaveis_disponiveis?: Json | null
        }
        Update: {
          ativo?: boolean
          conteudo?: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          organization_id?: string | null
          tipo?: string
          updated_at?: string
          variaveis_disponiveis?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "contrato_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      convenios: {
        Row: {
          ativo: boolean
          cnpj: string | null
          contato_responsavel: string | null
          created_at: string
          email: string | null
          id: string
          nome: string
          observacoes: string | null
          organization_id: string | null
          prazo_pagamento_dias: number | null
          telefone: string | null
          updated_at: string
          valor_repasse: number | null
        }
        Insert: {
          ativo?: boolean
          cnpj?: string | null
          contato_responsavel?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          organization_id?: string | null
          prazo_pagamento_dias?: number | null
          telefone?: string | null
          updated_at?: string
          valor_repasse?: number | null
        }
        Update: {
          ativo?: boolean
          cnpj?: string | null
          contato_responsavel?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          organization_id?: string | null
          prazo_pagamento_dias?: number | null
          telefone?: string | null
          updated_at?: string
          valor_repasse?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "convenios_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_automacao_logs: {
        Row: {
          automacao_id: string | null
          created_at: string | null
          detalhes: Json | null
          id: string
          lead_id: string | null
          patient_id: string | null
          status: string | null
        }
        Insert: {
          automacao_id?: string | null
          created_at?: string | null
          detalhes?: Json | null
          id?: string
          lead_id?: string | null
          patient_id?: string | null
          status?: string | null
        }
        Update: {
          automacao_id?: string | null
          created_at?: string | null
          detalhes?: Json | null
          id?: string
          lead_id?: string | null
          patient_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_automacao_logs_automacao_id_fkey"
            columns: ["automacao_id"]
            isOneToOne: false
            referencedRelation: "crm_automacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_automacao_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_automacao_logs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_automacao_logs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_automacao_logs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_automacoes: {
        Row: {
          acao_config: Json | null
          ativo: boolean | null
          canal: string | null
          created_at: string | null
          created_by: string | null
          descricao: string | null
          gatilho_config: Json | null
          id: string
          nome: string
          organization_id: string | null
          template_mensagem: string | null
          tipo: string
          total_executado: number | null
          ultima_execucao: string | null
          updated_at: string | null
        }
        Insert: {
          acao_config?: Json | null
          ativo?: boolean | null
          canal?: string | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          gatilho_config?: Json | null
          id?: string
          nome: string
          organization_id?: string | null
          template_mensagem?: string | null
          tipo: string
          total_executado?: number | null
          ultima_execucao?: string | null
          updated_at?: string | null
        }
        Update: {
          acao_config?: Json | null
          ativo?: boolean | null
          canal?: string | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          gatilho_config?: Json | null
          id?: string
          nome?: string
          organization_id?: string | null
          template_mensagem?: string | null
          tipo?: string
          total_executado?: number | null
          ultima_execucao?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_automacoes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_campanha_envios: {
        Row: {
          aberto_em: string | null
          campanha_id: string | null
          clicado_em: string | null
          created_at: string | null
          entregue_em: string | null
          enviado_em: string | null
          erro_mensagem: string | null
          id: string
          lead_id: string | null
          status: string | null
        }
        Insert: {
          aberto_em?: string | null
          campanha_id?: string | null
          clicado_em?: string | null
          created_at?: string | null
          entregue_em?: string | null
          enviado_em?: string | null
          erro_mensagem?: string | null
          id?: string
          lead_id?: string | null
          status?: string | null
        }
        Update: {
          aberto_em?: string | null
          campanha_id?: string | null
          clicado_em?: string | null
          created_at?: string | null
          entregue_em?: string | null
          enviado_em?: string | null
          erro_mensagem?: string | null
          id?: string
          lead_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_campanha_envios_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "crm_campanhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_campanha_envios_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_campanhas: {
        Row: {
          agendada_para: string | null
          assunto: string | null
          concluida_em: string | null
          conteudo: string
          created_at: string | null
          created_by: string | null
          descricao: string | null
          filtro_estagios: string[] | null
          filtro_origens: string[] | null
          filtro_tags: string[] | null
          id: string
          iniciada_em: string | null
          nome: string
          organization_id: string | null
          status: string | null
          template_id: string | null
          tipo: string
          total_abertos: number | null
          total_clicados: number | null
          total_destinatarios: number | null
          total_enviados: number | null
          total_respondidos: number | null
          updated_at: string | null
        }
        Insert: {
          agendada_para?: string | null
          assunto?: string | null
          concluida_em?: string | null
          conteudo: string
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          filtro_estagios?: string[] | null
          filtro_origens?: string[] | null
          filtro_tags?: string[] | null
          id?: string
          iniciada_em?: string | null
          nome: string
          organization_id?: string | null
          status?: string | null
          template_id?: string | null
          tipo: string
          total_abertos?: number | null
          total_clicados?: number | null
          total_destinatarios?: number | null
          total_enviados?: number | null
          total_respondidos?: number | null
          updated_at?: string | null
        }
        Update: {
          agendada_para?: string | null
          assunto?: string | null
          concluida_em?: string | null
          conteudo?: string
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          filtro_estagios?: string[] | null
          filtro_origens?: string[] | null
          filtro_tags?: string[] | null
          id?: string
          iniciada_em?: string | null
          nome?: string
          organization_id?: string | null
          status?: string | null
          template_id?: string | null
          tipo?: string
          total_abertos?: number | null
          total_clicados?: number | null
          total_destinatarios?: number | null
          total_enviados?: number | null
          total_respondidos?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_campanhas_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_pesquisas_nps: {
        Row: {
          categoria: string | null
          comentario: string | null
          created_at: string | null
          id: string
          lead_id: string | null
          motivo_nota: string | null
          nota: number
          organization_id: string | null
          origem: string | null
          patient_id: string | null
          respondido_em: string | null
          sugestoes: string | null
        }
        Insert: {
          categoria?: string | null
          comentario?: string | null
          created_at?: string | null
          id?: string
          lead_id?: string | null
          motivo_nota?: string | null
          nota: number
          organization_id?: string | null
          origem?: string | null
          patient_id?: string | null
          respondido_em?: string | null
          sugestoes?: string | null
        }
        Update: {
          categoria?: string | null
          comentario?: string | null
          created_at?: string | null
          id?: string
          lead_id?: string | null
          motivo_nota?: string | null
          nota?: number
          organization_id?: string | null
          origem?: string | null
          patient_id?: string | null
          respondido_em?: string | null
          sugestoes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_pesquisas_nps_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_pesquisas_nps_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_pesquisas_nps_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_pesquisas_nps_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_pesquisas_nps_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_tarefas: {
        Row: {
          concluida_em: string | null
          concluida_por: string | null
          created_at: string | null
          data_vencimento: string | null
          descricao: string | null
          hora_vencimento: string | null
          id: string
          lead_id: string | null
          lembrete_enviado: boolean | null
          organization_id: string | null
          prioridade: string | null
          responsavel_id: string | null
          status: string | null
          tipo: string
          titulo: string
          updated_at: string | null
        }
        Insert: {
          concluida_em?: string | null
          concluida_por?: string | null
          created_at?: string | null
          data_vencimento?: string | null
          descricao?: string | null
          hora_vencimento?: string | null
          id?: string
          lead_id?: string | null
          lembrete_enviado?: boolean | null
          organization_id?: string | null
          prioridade?: string | null
          responsavel_id?: string | null
          status?: string | null
          tipo?: string
          titulo: string
          updated_at?: string | null
        }
        Update: {
          concluida_em?: string | null
          concluida_por?: string | null
          created_at?: string | null
          data_vencimento?: string | null
          descricao?: string | null
          hora_vencimento?: string | null
          id?: string
          lead_id?: string | null
          lembrete_enviado?: boolean | null
          organization_id?: string | null
          prioridade?: string | null
          responsavel_id?: string | null
          status?: string | null
          tipo?: string
          titulo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_tarefas_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tarefas_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_metrics: {
        Row: {
          active_patients: number | null
          cancelled_appointments: number | null
          completed_appointments: number | null
          created_at: string | null
          id: string
          inactive_patients: number | null
          metric_date: string
          new_patients: number | null
          no_show_appointments: number | null
          organization_id: string | null
          packages_sold: number | null
          paid_amount: number | null
          pending_amount: number | null
          sessions_available: number | null
          sessions_used: number | null
          total_appointments: number | null
          total_patients: number | null
          total_revenue: number | null
          updated_at: string | null
        }
        Insert: {
          active_patients?: number | null
          cancelled_appointments?: number | null
          completed_appointments?: number | null
          created_at?: string | null
          id?: string
          inactive_patients?: number | null
          metric_date: string
          new_patients?: number | null
          no_show_appointments?: number | null
          organization_id?: string | null
          packages_sold?: number | null
          paid_amount?: number | null
          pending_amount?: number | null
          sessions_available?: number | null
          sessions_used?: number | null
          total_appointments?: number | null
          total_patients?: number | null
          total_revenue?: number | null
          updated_at?: string | null
        }
        Update: {
          active_patients?: number | null
          cancelled_appointments?: number | null
          completed_appointments?: number | null
          created_at?: string | null
          id?: string
          inactive_patients?: number | null
          metric_date?: string
          new_patients?: number | null
          no_show_appointments?: number | null
          organization_id?: string | null
          packages_sold?: number | null
          paid_amount?: number | null
          pending_amount?: number | null
          sessions_available?: number | null
          sessions_used?: number | null
          total_appointments?: number | null
          total_patients?: number | null
          total_revenue?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_metrics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_quests: {
        Row: {
          completed_count: number | null
          created_at: string | null
          date: string | null
          id: string
          patient_id: string
          quests_data: Json
          updated_at: string | null
        }
        Insert: {
          completed_count?: number | null
          created_at?: string | null
          date?: string | null
          id?: string
          patient_id: string
          quests_data?: Json
          updated_at?: string | null
        }
        Update: {
          completed_count?: number | null
          created_at?: string | null
          date?: string | null
          id?: string
          patient_id?: string
          quests_data?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_quests_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_quests_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_quests_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      data_anonymization_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          executed_at: string | null
          id: string
          reason: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          executed_at?: string | null
          id?: string
          reason?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          executed_at?: string | null
          id?: string
          reason?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      data_export_requests: {
        Row: {
          completed_at: string | null
          created_at: string | null
          data_package_url: string | null
          error_message: string | null
          expires_at: string | null
          id: string
          request_type: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          data_package_url?: string | null
          error_message?: string | null
          expires_at?: string | null
          id?: string
          request_type: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          data_package_url?: string | null
          error_message?: string | null
          expires_at?: string | null
          id?: string
          request_type?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      database_backups: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          file_name: string
          file_path: string
          id: string
          size_bytes: number
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          file_name: string
          file_path: string
          id?: string
          size_bytes: number
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          file_name?: string
          file_path?: string
          id?: string
          size_bytes?: number
          status?: string
        }
        Relationships: []
      }
      document_signatures: {
        Row: {
          created_at: string
          document_id: string
          document_title: string
          document_type: string
          id: string
          ip_address: unknown
          organization_id: string | null
          signature_hash: string
          signature_image: string
          signed_at: string
          signer_id: string | null
          signer_name: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          document_id: string
          document_title: string
          document_type: string
          id?: string
          ip_address?: unknown
          organization_id?: string | null
          signature_hash: string
          signature_image: string
          signed_at?: string
          signer_id?: string | null
          signer_name: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          document_id?: string
          document_title?: string
          document_type?: string
          id?: string
          ip_address?: unknown
          organization_id?: string | null
          signature_hash?: string
          signature_image?: string
          signed_at?: string
          signer_id?: string | null
          signer_name?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_signatures_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_config: {
        Row: {
          api_key: string
          created_at: string | null
          from_email: string
          from_name: string
          id: string
          provider: string
          reply_to: string | null
          updated_at: string | null
        }
        Insert: {
          api_key: string
          created_at?: string | null
          from_email: string
          from_name: string
          id?: string
          provider: string
          reply_to?: string | null
          updated_at?: string | null
        }
        Update: {
          api_key?: string
          created_at?: string | null
          from_email?: string
          from_name?: string
          id?: string
          provider?: string
          reply_to?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      email_notifications: {
        Row: {
          content: string
          created_at: string | null
          error_message: string | null
          id: string
          patient_id: string | null
          recipient_email: string
          recipient_name: string
          scheduled_for: string | null
          sent_at: string | null
          status: string | null
          subject: string
          template_id: string | null
          updated_at: string | null
          variables: Json | null
        }
        Insert: {
          content: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          patient_id?: string | null
          recipient_email: string
          recipient_name: string
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string | null
          subject: string
          template_id?: string | null
          updated_at?: string | null
          variables?: Json | null
        }
        Update: {
          content?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          patient_id?: string | null
          recipient_email?: string
          recipient_name?: string
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string
          template_id?: string | null
          updated_at?: string | null
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "email_notifications_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_notifications_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_notifications_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_notifications_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_queue: {
        Row: {
          attempts: number | null
          created_at: string | null
          id: string
          max_attempts: number | null
          next_attempt: string | null
          notification_id: string | null
          priority: number | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          id?: string
          max_attempts?: number | null
          next_attempt?: string | null
          notification_id?: string | null
          priority?: number | null
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          id?: string
          max_attempts?: number | null
          next_attempt?: string | null
          notification_id?: string | null
          priority?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "email_queue_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "email_notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          created_at: string | null
          html_content: string
          id: string
          name: string
          subject: string
          text_content: string | null
          type: string
          updated_at: string | null
          variables: string[] | null
        }
        Insert: {
          created_at?: string | null
          html_content: string
          id?: string
          name: string
          subject: string
          text_content?: string | null
          type: string
          updated_at?: string | null
          variables?: string[] | null
        }
        Update: {
          created_at?: string | null
          html_content?: string
          id?: string
          name?: string
          subject?: string
          text_content?: string | null
          type?: string
          updated_at?: string | null
          variables?: string[] | null
        }
        Relationships: []
      }
      empresas_parceiras: {
        Row: {
          ativo: boolean
          contato: string | null
          contrapartidas: string | null
          created_at: string
          email: string | null
          id: string
          nome: string
          observacoes: string | null
          organization_id: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          contato?: string | null
          contrapartidas?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          organization_id?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          contato?: string | null
          contrapartidas?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          organization_id?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "empresas_parceiras_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      estagiario_paciente_atribuicao: {
        Row: {
          ativo: boolean
          created_at: string
          data_atribuicao: string
          data_expiracao: string | null
          estagiario_user_id: string
          id: string
          observacoes: string | null
          patient_id: string
          supervisor_id: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          data_atribuicao?: string
          data_expiracao?: string | null
          estagiario_user_id: string
          id?: string
          observacoes?: string | null
          patient_id: string
          supervisor_id?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          data_atribuicao?: string
          data_expiracao?: string | null
          estagiario_user_id?: string
          id?: string
          observacoes?: string | null
          patient_id?: string
          supervisor_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estagiario_paciente_atribuicao_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estagiario_paciente_atribuicao_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estagiario_paciente_atribuicao_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estagiario_paciente_atribuicao_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estagiario_paciente_atribuicao_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estagiario_paciente_atribuicao_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "therapist_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_form_fields: {
        Row: {
          created_at: string
          form_id: string
          grupo: string | null
          id: string
          label: string
          obrigatorio: boolean
          opcoes: Json | null
          ordem: number
          placeholder: string | null
          tipo_campo: string
        }
        Insert: {
          created_at?: string
          form_id: string
          grupo?: string | null
          id?: string
          label: string
          obrigatorio?: boolean
          opcoes?: Json | null
          ordem?: number
          placeholder?: string | null
          tipo_campo?: string
        }
        Update: {
          created_at?: string
          form_id?: string
          grupo?: string | null
          id?: string
          label?: string
          obrigatorio?: boolean
          opcoes?: Json | null
          ordem?: number
          placeholder?: string | null
          tipo_campo?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_form_fields_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "evaluation_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_forms: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          nome: string
          organization_id: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome: string
          organization_id?: string | null
          tipo?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          organization_id?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_forms_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_templates: {
        Row: {
          category: string | null
          content: Json
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          specialty: string | null
          title: string
        }
        Insert: {
          category?: string | null
          content?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          specialty?: string | null
          title: string
        }
        Update: {
          category?: string | null
          content?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          specialty?: string | null
          title?: string
        }
        Relationships: []
      }
      evento_templates: {
        Row: {
          categoria: string
          checklist_padrao: Json | null
          created_at: string
          descricao: string | null
          gratuito: boolean
          id: string
          nome: string
          updated_at: string
          valor_padrao_prestador: number
        }
        Insert: {
          categoria: string
          checklist_padrao?: Json | null
          created_at?: string
          descricao?: string | null
          gratuito?: boolean
          id?: string
          nome: string
          updated_at?: string
          valor_padrao_prestador?: number
        }
        Update: {
          categoria?: string
          checklist_padrao?: Json | null
          created_at?: string
          descricao?: string | null
          gratuito?: boolean
          id?: string
          nome?: string
          updated_at?: string
          valor_padrao_prestador?: number
        }
        Relationships: []
      }
      eventos: {
        Row: {
          categoria: string
          created_at: string
          data_fim: string
          data_inicio: string
          descricao: string | null
          gratuito: boolean
          id: string
          link_whatsapp: string | null
          local: string
          nome: string
          organization_id: string | null
          parceiro_id: string | null
          status: string
          updated_at: string
          valor_padrao_prestador: number
        }
        Insert: {
          categoria: string
          created_at?: string
          data_fim: string
          data_inicio: string
          descricao?: string | null
          gratuito?: boolean
          id?: string
          link_whatsapp?: string | null
          local: string
          nome: string
          organization_id?: string | null
          parceiro_id?: string | null
          status?: string
          updated_at?: string
          valor_padrao_prestador?: number
        }
        Update: {
          categoria?: string
          created_at?: string
          data_fim?: string
          data_inicio?: string
          descricao?: string | null
          gratuito?: boolean
          id?: string
          link_whatsapp?: string | null
          local?: string
          nome?: string
          organization_id?: string | null
          parceiro_id?: string | null
          status?: string
          updated_at?: string
          valor_padrao_prestador?: number
        }
        Relationships: [
          {
            foreignKeyName: "eventos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_parceiro_id_fkey"
            columns: ["parceiro_id"]
            isOneToOne: false
            referencedRelation: "empresas_parceiras"
            referencedColumns: ["id"]
          },
        ]
      }
      evolution_measurements: {
        Row: {
          created_at: string
          created_by: string
          id: string
          measured_at: string
          measurement_name: string
          measurement_type: string
          notes: string | null
          patient_id: string
          soap_record_id: string | null
          unit: string | null
          value: number
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          measured_at?: string
          measurement_name: string
          measurement_type: string
          notes?: string | null
          patient_id: string
          soap_record_id?: string | null
          unit?: string | null
          value: number
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          measured_at?: string
          measurement_name?: string
          measurement_type?: string
          notes?: string | null
          patient_id?: string
          soap_record_id?: string | null
          unit?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "evolution_measurements_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evolution_measurements_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evolution_measurements_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evolution_measurements_soap_record_id_fkey"
            columns: ["soap_record_id"]
            isOneToOne: false
            referencedRelation: "soap_records"
            referencedColumns: ["id"]
          },
        ]
      }
      evolution_templates: {
        Row: {
          ativo: boolean
          campos_padrao: Json | null
          conteudo: string
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          nome: string
          organization_id: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          campos_padrao?: Json | null
          conteudo: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome: string
          organization_id?: string | null
          tipo?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          campos_padrao?: Json | null
          conteudo?: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          organization_id?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evolution_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_categories: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_favorites: {
        Row: {
          created_at: string | null
          exercise_id: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          exercise_id?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          exercise_id?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_favorites_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_logs: {
        Row: {
          completed_at: string | null
          difficulty_rating: string | null
          id: string
          notes: string | null
          patient_id: string
          prescribed_exercise_id: string
        }
        Insert: {
          completed_at?: string | null
          difficulty_rating?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          prescribed_exercise_id: string
        }
        Update: {
          completed_at?: string | null
          difficulty_rating?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          prescribed_exercise_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_logs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_logs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_logs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "therapist_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_logs_prescribed_exercise_id_fkey"
            columns: ["prescribed_exercise_id"]
            isOneToOne: false
            referencedRelation: "prescribed_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_plan_items: {
        Row: {
          created_at: string | null
          duration: number | null
          exercise_id: string
          id: string
          notes: string | null
          order_index: number | null
          plan_id: string
          repetitions: number | null
          sets: number | null
        }
        Insert: {
          created_at?: string | null
          duration?: number | null
          exercise_id: string
          id?: string
          notes?: string | null
          order_index?: number | null
          plan_id: string
          repetitions?: number | null
          sets?: number | null
        }
        Update: {
          created_at?: string | null
          duration?: number | null
          exercise_id?: string
          id?: string
          notes?: string | null
          order_index?: number | null
          plan_id?: string
          repetitions?: number | null
          sets?: number | null
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
            foreignKeyName: "exercise_plan_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "exercise_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_plans: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          end_date: string | null
          id: string
          name: string
          patient_id: string
          start_date: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          patient_id: string
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          patient_id?: string
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "therapist_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_plans_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_plans_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
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
      exercise_prescriptions: {
        Row: {
          completed_exercises: Json | null
          created_at: string
          exercises: Json
          id: string
          last_viewed_at: string | null
          notes: string | null
          organization_id: string | null
          patient_id: string
          qr_code: string
          status: string | null
          therapist_id: string | null
          title: string
          updated_at: string
          valid_until: string | null
          validity_days: number | null
          view_count: number | null
        }
        Insert: {
          completed_exercises?: Json | null
          created_at?: string
          exercises?: Json
          id?: string
          last_viewed_at?: string | null
          notes?: string | null
          organization_id?: string | null
          patient_id: string
          qr_code?: string
          status?: string | null
          therapist_id?: string | null
          title?: string
          updated_at?: string
          valid_until?: string | null
          validity_days?: number | null
          view_count?: number | null
        }
        Update: {
          completed_exercises?: Json | null
          created_at?: string
          exercises?: Json
          id?: string
          last_viewed_at?: string | null
          notes?: string | null
          organization_id?: string | null
          patient_id?: string
          qr_code?: string
          status?: string | null
          therapist_id?: string | null
          title?: string
          updated_at?: string
          valid_until?: string | null
          validity_days?: number | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_prescriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_prescriptions_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_prescriptions_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_prescriptions_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapist_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_protocols: {
        Row: {
          condition_name: string
          created_at: string
          created_by: string | null
          embedding: string | null
          id: string
          milestones: Json
          name: string
          organization_id: string | null
          progression_criteria: Json
          protocol_type: string
          restrictions: Json
          updated_at: string
          weeks_total: number | null
        }
        Insert: {
          condition_name: string
          created_at?: string
          created_by?: string | null
          embedding?: string | null
          id?: string
          milestones?: Json
          name: string
          organization_id?: string | null
          progression_criteria?: Json
          protocol_type: string
          restrictions?: Json
          updated_at?: string
          weeks_total?: number | null
        }
        Update: {
          condition_name?: string
          created_at?: string
          created_by?: string | null
          embedding?: string | null
          id?: string
          milestones?: Json
          name?: string
          organization_id?: string | null
          progression_criteria?: Json
          protocol_type?: string
          restrictions?: Json
          updated_at?: string
          weeks_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_protocols_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_template_items: {
        Row: {
          created_at: string
          duration: number | null
          exercise_id: string
          id: string
          notes: string | null
          order_index: number
          repetitions: number | null
          sets: number | null
          template_id: string
          week_end: number | null
          week_start: number | null
        }
        Insert: {
          created_at?: string
          duration?: number | null
          exercise_id: string
          id?: string
          notes?: string | null
          order_index?: number
          repetitions?: number | null
          sets?: number | null
          template_id: string
          week_end?: number | null
          week_start?: number | null
        }
        Update: {
          created_at?: string
          duration?: number | null
          exercise_id?: string
          id?: string
          notes?: string | null
          order_index?: number
          repetitions?: number | null
          sets?: number | null
          template_id?: string
          week_end?: number | null
          week_start?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_template_items_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "exercise_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_templates: {
        Row: {
          category: string
          condition_name: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          organization_id: string | null
          template_variant: string | null
          updated_at: string
        }
        Insert: {
          category: string
          condition_name: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          organization_id?: string | null
          template_variant?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          condition_name?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          organization_id?: string | null
          template_variant?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          body_parts: string[] | null
          category: string | null
          contraindicated_pathologies: string[] | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          difficulty: string | null
          duration: number | null
          embedding: string | null
          equipment: string[] | null
          id: string
          image_url: string | null
          indicated_pathologies: string[] | null
          instructions: string | null
          is_active: boolean | null
          name: string
          organization_id: string | null
          repetitions: number | null
          sets: number | null
          thumbnail_url: string | null
          updated_at: string | null
          video_duration: number | null
          video_url: string | null
          youtube_url: string | null
        }
        Insert: {
          body_parts?: string[] | null
          category?: string | null
          contraindicated_pathologies?: string[] | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          difficulty?: string | null
          duration?: number | null
          embedding?: string | null
          equipment?: string[] | null
          id?: string
          image_url?: string | null
          indicated_pathologies?: string[] | null
          instructions?: string | null
          is_active?: boolean | null
          name: string
          organization_id?: string | null
          repetitions?: number | null
          sets?: number | null
          thumbnail_url?: string | null
          updated_at?: string | null
          video_duration?: number | null
          video_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          body_parts?: string[] | null
          category?: string | null
          contraindicated_pathologies?: string[] | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          difficulty?: string | null
          duration?: number | null
          embedding?: string | null
          equipment?: string[] | null
          id?: string
          image_url?: string | null
          indicated_pathologies?: string[] | null
          instructions?: string | null
          is_active?: boolean | null
          name?: string
          organization_id?: string | null
          repetitions?: number | null
          sets?: number | null
          thumbnail_url?: string | null
          updated_at?: string | null
          video_duration?: number | null
          video_url?: string | null
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercises_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      feriados: {
        Row: {
          bloqueia_agenda: boolean
          created_at: string
          data: string
          id: string
          nome: string
          organization_id: string | null
          recorrente: boolean
          tipo: string
          updated_at: string
        }
        Insert: {
          bloqueia_agenda?: boolean
          created_at?: string
          data: string
          id?: string
          nome: string
          organization_id?: string | null
          recorrente?: boolean
          tipo?: string
          updated_at?: string
        }
        Update: {
          bloqueia_agenda?: boolean
          created_at?: string
          data?: string
          id?: string
          nome?: string
          organization_id?: string | null
          recorrente?: boolean
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feriados_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      formas_pagamento: {
        Row: {
          ativo: boolean
          created_at: string
          dias_recebimento: number | null
          id: string
          nome: string
          organization_id: string | null
          taxa_percentual: number | null
          tipo: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          dias_recebimento?: number | null
          id?: string
          nome: string
          organization_id?: string | null
          taxa_percentual?: number | null
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          dias_recebimento?: number | null
          id?: string
          nome?: string
          organization_id?: string | null
          taxa_percentual?: number | null
          tipo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "formas_pagamento_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          ativo: boolean
          categoria: string | null
          celular: string | null
          cep: string | null
          cidade: string | null
          cpf_cnpj: string | null
          created_at: string
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          inscricao_estadual: string | null
          nome_fantasia: string | null
          observacoes: string | null
          organization_id: string | null
          razao_social: string
          telefone: string | null
          tipo_pessoa: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          celular?: string | null
          cep?: string | null
          cidade?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          inscricao_estadual?: string | null
          nome_fantasia?: string | null
          observacoes?: string | null
          organization_id?: string | null
          razao_social: string
          telefone?: string | null
          tipo_pessoa?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          celular?: string | null
          cep?: string | null
          cidade?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          inscricao_estadual?: string | null
          nome_fantasia?: string | null
          observacoes?: string | null
          organization_id?: string | null
          razao_social?: string
          telefone?: string | null
          tipo_pessoa?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fornecedores_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      gamification_rewards: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          level_required: number | null
          name: string
          type: string
          xp_required: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          level_required?: number | null
          name: string
          type: string
          xp_required?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          level_required?: number | null
          name?: string
          type?: string
          xp_required?: number | null
        }
        Relationships: []
      }
      generated_reports: {
        Row: {
          content: string
          created_at: string
          date_range_end: string | null
          date_range_start: string | null
          generated_by: string | null
          id: string
          patient_id: string
          report_type: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          date_range_end?: string | null
          date_range_start?: string | null
          generated_by?: string | null
          id?: string
          patient_id: string
          report_type: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          date_range_end?: string | null
          date_range_start?: string | null
          generated_by?: string | null
          id?: string
          patient_id?: string
          report_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_reports_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_reports_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_reports_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_audit_logs: {
        Row: {
          action: Database["public"]["Enums"]["goal_audit_action"]
          actor_user_id: string | null
          after_state: Json | null
          before_state: Json | null
          created_at: string | null
          entity: string
          entity_id: string
          id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["goal_audit_action"]
          actor_user_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string | null
          entity: string
          entity_id: string
          id?: string
        }
        Update: {
          action?: Database["public"]["Enums"]["goal_audit_action"]
          actor_user_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string | null
          entity?: string
          entity_id?: string
          id?: string
        }
        Relationships: []
      }
      goal_profiles: {
        Row: {
          applicable_tests: string[] | null
          created_at: string | null
          description: string
          evidence: Json | null
          id: string
          name: string
          published_at: string | null
          published_by_user_id: string | null
          quality_gate: Json | null
          status: Database["public"]["Enums"]["goal_profile_status"] | null
          tags: string[] | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          applicable_tests?: string[] | null
          created_at?: string | null
          description: string
          evidence?: Json | null
          id: string
          name: string
          published_at?: string | null
          published_by_user_id?: string | null
          quality_gate?: Json | null
          status?: Database["public"]["Enums"]["goal_profile_status"] | null
          tags?: string[] | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          applicable_tests?: string[] | null
          created_at?: string | null
          description?: string
          evidence?: Json | null
          id?: string
          name?: string
          published_at?: string | null
          published_by_user_id?: string | null
          quality_gate?: Json | null
          status?: Database["public"]["Enums"]["goal_profile_status"] | null
          tags?: string[] | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
      }
      goal_targets: {
        Row: {
          created_at: string | null
          id: string
          is_enabled: boolean | null
          is_optional: boolean | null
          key: string
          label_override: string | null
          max: number | null
          min: number | null
          min_delta_abs: number | null
          min_delta_pct: number | null
          mode: string
          notes: string | null
          profile_id: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          is_optional?: boolean | null
          key: string
          label_override?: string | null
          max?: number | null
          min?: number | null
          min_delta_abs?: number | null
          min_delta_pct?: number | null
          mode: string
          notes?: string | null
          profile_id: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          is_optional?: boolean | null
          key?: string
          label_override?: string | null
          max?: number | null
          min?: number | null
          min_delta_abs?: number | null
          min_delta_pct?: number | null
          mode?: string
          notes?: string | null
          profile_id?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goal_targets_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "goal_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          achieved_at: string | null
          created_at: string
          description: string
          id: string
          medical_record_id: string
          notes: string | null
          priority: number | null
          status: Database["public"]["Enums"]["goal_status"] | null
          target_date: string | null
        }
        Insert: {
          achieved_at?: string | null
          created_at?: string
          description: string
          id?: string
          medical_record_id: string
          notes?: string | null
          priority?: number | null
          status?: Database["public"]["Enums"]["goal_status"] | null
          target_date?: string | null
        }
        Update: {
          achieved_at?: string | null
          created_at?: string
          description?: string
          id?: string
          medical_record_id?: string
          notes?: string | null
          priority?: number | null
          status?: Database["public"]["Enums"]["goal_status"] | null
          target_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goals_medical_record_id_fkey"
            columns: ["medical_record_id"]
            isOneToOne: false
            referencedRelation: "medical_records"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          inventory_id: string | null
          movement_type: string
          quantity: number
          reason: string | null
          related_appointment_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          inventory_id?: string | null
          movement_type: string
          quantity: number
          reason?: string | null
          related_appointment_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          inventory_id?: string | null
          movement_type?: string
          quantity?: number
          reason?: string | null
          related_appointment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "clinic_inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base: {
        Row: {
          author_id: string | null
          confidence_score: number | null
          content: string
          created_at: string | null
          id: string
          tags: string[] | null
          title: string
          type: string
          updated_at: string | null
          usage_count: number | null
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          author_id?: string | null
          confidence_score?: number | null
          content: string
          created_at?: string | null
          id?: string
          tags?: string[] | null
          title: string
          type: string
          updated_at?: string | null
          usage_count?: number | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          author_id?: string | null
          confidence_score?: number | null
          content?: string
          created_at?: string | null
          id?: string
          tags?: string[] | null
          title?: string
          type?: string
          updated_at?: string | null
          usage_count?: number | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_base_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_base_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "therapist_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_base_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_base_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_base_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "therapist_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_historico: {
        Row: {
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          lead_id: string
          proximo_contato: string | null
          resultado: string | null
          tipo_contato: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          lead_id: string
          proximo_contato?: string | null
          resultado?: string | null
          tipo_contato: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          lead_id?: string
          proximo_contato?: string | null
          resultado?: string | null
          tipo_contato?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_historico_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          convertido_patient_id: string | null
          created_at: string
          created_by: string | null
          data_primeiro_contato: string | null
          data_proxima_acao: string | null
          data_ultimo_contato: string | null
          email: string | null
          estagio: string | null
          id: string
          interesse: string | null
          motivo_nao_efetivacao: string | null
          nome: string
          observacoes: string | null
          organization_id: string | null
          origem: string | null
          proxima_acao: string | null
          responsavel_id: string | null
          score: number | null
          tags: string[] | null
          telefone: string | null
          temperatura: string | null
          updated_at: string
          valor_potencial: number | null
        }
        Insert: {
          convertido_patient_id?: string | null
          created_at?: string
          created_by?: string | null
          data_primeiro_contato?: string | null
          data_proxima_acao?: string | null
          data_ultimo_contato?: string | null
          email?: string | null
          estagio?: string | null
          id?: string
          interesse?: string | null
          motivo_nao_efetivacao?: string | null
          nome: string
          observacoes?: string | null
          organization_id?: string | null
          origem?: string | null
          proxima_acao?: string | null
          responsavel_id?: string | null
          score?: number | null
          tags?: string[] | null
          telefone?: string | null
          temperatura?: string | null
          updated_at?: string
          valor_potencial?: number | null
        }
        Update: {
          convertido_patient_id?: string | null
          created_at?: string
          created_by?: string | null
          data_primeiro_contato?: string | null
          data_proxima_acao?: string | null
          data_ultimo_contato?: string | null
          email?: string | null
          estagio?: string | null
          id?: string
          interesse?: string | null
          motivo_nao_efetivacao?: string | null
          nome?: string
          observacoes?: string | null
          organization_id?: string | null
          origem?: string | null
          proxima_acao?: string | null
          responsavel_id?: string | null
          score?: number | null
          tags?: string[] | null
          telefone?: string | null
          temperatura?: string | null
          updated_at?: string
          valor_potencial?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_convertido_patient_id_fkey"
            columns: ["convertido_patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_convertido_patient_id_fkey"
            columns: ["convertido_patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_convertido_patient_id_fkey"
            columns: ["convertido_patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "therapist_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      lgpd_consents: {
        Row: {
          consent_type: string
          created_at: string | null
          granted: boolean
          granted_at: string | null
          id: string
          ip_address: unknown
          revoked_at: string | null
          updated_at: string | null
          user_agent: string | null
          user_id: string
          version: string
        }
        Insert: {
          consent_type: string
          created_at?: string | null
          granted?: boolean
          granted_at?: string | null
          id?: string
          ip_address?: unknown
          revoked_at?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id: string
          version?: string
        }
        Update: {
          consent_type?: string
          created_at?: string | null
          granted?: boolean
          granted_at?: string | null
          id?: string
          ip_address?: unknown
          revoked_at?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string
          version?: string
        }
        Relationships: []
      }
      login_attempts: {
        Row: {
          created_at: string
          email: string
          id: string
          ip_address: unknown
          success: boolean
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          ip_address?: unknown
          success: boolean
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          ip_address?: unknown
          success?: boolean
          user_agent?: string | null
        }
        Relationships: []
      }
      medical_records: {
        Row: {
          allergies: Json | null
          chief_complaint: string | null
          coffito_code: string | null
          created_at: string | null
          created_by: string
          current_history: string | null
          diagnosis: string | null
          embedding: string | null
          family_history: string | null
          functional_assessment: Json | null
          icd10_codes: Json | null
          id: string
          lifestyle: Json | null
          medical_history: string | null
          medications: Json | null
          organization_id: string | null
          patient_id: string
          physical_exam: Json | null
          previous_surgeries: string | null
          record_date: string | null
          record_type: string | null
          review_status: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          session_number: number | null
          therapist_id: string | null
          title: string | null
          treatment_plan: Json | null
          updated_at: string | null
          vital_signs: Json | null
        }
        Insert: {
          allergies?: Json | null
          chief_complaint?: string | null
          coffito_code?: string | null
          created_at?: string | null
          created_by: string
          current_history?: string | null
          diagnosis?: string | null
          embedding?: string | null
          family_history?: string | null
          functional_assessment?: Json | null
          icd10_codes?: Json | null
          id?: string
          lifestyle?: Json | null
          medical_history?: string | null
          medications?: Json | null
          organization_id?: string | null
          patient_id: string
          physical_exam?: Json | null
          previous_surgeries?: string | null
          record_date?: string | null
          record_type?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          session_number?: number | null
          therapist_id?: string | null
          title?: string | null
          treatment_plan?: Json | null
          updated_at?: string | null
          vital_signs?: Json | null
        }
        Update: {
          allergies?: Json | null
          chief_complaint?: string | null
          coffito_code?: string | null
          created_at?: string | null
          created_by?: string
          current_history?: string | null
          diagnosis?: string | null
          embedding?: string | null
          family_history?: string | null
          functional_assessment?: Json | null
          icd10_codes?: Json | null
          id?: string
          lifestyle?: Json | null
          medical_history?: string | null
          medications?: Json | null
          organization_id?: string | null
          patient_id?: string
          physical_exam?: Json | null
          previous_surgeries?: string | null
          record_date?: string | null
          record_type?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          session_number?: number | null
          therapist_id?: string | null
          title?: string | null
          treatment_plan?: Json | null
          updated_at?: string | null
          vital_signs?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "therapist_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
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
          {
            foreignKeyName: "medical_records_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_records_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapist_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_request_files: {
        Row: {
          created_at: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          medical_request_id: string
          organization_id: string | null
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          medical_request_id: string
          organization_id?: string | null
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          medical_request_id?: string
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_request_files_medical_request_id_fkey"
            columns: ["medical_request_id"]
            isOneToOne: false
            referencedRelation: "medical_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_request_files_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_requests: {
        Row: {
          created_at: string | null
          doctor_name: string | null
          id: string
          notes: string | null
          organization_id: string | null
          patient_id: string
          request_date: string | null
        }
        Insert: {
          created_at?: string | null
          doctor_name?: string | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          patient_id: string
          request_date?: string | null
        }
        Update: {
          created_at?: string | null
          doctor_name?: string | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          patient_id?: string
          request_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_requests_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_requests_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_requests_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          message: string
          name: string
          organization_id: string | null
          updated_at: string | null
          variables: string[] | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          message: string
          name: string
          organization_id?: string | null
          updated_at?: string | null
          variables?: string[] | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          message?: string
          name?: string
          organization_id?: string | null
          updated_at?: string | null
          variables?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "therapist_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      mfa_otp_codes: {
        Row: {
          code: string
          created_at: string | null
          expires_at: string
          id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string | null
          expires_at: string
          id?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mfa_settings: {
        Row: {
          backup_codes: string[] | null
          created_at: string | null
          id: string
          last_used_at: string | null
          mfa_enabled: boolean
          mfa_method: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          backup_codes?: string[] | null
          created_at?: string | null
          id?: string
          last_used_at?: string | null
          mfa_enabled?: boolean
          mfa_method?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          backup_codes?: string[] | null
          created_at?: string | null
          id?: string
          last_used_at?: string | null
          mfa_enabled?: boolean
          mfa_method?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      movimentacoes_caixa: {
        Row: {
          categoria: string | null
          conta_financeira_id: string | null
          created_at: string
          data: string
          descricao: string
          forma_pagamento: string | null
          id: string
          organization_id: string | null
          tipo: string
          usuario_id: string | null
          valor: number
        }
        Insert: {
          categoria?: string | null
          conta_financeira_id?: string | null
          created_at?: string
          data?: string
          descricao: string
          forma_pagamento?: string | null
          id?: string
          organization_id?: string | null
          tipo: string
          usuario_id?: string | null
          valor: number
        }
        Update: {
          categoria?: string | null
          conta_financeira_id?: string | null
          created_at?: string
          data?: string
          descricao?: string
          forma_pagamento?: string | null
          id?: string
          organization_id?: string | null
          tipo?: string
          usuario_id?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_caixa_conta_financeira_id_fkey"
            columns: ["conta_financeira_id"]
            isOneToOne: false
            referencedRelation: "contas_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_caixa_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_audit_log: {
        Row: {
          action: string
          details: Json | null
          id: string
          ip_address: unknown
          timestamp: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          details?: Json | null
          id?: string
          ip_address?: unknown
          timestamp?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          details?: Json | null
          id?: string
          ip_address?: unknown
          timestamp?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      notification_batch_logs: {
        Row: {
          batch_id: string
          completed_at: string | null
          created_at: string | null
          delivery_time_ms: number
          id: string
          notification_count: number
          priority: string
          successful_deliveries: number
        }
        Insert: {
          batch_id: string
          completed_at?: string | null
          created_at?: string | null
          delivery_time_ms?: number
          id?: string
          notification_count?: number
          priority?: string
          successful_deliveries?: number
        }
        Update: {
          batch_id?: string
          completed_at?: string | null
          created_at?: string | null
          delivery_time_ms?: number
          id?: string
          notification_count?: number
          priority?: string
          successful_deliveries?: number
        }
        Relationships: []
      }
      notification_consent: {
        Row: {
          consent_date: string
          created_at: string | null
          data_processing_consent: boolean
          id: string
          ip_address: unknown
          marketing_consent: boolean
          notifications_enabled: boolean
          updated_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          consent_date: string
          created_at?: string | null
          data_processing_consent?: boolean
          id?: string
          ip_address?: unknown
          marketing_consent?: boolean
          notifications_enabled?: boolean
          updated_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          consent_date?: string
          created_at?: string | null
          data_processing_consent?: boolean
          id?: string
          ip_address?: unknown
          marketing_consent?: boolean
          notifications_enabled?: boolean
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notification_data_retention: {
        Row: {
          created_at: string | null
          id: string
          last_cleanup: string | null
          retention_days: number
          table_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_cleanup?: string | null
          retention_days: number
          table_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_cleanup?: string | null
          retention_days?: number
          table_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      notification_history: {
        Row: {
          body: string
          clicked_at: string | null
          data: Json | null
          delivered_at: string | null
          encrypted_data: boolean | null
          encryption_version: string | null
          error_message: string | null
          id: string
          retry_count: number | null
          sent_at: string | null
          status: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          body: string
          clicked_at?: string | null
          data?: Json | null
          delivered_at?: string | null
          encrypted_data?: boolean | null
          encryption_version?: string | null
          error_message?: string | null
          id?: string
          retry_count?: number | null
          sent_at?: string | null
          status?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          body?: string
          clicked_at?: string | null
          data?: Json | null
          delivered_at?: string | null
          encrypted_data?: boolean | null
          encryption_version?: string | null
          error_message?: string | null
          id?: string
          retry_count?: number | null
          sent_at?: string | null
          status?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      notification_logs: {
        Row: {
          channels: string[] | null
          created_at: string | null
          failed_channels: string[] | null
          id: string
          last_retry_at: string | null
          message: string
          organization_id: string | null
          recipient_email: string | null
          recipient_id: string | null
          recipient_phone: string | null
          results: Json | null
          retry_count: number | null
          success: boolean | null
          title: string
          type: string
        }
        Insert: {
          channels?: string[] | null
          created_at?: string | null
          failed_channels?: string[] | null
          id?: string
          last_retry_at?: string | null
          message: string
          organization_id?: string | null
          recipient_email?: string | null
          recipient_id?: string | null
          recipient_phone?: string | null
          results?: Json | null
          retry_count?: number | null
          success?: boolean | null
          title: string
          type: string
        }
        Update: {
          channels?: string[] | null
          created_at?: string | null
          failed_channels?: string[] | null
          id?: string
          last_retry_at?: string | null
          message?: string
          organization_id?: string | null
          recipient_email?: string | null
          recipient_id?: string | null
          recipient_phone?: string | null
          results?: Json | null
          retry_count?: number | null
          success?: boolean | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_optimization_settings: {
        Row: {
          auto_optimization_enabled: boolean
          batch_window_ms: number
          created_at: string | null
          id: string
          max_batch_size: number
          priority_weights: Json
          quiet_hours_respect: boolean
          updated_at: string | null
          user_timezone_aware: boolean
        }
        Insert: {
          auto_optimization_enabled?: boolean
          batch_window_ms?: number
          created_at?: string | null
          id?: string
          max_batch_size?: number
          priority_weights?: Json
          quiet_hours_respect?: boolean
          updated_at?: string | null
          user_timezone_aware?: boolean
        }
        Update: {
          auto_optimization_enabled?: boolean
          batch_window_ms?: number
          created_at?: string | null
          id?: string
          max_batch_size?: number
          priority_weights?: Json
          quiet_hours_respect?: boolean
          updated_at?: string | null
          user_timezone_aware?: boolean
        }
        Relationships: []
      }
      notification_performance_metrics: {
        Row: {
          batch_efficiency: number
          batch_id: string
          created_at: string | null
          delivery_rate: number
          delivery_time_ms: number
          error_count: number
          error_rate: number
          id: string
          recorded_at: string | null
          successful_deliveries: number
          total_notifications: number
        }
        Insert: {
          batch_efficiency?: number
          batch_id: string
          created_at?: string | null
          delivery_rate?: number
          delivery_time_ms?: number
          error_count?: number
          error_rate?: number
          id?: string
          recorded_at?: string | null
          successful_deliveries?: number
          total_notifications?: number
        }
        Update: {
          batch_efficiency?: number
          batch_id?: string
          created_at?: string | null
          delivery_rate?: number
          delivery_time_ms?: number
          error_count?: number
          error_rate?: number
          id?: string
          recorded_at?: string | null
          successful_deliveries?: number
          total_notifications?: number
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          appointment_reminders: boolean | null
          created_at: string | null
          exercise_reminders: boolean | null
          id: string
          payment_reminders: boolean | null
          progress_updates: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          system_alerts: boolean | null
          therapist_messages: boolean | null
          updated_at: string | null
          user_id: string | null
          weekend_notifications: boolean | null
        }
        Insert: {
          appointment_reminders?: boolean | null
          created_at?: string | null
          exercise_reminders?: boolean | null
          id?: string
          payment_reminders?: boolean | null
          progress_updates?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          system_alerts?: boolean | null
          therapist_messages?: boolean | null
          updated_at?: string | null
          user_id?: string | null
          weekend_notifications?: boolean | null
        }
        Update: {
          appointment_reminders?: boolean | null
          created_at?: string | null
          exercise_reminders?: boolean | null
          id?: string
          payment_reminders?: boolean | null
          progress_updates?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          system_alerts?: boolean | null
          therapist_messages?: boolean | null
          updated_at?: string | null
          user_id?: string | null
          weekend_notifications?: boolean | null
        }
        Relationships: []
      }
      notification_queue: {
        Row: {
          attempts: number | null
          created_at: string | null
          error_message: string | null
          id: string
          max_attempts: number | null
          organization_id: string | null
          payload: Json
          processed_at: string | null
          scheduled_for: string | null
          status: string | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          max_attempts?: number | null
          organization_id?: string | null
          payload: Json
          processed_at?: string | null
          scheduled_for?: string | null
          status?: string | null
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          max_attempts?: number | null
          organization_id?: string | null
          payload?: Json
          processed_at?: string | null
          scheduled_for?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_queue_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_system_health: {
        Row: {
          average_delivery_time: number
          batch_efficiency: number
          click_through_rate: number
          created_at: string | null
          delivery_rate: number
          error_rate: number
          id: string
          processing_batches: number
          queue_size: number
          recorded_at: string | null
          status: string
        }
        Insert: {
          average_delivery_time?: number
          batch_efficiency?: number
          click_through_rate?: number
          created_at?: string | null
          delivery_rate?: number
          error_rate?: number
          id?: string
          processing_batches?: number
          queue_size?: number
          recorded_at?: string | null
          status: string
        }
        Update: {
          average_delivery_time?: number
          batch_efficiency?: number
          click_through_rate?: number
          created_at?: string | null
          delivery_rate?: number
          error_rate?: number
          id?: string
          processing_batches?: number
          queue_size?: number
          recorded_at?: string | null
          status?: string
        }
        Relationships: []
      }
      notification_templates: {
        Row: {
          actions: Json | null
          badge: string | null
          body_template: string
          created_at: string | null
          icon: string | null
          id: string
          require_interaction: boolean | null
          tag: string | null
          title_template: string
          type: string
          updated_at: string | null
        }
        Insert: {
          actions?: Json | null
          badge?: string | null
          body_template: string
          created_at?: string | null
          icon?: string | null
          id?: string
          require_interaction?: boolean | null
          tag?: string | null
          title_template: string
          type: string
          updated_at?: string | null
        }
        Update: {
          actions?: Json | null
          badge?: string | null
          body_template?: string
          created_at?: string | null
          icon?: string | null
          id?: string
          require_interaction?: boolean | null
          tag?: string | null
          title_template?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      notification_triggers: {
        Row: {
          active: boolean | null
          conditions: Json | null
          created_at: string | null
          cron_expression: string | null
          event_type: string
          id: string
          is_recurring: boolean | null
          name: string
          schedule_delay_minutes: number | null
          template_type: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          conditions?: Json | null
          created_at?: string | null
          cron_expression?: string | null
          event_type: string
          id?: string
          is_recurring?: boolean | null
          name: string
          schedule_delay_minutes?: number | null
          template_type?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          conditions?: Json | null
          created_at?: string | null
          cron_expression?: string | null
          event_type?: string
          id?: string
          is_recurring?: boolean | null
          name?: string
          schedule_delay_minutes?: number | null
          template_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_triggers_template_type_fkey"
            columns: ["template_type"]
            isOneToOne: false
            referencedRelation: "notification_templates"
            referencedColumns: ["type"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          metadata: Json | null
          organization_id: string | null
          title: string
          type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          metadata?: Json | null
          organization_id?: string | null
          title: string
          type: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          metadata?: Json | null
          organization_id?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_progress: {
        Row: {
          completed_at: string | null
          completed_steps: Json | null
          created_at: string | null
          current_step: string | null
          first_appointment_created: boolean | null
          first_patient_added: boolean | null
          id: string
          organization_id: string | null
          profile_completed: boolean | null
          skipped_at: string | null
          tour_shown: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          completed_steps?: Json | null
          created_at?: string | null
          current_step?: string | null
          first_appointment_created?: boolean | null
          first_patient_added?: boolean | null
          id?: string
          organization_id?: string | null
          profile_completed?: boolean | null
          skipped_at?: string | null
          tour_shown?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          completed_steps?: Json | null
          created_at?: string | null
          current_step?: string | null
          first_appointment_created?: boolean | null
          first_patient_added?: boolean | null
          id?: string
          organization_id?: string | null
          profile_completed?: boolean | null
          skipped_at?: string | null
          tour_shown?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_progress_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          active: boolean
          created_at: string
          id: string
          joined_at: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          joined_at?: string
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          joined_at?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          settings: Json | null
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          settings?: Json | null
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          settings?: Json | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      package_usage: {
        Row: {
          appointment_id: string | null
          id: string
          organization_id: string | null
          patient_id: string
          patient_package_id: string
          session_id: string | null
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          appointment_id?: string | null
          id?: string
          organization_id?: string | null
          patient_id: string
          patient_package_id: string
          session_id?: string | null
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          appointment_id?: string | null
          id?: string
          organization_id?: string | null
          patient_id?: string
          patient_package_id?: string
          session_id?: string | null
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "package_usage_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_usage_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_usage_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "patient_appointment_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_usage_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "therapist_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_usage_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "today_appointments_with_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_usage_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_usage_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_usage_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_usage_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_usage_patient_package_id_fkey"
            columns: ["patient_package_id"]
            isOneToOne: false
            referencedRelation: "patient_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_usage_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_usage_used_by_fkey"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_usage_used_by_fkey"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_usage_used_by_fkey"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "therapist_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          organization_id: string | null
          price: number
          total_sessions: number
          updated_at: string | null
          validity_days: number | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          organization_id?: string | null
          price: number
          total_sessions: number
          updated_at?: string | null
          validity_days?: number | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          organization_id?: string | null
          price?: number
          total_sessions?: number
          updated_at?: string | null
          validity_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "packages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      pagamentos: {
        Row: {
          comprovante_url: string | null
          created_at: string
          descricao: string
          evento_id: string
          id: string
          pago_em: string
          tipo: string
          updated_at: string
          valor: number
        }
        Insert: {
          comprovante_url?: string | null
          created_at?: string
          descricao: string
          evento_id: string
          id?: string
          pago_em: string
          tipo: string
          updated_at?: string
          valor: number
        }
        Update: {
          comprovante_url?: string | null
          created_at?: string
          descricao?: string
          evento_id?: string
          id?: string
          pago_em?: string
          tipo?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamentos_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos_resumo"
            referencedColumns: ["id"]
          },
        ]
      }
      pain_map_points: {
        Row: {
          created_at: string | null
          id: string
          intensity: number
          notes: string | null
          pain_map_id: string
          pain_type: string
          region: string
          region_code: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          intensity: number
          notes?: string | null
          pain_map_id: string
          pain_type: string
          region: string
          region_code: string
        }
        Update: {
          created_at?: string | null
          id?: string
          intensity?: number
          notes?: string | null
          pain_map_id?: string
          pain_type?: string
          region?: string
          region_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "pain_map_points_pain_map_id_fkey"
            columns: ["pain_map_id"]
            isOneToOne: false
            referencedRelation: "pain_maps"
            referencedColumns: ["id"]
          },
        ]
      }
      pain_maps: {
        Row: {
          appointment_id: string | null
          created_at: string
          created_by: string
          global_pain_level: number
          id: string
          notes: string | null
          organization_id: string | null
          pain_points: Json
          patient_id: string
          recorded_at: string
          session_id: string | null
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          created_by: string
          global_pain_level: number
          id?: string
          notes?: string | null
          organization_id?: string | null
          pain_points?: Json
          patient_id: string
          recorded_at?: string
          session_id?: string | null
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          created_by?: string
          global_pain_level?: number
          id?: string
          notes?: string | null
          organization_id?: string | null
          pain_points?: Json
          patient_id?: string
          recorded_at?: string
          session_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pain_maps_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pain_maps_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pain_maps_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "patient_appointment_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pain_maps_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "therapist_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pain_maps_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "today_appointments_with_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pain_maps_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pain_maps_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pain_maps_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pain_maps_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pain_maps_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "soap_records"
            referencedColumns: ["id"]
          },
        ]
      }
      participantes: {
        Row: {
          contato: string | null
          created_at: string
          evento_id: string
          id: string
          instagram: string | null
          nome: string
          observacoes: string | null
          segue_perfil: boolean
          updated_at: string
        }
        Insert: {
          contato?: string | null
          created_at?: string
          evento_id: string
          id?: string
          instagram?: string | null
          nome: string
          observacoes?: string | null
          segue_perfil?: boolean
          updated_at?: string
        }
        Update: {
          contato?: string | null
          created_at?: string
          evento_id?: string
          id?: string
          instagram?: string | null
          nome?: string
          observacoes?: string | null
          segue_perfil?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "participantes_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participantes_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos_resumo"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_commissions: {
        Row: {
          commission_amount: number
          commission_rate: number | null
          created_at: string
          gross_amount: number
          id: string
          partner_id: string | null
          payment_date: string | null
          platform_fee: number
          status: string
          voucher_purchase_id: string | null
        }
        Insert: {
          commission_amount: number
          commission_rate?: number | null
          created_at?: string
          gross_amount: number
          id?: string
          partner_id?: string | null
          payment_date?: string | null
          platform_fee: number
          status?: string
          voucher_purchase_id?: string | null
        }
        Update: {
          commission_amount?: number
          commission_rate?: number | null
          created_at?: string
          gross_amount?: number
          id?: string
          partner_id?: string | null
          payment_date?: string | null
          platform_fee?: number
          status?: string
          voucher_purchase_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_commissions_voucher_purchase_id_fkey"
            columns: ["voucher_purchase_id"]
            isOneToOne: false
            referencedRelation: "voucher_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_sessions: {
        Row: {
          created_at: string
          duration_minutes: number | null
          id: string
          notes: string | null
          partner_id: string | null
          patient_id: string | null
          photos: Json | null
          physio_notes: string | null
          session_date: string
          session_type: string
          shared_with_physio: boolean | null
          updated_at: string
          voucher_purchase_id: string | null
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          partner_id?: string | null
          patient_id?: string | null
          photos?: Json | null
          physio_notes?: string | null
          session_date: string
          session_type: string
          shared_with_physio?: boolean | null
          updated_at?: string
          voucher_purchase_id?: string | null
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          partner_id?: string | null
          patient_id?: string | null
          photos?: Json | null
          physio_notes?: string | null
          session_date?: string
          session_type?: string
          shared_with_physio?: boolean | null
          updated_at?: string
          voucher_purchase_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_sessions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_sessions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_sessions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_sessions_voucher_purchase_id_fkey"
            columns: ["voucher_purchase_id"]
            isOneToOne: false
            referencedRelation: "voucher_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_withdrawals: {
        Row: {
          amount: number
          id: string
          notes: string | null
          partner_id: string | null
          pix_key: string
          processed_at: string | null
          requested_at: string
          status: string
        }
        Insert: {
          amount: number
          id?: string
          notes?: string | null
          partner_id?: string | null
          pix_key: string
          processed_at?: string | null
          requested_at?: string
          status?: string
        }
        Update: {
          amount?: number
          id?: string
          notes?: string | null
          partner_id?: string | null
          pix_key?: string
          processed_at?: string | null
          requested_at?: string
          status?: string
        }
        Relationships: []
      }
      pathologies: {
        Row: {
          created_at: string
          diagnosed_at: string | null
          icd_code: string | null
          id: string
          medical_record_id: string
          name: string
          notes: string | null
          status: Database["public"]["Enums"]["pathology_status"] | null
          treated_at: string | null
        }
        Insert: {
          created_at?: string
          diagnosed_at?: string | null
          icd_code?: string | null
          id?: string
          medical_record_id: string
          name: string
          notes?: string | null
          status?: Database["public"]["Enums"]["pathology_status"] | null
          treated_at?: string | null
        }
        Update: {
          created_at?: string
          diagnosed_at?: string | null
          icd_code?: string | null
          id?: string
          medical_record_id?: string
          name?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["pathology_status"] | null
          treated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pathologies_medical_record_id_fkey"
            columns: ["medical_record_id"]
            isOneToOne: false
            referencedRelation: "medical_records"
            referencedColumns: ["id"]
          },
        ]
      }
      pathology_required_measurements: {
        Row: {
          alert_level: string
          created_at: string
          id: string
          instructions: string | null
          measurement_name: string
          measurement_unit: string | null
          pathology_name: string
        }
        Insert: {
          alert_level?: string
          created_at?: string
          id?: string
          instructions?: string | null
          measurement_name: string
          measurement_unit?: string | null
          pathology_name: string
        }
        Update: {
          alert_level?: string
          created_at?: string
          id?: string
          instructions?: string | null
          measurement_name?: string
          measurement_unit?: string | null
          pathology_name?: string
        }
        Relationships: []
      }
      patient_achievements: {
        Row: {
          id: string
          notified: boolean | null
          patient_id: string
          reward_id: string | null
          unlocked_at: string | null
        }
        Insert: {
          id?: string
          notified?: boolean | null
          patient_id: string
          reward_id?: string | null
          unlocked_at?: string | null
        }
        Update: {
          id?: string
          notified?: boolean | null
          patient_id?: string
          reward_id?: string | null
          unlocked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_achievements_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "gamification_rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_assessments: {
        Row: {
          appointment_id: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          id: string
          patient_id: string
          status: string | null
          template_id: string | null
          user_id: string | null
        }
        Insert: {
          appointment_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          patient_id: string
          status?: string | null
          template_id?: string | null
          user_id?: string | null
        }
        Update: {
          appointment_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          patient_id?: string
          status?: string | null
          template_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_assessments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_assessments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_assessments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "patient_appointment_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_assessments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "therapist_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_assessments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "today_appointments_with_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_assessments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_assessments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_assessments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_assessments_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "assessment_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_consents: {
        Row: {
          consent_type: string
          created_at: string
          granted: boolean
          granted_at: string | null
          granted_by: string | null
          id: string
          ip_address: unknown
          patient_id: string
          user_agent: string | null
        }
        Insert: {
          consent_type: string
          created_at?: string
          granted?: boolean
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          ip_address?: unknown
          patient_id: string
          user_agent?: string | null
        }
        Update: {
          consent_type?: string
          created_at?: string
          granted?: boolean
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          ip_address?: unknown
          patient_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_consents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_consents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_consents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_documents: {
        Row: {
          category: string
          created_at: string
          description: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          patient_id: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          patient_id: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          patient_id?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_documents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_documents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_documents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_evaluation_responses: {
        Row: {
          created_at: string
          form_id: string
          id: string
          patient_id: string
          preenchido_por: string | null
          respostas: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          form_id: string
          id?: string
          patient_id: string
          preenchido_por?: string | null
          respostas?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          form_id?: string
          id?: string
          patient_id?: string
          preenchido_por?: string | null
          respostas?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_evaluation_responses_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "evaluation_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_evaluation_responses_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_evaluation_responses_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_evaluation_responses_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_exam_files: {
        Row: {
          created_at: string | null
          exam_id: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          organization_id: string | null
        }
        Insert: {
          created_at?: string | null
          exam_id: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          organization_id?: string | null
        }
        Update: {
          created_at?: string | null
          exam_id?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_exam_files_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "patient_exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_exam_files_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_exams: {
        Row: {
          created_at: string | null
          description: string | null
          exam_date: string | null
          exam_type: string | null
          id: string
          organization_id: string | null
          patient_id: string
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          exam_date?: string | null
          exam_type?: string | null
          id?: string
          organization_id?: string | null
          patient_id: string
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          exam_date?: string | null
          exam_type?: string | null
          id?: string
          organization_id?: string | null
          patient_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_exams_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_exams_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_exams_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_exams_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_exercise_logs: {
        Row: {
          created_at: string | null
          difficulty_rating: number | null
          duration_minutes: number | null
          executed_at: string | null
          exercise_id: string | null
          exercise_plan_id: string | null
          id: string
          notes: string | null
          patient_id: string | null
          reps_completed: number | null
          sets_completed: number | null
        }
        Insert: {
          created_at?: string | null
          difficulty_rating?: number | null
          duration_minutes?: number | null
          executed_at?: string | null
          exercise_id?: string | null
          exercise_plan_id?: string | null
          id?: string
          notes?: string | null
          patient_id?: string | null
          reps_completed?: number | null
          sets_completed?: number | null
        }
        Update: {
          created_at?: string | null
          difficulty_rating?: number | null
          duration_minutes?: number | null
          executed_at?: string | null
          exercise_id?: string | null
          exercise_plan_id?: string | null
          id?: string
          notes?: string | null
          patient_id?: string | null
          reps_completed?: number | null
          sets_completed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_exercise_logs_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_exercise_logs_exercise_plan_id_fkey"
            columns: ["exercise_plan_id"]
            isOneToOne: false
            referencedRelation: "exercise_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_exercise_logs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_exercise_logs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_exercise_logs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_exercise_prescriptions: {
        Row: {
          created_at: string | null
          created_by: string | null
          end_date: string | null
          exercise_id: string | null
          exercise_plan_id: string | null
          frequency_per_week: number | null
          id: string
          patient_id: string | null
          reps: number
          rest_time_seconds: number | null
          sets: number
          special_instructions: string | null
          start_date: string | null
          updated_at: string | null
          weight_kg: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          exercise_id?: string | null
          exercise_plan_id?: string | null
          frequency_per_week?: number | null
          id?: string
          patient_id?: string | null
          reps?: number
          rest_time_seconds?: number | null
          sets?: number
          special_instructions?: string | null
          start_date?: string | null
          updated_at?: string | null
          weight_kg?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          exercise_id?: string | null
          exercise_plan_id?: string | null
          frequency_per_week?: number | null
          id?: string
          patient_id?: string | null
          reps?: number
          rest_time_seconds?: number | null
          sets?: number
          special_instructions?: string | null
          start_date?: string | null
          updated_at?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_exercise_prescriptions_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_exercise_prescriptions_exercise_plan_id_fkey"
            columns: ["exercise_plan_id"]
            isOneToOne: false
            referencedRelation: "exercise_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_exercise_prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_exercise_prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_exercise_prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_gamification: {
        Row: {
          achievements: Json | null
          created_at: string | null
          current_streak: number | null
          id: string
          level: number | null
          longest_streak: number | null
          patient_id: string
          total_points: number | null
          updated_at: string | null
          xp: number | null
        }
        Insert: {
          achievements?: Json | null
          created_at?: string | null
          current_streak?: number | null
          id?: string
          level?: number | null
          longest_streak?: number | null
          patient_id: string
          total_points?: number | null
          updated_at?: string | null
          xp?: number | null
        }
        Update: {
          achievements?: Json | null
          created_at?: string | null
          current_streak?: number | null
          id?: string
          level?: number | null
          longest_streak?: number | null
          patient_id?: string
          total_points?: number | null
          updated_at?: string | null
          xp?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_gamification_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: true
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_gamification_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: true
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_gamification_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: true
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_goals: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string
          goal_description: string | null
          goal_title: string
          id: string
          patient_id: string
          status: string
          target_date: string | null
          target_value: string | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by: string
          goal_description?: string | null
          goal_title: string
          id?: string
          patient_id: string
          status?: string
          target_date?: string | null
          target_value?: string | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string
          goal_description?: string | null
          goal_title?: string
          id?: string
          patient_id?: string
          status?: string
          target_date?: string | null
          target_value?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_goals_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_goals_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_goals_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_levels: {
        Row: {
          badges: Json | null
          created_at: string | null
          current_level: number | null
          current_streak: number | null
          id: string
          last_activity_date: string | null
          longest_streak: number | null
          patient_id: string
          title: string | null
          total_xp: number | null
          updated_at: string | null
        }
        Insert: {
          badges?: Json | null
          created_at?: string | null
          current_level?: number | null
          current_streak?: number | null
          id?: string
          last_activity_date?: string | null
          longest_streak?: number | null
          patient_id: string
          title?: string | null
          total_xp?: number | null
          updated_at?: string | null
        }
        Update: {
          badges?: Json | null
          created_at?: string | null
          current_level?: number | null
          current_streak?: number | null
          id?: string
          last_activity_date?: string | null
          longest_streak?: number | null
          patient_id?: string
          title?: string | null
          total_xp?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      patient_objective_assignments: {
        Row: {
          created_at: string
          id: string
          notas: string | null
          objective_id: string
          patient_id: string
          prioridade: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          notas?: string | null
          objective_id: string
          patient_id: string
          prioridade?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          notas?: string | null
          objective_id?: string
          patient_id?: string
          prioridade?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_objective_assignments_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "patient_objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_objective_assignments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_objective_assignments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_objective_assignments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_objectives: {
        Row: {
          ativo: boolean
          categoria: string | null
          created_at: string
          descricao: string | null
          id: string
          nome: string
          organization_id: string | null
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          organization_id?: string | null
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_objectives_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_outcome_predictions: {
        Row: {
          condition: string
          confidence_score: number | null
          created_at: string | null
          factors: Json | null
          id: string
          model_version: string | null
          patient_id: string
          predicted_completion_date: string | null
          predicted_sessions_to_recovery: number | null
          risk_of_dropout: number | null
        }
        Insert: {
          condition: string
          confidence_score?: number | null
          created_at?: string | null
          factors?: Json | null
          id?: string
          model_version?: string | null
          patient_id: string
          predicted_completion_date?: string | null
          predicted_sessions_to_recovery?: number | null
          risk_of_dropout?: number | null
        }
        Update: {
          condition?: string
          confidence_score?: number | null
          created_at?: string | null
          factors?: Json | null
          id?: string
          model_version?: string | null
          patient_id?: string
          predicted_completion_date?: string | null
          predicted_sessions_to_recovery?: number | null
          risk_of_dropout?: number | null
        }
        Relationships: []
      }
      patient_packages: {
        Row: {
          created_at: string | null
          created_by: string | null
          expires_at: string
          id: string
          last_used_at: string | null
          organization_id: string | null
          package_id: string
          patient_id: string
          price_paid: number
          purchased_at: string | null
          sessions_purchased: number
          sessions_used: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          expires_at: string
          id?: string
          last_used_at?: string | null
          organization_id?: string | null
          package_id: string
          patient_id: string
          price_paid: number
          purchased_at?: string | null
          sessions_purchased: number
          sessions_used?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string
          id?: string
          last_used_at?: string | null
          organization_id?: string | null
          package_id?: string
          patient_id?: string
          price_paid?: number
          purchased_at?: string | null
          sessions_purchased?: number
          sessions_used?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_packages_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_packages_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_packages_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "therapist_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_packages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_packages_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "session_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_packages_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_packages_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_packages_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_pain_records: {
        Row: {
          body_part: string
          created_at: string | null
          id: string
          notes: string | null
          pain_level: number
          pain_type: string
          patient_id: string
          updated_at: string | null
        }
        Insert: {
          body_part: string
          created_at?: string | null
          id?: string
          notes?: string | null
          pain_level: number
          pain_type: string
          patient_id: string
          updated_at?: string | null
        }
        Update: {
          body_part?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          pain_level?: number
          pain_type?: string
          patient_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_pain_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_pain_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_pain_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "therapist_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_pathologies: {
        Row: {
          created_at: string
          diagnosis_date: string | null
          id: string
          notes: string | null
          pathology_name: string
          patient_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          diagnosis_date?: string | null
          id?: string
          notes?: string | null
          pathology_name: string
          patient_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          diagnosis_date?: string | null
          id?: string
          notes?: string | null
          pathology_name?: string
          patient_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_pathologies_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_pathologies_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_pathologies_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_precadastro: {
        Row: {
          address: string | null
          allergies: string | null
          birth_date: string | null
          completed_at: string | null
          cpf: string | null
          created_at: string
          current_medications: string | null
          email: string | null
          emergency_contact: string | null
          emergency_relationship: string | null
          expires_at: string
          full_name: string | null
          gender: string | null
          id: string
          insurance_number: string | null
          insurance_plan: string | null
          ip_address: unknown
          main_complaint: string | null
          medical_history: string | null
          organization_id: string
          patient_id: string | null
          phone: string | null
          status: Database["public"]["Enums"]["precadastro_status"]
          token: string
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          address?: string | null
          allergies?: string | null
          birth_date?: string | null
          completed_at?: string | null
          cpf?: string | null
          created_at?: string
          current_medications?: string | null
          email?: string | null
          emergency_contact?: string | null
          emergency_relationship?: string | null
          expires_at: string
          full_name?: string | null
          gender?: string | null
          id?: string
          insurance_number?: string | null
          insurance_plan?: string | null
          ip_address?: unknown
          main_complaint?: string | null
          medical_history?: string | null
          organization_id: string
          patient_id?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["precadastro_status"]
          token: string
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          address?: string | null
          allergies?: string | null
          birth_date?: string | null
          completed_at?: string | null
          cpf?: string | null
          created_at?: string
          current_medications?: string | null
          email?: string | null
          emergency_contact?: string | null
          emergency_relationship?: string | null
          expires_at?: string
          full_name?: string | null
          gender?: string | null
          id?: string
          insurance_number?: string | null
          insurance_plan?: string | null
          ip_address?: unknown
          main_complaint?: string | null
          medical_history?: string | null
          organization_id?: string
          patient_id?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["precadastro_status"]
          token?: string
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_precadastro_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_precadastro_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_precadastro_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_precadastro_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_progress: {
        Row: {
          created_at: string | null
          functional_score: number | null
          id: string
          mobility_score: number | null
          notes: string | null
          pain_level: number | null
          patient_id: string
          progress_date: string | null
          recorded_by: string
          strength_score: number | null
        }
        Insert: {
          created_at?: string | null
          functional_score?: number | null
          id?: string
          mobility_score?: number | null
          notes?: string | null
          pain_level?: number | null
          patient_id: string
          progress_date?: string | null
          recorded_by: string
          strength_score?: number | null
        }
        Update: {
          created_at?: string | null
          functional_score?: number | null
          id?: string
          mobility_score?: number | null
          notes?: string | null
          pain_level?: number | null
          patient_id?: string
          progress_date?: string | null
          recorded_by?: string
          strength_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_progress_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_progress_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_progress_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_progress_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_progress_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_progress_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "therapist_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_scheduling_preferences: {
        Row: {
          auto_book_enabled: boolean | null
          avoided_days: string[] | null
          avoided_times: string[] | null
          created_at: string | null
          id: string
          max_travel_time: number | null
          notification_preferences: Json | null
          patient_id: string
          preferred_days: string[] | null
          preferred_therapist_id: string | null
          preferred_times: string[] | null
          prefers_same_therapist: boolean | null
          updated_at: string | null
        }
        Insert: {
          auto_book_enabled?: boolean | null
          avoided_days?: string[] | null
          avoided_times?: string[] | null
          created_at?: string | null
          id?: string
          max_travel_time?: number | null
          notification_preferences?: Json | null
          patient_id: string
          preferred_days?: string[] | null
          preferred_therapist_id?: string | null
          preferred_times?: string[] | null
          prefers_same_therapist?: boolean | null
          updated_at?: string | null
        }
        Update: {
          auto_book_enabled?: boolean | null
          avoided_days?: string[] | null
          avoided_times?: string[] | null
          created_at?: string | null
          id?: string
          max_travel_time?: number | null
          notification_preferences?: Json | null
          patient_id?: string
          preferred_days?: string[] | null
          preferred_therapist_id?: string | null
          preferred_times?: string[] | null
          prefers_same_therapist?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      patient_self_assessments: {
        Row: {
          assessment_type: string
          created_at: string | null
          id: string
          numeric_value: number | null
          patient_id: string
          question: string
          received_via: string | null
          responded_at: string | null
          response: string | null
          sent_at: string | null
        }
        Insert: {
          assessment_type: string
          created_at?: string | null
          id?: string
          numeric_value?: number | null
          patient_id: string
          question: string
          received_via?: string | null
          responded_at?: string | null
          response?: string | null
          sent_at?: string | null
        }
        Update: {
          assessment_type?: string
          created_at?: string | null
          id?: string
          numeric_value?: number | null
          patient_id?: string
          question?: string
          received_via?: string | null
          responded_at?: string | null
          response?: string | null
          sent_at?: string | null
        }
        Relationships: []
      }
      patient_sessions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          patient_id: string
          payment_id: string
          remaining_sessions: number | null
          total_sessions: number
          updated_at: string
          used_sessions: number
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          patient_id: string
          payment_id: string
          remaining_sessions?: number | null
          total_sessions: number
          updated_at?: string
          used_sessions?: number
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          patient_id?: string
          payment_id?: string
          remaining_sessions?: number | null
          total_sessions?: number
          updated_at?: string
          used_sessions?: number
        }
        Relationships: [
          {
            foreignKeyName: "patient_sessions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_sessions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_sessions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_sessions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_surgeries: {
        Row: {
          affected_side: string | null
          created_at: string
          id: string
          notes: string | null
          patient_id: string
          surgery_date: string
          surgery_name: string
          updated_at: string
        }
        Insert: {
          affected_side?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          patient_id: string
          surgery_date: string
          surgery_name: string
          updated_at?: string
        }
        Update: {
          affected_side?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          patient_id?: string
          surgery_date?: string
          surgery_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_surgeries_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_surgeries_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_surgeries_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_trends: {
        Row: {
          calculated_at: string | null
          compliance_trend: string | null
          created_at: string | null
          functional_trend: string | null
          id: string
          pain_trend: string | null
          patient_id: string
          trend_period_days: number | null
        }
        Insert: {
          calculated_at?: string | null
          compliance_trend?: string | null
          created_at?: string | null
          functional_trend?: string | null
          id?: string
          pain_trend?: string | null
          patient_id: string
          trend_period_days?: number | null
        }
        Update: {
          calculated_at?: string | null
          compliance_trend?: string | null
          created_at?: string | null
          functional_trend?: string | null
          id?: string
          pain_trend?: string | null
          patient_id?: string
          trend_period_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_trends_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_trends_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_trends_patient_id_fkey"
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
          alerts: Json | null
          allergies: string | null
          birth_date: string | null
          blood_type: string | null
          city: string | null
          clinical_history_embedding: string | null
          consent_data: boolean | null
          consent_image: boolean | null
          cpf: string | null
          created_at: string | null
          education_level: string | null
          email: string | null
          emergency_contact: string | null
          emergency_contact_relationship: string | null
          emergency_phone: string | null
          full_name: string
          health_insurance: string | null
          height_cm: number | null
          id: string
          incomplete_registration: boolean | null
          insurance_info: Json | null
          insurance_number: string | null
          insurance_plan: string | null
          insurance_validity: string | null
          marital_status: string | null
          medications: string | null
          observations: string | null
          occupation: string | null
          organization_id: string | null
          phone: string | null
          photo_url: string | null
          profession: string | null
          profile_id: string | null
          referral_source: string | null
          rg: string | null
          state: string | null
          status: string | null
          updated_at: string | null
          weight_kg: number | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          alerts?: Json | null
          allergies?: string | null
          birth_date?: string | null
          blood_type?: string | null
          city?: string | null
          clinical_history_embedding?: string | null
          consent_data?: boolean | null
          consent_image?: boolean | null
          cpf?: string | null
          created_at?: string | null
          education_level?: string | null
          email?: string | null
          emergency_contact?: string | null
          emergency_contact_relationship?: string | null
          emergency_phone?: string | null
          full_name: string
          health_insurance?: string | null
          height_cm?: number | null
          id?: string
          incomplete_registration?: boolean | null
          insurance_info?: Json | null
          insurance_number?: string | null
          insurance_plan?: string | null
          insurance_validity?: string | null
          marital_status?: string | null
          medications?: string | null
          observations?: string | null
          occupation?: string | null
          organization_id?: string | null
          phone?: string | null
          photo_url?: string | null
          profession?: string | null
          profile_id?: string | null
          referral_source?: string | null
          rg?: string | null
          state?: string | null
          status?: string | null
          updated_at?: string | null
          weight_kg?: number | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          alerts?: Json | null
          allergies?: string | null
          birth_date?: string | null
          blood_type?: string | null
          city?: string | null
          clinical_history_embedding?: string | null
          consent_data?: boolean | null
          consent_image?: boolean | null
          cpf?: string | null
          created_at?: string | null
          education_level?: string | null
          email?: string | null
          emergency_contact?: string | null
          emergency_contact_relationship?: string | null
          emergency_phone?: string | null
          full_name?: string
          health_insurance?: string | null
          height_cm?: number | null
          id?: string
          incomplete_registration?: boolean | null
          insurance_info?: Json | null
          insurance_number?: string | null
          insurance_plan?: string | null
          insurance_validity?: string | null
          marital_status?: string | null
          medications?: string | null
          observations?: string | null
          occupation?: string | null
          organization_id?: string | null
          phone?: string | null
          photo_url?: string | null
          profession?: string | null
          profile_id?: string | null
          referral_source?: string | null
          rg?: string | null
          state?: string | null
          status?: string | null
          updated_at?: string | null
          weight_kg?: number | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "therapist_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          appointment_id: string
          created_at: string
          id: string
          method: string | null
          notes: string | null
          paid_at: string
          payment_method: string
          payment_type: string
          receipt_url: string | null
          sessions_count: number | null
        }
        Insert: {
          amount: number
          appointment_id: string
          created_at?: string
          id?: string
          method?: string | null
          notes?: string | null
          paid_at?: string
          payment_method: string
          payment_type: string
          receipt_url?: string | null
          sessions_count?: number | null
        }
        Update: {
          amount?: number
          appointment_id?: string
          created_at?: string
          id?: string
          method?: string | null
          notes?: string | null
          paid_at?: string
          payment_method?: string
          payment_type?: string
          receipt_url?: string | null
          sessions_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "patient_appointment_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "therapist_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "today_appointments_with_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      precadastro_tokens: {
        Row: {
          ativo: boolean | null
          campos_obrigatorios: Json | null
          campos_opcionais: Json | null
          created_at: string | null
          created_by: string | null
          descricao: string | null
          expires_at: string | null
          id: string
          max_usos: number | null
          nome: string | null
          organization_id: string | null
          token: string
          usos_atuais: number | null
          validade_dias: number | null
        }
        Insert: {
          ativo?: boolean | null
          campos_obrigatorios?: Json | null
          campos_opcionais?: Json | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          expires_at?: string | null
          id?: string
          max_usos?: number | null
          nome?: string | null
          organization_id?: string | null
          token?: string
          usos_atuais?: number | null
          validade_dias?: number | null
        }
        Update: {
          ativo?: boolean | null
          campos_obrigatorios?: Json | null
          campos_opcionais?: Json | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          expires_at?: string | null
          id?: string
          max_usos?: number | null
          nome?: string | null
          organization_id?: string | null
          token?: string
          usos_atuais?: number | null
          validade_dias?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "precadastro_tokens_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      precadastros: {
        Row: {
          created_at: string | null
          dados_adicionais: Json | null
          data_nascimento: string | null
          email: string | null
          endereco: string | null
          id: string
          nome: string
          observacoes: string | null
          organization_id: string | null
          patient_id: string | null
          processado_em: string | null
          processado_por: string | null
          status: string | null
          telefone: string | null
          token_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          dados_adicionais?: Json | null
          data_nascimento?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          organization_id?: string | null
          patient_id?: string | null
          processado_em?: string | null
          processado_por?: string | null
          status?: string | null
          telefone?: string | null
          token_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          dados_adicionais?: Json | null
          data_nascimento?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          organization_id?: string | null
          patient_id?: string | null
          processado_em?: string | null
          processado_por?: string | null
          status?: string | null
          telefone?: string | null
          token_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "precadastros_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "precadastros_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "precadastros_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "precadastros_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "precadastros_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "precadastro_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      prescribed_exercises: {
        Row: {
          created_at: string | null
          duration_seconds: number | null
          exercise_id: string
          frequency: string
          id: string
          is_active: boolean | null
          notes: string | null
          patient_id: string
          reps: number
          sets: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          duration_seconds?: number | null
          exercise_id: string
          frequency: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          patient_id: string
          reps?: number
          sets?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          duration_seconds?: number | null
          exercise_id?: string
          frequency?: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          patient_id?: string
          reps?: number
          sets?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescribed_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescribed_exercises_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescribed_exercises_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescribed_exercises_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "therapist_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_items: {
        Row: {
          created_at: string | null
          exercise_id: string
          hold_seconds: number | null
          id: string
          notes: string | null
          order: number | null
          prescription_id: string
          reps: number
          sets: number
        }
        Insert: {
          created_at?: string | null
          exercise_id: string
          hold_seconds?: number | null
          id?: string
          notes?: string | null
          order?: number | null
          prescription_id: string
          reps: number
          sets: number
        }
        Update: {
          created_at?: string | null
          exercise_id?: string
          hold_seconds?: number | null
          id?: string
          notes?: string | null
          order?: number | null
          prescription_id?: string
          reps?: number
          sets?: number
        }
        Relationships: [
          {
            foreignKeyName: "prescription_items_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_items_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          created_at: string | null
          deactivated_at: string | null
          frequency: string
          id: string
          is_active: boolean | null
          organization_id: string | null
          patient_id: string
          therapist_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deactivated_at?: string | null
          frequency: string
          id?: string
          is_active?: boolean | null
          organization_id?: string | null
          patient_id: string
          therapist_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deactivated_at?: string | null
          frequency?: string
          id?: string
          is_active?: boolean | null
          organization_id?: string | null
          patient_id?: string
          therapist_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapist_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      prestadores: {
        Row: {
          contato: string | null
          cpf_cnpj: string | null
          created_at: string
          evento_id: string
          id: string
          nome: string
          status_pagamento: string
          updated_at: string
          valor_acordado: number
        }
        Insert: {
          contato?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          evento_id: string
          id?: string
          nome: string
          status_pagamento?: string
          updated_at?: string
          valor_acordado?: number
        }
        Update: {
          contato?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          evento_id?: string
          id?: string
          nome?: string
          status_pagamento?: string
          updated_at?: string
          valor_acordado?: number
        }
        Relationships: [
          {
            foreignKeyName: "prestadores_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prestadores_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos_resumo"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_chats: {
        Row: {
          attachments: Json | null
          created_at: string
          id: string
          message: string
          partner_id: string | null
          patient_id: string | null
          physio_id: string | null
          sender_id: string
        }
        Insert: {
          attachments?: Json | null
          created_at?: string
          id?: string
          message: string
          partner_id?: string | null
          patient_id?: string | null
          physio_id?: string | null
          sender_id: string
        }
        Update: {
          attachments?: Json | null
          created_at?: string
          id?: string
          message?: string
          partner_id?: string | null
          patient_id?: string | null
          physio_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_chats_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_chats_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_chats_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
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
          created_at: string | null
          email: string | null
          emergency_contact: Json | null
          experience_years: number | null
          full_name: string
          id: string
          is_active: boolean | null
          last_login_at: string | null
          license_expiry: string | null
          mfa_enabled: boolean | null
          mfa_enforced_at: string | null
          mfa_required: boolean | null
          notification_preferences: Json | null
          onboarding_completed: boolean | null
          organization_id: string | null
          partner_bio: string | null
          partner_commission_rate: number | null
          partner_pix_key: string | null
          partner_specialties: string[] | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          specialties: string[] | null
          timezone: string | null
          updated_at: string | null
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
          created_at?: string | null
          email?: string | null
          emergency_contact?: Json | null
          experience_years?: number | null
          full_name: string
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          license_expiry?: string | null
          mfa_enabled?: boolean | null
          mfa_enforced_at?: string | null
          mfa_required?: boolean | null
          notification_preferences?: Json | null
          onboarding_completed?: boolean | null
          organization_id?: string | null
          partner_bio?: string | null
          partner_commission_rate?: number | null
          partner_pix_key?: string | null
          partner_specialties?: string[] | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          specialties?: string[] | null
          timezone?: string | null
          updated_at?: string | null
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
          created_at?: string | null
          email?: string | null
          emergency_contact?: Json | null
          experience_years?: number | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          license_expiry?: string | null
          mfa_enabled?: boolean | null
          mfa_enforced_at?: string | null
          mfa_required?: boolean | null
          notification_preferences?: Json | null
          onboarding_completed?: boolean | null
          organization_id?: string | null
          partner_bio?: string | null
          partner_commission_rate?: number | null
          partner_pix_key?: string | null
          partner_specialties?: string[] | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          specialties?: string[] | null
          timezone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      progress_reports: {
        Row: {
          created_at: string | null
          id: string
          insights: string[] | null
          metrics: Json
          patient_id: string
          plan_id: string
          recommendations: string[] | null
          report_type: string
          trends: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          insights?: string[] | null
          metrics?: Json
          patient_id: string
          plan_id: string
          recommendations?: string[] | null
          report_type: string
          trends?: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          insights?: string[] | null
          metrics?: Json
          patient_id?: string
          plan_id?: string
          recommendations?: string[] | null
          report_type?: string
          trends?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "progress_reports_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progress_reports_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progress_reports_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progress_reports_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "exercise_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      push_notifications_log: {
        Row: {
          body: string | null
          clicked_at: string | null
          created_at: string | null
          data: Json | null
          delivered_at: string | null
          error_message: string | null
          id: string
          sent_at: string | null
          status: string | null
          subscription_id: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          body?: string | null
          clicked_at?: string | null
          created_at?: string | null
          data?: Json | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          sent_at?: string | null
          status?: string | null
          subscription_id?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          body?: string | null
          clicked_at?: string | null
          created_at?: string | null
          data?: Json | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          sent_at?: string | null
          status?: string | null
          subscription_id?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_notifications_log_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "push_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          active: boolean | null
          auth: string
          created_at: string | null
          device_info: Json | null
          endpoint: string
          id: string
          last_used_at: string | null
          organization_id: string | null
          p256dh: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          auth: string
          created_at?: string | null
          device_info?: Json | null
          endpoint: string
          id?: string
          last_used_at?: string | null
          organization_id?: string | null
          p256dh: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          auth?: string
          created_at?: string | null
          device_info?: Json | null
          endpoint?: string
          id?: string
          last_used_at?: string | null
          organization_id?: string | null
          p256dh?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_requests: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          identifier: string
          request_count: number
          updated_at: string
          window_start: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          identifier: string
          request_count?: number
          updated_at?: string
          window_start?: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          identifier?: string
          request_count?: number
          updated_at?: string
          window_start?: string
        }
        Relationships: []
      }
      recibos: {
        Row: {
          assinado: boolean | null
          cpf_cnpj_emitente: string | null
          created_at: string
          created_by: string | null
          data_emissao: string
          emitido_por: string
          id: string
          logo_url: string | null
          numero_recibo: number
          organization_id: string | null
          patient_id: string | null
          referente: string
          valor: number
          valor_extenso: string | null
        }
        Insert: {
          assinado?: boolean | null
          cpf_cnpj_emitente?: string | null
          created_at?: string
          created_by?: string | null
          data_emissao?: string
          emitido_por: string
          id?: string
          logo_url?: string | null
          numero_recibo?: number
          organization_id?: string | null
          patient_id?: string | null
          referente: string
          valor: number
          valor_extenso?: string | null
        }
        Update: {
          assinado?: boolean | null
          cpf_cnpj_emitente?: string | null
          created_at?: string
          created_by?: string | null
          data_emissao?: string
          emitido_por?: string
          id?: string
          logo_url?: string | null
          numero_recibo?: number
          organization_id?: string | null
          patient_id?: string | null
          referente?: string
          valor?: number
          valor_extenso?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recibos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recibos_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recibos_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recibos_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      report_executions: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          executed_by: string | null
          execution_params: Json | null
          file_url: string | null
          id: string
          report_id: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          executed_by?: string | null
          execution_params?: Json | null
          file_url?: string | null
          id?: string
          report_id?: string | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          executed_by?: string | null
          execution_params?: Json | null
          file_url?: string | null
          id?: string
          report_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_executions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      report_exports: {
        Row: {
          created_at: string | null
          export_format: string
          exported_by: string | null
          file_path: string | null
          id: string
          report_id: string
          report_type: string
        }
        Insert: {
          created_at?: string | null
          export_format: string
          exported_by?: string | null
          file_path?: string | null
          id?: string
          report_id: string
          report_type: string
        }
        Update: {
          created_at?: string | null
          export_format?: string
          exported_by?: string | null
          file_path?: string | null
          id?: string
          report_id?: string
          report_type?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          content: string | null
          created_at: string | null
          created_by: string
          generated_at: string | null
          id: string
          patient_id: string | null
          period_end: string | null
          period_start: string | null
          report_type: string
          title: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          created_by: string
          generated_at?: string | null
          id?: string
          patient_id?: string | null
          period_end?: string | null
          period_start?: string | null
          report_type: string
          title: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          created_by?: string
          generated_at?: string | null
          id?: string
          patient_id?: string | null
          period_end?: string | null
          period_start?: string | null
          report_type?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "therapist_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      retencao_cancelamentos: {
        Row: {
          created_at: string
          created_by: string | null
          data_evento: string
          id: string
          motivo: string | null
          observacoes: string | null
          organization_id: string | null
          patient_id: string
          tipo: string
          valor_anterior: number | null
          valor_novo: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_evento?: string
          id?: string
          motivo?: string | null
          observacoes?: string | null
          organization_id?: string | null
          patient_id: string
          tipo: string
          valor_anterior?: number | null
          valor_novo?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_evento?: string
          id?: string
          motivo?: string | null
          observacoes?: string | null
          organization_id?: string | null
          patient_id?: string
          tipo?: string
          valor_anterior?: number | null
          valor_novo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "retencao_cancelamentos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retencao_cancelamentos_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retencao_cancelamentos_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retencao_cancelamentos_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_forecasts: {
        Row: {
          actual_appointments: number | null
          actual_revenue: number | null
          confidence_interval_high: number | null
          confidence_interval_low: number | null
          created_at: string | null
          factors: Json | null
          forecast_date: string
          id: string
          model_version: string | null
          organization_id: string | null
          predicted_appointments: number | null
          predicted_revenue: number | null
        }
        Insert: {
          actual_appointments?: number | null
          actual_revenue?: number | null
          confidence_interval_high?: number | null
          confidence_interval_low?: number | null
          created_at?: string | null
          factors?: Json | null
          forecast_date: string
          id?: string
          model_version?: string | null
          organization_id?: string | null
          predicted_appointments?: number | null
          predicted_revenue?: number | null
        }
        Update: {
          actual_appointments?: number | null
          actual_revenue?: number | null
          confidence_interval_high?: number | null
          confidence_interval_low?: number | null
          created_at?: string | null
          factors?: Json | null
          forecast_date?: string
          id?: string
          model_version?: string | null
          organization_id?: string | null
          predicted_appointments?: number | null
          predicted_revenue?: number | null
        }
        Relationships: []
      }
      salas: {
        Row: {
          ativo: boolean
          capacidade: number | null
          cor: string | null
          created_at: string
          descricao: string | null
          equipamentos: string[] | null
          id: string
          nome: string
          organization_id: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          capacidade?: number | null
          cor?: string | null
          created_at?: string
          descricao?: string | null
          equipamentos?: string[] | null
          id?: string
          nome: string
          organization_id?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          capacidade?: number | null
          cor?: string | null
          created_at?: string
          descricao?: string | null
          equipamentos?: string[] | null
          id?: string
          nome?: string
          organization_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "salas_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      satisfaction_surveys: {
        Row: {
          appointment_id: string | null
          comments: string | null
          created_at: string
          id: string
          nps_score: number | null
          organization_id: string
          patient_id: string
          q_care_quality: number | null
          q_communication: number | null
          q_facility_cleanliness: number | null
          q_professionalism: number | null
          q_scheduling_ease: number | null
          responded_at: string | null
          response_time_hours: number | null
          sent_at: string
          suggestions: string | null
          therapist_id: string | null
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          comments?: string | null
          created_at?: string
          id?: string
          nps_score?: number | null
          organization_id: string
          patient_id: string
          q_care_quality?: number | null
          q_communication?: number | null
          q_facility_cleanliness?: number | null
          q_professionalism?: number | null
          q_scheduling_ease?: number | null
          responded_at?: string | null
          response_time_hours?: number | null
          sent_at?: string
          suggestions?: string | null
          therapist_id?: string | null
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          comments?: string | null
          created_at?: string
          id?: string
          nps_score?: number | null
          organization_id?: string
          patient_id?: string
          q_care_quality?: number | null
          q_communication?: number | null
          q_facility_cleanliness?: number | null
          q_professionalism?: number | null
          q_scheduling_ease?: number | null
          responded_at?: string | null
          response_time_hours?: number | null
          sent_at?: string
          suggestions?: string | null
          therapist_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "satisfaction_surveys_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "satisfaction_surveys_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "satisfaction_surveys_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "patient_appointment_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "satisfaction_surveys_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "therapist_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "satisfaction_surveys_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "today_appointments_with_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "satisfaction_surveys_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "satisfaction_surveys_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "satisfaction_surveys_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "satisfaction_surveys_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_blocked_times: {
        Row: {
          created_at: string | null
          created_by: string
          end_date: string
          end_time: string | null
          id: string
          is_all_day: boolean
          is_recurring: boolean
          organization_id: string | null
          reason: string | null
          recurring_days: number[] | null
          start_date: string
          start_time: string | null
          therapist_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          end_date: string
          end_time?: string | null
          id?: string
          is_all_day?: boolean
          is_recurring?: boolean
          organization_id?: string | null
          reason?: string | null
          recurring_days?: number[] | null
          start_date: string
          start_time?: string | null
          therapist_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          end_date?: string
          end_time?: string | null
          id?: string
          is_all_day?: boolean
          is_recurring?: boolean
          organization_id?: string | null
          reason?: string | null
          recurring_days?: number[] | null
          start_date?: string
          start_time?: string | null
          therapist_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_blocked_times_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_blocked_times_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_blocked_times_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_blocked_times_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapist_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_blocks: {
        Row: {
          block_type: string | null
          created_at: string | null
          end_datetime: string
          id: string
          reason: string | null
          start_datetime: string
          therapist_id: string | null
          updated_at: string | null
        }
        Insert: {
          block_type?: string | null
          created_at?: string | null
          end_datetime: string
          id?: string
          reason?: string | null
          start_datetime: string
          therapist_id?: string | null
          updated_at?: string | null
        }
        Update: {
          block_type?: string | null
          created_at?: string | null
          end_datetime?: string
          id?: string
          reason?: string | null
          start_datetime?: string
          therapist_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_blocks_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_blocks_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_blocks_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapist_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_business_hours: {
        Row: {
          break_end: string | null
          break_start: string | null
          close_time: string
          created_at: string | null
          day_of_week: number
          id: string
          is_open: boolean
          open_time: string
          organization_id: string | null
          updated_at: string | null
        }
        Insert: {
          break_end?: string | null
          break_start?: string | null
          close_time?: string
          created_at?: string | null
          day_of_week: number
          id?: string
          is_open?: boolean
          open_time?: string
          organization_id?: string | null
          updated_at?: string | null
        }
        Update: {
          break_end?: string | null
          break_start?: string | null
          close_time?: string
          created_at?: string | null
          day_of_week?: number
          id?: string
          is_open?: boolean
          open_time?: string
          organization_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_business_hours_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_cancellation_rules: {
        Row: {
          allow_patient_cancellation: boolean
          charge_late_cancellation: boolean
          created_at: string | null
          id: string
          late_cancellation_fee: number | null
          max_cancellations_month: number | null
          min_hours_before: number
          organization_id: string | null
          updated_at: string | null
        }
        Insert: {
          allow_patient_cancellation?: boolean
          charge_late_cancellation?: boolean
          created_at?: string | null
          id?: string
          late_cancellation_fee?: number | null
          max_cancellations_month?: number | null
          min_hours_before?: number
          organization_id?: string | null
          updated_at?: string | null
        }
        Update: {
          allow_patient_cancellation?: boolean
          charge_late_cancellation?: boolean
          created_at?: string | null
          id?: string
          late_cancellation_fee?: number | null
          max_cancellations_month?: number | null
          min_hours_before?: number
          organization_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_cancellation_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_capacity_config: {
        Row: {
          created_at: string | null
          day_of_week: number
          end_time: string
          id: string
          max_patients: number
          organization_id: string | null
          start_time: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          day_of_week: number
          end_time: string
          id?: string
          max_patients?: number
          organization_id?: string | null
          start_time: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          day_of_week?: number
          end_time?: string
          id?: string
          max_patients?: number
          organization_id?: string | null
          start_time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_capacity_config_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_notification_settings: {
        Row: {
          created_at: string | null
          custom_confirmation_message: string | null
          custom_reminder_message: string | null
          id: string
          organization_id: string | null
          send_cancellation_notice: boolean
          send_confirmation_email: boolean
          send_confirmation_whatsapp: boolean
          send_reminder_24h: boolean
          send_reminder_2h: boolean
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          custom_confirmation_message?: string | null
          custom_reminder_message?: string | null
          id?: string
          organization_id?: string | null
          send_cancellation_notice?: boolean
          send_confirmation_email?: boolean
          send_confirmation_whatsapp?: boolean
          send_reminder_24h?: boolean
          send_reminder_2h?: boolean
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          custom_confirmation_message?: string | null
          custom_reminder_message?: string | null
          id?: string
          organization_id?: string | null
          send_cancellation_notice?: boolean
          send_confirmation_email?: boolean
          send_confirmation_whatsapp?: boolean
          send_reminder_24h?: boolean
          send_reminder_2h?: boolean
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_notification_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_settings: {
        Row: {
          active: boolean | null
          break_end: string | null
          break_start: string | null
          consultation_duration: number | null
          created_at: string | null
          day_of_week: number | null
          end_time: string | null
          id: string
          start_time: string | null
          therapist_id: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          break_end?: string | null
          break_start?: string | null
          consultation_duration?: number | null
          created_at?: string | null
          day_of_week?: number | null
          end_time?: string | null
          id?: string
          start_time?: string | null
          therapist_id?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          break_end?: string | null
          break_start?: string | null
          consultation_duration?: number | null
          created_at?: string | null
          day_of_week?: number | null
          end_time?: string | null
          id?: string
          start_time?: string | null
          therapist_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_settings_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_settings_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_settings_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapist_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          ip_address: unknown
          metadata: Json | null
          severity: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          severity?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          severity?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      servicos: {
        Row: {
          ativo: boolean
          centro_custo: string | null
          centro_custo_id: string | null
          cor: string | null
          created_at: string
          descricao: string | null
          duracao_padrao: number
          experimental: boolean | null
          id: string
          mostrar_valor: boolean | null
          nome: string
          nome_exibicao: string | null
          organization_id: string | null
          permite_agendamento_online: boolean
          profissional_padrao_id: string | null
          qtd_sessoes_pacote: number | null
          sala_padrao_id: string | null
          tipo_cobranca: string
          updated_at: string
          valor: number
          valor_mensal: number | null
        }
        Insert: {
          ativo?: boolean
          centro_custo?: string | null
          centro_custo_id?: string | null
          cor?: string | null
          created_at?: string
          descricao?: string | null
          duracao_padrao?: number
          experimental?: boolean | null
          id?: string
          mostrar_valor?: boolean | null
          nome: string
          nome_exibicao?: string | null
          organization_id?: string | null
          permite_agendamento_online?: boolean
          profissional_padrao_id?: string | null
          qtd_sessoes_pacote?: number | null
          sala_padrao_id?: string | null
          tipo_cobranca?: string
          updated_at?: string
          valor?: number
          valor_mensal?: number | null
        }
        Update: {
          ativo?: boolean
          centro_custo?: string | null
          centro_custo_id?: string | null
          cor?: string | null
          created_at?: string
          descricao?: string | null
          duracao_padrao?: number
          experimental?: boolean | null
          id?: string
          mostrar_valor?: boolean | null
          nome?: string
          nome_exibicao?: string | null
          organization_id?: string | null
          permite_agendamento_online?: boolean
          profissional_padrao_id?: string | null
          qtd_sessoes_pacote?: number | null
          sala_padrao_id?: string | null
          tipo_cobranca?: string
          updated_at?: string
          valor?: number
          valor_mensal?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "servicos_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servicos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servicos_sala_padrao_id_fkey"
            columns: ["sala_padrao_id"]
            isOneToOne: false
            referencedRelation: "salas"
            referencedColumns: ["id"]
          },
        ]
      }
      session_attachments: {
        Row: {
          created_at: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          session_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          session_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          session_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_attachments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "therapist_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      session_exercises: {
        Row: {
          created_at: string | null
          difficulty_level: number
          duration_seconds: number | null
          exercise_name: string
          id: string
          patient_feedback: string | null
          reps_completed: number
          reps_planned: number
          session_id: string
          sets_completed: number
          sets_planned: number
          therapist_notes: string | null
          weight_kg: number | null
        }
        Insert: {
          created_at?: string | null
          difficulty_level?: number
          duration_seconds?: number | null
          exercise_name: string
          id?: string
          patient_feedback?: string | null
          reps_completed?: number
          reps_planned?: number
          session_id: string
          sets_completed?: number
          sets_planned?: number
          therapist_notes?: string | null
          weight_kg?: number | null
        }
        Update: {
          created_at?: string | null
          difficulty_level?: number
          duration_seconds?: number | null
          exercise_name?: string
          id?: string
          patient_feedback?: string | null
          reps_completed?: number
          reps_planned?: number
          session_id?: string
          sets_completed?: number
          sets_planned?: number
          therapist_notes?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "session_exercises_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "patient_timeline"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "session_exercises_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "treatment_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_metrics: {
        Row: {
          calculated_at: string | null
          exercise_compliance: number
          functional_improvement: number
          id: string
          pain_improvement: number
          session_effectiveness: number
          session_id: string
        }
        Insert: {
          calculated_at?: string | null
          exercise_compliance?: number
          functional_improvement: number
          id?: string
          pain_improvement: number
          session_effectiveness?: number
          session_id: string
        }
        Update: {
          calculated_at?: string | null
          exercise_compliance?: number
          functional_improvement?: number
          id?: string
          pain_improvement?: number
          session_effectiveness?: number
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_metrics_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "patient_timeline"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "session_metrics_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "treatment_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_packages: {
        Row: {
          created_at: string
          created_by: string
          discount_value: number | null
          final_value: number
          id: string
          notes: string | null
          organization_id: string
          package_name: string
          paid_at: string | null
          patient_id: string
          payment_method: string | null
          payment_status: string
          remaining_sessions: number | null
          status: Database["public"]["Enums"]["package_status"]
          total_sessions: number
          total_value: number
          updated_at: string
          used_sessions: number
          valid_until: string | null
          value_per_session: number | null
        }
        Insert: {
          created_at?: string
          created_by: string
          discount_value?: number | null
          final_value: number
          id?: string
          notes?: string | null
          organization_id: string
          package_name: string
          paid_at?: string | null
          patient_id: string
          payment_method?: string | null
          payment_status?: string
          remaining_sessions?: number | null
          status?: Database["public"]["Enums"]["package_status"]
          total_sessions: number
          total_value: number
          updated_at?: string
          used_sessions?: number
          valid_until?: string | null
          value_per_session?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string
          discount_value?: number | null
          final_value?: number
          id?: string
          notes?: string | null
          organization_id?: string
          package_name?: string
          paid_at?: string | null
          patient_id?: string
          payment_method?: string | null
          payment_status?: string
          remaining_sessions?: number | null
          status?: Database["public"]["Enums"]["package_status"]
          total_sessions?: number
          total_value?: number
          updated_at?: string
          used_sessions?: number
          valid_until?: string | null
          value_per_session?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "session_packages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_packages_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_packages_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_packages_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          appointment_id: string | null
          assessment: string | null
          completed_at: string | null
          created_at: string | null
          eva_score: number | null
          id: string
          objective: string | null
          organization_id: string | null
          patient_id: string
          plan: string | null
          started_at: string | null
          status: string | null
          subjective: string | null
          therapist_id: string | null
          updated_at: string | null
        }
        Insert: {
          appointment_id?: string | null
          assessment?: string | null
          completed_at?: string | null
          created_at?: string | null
          eva_score?: number | null
          id?: string
          objective?: string | null
          organization_id?: string | null
          patient_id: string
          plan?: string | null
          started_at?: string | null
          status?: string | null
          subjective?: string | null
          therapist_id?: string | null
          updated_at?: string | null
        }
        Update: {
          appointment_id?: string | null
          assessment?: string | null
          completed_at?: string | null
          created_at?: string | null
          eva_score?: number | null
          id?: string
          objective?: string | null
          organization_id?: string | null
          patient_id?: string
          plan?: string | null
          started_at?: string | null
          status?: string | null
          subjective?: string | null
          therapist_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "patient_appointment_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "therapist_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "today_appointments_with_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapist_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      soap_records: {
        Row: {
          appointment_id: string | null
          assessment: string | null
          created_at: string | null
          created_by: string
          id: string
          objective: string | null
          patient_id: string
          plan: string | null
          record_date: string | null
          signed_at: string | null
          subjective: string | null
          updated_at: string | null
        }
        Insert: {
          appointment_id?: string | null
          assessment?: string | null
          created_at?: string | null
          created_by: string
          id?: string
          objective?: string | null
          patient_id: string
          plan?: string | null
          record_date?: string | null
          signed_at?: string | null
          subjective?: string | null
          updated_at?: string | null
        }
        Update: {
          appointment_id?: string | null
          assessment?: string | null
          created_at?: string | null
          created_by?: string
          id?: string
          objective?: string | null
          patient_id?: string
          plan?: string | null
          record_date?: string | null
          signed_at?: string | null
          subjective?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "soap_records_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "soap_records_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "soap_records_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "patient_appointment_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "soap_records_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "therapist_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "soap_records_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "today_appointments_with_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "soap_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "soap_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "soap_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "therapist_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "soap_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "soap_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "soap_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_performance_metrics: {
        Row: {
          average_session_duration: number | null
          cancelled_appointments: number | null
          completed_appointments: number | null
          created_at: string | null
          id: string
          metric_date: string
          new_patients: number | null
          no_show_appointments: number | null
          patient_satisfaction_avg: number | null
          returning_patients: number | null
          revenue_generated: number | null
          therapist_id: string
          total_appointments: number | null
        }
        Insert: {
          average_session_duration?: number | null
          cancelled_appointments?: number | null
          completed_appointments?: number | null
          created_at?: string | null
          id?: string
          metric_date: string
          new_patients?: number | null
          no_show_appointments?: number | null
          patient_satisfaction_avg?: number | null
          returning_patients?: number | null
          revenue_generated?: number | null
          therapist_id: string
          total_appointments?: number | null
        }
        Update: {
          average_session_duration?: number | null
          cancelled_appointments?: number | null
          completed_appointments?: number | null
          created_at?: string | null
          id?: string
          metric_date?: string
          new_patients?: number | null
          no_show_appointments?: number | null
          patient_satisfaction_avg?: number | null
          returning_patients?: number | null
          revenue_generated?: number | null
          therapist_id?: string
          total_appointments?: number | null
        }
        Relationships: []
      }
      standardized_test_results: {
        Row: {
          answers: Json
          created_at: string
          created_by: string
          id: string
          interpretation: string | null
          max_score: number
          patient_id: string
          score: number
          test_name: string
          test_type: string
          updated_at: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          created_by: string
          id?: string
          interpretation?: string | null
          max_score: number
          patient_id: string
          score: number
          test_name: string
          test_type: string
          updated_at?: string
        }
        Update: {
          answers?: Json
          created_at?: string
          created_by?: string
          id?: string
          interpretation?: string | null
          max_score?: number
          patient_id?: string
          score?: number
          test_name?: string
          test_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "standardized_test_results_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "standardized_test_results_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "standardized_test_results_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_purchases: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          id: string
          metadata: Json | null
          organization_id: string | null
          paid_at: string | null
          patient_id: string | null
          payment_method: string | null
          receipt_url: string | null
          status: string | null
          stripe_customer_id: string | null
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          updated_at: string | null
          user_id: string | null
          voucher_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          paid_at?: string | null
          patient_id?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          voucher_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          paid_at?: string | null
          patient_id?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          voucher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stripe_purchases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stripe_purchases_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stripe_purchases_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stripe_purchases_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stripe_purchases_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      surgeries: {
        Row: {
          created_at: string
          hospital: string | null
          id: string
          medical_record_id: string
          name: string
          notes: string | null
          post_op_protocol: string | null
          surgeon: string | null
          surgery_date: string | null
        }
        Insert: {
          created_at?: string
          hospital?: string | null
          id?: string
          medical_record_id: string
          name: string
          notes?: string | null
          post_op_protocol?: string | null
          surgeon?: string | null
          surgery_date?: string | null
        }
        Update: {
          created_at?: string
          hospital?: string | null
          id?: string
          medical_record_id?: string
          name?: string
          notes?: string | null
          post_op_protocol?: string | null
          surgeon?: string | null
          surgery_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "surgeries_medical_record_id_fkey"
            columns: ["medical_record_id"]
            isOneToOne: false
            referencedRelation: "medical_records"
            referencedColumns: ["id"]
          },
        ]
      }
      tarefas: {
        Row: {
          created_at: string
          created_by: string | null
          data_vencimento: string | null
          descricao: string | null
          id: string
          order_index: number
          organization_id: string | null
          prioridade: string
          responsavel_id: string | null
          status: string
          tags: string[] | null
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_vencimento?: string | null
          descricao?: string | null
          id?: string
          order_index?: number
          organization_id?: string | null
          prioridade?: string
          responsavel_id?: string | null
          status?: string
          tags?: string[] | null
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_vencimento?: string | null
          descricao?: string | null
          id?: string
          order_index?: number
          organization_id?: string | null
          prioridade?: string
          responsavel_id?: string | null
          status?: string
          tags?: string[] | null
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarefas_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "therapist_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      telemedicine_rooms: {
        Row: {
          appointment_id: string | null
          created_at: string | null
          duration_minutes: number | null
          ended_at: string | null
          id: string
          notas: string | null
          organization_id: string | null
          patient_id: string | null
          recording_url: string | null
          room_code: string
          room_url: string | null
          started_at: string | null
          status: string | null
          therapist_id: string | null
          updated_at: string | null
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          notas?: string | null
          organization_id?: string | null
          patient_id?: string | null
          recording_url?: string | null
          room_code?: string
          room_url?: string | null
          started_at?: string | null
          status?: string | null
          therapist_id?: string | null
          updated_at?: string | null
        }
        Update: {
          appointment_id?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          notas?: string | null
          organization_id?: string | null
          patient_id?: string | null
          recording_url?: string | null
          room_code?: string
          room_url?: string | null
          started_at?: string | null
          status?: string | null
          therapist_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "telemedicine_rooms_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telemedicine_rooms_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telemedicine_rooms_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "patient_appointment_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telemedicine_rooms_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "therapist_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telemedicine_rooms_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "today_appointments_with_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telemedicine_rooms_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telemedicine_rooms_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telemedicine_rooms_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telemedicine_rooms_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telemedicine_rooms_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telemedicine_rooms_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telemedicine_rooms_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapist_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      transacoes: {
        Row: {
          created_at: string | null
          descricao: string | null
          id: string
          metadata: Json | null
          status: string
          stripe_payment_intent_id: string | null
          stripe_refund_id: string | null
          tipo: string
          updated_at: string | null
          user_id: string | null
          valor: number
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          id?: string
          metadata?: Json | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_refund_id?: string | null
          tipo: string
          updated_at?: string | null
          user_id?: string | null
          valor: number
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          id?: string
          metadata?: Json | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_refund_id?: string | null
          tipo?: string
          updated_at?: string | null
          user_id?: string | null
          valor?: number
        }
        Relationships: []
      }
      treatment_goals: {
        Row: {
          achieved_at: string | null
          created_at: string | null
          created_by: string | null
          description: string
          id: string
          notes: string | null
          patient_id: string
          status: string | null
          target_date: string | null
          updated_at: string | null
        }
        Insert: {
          achieved_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description: string
          id?: string
          notes?: string | null
          patient_id: string
          status?: string | null
          target_date?: string | null
          updated_at?: string | null
        }
        Update: {
          achieved_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string
          id?: string
          notes?: string | null
          patient_id?: string
          status?: string | null
          target_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treatment_goals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_goals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_goals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "therapist_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_goals_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_goals_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_goals_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_sessions: {
        Row: {
          appointment_id: string | null
          attachments: Json | null
          created_at: string | null
          created_by: string
          duration: number | null
          duration_minutes: number | null
          equipment_used: string[] | null
          homework_assigned: string | null
          id: string
          observations: string | null
          pain_level: number | null
          patient_id: string
          patient_response: string | null
          session_date: string | null
          session_number: number | null
          session_type: string | null
          techniques_used: string | null
          updated_at: string | null
        }
        Insert: {
          appointment_id?: string | null
          attachments?: Json | null
          created_at?: string | null
          created_by: string
          duration?: number | null
          duration_minutes?: number | null
          equipment_used?: string[] | null
          homework_assigned?: string | null
          id?: string
          observations?: string | null
          pain_level?: number | null
          patient_id: string
          patient_response?: string | null
          session_date?: string | null
          session_number?: number | null
          session_type?: string | null
          techniques_used?: string | null
          updated_at?: string | null
        }
        Update: {
          appointment_id?: string | null
          attachments?: Json | null
          created_at?: string | null
          created_by?: string
          duration?: number | null
          duration_minutes?: number | null
          equipment_used?: string[] | null
          homework_assigned?: string | null
          id?: string
          observations?: string | null
          pain_level?: number | null
          patient_id?: string
          patient_response?: string | null
          session_date?: string | null
          session_number?: number | null
          session_type?: string | null
          techniques_used?: string | null
          updated_at?: string | null
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
            foreignKeyName: "treatment_sessions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_sessions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "patient_appointment_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_sessions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "therapist_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_sessions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "today_appointments_with_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "therapist_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_sessions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_sessions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
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
      user_invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_vouchers: {
        Row: {
          ativo: boolean
          created_at: string
          data_compra: string
          data_expiracao: string
          first_session_date: string | null
          id: string
          last_session_date: string | null
          sessions_per_week_actual: number | null
          sessoes_restantes: number
          sessoes_totais: number
          stripe_payment_intent_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
          valor_pago: number
          voucher_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          data_compra?: string
          data_expiracao: string
          first_session_date?: string | null
          id?: string
          last_session_date?: string | null
          sessions_per_week_actual?: number | null
          sessoes_restantes: number
          sessoes_totais: number
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
          valor_pago: number
          voucher_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          data_compra?: string
          data_expiracao?: string
          first_session_date?: string | null
          id?: string
          last_session_date?: string | null
          sessions_per_week_actual?: number | null
          sessoes_restantes?: number
          sessoes_totais?: number
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
          valor_pago?: number
          voucher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_vouchers_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      voucher_purchases: {
        Row: {
          amount_paid: number
          created_at: string
          expiry_date: string
          id: string
          patient_id: string | null
          payment_id: string | null
          payment_method: string | null
          purchase_date: string
          purchased_by: string | null
          sessions_remaining: number | null
          status: string
          updated_at: string
          voucher_id: string | null
        }
        Insert: {
          amount_paid: number
          created_at?: string
          expiry_date: string
          id?: string
          patient_id?: string | null
          payment_id?: string | null
          payment_method?: string | null
          purchase_date?: string
          purchased_by?: string | null
          sessions_remaining?: number | null
          status?: string
          updated_at?: string
          voucher_id?: string | null
        }
        Update: {
          amount_paid?: number
          created_at?: string
          expiry_date?: string
          id?: string
          patient_id?: string | null
          payment_id?: string | null
          payment_method?: string | null
          purchase_date?: string
          purchased_by?: string | null
          sessions_remaining?: number | null
          status?: string
          updated_at?: string
          voucher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voucher_purchases_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voucher_purchases_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voucher_purchases_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voucher_purchases_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      vouchers: {
        Row: {
          ativo: boolean
          auto_renew: boolean | null
          created_at: string
          descricao: string | null
          description: string | null
          duration_weeks: number | null
          id: string
          is_active: boolean | null
          is_unlimited: boolean | null
          name: string | null
          nome: string
          preco: number
          price: number | null
          sessions_included: number | null
          sessions_per_week: number | null
          sessoes: number | null
          stripe_price_id: string | null
          tipo: string
          updated_at: string
          validade_dias: number
          validity_days: number | null
        }
        Insert: {
          ativo?: boolean
          auto_renew?: boolean | null
          created_at?: string
          descricao?: string | null
          description?: string | null
          duration_weeks?: number | null
          id?: string
          is_active?: boolean | null
          is_unlimited?: boolean | null
          name?: string | null
          nome: string
          preco: number
          price?: number | null
          sessions_included?: number | null
          sessions_per_week?: number | null
          sessoes?: number | null
          stripe_price_id?: string | null
          tipo: string
          updated_at?: string
          validade_dias?: number
          validity_days?: number | null
        }
        Update: {
          ativo?: boolean
          auto_renew?: boolean | null
          created_at?: string
          descricao?: string | null
          description?: string | null
          duration_weeks?: number | null
          id?: string
          is_active?: boolean | null
          is_unlimited?: boolean | null
          name?: string | null
          nome?: string
          preco?: number
          price?: number | null
          sessions_included?: number | null
          sessions_per_week?: number | null
          sessoes?: number | null
          stripe_price_id?: string | null
          tipo?: string
          updated_at?: string
          validade_dias?: number
          validity_days?: number | null
        }
        Relationships: []
      }
      waiting_list: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          patient_id: string
          preferred_therapist_id: string | null
          preferred_times: Json | null
          status: string | null
          updated_at: string | null
          urgency_level: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          preferred_therapist_id?: string | null
          preferred_times?: Json | null
          status?: string | null
          updated_at?: string | null
          urgency_level?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          preferred_therapist_id?: string | null
          preferred_times?: Json | null
          status?: string | null
          updated_at?: string | null
          urgency_level?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "waiting_list_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiting_list_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiting_list_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiting_list_preferred_therapist_id_fkey"
            columns: ["preferred_therapist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiting_list_preferred_therapist_id_fkey"
            columns: ["preferred_therapist_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiting_list_preferred_therapist_id_fkey"
            columns: ["preferred_therapist_id"]
            isOneToOne: false
            referencedRelation: "therapist_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist: {
        Row: {
          added_at: string | null
          created_at: string | null
          id: string
          last_notification_sent_at: string | null
          last_offer_rejected_at: string | null
          notes: string | null
          notification_count: number | null
          organization_id: string | null
          patient_id: string
          preferred_days: string[] | null
          preferred_therapist_ids: string[] | null
          preferred_time_slots: string[] | null
          priority: string | null
          priority_reason: string | null
          rejection_count: number | null
          removed_at: string | null
          scheduled_at: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          added_at?: string | null
          created_at?: string | null
          id?: string
          last_notification_sent_at?: string | null
          last_offer_rejected_at?: string | null
          notes?: string | null
          notification_count?: number | null
          organization_id?: string | null
          patient_id: string
          preferred_days?: string[] | null
          preferred_therapist_ids?: string[] | null
          preferred_time_slots?: string[] | null
          priority?: string | null
          priority_reason?: string | null
          rejection_count?: number | null
          removed_at?: string | null
          scheduled_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          added_at?: string | null
          created_at?: string | null
          id?: string
          last_notification_sent_at?: string | null
          last_offer_rejected_at?: string | null
          notes?: string | null
          notification_count?: number | null
          organization_id?: string | null
          patient_id?: string
          preferred_days?: string[] | null
          preferred_therapist_ids?: string[] | null
          preferred_time_slots?: string[] | null
          priority?: string | null
          priority_reason?: string | null
          rejection_count?: number | null
          removed_at?: string | null
          scheduled_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist_offers: {
        Row: {
          appointment_id: string
          created_at: string | null
          expiration_time: string
          id: string
          notification_sent_at: string | null
          organization_id: string | null
          patient_id: string
          rejection_reason: string | null
          responded_at: string | null
          response_method: string | null
          slot_date: string
          slot_time: string
          status: string | null
          therapist_id: string | null
          updated_at: string | null
          waitlist_id: string
        }
        Insert: {
          appointment_id: string
          created_at?: string | null
          expiration_time: string
          id?: string
          notification_sent_at?: string | null
          organization_id?: string | null
          patient_id: string
          rejection_reason?: string | null
          responded_at?: string | null
          response_method?: string | null
          slot_date: string
          slot_time: string
          status?: string | null
          therapist_id?: string | null
          updated_at?: string | null
          waitlist_id: string
        }
        Update: {
          appointment_id?: string
          created_at?: string | null
          expiration_time?: string
          id?: string
          notification_sent_at?: string | null
          organization_id?: string | null
          patient_id?: string
          rejection_reason?: string | null
          responded_at?: string | null
          response_method?: string | null
          slot_date?: string
          slot_time?: string
          status?: string | null
          therapist_id?: string | null
          updated_at?: string | null
          waitlist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_offers_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_offers_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_offers_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "patient_appointment_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_offers_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "therapist_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_offers_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "today_appointments_with_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_offers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_offers_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_offers_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_offers_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_offers_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_offers_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_offers_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapist_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_offers_waitlist_id_fkey"
            columns: ["waitlist_id"]
            isOneToOne: false
            referencedRelation: "waitlist"
            referencedColumns: ["id"]
          },
        ]
      }
      wearable_data: {
        Row: {
          created_at: string | null
          data_type: string
          id: string
          organization_id: string | null
          patient_id: string
          source: string
          timestamp: string
          unit: string | null
          value: number
        }
        Insert: {
          created_at?: string | null
          data_type: string
          id?: string
          organization_id?: string | null
          patient_id: string
          source: string
          timestamp: string
          unit?: string | null
          value: number
        }
        Update: {
          created_at?: string | null
          data_type?: string
          id?: string
          organization_id?: string | null
          patient_id?: string
          source?: string
          timestamp?: string
          unit?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "wearable_data_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wearable_data_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wearable_data_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wearable_data_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_connections: {
        Row: {
          api_key: string | null
          api_url: string | null
          created_at: string | null
          id: string
          instance_name: string
          is_connected: boolean | null
          last_seen_at: string | null
          organization_id: string | null
          phone_number: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          api_key?: string | null
          api_url?: string | null
          created_at?: string | null
          id?: string
          instance_name: string
          is_connected?: boolean | null
          last_seen_at?: string | null
          organization_id?: string | null
          phone_number?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          api_key?: string | null
          api_url?: string | null
          created_at?: string | null
          id?: string
          instance_name?: string
          is_connected?: boolean | null
          last_seen_at?: string | null
          organization_id?: string | null
          phone_number?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_exercise_queue: {
        Row: {
          created_at: string | null
          delivered_at: string | null
          error_message: string | null
          exercise_plan_id: string | null
          exercises: Json
          id: string
          opened_at: string | null
          patient_id: string
          phone_number: string
          scheduled_for: string | null
          sent_at: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          exercise_plan_id?: string | null
          exercises: Json
          id?: string
          opened_at?: string | null
          patient_id: string
          phone_number: string
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          exercise_plan_id?: string | null
          exercises?: Json
          id?: string
          opened_at?: string | null
          patient_id?: string
          phone_number?: string
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          appointment_id: string | null
          created_at: string | null
          delivered_at: string | null
          id: string
          message_content: string
          message_type: string
          organization_id: string | null
          patient_id: string | null
          phone: string
          read_at: string | null
          response_content: string | null
          response_received_at: string | null
          sent_at: string | null
          status: string | null
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          id?: string
          message_content: string
          message_type: string
          organization_id?: string | null
          patient_id?: string | null
          phone?: string
          read_at?: string | null
          response_content?: string | null
          response_received_at?: string | null
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          appointment_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          id?: string
          message_content?: string
          message_type?: string
          organization_id?: string | null
          patient_id?: string | null
          phone?: string
          read_at?: string | null
          response_content?: string | null
          response_received_at?: string | null
          sent_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "patient_appointment_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "therapist_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "today_appointments_with_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_metrics: {
        Row: {
          appointment_id: string | null
          created_at: string
          delivered_at: string | null
          error_message: string | null
          id: string
          message_id: string | null
          message_type: string
          organization_id: string | null
          patient_id: string | null
          phone_number: string
          read_at: string | null
          replied_at: string | null
          reply_content: string | null
          retry_count: number | null
          sent_at: string | null
          status: string
          template_key: string | null
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          message_id?: string | null
          message_type?: string
          organization_id?: string | null
          patient_id?: string | null
          phone_number: string
          read_at?: string | null
          replied_at?: string | null
          reply_content?: string | null
          retry_count?: number | null
          sent_at?: string | null
          status?: string
          template_key?: string | null
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          message_id?: string | null
          message_type?: string
          organization_id?: string | null
          patient_id?: string | null
          phone_number?: string
          read_at?: string | null
          replied_at?: string | null
          reply_content?: string | null
          retry_count?: number | null
          sent_at?: string | null
          status?: string
          template_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_metrics_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_metrics_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_metrics_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "patient_appointment_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_metrics_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "therapist_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_metrics_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "today_appointments_with_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_metrics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_metrics_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_metrics_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_metrics_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_templates: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          name: string
          organization_id: string | null
          status: string
          template_key: string
          updated_at: string
          variables: string[] | null
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          id?: string
          name: string
          organization_id?: string | null
          status?: string
          template_key: string
          updated_at?: string
          variables?: string[] | null
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          name?: string
          organization_id?: string | null
          status?: string
          template_key?: string
          updated_at?: string
          variables?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_webhook_logs: {
        Row: {
          created_at: string
          event_type: string
          id: string
          message_content: string | null
          message_id: string | null
          phone_number: string | null
          processed: boolean | null
          processing_result: string | null
          raw_payload: Json | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          message_content?: string | null
          message_id?: string | null
          phone_number?: string | null
          processed?: boolean | null
          processing_result?: string | null
          raw_payload?: Json | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          message_content?: string | null
          message_id?: string | null
          phone_number?: string | null
          processed?: boolean | null
          processing_result?: string | null
          raw_payload?: Json | null
        }
        Relationships: []
      }
      xp_transactions: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          patient_id: string
          reason: string
          xp_amount: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          patient_id: string
          reason: string
          xp_amount: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          patient_id?: string
          reason?: string
          xp_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "xp_transactions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "xp_transactions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "xp_transactions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      aniversariantes_mes: {
        Row: {
          birth_date: string | null
          dia: number | null
          email: string | null
          id: string | null
          idade: number | null
          name: string | null
          organization_id: string | null
          phone: string | null
        }
        Insert: {
          birth_date?: string | null
          dia?: never
          email?: string | null
          id?: string | null
          idade?: never
          name?: string | null
          organization_id?: string | null
          phone?: string | null
        }
        Update: {
          birth_date?: string | null
          dia?: never
          email?: string | null
          id?: string | null
          idade?: never
          name?: string | null
          organization_id?: string | null
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments_full: {
        Row: {
          cancellation_reason: string | null
          created_at: string | null
          created_by: string | null
          date: string | null
          duration: number | null
          end_time: string | null
          full_datetime: string | null
          id: string | null
          notes: string | null
          patient_email: string | null
          patient_id: string | null
          patient_name: string | null
          patient_phone: string | null
          reminder_sent: boolean | null
          room: string | null
          start_time: string | null
          status: string | null
          therapist_crefito: string | null
          therapist_id: string | null
          therapist_name: string | null
          type: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
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
          {
            foreignKeyName: "appointments_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapist_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_metrics: {
        Row: {
          avg_pain_level: number | null
          avg_session_duration: number | null
          month: string | null
          total_sessions: number | null
          treated_patients: number | null
        }
        Relationships: []
      }
      crm_metricas_leads: {
        Row: {
          convertidos: number | null
          dias_medio_no_funil: number | null
          estagio: string | null
          leads_frios: number | null
          origem: string | null
          score_medio: number | null
          total: number | null
        }
        Relationships: []
      }
      eventos_resumo: {
        Row: {
          categoria: string | null
          custo_checklist: number | null
          custo_prestadores: number | null
          data_fim: string | null
          data_inicio: string | null
          id: string | null
          nome: string | null
          pagamentos_totais: number | null
          status: string | null
          total_participantes: number | null
          total_prestadores: number | null
        }
        Relationships: []
      }
      financial_metrics: {
        Row: {
          avg_ticket: number | null
          month: string | null
          total_purchases: number | null
          total_revenue: number | null
          unique_customers: number | null
        }
        Relationships: []
      }
      financial_summary: {
        Row: {
          month: string | null
          organization_id: string | null
          paid_appointments: number | null
          pending_revenue: number | null
          total_appointments: number | null
          total_revenue: number | null
          unique_patients: number | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      fluxo_caixa_resumo: {
        Row: {
          entradas: number | null
          mes: string | null
          organization_id: string | null
          saidas: number | null
          saldo: number | null
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_caixa_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_metrics: {
        Row: {
          attendance_rate: number | null
          cancelled_appointments: number | null
          confirmed_appointments: number | null
          month: string | null
          total_appointments: number | null
          unique_patients: number | null
        }
        Relationships: []
      }
      new_patients_by_period: {
        Row: {
          new_patients: number | null
          organization_id: string | null
          week_start: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_activity_summary: {
        Row: {
          activity_status: string | null
          created_at: string | null
          id: string | null
          last_appointment_date: string | null
          name: string | null
          organization_id: string | null
          sessions_available: number | null
          status: string | null
          total_completed_sessions: number | null
        }
        Insert: {
          activity_status?: never
          created_at?: string | null
          id?: string | null
          last_appointment_date?: never
          name?: string | null
          organization_id?: string | null
          sessions_available?: never
          status?: string | null
          total_completed_sessions?: never
        }
        Update: {
          activity_status?: never
          created_at?: string | null
          id?: string | null
          last_appointment_date?: never
          name?: string | null
          organization_id?: string | null
          sessions_available?: never
          status?: string | null
          total_completed_sessions?: never
        }
        Relationships: [
          {
            foreignKeyName: "patients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_analytics: {
        Row: {
          avg_age: number | null
          count: number | null
          status: string | null
        }
        Relationships: []
      }
      patient_appointment_summary: {
        Row: {
          date: string | null
          end_time: string | null
          id: string | null
          notes: string | null
          payment_status: string | null
          session_type: string | null
          start_time: string | null
          status: string | null
          therapist_name: string | null
        }
        Relationships: []
      }
      patient_timeline: {
        Row: {
          exercise_compliance: number | null
          functional_improvement: number | null
          functional_score: number | null
          pain_improvement: number | null
          pain_level: number | null
          patient_id: string | null
          patient_name: string | null
          session_date: string | null
          session_effectiveness: number | null
          session_id: string | null
          session_type: string | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treatment_sessions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_sessions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
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
      profiles_safe: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string | null
          organization_id: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          organization_id?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          organization_id?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      report_summaries: {
        Row: {
          created_at: string | null
          id: string | null
          main_metric: number | null
          patient_id: string | null
          patient_name: string | null
          plan_id: string | null
          plan_name: string | null
          report_type: string | null
        }
        Relationships: []
      }
      security_events: {
        Row: {
          action: string | null
          id: string | null
          new_data: Json | null
          old_data: Json | null
          table_name: string | null
          timestamp: string | null
          user_email: string | null
          user_name: string | null
        }
        Relationships: []
      }
      suspicious_login_activity: {
        Row: {
          email: string | null
          failed_attempts: number | null
          ip_addresses: string[] | null
          last_attempt: string | null
        }
        Relationships: []
      }
      therapist_dashboard: {
        Row: {
          created_at: string | null
          date: string | null
          end_time: string | null
          id: string | null
          notes: string | null
          patient_id: string | null
          patient_name: string | null
          patient_phone: string | null
          payment_status: string | null
          session_type: string | null
          start_time: string | null
          status: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
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
      therapist_stats: {
        Row: {
          cancelled_count: number | null
          completed_count: number | null
          confirmed_count: number | null
          full_name: string | null
          id: string | null
          no_show_count: number | null
          role: Database["public"]["Enums"]["user_role"] | null
          scheduled_count: number | null
          total_appointments: number | null
        }
        Relationships: []
      }
      today_appointments_with_packages: {
        Row: {
          active_package_id: string | null
          appointment_date: string | null
          end_time: string | null
          id: string | null
          organization_id: string | null
          patient_id: string | null
          patient_name: string | null
          start_time: string | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "aniversariantes_mes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_activity_summary"
            referencedColumns: ["id"]
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
    }
    Functions: {
      calcular_lead_score: {
        Args: { lead_row: Database["public"]["Tables"]["leads"]["Row"] }
        Returns: number
      }
      calculate_comprehensive_adherence: {
        Args: {
          p_end_date: string
          p_patient_id: string
          p_plan_id: string
          p_start_date: string
        }
        Returns: {
          adherence_percentage: number
          avg_functional_score: number
          avg_pain_level: number
          completed_exercises: number
          progression_score: number
          session_count: number
          total_exercises: number
        }[]
      }
      calculate_pain_evolution: {
        Args: { p_days?: number; p_patient_id: string }
        Returns: {
          avg_intensity: number
          date: string
          session_count: number
        }[]
      }
      calculate_patient_trends: {
        Args: { p_days?: number; p_patient_id: string }
        Returns: {
          compliance_trend: string
          functional_trend: string
          pain_trend: string
        }[]
      }
      calculate_session_metrics: {
        Args: { session_id_param: string }
        Returns: undefined
      }
      can_view_patient: {
        Args: { _patient_id: string; _user_id: string }
        Returns: boolean
      }
      can_view_profile: {
        Args: { _profile_id: string; _user_id: string }
        Returns: boolean
      }
      check_appointment_conflict:
        | {
            Args: {
              p_date: string
              p_end_time: string
              p_exclude_id?: string
              p_start_time: string
              p_therapist_id: string
            }
            Returns: boolean
          }
        | {
            Args: {
              p_end_time: string
              p_exclude_appointment_id?: string
              p_start_time: string
              p_therapist_id: string
            }
            Returns: boolean
          }
      check_rate_limit: {
        Args: {
          _endpoint: string
          _identifier: string
          _max_requests: number
          _window_minutes: number
        }
        Returns: Json
      }
      cleanup_expired_notification_data: { Args: never; Returns: undefined }
      cleanup_old_audit_logs: { Args: never; Returns: undefined }
      cleanup_old_notification_data: { Args: never; Returns: undefined }
      cleanup_old_notification_logs: { Args: never; Returns: undefined }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      create_audit_log: {
        Args: {
          p_action: string
          p_ip_address?: unknown
          p_new_data?: Json
          p_old_data?: Json
          p_organization_id: string
          p_record_id: string
          p_table_name: string
          p_user_agent?: string
          p_user_id: string
        }
        Returns: string
      }
      create_demo_organization: { Args: never; Returns: string }
      create_test_user: {
        Args: { p_email: string; p_metadata?: Json; p_password: string }
        Returns: string
      }
      create_user_invitation: {
        Args: { _email: string; _role: Database["public"]["Enums"]["app_role"] }
        Returns: Json
      }
      decrementar_sessao_voucher: {
        Args: { _user_voucher_id: string }
        Returns: boolean
      }
      delete_user_notification_data: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      encrypt_cpf: { Args: { cpf_plain: string }; Returns: string }
      estagiario_pode_acessar_paciente: {
        Args: { _patient_id: string; _user_id: string }
        Returns: boolean
      }
      export_user_notification_data: {
        Args: { target_user_id: string }
        Returns: Json
      }
      find_similar_patients: {
        Args: {
          clinical_embedding: string
          match_count?: number
          match_threshold?: number
          organization_id_param?: string
        }
        Returns: {
          age: number
          id: string
          name: string
          primary_diagnosis: string
          similarity: number
        }[]
      }
      generate_demo_uuid: { Args: { role_name: string }; Returns: string }
      generate_demo_uuid_v2: { Args: { role_name: string }; Returns: string }
      generate_mfa_otp: { Args: { _user_id: string }; Returns: string }
      generate_weekly_reports: { Args: never; Returns: undefined }
      get_available_time_slots: {
        Args: {
          p_date: string
          p_duration_minutes?: number
          p_therapist_id: string
        }
        Returns: {
          time_slot: string
        }[]
      }
      get_cache_hit_ratio: {
        Args: never
        Returns: {
          ratio: number
        }[]
      }
      get_clinical_metrics: {
        Args: { start_date?: string }
        Returns: {
          avg_pain_level: number
          avg_session_duration: number
          month: string
          total_sessions: number
          treated_patients: number
        }[]
      }
      get_current_user_org_id: { Args: never; Returns: string }
      get_email_stats: {
        Args: never
        Returns: {
          success_rate: number
          total_failed: number
          total_pending: number
          total_scheduled: number
          total_sent: number
        }[]
      }
      get_financial_metrics: {
        Args: { start_date?: string }
        Returns: {
          avg_ticket: number
          month: string
          total_purchases: number
          total_revenue: number
          unique_customers: number
        }[]
      }
      get_monthly_metrics: {
        Args: { start_date?: string }
        Returns: {
          attendance_rate: number
          cancelled_appointments: number
          confirmed_appointments: number
          month: string
          total_appointments: number
          unique_patients: number
        }[]
      }
      get_notification_analytics: {
        Args: { p_end_date?: string; p_start_date?: string; p_user_id?: string }
        Returns: {
          click_rate: number
          delivery_rate: number
          notification_type: string
          total_clicked: number
          total_delivered: number
          total_failed: number
          total_sent: number
        }[]
      }
      get_patient_analytics: {
        Args: never
        Returns: {
          avg_age: number
          count: number
          status: string
        }[]
      }
      get_patient_financial_summary: {
        Args: { p_patient_id: string }
        Returns: {
          last_payment_date: string
          pending_payments_count: number
          total_amount_paid: number
          total_sessions_purchased: number
          total_sessions_remaining: number
          total_sessions_used: number
        }[]
      }
      get_patient_full_info: { Args: { patient_uuid: string }; Returns: Json }
      get_patient_package_balance: {
        Args: { p_patient_id: string }
        Returns: {
          expires_at: string
          package_id: string
          package_name: string
          sessions_remaining: number
        }[]
      }
      get_patient_progress_summary: {
        Args: { patient_id_param: string }
        Returns: {
          avg_exercise_compliance: number
          avg_functional_improvement: number
          avg_pain_improvement: number
          completed_sessions: number
          latest_functional_score: number
          latest_pain_level: number
          total_sessions: number
          trend_direction: string
        }[]
      }
      get_table_sizes: {
        Args: never
        Returns: {
          index_size: string
          row_count: number
          table_name: string
          toast_size: string
          total_size: string
        }[]
      }
      get_unused_indexes: {
        Args: never
        Returns: {
          index_name: string
          index_scans: number
          index_size: string
          schema_name: string
          table_name: string
        }[]
      }
      get_user_organization_id: { Args: { _user_id: string }; Returns: string }
      get_user_permissions: {
        Args: never
        Returns: {
          can_access_evolutions: boolean
          can_access_financial_data: boolean
          can_create_appointment: boolean
          can_delete_appointment: boolean
          can_edit_appointment: boolean
          can_manage_payments: boolean
          can_mark_session_status: boolean
          can_view_all_appointments: boolean
        }[]
      }
      get_user_role: { Args: never; Returns: string }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_precadastro_token_usage: {
        Args: { _token: string }
        Returns: string
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_assigned_therapist: {
        Args: { appointment_therapist_id: string }
        Returns: boolean
      }
      is_fisio_or_admin: { Args: { _user_id: string }; Returns: boolean }
      is_organization_admin: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_patient_owner: { Args: { patient_id: string }; Returns: boolean }
      is_voucher_operation_authorized: { Args: never; Returns: boolean }
      log_audit_event: {
        Args: {
          _action: string
          _new_data?: Json
          _old_data?: Json
          _record_id: string
          _table_name: string
        }
        Returns: undefined
      }
      log_login_attempt: {
        Args: {
          _email: string
          _ip_address?: unknown
          _success: boolean
          _user_agent?: string
        }
        Returns: undefined
      }
      log_notification: {
        Args: {
          p_body: string
          p_data?: Json
          p_status?: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      log_security_event: {
        Args: {
          _event_type: string
          _metadata?: Json
          _severity?: string
          _user_id: string
        }
        Returns: string
      }
      manage_consent: {
        Args: { _consent_type: string; _granted: boolean; _user_id: string }
        Returns: string
      }
      process_email_queue: {
        Args: never
        Returns: {
          content: string
          notification_id: string
          recipient_email: string
          subject: string
        }[]
      }
      publish_goal_profile: { Args: { profile_id: string }; Returns: Json }
      refresh_analytics_views: { Args: never; Returns: undefined }
      request_data_export: {
        Args: { _request_type: string; _user_id: string }
        Returns: string
      }
      revoke_invitation: {
        Args: { _invitation_id: string }
        Returns: undefined
      }
      search_exercises_semantic: {
        Args: {
          match_count?: number
          match_threshold?: number
          organization_id_param?: string
          query_embedding: string
        }
        Returns: {
          category: string
          description: string
          difficulty: string
          id: string
          name: string
          similarity: number
        }[]
      }
      search_protocols_semantic: {
        Args: {
          match_count?: number
          match_threshold?: number
          organization_id_param?: string
          query_embedding: string
        }
        Returns: {
          condition_name: string
          duration_weeks: number
          id: string
          name: string
          protocol_type: string
          similarity: number
        }[]
      }
      setup_demo_user: {
        Args: {
          _email: string
          _full_name: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: undefined
      }
      should_send_notification: {
        Args: {
          p_current_time?: string
          p_notification_type: string
          p_user_id: string
        }
        Returns: boolean
      }
      update_notification_status: {
        Args: {
          p_error_message?: string
          p_notification_id: string
          p_status: string
        }
        Returns: boolean
      }
      update_patient_streak: {
        Args: { _patient_id: string }
        Returns: undefined
      }
      use_package_session: { Args: { _package_id: string }; Returns: boolean }
      user_belongs_to_organization: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      user_belongs_to_organization_check: {
        Args: { _org_id: string }
        Returns: boolean
      }
      user_has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      user_has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      user_is_admin: { Args: { _user_id: string }; Returns: boolean }
      user_is_fisio_or_admin: { Args: { _user_id: string }; Returns: boolean }
      validate_cpf: { Args: { cpf_input: string }; Returns: boolean }
      validate_crefito: { Args: { crefito_input: string }; Returns: boolean }
      validate_invitation: {
        Args: { _token: string; _user_id: string }
        Returns: boolean
      }
      verify_mfa_otp: {
        Args: { _code: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "fisioterapeuta" | "estagiario" | "paciente"
      communication_status:
        | "pendente"
        | "enviado"
        | "entregue"
        | "lido"
        | "falha"
      communication_type: "whatsapp" | "sms" | "email" | "push"
      goal_audit_action: "CREATE" | "UPDATE" | "DELETE" | "PUBLISH" | "ARCHIVE"
      goal_profile_status: "DRAFT" | "PUBLISHED" | "ARCHIVED"
      goal_status: "pending" | "in_progress" | "achieved" | "abandoned"
      material_specialty:
        | "ortopedia"
        | "neurologia"
        | "geriatria"
        | "esportiva"
        | "pediatria"
        | "respiratoria"
        | "geral"
      package_status: "ativo" | "consumido" | "expirado" | "cancelado"
      pathology_status: "active" | "treated" | "monitoring"
      precadastro_status: "pendente" | "concluido" | "expirado" | "cancelado"
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
      app_role: ["admin", "fisioterapeuta", "estagiario", "paciente"],
      communication_status: [
        "pendente",
        "enviado",
        "entregue",
        "lido",
        "falha",
      ],
      communication_type: ["whatsapp", "sms", "email", "push"],
      goal_audit_action: ["CREATE", "UPDATE", "DELETE", "PUBLISH", "ARCHIVE"],
      goal_profile_status: ["DRAFT", "PUBLISHED", "ARCHIVED"],
      goal_status: ["pending", "in_progress", "achieved", "abandoned"],
      material_specialty: [
        "ortopedia",
        "neurologia",
        "geriatria",
        "esportiva",
        "pediatria",
        "respiratoria",
        "geral",
      ],
      package_status: ["ativo", "consumido", "expirado", "cancelado"],
      pathology_status: ["active", "treated", "monitoring"],
      precadastro_status: ["pendente", "concluido", "expirado", "cancelado"],
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
