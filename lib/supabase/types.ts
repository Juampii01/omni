export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          role: "owner" | "admin" | "manager" | "team"
          department_id: string | null
          is_active: boolean
          last_seen_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          role?: "owner" | "admin" | "manager" | "team"
          department_id?: string | null
          is_active?: boolean
          last_seen_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          role?: "owner" | "admin" | "manager" | "team"
          department_id?: string | null
          is_active?: boolean
          last_seen_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      client_settings: {
        Row: {
          id: string
          business_name: string
          business_logo_url: string | null
          brand_color: string
          brand_accent_color: string
          timezone: string
          currency: string
          fiscal_year_start: number
          onboarding_completed: boolean
          ai_credits_used: number
          ai_credits_limit: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          business_name: string
          business_logo_url?: string | null
          brand_color?: string
          brand_accent_color?: string
          timezone?: string
          currency?: string
          fiscal_year_start?: number
          onboarding_completed?: boolean
          ai_credits_used?: number
          ai_credits_limit?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          business_name?: string
          business_logo_url?: string | null
          brand_color?: string
          brand_accent_color?: string
          timezone?: string
          currency?: string
          fiscal_year_start?: number
          onboarding_completed?: boolean
          ai_credits_used?: number
          ai_credits_limit?: number
          created_at?: string
          updated_at?: string
        }
      }
      departments: {
        Row: {
          id: string
          name: string
          description: string | null
          color: string
          icon: string | null
          parent_id: string | null
          manager_id: string | null
          position: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          color?: string
          icon?: string | null
          parent_id?: string | null
          manager_id?: string | null
          position?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          color?: string
          icon?: string | null
          parent_id?: string | null
          manager_id?: string | null
          position?: number
          created_at?: string
          updated_at?: string
        }
      }
      leads: {
        Row: {
          id: string
          full_name: string
          email: string | null
          phone: string | null
          source: string | null
          origin_angle: string | null
          stage: "new" | "contacted" | "qualified" | "call_scheduled" | "call_done" | "proposal_sent" | "won" | "lost"
          amount: number
          expected_close_date: string | null
          closed_at: string | null
          notes: string | null
          tags: string[]
          assigned_to: string | null
          department_id: string | null
          metadata: Json
          deleted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          full_name: string
          email?: string | null
          phone?: string | null
          source?: string | null
          origin_angle?: string | null
          stage?: "new" | "contacted" | "qualified" | "call_scheduled" | "call_done" | "proposal_sent" | "won" | "lost"
          amount?: number
          expected_close_date?: string | null
          closed_at?: string | null
          notes?: string | null
          tags?: string[]
          assigned_to?: string | null
          department_id?: string | null
          metadata?: Json
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["leads"]["Insert"]>
      }
      tasks: {
        Row: {
          id: string
          title: string
          description: string | null
          status: "backlog" | "todo" | "in_progress" | "review" | "done" | "cancelled"
          priority: "low" | "medium" | "high" | "urgent"
          assigned_to: string | null
          created_by: string
          department_id: string | null
          related_lead_id: string | null
          due_date: string | null
          completed_at: string | null
          position: number
          tags: string[]
          metadata: Json
          deleted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          status?: "backlog" | "todo" | "in_progress" | "review" | "done" | "cancelled"
          priority?: "low" | "medium" | "high" | "urgent"
          assigned_to?: string | null
          created_by: string
          department_id?: string | null
          related_lead_id?: string | null
          due_date?: string | null
          completed_at?: string | null
          position?: number
          tags?: string[]
          metadata?: Json
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["tasks"]["Insert"]>
      }
      kpis: {
        Row: {
          id: string
          period_month: string
          category: string
          metric_name: string
          metric_value: number | null
          metric_target: number | null
          unit: string | null
          department_id: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          period_month: string
          category: string
          metric_name: string
          metric_value?: number | null
          metric_target?: number | null
          unit?: string | null
          department_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["kpis"]["Insert"]>
      }
      ai_conversations: {
        Row: {
          id: string
          user_id: string
          title: string | null
          context_type: "general" | "crm" | "tasks" | "kpis" | "content" | "analysis"
          context_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title?: string | null
          context_type?: "general" | "crm" | "tasks" | "kpis" | "content" | "analysis"
          context_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["ai_conversations"]["Insert"]>
      }
      ai_messages: {
        Row: {
          id: string
          conversation_id: string
          role: "user" | "assistant" | "system"
          content: string
          tokens_used: number | null
          model: string | null
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          role: "user" | "assistant" | "system"
          content: string
          tokens_used?: number | null
          model?: string | null
          created_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["ai_messages"]["Insert"]>
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          action: string
          entity_type: string | null
          entity_id: string | null
          changes: Json | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          entity_type?: string | null
          entity_id?: string | null
          changes?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["audit_logs"]["Insert"]>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"]

export type InsertDto<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"]

export type UpdateDto<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"]
