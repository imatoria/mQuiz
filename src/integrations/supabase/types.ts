export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
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
      book_documents: {
        Row: {
          book_id: string
          chapter_number: number
          chapter_title: string | null
          created_at: string
          document_id: string
          id: string
          order_index: number
        }
        Insert: {
          book_id: string
          chapter_number: number
          chapter_title?: string | null
          created_at?: string
          document_id: string
          id?: string
          order_index: number
        }
        Update: {
          book_id?: string
          chapter_number?: number
          chapter_title?: string | null
          created_at?: string
          document_id?: string
          id?: string
          order_index?: number
        }
        Relationships: []
      }
      books: {
        Row: {
          author_id: string
          class_level: Database["public"]["Enums"]["class_level"]
          cover_image_url: string | null
          created_at: string
          description: string | null
          id: string
          is_published: boolean
          subject_id: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          class_level: Database["public"]["Enums"]["class_level"]
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          subject_id: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          class_level?: Database["public"]["Enums"]["class_level"]
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          subject_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      document_shares: {
        Row: {
          created_at: string
          document_id: string
          expires_at: string | null
          id: string
          is_active: boolean
          permission_level: string
          shared_by: string
          shared_with: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          document_id: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          permission_level?: string
          shared_by: string
          shared_with: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          document_id?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          permission_level?: string
          shared_by?: string
          shared_with?: string
          updated_at?: string
        }
        Relationships: []
      }
      document_tags: {
        Row: {
          created_at: string
          document_id: string
          id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          document_id: string
          id?: string
          tag_id: string
        }
        Update: {
          created_at?: string
          document_id?: string
          id?: string
          tag_id?: string
        }
        Relationships: []
      }
      document_versions: {
        Row: {
          changes_description: string | null
          created_at: string
          created_by: string
          document_id: string
          file_path: string
          id: string
          title: string
          version_number: number
        }
        Insert: {
          changes_description?: string | null
          created_at?: string
          created_by: string
          document_id: string
          file_path: string
          id?: string
          title: string
          version_number: number
        }
        Update: {
          changes_description?: string | null
          created_at?: string
          created_by?: string
          document_id?: string
          file_path?: string
          id?: string
          title?: string
          version_number?: number
        }
        Relationships: []
      }
      documents: {
        Row: {
          class_level: Database["public"]["Enums"]["class_level"]
          created_at: string
          current_version: number | null
          file_path: string
          id: string
          processing_status: string | null
          subject_id: string
          title: string
          total_pages: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          class_level: Database["public"]["Enums"]["class_level"]
          created_at?: string
          current_version?: number | null
          file_path: string
          id?: string
          processing_status?: string | null
          subject_id: string
          title: string
          total_pages?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          class_level?: Database["public"]["Enums"]["class_level"]
          created_at?: string
          current_version?: number | null
          file_path?: string
          id?: string
          processing_status?: string | null
          subject_id?: string
          title?: string
          total_pages?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
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
          class_level: Database["public"]["Enums"]["class_level"]
          created_at: string
          difficulty_filter:
            | Database["public"]["Enums"]["difficulty_level"][]
            | null
          id: string
          subject_id: string
          time_limit_minutes: number
          title: string
          total_questions: number
          updated_at: string
          user_id: string
        }
        Insert: {
          class_level: Database["public"]["Enums"]["class_level"]
          created_at?: string
          difficulty_filter?:
            | Database["public"]["Enums"]["difficulty_level"][]
            | null
          id?: string
          subject_id: string
          time_limit_minutes: number
          title: string
          total_questions: number
          updated_at?: string
          user_id: string
        }
        Update: {
          class_level?: Database["public"]["Enums"]["class_level"]
          created_at?: string
          difficulty_filter?:
            | Database["public"]["Enums"]["difficulty_level"][]
            | null
          id?: string
          subject_id?: string
          time_limit_minutes?: number
          title?: string
          total_questions?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_papers_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          correct_answer: string
          created_at: string
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          document_id: string
          id: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          page_number: number | null
          question_text: string
        }
        Insert: {
          correct_answer: string
          created_at?: string
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          document_id: string
          id?: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          page_number?: number | null
          question_text: string
        }
        Update: {
          correct_answer?: string
          created_at?: string
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          document_id?: string
          id?: string
          option_a?: string
          option_b?: string
          option_c?: string
          option_d?: string
          page_number?: number | null
          question_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_tests: {
        Row: {
          assign_to_all: boolean
          created_at: string
          creator_id: string
          end_time: string
          id: string
          max_attempts: number
          question_paper_id: string
          start_time: string
          title: string
          updated_at: string
        }
        Insert: {
          assign_to_all?: boolean
          created_at?: string
          creator_id: string
          end_time: string
          id?: string
          max_attempts?: number
          question_paper_id: string
          start_time: string
          title: string
          updated_at?: string
        }
        Update: {
          assign_to_all?: boolean
          created_at?: string
          creator_id?: string
          end_time?: string
          id?: string
          max_attempts?: number
          question_paper_id?: string
          start_time?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_tests_question_paper_id_fkey"
            columns: ["question_paper_id"]
            isOneToOne: false
            referencedRelation: "question_papers"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string | null
          created_at: string
          created_by: string
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by: string
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      test_assignments: {
        Row: {
          assigned_to_user_id: string
          created_at: string
          id: string
          scheduled_test_id: string
        }
        Insert: {
          assigned_to_user_id: string
          created_at?: string
          id?: string
          scheduled_test_id: string
        }
        Update: {
          assigned_to_user_id?: string
          created_at?: string
          id?: string
          scheduled_test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_assignments_scheduled_test_id_fkey"
            columns: ["scheduled_test_id"]
            isOneToOne: false
            referencedRelation: "scheduled_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      test_attempts: {
        Row: {
          answers: Json | null
          attempt_number: number
          completed_at: string | null
          id: string
          scheduled_test_id: string
          score: number | null
          started_at: string
          total_questions: number | null
          user_id: string
        }
        Insert: {
          answers?: Json | null
          attempt_number?: number
          completed_at?: string | null
          id?: string
          scheduled_test_id: string
          score?: number | null
          started_at?: string
          total_questions?: number | null
          user_id: string
        }
        Update: {
          answers?: Json | null
          attempt_number?: number
          completed_at?: string | null
          id?: string
          scheduled_test_id?: string
          score?: number | null
          started_at?: string
          total_questions?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_attempts_scheduled_test_id_fkey"
            columns: ["scheduled_test_id"]
            isOneToOne: false
            referencedRelation: "scheduled_tests"
            referencedColumns: ["id"]
          },
        ]
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
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      class_level:
        | "1"
        | "2"
        | "3"
        | "4"
        | "5"
        | "6"
        | "7"
        | "8"
        | "9"
        | "10"
        | "11"
        | "12"
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
      class_level: [
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "10",
        "11",
        "12",
      ],
      difficulty_level: ["easy", "medium", "difficult"],
    },
  },
} as const
