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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      pianos_diagnostics: {
        Row: {
          annee_fabrication: number | null
          created_at: string
          date_heure_saisie: string
          id: string
          marque: string | null
          mesures_wa: Json | null
          mesures_wd: Json | null
          modele: string | null
          numero_central: string | null
          pays: string | null
          prefixe_lettre: string | null
          remarques: string | null
          suffixe_lettre: string | null
          type_entretien: string | null
          type_piano: string | null
          updated_at: string
          user_fingerprint: string
          ville: string | null
          zone_climatique: string | null
        }
        Insert: {
          annee_fabrication?: number | null
          created_at?: string
          date_heure_saisie?: string
          id?: string
          marque?: string | null
          mesures_wa?: Json | null
          mesures_wd?: Json | null
          modele?: string | null
          numero_central?: string | null
          pays?: string | null
          prefixe_lettre?: string | null
          remarques?: string | null
          suffixe_lettre?: string | null
          type_entretien?: string | null
          type_piano?: string | null
          updated_at?: string
          user_fingerprint: string
          ville?: string | null
          zone_climatique?: string | null
        }
        Update: {
          annee_fabrication?: number | null
          created_at?: string
          date_heure_saisie?: string
          id?: string
          marque?: string | null
          mesures_wa?: Json | null
          mesures_wd?: Json | null
          modele?: string | null
          numero_central?: string | null
          pays?: string | null
          prefixe_lettre?: string | null
          remarques?: string | null
          suffixe_lettre?: string | null
          type_entretien?: string | null
          type_piano?: string | null
          updated_at?: string
          user_fingerprint?: string
          ville?: string | null
          zone_climatique?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_own_diagnostics: {
        Args: { _numero_central: string; _user_fingerprint: string }
        Returns: {
          annee_fabrication: number | null
          created_at: string
          date_heure_saisie: string
          id: string
          marque: string | null
          mesures_wa: Json | null
          mesures_wd: Json | null
          modele: string | null
          numero_central: string | null
          pays: string | null
          prefixe_lettre: string | null
          remarques: string | null
          suffixe_lettre: string | null
          type_entretien: string | null
          type_piano: string | null
          updated_at: string
          user_fingerprint: string
          ville: string | null
          zone_climatique: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "pianos_diagnostics"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      insert_diagnostic: {
        Args: {
          _annee_fabrication: number
          _marque: string
          _mesures_wa: Json
          _mesures_wd: Json
          _modele: string
          _numero_central: string
          _pays: string
          _prefixe_lettre: string
          _remarques: string
          _suffixe_lettre: string
          _type_entretien: string
          _type_piano: string
          _user_fingerprint: string
          _ville: string
          _zone_climatique: string
        }
        Returns: string
      }
      update_own_diagnostic: {
        Args: {
          _annee_fabrication: number
          _id: string
          _marque: string
          _mesures_wa: Json
          _mesures_wd: Json
          _modele: string
          _numero_central: string
          _pays: string
          _prefixe_lettre: string
          _remarques: string
          _suffixe_lettre: string
          _type_entretien: string
          _type_piano: string
          _user_fingerprint: string
          _ville: string
          _zone_climatique: string
        }
        Returns: string
      }
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
