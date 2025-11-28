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
      card_draws: {
        Row: {
          card_id: string
          deck_id: string
          drawn_at: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          card_id: string
          deck_id: string
          drawn_at?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          card_id?: string
          deck_id?: string
          drawn_at?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "card_draws_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
        ]
      }
      cards: {
        Row: {
          acknowledgement_content: string | null
          acknowledgement_heading: string | null
          benediction_content: string | null
          benediction_heading: string | null
          card_details: string | null
          card_number: number
          card_title: string
          created_at: string | null
          deck_id: string
          deck_name: string | null
          embodiment_ritual_content: string | null
          embodiment_ritual_heading: string | null
          guided_audio_content: string | null
          guided_audio_heading: string | null
          id: string
          image_file_name: string | null
          living_inquiry_content: string | null
          living_inquiry_heading: string | null
          opening_invocation_content: string | null
          opening_invocation_heading: string | null
          spiral_of_inquiry_content: string | null
          spiral_of_inquiry_heading: string | null
          spiral_of_seeing_content: string | null
          spiral_of_seeing_heading: string | null
          updated_at: string | null
        }
        Insert: {
          acknowledgement_content?: string | null
          acknowledgement_heading?: string | null
          benediction_content?: string | null
          benediction_heading?: string | null
          card_details?: string | null
          card_number: number
          card_title: string
          created_at?: string | null
          deck_id: string
          deck_name?: string | null
          embodiment_ritual_content?: string | null
          embodiment_ritual_heading?: string | null
          guided_audio_content?: string | null
          guided_audio_heading?: string | null
          id?: string
          image_file_name?: string | null
          living_inquiry_content?: string | null
          living_inquiry_heading?: string | null
          opening_invocation_content?: string | null
          opening_invocation_heading?: string | null
          spiral_of_inquiry_content?: string | null
          spiral_of_inquiry_heading?: string | null
          spiral_of_seeing_content?: string | null
          spiral_of_seeing_heading?: string | null
          updated_at?: string | null
        }
        Update: {
          acknowledgement_content?: string | null
          acknowledgement_heading?: string | null
          benediction_content?: string | null
          benediction_heading?: string | null
          card_details?: string | null
          card_number?: number
          card_title?: string
          created_at?: string | null
          deck_id?: string
          deck_name?: string | null
          embodiment_ritual_content?: string | null
          embodiment_ritual_heading?: string | null
          guided_audio_content?: string | null
          guided_audio_heading?: string | null
          id?: string
          image_file_name?: string | null
          living_inquiry_content?: string | null
          living_inquiry_heading?: string | null
          opening_invocation_content?: string | null
          opening_invocation_heading?: string | null
          spiral_of_inquiry_content?: string | null
          spiral_of_inquiry_heading?: string | null
          spiral_of_seeing_content?: string | null
          spiral_of_seeing_heading?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cards_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
        ]
      }
      deck_purchases: {
        Row: {
          deck_id: string
          id: string
          is_premium: boolean | null
          purchased_at: string | null
          user_id: string
          verified: boolean | null
          woocommerce_customer_email: string
          woocommerce_order_id: string
        }
        Insert: {
          deck_id: string
          id?: string
          is_premium?: boolean | null
          purchased_at?: string | null
          user_id: string
          verified?: boolean | null
          woocommerce_customer_email: string
          woocommerce_order_id: string
        }
        Update: {
          deck_id?: string
          id?: string
          is_premium?: boolean | null
          purchased_at?: string | null
          user_id?: string
          verified?: boolean | null
          woocommerce_customer_email?: string
          woocommerce_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deck_purchases_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
        ]
      }
      decks: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          image_color: string
          is_free: boolean | null
          is_starter: boolean | null
          name: string
          theme: string
          updated_at: string | null
          woocommerce_product_id: string | null
          woocommerce_product_id_premium: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_color: string
          is_free?: boolean | null
          is_starter?: boolean | null
          name: string
          theme: string
          updated_at?: string | null
          woocommerce_product_id?: string | null
          woocommerce_product_id_premium?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_color?: string
          is_free?: boolean | null
          is_starter?: boolean | null
          name?: string
          theme?: string
          updated_at?: string | null
          woocommerce_product_id?: string | null
          woocommerce_product_id_premium?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_starter_deck_cards: {
        Row: {
          assigned_at: string | null
          card_id: string
          id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          card_id: string
          id?: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          card_id?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      user_has_deck_access: {
        Args: { _deck_id: string; _user_id: string }
        Returns: boolean
      }
      user_has_premium_deck_access: {
        Args: { _deck_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
