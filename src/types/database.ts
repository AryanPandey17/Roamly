// GENERATED FILE. Do not edit by hand.
// Regenerate with `npm run db:types` after changing supabase/migrations.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      agent_messages: {
        Row: {
          id: number;
          run_id: string;
          trip_id: string;
          user_id: string;
          seq: number;
          agent: Database["public"]["Enums"]["agent_name"];
          kind: Database["public"]["Enums"]["message_kind"];
          round: number | null;
          content: string;
          data: Json | null;
          created_at: string;
        };
        Insert: {
          id?: never;
          run_id: string;
          trip_id: string;
          user_id: string;
          seq: number;
          agent: Database["public"]["Enums"]["agent_name"];
          kind?: Database["public"]["Enums"]["message_kind"];
          round?: number | null;
          content: string;
          data?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: never;
          run_id?: string;
          trip_id?: string;
          user_id?: string;
          seq?: number;
          agent?: Database["public"]["Enums"]["agent_name"];
          kind?: Database["public"]["Enums"]["message_kind"];
          round?: number | null;
          content?: string;
          data?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      agent_runs: {
        Row: {
          id: string;
          trip_id: string;
          user_id: string;
          request_id: string;
          status: Database["public"]["Enums"]["run_status"];
          round: number;
          rejections: number;
          llm_calls: number;
          tool_calls: number;
          error_code: string | null;
          error_message: string | null;
          started_at: string | null;
          finished_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          trip_id: string;
          user_id: string;
          request_id: string;
          status?: Database["public"]["Enums"]["run_status"];
          round?: number;
          rejections?: number;
          llm_calls?: number;
          tool_calls?: number;
          error_code?: string | null;
          error_message?: string | null;
          started_at?: string | null;
          finished_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          trip_id?: string;
          user_id?: string;
          request_id?: string;
          status?: Database["public"]["Enums"]["run_status"];
          round?: number;
          rejections?: number;
          llm_calls?: number;
          tool_calls?: number;
          error_code?: string | null;
          error_message?: string | null;
          started_at?: string | null;
          finished_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      budget_audits: {
        Row: {
          id: string;
          run_id: string;
          trip_id: string;
          user_id: string;
          round: number;
          status: Database["public"]["Enums"]["budget_status"];
          currency: string;
          budget_amount: number;
          total: number;
          breakdown: Json;
          target_agent: Database["public"]["Enums"]["agent_name"] | null;
          target_category: string | null;
          ceiling: number | null;
          over_by: number | null;
          feedback: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          run_id: string;
          trip_id: string;
          user_id: string;
          round: number;
          status: Database["public"]["Enums"]["budget_status"];
          currency: string;
          budget_amount: number;
          total: number;
          breakdown: Json;
          target_agent?: Database["public"]["Enums"]["agent_name"] | null;
          target_category?: string | null;
          ceiling?: number | null;
          over_by?: number | null;
          feedback?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          run_id?: string;
          trip_id?: string;
          user_id?: string;
          round?: number;
          status?: Database["public"]["Enums"]["budget_status"];
          currency?: string;
          budget_amount?: number;
          total?: number;
          breakdown?: Json;
          target_agent?: Database["public"]["Enums"]["agent_name"] | null;
          target_category?: string | null;
          ceiling?: number | null;
          over_by?: number | null;
          feedback?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      itineraries: {
        Row: {
          id: string;
          trip_id: string;
          run_id: string | null;
          user_id: string;
          currency: string;
          budget_amount: number;
          total_cost: number;
          fits_budget: boolean;
          over_by: number;
          cost_breakdown: Json;
          assumptions: string[];
          summary_markdown: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          trip_id: string;
          run_id?: string | null;
          user_id: string;
          currency: string;
          budget_amount: number;
          total_cost: number;
          fits_budget: boolean;
          over_by?: number;
          cost_breakdown?: Json;
          assumptions?: string[];
          summary_markdown?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          trip_id?: string;
          run_id?: string | null;
          user_id?: string;
          currency?: string;
          budget_amount?: number;
          total_cost?: number;
          fits_budget?: boolean;
          over_by?: number;
          cost_breakdown?: Json;
          assumptions?: string[];
          summary_markdown?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      itinerary_days: {
        Row: {
          id: string;
          itinerary_id: string;
          user_id: string;
          day_number: number;
          date: string | null;
          title: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          itinerary_id: string;
          user_id: string;
          day_number: number;
          date?: string | null;
          title?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          itinerary_id?: string;
          user_id?: string;
          day_number?: number;
          date?: string | null;
          title?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      itinerary_items: {
        Row: {
          id: string;
          itinerary_id: string;
          day_id: string;
          user_id: string;
          type: Database["public"]["Enums"]["item_type"];
          position: number;
          title: string;
          description: string | null;
          start_time: string | null;
          end_time: string | null;
          cost_amount: number;
          currency: string | null;
          lat: number | null;
          lng: number | null;
          address: string | null;
          provider: string | null;
          external_id: string | null;
          deep_link: string | null;
          details: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          itinerary_id: string;
          day_id: string;
          user_id: string;
          type: Database["public"]["Enums"]["item_type"];
          position?: number;
          title: string;
          description?: string | null;
          start_time?: string | null;
          end_time?: string | null;
          cost_amount?: number;
          currency?: string | null;
          lat?: number | null;
          lng?: number | null;
          address?: string | null;
          provider?: string | null;
          external_id?: string | null;
          deep_link?: string | null;
          details?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          itinerary_id?: string;
          day_id?: string;
          user_id?: string;
          type?: Database["public"]["Enums"]["item_type"];
          position?: number;
          title?: string;
          description?: string | null;
          start_time?: string | null;
          end_time?: string | null;
          cost_amount?: number;
          currency?: string | null;
          lat?: number | null;
          lng?: number | null;
          address?: string | null;
          provider?: string | null;
          external_id?: string | null;
          deep_link?: string | null;
          details?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      llm_call_logs: {
        Row: {
          id: number;
          run_id: string | null;
          user_id: string | null;
          agent: Database["public"]["Enums"]["agent_name"] | null;
          role: string;
          provider: string;
          requested_model: string;
          served_model: string | null;
          fallback_depth: number;
          prompt_tokens: number | null;
          completion_tokens: number | null;
          latency_ms: number | null;
          status: Database["public"]["Enums"]["call_status"];
          error_code: string | null;
          error_message: string | null;
          cost_usd: number;
          created_at: string;
        };
        Insert: {
          id?: never;
          run_id?: string | null;
          user_id?: string | null;
          agent?: Database["public"]["Enums"]["agent_name"] | null;
          role: string;
          provider: string;
          requested_model: string;
          served_model?: string | null;
          fallback_depth?: number;
          prompt_tokens?: number | null;
          completion_tokens?: number | null;
          latency_ms?: number | null;
          status: Database["public"]["Enums"]["call_status"];
          error_code?: string | null;
          error_message?: string | null;
          cost_usd?: number;
          created_at?: string;
        };
        Update: {
          id?: never;
          run_id?: string | null;
          user_id?: string | null;
          agent?: Database["public"]["Enums"]["agent_name"] | null;
          role?: string;
          provider?: string;
          requested_model?: string;
          served_model?: string | null;
          fallback_depth?: number;
          prompt_tokens?: number | null;
          completion_tokens?: number | null;
          latency_ms?: number | null;
          status?: Database["public"]["Enums"]["call_status"];
          error_code?: string | null;
          error_message?: string | null;
          cost_usd?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          email: string | null;
          avatar_url: string | null;
          onboarded_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          onboarded_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          onboarded_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      provider_quota_usage: {
        Row: {
          provider: string;
          day: string;
          requests: number;
          errors: number;
          updated_at: string;
        };
        Insert: {
          provider: string;
          day?: string;
          requests?: number;
          errors?: number;
          updated_at?: string;
        };
        Update: {
          provider?: string;
          day?: string;
          requests?: number;
          errors?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      saved_options: {
        Row: {
          id: string;
          user_id: string;
          trip_id: string | null;
          kind: Database["public"]["Enums"]["option_kind"];
          provider: string;
          external_id: string;
          title: string;
          payload: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          trip_id?: string | null;
          kind: Database["public"]["Enums"]["option_kind"];
          provider: string;
          external_id: string;
          title: string;
          payload?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          trip_id?: string | null;
          kind?: Database["public"]["Enums"]["option_kind"];
          provider?: string;
          external_id?: string;
          title?: string;
          payload?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      shared_trips: {
        Row: {
          id: string;
          trip_id: string;
          user_id: string;
          token: string;
          expires_at: string | null;
          revoked_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          trip_id: string;
          user_id: string;
          token?: string;
          expires_at?: string | null;
          revoked_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          trip_id?: string;
          user_id?: string;
          token?: string;
          expires_at?: string | null;
          revoked_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      tool_cache: {
        Row: {
          key: string;
          tool: string;
          value: Json;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          key: string;
          tool: string;
          value: Json;
          expires_at: string;
          created_at?: string;
        };
        Update: {
          key?: string;
          tool?: string;
          value?: Json;
          expires_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      tool_call_logs: {
        Row: {
          id: number;
          run_id: string | null;
          user_id: string | null;
          agent: Database["public"]["Enums"]["agent_name"] | null;
          tool: string;
          provider: string | null;
          latency_ms: number | null;
          cache_hit: boolean;
          status: Database["public"]["Enums"]["call_status"];
          error_code: string | null;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: never;
          run_id?: string | null;
          user_id?: string | null;
          agent?: Database["public"]["Enums"]["agent_name"] | null;
          tool: string;
          provider?: string | null;
          latency_ms?: number | null;
          cache_hit?: boolean;
          status: Database["public"]["Enums"]["call_status"];
          error_code?: string | null;
          error_message?: string | null;
          created_at?: string;
        };
        Update: {
          id?: never;
          run_id?: string | null;
          user_id?: string | null;
          agent?: Database["public"]["Enums"]["agent_name"] | null;
          tool?: string;
          provider?: string | null;
          latency_ms?: number | null;
          cache_hit?: boolean;
          status?: Database["public"]["Enums"]["call_status"];
          error_code?: string | null;
          error_message?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      trip_requests: {
        Row: {
          id: string;
          trip_id: string;
          user_id: string;
          raw_prompt: string;
          structured_hints: Json;
          parsed: Json | null;
          assumptions: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          trip_id: string;
          user_id: string;
          raw_prompt: string;
          structured_hints?: Json;
          parsed?: Json | null;
          assumptions?: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          trip_id?: string;
          user_id?: string;
          raw_prompt?: string;
          structured_hints?: Json;
          parsed?: Json | null;
          assumptions?: string[];
          created_at?: string;
        };
        Relationships: [];
      };
      trips: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          destination: string | null;
          destination_lat: number | null;
          destination_lng: number | null;
          origin: string | null;
          start_date: string | null;
          end_date: string | null;
          travellers: number;
          budget_amount: number | null;
          currency: string | null;
          total_cost: number | null;
          status: Database["public"]["Enums"]["trip_status"];
          current_run_id: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string;
          destination?: string | null;
          destination_lat?: number | null;
          destination_lng?: number | null;
          origin?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          travellers?: number;
          budget_amount?: number | null;
          currency?: string | null;
          total_cost?: number | null;
          status?: Database["public"]["Enums"]["trip_status"];
          current_run_id?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          destination?: string | null;
          destination_lat?: number | null;
          destination_lng?: number | null;
          origin?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          travellers?: number;
          budget_amount?: number | null;
          currency?: string | null;
          total_cost?: number | null;
          status?: Database["public"]["Enums"]["trip_status"];
          current_run_id?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_preferences: {
        Row: {
          user_id: string;
          home_city: string | null;
          home_lat: number | null;
          home_lng: number | null;
          currency: string;
          budget_style: Database["public"]["Enums"]["budget_style"];
          pace: Database["public"]["Enums"]["travel_pace"];
          interests: string[];
          dietary: string[];
          theme: Database["public"]["Enums"]["theme_pref"];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          home_city?: string | null;
          home_lat?: number | null;
          home_lng?: number | null;
          currency?: string;
          budget_style?: Database["public"]["Enums"]["budget_style"];
          pace?: Database["public"]["Enums"]["travel_pace"];
          interests?: string[];
          dietary?: string[];
          theme?: Database["public"]["Enums"]["theme_pref"];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          home_city?: string | null;
          home_lat?: number | null;
          home_lng?: number | null;
          currency?: string;
          budget_style?: Database["public"]["Enums"]["budget_style"];
          pace?: Database["public"]["Enums"]["travel_pace"];
          interests?: string[];
          dietary?: string[];
          theme?: Database["public"]["Enums"]["theme_pref"];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: {
      agent_name: "supervisor" | "logistics" | "recommendations" | "budget" | "system";
      budget_status: "approved" | "rejected" | "compromise";
      budget_style: "saver" | "balanced" | "comfort";
      call_status: "success" | "error" | "timeout" | "rate_limited";
      item_type: "flight" | "stay" | "activity" | "meal" | "transfer" | "note";
      message_kind: "info" | "proposal" | "rejection" | "revision" | "approval" | "mediation" | "compromise" | "final" | "error";
      option_kind: "flight" | "stay" | "place";
      run_status: "queued" | "running" | "paused" | "completed" | "completed_over_budget" | "failed";
      theme_pref: "light" | "dark" | "system";
      travel_pace: "relaxed" | "balanced" | "packed";
      trip_status: "draft" | "planning" | "ready" | "over_budget" | "paused" | "failed";
    };
    CompositeTypes: { [_ in never]: never };
  };
};

type Public = Database["public"];
export type Tables<T extends keyof Public["Tables"]> = Public["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Public["Tables"]> = Public["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Public["Tables"]> = Public["Tables"][T]["Update"];
export type Enums<T extends keyof Public["Enums"]> = Public["Enums"][T];

export const Constants = {
  public: {
    Enums: {
      agent_name: ["supervisor", "logistics", "recommendations", "budget", "system"],
      budget_status: ["approved", "rejected", "compromise"],
      budget_style: ["saver", "balanced", "comfort"],
      call_status: ["success", "error", "timeout", "rate_limited"],
      item_type: ["flight", "stay", "activity", "meal", "transfer", "note"],
      message_kind: ["info", "proposal", "rejection", "revision", "approval", "mediation", "compromise", "final", "error"],
      option_kind: ["flight", "stay", "place"],
      run_status: ["queued", "running", "paused", "completed", "completed_over_budget", "failed"],
      theme_pref: ["light", "dark", "system"],
      travel_pace: ["relaxed", "balanced", "packed"],
      trip_status: ["draft", "planning", "ready", "over_budget", "paused", "failed"],
    },
  },
} as const;
