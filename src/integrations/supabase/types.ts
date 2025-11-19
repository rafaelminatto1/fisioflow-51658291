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
            referencedRelation: "patients"
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
            referencedRelation: "patients"
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
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_date: string
          appointment_time: string
          confirmation_method: string | null
          confirmation_status: string | null
          confirmed_at: string | null
          created_at: string | null
          duration: number | null
          id: string
          is_recurring: boolean | null
          notes: string | null
          organization_id: string | null
          patient_id: string
          payment_amount: number | null
          payment_status: string | null
          recurring_until: string | null
          reminder_sent_24h: string | null
          reminder_sent_2h: string | null
          room: string | null
          session_package_id: string | null
          status: string | null
          therapist_id: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          confirmation_method?: string | null
          confirmation_status?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          duration?: number | null
          id?: string
          is_recurring?: boolean | null
          notes?: string | null
          organization_id?: string | null
          patient_id: string
          payment_amount?: number | null
          payment_status?: string | null
          recurring_until?: string | null
          reminder_sent_24h?: string | null
          reminder_sent_2h?: string | null
          room?: string | null
          session_package_id?: string | null
          status?: string | null
          therapist_id?: string | null
          type?: string
          updated_at?: string | null
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          confirmation_method?: string | null
          confirmation_status?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          duration?: number | null
          id?: string
          is_recurring?: boolean | null
          notes?: string | null
          organization_id?: string | null
          patient_id?: string
          payment_amount?: number | null
          payment_status?: string | null
          recurring_until?: string | null
          reminder_sent_24h?: string | null
          reminder_sent_2h?: string | null
          room?: string | null
          session_package_id?: string | null
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
        ]
      }
      audit_log: {
        Row: {
          action: string
          id: string
          ip_address: unknown
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          timestamp: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          timestamp?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          timestamp?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
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
        ]
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
            foreignKeyName: "exercise_plans_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_protocols: {
        Row: {
          condition_name: string
          created_at: string
          created_by: string | null
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
          category: string | null
          created_at: string | null
          description: string | null
          difficulty: string | null
          duration: number | null
          id: string
          image_url: string | null
          instructions: string | null
          name: string
          organization_id: string | null
          repetitions: number | null
          sets: number | null
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          duration?: number | null
          id?: string
          image_url?: string | null
          instructions?: string | null
          name: string
          organization_id?: string | null
          repetitions?: number | null
          sets?: number | null
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          duration?: number | null
          id?: string
          image_url?: string | null
          instructions?: string | null
          name?: string
          organization_id?: string | null
          repetitions?: number | null
          sets?: number | null
          updated_at?: string | null
          video_url?: string | null
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
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
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
          allergies: string | null
          chief_complaint: string | null
          created_at: string | null
          created_by: string
          current_medications: string | null
          family_history: string | null
          id: string
          lifestyle_habits: string | null
          medical_history: string | null
          patient_id: string
          previous_surgeries: string | null
          record_date: string | null
          updated_at: string | null
        }
        Insert: {
          allergies?: string | null
          chief_complaint?: string | null
          created_at?: string | null
          created_by: string
          current_medications?: string | null
          family_history?: string | null
          id?: string
          lifestyle_habits?: string | null
          medical_history?: string | null
          patient_id: string
          previous_surgeries?: string | null
          record_date?: string | null
          updated_at?: string | null
        }
        Update: {
          allergies?: string | null
          chief_complaint?: string | null
          created_at?: string | null
          created_by?: string
          current_medications?: string | null
          family_history?: string | null
          id?: string
          lifestyle_habits?: string | null
          medical_history?: string | null
          patient_id?: string
          previous_surgeries?: string | null
          record_date?: string | null
          updated_at?: string | null
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
            foreignKeyName: "medical_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
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
      pain_maps: {
        Row: {
          appointment_id: string | null
          created_at: string
          created_by: string
          global_pain_level: number
          id: string
          notes: string | null
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
            referencedRelation: "patients"
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
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          birth_date: string | null
          city: string | null
          cpf: string | null
          created_at: string | null
          email: string | null
          emergency_contact: string | null
          emergency_phone: string | null
          health_insurance: string | null
          id: string
          incomplete_registration: boolean | null
          insurance_number: string | null
          name: string
          observations: string | null
          organization_id: string | null
          phone: string | null
          profile_id: string | null
          state: string | null
          status: string | null
          updated_at: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          emergency_contact?: string | null
          emergency_phone?: string | null
          health_insurance?: string | null
          id?: string
          incomplete_registration?: boolean | null
          insurance_number?: string | null
          name: string
          observations?: string | null
          organization_id?: string | null
          phone?: string | null
          profile_id?: string | null
          state?: string | null
          status?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          emergency_contact?: string | null
          emergency_phone?: string | null
          health_insurance?: string | null
          id?: string
          incomplete_registration?: boolean | null
          insurance_number?: string | null
          name?: string
          observations?: string | null
          organization_id?: string | null
          phone?: string | null
          profile_id?: string | null
          state?: string | null
          status?: string | null
          updated_at?: string | null
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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string
          id: string
          onboarding_completed: boolean | null
          organization_id: string | null
          phone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          onboarding_completed?: boolean | null
          organization_id?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          onboarding_completed?: boolean | null
          organization_id?: string | null
          phone?: string | null
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
            foreignKeyName: "reports_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
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
            referencedRelation: "patients"
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
            referencedRelation: "patients"
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
            foreignKeyName: "soap_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      treatment_sessions: {
        Row: {
          appointment_id: string | null
          created_at: string | null
          created_by: string
          duration: number | null
          id: string
          observations: string | null
          pain_level: number | null
          patient_id: string
          patient_response: string | null
          session_date: string | null
          techniques_used: string | null
          updated_at: string | null
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string | null
          created_by: string
          duration?: number | null
          id?: string
          observations?: string | null
          pain_level?: number | null
          patient_id: string
          patient_response?: string | null
          session_date?: string | null
          techniques_used?: string | null
          updated_at?: string | null
        }
        Update: {
          appointment_id?: string | null
          created_at?: string | null
          created_by?: string
          duration?: number | null
          id?: string
          observations?: string | null
          pain_level?: number | null
          patient_id?: string
          patient_response?: string | null
          session_date?: string | null
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
            foreignKeyName: "treatment_sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      vouchers: {
        Row: {
          ativo: boolean
          auto_renew: boolean | null
          created_at: string
          descricao: string | null
          duration_weeks: number | null
          id: string
          nome: string
          preco: number
          sessions_per_week: number | null
          sessoes: number | null
          stripe_price_id: string | null
          tipo: string
          updated_at: string
          validade_dias: number
        }
        Insert: {
          ativo?: boolean
          auto_renew?: boolean | null
          created_at?: string
          descricao?: string | null
          duration_weeks?: number | null
          id?: string
          nome: string
          preco: number
          sessions_per_week?: number | null
          sessoes?: number | null
          stripe_price_id?: string | null
          tipo: string
          updated_at?: string
          validade_dias?: number
        }
        Update: {
          ativo?: boolean
          auto_renew?: boolean | null
          created_at?: string
          descricao?: string | null
          duration_weeks?: number | null
          id?: string
          nome?: string
          preco?: number
          sessions_per_week?: number | null
          sessoes?: number | null
          stripe_price_id?: string | null
          tipo?: string
          updated_at?: string
          validade_dias?: number
        }
        Relationships: []
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
            foreignKeyName: "waitlist_offers_waitlist_id_fkey"
            columns: ["waitlist_id"]
            isOneToOne: false
            referencedRelation: "waitlist"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          appointment_id: string | null
          created_at: string | null
          delivered_at: string | null
          id: string
          message_content: string
          message_type: string
          patient_id: string | null
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
          patient_id?: string | null
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
          patient_id?: string | null
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
            foreignKeyName: "whatsapp_messages_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
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
          ip_addresses: unknown[] | null
          last_attempt: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_view_patient: {
        Args: { _patient_id: string; _user_id: string }
        Returns: boolean
      }
      can_view_profile: {
        Args: { _profile_id: string; _user_id: string }
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
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      create_demo_organization: { Args: never; Returns: string }
      create_user_invitation: {
        Args: { _email: string; _role: Database["public"]["Enums"]["app_role"] }
        Returns: Json
      }
      decrementar_sessao_voucher: {
        Args: { _user_voucher_id: string }
        Returns: boolean
      }
      encrypt_cpf: { Args: { cpf_plain: string }; Returns: string }
      estagiario_pode_acessar_paciente: {
        Args: { _patient_id: string; _user_id: string }
        Returns: boolean
      }
      get_user_organization_id: { Args: { _user_id: string }; Returns: string }
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
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_fisio_or_admin: { Args: { _user_id: string }; Returns: boolean }
      is_organization_admin: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
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
      revoke_invitation: {
        Args: { _invitation_id: string }
        Returns: undefined
      }
      setup_demo_user: {
        Args: {
          _email: string
          _full_name: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: undefined
      }
      use_package_session: { Args: { _package_id: string }; Returns: boolean }
      user_belongs_to_organization: {
        Args: { _org_id: string; _user_id: string }
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
      validate_invitation: {
        Args: { _token: string; _user_id: string }
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
      material_specialty:
        | "ortopedia"
        | "neurologia"
        | "geriatria"
        | "esportiva"
        | "pediatria"
        | "respiratoria"
        | "geral"
      package_status: "ativo" | "consumido" | "expirado" | "cancelado"
      precadastro_status: "pendente" | "concluido" | "expirado" | "cancelado"
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
      precadastro_status: ["pendente", "concluido", "expirado", "cancelado"],
    },
  },
} as const
