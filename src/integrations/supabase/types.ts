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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      course_requirements: {
        Row: {
          course_name: string
          created_at: string
          id: string
          requirements: Json
          university_name: string
          updated_at: string
        }
        Insert: {
          course_name: string
          created_at?: string
          id?: string
          requirements?: Json
          university_name: string
          updated_at?: string
        }
        Update: {
          course_name?: string
          created_at?: string
          id?: string
          requirements?: Json
          university_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      eligibility_checks: {
        Row: {
          aggregate_score: number
          amount_paid: number
          core_subjects: Json
          created_at: string
          elective_subjects: Json
          eligible_courses: Json
          email: string
          exam_type: string
          id: string
          payment_reference: string | null
          payment_status: string
          phone_number: string
          selected_university: string
          updated_at: string
        }
        Insert: {
          aggregate_score: number
          amount_paid: number
          core_subjects: Json
          created_at?: string
          elective_subjects: Json
          eligible_courses?: Json
          email: string
          exam_type: string
          id?: string
          payment_reference?: string | null
          payment_status?: string
          phone_number: string
          selected_university: string
          updated_at?: string
        }
        Update: {
          aggregate_score?: number
          amount_paid?: number
          core_subjects?: Json
          created_at?: string
          elective_subjects?: Json
          eligible_courses?: Json
          email?: string
          exam_type?: string
          id?: string
          payment_reference?: string | null
          payment_status?: string
          phone_number?: string
          selected_university?: string
          updated_at?: string
        }
        Relationships: []
      }
      university_data: {
        Row: {
          admission_end_date: string | null
          admission_start_date: string | null
          course_description: string | null
          created_at: string
          cutoff_point: number | null
          Faculty: string
          form_purchase_info: string | null
          id: string
          level: string | null
          location: string | null
          official_website: string | null
          programme: string
          requirements: string | null
          university: string
          updated_at: string
        }
        Insert: {
          admission_end_date?: string | null
          admission_start_date?: string | null
          course_description?: string | null
          created_at?: string
          cutoff_point?: number | null
          Faculty: string
          form_purchase_info?: string | null
          id?: string
          level?: string | null
          location?: string | null
          official_website?: string | null
          programme: string
          requirements?: string | null
          university: string
          updated_at?: string
        }
        Update: {
          admission_end_date?: string | null
          admission_start_date?: string | null
          course_description?: string | null
          created_at?: string
          cutoff_point?: number | null
          Faculty?: string
          form_purchase_info?: string | null
          id?: string
          level?: string | null
          location?: string | null
          official_website?: string | null
          programme?: string
          requirements?: string | null
          university?: string
          updated_at?: string
        }
        Relationships: []
      }
      university_payments: {
        Row: {
          amount_paid: number
          created_at: string
          email: string
          id: string
          payment_reference: string | null
          phone_number: string
          university_name: string
          updated_at: string
        }
        Insert: {
          amount_paid: number
          created_at?: string
          email: string
          id?: string
          payment_reference?: string | null
          phone_number: string
          university_name: string
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          created_at?: string
          email?: string
          id?: string
          payment_reference?: string | null
          phone_number?: string
          university_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          payment_status: string
          phone_number: string
          session_token: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          payment_status?: string
          phone_number: string
          session_token: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          payment_status?: string
          phone_number?: string
          session_token?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_submissions: {
        Row: {
          aggregate_score: number
          amount_paid: number | null
          core_subjects: Json
          created_at: string
          elective_subjects: Json
          eligible_courses: Json | null
          email: string
          exam_type: string
          id: string
          payment_reference: string | null
          payment_status: string | null
          phone_number: string
          selected_university: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          aggregate_score: number
          amount_paid?: number | null
          core_subjects: Json
          created_at?: string
          elective_subjects: Json
          eligible_courses?: Json | null
          email: string
          exam_type: string
          id?: string
          payment_reference?: string | null
          payment_status?: string | null
          phone_number: string
          selected_university: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          aggregate_score?: number
          amount_paid?: number | null
          core_subjects?: Json
          created_at?: string
          elective_subjects?: Json
          eligible_courses?: Json | null
          email?: string
          exam_type?: string
          id?: string
          payment_reference?: string | null
          payment_status?: string | null
          phone_number?: string
          selected_university?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
