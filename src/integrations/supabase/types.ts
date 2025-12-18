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
        ]
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
          review_status: string | null
          reviewed_at: string | null
          reviewed_by: string | null
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
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
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
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
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
            foreignKeyName: "medical_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
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
          {
            foreignKeyName: "patients_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
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
          cor: string | null
          created_at: string
          descricao: string | null
          duracao_padrao: number
          id: string
          nome: string
          organization_id: string | null
          permite_agendamento_online: boolean
          tipo_cobranca: string
          updated_at: string
          valor: number
        }
        Insert: {
          ativo?: boolean
          centro_custo?: string | null
          cor?: string | null
          created_at?: string
          descricao?: string | null
          duracao_padrao?: number
          id?: string
          nome: string
          organization_id?: string | null
          permite_agendamento_online?: boolean
          tipo_cobranca?: string
          updated_at?: string
          valor?: number
        }
        Update: {
          ativo?: boolean
          centro_custo?: string | null
          cor?: string | null
          created_at?: string
          descricao?: string | null
          duracao_padrao?: number
          id?: string
          nome?: string
          organization_id?: string | null
          permite_agendamento_online?: boolean
          tipo_cobranca?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "servicos_organization_id_fkey"
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
            foreignKeyName: "soap_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
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
            foreignKeyName: "treatment_sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
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
            foreignKeyName: "waitlist_offers_waitlist_id_fkey"
            columns: ["waitlist_id"]
            isOneToOne: false
            referencedRelation: "waitlist"
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
      profiles_safe: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string | null
          organization_id: string | null
          phone: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: never
          full_name?: string | null
          id?: string | null
          organization_id?: string | null
          phone?: never
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: never
          full_name?: string | null
          id?: string | null
          organization_id?: string | null
          phone?: never
          updated_at?: string | null
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
    }
    Functions: {
      calcular_lead_score: {
        Args: { lead_row: Database["public"]["Tables"]["leads"]["Row"] }
        Returns: number
      }
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
      generate_mfa_otp: { Args: { _user_id: string }; Returns: string }
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
      increment_precadastro_token_usage: {
        Args: { _token: string }
        Returns: string
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
      request_data_export: {
        Args: { _request_type: string; _user_id: string }
        Returns: string
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
      update_patient_streak: {
        Args: { _patient_id: string }
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
