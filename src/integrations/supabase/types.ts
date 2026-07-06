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
      affiliate_withdrawals: {
        Row: {
          affiliate_id: string
          amount: number
          created_at: string
          id: string
          notes: string | null
          processed_at: string | null
          requested_at: string
          status: string
          updated_at: string
        }
        Insert: {
          affiliate_id: string
          amount: number
          created_at?: string
          id?: string
          notes?: string | null
          processed_at?: string | null
          requested_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          affiliate_id?: string
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          processed_at?: string | null
          requested_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_withdrawals_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliates: {
        Row: {
          balance: number
          commission_rate: number
          created_at: string
          email: string | null
          full_name: string
          id: string
          password_hash: string
          phone: string | null
          transactions_table: string
          updated_at: string
          username: string
          ussd_code: string | null
        }
        Insert: {
          balance?: number
          commission_rate?: number
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          password_hash: string
          phone?: string | null
          transactions_table: string
          updated_at?: string
          username: string
          ussd_code?: string | null
        }
        Update: {
          balance?: number
          commission_rate?: number
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          password_hash?: string
          phone?: string | null
          transactions_table?: string
          updated_at?: string
          username?: string
          ussd_code?: string | null
        }
        Relationships: []
      }
      balance_alerts: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          last_alert_sent_at: string | null
          phone_numbers: string[]
          threshold: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_alert_sent_at?: string | null
          phone_numbers?: string[]
          threshold?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_alert_sent_at?: string | null
          phone_numbers?: string[]
          threshold?: number
          updated_at?: string
        }
        Relationships: []
      }
      bundle_prices: {
        Row: {
          capacity: string
          cost_price: number
          created_at: string
          id: string
          in_stock: boolean
          mb: string
          network: string
          selling_price: number
          updated_at: string
        }
        Insert: {
          capacity: string
          cost_price: number
          created_at?: string
          id?: string
          in_stock?: boolean
          mb: string
          network: string
          selling_price?: number
          updated_at?: string
        }
        Update: {
          capacity?: string
          cost_price?: number
          created_at?: string
          id?: string
          in_stock?: boolean
          mb?: string
          network?: string
          selling_price?: number
          updated_at?: string
        }
        Relationships: []
      }
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
      data_transactions: {
        Row: {
          amount: number
          balance_after: number | null
          balance_before: number | null
          capacity: string
          created_at: string
          error_message: string | null
          id: string
          network: string
          order_reference: string | null
          paystack_id: string | null
          phone_number: string
          processing_method: string | null
          purchase_id: string | null
          status: string
          transaction_reference: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          balance_after?: number | null
          balance_before?: number | null
          capacity: string
          created_at?: string
          error_message?: string | null
          id?: string
          network: string
          order_reference?: string | null
          paystack_id?: string | null
          phone_number: string
          processing_method?: string | null
          purchase_id?: string | null
          status?: string
          transaction_reference?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          balance_after?: number | null
          balance_before?: number | null
          capacity?: string
          created_at?: string
          error_message?: string | null
          id?: string
          network?: string
          order_reference?: string | null
          paystack_id?: string | null
          phone_number?: string
          processing_method?: string | null
          purchase_id?: string | null
          status?: string
          transaction_reference?: string | null
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
      manual_processing_settings: {
        Row: {
          admin_phone: string
          created_at: string
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          admin_phone?: string
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          admin_phone?: string
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      nalo_ussd_sessions: {
        Row: {
          created_at: string
          id: string
          msisdn: string
          network: string | null
          session_data: Json
          session_id: string
          stage: string
          updated_at: string
          userid: string
        }
        Insert: {
          created_at?: string
          id?: string
          msisdn: string
          network?: string | null
          session_data?: Json
          session_id: string
          stage?: string
          updated_at?: string
          userid: string
        }
        Update: {
          created_at?: string
          id?: string
          msisdn?: string
          network?: string | null
          session_data?: Json
          session_id?: string
          stage?: string
          updated_at?: string
          userid?: string
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
      ussd_sessions: {
        Row: {
          created_at: string
          msisdn: string
          session_data: Json
          session_id: string
          stage: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          msisdn: string
          session_data?: Json
          session_id: string
          stage?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          msisdn?: string
          session_data?: Json
          session_id?: string
          stage?: string
          updated_at?: string
        }
        Relationships: []
      }
      webhook_transactions: {
        Row: {
          amount: number | null
          created_at: string
          full_name: string | null
          id: string
          phone_number: string | null
          product: string | null
          quantity: number | null
          raw_payload: Json | null
          reference: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone_number?: string | null
          product?: string | null
          quantity?: number | null
          raw_payload?: Json | null
          reference?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone_number?: string | null
          product?: string | null
          quantity?: number | null
          raw_payload?: Json | null
          reference?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      webhook_transactions_user_1: {
        Row: {
          amount: number | null
          created_at: string
          full_name: string | null
          id: string
          phone_number: string | null
          product: string | null
          quantity: number | null
          raw_payload: Json | null
          reference: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone_number?: string | null
          product?: string | null
          quantity?: number | null
          raw_payload?: Json | null
          reference?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone_number?: string | null
          product?: string | null
          quantity?: number | null
          raw_payload?: Json | null
          reference?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      webhook_transactions_user_2: {
        Row: {
          amount: number | null
          created_at: string
          full_name: string | null
          id: string
          phone_number: string | null
          product: string | null
          quantity: number | null
          raw_payload: Json | null
          reference: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone_number?: string | null
          product?: string | null
          quantity?: number | null
          raw_payload?: Json | null
          reference?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone_number?: string | null
          product?: string | null
          quantity?: number | null
          raw_payload?: Json | null
          reference?: string | null
          status?: string | null
          updated_at?: string
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
