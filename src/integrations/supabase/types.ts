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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string
          deleted_at: string | null
          details: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          is_deleted: boolean
          user_id: string
          user_name: string | null
          user_role: string | null
        }
        Insert: {
          action: string
          created_at?: string
          deleted_at?: string | null
          details?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          is_deleted?: boolean
          user_id: string
          user_name?: string | null
          user_role?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          deleted_at?: string | null
          details?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          is_deleted?: boolean
          user_id?: string
          user_name?: string | null
          user_role?: string | null
        }
        Relationships: []
      }
      admin_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author: string | null
          category: string | null
          content: string | null
          created_at: string
          deleted_at: string | null
          excerpt: string | null
          id: string
          image_url: string | null
          is_deleted: boolean
          is_published: boolean | null
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          author?: string | null
          category?: string | null
          content?: string | null
          created_at?: string
          deleted_at?: string | null
          excerpt?: string | null
          id?: string
          image_url?: string | null
          is_deleted?: boolean
          is_published?: boolean | null
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          author?: string | null
          category?: string | null
          content?: string | null
          created_at?: string
          deleted_at?: string | null
          excerpt?: string | null
          id?: string
          image_url?: string | null
          is_deleted?: boolean
          is_published?: boolean | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          updated_at: string
          user_id: string
          variation: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          updated_at?: string
          user_id: string
          variation?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          updated_at?: string
          user_id?: string
          variation?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          image_url: string | null
          is_deleted: boolean
          name: string
          parent_id: string | null
          slug: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          image_url?: string | null
          is_deleted?: boolean
          name: string
          parent_id?: string | null
          slug: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          image_url?: string | null
          is_deleted?: boolean
          name?: string
          parent_id?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          created_at: string
          deleted_at: string | null
          email: string
          id: string
          is_deleted: boolean
          is_read: boolean | null
          message: string
          name: string
          status: string
          subject: string | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          email: string
          id?: string
          is_deleted?: boolean
          is_read?: boolean | null
          message: string
          name: string
          status?: string
          subject?: string | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          email?: string
          id?: string
          is_deleted?: boolean
          is_read?: boolean | null
          message?: string
          name?: string
          status?: string
          subject?: string | null
        }
        Relationships: []
      }
      coupon_usage: {
        Row: {
          coupon_id: string
          id: string
          order_id: string | null
          used_at: string
          user_id: string
        }
        Insert: {
          coupon_id: string
          id?: string
          order_id?: string | null
          used_at?: string
          user_id: string
        }
        Update: {
          coupon_id?: string
          id?: string
          order_id?: string | null
          used_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_usage_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_usage_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          applies_to: string
          code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          end_date: string | null
          id: string
          is_active: boolean
          max_discount_amount: number | null
          min_order_amount: number | null
          per_user_limit: number | null
          selected_customer_ids: Json | null
          selected_product_ids: Json | null
          start_date: string | null
          updated_at: string
          usage_count: number
          usage_limit: number | null
        }
        Insert: {
          applies_to?: string
          code: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          end_date?: string | null
          id?: string
          is_active?: boolean
          max_discount_amount?: number | null
          min_order_amount?: number | null
          per_user_limit?: number | null
          selected_customer_ids?: Json | null
          selected_product_ids?: Json | null
          start_date?: string | null
          updated_at?: string
          usage_count?: number
          usage_limit?: number | null
        }
        Update: {
          applies_to?: string
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          end_date?: string | null
          id?: string
          is_active?: boolean
          max_discount_amount?: number | null
          min_order_amount?: number | null
          per_user_limit?: number | null
          selected_customer_ids?: Json | null
          selected_product_ids?: Json | null
          start_date?: string | null
          updated_at?: string
          usage_count?: number
          usage_limit?: number | null
        }
        Relationships: []
      }
      email_campaigns: {
        Row: {
          body: string
          created_at: string
          deleted_at: string | null
          error_log: string | null
          failed_count: number | null
          id: string
          is_deleted: boolean
          is_paused: boolean | null
          name: string
          pending_count: number | null
          recipient_group: string
          recipient_ids: string[] | null
          scheduled_at: string | null
          send_interval_minutes: number | null
          sent_at: string | null
          sent_count: number | null
          status: string
          subject: string
          template_id: string | null
          total_count: number | null
          updated_at: string
        }
        Insert: {
          body?: string
          created_at?: string
          deleted_at?: string | null
          error_log?: string | null
          failed_count?: number | null
          id?: string
          is_deleted?: boolean
          is_paused?: boolean | null
          name: string
          pending_count?: number | null
          recipient_group?: string
          recipient_ids?: string[] | null
          scheduled_at?: string | null
          send_interval_minutes?: number | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          subject: string
          template_id?: string | null
          total_count?: number | null
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          deleted_at?: string | null
          error_log?: string | null
          failed_count?: number | null
          id?: string
          is_deleted?: boolean
          is_paused?: boolean | null
          name?: string
          pending_count?: number | null
          recipient_group?: string
          recipient_ids?: string[] | null
          scheduled_at?: string | null
          send_interval_minutes?: number | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          subject?: string
          template_id?: string | null
          total_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body: string
          category: string
          created_at: string
          id: string
          name: string
          subject: string
          updated_at: string
        }
        Insert: {
          body?: string
          category?: string
          created_at?: string
          id?: string
          name: string
          subject: string
          updated_at?: string
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          id?: string
          name?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      homepage_sections: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_enabled: boolean
          item_limit: number | null
          layout_type: string
          product_source: string | null
          section_key: string
          selected_ids: Json | null
          settings_json: Json | null
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_enabled?: boolean
          item_limit?: number | null
          layout_type?: string
          product_source?: string | null
          section_key: string
          selected_ids?: Json | null
          settings_json?: Json | null
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_enabled?: boolean
          item_limit?: number | null
          layout_type?: string
          product_source?: string | null
          section_key?: string
          selected_ids?: Json | null
          settings_json?: Json | null
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          price: number
          product_id: string | null
          product_name: string
          quantity: number
          variation: Json | null
        }
        Insert: {
          id?: string
          order_id: string
          price: number
          product_id?: string | null
          product_name: string
          quantity?: number
          variation?: Json | null
        }
        Update: {
          id?: string
          order_id?: string
          price?: number
          product_id?: string | null
          product_name?: string
          quantity?: number
          variation?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          payment_method: string | null
          payment_status: string
          shipping_address: Json | null
          status: string
          total: number
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          payment_status?: string
          shipping_address?: Json | null
          status?: string
          total?: number
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          payment_status?: string
          shipping_address?: Json | null
          status?: string
          total?: number
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      page_sections: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_enabled: boolean
          page_id: string
          section_type: string
          settings_json: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_enabled?: boolean
          page_id: string
          section_type?: string
          settings_json?: Json | null
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_enabled?: boolean
          page_id?: string
          section_type?: string
          settings_json?: Json | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_sections_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          content: string | null
          created_at: string
          deleted_at: string | null
          id: string
          is_deleted: boolean
          is_published: boolean
          meta_description: string | null
          page_type: string
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_deleted?: boolean
          is_published?: boolean
          meta_description?: string | null
          page_type?: string
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_deleted?: boolean
          is_published?: boolean
          meta_description?: string | null
          page_type?: string
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          is_approved: boolean | null
          product_id: string
          rating: number
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          is_approved?: boolean | null
          product_id: string
          rating?: number
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          is_approved?: boolean | null
          product_id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          discount_price: number | null
          gallery: Json | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_deleted: boolean
          rating: number | null
          regular_price: number
          review_count: number | null
          short_description: string | null
          slug: string
          stock_quantity: number
          stock_status: string
          title: string
          updated_at: string
          variations: Json | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          discount_price?: number | null
          gallery?: Json | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_deleted?: boolean
          rating?: number | null
          regular_price?: number
          review_count?: number | null
          short_description?: string | null
          slug: string
          stock_quantity?: number
          stock_status?: string
          title: string
          updated_at?: string
          variations?: Json | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          discount_price?: number | null
          gallery?: Json | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_deleted?: boolean
          rating?: number | null
          regular_price?: number
          review_count?: number | null
          short_description?: string | null
          slug?: string
          stock_quantity?: number
          stock_status?: string
          title?: string
          updated_at?: string
          variations?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          blocked_ip: string | null
          city: string | null
          country: string | null
          country_code: string | null
          created_at: string
          deleted_at: string | null
          email_verified: boolean
          full_name: string
          id: string
          ip_blocked_at: string | null
          is_blocked: boolean
          is_deleted: boolean
          last_ip: string | null
          phone: string | null
          updated_at: string
          user_id: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          blocked_ip?: string | null
          city?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string
          deleted_at?: string | null
          email_verified?: boolean
          full_name?: string
          id?: string
          ip_blocked_at?: string | null
          is_blocked?: boolean
          is_deleted?: boolean
          last_ip?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          blocked_ip?: string | null
          city?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string
          deleted_at?: string | null
          email_verified?: boolean
          full_name?: string
          id?: string
          ip_blocked_at?: string | null
          is_blocked?: boolean
          is_deleted?: boolean
          last_ip?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          enabled: boolean
          id: string
          permission: string
          role: string
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          id?: string
          permission: string
          role: string
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          id?: string
          permission?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      shipping_rates: {
        Row: {
          area_name: string | null
          country: string | null
          created_at: string
          free_shipping_threshold: number | null
          id: string
          min_order_amount: number | null
          rate: number
          zone_id: string
        }
        Insert: {
          area_name?: string | null
          country?: string | null
          created_at?: string
          free_shipping_threshold?: number | null
          id?: string
          min_order_amount?: number | null
          rate?: number
          zone_id: string
        }
        Update: {
          area_name?: string | null
          country?: string | null
          created_at?: string
          free_shipping_threshold?: number | null
          id?: string
          min_order_amount?: number | null
          rate?: number
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipping_rates_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "shipping_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_zones: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          company: string | null
          content: string
          created_at: string
          deleted_at: string | null
          id: string
          is_active: boolean | null
          is_deleted: boolean
          name: string
          rating: number | null
        }
        Insert: {
          company?: string | null
          content: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean | null
          is_deleted?: boolean
          name: string
          rating?: number | null
        }
        Update: {
          company?: string | null
          content?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean | null
          is_deleted?: boolean
          name?: string
          rating?: number | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      variants: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          is_deleted: boolean
          name: string
          options: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_deleted?: boolean
          name: string
          options?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_deleted?: boolean
          name?: string
          options?: Json
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      find_order_by_partial_id: {
        Args: { partial_id: string }
        Returns: {
          created_at: string
          id: string
          notes: string | null
          payment_method: string | null
          payment_status: string
          shipping_address: Json | null
          status: string
          total: number
          transaction_id: string | null
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_enabled_payment_methods: { Args: never; Returns: Json }
      has_permission: {
        Args: { _permission: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "moderator"
        | "user"
        | "sales_manager"
        | "account_manager"
        | "support_assistant"
        | "marketing_manager"
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
      app_role: [
        "admin",
        "moderator",
        "user",
        "sales_manager",
        "account_manager",
        "support_assistant",
        "marketing_manager",
      ],
    },
  },
} as const
