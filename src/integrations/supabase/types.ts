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
      // ... (rest of the file as generated)
    }
  }
}
