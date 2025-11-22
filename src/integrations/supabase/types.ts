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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      ai_providers: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          provider_key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          provider_key: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          provider_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      announcement_recipients: {
        Row: {
          announcement_id: string
          created_at: string
          id: string
          is_read: boolean
          read_at: string | null
          user_id: string
        }
        Insert: {
          announcement_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          read_at?: string | null
          user_id: string
        }
        Update: {
          announcement_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_recipients_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          content: string
          created_at: string
          creator_id: string
          expires_at: string | null
          id: string
          is_active: boolean
          priority: string
          target_audience: string
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          creator_id: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          priority?: string
          target_audience: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          creator_id?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          priority?: string
          target_audience?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: unknown
          resource_id: string | null
          resource_type: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      child_class_assignments: {
        Row: {
          academic_year: string
          child_id: string
          class_parent_id: string | null
          created_at: string | null
          id: string
          is_current: boolean | null
          parent_id: string
          updated_at: string | null
        }
        Insert: {
          academic_year?: string
          child_id: string
          class_parent_id?: string | null
          created_at?: string | null
          id?: string
          is_current?: boolean | null
          parent_id: string
          updated_at?: string | null
        }
        Update: {
          academic_year?: string
          child_id?: string
          class_parent_id?: string | null
          created_at?: string | null
          id?: string
          is_current?: boolean | null
          parent_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "child_class_assignments_class_parent_id_fkey"
            columns: ["class_parent_id"]
            isOneToOne: false
            referencedRelation: "classes_parent"
            referencedColumns: ["id"]
          },
        ]
      }
      child_subject_assignments: {
        Row: {
          academic_year: string
          child_id: string
          created_at: string | null
          id: string
          is_current: boolean | null
          parent_id: string
          subject_parent_id: string | null
          updated_at: string | null
        }
        Insert: {
          academic_year?: string
          child_id: string
          created_at?: string | null
          id?: string
          is_current?: boolean | null
          parent_id: string
          subject_parent_id?: string | null
          updated_at?: string | null
        }
        Update: {
          academic_year?: string
          child_id?: string
          created_at?: string | null
          id?: string
          is_current?: boolean | null
          parent_id?: string
          subject_parent_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "child_subject_assignments_subject_parent_id_fkey"
            columns: ["subject_parent_id"]
            isOneToOne: false
            referencedRelation: "subjects_parent"
            referencedColumns: ["id"]
          },
        ]
      }
      classes_parent: {
        Row: {
          class_key: string
          class_name: string
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          parent_id: string
          updated_at: string
        }
        Insert: {
          class_key: string
          class_name: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          parent_id: string
          updated_at?: string
        }
        Update: {
          class_key?: string
          class_name?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          parent_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      document_pages: {
        Row: {
          content: string | null
          created_at: string
          document_id: string
          id: string
          page_number: number
        }
        Insert: {
          content?: string | null
          created_at?: string
          document_id: string
          id?: string
          page_number: number
        }
        Update: {
          content?: string | null
          created_at?: string
          document_id?: string
          id?: string
          page_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_pages_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          class_parent_id: string | null
          created_at: string
          id: string
          processing_status: string | null
          subject_parent_id: string | null
          title: string
          total_pages: number | null
          user_id: string
        }
        Insert: {
          class_parent_id?: string | null
          created_at?: string
          id?: string
          processing_status?: string | null
          subject_parent_id?: string | null
          title: string
          total_pages?: number | null
          user_id: string
        }
        Update: {
          class_parent_id?: string | null
          created_at?: string
          id?: string
          processing_status?: string | null
          subject_parent_id?: string | null
          title?: string
          total_pages?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_class_parent_id_fkey"
            columns: ["class_parent_id"]
            isOneToOne: false
            referencedRelation: "classes_parent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_subject_parent_id_fkey"
            columns: ["subject_parent_id"]
            isOneToOne: false
            referencedRelation: "subjects_parent"
            referencedColumns: ["id"]
          },
        ]
      }
      email_queue: {
        Row: {
          attempts: number
          created_at: string
          error_message: string | null
          id: string
          max_attempts: number
          recipient_email: string
          recipient_id: string
          scheduled_for: string
          sent_at: string | null
          status: string
          subject: string
          template_data: Json
          template_name: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          error_message?: string | null
          id?: string
          max_attempts?: number
          recipient_email: string
          recipient_id: string
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          subject: string
          template_data?: Json
          template_name: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          error_message?: string | null
          id?: string
          max_attempts?: number
          recipient_email?: string
          recipient_id?: string
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          subject?: string
          template_data?: Json
          template_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          parent_message_id: string | null
          recipient_id: string
          sender_id: string
          subject: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          parent_message_id?: string | null
          recipient_id: string
          sender_id: string
          subject: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          parent_message_id?: string | null
          recipient_id?: string
          sender_id?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          related_id: string | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          related_id?: string | null
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          related_id?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      paper_assignments: {
        Row: {
          assigned_to_user_id: string
          created_at: string | null
          id: string
          paper_id: string
        }
        Insert: {
          assigned_to_user_id: string
          created_at?: string | null
          id?: string
          paper_id: string
        }
        Update: {
          assigned_to_user_id?: string
          created_at?: string | null
          id?: string
          paper_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "paper_assignments_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "question_papers"
            referencedColumns: ["id"]
          },
        ]
      }
      paper_attempts: {
        Row: {
          answers: Json | null
          attempt_number: number | null
          completed_at: string | null
          current_question_index: number | null
          feedback: string | null
          id: string
          is_paused: boolean | null
          last_activity_at: string | null
          paper_id: string
          progress_percentage: number | null
          score: number | null
          show_results: boolean | null
          started_at: string | null
          time_remaining: number | null
          total_questions: number | null
          user_id: string
        }
        Insert: {
          answers?: Json | null
          attempt_number?: number | null
          completed_at?: string | null
          current_question_index?: number | null
          feedback?: string | null
          id?: string
          is_paused?: boolean | null
          last_activity_at?: string | null
          paper_id: string
          progress_percentage?: number | null
          score?: number | null
          show_results?: boolean | null
          started_at?: string | null
          time_remaining?: number | null
          total_questions?: number | null
          user_id: string
        }
        Update: {
          answers?: Json | null
          attempt_number?: number | null
          completed_at?: string | null
          current_question_index?: number | null
          feedback?: string | null
          id?: string
          is_paused?: boolean | null
          last_activity_at?: string | null
          paper_id?: string
          progress_percentage?: number | null
          score?: number | null
          show_results?: boolean | null
          started_at?: string | null
          time_remaining?: number | null
          total_questions?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "paper_attempts_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "question_papers"
            referencedColumns: ["id"]
          },
        ]
      }
      paper_sessions: {
        Row: {
          created_at: string | null
          id: string
          ip_address: unknown
          is_active: boolean | null
          last_ping: string | null
          paper_attempt_id: string
          started_at: string | null
          updated_at: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          last_ping?: string | null
          paper_attempt_id: string
          started_at?: string | null
          updated_at?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          last_ping?: string | null
          paper_attempt_id?: string
          started_at?: string | null
          updated_at?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "paper_sessions_paper_attempt_id_fkey"
            columns: ["paper_attempt_id"]
            isOneToOne: false
            referencedRelation: "paper_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      paper_violations: {
        Row: {
          auto_resolved: boolean | null
          created_at: string | null
          details: Json | null
          id: string
          occurred_at: string | null
          paper_attempt_id: string
          severity: string | null
          violation_type: string
        }
        Insert: {
          auto_resolved?: boolean | null
          created_at?: string | null
          details?: Json | null
          id?: string
          occurred_at?: string | null
          paper_attempt_id: string
          severity?: string | null
          violation_type: string
        }
        Update: {
          auto_resolved?: boolean | null
          created_at?: string | null
          details?: Json | null
          id?: string
          occurred_at?: string | null
          paper_attempt_id?: string
          severity?: string | null
          violation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "paper_violations_paper_attempt_id_fkey"
            columns: ["paper_attempt_id"]
            isOneToOne: false
            referencedRelation: "paper_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_child_relationships: {
        Row: {
          child_id: string
          created_at: string
          id: string
          parent_id: string
        }
        Insert: {
          child_id: string
          created_at?: string
          id?: string
          parent_id: string
        }
        Update: {
          child_id?: string
          created_at?: string
          id?: string
          parent_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_approved: boolean
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_approved?: boolean
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_approved?: boolean
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      question_paper_questions: {
        Row: {
          id: string
          question_id: string
          question_order: number
          question_paper_id: string
        }
        Insert: {
          id?: string
          question_id: string
          question_order: number
          question_paper_id: string
        }
        Update: {
          id?: string
          question_id?: string
          question_order?: number
          question_paper_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_paper_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_paper_questions_question_paper_id_fkey"
            columns: ["question_paper_id"]
            isOneToOne: false
            referencedRelation: "question_papers"
            referencedColumns: ["id"]
          },
        ]
      }
      question_papers: {
        Row: {
          assign_to_all: boolean | null
          class_parent_id: string | null
          created_at: string
          deleted_at: string | null
          difficulty_filter:
            | Database["public"]["Enums"]["difficulty_level"][]
            | null
          end_time: string | null
          id: string
          is_deleted: boolean | null
          max_attempts: number | null
          show_results: boolean | null
          start_time: string | null
          subject_parent_id: string | null
          time_limit_minutes: number
          title: string
          total_questions: number
          updated_at: string
          user_id: string
        }
        Insert: {
          assign_to_all?: boolean | null
          class_parent_id?: string | null
          created_at?: string
          deleted_at?: string | null
          difficulty_filter?:
            | Database["public"]["Enums"]["difficulty_level"][]
            | null
          end_time?: string | null
          id?: string
          is_deleted?: boolean | null
          max_attempts?: number | null
          show_results?: boolean | null
          start_time?: string | null
          subject_parent_id?: string | null
          time_limit_minutes: number
          title: string
          total_questions: number
          updated_at?: string
          user_id: string
        }
        Update: {
          assign_to_all?: boolean | null
          class_parent_id?: string | null
          created_at?: string
          deleted_at?: string | null
          difficulty_filter?:
            | Database["public"]["Enums"]["difficulty_level"][]
            | null
          end_time?: string | null
          id?: string
          is_deleted?: boolean | null
          max_attempts?: number | null
          show_results?: boolean | null
          start_time?: string | null
          subject_parent_id?: string | null
          time_limit_minutes?: number
          title?: string
          total_questions?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_papers_class_parent_id_fkey"
            columns: ["class_parent_id"]
            isOneToOne: false
            referencedRelation: "classes_parent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_papers_subject_parent_id_fkey"
            columns: ["subject_parent_id"]
            isOneToOne: false
            referencedRelation: "subjects_parent"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          class_parent_id: string | null
          correct_answer: string
          created_at: string
          deleted_at: string | null
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          id: string
          is_deleted: boolean
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          page_number: number | null
          question_text: string
          subject_parent_id: string | null
          topic: string | null
          user_id: string | null
        }
        Insert: {
          class_parent_id?: string | null
          correct_answer: string
          created_at?: string
          deleted_at?: string | null
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          id?: string
          is_deleted?: boolean
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          page_number?: number | null
          question_text: string
          subject_parent_id?: string | null
          topic?: string | null
          user_id?: string | null
        }
        Update: {
          class_parent_id?: string | null
          correct_answer?: string
          created_at?: string
          deleted_at?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          id?: string
          is_deleted?: boolean
          option_a?: string
          option_b?: string
          option_c?: string
          option_d?: string
          page_number?: number | null
          question_text?: string
          subject_parent_id?: string | null
          topic?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_class_parent_id_fkey"
            columns: ["class_parent_id"]
            isOneToOne: false
            referencedRelation: "classes_parent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_subject_parent_id_fkey"
            columns: ["subject_parent_id"]
            isOneToOne: false
            referencedRelation: "subjects_parent"
            referencedColumns: ["id"]
          },
        ]
      }
      security_events: {
        Row: {
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          ip_address: unknown
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      subjects_parent: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          parent_id: string
          subject_key: string | null
          subject_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          parent_id: string
          subject_key?: string | null
          subject_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          parent_id?: string
          subject_key?: string | null
          subject_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_ai_provider_keys: {
        Row: {
          ai_provider_id: string
          created_at: string
          encrypted_api_key: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_provider_id: string
          created_at?: string
          encrypted_api_key: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_provider_id?: string
          created_at?: string
          encrypted_api_key?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_ai_provider_keys_ai_provider_id_fkey"
            columns: ["ai_provider_id"]
            isOneToOne: false
            referencedRelation: "ai_providers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_attempt_paper: {
        Args: { paper_id_param: string; user_id_param: string }
        Returns: Json
      }
      can_view_scheduled_paper: {
        Args: { paper_id: string; user_id: string }
        Returns: boolean
      }
      cleanup_old_paper_sessions: { Args: never; Returns: number }
      debug_auth_context: { Args: never; Returns: Json }
      debug_scheduled_test_insert: {
        Args: { creator_id_param: string }
        Returns: Json
      }
      detect_multiple_sessions: {
        Args: { paper_attempt_id_param: string }
        Returns: Json
      }
      get_active_paper_attempt: {
        Args: { paper_id_param: string; user_id_param: string }
        Returns: Json
      }
      get_current_user_role: { Args: never; Returns: string }
      get_overall_analytics: {
        Args: { parent_user_id: string; time_period_days?: number }
        Returns: {
          active_students: number
          avg_completion_time: number
          avg_success_rate: number
          total_attempts: number
          total_questions_used: number
        }[]
      }
      get_paper_performance: {
        Args: { parent_user_id: string; time_period_days?: number }
        Returns: {
          avg_score: number
          completion_rate: number
          paper_id: string
          paper_title: string
          total_attempts: number
        }[]
      }
      get_question_analytics: {
        Args: {
          difficulty_filter?: string
          parent_user_id: string
          time_period_days?: number
        }
        Returns: {
          avg_time_spent: number
          correct_attempts: number
          difficulty: string
          question_id: string
          question_text: string
          subject_name: string
          success_rate: number
          total_attempts: number
        }[]
      }
      log_paper_violation: {
        Args: {
          details_param?: Json
          paper_attempt_id_param: string
          severity_param?: string
          violation_type_param: string
        }
        Returns: string
      }
      schedule_paper: {
        Args: {
          p_assign_to_all?: boolean
          p_end_time: string
          p_max_attempts?: number
          p_paper_id: string
          p_start_time: string
          p_time_limit_hours?: number
          p_time_limit_minutes?: number
        }
        Returns: string
      }
      seed_default_classes_parent: {
        Args: { p_parent_id: string }
        Returns: undefined
      }
      seed_default_subjects_parent: {
        Args: { p_parent_id: string }
        Returns: undefined
      }
      soft_delete_paper: { Args: { paper_id: string }; Returns: undefined }
      user_owns_paper: { Args: { paper_id_param: string }; Returns: boolean }
      validate_role_change: {
        Args: { new_role: string; target_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      class_level_enum:
        | "grade_1"
        | "grade_2"
        | "grade_3"
        | "grade_4"
        | "grade_5"
        | "grade_6"
        | "grade_7"
        | "grade_8"
        | "grade_9"
        | "grade_10"
        | "grade_11"
        | "grade_12"
      difficulty_level: "easy" | "medium" | "difficult"
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
      class_level_enum: [
        "grade_1",
        "grade_2",
        "grade_3",
        "grade_4",
        "grade_5",
        "grade_6",
        "grade_7",
        "grade_8",
        "grade_9",
        "grade_10",
        "grade_11",
        "grade_12",
      ],
      difficulty_level: ["easy", "medium", "difficult"],
    },
  },
} as const
