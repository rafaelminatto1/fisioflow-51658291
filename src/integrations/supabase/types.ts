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
      appointments: {
        Row: {
          appointment_date: string
          appointment_time: string
          created_at: string | null
          duration: number | null
          id: string
          notes: string | null
          patient_id: string
          room: string | null
          status: string | null
          therapist_id: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          created_at?: string | null
          duration?: number | null
          id?: string
          notes?: string | null
          patient_id: string
          room?: string | null
          status?: string | null
          therapist_id?: string | null
          type?: string
          updated_at?: string | null
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          created_at?: string | null
          duration?: number | null
          id?: string
          notes?: string | null
          patient_id?: string
          room?: string | null
          status?: string | null
          therapist_id?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
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
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
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
          parceiro_id?: string | null
          status?: string
          updated_at?: string
          valor_padrao_prestador?: number
        }
        Relationships: [
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
          repetitions?: number | null
          sets?: number | null
          updated_at?: string | null
          video_url?: string | null
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
          phone?: string | null
          profile_id?: string | null
          state?: string | null
          status?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Relationships: [
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
          phone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
          id: string
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
          id?: string
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
          id?: string
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
          created_at: string
          descricao: string | null
          id: string
          nome: string
          preco: number
          sessoes: number | null
          stripe_price_id: string | null
          tipo: string
          updated_at: string
          validade_dias: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          preco: number
          sessoes?: number | null
          stripe_price_id?: string | null
          tipo: string
          updated_at?: string
          validade_dias?: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          preco?: number
          sessoes?: number | null
          stripe_price_id?: string | null
          tipo?: string
          updated_at?: string
          validade_dias?: number
        }
        Relationships: []
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
    },
  },
} as const
