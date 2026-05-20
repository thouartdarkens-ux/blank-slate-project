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
      aggregator_prefixes: {
        Row: {
          charge_percentage: number
          created_at: string | null
          id: string
          prefix: string
          title: string
          updated_at: string | null
        }
        Insert: {
          charge_percentage?: number
          created_at?: string | null
          id?: string
          prefix: string
          title: string
          updated_at?: string | null
        }
        Update: {
          charge_percentage?: number
          created_at?: string | null
          id?: string
          prefix?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      alert_settings: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          id: string
          threshold: number | null
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          threshold?: number | null
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          threshold?: number | null
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      alerts: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          message: string
          status: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          message: string
          status?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          message?: string
          status?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      checkout: {
        Row: {
          amount: number
          created_at: string | null
          email: string
          id: string
          mobile_number: string
          name: string
          processed: boolean | null
          quantity: number
          reference: string | null
          status: string
          type: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          email: string
          id?: string
          mobile_number: string
          name: string
          processed?: boolean | null
          quantity: number
          reference?: string | null
          status?: string
          type: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          email?: string
          id?: string
          mobile_number?: string
          name?: string
          processed?: boolean | null
          quantity?: number
          reference?: string | null
          status?: string
          type?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          name: string
          phone_number: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          phone_number: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone_number?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      inventory: {
        Row: {
          created_at: string | null
          id: string
          pin: string
          serial: string
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          pin: string
          serial: string
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          pin?: string
          serial?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          id: string
          phone_number: string
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          phone_number: string
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          phone_number?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      product: {
        Row: {
          count: number | null
          created_at: string | null
          name: string
          price: number
          updated_at: string | null
        }
        Insert: {
          count?: number | null
          created_at?: string | null
          name: string
          price: number
          updated_at?: string | null
        }
        Update: {
          count?: number | null
          created_at?: string | null
          name?: string
          price?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          auth_id: string | null
          created_at: string | null
          department: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          auth_id?: string | null
          created_at?: string | null
          department?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          auth_id?: string | null
          created_at?: string | null
          department?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_auth_id_fkey"
            columns: ["auth_id"]
            isOneToOne: false
            referencedRelation: "users_auth"
            referencedColumns: ["id"]
          },
        ]
      }
      sent_sms_alerts: {
        Row: {
          alert_id: string | null
          alert_type: string
          created_at: string | null
          id: string
          message: string
          phone_number: string
          status: string
          updated_at: string | null
        }
        Insert: {
          alert_id?: string | null
          alert_type: string
          created_at?: string | null
          id?: string
          message: string
          phone_number: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          alert_id?: string | null
          alert_type?: string
          created_at?: string | null
          id?: string
          message?: string
          phone_number?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sent_sms_alerts_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      sold_vouchers: {
        Row: {
          id: string
          phone_number: string
          pin: string
          reference: string | null
          serial: string
          sold_at: string
          type: string
        }
        Insert: {
          id?: string
          phone_number: string
          pin: string
          reference?: string | null
          serial: string
          sold_at?: string
          type: string
        }
        Update: {
          id?: string
          phone_number?: string
          pin?: string
          reference?: string | null
          serial?: string
          sold_at?: string
          type?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          customer_id: string | null
          date: string
          email: string | null
          id: string
          name: string | null
          phone_number: string
          product: string | null
          quantity: number
          reference: string | null
          status: string
        }
        Insert: {
          amount?: number
          customer_id?: string | null
          date?: string
          email?: string | null
          id?: string
          name?: string | null
          phone_number: string
          product?: string | null
          quantity?: number
          reference?: string | null
          status?: string
        }
        Update: {
          amount?: number
          customer_id?: string | null
          date?: string
          email?: string | null
          id?: string
          name?: string | null
          phone_number?: string
          product?: string | null
          quantity?: number
          reference?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_transaction_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string | null
          password: string
          updated_at: string | null
          user_id: number
          username: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          password: string
          updated_at?: string | null
          user_id?: never
          username: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          password?: string
          updated_at?: string | null
          user_id?: never
          username?: string
        }
        Relationships: []
      }
      users_auth: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          is_admin: boolean | null
          password: string
          phone: string | null
          updated_at: string | null
          username: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          is_admin?: boolean | null
          password: string
          phone?: string | null
          updated_at?: string | null
          username: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          is_admin?: boolean | null
          password?: string
          phone?: string | null
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
      ussd_sessions: {
        Row: {
          created_at: string | null
          msisdn: string
          session_data: Json | null
          session_id: string
          stage: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          msisdn: string
          session_data?: Json | null
          session_id: string
          stage?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          msisdn?: string
          session_data?: Json | null
          session_id?: string
          stage?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      voucher_types: {
        Row: {
          aggregator_charge: number | null
          bulk_price: number | null
          cost_price: number | null
          created_at: string | null
          description: string | null
          id: string
          low_stock_threshold: number | null
          name: string
          price: number
          updated_at: string | null
        }
        Insert: {
          aggregator_charge?: number | null
          bulk_price?: number | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          low_stock_threshold?: number | null
          name: string
          price: number
          updated_at?: string | null
        }
        Update: {
          aggregator_charge?: number | null
          bulk_price?: number | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          low_stock_threshold?: number | null
          name?: string
          price?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      vouchers: {
        Row: {
          created_at: string | null
          pin: string
          serial: string
          type: string | null
          voucher_ID: number
        }
        Insert: {
          created_at?: string | null
          pin: string
          serial: string
          type?: string | null
          voucher_ID?: number
        }
        Update: {
          created_at?: string | null
          pin?: string
          serial?: string
          type?: string | null
          voucher_ID?: number
        }
        Relationships: []
      }
      web_pay: {
        Row: {
          amount: number
          created_at: string | null
          email: string
          id: string
          mobile_number: string
          name: string
          network: string
          product_type: string
          quantity: number
          reference: string | null
          status: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          email: string
          id?: string
          mobile_number: string
          name: string
          network: string
          product_type: string
          quantity: number
          reference?: string | null
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          email?: string
          id?: string
          mobile_number?: string
          name?: string
          network?: string
          product_type?: string
          quantity?: number
          reference?: string | null
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      customer_transaction_counts: {
        Row: {
          email: string | null
          id: string | null
          name: string | null
          phone_number: string | null
          total_spent: number | null
          transaction_count: number | null
        }
        Relationships: []
      }
      daily_sales_data: {
        Row: {
          day: string | null
          total_revenue: number | null
          transaction_count: number | null
        }
        Relationships: []
      }
      sold_vouchers_with_transactions: {
        Row: {
          amount: number | null
          id: string | null
          phone_number: string | null
          pin: string | null
          quantity: number | null
          reference: string | null
          serial: string | null
          sold_at: string | null
          status: string | null
          type: string | null
        }
        Relationships: []
      }
      voucher_types_with_stock: {
        Row: {
          bulk_price: number | null
          description: string | null
          id: string | null
          name: string | null
          price: number | null
          stock: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      sync_customers_from_transactions: { Args: never; Returns: undefined }
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
