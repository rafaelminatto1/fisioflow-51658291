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
      achievements: {
        Row: {
          category: string | null
          code: string
          created_at: string | null
          description: string
          icon: string | null
          id: string
          requirements: Json | null
          title: string
          xp_reward: number | null
        }
        Insert: {
          category?: string | null
          code: string
          created_at?: string | null
          description: string
          icon?: string | null
          id?: string
          requirements?: Json | null
          title: string
          xp_reward?: number | null
        }
        Update: {
          category?: string | null
          code?: string
          created_at?: string | null
          description?: string
          icon?: string | null
          id?: string
          requirements?: Json | null
          title?: string
          xp_reward?: number | null
        }
        Relationships: []
      }
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
            foreignKeyName: "achievements_log_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
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
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_gamification: {
        Row: {
          created_at: string | null
          current_streak: number | null
          current_xp: number | null
          id: string
          last_activity_date: string | null
          level: number | null
          longest_streak: number | null
          patient_id: string
          total_points: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_streak?: number | null
          current_xp?: number | null
          id?: string
          last_activity_date?: string | null
          level?: number | null
          longest_streak?: number | null
          patient_id: string
          total_points?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_streak?: number | null
          current_xp?: number | null
          id?: string
          last_activity_date?: string | null
          level?: number | null
          longest_streak?: number | null
          patient_id?: string
          total_points?: number | null
          updated_at?: string | null
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
      quest_definitions: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          title: string
          xp_reward: number
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          title: string
          xp_reward?: number
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          title?: string
          xp_reward?: number
        }
        Relationships: []
      }
      xp_transactions: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          patient_id: string
          reason: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          patient_id: string
          reason: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          patient_id?: string
          reason?: string
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
      patient_levels: {
        Row: {
          current_level: number | null
          current_streak: number | null
          patient_id: string | null
          title: string | null
          total_xp: number | null
        }
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: ["admin", "fisioterapeuta", "estagiario", "paciente"]
      communication_status: [
        "pendente",
        "enviado",
        "entregue",
        "lido",
        "falha",
      ]
      communication_type: ["whatsapp", "sms", "email", "push"]
      goal_audit_action: ["CREATE", "UPDATE", "DELETE", "PUBLISH", "ARCHIVE"]
      goal_profile_status: ["DRAFT", "PUBLISHED", "ARCHIVED"]
      goal_status: ["pending", "in_progress", "achieved", "abandoned"]
      material_specialty: [
        "ortopedia",
        "neurologia",
        "geriatria",
        "esportiva",
        "pediatria",
        "respiratoria",
        "geral",
      ]
      package_status: ["ativo", "consumido", "expirado", "cancelado"]
      pathology_status: ["active", "treated", "monitoring"]
      precadastro_status: ["pendente", "concluido", "expirado", "cancelado"]
      soap_status_enum: ["draft", "finalized", "cancelled"]
      user_role: [
        "admin",
        "fisioterapeuta",
        "estagiario",
        "paciente",
        "parceiro",
      ]
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  PublicTableNameOrOptions extends
  | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
  | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
  ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
    Database[PublicTableNameOrOptions["schema"]]["Views"])
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
    Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
  ? R
  : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
    Database["public"]["Views"])
  ? (Database["public"]["Tables"] &
    Database["public"]["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
  ? R
  : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
  | keyof Database["public"]["Tables"]
  | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
  ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Insert: infer I
  }
  ? I
  : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
    Insert: infer I
  }
  ? I
  : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
  | keyof Database["public"]["Tables"]
  | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
  ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Update: infer U
  }
  ? U
  : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
    Update: infer U
  }
  ? U
  : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
  | keyof Database["public"]["Enums"]
  | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
  ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
  : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
  ? Database["public"]["Enums"][PublicEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
  | keyof Database["public"]["CompositeTypes"]
  | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
  ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
  : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof Database["public"]["CompositeTypes"]
  ? Database["public"]["CompositeTypes"][PublicCompositeTypeNameOrOptions]
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
      soap_status_enum: ["draft", "finalized", "cancelled"],
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
