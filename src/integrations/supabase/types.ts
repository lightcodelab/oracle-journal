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
      areekeera_protocol_steps: {
        Row: {
          completed_at: string | null
          created_at: string | null
          duration_sec: number | null
          id: string
          is_completed: boolean | null
          notes: string | null
          protocol_id: string
          resource_id: string | null
          step_index: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          duration_sec?: number | null
          id?: string
          is_completed?: boolean | null
          notes?: string | null
          protocol_id: string
          resource_id?: string | null
          step_index: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          duration_sec?: number | null
          id?: string
          is_completed?: boolean | null
          notes?: string | null
          protocol_id?: string
          resource_id?: string | null
          step_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "areekeera_protocol_steps_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "areekeera_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "areekeera_protocol_steps_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "healing_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      areekeera_protocols: {
        Row: {
          created_at: string | null
          id: string
          recommendation_id: string | null
          safety_notes: string | null
          stated_feelings: string[] | null
          summary: string | null
          title: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          recommendation_id?: string | null
          safety_notes?: string | null
          stated_feelings?: string[] | null
          summary?: string | null
          title: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          recommendation_id?: string | null
          safety_notes?: string | null
          stated_feelings?: string[] | null
          summary?: string | null
          title?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "areekeera_protocols_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "recommendation_events"
            referencedColumns: ["id"]
          },
        ]
      }
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
          content_sections: Json | null
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
          content_sections?: Json | null
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
          content_sections?: Json | null
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
      condition_resource_mappings: {
        Row: {
          condition_id: string
          created_at: string
          id: string
          notes: string | null
          priority_boost: number | null
          resource_id: string
        }
        Insert: {
          condition_id: string
          created_at?: string
          id?: string
          notes?: string | null
          priority_boost?: number | null
          resource_id: string
        }
        Update: {
          condition_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          priority_boost?: number | null
          resource_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "condition_resource_mappings_condition_id_fkey"
            columns: ["condition_id"]
            isOneToOne: false
            referencedRelation: "conditions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "condition_resource_mappings_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "healing_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      conditions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      content_buckets: {
        Row: {
          created_at: string | null
          description: string | null
          key: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          key: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          key?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      content_categories: {
        Row: {
          active: boolean | null
          created_at: string | null
          display_order: number | null
          id: string
          name: string
          page: string | null
          slug: string
          type: Database["public"]["Enums"]["content_category_type"]
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          name: string
          page?: string | null
          slug: string
          type: Database["public"]["Enums"]["content_category_type"]
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          name?: string
          page?: string | null
          slug?: string
          type?: Database["public"]["Enums"]["content_category_type"]
          updated_at?: string | null
        }
        Relationships: []
      }
      content_courses: {
        Row: {
          created_at: string | null
          id: string
          resource_id: string
          status: Database["public"]["Enums"]["content_status"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          resource_id: string
          status?: Database["public"]["Enums"]["content_status"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          resource_id?: string
          status?: Database["public"]["Enums"]["content_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_courses_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: true
            referencedRelation: "content_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_courses_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: true
            referencedRelation: "v_content_resources_published"
            referencedColumns: ["id"]
          },
        ]
      }
      content_lesson_attachments: {
        Row: {
          created_at: string | null
          file_type: Database["public"]["Enums"]["content_file_type"]
          file_url: string
          id: string
          lesson_id: string
          name: string | null
          size_bytes: number | null
        }
        Insert: {
          created_at?: string | null
          file_type: Database["public"]["Enums"]["content_file_type"]
          file_url: string
          id?: string
          lesson_id: string
          name?: string | null
          size_bytes?: number | null
        }
        Update: {
          created_at?: string | null
          file_type?: Database["public"]["Enums"]["content_file_type"]
          file_url?: string
          id?: string
          lesson_id?: string
          name?: string | null
          size_bytes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "content_lesson_attachments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "content_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_lesson_attachments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "v_content_lessons_published"
            referencedColumns: ["id"]
          },
        ]
      }
      content_lessons: {
        Row: {
          body_richtext: Json | null
          created_at: string | null
          id: string
          main_media_embed_url: string | null
          main_media_file_url: string | null
          main_media_kind:
            | Database["public"]["Enums"]["content_media_kind"]
            | null
          module_id: string
          order_index: number
          status: Database["public"]["Enums"]["content_status"] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          body_richtext?: Json | null
          created_at?: string | null
          id?: string
          main_media_embed_url?: string | null
          main_media_file_url?: string | null
          main_media_kind?:
            | Database["public"]["Enums"]["content_media_kind"]
            | null
          module_id: string
          order_index?: number
          status?: Database["public"]["Enums"]["content_status"] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          body_richtext?: Json | null
          created_at?: string | null
          id?: string
          main_media_embed_url?: string | null
          main_media_file_url?: string | null
          main_media_kind?:
            | Database["public"]["Enums"]["content_media_kind"]
            | null
          module_id?: string
          order_index?: number
          status?: Database["public"]["Enums"]["content_status"] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "content_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      content_modules: {
        Row: {
          course_id: string
          created_at: string | null
          id: string
          order_index: number
          status: Database["public"]["Enums"]["content_status"] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          id?: string
          order_index?: number
          status?: Database["public"]["Enums"]["content_status"] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          id?: string
          order_index?: number
          status?: Database["public"]["Enums"]["content_status"] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "content_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "v_content_courses_published"
            referencedColumns: ["id"]
          },
        ]
      }
      content_resource_attachments: {
        Row: {
          created_at: string | null
          file_type: Database["public"]["Enums"]["content_file_type"]
          file_url: string
          id: string
          name: string | null
          resource_id: string
          size_bytes: number | null
        }
        Insert: {
          created_at?: string | null
          file_type: Database["public"]["Enums"]["content_file_type"]
          file_url: string
          id?: string
          name?: string | null
          resource_id: string
          size_bytes?: number | null
        }
        Update: {
          created_at?: string | null
          file_type?: Database["public"]["Enums"]["content_file_type"]
          file_url?: string
          id?: string
          name?: string | null
          resource_id?: string
          size_bytes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "content_resource_attachments_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "content_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_resource_attachments_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "v_content_resources_published"
            referencedColumns: ["id"]
          },
        ]
      }
      content_resources: {
        Row: {
          body_richtext: Json | null
          created_at: string | null
          created_by: string | null
          id: string
          is_course: boolean | null
          location_id: string | null
          main_media_embed_url: string | null
          main_media_file_url: string | null
          main_media_kind:
            | Database["public"]["Enums"]["content_media_kind"]
            | null
          resource_type_id: string | null
          scheduled_publish_at: string | null
          slug: string
          status: Database["public"]["Enums"]["content_status"] | null
          summary: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          body_richtext?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_course?: boolean | null
          location_id?: string | null
          main_media_embed_url?: string | null
          main_media_file_url?: string | null
          main_media_kind?:
            | Database["public"]["Enums"]["content_media_kind"]
            | null
          resource_type_id?: string | null
          scheduled_publish_at?: string | null
          slug: string
          status?: Database["public"]["Enums"]["content_status"] | null
          summary?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          body_richtext?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_course?: boolean | null
          location_id?: string | null
          main_media_embed_url?: string | null
          main_media_file_url?: string | null
          main_media_kind?:
            | Database["public"]["Enums"]["content_media_kind"]
            | null
          resource_type_id?: string | null
          scheduled_publish_at?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["content_status"] | null
          summary?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_resources_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "content_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_resources_resource_type_id_fkey"
            columns: ["resource_type_id"]
            isOneToOne: false
            referencedRelation: "content_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      contraindications: {
        Row: {
          created_at: string | null
          id: string
          message: string | null
          min_band: Database["public"]["Enums"]["severity_band"]
          resource_id: string
          rule: Database["public"]["Enums"]["contraindication_rule"]
          symptom_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message?: string | null
          min_band: Database["public"]["Enums"]["severity_band"]
          resource_id: string
          rule: Database["public"]["Enums"]["contraindication_rule"]
          symptom_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string | null
          min_band?: Database["public"]["Enums"]["severity_band"]
          resource_id?: string
          rule?: Database["public"]["Enums"]["contraindication_rule"]
          symptom_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contraindications_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "healing_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contraindications_symptom_id_fkey"
            columns: ["symptom_id"]
            isOneToOne: false
            referencedRelation: "symptoms"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          door_type: string
          id: string
          image_url: string | null
          is_published: boolean | null
          location_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          door_type?: string
          id?: string
          image_url?: string | null
          is_published?: boolean | null
          location_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          door_type?: string
          id?: string
          image_url?: string | null
          is_published?: boolean | null
          location_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "content_categories"
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
      entry_categories: {
        Row: {
          added_at: string
          added_by: string | null
          category_id: string
          entry_id: string
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          category_id: string
          entry_id: string
        }
        Update: {
          added_at?: string
          added_by?: string | null
          category_id?: string
          entry_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entry_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "journal_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entry_categories_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      entry_tags: {
        Row: {
          created_at: string
          entry_id: string
          tag_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entry_id: string
          tag_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          entry_id?: string
          tag_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entry_tags_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entry_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "journal_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      escalation_events: {
        Row: {
          action_taken: Database["public"]["Enums"]["escalation_action"]
          context_json: Json | null
          created_at: string | null
          id: string
          rule_id: string | null
          trigger_type: Database["public"]["Enums"]["escalation_trigger_type"]
          user_id: string | null
        }
        Insert: {
          action_taken: Database["public"]["Enums"]["escalation_action"]
          context_json?: Json | null
          created_at?: string | null
          id?: string
          rule_id?: string | null
          trigger_type: Database["public"]["Enums"]["escalation_trigger_type"]
          user_id?: string | null
        }
        Update: {
          action_taken?: Database["public"]["Enums"]["escalation_action"]
          context_json?: Json | null
          created_at?: string | null
          id?: string
          rule_id?: string | null
          trigger_type?: Database["public"]["Enums"]["escalation_trigger_type"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "escalation_events_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "escalation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      escalation_rules: {
        Row: {
          action: Database["public"]["Enums"]["escalation_action"]
          condition_json: Json
          created_at: string | null
          id: string
          is_active: boolean | null
          locale: string | null
          message: string
          trigger_type: Database["public"]["Enums"]["escalation_trigger_type"]
          updated_at: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["escalation_action"]
          condition_json: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          locale?: string | null
          message: string
          trigger_type: Database["public"]["Enums"]["escalation_trigger_type"]
          updated_at?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["escalation_action"]
          condition_json?: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          locale?: string | null
          message?: string
          trigger_type?: Database["public"]["Enums"]["escalation_trigger_type"]
          updated_at?: string | null
        }
        Relationships: []
      }
      healing_content: {
        Row: {
          content_text: string | null
          content_type: string
          content_url: string | null
          created_at: string
          description: string | null
          display_order: number | null
          duration_minutes: number | null
          id: string
          is_published: boolean | null
          symptom_tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          content_text?: string | null
          content_type: string
          content_url?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          duration_minutes?: number | null
          id?: string
          is_published?: boolean | null
          symptom_tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          content_text?: string | null
          content_type?: string
          content_url?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          duration_minutes?: number | null
          id?: string
          is_published?: boolean | null
          symptom_tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      healing_conversations: {
        Row: {
          created_at: string
          id: string
          is_encrypted: boolean | null
          messages: Json
          messages_encrypted: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_encrypted?: boolean | null
          messages?: Json
          messages_encrypted?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_encrypted?: boolean | null
          messages?: Json
          messages_encrypted?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      healing_protocols: {
        Row: {
          created_at: string
          description: string | null
          id: string
          symptoms_addressed: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          symptoms_addressed?: string[]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          symptoms_addressed?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      healing_resource_audio_files: {
        Row: {
          created_at: string
          display_order: number
          file_name: string
          file_url: string
          id: string
          resource_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          file_name: string
          file_url: string
          id?: string
          resource_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          file_name?: string
          file_url?: string
          id?: string
          resource_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "healing_resource_audio_files_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "healing_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      healing_resources: {
        Row: {
          applies_to_all_symptoms: boolean
          audio_file_url: string | null
          body_richtext: Json | null
          created_at: string | null
          created_by: string | null
          display_image_url: string | null
          duration_sec: number | null
          embedding: string | null
          id: string
          intensity: number | null
          locale: string | null
          location_id: string | null
          modality: Database["public"]["Enums"]["resource_modality"]
          scheduled_publish_at: string | null
          slug: string | null
          status: Database["public"]["Enums"]["resource_status"] | null
          summary: string | null
          teaching_description: string | null
          tier: Database["public"]["Enums"]["resource_tier"] | null
          title: string
          updated_at: string | null
          vimeo_embed_url: string | null
        }
        Insert: {
          applies_to_all_symptoms?: boolean
          audio_file_url?: string | null
          body_richtext?: Json | null
          created_at?: string | null
          created_by?: string | null
          display_image_url?: string | null
          duration_sec?: number | null
          embedding?: string | null
          id?: string
          intensity?: number | null
          locale?: string | null
          location_id?: string | null
          modality: Database["public"]["Enums"]["resource_modality"]
          scheduled_publish_at?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["resource_status"] | null
          summary?: string | null
          teaching_description?: string | null
          tier?: Database["public"]["Enums"]["resource_tier"] | null
          title: string
          updated_at?: string | null
          vimeo_embed_url?: string | null
        }
        Update: {
          applies_to_all_symptoms?: boolean
          audio_file_url?: string | null
          body_richtext?: Json | null
          created_at?: string | null
          created_by?: string | null
          display_image_url?: string | null
          duration_sec?: number | null
          embedding?: string | null
          id?: string
          intensity?: number | null
          locale?: string | null
          location_id?: string | null
          modality?: Database["public"]["Enums"]["resource_modality"]
          scheduled_publish_at?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["resource_status"] | null
          summary?: string | null
          teaching_description?: string | null
          tier?: Database["public"]["Enums"]["resource_tier"] | null
          title?: string
          updated_at?: string | null
          vimeo_embed_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "healing_resources_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "content_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      intake_symptoms: {
        Row: {
          created_at: string | null
          id: string
          intake_id: string
          notes: string | null
          severity_score: number
          symptom_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          intake_id: string
          notes?: string | null
          severity_score: number
          symptom_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          intake_id?: string
          notes?: string | null
          severity_score?: number
          symptom_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intake_symptoms_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "protocol_intakes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_symptoms_symptom_id_fkey"
            columns: ["symptom_id"]
            isOneToOne: false
            referencedRelation: "symptoms"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_due_cents: number
          amount_paid_cents: number | null
          created_at: string | null
          currency: string | null
          id: string
          paid_at: string | null
          period_end: string | null
          period_start: string | null
          profile_id: string
          provider_invoice_id: string | null
          status: string
          subscription_id: string | null
        }
        Insert: {
          amount_due_cents: number
          amount_paid_cents?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          profile_id: string
          provider_invoice_id?: string | null
          status: string
          subscription_id?: string | null
        }
        Update: {
          amount_due_cents?: number
          amount_paid_cents?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          profile_id?: string
          provider_invoice_id?: string | null
          status?: string
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_categories: {
        Row: {
          archived_at: string | null
          color: string | null
          created_at: string
          description: string | null
          emoji: string | null
          id: string
          is_system: boolean
          name: string
          normalized_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          emoji?: string | null
          id?: string
          is_system?: boolean
          name: string
          normalized_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          emoji?: string | null
          id?: string
          is_system?: boolean
          name?: string
          normalized_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          captured_at: string
          content_json: Json
          content_json_encrypted: Json | null
          content_text: string
          content_text_encrypted: Json | null
          context_id: string | null
          context_title: string | null
          context_type: string | null
          deleted_at: string | null
          id: string
          is_encrypted: boolean | null
          is_pinned: boolean
          is_quick_capture: boolean
          last_revisited_at: string | null
          revisit_count: number
          title: string | null
          title_encrypted: Json | null
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          captured_at?: string
          content_json?: Json
          content_json_encrypted?: Json | null
          content_text?: string
          content_text_encrypted?: Json | null
          context_id?: string | null
          context_title?: string | null
          context_type?: string | null
          deleted_at?: string | null
          id?: string
          is_encrypted?: boolean | null
          is_pinned?: boolean
          is_quick_capture?: boolean
          last_revisited_at?: string | null
          revisit_count?: number
          title?: string | null
          title_encrypted?: Json | null
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          captured_at?: string
          content_json?: Json
          content_json_encrypted?: Json | null
          content_text?: string
          content_text_encrypted?: Json | null
          context_id?: string | null
          context_title?: string | null
          context_type?: string | null
          deleted_at?: string | null
          id?: string
          is_encrypted?: boolean | null
          is_pinned?: boolean
          is_quick_capture?: boolean
          last_revisited_at?: string | null
          revisit_count?: number
          title?: string | null
          title_encrypted?: Json | null
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      journal_entry_revisions: {
        Row: {
          client_ts: string | null
          content: Json
          content_text: string
          created_at: string
          entry_id: string
          id: string
          is_autosave: boolean
          user_id: string
          version: number
        }
        Insert: {
          client_ts?: string | null
          content: Json
          content_text?: string
          created_at?: string
          entry_id: string
          id?: string
          is_autosave?: boolean
          user_id: string
          version: number
        }
        Update: {
          client_ts?: string | null
          content?: Json
          content_text?: string
          created_at?: string
          entry_id?: string
          id?: string
          is_autosave?: boolean
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "journal_entry_revisions_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_tags: {
        Row: {
          color: string | null
          created_at: string
          id: string
          is_archived: boolean
          name: string
          normalized_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          is_archived?: boolean
          name: string
          normalized_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          is_archived?: boolean
          name?: string
          normalized_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lesson_audio_files: {
        Row: {
          created_at: string
          display_order: number
          file_name: string
          file_url: string
          id: string
          lesson_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          file_name: string
          file_url: string
          id?: string
          lesson_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          file_name?: string
          file_url?: string
          id?: string
          lesson_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_audio_files_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_journal_entries: {
        Row: {
          audio_position: number | null
          created_at: string | null
          id: string
          journal_text: string | null
          lesson_id: string
          selected_answer: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          audio_position?: number | null
          created_at?: string | null
          id?: string
          journal_text?: string | null
          lesson_id: string
          selected_answer?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          audio_position?: number | null
          created_at?: string | null
          id?: string
          journal_text?: string | null
          lesson_id?: string
          selected_answer?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_journal_entries_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          audio_timestamp: string | null
          audio_url: string | null
          body_richtext: Json | null
          content: string
          course_id: string
          created_at: string | null
          description: string | null
          id: string
          lesson_number: number
          main_media_embed_url: string | null
          main_media_file_url: string | null
          main_media_kind: string | null
          module_order: number | null
          module_title: string | null
          survey_options: Json | null
          survey_question: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          audio_timestamp?: string | null
          audio_url?: string | null
          body_richtext?: Json | null
          content: string
          course_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          lesson_number: number
          main_media_embed_url?: string | null
          main_media_file_url?: string | null
          main_media_kind?: string | null
          module_order?: number | null
          module_title?: string | null
          survey_options?: Json | null
          survey_question?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          audio_timestamp?: string | null
          audio_url?: string | null
          body_richtext?: Json | null
          content?: string
          course_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          lesson_number?: number
          main_media_embed_url?: string | null
          main_media_file_url?: string | null
          main_media_kind?: string | null
          module_order?: number | null
          module_title?: string | null
          survey_options?: Json | null
          survey_question?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      live_sessions: {
        Row: {
          capacity: number | null
          created_at: string
          created_by: string | null
          description: string | null
          duration_minutes: number
          host_user_id: string | null
          id: string
          scheduled_at: string
          session_type: string
          status: string
          title: string
          updated_at: string
          zoom_join_url: string | null
          zoom_meeting_id: string | null
          zoom_password: string | null
          zoom_start_url: string | null
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number
          host_user_id?: string | null
          id?: string
          scheduled_at: string
          session_type?: string
          status?: string
          title: string
          updated_at?: string
          zoom_join_url?: string | null
          zoom_meeting_id?: string | null
          zoom_password?: string | null
          zoom_start_url?: string | null
        }
        Update: {
          capacity?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number
          host_user_id?: string | null
          id?: string
          scheduled_at?: string
          session_type?: string
          status?: string
          title?: string
          updated_at?: string
          zoom_join_url?: string | null
          zoom_meeting_id?: string | null
          zoom_password?: string | null
          zoom_start_url?: string | null
        }
        Relationships: []
      }
      membership_audit: {
        Row: {
          id: string
          new_tier_code: string | null
          occurred_at: string | null
          old_tier_code: string | null
          reason: string | null
          source: Database["public"]["Enums"]["audit_source"]
          user_id: string
        }
        Insert: {
          id?: string
          new_tier_code?: string | null
          occurred_at?: string | null
          old_tier_code?: string | null
          reason?: string | null
          source: Database["public"]["Enums"]["audit_source"]
          user_id: string
        }
        Update: {
          id?: string
          new_tier_code?: string | null
          occurred_at?: string | null
          old_tier_code?: string | null
          reason?: string | null
          source?: Database["public"]["Enums"]["audit_source"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_audit_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      outcomes_cache: {
        Row: {
          id: string
          monthly_delta: number | null
          symptom_id: string
          updated_at: string | null
          user_id: string
          weekly_delta: number | null
        }
        Insert: {
          id?: string
          monthly_delta?: number | null
          symptom_id: string
          updated_at?: string | null
          user_id: string
          weekly_delta?: number | null
        }
        Update: {
          id?: string
          monthly_delta?: number | null
          symptom_id?: string
          updated_at?: string | null
          user_id?: string
          weekly_delta?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "outcomes_cache_symptom_id_fkey"
            columns: ["symptom_id"]
            isOneToOne: false
            referencedRelation: "symptoms"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_cents: number
          created_at: string | null
          currency: string | null
          id: string
          invoice_id: string | null
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_payment_id: string | null
          received_at: string | null
          status: string
        }
        Insert: {
          amount_cents: number
          created_at?: string | null
          currency?: string | null
          id?: string
          invoice_id?: string | null
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_payment_id?: string | null
          received_at?: string | null
          status: string
        }
        Update: {
          amount_cents?: number
          created_at?: string | null
          currency?: string | null
          id?: string
          invoice_id?: string | null
          provider?: Database["public"]["Enums"]["payment_provider"]
          provider_payment_id?: string | null
          received_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          active: boolean | null
          code: string
          created_at: string | null
          description: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          code: string
          created_at?: string | null
          description?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          code?: string
          created_at?: string | null
          description?: string | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      playlist_tracks: {
        Row: {
          added_at: string
          id: string
          lesson_id: string | null
          playlist_id: string
          resource_id: string | null
          track_order: number
        }
        Insert: {
          added_at?: string
          id?: string
          lesson_id?: string | null
          playlist_id: string
          resource_id?: string | null
          track_order?: number
        }
        Update: {
          added_at?: string
          id?: string
          lesson_id?: string | null
          playlist_id?: string
          resource_id?: string | null
          track_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "playlist_tracks_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playlist_tracks_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playlist_tracks_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "healing_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      playlists: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      prices: {
        Row: {
          active: boolean | null
          cadence: Database["public"]["Enums"]["billing_cadence"]
          created_at: string | null
          currency: string | null
          id: string
          plan_code: string
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_price_id: string | null
          provider_product_id: string | null
          unit_amount_cents: number
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          cadence: Database["public"]["Enums"]["billing_cadence"]
          created_at?: string | null
          currency?: string | null
          id?: string
          plan_code: string
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_price_id?: string | null
          provider_product_id?: string | null
          unit_amount_cents: number
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          cadence?: Database["public"]["Enums"]["billing_cadence"]
          created_at?: string | null
          currency?: string | null
          id?: string
          plan_code?: string
          provider?: Database["public"]["Enums"]["payment_provider"]
          provider_price_id?: string | null
          provider_product_id?: string | null
          unit_amount_cents?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prices_plan_code_fkey"
            columns: ["plan_code"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["code"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          current_period_end: string | null
          email: string | null
          full_name: string | null
          full_name_encrypted: Json | null
          id: string
          is_encrypted: boolean | null
          member_tier_code: string | null
          must_change_password: boolean | null
          plan_cadence: string | null
          stripe_customer_id: string | null
          subscription_status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_period_end?: string | null
          email?: string | null
          full_name?: string | null
          full_name_encrypted?: Json | null
          id: string
          is_encrypted?: boolean | null
          member_tier_code?: string | null
          must_change_password?: boolean | null
          plan_cadence?: string | null
          stripe_customer_id?: string | null
          subscription_status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_period_end?: string | null
          email?: string | null
          full_name?: string | null
          full_name_encrypted?: Json | null
          id?: string
          is_encrypted?: boolean | null
          member_tier_code?: string | null
          must_change_password?: boolean | null
          plan_cadence?: string | null
          stripe_customer_id?: string | null
          subscription_status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      protocol_checkins: {
        Row: {
          context_json: Json | null
          created_at: string | null
          id: string
          mood: string | null
          notes: string | null
          protocol_id: string | null
          score: number
          symptom_id: string | null
          user_id: string
        }
        Insert: {
          context_json?: Json | null
          created_at?: string | null
          id?: string
          mood?: string | null
          notes?: string | null
          protocol_id?: string | null
          score: number
          symptom_id?: string | null
          user_id: string
        }
        Update: {
          context_json?: Json | null
          created_at?: string | null
          id?: string
          mood?: string | null
          notes?: string | null
          protocol_id?: string | null
          score?: number
          symptom_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "protocol_checkins_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "areekeera_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_checkins_symptom_id_fkey"
            columns: ["symptom_id"]
            isOneToOne: false
            referencedRelation: "symptoms"
            referencedColumns: ["id"]
          },
        ]
      }
      protocol_intakes: {
        Row: {
          created_at: string | null
          goals: string | null
          id: string
          payload_json: Json
          preferences: Json | null
          session_time_minutes: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          goals?: string | null
          id?: string
          payload_json: Json
          preferences?: Json | null
          session_time_minutes?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          goals?: string | null
          id?: string
          payload_json?: Json
          preferences?: Json | null
          session_time_minutes?: number | null
          user_id?: string
        }
        Relationships: []
      }
      protocol_items: {
        Row: {
          added_at: string
          content_id: string
          id: string
          notes: string | null
          protocol_id: string
        }
        Insert: {
          added_at?: string
          content_id: string
          id?: string
          notes?: string | null
          protocol_id: string
        }
        Update: {
          added_at?: string
          content_id?: string
          id?: string
          notes?: string | null
          protocol_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "protocol_items_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "healing_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_items_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "healing_protocols"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_events: {
        Row: {
          chosen_resources: Json | null
          created_at: string | null
          escalation_shown: boolean | null
          followup_answer: string | null
          followup_asked: boolean | null
          followup_question: string | null
          id: string
          intake_id: string | null
          rules_fired: Json | null
          semantic_scores: Json | null
          user_id: string
        }
        Insert: {
          chosen_resources?: Json | null
          created_at?: string | null
          escalation_shown?: boolean | null
          followup_answer?: string | null
          followup_asked?: boolean | null
          followup_question?: string | null
          id?: string
          intake_id?: string | null
          rules_fired?: Json | null
          semantic_scores?: Json | null
          user_id: string
        }
        Update: {
          chosen_resources?: Json | null
          created_at?: string | null
          escalation_shown?: boolean | null
          followup_answer?: string | null
          followup_asked?: boolean | null
          followup_question?: string | null
          id?: string
          intake_id?: string | null
          rules_fired?: Json | null
          semantic_scores?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_events_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "protocol_intakes"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_media: {
        Row: {
          created_at: string | null
          display_order: number | null
          duration_sec: number | null
          id: string
          mime_type: string | null
          resource_id: string
          size_bytes: number | null
          type: Database["public"]["Enums"]["media_type"]
          url: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          duration_sec?: number | null
          id?: string
          mime_type?: string | null
          resource_id: string
          size_bytes?: number | null
          type: Database["public"]["Enums"]["media_type"]
          url: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          duration_sec?: number | null
          id?: string
          mime_type?: string | null
          resource_id?: string
          size_bytes?: number | null
          type?: Database["public"]["Enums"]["media_type"]
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_media_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "healing_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_symptom_mappings: {
        Row: {
          created_at: string | null
          id: string
          resource_id: string
          severity_weight: number | null
          symptom_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          resource_id: string
          severity_weight?: number | null
          symptom_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          resource_id?: string
          severity_weight?: number | null
          symptom_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_symptom_mappings_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "healing_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_symptom_mappings_symptom_id_fkey"
            columns: ["symptom_id"]
            isOneToOne: false
            referencedRelation: "symptoms"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_tag_assignments: {
        Row: {
          resource_id: string
          tag_id: string
        }
        Insert: {
          resource_id: string
          tag_id: string
        }
        Update: {
          resource_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_tag_assignments_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "healing_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_tag_assignments_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "resource_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_tags: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      resource_teachers: {
        Row: {
          resource_id: string
          teacher_id: string
        }
        Insert: {
          resource_id: string
          teacher_id: string
        }
        Update: {
          resource_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_teachers_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "healing_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_teachers_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_transcripts: {
        Row: {
          created_at: string | null
          id: string
          is_autogenerated: boolean | null
          language: string | null
          resource_id: string
          updated_at: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_autogenerated?: boolean | null
          language?: string | null
          resource_id: string
          updated_at?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_autogenerated?: boolean | null
          language?: string | null
          resource_id?: string
          updated_at?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_transcripts_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "healing_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_versions: {
        Row: {
          created_at: string | null
          created_by: string | null
          data: Json
          id: string
          resource_id: string
          version_number: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          data: Json
          id?: string
          resource_id: string
          version_number: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          data?: Json
          id?: string
          resource_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "resource_versions_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "healing_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_readings: {
        Row: {
          card_id: string | null
          card_title: string
          created_at: string
          deck_id: string | null
          deck_name: string | null
          id: string
          image_file_name: string | null
          is_encrypted: boolean | null
          notes: string | null
          notes_encrypted: Json | null
          saved_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          card_id?: string | null
          card_title: string
          created_at?: string
          deck_id?: string | null
          deck_name?: string | null
          id?: string
          image_file_name?: string | null
          is_encrypted?: boolean | null
          notes?: string | null
          notes_encrypted?: Json | null
          saved_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          card_id?: string | null
          card_title?: string
          created_at?: string
          deck_id?: string | null
          deck_name?: string | null
          id?: string
          image_file_name?: string | null
          is_encrypted?: boolean | null
          notes?: string | null
          notes_encrypted?: Json | null
          saved_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_readings_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_readings_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
        ]
      }
      session_registrations: {
        Row: {
          attended_at: string | null
          calendar_added: boolean | null
          id: string
          registered_at: string
          session_id: string
          status: string
          user_id: string
        }
        Insert: {
          attended_at?: string | null
          calendar_added?: boolean | null
          id?: string
          registered_at?: string
          session_id: string
          status?: string
          user_id: string
        }
        Update: {
          attended_at?: string | null
          calendar_added?: boolean | null
          id?: string
          registered_at?: string
          session_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_registrations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_registrations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions_public"
            referencedColumns: ["id"]
          },
        ]
      }
      session_replays: {
        Row: {
          content_richtext: Json | null
          created_at: string | null
          created_by: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          is_published: boolean | null
          original_session_date: string | null
          published_at: string | null
          replay_type: string
          session_id: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          video_file_path: string | null
          video_url: string | null
        }
        Insert: {
          content_richtext?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_published?: boolean | null
          original_session_date?: string | null
          published_at?: string | null
          replay_type: string
          session_id?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          video_file_path?: string | null
          video_url?: string | null
        }
        Update: {
          content_richtext?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_published?: boolean | null
          original_session_date?: string | null
          published_at?: string | null
          replay_type?: string
          session_id?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          video_file_path?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_replays_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_replays_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions_public"
            referencedColumns: ["id"]
          },
        ]
      }
      severity_thresholds: {
        Row: {
          allowed_intensity_max: number | null
          allowed_intensity_min: number | null
          band: Database["public"]["Enums"]["severity_band"]
          created_at: string | null
          id: string
          max_score: number
          min_score: number
          notes: string | null
          symptom_id: string
        }
        Insert: {
          allowed_intensity_max?: number | null
          allowed_intensity_min?: number | null
          band: Database["public"]["Enums"]["severity_band"]
          created_at?: string | null
          id?: string
          max_score: number
          min_score: number
          notes?: string | null
          symptom_id: string
        }
        Update: {
          allowed_intensity_max?: number | null
          allowed_intensity_min?: number | null
          band?: Database["public"]["Enums"]["severity_band"]
          created_at?: string | null
          id?: string
          max_score?: number
          min_score?: number
          notes?: string | null
          symptom_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "severity_thresholds_symptom_id_fkey"
            columns: ["symptom_id"]
            isOneToOne: false
            referencedRelation: "symptoms"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_events: {
        Row: {
          error_message: string | null
          event_id: string
          event_type: string
          id: string
          invoice_id: string | null
          payload: Json
          processed_at: string | null
          processing_status: string | null
          profile_id: string | null
          provider: Database["public"]["Enums"]["payment_provider"]
          received_at: string | null
          subscription_id: string | null
        }
        Insert: {
          error_message?: string | null
          event_id: string
          event_type: string
          id?: string
          invoice_id?: string | null
          payload: Json
          processed_at?: string | null
          processing_status?: string | null
          profile_id?: string | null
          provider: Database["public"]["Enums"]["payment_provider"]
          received_at?: string | null
          subscription_id?: string | null
        }
        Update: {
          error_message?: string | null
          event_id?: string
          event_type?: string
          id?: string
          invoice_id?: string | null
          payload?: Json
          processed_at?: string | null
          processing_status?: string | null
          profile_id?: string | null
          provider?: Database["public"]["Enums"]["payment_provider"]
          received_at?: string | null
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_events_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_events_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cadence: Database["public"]["Enums"]["billing_cadence"]
          cancel_at_period_end: boolean | null
          canceled_at: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_code: string
          profile_id: string
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_subscription_id: string | null
          quantity: number | null
          status: Database["public"]["Enums"]["subscription_status"]
          trial_end: string | null
          updated_at: string | null
        }
        Insert: {
          cadence: Database["public"]["Enums"]["billing_cadence"]
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_code: string
          profile_id: string
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_subscription_id?: string | null
          quantity?: number | null
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_end?: string | null
          updated_at?: string | null
        }
        Update: {
          cadence?: Database["public"]["Enums"]["billing_cadence"]
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_code?: string
          profile_id?: string
          provider?: Database["public"]["Enums"]["payment_provider"]
          provider_subscription_id?: string | null
          quantity?: number | null
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_end?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_code_fkey"
            columns: ["plan_code"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "subscriptions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      symptom_resource_mappings: {
        Row: {
          created_at: string | null
          id: string
          max_band: Database["public"]["Enums"]["severity_band"] | null
          min_band: Database["public"]["Enums"]["severity_band"] | null
          notes: string | null
          resource_id: string
          symptom_id: string
          weight: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          max_band?: Database["public"]["Enums"]["severity_band"] | null
          min_band?: Database["public"]["Enums"]["severity_band"] | null
          notes?: string | null
          resource_id: string
          symptom_id: string
          weight?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          max_band?: Database["public"]["Enums"]["severity_band"] | null
          min_band?: Database["public"]["Enums"]["severity_band"] | null
          notes?: string | null
          resource_id?: string
          symptom_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "symptom_resource_mappings_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "healing_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "symptom_resource_mappings_symptom_id_fkey"
            columns: ["symptom_id"]
            isOneToOne: false
            referencedRelation: "symptoms"
            referencedColumns: ["id"]
          },
        ]
      }
      symptoms: {
        Row: {
          created_at: string | null
          description: string | null
          domain: Database["public"]["Enums"]["symptom_domain"]
          id: string
          name: string
          severity_scale_max: number | null
          severity_scale_min: number | null
          taxonomy_path: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          domain: Database["public"]["Enums"]["symptom_domain"]
          id?: string
          name: string
          severity_scale_max?: number | null
          severity_scale_min?: number | null
          taxonomy_path?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          domain?: Database["public"]["Enums"]["symptom_domain"]
          id?: string
          name?: string
          severity_scale_max?: number | null
          severity_scale_min?: number | null
          taxonomy_path?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      teachers: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      tier_bucket_access: {
        Row: {
          bucket_key: string
          created_at: string | null
          id: string
          is_granted: boolean | null
          tier_code: string
        }
        Insert: {
          bucket_key: string
          created_at?: string | null
          id?: string
          is_granted?: boolean | null
          tier_code: string
        }
        Update: {
          bucket_key?: string
          created_at?: string | null
          id?: string
          is_granted?: boolean | null
          tier_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "tier_bucket_access_bucket_key_fkey"
            columns: ["bucket_key"]
            isOneToOne: false
            referencedRelation: "content_buckets"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "tier_bucket_access_tier_code_fkey"
            columns: ["tier_code"]
            isOneToOne: false
            referencedRelation: "tiers"
            referencedColumns: ["code"]
          },
        ]
      }
      tiers: {
        Row: {
          code: string
          created_at: string | null
          display_order: number | null
          is_active: boolean | null
          name: string
          rank: number
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          display_order?: number | null
          is_active?: boolean | null
          name: string
          rank: number
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          display_order?: number | null
          is_active?: boolean | null
          name?: string
          rank?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      user_areekeera_protocols: {
        Row: {
          id: string
          protocol_id: string
          saved_at: string | null
          user_id: string
          version: number | null
        }
        Insert: {
          id?: string
          protocol_id: string
          saved_at?: string | null
          user_id: string
          version?: number | null
        }
        Update: {
          id?: string
          protocol_id?: string
          saved_at?: string | null
          user_id?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_areekeera_protocols_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "areekeera_protocols"
            referencedColumns: ["id"]
          },
        ]
      }
      user_encryption_keys: {
        Row: {
          created_at: string
          encrypted_master_key: string
          id: string
          key_iv: string
          key_salt: string
          key_version: number
          recovery_key_hash: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          encrypted_master_key: string
          id?: string
          key_iv: string
          key_salt: string
          key_version?: number
          recovery_key_hash?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          encrypted_master_key?: string
          id?: string
          key_iv?: string
          key_salt?: string
          key_version?: number
          recovery_key_hash?: string | null
          updated_at?: string
          user_id?: string
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
      live_sessions_public: {
        Row: {
          capacity: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          duration_minutes: number | null
          host_user_id: string | null
          id: string | null
          scheduled_at: string | null
          session_type: string | null
          status: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          capacity?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          host_user_id?: string | null
          id?: string | null
          scheduled_at?: string | null
          session_type?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          capacity?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          host_user_id?: string | null
          id?: string | null
          scheduled_at?: string | null
          session_type?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      v_content_courses_published: {
        Row: {
          created_at: string | null
          id: string | null
          resource_id: string | null
          slug: string | null
          status: Database["public"]["Enums"]["content_status"] | null
          summary: string | null
          thumbnail_url: string | null
          title: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_courses_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: true
            referencedRelation: "content_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_courses_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: true
            referencedRelation: "v_content_resources_published"
            referencedColumns: ["id"]
          },
        ]
      }
      v_content_lessons_published: {
        Row: {
          body_richtext: Json | null
          course_id: string | null
          created_at: string | null
          id: string | null
          main_media_embed_url: string | null
          main_media_file_url: string | null
          main_media_kind:
            | Database["public"]["Enums"]["content_media_kind"]
            | null
          module_id: string | null
          module_title: string | null
          order_index: number | null
          status: Database["public"]["Enums"]["content_status"] | null
          title: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "content_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "content_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "v_content_courses_published"
            referencedColumns: ["id"]
          },
        ]
      }
      v_content_resources_published: {
        Row: {
          body_richtext: Json | null
          created_at: string | null
          created_by: string | null
          id: string | null
          is_course: boolean | null
          location_id: string | null
          main_media_embed_url: string | null
          main_media_file_url: string | null
          main_media_kind:
            | Database["public"]["Enums"]["content_media_kind"]
            | null
          resource_type_id: string | null
          slug: string | null
          status: Database["public"]["Enums"]["content_status"] | null
          summary: string | null
          thumbnail_url: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          body_richtext?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string | null
          is_course?: boolean | null
          location_id?: string | null
          main_media_embed_url?: string | null
          main_media_file_url?: string | null
          main_media_kind?:
            | Database["public"]["Enums"]["content_media_kind"]
            | null
          resource_type_id?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["content_status"] | null
          summary?: string | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          body_richtext?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string | null
          is_course?: boolean | null
          location_id?: string | null
          main_media_embed_url?: string | null
          main_media_file_url?: string | null
          main_media_kind?:
            | Database["public"]["Enums"]["content_media_kind"]
            | null
          resource_type_id?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["content_status"] | null
          summary?: string | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_resources_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "content_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_resources_resource_type_id_fkey"
            columns: ["resource_type_id"]
            isOneToOne: false
            referencedRelation: "content_categories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      can_view_card: {
        Args: { _deck_id: string; _user_id: string }
        Returns: boolean
      }
      can_view_lesson: { Args: { _user_id: string }; Returns: boolean }
      can_view_lesson_by_door: {
        Args: { _course_id: string; _user_id: string }
        Returns: boolean
      }
      get_deck_purchases_admin: {
        Args: never
        Returns: {
          deck_id: string
          id: string
          is_premium: boolean
          purchased_at: string
          user_id: string
          verified: boolean
          woocommerce_order_id: string
        }[]
      }
      get_user_entitlements: {
        Args: never
        Returns: {
          bucket_access: Json
          cadence: string
          period_end: string
          status: string
          tier_code: string
          tier_name: string
        }[]
      }
      has_active_membership: { Args: { _user_id: string }; Returns: boolean }
      has_bucket_access: {
        Args: { bucket_key_param: string }
        Returns: boolean
      }
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
      audit_source: "webhook" | "admin" | "member"
      billing_cadence: "monthly" | "yearly"
      content_category_type: "resource_type" | "location"
      content_file_type: "image" | "pdf" | "audio" | "video"
      content_media_kind: "file" | "video_embed" | "none"
      content_status: "draft" | "published"
      contraindication_rule: "exclude" | "warn" | "gate"
      escalation_action:
        | "showUrgentCareBanner"
        | "restrictToGrounding"
        | "block"
      escalation_trigger_type: "keyword" | "symptom" | "score"
      media_type: "video" | "audio" | "image"
      payment_provider: "stripe" | "paypal"
      resource_modality:
        | "meditation"
        | "visualisation"
        | "ritual"
        | "somatic"
        | "process"
        | "recipe"
      resource_status: "draft" | "review" | "published"
      resource_tier: "free" | "paid"
      severity_band: "mild" | "moderate" | "severe" | "critical"
      subscription_status:
        | "active"
        | "past_due"
        | "canceled"
        | "trialing"
        | "incomplete"
      symptom_domain: "physical" | "mental" | "emotional" | "spiritual"
      tier_code: "T1" | "T2" | "T3"
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
      audit_source: ["webhook", "admin", "member"],
      billing_cadence: ["monthly", "yearly"],
      content_category_type: ["resource_type", "location"],
      content_file_type: ["image", "pdf", "audio", "video"],
      content_media_kind: ["file", "video_embed", "none"],
      content_status: ["draft", "published"],
      contraindication_rule: ["exclude", "warn", "gate"],
      escalation_action: [
        "showUrgentCareBanner",
        "restrictToGrounding",
        "block",
      ],
      escalation_trigger_type: ["keyword", "symptom", "score"],
      media_type: ["video", "audio", "image"],
      payment_provider: ["stripe", "paypal"],
      resource_modality: [
        "meditation",
        "visualisation",
        "ritual",
        "somatic",
        "process",
        "recipe",
      ],
      resource_status: ["draft", "review", "published"],
      resource_tier: ["free", "paid"],
      severity_band: ["mild", "moderate", "severe", "critical"],
      subscription_status: [
        "active",
        "past_due",
        "canceled",
        "trialing",
        "incomplete",
      ],
      symptom_domain: ["physical", "mental", "emotional", "spiritual"],
      tier_code: ["T1", "T2", "T3"],
    },
  },
} as const
