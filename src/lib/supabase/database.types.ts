export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      analytics_events: {
        Row: {
          created_at: string;
          event_data: Json;
          event_type: string;
          id: string;
          session_id: string | null;
          table_id: string | null;
          tenant_id: string;
        };
        Insert: {
          created_at?: string;
          event_data?: Json;
          event_type: string;
          id?: string;
          session_id?: string | null;
          table_id?: string | null;
          tenant_id: string;
        };
        Update: {
          created_at?: string;
          event_data?: Json;
          event_type?: string;
          id?: string;
          session_id?: string | null;
          table_id?: string | null;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'analytics_events_table_id_fkey';
            columns: ['table_id'];
            isOneToOne: false;
            referencedRelation: 'tables';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'analytics_events_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      menu_categories: {
        Row: {
          active: boolean;
          created_at: string;
          id: string;
          name: string;
          position: number;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          id?: string;
          name: string;
          position?: number;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          id?: string;
          name?: string;
          position?: number;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'menu_categories_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      menu_items: {
        Row: {
          available: boolean;
          category_id: string | null;
          created_at: string;
          description: string | null;
          dietary_tags: string[];
          id: string;
          image_url: string | null;
          ingredients: string[];
          macros: Json;
          name: string;
          position: number;
          price: number;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          available?: boolean;
          category_id?: string | null;
          created_at?: string;
          description?: string | null;
          dietary_tags?: string[];
          id?: string;
          image_url?: string | null;
          ingredients?: string[];
          macros?: Json;
          name: string;
          position?: number;
          price?: number;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          available?: boolean;
          category_id?: string | null;
          created_at?: string;
          description?: string | null;
          dietary_tags?: string[];
          id?: string;
          image_url?: string | null;
          ingredients?: string[];
          macros?: Json;
          name?: string;
          position?: number;
          price?: number;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'menu_items_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'menu_categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'menu_items_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      reviews: {
        Row: {
          bonus_code: string | null;
          bonus_sent: boolean;
          comment: string | null;
          created_at: string;
          customer_contact: string | null;
          customer_name: string | null;
          id: string;
          is_public: boolean;
          rating: number;
          redeemed_at: string | null;
          table_id: string | null;
          tenant_id: string;
        };
        Insert: {
          bonus_code?: string | null;
          bonus_sent?: boolean;
          comment?: string | null;
          created_at?: string;
          customer_contact?: string | null;
          customer_name?: string | null;
          id?: string;
          is_public?: boolean;
          rating: number;
          redeemed_at?: string | null;
          table_id?: string | null;
          tenant_id: string;
        };
        Update: {
          bonus_code?: string | null;
          bonus_sent?: boolean;
          comment?: string | null;
          created_at?: string;
          customer_contact?: string | null;
          customer_name?: string | null;
          id?: string;
          is_public?: boolean;
          rating?: number;
          redeemed_at?: string | null;
          table_id?: string | null;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reviews_table_id_fkey';
            columns: ['table_id'];
            isOneToOne: false;
            referencedRelation: 'tables';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      super_admins: {
        Row: {
          created_at: string;
          id: string;
        };
        Insert: {
          created_at?: string;
          id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
        };
        Relationships: [];
      };
      tables: {
        Row: {
          active: boolean;
          created_at: string;
          id: string;
          number: string;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          id?: string;
          number: string;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          id?: string;
          number?: string;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tables_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      tenants: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          plan: string;
          settings: Json;
          slug: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          plan?: string;
          settings?: Json;
          slug: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          plan?: string;
          settings?: Json;
          slug?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      users: {
        Row: {
          created_at: string;
          email: string;
          full_name: string;
          id: string;
          must_change_password: boolean;
          role: string;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          full_name: string;
          id: string;
          must_change_password?: boolean;
          role: string;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          full_name?: string;
          id?: string;
          must_change_password?: boolean;
          role?: string;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'users_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      waiter_calls: {
        Row: {
          acknowledged_at: string | null;
          created_at: string;
          id: string;
          reason: string | null;
          resolved_at: string | null;
          resolved_by: string | null;
          status: string;
          table_id: string;
          tenant_id: string;
        };
        Insert: {
          acknowledged_at?: string | null;
          created_at?: string;
          id?: string;
          reason?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          status?: string;
          table_id: string;
          tenant_id: string;
        };
        Update: {
          acknowledged_at?: string | null;
          created_at?: string;
          id?: string;
          reason?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          status?: string;
          table_id?: string;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'waiter_calls_resolved_by_fkey';
            columns: ['resolved_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'waiter_calls_table_id_fkey';
            columns: ['table_id'];
            isOneToOne: false;
            referencedRelation: 'tables';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'waiter_calls_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      current_tenant_id: { Args: never; Returns: string };
      current_user_role: { Args: never; Returns: string };
      is_owner_or_manager: { Args: never; Returns: boolean };
      is_super_admin: { Args: never; Returns: boolean };
      validate_table_id: { Args: { p_table_id: string }; Returns: string };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
