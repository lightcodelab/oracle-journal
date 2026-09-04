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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      affiliate_commissions: {
        Row: {
          affiliate_id: string
          amount_cents: number
          base_amount_cents: number
          created_at: string
          currency: string
          id: string
          notes: string | null
          payout_id: string | null
          period_end: string | null
          period_start: string | null
          rate_pct: number | null
          referral_id: string | null
          source_invoice_id: string | null
          source_subscription_id: string | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          affiliate_id: string
          amount_cents: number
          base_amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          payout_id?: string | null
          period_end?: string | null
          period_start?: string | null
          rate_pct?: number | null
          referral_id?: string | null
          source_invoice_id?: string | null
          source_subscription_id?: string | null
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          affiliate_id?: string
          amount_cents?: number
          base_amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          payout_id?: string | null
          period_end?: string | null
          period_start?: string | null
          rate_pct?: number | null
          referral_id?: string | null
          source_invoice_id?: string | null
          source_subscription_id?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_commissions_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "affiliate_referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_links: {
        Row: {
          affiliate_id: string
          clicks: number
          code: string
          commission_model: string
          created_at: string
          destination_path: string
          id: string
          label: string | null
          updated_at: string
        }
        Insert: {
          affiliate_id: string
          clicks?: number
          code: string
          commission_model?: string
          created_at?: string
          destination_path?: string
          id?: string
          label?: string | null
          updated_at?: string
        }
        Update: {
          affiliate_id?: string
          clicks?: number
          code?: string
          commission_model?: string
          created_at?: string
          destination_path?: string
          id?: string
          label?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_links_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_payouts: {
        Row: {
          affiliate_id: string
          amount_cents: number
          created_at: string
          currency: string
          id: string
          method: string
          notes: string | null
          paid_at: string | null
          period_end: string | null
          period_start: string | null
          reference: string | null
          status: string
          updated_at: string
        }
        Insert: {
          affiliate_id: string
          amount_cents: number
          created_at?: string
          currency?: string
          id?: string
          method?: string
          notes?: string | null
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          reference?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          affiliate_id?: string
          amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          method?: string
          notes?: string | null
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          reference?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_payouts_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_referrals: {
        Row: {
          affiliate_id: string
          commission_model: string
          converted_at: string | null
          created_at: string
          id: string
          link_id: string | null
          referred_user_id: string | null
          signed_up_at: string
          status: string
          updated_at: string
        }
        Insert: {
          affiliate_id: string
          commission_model?: string
          converted_at?: string | null
          created_at?: string
          id?: string
          link_id?: string | null
          referred_user_id?: string | null
          signed_up_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          affiliate_id?: string
          commission_model?: string
          converted_at?: string | null
          created_at?: string
          id?: string
          link_id?: string | null
          referred_user_id?: string | null
          signed_up_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_referrals_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_referrals_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "affiliate_links"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_settings: {
        Row: {
          cookie_window_days: number
          created_at: string
          currency: string
          default_recurring_pct: number
          default_signup_pct: number
          id: number
          min_payout_cents: number
          terms_md: string | null
          updated_at: string
        }
        Insert: {
          cookie_window_days?: number
          created_at?: string
          currency?: string
          default_recurring_pct?: number
          default_signup_pct?: number
          id?: number
          min_payout_cents?: number
          terms_md?: string | null
          updated_at?: string
        }
        Update: {
          cookie_window_days?: number
          created_at?: string
          currency?: string
          default_recurring_pct?: number
          default_signup_pct?: number
          id?: number
          min_payout_cents?: number
          terms_md?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      affiliates: {
        Row: {
          applied_at: string
          approved_at: string | null
          audience_characteristics: string | null
          commission_recurring_pct: number | null
          commission_signup_pct: number | null
          created_at: string
          display_name: string | null
          facebook_handle: string | null
          id: string
          instagram_handle: string | null
          notes: string | null
          other_social: string | null
          payout_email: string | null
          payout_method: string
          referral_code: string
          status: string
          stripe_connect_account_id: string | null
          terms_accepted_at: string | null
          tiktok_handle: string | null
          updated_at: string
          user_id: string
          website_url: string | null
        }
        Insert: {
          applied_at?: string
          approved_at?: string | null
          audience_characteristics?: string | null
          commission_recurring_pct?: number | null
          commission_signup_pct?: number | null
          created_at?: string
          display_name?: string | null
          facebook_handle?: string | null
          id?: string
          instagram_handle?: string | null
          notes?: string | null
          other_social?: string | null
          payout_email?: string | null
          payout_method?: string
          referral_code: string
          status?: string
          stripe_connect_account_id?: string | null
          terms_accepted_at?: string | null
          tiktok_handle?: string | null
          updated_at?: string
          user_id: string
          website_url?: string | null
        }
        Update: {
          applied_at?: string
          approved_at?: string | null
          audience_characteristics?: string | null
          commission_recurring_pct?: number | null
          commission_signup_pct?: number | null
          created_at?: string
          display_name?: string | null
          facebook_handle?: string | null
          id?: string
          instagram_handle?: string | null
          notes?: string | null
          other_social?: string | null
          payout_email?: string | null
          payout_method?: string
          referral_code?: string
          status?: string
          stripe_connect_account_id?: string | null
          terms_accepted_at?: string | null
          tiktok_handle?: string | null
          updated_at?: string
          user_id?: string
          website_url?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          is_public: boolean
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          is_public?: boolean
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          is_public?: boolean
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
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
      arrival_answer_options: {
        Row: {
          created_at: string
          display_order: number
          id: string
          label: string
          question_id: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order: number
          id?: string
          label: string
          question_id: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          label?: string
          question_id?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "arrival_answer_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "arrival_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      arrival_answers: {
        Row: {
          answer_option_id: string
          created_at: string
          id: string
          interaction_id: string
          question_id: string
          updated_at: string
        }
        Insert: {
          answer_option_id: string
          created_at?: string
          id?: string
          interaction_id: string
          question_id: string
          updated_at?: string
        }
        Update: {
          answer_option_id?: string
          created_at?: string
          id?: string
          interaction_id?: string
          question_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "arrival_a_option_belongs_to_question"
            columns: ["answer_option_id", "question_id"]
            isOneToOne: false
            referencedRelation: "arrival_answer_options"
            referencedColumns: ["id", "question_id"]
          },
          {
            foreignKeyName: "arrival_answers_answer_option_id_fkey"
            columns: ["answer_option_id"]
            isOneToOne: false
            referencedRelation: "arrival_answer_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arrival_answers_interaction_id_fkey"
            columns: ["interaction_id"]
            isOneToOne: false
            referencedRelation: "arrival_interactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arrival_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "arrival_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      arrival_interactions: {
        Row: {
          abandoned_at: string | null
          answers_revision: number
          completed_at: string | null
          created_at: string
          id: string
          questionnaire_version_id: string
          restarted_from_interaction_id: string | null
          rule_version_id: string
          started_at: string
          state: string
          updated_at: string
          user_id: string
        }
        Insert: {
          abandoned_at?: string | null
          answers_revision?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          questionnaire_version_id: string
          restarted_from_interaction_id?: string | null
          rule_version_id: string
          started_at?: string
          state?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          abandoned_at?: string | null
          answers_revision?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          questionnaire_version_id?: string
          restarted_from_interaction_id?: string | null
          rule_version_id?: string
          started_at?: string
          state?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "arrival_i_rule_matches_qv"
            columns: ["rule_version_id", "questionnaire_version_id"]
            isOneToOne: false
            referencedRelation: "arrival_rule_versions"
            referencedColumns: ["id", "questionnaire_version_id"]
          },
          {
            foreignKeyName: "arrival_interactions_questionnaire_version_id_fkey"
            columns: ["questionnaire_version_id"]
            isOneToOne: false
            referencedRelation: "arrival_questionnaire_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arrival_interactions_restarted_from_interaction_id_fkey"
            columns: ["restarted_from_interaction_id"]
            isOneToOne: false
            referencedRelation: "arrival_interactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arrival_interactions_rule_version_id_fkey"
            columns: ["rule_version_id"]
            isOneToOne: false
            referencedRelation: "arrival_rule_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      arrival_questionnaire_versions: {
        Row: {
          created_at: string
          id: string
          label: string
          published_at: string | null
          status: string
          updated_at: string
          version_number: number
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          published_at?: string | null
          status?: string
          updated_at?: string
          version_number: number
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          published_at?: string | null
          status?: string
          updated_at?: string
          version_number?: number
        }
        Relationships: []
      }
      arrival_questions: {
        Row: {
          created_at: string
          display_order: number
          helper_text: string | null
          id: string
          prompt: string
          questionnaire_version_id: string
          required: boolean
          select_max: number
          select_min: number
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order: number
          helper_text?: string | null
          id?: string
          prompt: string
          questionnaire_version_id: string
          required?: boolean
          select_max?: number
          select_min?: number
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          helper_text?: string | null
          id?: string
          prompt?: string
          questionnaire_version_id?: string
          required?: boolean
          select_max?: number
          select_min?: number
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "arrival_questions_questionnaire_version_id_fkey"
            columns: ["questionnaire_version_id"]
            isOneToOne: false
            referencedRelation: "arrival_questionnaire_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      arrival_recommendation_runs: {
        Row: {
          created_at: string
          id: string
          interaction_id: string
          outcome: string
          questionnaire_version_id: string
          rule_version_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          interaction_id: string
          outcome: string
          questionnaire_version_id: string
          rule_version_id: string
        }
        Update: {
          created_at?: string
          id?: string
          interaction_id?: string
          outcome?: string
          questionnaire_version_id?: string
          rule_version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "arrival_recommendation_runs_interaction_id_fkey"
            columns: ["interaction_id"]
            isOneToOne: true
            referencedRelation: "arrival_interactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arrival_recommendation_runs_questionnaire_version_id_fkey"
            columns: ["questionnaire_version_id"]
            isOneToOne: false
            referencedRelation: "arrival_questionnaire_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arrival_recommendation_runs_rule_version_id_fkey"
            columns: ["rule_version_id"]
            isOneToOne: false
            referencedRelation: "arrival_rule_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arrival_rr_rule_matches_qv"
            columns: ["rule_version_id", "questionnaire_version_id"]
            isOneToOne: false
            referencedRelation: "arrival_rule_versions"
            referencedColumns: ["id", "questionnaire_version_id"]
          },
        ]
      }
      arrival_recommendations: {
        Row: {
          created_at: string
          id: string
          rank: number
          reasons: Json
          registry_id: string
          resource_id: string
          resource_type: string
          run_id: string
          score: number
          summary_snapshot: string | null
          title_snapshot: string
        }
        Insert: {
          created_at?: string
          id?: string
          rank: number
          reasons: Json
          registry_id: string
          resource_id: string
          resource_type: string
          run_id: string
          score: number
          summary_snapshot?: string | null
          title_snapshot: string
        }
        Update: {
          created_at?: string
          id?: string
          rank?: number
          reasons?: Json
          registry_id?: string
          resource_id?: string
          resource_type?: string
          run_id?: string
          score?: number
          summary_snapshot?: string | null
          title_snapshot?: string
        }
        Relationships: [
          {
            foreignKeyName: "arrival_recommendations_registry_id_fkey"
            columns: ["registry_id"]
            isOneToOne: false
            referencedRelation: "arrival_resource_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arrival_recommendations_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "arrival_recommendation_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      arrival_resource_match_rules: {
        Row: {
          answer_option_id: string
          created_at: string
          effect: string
          id: string
          reason_template: string | null
          registry_id: string
          rule_version_id: string
          updated_at: string
          weight: number
        }
        Insert: {
          answer_option_id: string
          created_at?: string
          effect: string
          id?: string
          reason_template?: string | null
          registry_id: string
          rule_version_id: string
          updated_at?: string
          weight?: number
        }
        Update: {
          answer_option_id?: string
          created_at?: string
          effect?: string
          id?: string
          reason_template?: string | null
          registry_id?: string
          rule_version_id?: string
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "arrival_resource_match_rules_answer_option_id_fkey"
            columns: ["answer_option_id"]
            isOneToOne: false
            referencedRelation: "arrival_answer_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arrival_resource_match_rules_registry_id_fkey"
            columns: ["registry_id"]
            isOneToOne: false
            referencedRelation: "arrival_resource_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arrival_resource_match_rules_rule_version_id_fkey"
            columns: ["rule_version_id"]
            isOneToOne: false
            referencedRelation: "arrival_rule_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      arrival_resource_registry: {
        Row: {
          active: boolean
          admin_notes: string | null
          bridge_codes: string[]
          content_resource_id: string | null
          course_id: string | null
          created_at: string
          duration_minutes: number | null
          healing_resource_id: string | null
          id: string
          intensity_level: number | null
          lesson_id: string | null
          modality_codes: string[]
          sequence_stage: number | null
          suspended_at: string | null
          suspended_by: string | null
          suspension_reason: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          admin_notes?: string | null
          bridge_codes?: string[]
          content_resource_id?: string | null
          course_id?: string | null
          created_at?: string
          duration_minutes?: number | null
          healing_resource_id?: string | null
          id?: string
          intensity_level?: number | null
          lesson_id?: string | null
          modality_codes?: string[]
          sequence_stage?: number | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          admin_notes?: string | null
          bridge_codes?: string[]
          content_resource_id?: string | null
          course_id?: string | null
          created_at?: string
          duration_minutes?: number | null
          healing_resource_id?: string | null
          id?: string
          intensity_level?: number | null
          lesson_id?: string | null
          modality_codes?: string[]
          sequence_stage?: number | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "arrival_resource_registry_content_resource_id_fkey"
            columns: ["content_resource_id"]
            isOneToOne: false
            referencedRelation: "content_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arrival_resource_registry_content_resource_id_fkey"
            columns: ["content_resource_id"]
            isOneToOne: false
            referencedRelation: "v_content_resources_published"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arrival_resource_registry_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arrival_resource_registry_healing_resource_id_fkey"
            columns: ["healing_resource_id"]
            isOneToOne: false
            referencedRelation: "healing_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arrival_resource_registry_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      arrival_rule_versions: {
        Row: {
          created_at: string
          id: string
          is_current: boolean
          label: string
          published_at: string | null
          questionnaire_version_id: string
          status: string
          updated_at: string
          version_number: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_current?: boolean
          label: string
          published_at?: string | null
          questionnaire_version_id: string
          status?: string
          updated_at?: string
          version_number: number
        }
        Update: {
          created_at?: string
          id?: string
          is_current?: boolean
          label?: string
          published_at?: string | null
          questionnaire_version_id?: string
          status?: string
          updated_at?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "arrival_rule_versions_questionnaire_version_id_fkey"
            columns: ["questionnaire_version_id"]
            isOneToOne: false
            referencedRelation: "arrival_questionnaire_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      boundary_audit_entries: {
        Row: {
          abandonment_patterns: Json
          abandonment_text: string | null
          body_first_response: string | null
          body_signals: Json
          created_at: string
          id: string
          integrity_rating: number | null
          needed_boundary: string | null
          next_time_script: string | null
          relationship_category: string | null
          situation: string | null
          truth_status: string | null
          truth_text: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          abandonment_patterns?: Json
          abandonment_text?: string | null
          body_first_response?: string | null
          body_signals?: Json
          created_at?: string
          id?: string
          integrity_rating?: number | null
          needed_boundary?: string | null
          next_time_script?: string | null
          relationship_category?: string | null
          situation?: string | null
          truth_status?: string | null
          truth_text?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          abandonment_patterns?: Json
          abandonment_text?: string | null
          body_first_response?: string | null
          body_signals?: Json
          created_at?: string
          id?: string
          integrity_rating?: number | null
          needed_boundary?: string | null
          next_time_script?: string | null
          relationship_category?: string | null
          situation?: string | null
          truth_status?: string | null
          truth_text?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      boundary_rehearsal_scripts: {
        Row: {
          added_to_library: boolean
          audit_entry_id: string | null
          created_at: string
          final_text: string | null
          id: string
          no_apology_text: string | null
          no_overexplain_text: string | null
          original_text: string | null
          relationship_category: string | null
          shorter_text: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          added_to_library?: boolean
          audit_entry_id?: string | null
          created_at?: string
          final_text?: string | null
          id?: string
          no_apology_text?: string | null
          no_overexplain_text?: string | null
          original_text?: string | null
          relationship_category?: string | null
          shorter_text?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          added_to_library?: boolean
          audit_entry_id?: string | null
          created_at?: string
          final_text?: string | null
          id?: string
          no_apology_text?: string | null
          no_overexplain_text?: string | null
          original_text?: string | null
          relationship_category?: string | null
          shorter_text?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "boundary_rehearsal_scripts_audit_entry_id_fkey"
            columns: ["audit_entry_id"]
            isOneToOne: false
            referencedRelation: "boundary_audit_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      boundary_script_library: {
        Row: {
          category: string
          created_at: string
          display_order: number
          id: string
          is_favourite: boolean
          is_seed: boolean
          text: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          category: string
          created_at?: string
          display_order?: number
          id?: string
          is_favourite?: boolean
          is_seed?: boolean
          text: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          display_order?: number
          id?: string
          is_favourite?: boolean
          is_seed?: boolean
          text?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      bug_reports: {
        Row: {
          admin_notes: string | null
          browser_info: string | null
          created_at: string
          description: string | null
          id: string
          page_url: string | null
          severity: string
          status: string
          steps_to_reproduce: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          browser_info?: string | null
          created_at?: string
          description?: string | null
          id?: string
          page_url?: string | null
          severity?: string
          status?: string
          steps_to_reproduce?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          browser_info?: string | null
          created_at?: string
          description?: string | null
          id?: string
          page_url?: string | null
          severity?: string
          status?: string
          steps_to_reproduce?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      community_profiles: {
        Row: {
          country: string | null
          created_at: string
          display_name: string
          id: string
          intro: string | null
          is_visible: boolean
          languages: string[]
          pronouns: string | null
          region: string | null
          timezone: string
          town: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          display_name: string
          id?: string
          intro?: string | null
          is_visible?: boolean
          languages?: string[]
          pronouns?: string | null
          region?: string | null
          timezone: string
          town?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          country?: string | null
          created_at?: string
          display_name?: string
          id?: string
          intro?: string | null
          is_visible?: boolean
          languages?: string[]
          pronouns?: string | null
          region?: string | null
          timezone?: string
          town?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      content_resource_tag_assignments: {
        Row: {
          created_at: string
          id: string
          resource_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          resource_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          id?: string
          resource_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_resource_tag_assignments_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "content_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_resource_tag_assignments_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "v_content_resources_published"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_resource_tag_assignments_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "course_tags"
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
      course_tag_assignments: {
        Row: {
          course_id: string
          created_at: string
          id: string
          tag_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          tag_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_tag_assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_tag_assignments_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "course_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      course_tags: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      course_transformation_tools: {
        Row: {
          course_id: string
          created_at: string
          display_order: number
          id: string
          tool_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          display_order?: number
          id?: string
          tool_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          display_order?: number
          id?: string
          tool_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_transformation_tools_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_transformation_tools_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "transformation_tools"
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
      deck_tag_assignments: {
        Row: {
          created_at: string
          deck_id: string
          id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          deck_id: string
          id?: string
          tag_id: string
        }
        Update: {
          created_at?: string
          deck_id?: string
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deck_tag_assignments_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deck_tag_assignments_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "course_tags"
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
          thumbnail_url: string | null
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
          thumbnail_url?: string | null
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
          thumbnail_url?: string | null
          updated_at?: string | null
          woocommerce_product_id?: string | null
          woocommerce_product_id_premium?: string | null
        }
        Relationships: []
      }
      emotional_capacity_checkins: {
        Row: {
          activation_duration: string
          created_at: string
          id: string
          intensity: number
          notes: string | null
          presence_score: number
          regulated_before_reacting: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          activation_duration: string
          created_at?: string
          id?: string
          intensity: number
          notes?: string | null
          presence_score: number
          regulated_before_reacting: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          activation_duration?: string
          created_at?: string
          id?: string
          intensity?: number
          notes?: string | null
          presence_score?: number
          regulated_before_reacting?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      emotional_now_then_entries: {
        Row: {
          created_at: string
          felt_before: string
          id: string
          intensity: number
          proportionate: string
          result: string
          story: string | null
          trigger_text: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          felt_before: string
          id?: string
          intensity: number
          proportionate: string
          result: string
          story?: string | null
          trigger_text: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          felt_before?: string
          id?: string
          intensity?: number
          proportionate?: string
          result?: string
          story?: string | null
          trigger_text?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      emotional_recovery_logs: {
        Row: {
          activation_at: string
          baseline_at: string | null
          created_at: string
          id: string
          notes: string | null
          recovery_minutes: number | null
          trigger_text: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activation_at?: string
          baseline_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          recovery_minutes?: number | null
          trigger_text: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activation_at?: string
          baseline_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          recovery_minutes?: number | null
          trigger_text?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      emotional_regulation_logs: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          regulated_score: number | null
          state: string
          tool_key: string
          tool_label: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          regulated_score?: number | null
          state: string
          tool_key: string
          tool_label: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          regulated_score?: number | null
          state?: string
          tool_key?: string
          tool_label?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      emotional_somatic_entries: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          selections: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          selections?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          selections?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      emotional_translation_entries: {
        Row: {
          chosen_action: string | null
          created_at: string
          emotion: string
          id: string
          need: string
          updated_at: string
          user_id: string
        }
        Insert: {
          chosen_action?: string | null
          created_at?: string
          emotion: string
          id?: string
          need: string
          updated_at?: string
          user_id: string
        }
        Update: {
          chosen_action?: string | null
          created_at?: string
          emotion?: string
          id?: string
          need?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      emotional_weekly_reflections: {
        Row: {
          created_at: string
          emotion_avoided: string | null
          emotion_most: string | null
          id: string
          need_discovered: string | null
          proud_of: string | null
          reacted_before_regulating: string | null
          regulated_before_reacting: string | null
          trigger_taught: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emotion_avoided?: string | null
          emotion_most?: string | null
          id?: string
          need_discovered?: string | null
          proud_of?: string | null
          reacted_before_regulating?: string | null
          regulated_before_reacting?: string | null
          trigger_taught?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          emotion_avoided?: string | null
          emotion_most?: string | null
          id?: string
          need_discovered?: string | null
          proud_of?: string | null
          reacted_before_regulating?: string | null
          regulated_before_reacting?: string | null
          trigger_taught?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      entitlements: {
        Row: {
          created_at: string
          ends_at: string | null
          grace_until: string | null
          id: string
          metadata: Json
          product_kind: string
          source: string
          source_ref: string | null
          starts_at: string | null
          status: string
          stripe_environment: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          grace_until?: string | null
          id?: string
          metadata?: Json
          product_kind?: string
          source: string
          source_ref?: string | null
          starts_at?: string | null
          status: string
          stripe_environment?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          grace_until?: string | null
          id?: string
          metadata?: Json
          product_kind?: string
          source?: string
          source_ref?: string | null
          starts_at?: string | null
          status?: string
          stripe_environment?: string | null
          updated_at?: string
          user_id?: string
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
      feature_suggestions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      founder_price_audit: {
        Row: {
          action: string
          actor: string | null
          at: string
          from_status: string | null
          id: string
          reason: string | null
          stripe_environment: string | null
          to_status: string | null
          user_id: string
        }
        Insert: {
          action: string
          actor?: string | null
          at?: string
          from_status?: string | null
          id?: string
          reason?: string | null
          stripe_environment?: string | null
          to_status?: string | null
          user_id: string
        }
        Update: {
          action?: string
          actor?: string | null
          at?: string
          from_status?: string | null
          id?: string
          reason?: string | null
          stripe_environment?: string | null
          to_status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      founding_members: {
        Row: {
          created_at: string
          founder_badge_awarded_at: string
          founding_member_since: string
          founding_price_eligibility_status: string
          founding_price_lost_at: string | null
          founding_price_lost_reason: string | null
          founding_subscription_id: string | null
          is_founding_member: boolean
          notes: string | null
          stripe_environment: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          founder_badge_awarded_at?: string
          founding_member_since?: string
          founding_price_eligibility_status?: string
          founding_price_lost_at?: string | null
          founding_price_lost_reason?: string | null
          founding_subscription_id?: string | null
          is_founding_member?: boolean
          notes?: string | null
          stripe_environment?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          founder_badge_awarded_at?: string
          founding_member_since?: string
          founding_price_eligibility_status?: string
          founding_price_lost_at?: string | null
          founding_price_lost_reason?: string | null
          founding_subscription_id?: string | null
          is_founding_member?: boolean
          notes?: string | null
          stripe_environment?: string
          updated_at?: string
          user_id?: string
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
      home_recommendations: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          end_at: string | null
          id: string
          image_url: string | null
          internal_route: string | null
          is_active: boolean
          placement: string
          priority: number
          resource_id: string | null
          start_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_at?: string | null
          id?: string
          image_url?: string | null
          internal_route?: string | null
          is_active?: boolean
          placement: string
          priority?: number
          resource_id?: string | null
          start_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_at?: string | null
          id?: string
          image_url?: string | null
          internal_route?: string | null
          is_active?: boolean
          placement?: string
          priority?: number
          resource_id?: string | null
          start_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "home_recommendations_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "content_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "home_recommendations_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "v_content_resources_published"
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
      integrity_reflections: {
        Row: {
          boundary_outcome: string | null
          communication: number | null
          created_at: string
          exhaustion: number | null
          held_text: string | null
          id: string
          practise_text: string | null
          recovery_time: string | null
          resentment: number | null
          status: string | null
          updated_at: string
          user_id: string
          wobbled_text: string | null
        }
        Insert: {
          boundary_outcome?: string | null
          communication?: number | null
          created_at?: string
          exhaustion?: number | null
          held_text?: string | null
          id?: string
          practise_text?: string | null
          recovery_time?: string | null
          resentment?: number | null
          status?: string | null
          updated_at?: string
          user_id: string
          wobbled_text?: string | null
        }
        Update: {
          boundary_outcome?: string | null
          communication?: number | null
          created_at?: string
          exhaustion?: number | null
          held_text?: string | null
          id?: string
          practise_text?: string | null
          recovery_time?: string | null
          resentment?: number | null
          status?: string | null
          updated_at?: string
          user_id?: string
          wobbled_text?: string | null
        }
        Relationships: []
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
          completed_at: string | null
          created_at: string | null
          form_responses: Json | null
          id: string
          journal_text: string | null
          lesson_id: string
          selected_answer: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          audio_position?: number | null
          completed_at?: string | null
          created_at?: string | null
          form_responses?: Json | null
          id?: string
          journal_text?: string | null
          lesson_id: string
          selected_answer?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          audio_position?: number | null
          completed_at?: string | null
          created_at?: string | null
          form_responses?: Json | null
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
          downloadable_files: Json
          form_questions: Json | null
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
          downloadable_files?: Json
          form_questions?: Json | null
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
          downloadable_files?: Json
          form_questions?: Json | null
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
      living_experiments: {
        Row: {
          content_revision: number
          created_at: string
          guide_key: string | null
          id: string
          lifecycle: string
          moment_id: string | null
          own_experiment: string | null
          pattern_id: string | null
          returned_at: string | null
          schema_version: number
          state_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content_revision?: number
          created_at?: string
          guide_key?: string | null
          id?: string
          lifecycle?: string
          moment_id?: string | null
          own_experiment?: string | null
          pattern_id?: string | null
          returned_at?: string | null
          schema_version?: number
          state_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content_revision?: number
          created_at?: string
          guide_key?: string | null
          id?: string
          lifecycle?: string
          moment_id?: string | null
          own_experiment?: string | null
          pattern_id?: string | null
          returned_at?: string | null
          schema_version?: number
          state_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "living_experiments_moment_id_fkey"
            columns: ["moment_id"]
            isOneToOne: false
            referencedRelation: "temple_moments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "living_experiments_pattern_id_fkey"
            columns: ["pattern_id"]
            isOneToOne: false
            referencedRelation: "living_patterns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "living_experiments_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "living_states"
            referencedColumns: ["id"]
          },
        ]
      }
      living_field_notes: {
        Row: {
          body: string
          content: Json
          content_revision: number
          created_at: string
          experiment_id: string
          id: string
          outcome: string | null
          phase: string
          recorded_at: string
          schema_version: number
          updated_at: string
        }
        Insert: {
          body?: string
          content?: Json
          content_revision?: number
          created_at?: string
          experiment_id: string
          id?: string
          outcome?: string | null
          phase: string
          recorded_at?: string
          schema_version?: number
          updated_at?: string
        }
        Update: {
          body?: string
          content?: Json
          content_revision?: number
          created_at?: string
          experiment_id?: string
          id?: string
          outcome?: string | null
          phase?: string
          recorded_at?: string
          schema_version?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "living_field_notes_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "living_experiments"
            referencedColumns: ["id"]
          },
        ]
      }
      living_invitation_hides: {
        Row: {
          created_at: string
          id: string
          invitation_key: string
          subject_key: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invitation_key: string
          subject_key: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invitation_key?: string
          subject_key?: string
          user_id?: string
        }
        Relationships: []
      }
      living_media_attachments: {
        Row: {
          byte_size: number | null
          content_revision: number
          created_at: string
          declared_byte_size: number
          duration_seconds: number | null
          field_note_id: string
          finalized_at: string | null
          id: string
          media_kind: string
          mime_type: string
          object_path: string
          original_filename: string
          schema_version: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          byte_size?: number | null
          content_revision?: number
          created_at?: string
          declared_byte_size: number
          duration_seconds?: number | null
          field_note_id: string
          finalized_at?: string | null
          id?: string
          media_kind: string
          mime_type: string
          object_path: string
          original_filename: string
          schema_version?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          byte_size?: number | null
          content_revision?: number
          created_at?: string
          declared_byte_size?: number
          duration_seconds?: number | null
          field_note_id?: string
          finalized_at?: string | null
          id?: string
          media_kind?: string
          mime_type?: string
          object_path?: string
          original_filename?: string
          schema_version?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "living_media_attachments_field_note_id_fkey"
            columns: ["field_note_id"]
            isOneToOne: false
            referencedRelation: "living_field_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      living_media_deletions: {
        Row: {
          attempts: number
          enqueued_at: string
          id: string
          last_error: string | null
          object_path: string
        }
        Insert: {
          attempts?: number
          enqueued_at?: string
          id?: string
          last_error?: string | null
          object_path: string
        }
        Update: {
          attempts?: number
          enqueued_at?: string
          id?: string
          last_error?: string | null
          object_path?: string
        }
        Relationships: []
      }
      living_pattern_evidence: {
        Row: {
          content: Json
          content_revision: number
          created_at: string
          id: string
          occurred_at: string
          pattern_id: string
          schema_version: number
          updated_at: string
        }
        Insert: {
          content?: Json
          content_revision?: number
          created_at?: string
          id?: string
          occurred_at?: string
          pattern_id: string
          schema_version?: number
          updated_at?: string
        }
        Update: {
          content?: Json
          content_revision?: number
          created_at?: string
          id?: string
          occurred_at?: string
          pattern_id?: string
          schema_version?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "living_pattern_evidence_pattern_id_fkey"
            columns: ["pattern_id"]
            isOneToOne: false
            referencedRelation: "living_patterns"
            referencedColumns: ["id"]
          },
        ]
      }
      living_patterns: {
        Row: {
          chosen_at: string
          commitment: string | null
          content: Json
          content_revision: number
          created_at: string
          id: string
          label: string
          rechosen_at: string | null
          retired_at: string | null
          schema_version: number
          updated_at: string
          user_id: string
        }
        Insert: {
          chosen_at?: string
          commitment?: string | null
          content?: Json
          content_revision?: number
          created_at?: string
          id?: string
          label: string
          rechosen_at?: string | null
          retired_at?: string | null
          schema_version?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          chosen_at?: string
          commitment?: string | null
          content?: Json
          content_revision?: number
          created_at?: string
          id?: string
          label?: string
          rechosen_at?: string | null
          retired_at?: string | null
          schema_version?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      living_record_links: {
        Row: {
          created_at: string
          id: string
          note: string | null
          source_id: string
          source_kind: string
          target_id: string
          target_kind: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          source_id: string
          source_kind: string
          target_id: string
          target_kind: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          source_id?: string
          source_kind?: string
          target_id?: string
          target_kind?: string
          user_id?: string
        }
        Relationships: []
      }
      living_resource_tags: {
        Row: {
          created_at: string
          id: string
          noticed_after: string | null
          resource_family: string
          resource_id: string
          target_id: string
          target_kind: string
          title_snapshot: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          noticed_after?: string | null
          resource_family: string
          resource_id: string
          target_id: string
          target_kind: string
          title_snapshot: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          noticed_after?: string | null
          resource_family?: string
          resource_id?: string
          target_id?: string
          target_kind?: string
          title_snapshot?: string
          user_id?: string
        }
        Relationships: []
      }
      living_states: {
        Row: {
          body: Json
          capacity: Json
          content_revision: number
          created_at: string
          desired_state: Json
          feeling: Json
          id: string
          occurred_at: string
          receive: Json
          reorient: Json
          schema_version: number
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: Json
          capacity?: Json
          content_revision?: number
          created_at?: string
          desired_state?: Json
          feeling?: Json
          id?: string
          occurred_at?: string
          receive?: Json
          reorient?: Json
          schema_version?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: Json
          capacity?: Json
          content_revision?: number
          created_at?: string
          desired_state?: Json
          feeling?: Json
          id?: string
          occurred_at?: string
          receive?: Json
          reorient?: Json
          schema_version?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      living_theme_attachments: {
        Row: {
          created_at: string
          id: string
          target_id: string
          target_kind: string
          theme_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          target_id: string
          target_kind: string
          theme_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          target_id?: string
          target_kind?: string
          theme_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "living_theme_attachments_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "living_themes"
            referencedColumns: ["id"]
          },
        ]
      }
      living_themes: {
        Row: {
          content_revision: number
          created_at: string
          id: string
          label: string
          note: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content_revision?: number
          created_at?: string
          id?: string
          label: string
          note?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content_revision?: number
          created_at?: string
          id?: string
          label?: string
          note?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      manual_access_grant_audit: {
        Row: {
          acted_at: string
          action_type: string
          actor: string | null
          grant_id: string
          id: string
          new_expires_at: string | null
          new_revoked_at: string | null
          new_starts_at: string | null
          notes: string | null
          previous_expires_at: string | null
          previous_revoked_at: string | null
          previous_starts_at: string | null
          user_id: string
        }
        Insert: {
          acted_at?: string
          action_type: string
          actor?: string | null
          grant_id: string
          id?: string
          new_expires_at?: string | null
          new_revoked_at?: string | null
          new_starts_at?: string | null
          notes?: string | null
          previous_expires_at?: string | null
          previous_revoked_at?: string | null
          previous_starts_at?: string | null
          user_id: string
        }
        Update: {
          acted_at?: string
          action_type?: string
          actor?: string | null
          grant_id?: string
          id?: string
          new_expires_at?: string | null
          new_revoked_at?: string | null
          new_starts_at?: string | null
          notes?: string | null
          previous_expires_at?: string | null
          previous_revoked_at?: string | null
          previous_starts_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      manual_access_grants: {
        Row: {
          bucket_key: string
          created_at: string
          ends_at: string
          granted_by: string | null
          id: string
          notes: string | null
          starts_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bucket_key: string
          created_at?: string
          ends_at: string
          granted_by?: string | null
          id?: string
          notes?: string | null
          starts_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bucket_key?: string
          created_at?: string
          ends_at?: string
          granted_by?: string | null
          id?: string
          notes?: string | null
          starts_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      manual_access_legacy_bucket_history: {
        Row: {
          archived_at: string
          bucket_key: string
          ends_at: string
          granted_by: string | null
          id: string
          notes: string | null
          original_created_at: string
          original_grant_id: string
          starts_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string
          bucket_key: string
          ends_at: string
          granted_by?: string | null
          id?: string
          notes?: string | null
          original_created_at: string
          original_grant_id: string
          starts_at: string
          user_id: string
        }
        Update: {
          archived_at?: string
          bucket_key?: string
          ends_at?: string
          granted_by?: string | null
          id?: string
          notes?: string | null
          original_created_at?: string
          original_grant_id?: string
          starts_at?: string
          user_id?: string
        }
        Relationships: []
      }
      manual_full_access_grants: {
        Row: {
          access_scope: string
          created_at: string
          expires_at: string
          granted_by: string | null
          id: string
          notes: string | null
          revoked_at: string | null
          starts_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_scope?: string
          created_at?: string
          expires_at: string
          granted_by?: string | null
          id?: string
          notes?: string | null
          revoked_at?: string | null
          starts_at: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_scope?: string
          created_at?: string
          expires_at?: string
          granted_by?: string | null
          id?: string
          notes?: string | null
          revoked_at?: string | null
          starts_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      member_last_activity: {
        Row: {
          href: string
          id: string
          kind: string
          occurred_at: string
          ref_id: string
          title: string
          user_id: string
        }
        Insert: {
          href: string
          id?: string
          kind: string
          occurred_at?: string
          ref_id: string
          title: string
          user_id: string
        }
        Update: {
          href?: string
          id?: string
          kind?: string
          occurred_at?: string
          ref_id?: string
          title?: string
          user_id?: string
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
      mirror_adult_attestation_versions: {
        Row: {
          body: string
          created_at: string
          effective_at: string
          id: string
          is_current: boolean
          version: string
        }
        Insert: {
          body: string
          created_at?: string
          effective_at?: string
          id?: string
          is_current?: boolean
          version: string
        }
        Update: {
          body?: string
          created_at?: string
          effective_at?: string
          id?: string
          is_current?: boolean
          version?: string
        }
        Relationships: []
      }
      mirror_adult_attestations: {
        Row: {
          attested_at: string
          id: string
          user_id: string
          version_id: string
        }
        Insert: {
          attested_at?: string
          id?: string
          user_id: string
          version_id: string
        }
        Update: {
          attested_at?: string
          id?: string
          user_id?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mirror_adult_attestations_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "mirror_adult_attestation_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      mirror_agreement_acceptances: {
        Row: {
          accepted_at: string
          id: string
          user_id: string
          version_id: string
        }
        Insert: {
          accepted_at?: string
          id?: string
          user_id: string
          version_id: string
        }
        Update: {
          accepted_at?: string
          id?: string
          user_id?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mirror_agreement_acceptances_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "mirror_agreement_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      mirror_agreement_versions: {
        Row: {
          body: string
          created_at: string
          effective_at: string
          id: string
          is_current: boolean
          version: string
        }
        Insert: {
          body: string
          created_at?: string
          effective_at?: string
          id?: string
          is_current?: boolean
          version: string
        }
        Update: {
          body?: string
          created_at?: string
          effective_at?: string
          id?: string
          is_current?: boolean
          version?: string
        }
        Relationships: []
      }
      mirror_availability_windows: {
        Row: {
          created_at: string
          id: string
          local_end: string
          local_start: string
          updated_at: string
          user_id: string
          weekday: number
        }
        Insert: {
          created_at?: string
          id?: string
          local_end: string
          local_start: string
          updated_at?: string
          user_id: string
          weekday: number
        }
        Update: {
          created_at?: string
          id?: string
          local_end?: string
          local_start?: string
          updated_at?: string
          user_id?: string
          weekday?: number
        }
        Relationships: []
      }
      mirror_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      mirror_capacity: {
        Row: {
          created_at: string
          current_openings: number | null
          state: Database["public"]["Enums"]["mirror_capacity_state"]
          updated_at: string
          user_id: string
          weekly_session_max: number
        }
        Insert: {
          created_at?: string
          current_openings?: number | null
          state: Database["public"]["Enums"]["mirror_capacity_state"]
          updated_at?: string
          user_id: string
          weekly_session_max: number
        }
        Update: {
          created_at?: string
          current_openings?: number | null
          state?: Database["public"]["Enums"]["mirror_capacity_state"]
          updated_at?: string
          user_id?: string
          weekly_session_max?: number
        }
        Relationships: []
      }
      mirror_member_topics: {
        Row: {
          axis: Database["public"]["Enums"]["mirror_topic_axis"]
          created_at: string
          topic_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          axis: Database["public"]["Enums"]["mirror_topic_axis"]
          created_at?: string
          topic_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          axis?: Database["public"]["Enums"]["mirror_topic_axis"]
          created_at?: string
          topic_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mirror_member_topics_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "mirror_topic_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      mirror_orientation_completions: {
        Row: {
          completed_at: string
          id: string
          user_id: string
          version_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          user_id: string
          version_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          user_id?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mirror_orientation_completions_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "mirror_orientation_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      mirror_orientation_versions: {
        Row: {
          body: string
          created_at: string
          effective_at: string
          id: string
          is_current: boolean
          version: string
        }
        Insert: {
          body: string
          created_at?: string
          effective_at?: string
          id?: string
          is_current?: boolean
          version: string
        }
        Update: {
          body?: string
          created_at?: string
          effective_at?: string
          id?: string
          is_current?: boolean
          version?: string
        }
        Relationships: []
      }
      mirror_participations: {
        Row: {
          opted_in_at: string | null
          updated_at: string
          user_id: string
          withdrawn_at: string | null
        }
        Insert: {
          opted_in_at?: string | null
          updated_at?: string
          user_id: string
          withdrawn_at?: string | null
        }
        Update: {
          opted_in_at?: string | null
          updated_at?: string
          user_id?: string
          withdrawn_at?: string | null
        }
        Relationships: []
      }
      mirror_session_preferences: {
        Row: {
          advance_notice_hours: number
          created_at: string
          durations: number[]
          open_to_in_person: boolean | null
          perspective_preference: string | null
          session_format: Database["public"]["Enums"]["mirror_session_format"]
          updated_at: string
          user_id: string
        }
        Insert: {
          advance_notice_hours: number
          created_at?: string
          durations: number[]
          open_to_in_person?: boolean | null
          perspective_preference?: string | null
          session_format: Database["public"]["Enums"]["mirror_session_format"]
          updated_at?: string
          user_id: string
        }
        Update: {
          advance_notice_hours?: number
          created_at?: string
          durations?: number[]
          open_to_in_person?: boolean | null
          perspective_preference?: string | null
          session_format?: Database["public"]["Enums"]["mirror_session_format"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mirror_suspensions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          lifted_at: string | null
          lifted_by: string | null
          reason: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          lifted_at?: string | null
          lifted_by?: string | null
          reason?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          lifted_at?: string | null
          lifted_by?: string | null
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mirror_topic_catalog: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          display_order: number
          id: string
          label: string
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          label: string
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          label?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      mirror_topic_notes: {
        Row: {
          created_at: string
          note: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          note: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          note?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      nervous_anchor_maps: {
        Row: {
          created_at: string
          id: string
          primary_anchor: string | null
          ratings: Json
          secondary_anchors: Json
          sensations: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          primary_anchor?: string | null
          ratings?: Json
          secondary_anchors?: Json
          sensations?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          primary_anchor?: string | null
          ratings?: Json
          secondary_anchors?: Json
          sensations?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      nervous_anchoring_sessions: {
        Row: {
          completed: boolean
          created_at: string
          duration_minutes: number
          id: string
          reflection: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          duration_minutes: number
          id?: string
          reflection?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          duration_minutes?: number
          id?: string
          reflection?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      nervous_anchoring_weekly: {
        Row: {
          best_tool: string | null
          body_response: string | null
          created_at: string
          id: string
          next_week_focus: string | null
          return_strategy: string | null
          triggers: Json
          truth: string | null
          updated_at: string
          user_id: string
          week_start: string
        }
        Insert: {
          best_tool?: string | null
          body_response?: string | null
          created_at?: string
          id?: string
          next_week_focus?: string | null
          return_strategy?: string | null
          triggers?: Json
          truth?: string | null
          updated_at?: string
          user_id: string
          week_start: string
        }
        Update: {
          best_tool?: string | null
          body_response?: string | null
          created_at?: string
          id?: string
          next_week_focus?: string | null
          return_strategy?: string | null
          triggers?: Json
          truth?: string | null
          updated_at?: string
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
      nervous_stability_checkins: {
        Row: {
          body_connection: number
          capacity: number
          created_at: string
          entry_date: string
          id: string
          regulation: number
          score: number
          truth_connection: number
          updated_at: string
          user_id: string
        }
        Insert: {
          body_connection: number
          capacity: number
          created_at?: string
          entry_date?: string
          id?: string
          regulation: number
          score: number
          truth_connection: number
          updated_at?: string
          user_id: string
        }
        Update: {
          body_connection?: number
          capacity?: number
          created_at?: string
          entry_date?: string
          id?: string
          regulation?: number
          score?: number
          truth_connection?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          active_member_since: string | null
          created_at: string | null
          current_period_end: string | null
          email: string | null
          full_name: string | null
          full_name_encrypted: Json | null
          id: string
          is_active_member: boolean
          is_encrypted: boolean | null
          member_tier_code: string | null
          must_change_password: boolean | null
          newsletter_opt_in: boolean
          plan_cadence: string | null
          stripe_customer_id: string | null
          subscription_status: string | null
          updated_at: string | null
        }
        Insert: {
          active_member_since?: string | null
          created_at?: string | null
          current_period_end?: string | null
          email?: string | null
          full_name?: string | null
          full_name_encrypted?: Json | null
          id: string
          is_active_member?: boolean
          is_encrypted?: boolean | null
          member_tier_code?: string | null
          must_change_password?: boolean | null
          newsletter_opt_in?: boolean
          plan_cadence?: string | null
          stripe_customer_id?: string | null
          subscription_status?: string | null
          updated_at?: string | null
        }
        Update: {
          active_member_since?: string | null
          created_at?: string | null
          current_period_end?: string | null
          email?: string | null
          full_name?: string | null
          full_name_encrypted?: Json | null
          id?: string
          is_active_member?: boolean
          is_encrypted?: boolean | null
          member_tier_code?: string | null
          must_change_password?: boolean | null
          newsletter_opt_in?: boolean
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
      quiz_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          quiz_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          quiz_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          quiz_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_events_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_options: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          position: number
          question_id: string
          result_id: string | null
          text: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          position?: number
          question_id: string
          result_id?: string | null
          text: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          position?: number
          question_id?: string
          result_id?: string | null
          text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_options_result_id_fkey"
            columns: ["result_id"]
            isOneToOne: false
            referencedRelation: "quiz_results"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          created_at: string
          help_text: string | null
          id: string
          image_url: string | null
          position: number
          quiz_id: string
          text: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          help_text?: string | null
          id?: string
          image_url?: string | null
          position?: number
          quiz_id: string
          text: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          help_text?: string | null
          id?: string
          image_url?: string | null
          position?: number
          quiz_id?: string
          text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_responses: {
        Row: {
          answers: Json
          completed: boolean
          created_at: string
          email: string | null
          id: string
          ip_hash: string | null
          name: string | null
          quiz_id: string
          result_id: string | null
          user_id: string | null
        }
        Insert: {
          answers?: Json
          completed?: boolean
          created_at?: string
          email?: string | null
          id?: string
          ip_hash?: string | null
          name?: string | null
          quiz_id: string
          result_id?: string | null
          user_id?: string | null
        }
        Update: {
          answers?: Json
          completed?: boolean
          created_at?: string
          email?: string | null
          id?: string
          ip_hash?: string | null
          name?: string | null
          quiz_id?: string
          result_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_responses_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_responses_result_id_fkey"
            columns: ["result_id"]
            isOneToOne: false
            referencedRelation: "quiz_results"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_results: {
        Row: {
          created_at: string
          cta_label: string | null
          cta_url: string | null
          description: string | null
          id: string
          image_url: string | null
          position: number
          quiz_id: string
          redirect_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          position?: number
          quiz_id: string
          redirect_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          position?: number
          quiz_id?: string
          redirect_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_results_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          accent_color: string
          access: string
          button_label: string
          collect_name: boolean
          consent_text: string | null
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          mailerlite_group_id: string | null
          primary_color: string
          require_email: boolean
          seo_description: string | null
          seo_title: string | null
          slug: string
          status: string
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          accent_color?: string
          access?: string
          button_label?: string
          collect_name?: boolean
          consent_text?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          mailerlite_group_id?: string | null
          primary_color?: string
          require_email?: boolean
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          status?: string
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          accent_color?: string
          access?: string
          button_label?: string
          collect_name?: boolean
          consent_text?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          mailerlite_group_id?: string | null
          primary_color?: string
          require_email?: boolean
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          status?: string
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
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
          spread_cards: Json | null
          spread_name: string | null
          spread_type: string | null
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
          spread_cards?: Json | null
          spread_name?: string | null
          spread_type?: string | null
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
          spread_cards?: Json | null
          spread_name?: string | null
          spread_type?: string | null
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
      snail_mail_letters: {
        Row: {
          card_ids: string[]
          card_snapshot: Json | null
          created_at: string
          draft_content: string | null
          final_content: string | null
          generated_at: string | null
          id: string
          model_used: string | null
          month_number: number
          sent_at: string | null
          status: string
          subscriber_id: string
          theme: string
          updated_at: string
        }
        Insert: {
          card_ids?: string[]
          card_snapshot?: Json | null
          created_at?: string
          draft_content?: string | null
          final_content?: string | null
          generated_at?: string | null
          id?: string
          model_used?: string | null
          month_number: number
          sent_at?: string | null
          status?: string
          subscriber_id: string
          theme: string
          updated_at?: string
        }
        Update: {
          card_ids?: string[]
          card_snapshot?: Json | null
          created_at?: string
          draft_content?: string | null
          final_content?: string | null
          generated_at?: string | null
          id?: string
          model_used?: string | null
          month_number?: number
          sent_at?: string | null
          status?: string
          subscriber_id?: string
          theme?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "snail_mail_letters_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "snail_mail_subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      snail_mail_subscribers: {
        Row: {
          created_at: string
          current_month: number
          email: string | null
          full_name: string
          id: string
          notes: string | null
          postal_address: string
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_month?: number
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          postal_address: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_month?: number
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          postal_address?: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      stripe_webhook_env_mismatches: {
        Row: {
          event_id: string | null
          event_livemode: boolean | null
          id: string
          reason: string
          recorded_at: string
          verified_env: string
        }
        Insert: {
          event_id?: string | null
          event_livemode?: boolean | null
          id?: string
          reason: string
          recorded_at?: string
          verified_env: string
        }
        Update: {
          event_id?: string | null
          event_livemode?: boolean | null
          id?: string
          reason?: string
          recorded_at?: string
          verified_env?: string
        }
        Relationships: []
      }
      stripe_webhook_events: {
        Row: {
          attempt_count: number
          completed_at: string | null
          event_created_at: string
          event_id: string
          event_type: string
          last_error: string | null
          lease_token: string | null
          processed_at: string
          started_at: string | null
          status: string
          stripe_environment: string
        }
        Insert: {
          attempt_count?: number
          completed_at?: string | null
          event_created_at: string
          event_id: string
          event_type: string
          last_error?: string | null
          lease_token?: string | null
          processed_at?: string
          started_at?: string | null
          status?: string
          stripe_environment?: string
        }
        Update: {
          attempt_count?: number
          completed_at?: string | null
          event_created_at?: string
          event_id?: string
          event_type?: string
          last_error?: string | null
          lease_token?: string | null
          processed_at?: string
          started_at?: string | null
          status?: string
          stripe_environment?: string
        }
        Relationships: []
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
          last_event_at: string | null
          plan_code: string
          profile_id: string
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_subscription_id: string | null
          quantity: number | null
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_environment: string
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
          last_event_at?: string | null
          plan_code: string
          profile_id: string
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_subscription_id?: string | null
          quantity?: number | null
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_environment?: string
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
          last_event_at?: string | null
          plan_code?: string
          profile_id?: string
          provider?: Database["public"]["Enums"]["payment_provider"]
          provider_subscription_id?: string | null
          quantity?: number | null
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_environment?: string
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
      suggestion_votes: {
        Row: {
          created_at: string
          suggestion_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          suggestion_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          suggestion_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suggestion_votes_suggestion_id_fkey"
            columns: ["suggestion_id"]
            isOneToOne: false
            referencedRelation: "feature_suggestions"
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
      temple_moment_movements: {
        Row: {
          content: Json
          content_revision: number
          created_at: string
          id: string
          moment_id: string
          movement_code: string
          schema_version: number
          updated_at: string
        }
        Insert: {
          content: Json
          content_revision?: number
          created_at?: string
          id?: string
          moment_id: string
          movement_code: string
          schema_version?: number
          updated_at?: string
        }
        Update: {
          content?: Json
          content_revision?: number
          created_at?: string
          id?: string
          moment_id?: string
          movement_code?: string
          schema_version?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "temple_moment_movements_moment_id_fkey"
            columns: ["moment_id"]
            isOneToOne: false
            referencedRelation: "temple_moments"
            referencedColumns: ["id"]
          },
        ]
      }
      temple_moments: {
        Row: {
          archived_at: string | null
          content_revision: number
          created_at: string
          id: string
          label: string | null
          occurred_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          content_revision?: number
          created_at?: string
          id?: string
          label?: string | null
          occurred_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          content_revision?: number
          created_at?: string
          id?: string
          label?: string | null
          occurred_at?: string
          updated_at?: string
          user_id?: string
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
      transformation_entries: {
        Row: {
          answers_json: Json
          created_at: string
          id: string
          linked_card_id: string | null
          linked_course_id: string | null
          linked_symptom_pathway: string | null
          scores_json: Json
          tool_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answers_json?: Json
          created_at?: string
          id?: string
          linked_card_id?: string | null
          linked_course_id?: string | null
          linked_symptom_pathway?: string | null
          scores_json?: Json
          tool_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answers_json?: Json
          created_at?: string
          id?: string
          linked_card_id?: string | null
          linked_course_id?: string | null
          linked_symptom_pathway?: string | null
          scores_json?: Json
          tool_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transformation_entries_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "transformation_tools"
            referencedColumns: ["id"]
          },
        ]
      }
      transformation_insights_cache: {
        Row: {
          expires_at: string
          generated_at: string
          id: string
          insight_text: string
          user_id: string
        }
        Insert: {
          expires_at?: string
          generated_at?: string
          id?: string
          insight_text: string
          user_id: string
        }
        Update: {
          expires_at?: string
          generated_at?: string
          id?: string
          insight_text?: string
          user_id?: string
        }
        Relationships: []
      }
      transformation_recommendation_rules: {
        Row: {
          condition_json: Json
          created_at: string
          id: string
          is_active: boolean
          microcopy: string | null
          priority: number
          recommended_resource_id: string | null
          recommended_tool_id: string | null
          tool_id: string | null
          updated_at: string
        }
        Insert: {
          condition_json?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          microcopy?: string | null
          priority?: number
          recommended_resource_id?: string | null
          recommended_tool_id?: string | null
          tool_id?: string | null
          updated_at?: string
        }
        Update: {
          condition_json?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          microcopy?: string | null
          priority?: number
          recommended_resource_id?: string | null
          recommended_tool_id?: string | null
          tool_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transformation_recommendation_rules_recommended_tool_id_fkey"
            columns: ["recommended_tool_id"]
            isOneToOne: false
            referencedRelation: "transformation_tools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transformation_recommendation_rules_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "transformation_tools"
            referencedColumns: ["id"]
          },
        ]
      }
      transformation_tool_fields: {
        Row: {
          contributes_to_score: boolean
          created_at: string
          field_type: string
          helper_text: string | null
          id: string
          is_required: boolean
          key: string
          label: string
          max: number | null
          max_label: string | null
          min: number | null
          min_label: string | null
          options: Json
          order_index: number
          tool_id: string
          updated_at: string
        }
        Insert: {
          contributes_to_score?: boolean
          created_at?: string
          field_type: string
          helper_text?: string | null
          id?: string
          is_required?: boolean
          key: string
          label: string
          max?: number | null
          max_label?: string | null
          min?: number | null
          min_label?: string | null
          options?: Json
          order_index?: number
          tool_id: string
          updated_at?: string
        }
        Update: {
          contributes_to_score?: boolean
          created_at?: string
          field_type?: string
          helper_text?: string | null
          id?: string
          is_required?: boolean
          key?: string
          label?: string
          max?: number | null
          max_label?: string | null
          min?: number | null
          min_label?: string | null
          options?: Json
          order_index?: number
          tool_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transformation_tool_fields_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "transformation_tools"
            referencedColumns: ["id"]
          },
        ]
      }
      transformation_tools: {
        Row: {
          created_at: string
          display_order: number
          icon_name: string | null
          id: string
          intro_microcopy: string | null
          is_published: boolean
          purpose: string | null
          recommended_resource_ids: string[]
          save_button_label: string
          score_formula: Json
          short_description: string | null
          slug: string
          title: string
          updated_at: string
          when_to_use: string | null
        }
        Insert: {
          created_at?: string
          display_order?: number
          icon_name?: string | null
          id?: string
          intro_microcopy?: string | null
          is_published?: boolean
          purpose?: string | null
          recommended_resource_ids?: string[]
          save_button_label?: string
          score_formula?: Json
          short_description?: string | null
          slug: string
          title: string
          updated_at?: string
          when_to_use?: string | null
        }
        Update: {
          created_at?: string
          display_order?: number
          icon_name?: string | null
          id?: string
          intro_microcopy?: string | null
          is_published?: boolean
          purpose?: string | null
          recommended_resource_ids?: string[]
          save_button_label?: string
          score_formula?: Json
          short_description?: string | null
          slug?: string
          title?: string
          updated_at?: string
          when_to_use?: string | null
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
      _arrival_questionnaire_payload: {
        Args: { _interaction_id: string; _user_id: string }
        Returns: Json
      }
      _mirror_blocks_bidirectional: {
        Args: { _a: string; _b: string }
        Returns: boolean
      }
      _mirror_blocks_privilege_inventory: { Args: never; Returns: Json }
      _mirror_exchange_run_tests: {
        Args: never
        Returns: {
          detail: string
          name: string
          passed: boolean
        }[]
      }
      _oracle_access_run_tests: {
        Args: never
        Returns: {
          detail: string
          name: string
          passed: boolean
        }[]
      }
      _phase3_2_run_tests: {
        Args: never
        Returns: {
          label: string
          note: Json
          passed: boolean
        }[]
      }
      _phase3_2c_run_tests: {
        Args: never
        Returns: {
          label: string
          passed: boolean
        }[]
      }
      _phase3_run_isolation_tests: {
        Args: never
        Returns: {
          label: string
          note: string
          passed: boolean
        }[]
      }
      _stripe_webhook_stale_after: { Args: never; Returns: string }
      admin_create_manual_full_access: {
        Args: {
          _expires_at: string
          _notes?: string
          _starts_at: string
          _user_id: string
        }
        Returns: string
      }
      admin_extend_manual_full_access: {
        Args: { _grant_id: string; _new_expires_at: string; _notes?: string }
        Returns: undefined
      }
      admin_inspect_test_entitlements: {
        Args: { _user_id: string }
        Returns: Json
      }
      admin_reset_test_webhook_event: {
        Args: { _event_id: string }
        Returns: Json
      }
      admin_revoke_manual_full_access: {
        Args: { _grant_id: string; _notes?: string }
        Returns: undefined
      }
      admin_test_get_membership_offer_at: {
        Args: { _as_of: string; _mode: string }
        Returns: Json
      }
      admin_test_reset_user_lifecycle: {
        Args: { _user_id: string }
        Returns: Json
      }
      arrival_abandon_and_restart: {
        Args: { _expected_interaction_id: string }
        Returns: Json
      }
      arrival_admin_suspend_resource: {
        Args: { _reason: string; _registry_id: string }
        Returns: undefined
      }
      arrival_admin_unsuspend_resource: {
        Args: { _registry_id: string }
        Returns: undefined
      }
      arrival_codes_valid: {
        Args: { _codes: string[]; _vocab: string[] }
        Returns: boolean
      }
      arrival_load_interaction: {
        Args: { _interaction_id: string }
        Returns: Json
      }
      arrival_reasons_valid: { Args: { _reasons: Json }; Returns: boolean }
      arrival_save_answers: {
        Args: {
          _answers: Json
          _expected_answers_revision: number
          _interaction_id: string
        }
        Returns: Json
      }
      arrival_start_or_resume: { Args: never; Returns: Json }
      assert_caller_is_admin: { Args: never; Returns: string }
      attribute_affiliate_referral: {
        Args: { _code: string; _commission_model?: string; _link_code?: string }
        Returns: string
      }
      can_view_card: {
        Args: { _deck_id: string; _user_id: string }
        Returns: boolean
      }
      can_view_lesson: { Args: { _user_id: string }; Returns: boolean }
      can_view_lesson_by_door: {
        Args: { _course_id: string; _user_id: string }
        Returns: boolean
      }
      get_current_membership_offer: { Args: never; Returns: Json }
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
      get_member_state: { Args: { _user_id: string }; Returns: Json }
      get_stripe_price_id_for_current_offer: {
        Args: { _mode: string }
        Returns: Json
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
      has_active_manual_full_access: {
        Args: { _user_id: string }
        Returns: boolean
      }
      has_active_membership: { Args: { _user_id: string }; Returns: boolean }
      has_any_manual_access: { Args: { _user_id: string }; Returns: boolean }
      has_bucket_access:
        | { Args: { _bucket_key: string; _user_id: string }; Returns: boolean }
        | { Args: { bucket_key_param: string }; Returns: boolean }
      has_full_temple_access: { Args: { _user_id: string }; Returns: boolean }
      has_manual_access: {
        Args: { _bucket_key: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      ingest_stripe_subscription: {
        Args: {
          _cancel_at_period_end: boolean
          _canceled_at: string
          _current_period_end: string
          _current_period_start: string
          _event_created_at: string
          _stripe_environment?: string
          _stripe_price_id: string
          _stripe_status: string
          _stripe_subscription_id: string
          _user_id: string
        }
        Returns: Json
      }
      is_active_member: { Args: { _user_id: string }; Returns: boolean }
      living_active_patterns: {
        Args: { _include_retired?: boolean; _limit?: number }
        Returns: Json
      }
      living_caller: { Args: never; Returns: string }
      living_experiment_create: {
        Args: {
          _guide_key?: string
          _moment_id?: string
          _own_experiment?: string
          _pattern_id?: string
          _state_id?: string
          _try_body?: string
          _try_content?: Json
        }
        Returns: Json
      }
      living_experiment_create_from_resource: {
        Args: {
          _guide_key?: string
          _own_experiment?: string
          _resource_family: string
          _resource_id: string
          _try_body?: string
          _try_content?: Json
        }
        Returns: Json
      }
      living_experiment_get: { Args: { _id: string }; Returns: Json }
      living_experiment_update: {
        Args: {
          _expected_revision: number
          _guide_key?: string
          _id: string
          _lifecycle?: string
          _moment_id?: string
          _own_experiment?: string
          _pattern_id?: string
          _state_id?: string
        }
        Returns: Json
      }
      living_experiments_from_resource: {
        Args: {
          _limit?: number
          _resource_family: string
          _resource_id: string
        }
        Returns: Json
      }
      living_experiments_list: {
        Args: {
          _cursor_created_at?: string
          _cursor_id?: string
          _include_closed?: boolean
          _limit?: number
        }
        Returns: Json
      }
      living_field_note_create: {
        Args: {
          _body?: string
          _content?: Json
          _experiment_id: string
          _outcome?: string
          _phase: string
        }
        Returns: Json
      }
      living_field_note_update: {
        Args: {
          _body?: string
          _clear_outcome?: boolean
          _content?: Json
          _expected_revision: number
          _id: string
          _outcome?: string
        }
        Returns: Json
      }
      living_invitation_hide: {
        Args: { _invitation_key: string; _subject_key: string }
        Returns: Json
      }
      living_invitation_hides_list: { Args: never; Returns: Json }
      living_invitation_unhide: {
        Args: { _invitation_key: string; _subject_key: string }
        Returns: Json
      }
      living_invitations: { Args: { _include_hidden?: boolean }; Returns: Json }
      living_link_create: {
        Args: {
          _note?: string
          _source_id: string
          _source_kind: string
          _target_id: string
          _target_kind: string
        }
        Returns: Json
      }
      living_link_delete: { Args: { _id: string }; Returns: Json }
      living_links_list: { Args: { _id: string; _kind: string }; Returns: Json }
      living_media_delete: { Args: { _id: string }; Returns: Json }
      living_media_finalize: { Args: { _id: string }; Returns: Json }
      living_media_finalize_verified: {
        Args: { _duration_seconds: number; _id: string; _user_id: string }
        Returns: Json
      }
      living_media_list: { Args: { _field_note_id: string }; Returns: Json }
      living_media_owns_path: {
        Args: { _path: string; _uid: string }
        Returns: boolean
      }
      living_media_prepare: {
        Args: {
          _byte_size: number
          _duration_seconds?: number
          _field_note_id: string
          _filename: string
          _media_kind: string
          _mime_type: string
        }
        Returns: Json
      }
      living_moment_create: {
        Args: {
          _label?: string
          _occurred_at?: string
          _recalibrate?: Json
          _recognise?: Json
          _register?: Json
        }
        Returns: Json
      }
      living_moment_get: { Args: { _id: string }; Returns: Json }
      living_moment_payload: { Args: { _moment_id: string }; Returns: Json }
      living_moment_update: {
        Args: {
          _archive?: boolean
          _clear_label?: boolean
          _expected_revision: number
          _id: string
          _label?: string
          _occurred_at?: string
          _recalibrate?: Json
          _recognise?: Json
          _register?: Json
        }
        Returns: Json
      }
      living_moments_list: {
        Args: {
          _cursor_id?: string
          _cursor_occurred_at?: string
          _include_archived?: boolean
          _limit?: number
        }
        Returns: Json
      }
      living_owns_record: {
        Args: { _id: string; _kind: string; _uid: string }
        Returns: boolean
      }
      living_pattern_create: {
        Args: { _commitment?: string; _content?: Json; _label: string }
        Returns: Json
      }
      living_pattern_evidence_create: {
        Args: { _content?: Json; _occurred_at?: string; _pattern_id: string }
        Returns: Json
      }
      living_pattern_evidence_list: {
        Args: {
          _cursor_id?: string
          _cursor_occurred_at?: string
          _limit?: number
          _pattern_id: string
        }
        Returns: Json
      }
      living_pattern_evidence_update: {
        Args: {
          _content?: Json
          _expected_revision: number
          _id: string
          _occurred_at?: string
        }
        Returns: Json
      }
      living_pattern_experiments_list: {
        Args: { _limit?: number; _pattern_id: string }
        Returns: Json
      }
      living_pattern_get: { Args: { _id: string }; Returns: Json }
      living_pattern_update: {
        Args: {
          _commitment?: string
          _content?: Json
          _expected_revision: number
          _id: string
          _label?: string
          _rechoose?: boolean
          _retire?: boolean
          _unretire?: boolean
        }
        Returns: Json
      }
      living_patterns_list: {
        Args: {
          _cursor_chosen_at?: string
          _cursor_id?: string
          _include_retired?: boolean
          _limit?: number
        }
        Returns: Json
      }
      living_record_row: {
        Args: { _id: string; _kind: string; _uid: string }
        Returns: Json
      }
      living_record_themes: {
        Args: { _target_id: string; _target_kind: string }
        Returns: Json
      }
      living_resource_tag_add: {
        Args: {
          _noticed_after?: string
          _resource_family: string
          _resource_id: string
          _target_id: string
          _target_kind: string
        }
        Returns: Json
      }
      living_resource_tag_remove: { Args: { _id: string }; Returns: Json }
      living_resource_tags_list: {
        Args: { _target_id: string; _target_kind: string }
        Returns: Json
      }
      living_resource_title: {
        Args: { _family: string; _resource_id: string }
        Returns: string
      }
      living_resource_visible_title: {
        Args: { _family: string; _resource_id: string; _uid: string }
        Returns: string
      }
      living_state_create: {
        Args: {
          _body?: Json
          _capacity?: Json
          _desired_state?: Json
          _feeling?: Json
          _occurred_at?: string
          _receive?: Json
          _reorient?: Json
        }
        Returns: Json
      }
      living_state_get: { Args: { _id: string }; Returns: Json }
      living_state_update: {
        Args: {
          _body?: Json
          _capacity?: Json
          _desired_state?: Json
          _expected_revision: number
          _feeling?: Json
          _id: string
          _occurred_at?: string
          _receive?: Json
          _reorient?: Json
        }
        Returns: Json
      }
      living_states_list: {
        Args: {
          _cursor_id?: string
          _cursor_occurred_at?: string
          _limit?: number
        }
        Returns: Json
      }
      living_theme_attach: {
        Args: { _target_id: string; _target_kind: string; _theme_id: string }
        Returns: Json
      }
      living_theme_create: {
        Args: { _label: string; _note?: string }
        Returns: Json
      }
      living_theme_delete: { Args: { _id: string }; Returns: Json }
      living_theme_detach: {
        Args: { _target_id: string; _target_kind: string; _theme_id: string }
        Returns: Json
      }
      living_theme_records: {
        Args: {
          _cursor_created_at?: string
          _cursor_id?: string
          _limit?: number
          _theme_id: string
        }
        Returns: Json
      }
      living_theme_update: {
        Args: {
          _clear_note?: boolean
          _expected_revision: number
          _id: string
          _label?: string
          _note?: string
        }
        Returns: Json
      }
      living_themes_list: { Args: { _limit?: number }; Returns: Json }
      living_thread_page: {
        Args: { _cursor_id?: string; _cursor_occurred_at?: string }
        Returns: Json
      }
      mark_founder_price_lost:
        | { Args: { _reason: string; _user_id: string }; Returns: undefined }
        | {
            Args: {
              _reason: string
              _stripe_environment: string
              _user_id: string
            }
            Returns: undefined
          }
      mirror_accept_agreement: { Args: never; Returns: string }
      mirror_activate_participation: { Args: never; Returns: undefined }
      mirror_admin_lift_suspension: {
        Args: { _user_id: string }
        Returns: undefined
      }
      mirror_admin_suspend: {
        Args: { _reason?: string; _user_id: string }
        Returns: string
      }
      mirror_complete_orientation: { Args: never; Returns: string }
      mirror_current_requirements_met: {
        Args: { _uid: string }
        Returns: boolean
      }
      mirror_exchange_ready_self: { Args: never; Returns: boolean }
      mirror_record_attestation: { Args: never; Returns: string }
      mirror_save_profile: {
        Args: {
          _country?: string
          _display_name: string
          _intro?: string
          _languages?: string[]
          _pronouns?: string
          _region?: string
          _timezone: string
          _town?: string
        }
        Returns: string
      }
      mirror_withdraw_participation: { Args: never; Returns: undefined }
      recompute_profile_active_member: {
        Args: { _user_id: string }
        Returns: undefined
      }
      stripe_webhook_complete_event: {
        Args: {
          _event_id: string
          _lease_token: string
          _stripe_environment: string
        }
        Returns: boolean
      }
      stripe_webhook_fail_event: {
        Args: {
          _error: string
          _event_id: string
          _lease_token: string
          _stripe_environment: string
        }
        Returns: boolean
      }
      stripe_webhook_record_env_mismatch: {
        Args: {
          _event_id: string
          _event_livemode: boolean
          _reason: string
          _verified_env: string
        }
        Returns: undefined
      }
      stripe_webhook_reserve_event: {
        Args: {
          _event_created_at: string
          _event_id: string
          _event_type: string
          _stripe_environment: string
        }
        Returns: Json
      }
      track_affiliate_click: {
        Args: { _code: string }
        Returns: {
          affiliate_id: string
          commission_model: string
          destination_path: string
          link_id: string
          referral_code: string
        }[]
      }
      tsr_body_to_nodes: { Args: { _body: string }; Returns: Json }
      tsr_card_to_richtext: { Args: { _cs: Json }; Returns: Json }
      tsr_card_to_text: { Args: { _cs: Json }; Returns: string }
      tsr_inline: { Args: { _italic?: boolean; _line: string }; Returns: Json }
      tsr_line_to_paragraph: { Args: { _line: string }; Returns: Json }
      tsr_mythic_block: { Args: { _line: string }; Returns: Json }
      upsert_entitlement: {
        Args: {
          _ends_at: string
          _grace_until: string
          _metadata?: Json
          _product_kind: string
          _source: string
          _source_ref: string
          _starts_at: string
          _status: string
          _user_id: string
        }
        Returns: {
          created_at: string
          ends_at: string | null
          grace_until: string | null
          id: string
          metadata: Json
          product_kind: string
          source: string
          source_ref: string | null
          starts_at: string | null
          status: string
          stripe_environment: string | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "entitlements"
          isOneToOne: true
          isSetofReturn: false
        }
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
      mirror_capacity_state: "available" | "limited" | "unavailable"
      mirror_session_format: "audio" | "video" | "either"
      mirror_topic_axis: "hold" | "exclude"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      mirror_capacity_state: ["available", "limited", "unavailable"],
      mirror_session_format: ["audio", "video", "either"],
      mirror_topic_axis: ["hold", "exclude"],
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
