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
      clientes: {
        Row: {
          celular: string
          codigo: string
          correo: string | null
          created_at: string
          departamento: string | null
          direccion: string | null
          direccion_envio: string | null
          id: string
          municipio: string | null
          nit: string
          nombre: string
          nombre_facturacion: string | null
          pais: string | null
          telefono_principal: string | null
          telefono_secundario: string | null
          updated_at: string
        }
        Insert: {
          celular: string
          codigo: string
          correo?: string | null
          created_at?: string
          departamento?: string | null
          direccion?: string | null
          direccion_envio?: string | null
          id?: string
          municipio?: string | null
          nit: string
          nombre: string
          nombre_facturacion?: string | null
          pais?: string | null
          telefono_principal?: string | null
          telefono_secundario?: string | null
          updated_at?: string
        }
        Update: {
          celular?: string
          codigo?: string
          correo?: string | null
          created_at?: string
          departamento?: string | null
          direccion?: string | null
          direccion_envio?: string | null
          id?: string
          municipio?: string | null
          nit?: string
          nombre?: string
          nombre_facturacion?: string | null
          pais?: string | null
          telefono_principal?: string | null
          telefono_secundario?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cotizaciones: {
        Row: {
          cantidad: number
          codigo_cliente: string
          codigo_producto: string
          created_at: string
          created_by: string | null
          id: string
          notas: string | null
          precio_unitario: number | null
        }
        Insert: {
          cantidad?: number
          codigo_cliente: string
          codigo_producto: string
          created_at?: string
          created_by?: string | null
          id?: string
          notas?: string | null
          precio_unitario?: number | null
        }
        Update: {
          cantidad?: number
          codigo_cliente?: string
          codigo_producto?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notas?: string | null
          precio_unitario?: number | null
        }
        Relationships: []
      }
      embarques: {
        Row: {
          created_at: string
          fecha_llegada: string
          id: string
          notas: string | null
          numero_embarque: string
          transportista: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          fecha_llegada?: string
          id?: string
          notas?: string | null
          numero_embarque: string
          transportista?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          fecha_llegada?: string
          id?: string
          notas?: string | null
          numero_embarque?: string
          transportista?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      incidentes: {
        Row: {
          accesorios: string | null
          centro_servicio: string | null
          cobertura_garantia: boolean
          codigo: string
          codigo_cliente: string
          codigo_producto: string
          codigo_tecnico: string | null
          confirmacion_cliente: Json | null
          created_at: string
          descripcion_problema: string
          embarque_id: string | null
          es_herramienta_manual: boolean | null
          es_reingreso: boolean | null
          familia_producto: string | null
          fecha_ingreso: string
          id: string
          ingresado_en_mostrador: boolean | null
          log_observaciones: string | null
          producto_descontinuado: boolean | null
          producto_sugerido_alternativo: string | null
          quiere_envio: boolean | null
          sku_maquina: string | null
          status: Database["public"]["Enums"]["status_incidente"]
          tipologia: string | null
          updated_at: string
        }
        Insert: {
          accesorios?: string | null
          centro_servicio?: string | null
          cobertura_garantia?: boolean
          codigo: string
          codigo_cliente: string
          codigo_producto: string
          codigo_tecnico?: string | null
          confirmacion_cliente?: Json | null
          created_at?: string
          descripcion_problema: string
          embarque_id?: string | null
          es_herramienta_manual?: boolean | null
          es_reingreso?: boolean | null
          familia_producto?: string | null
          fecha_ingreso?: string
          id?: string
          ingresado_en_mostrador?: boolean | null
          log_observaciones?: string | null
          producto_descontinuado?: boolean | null
          producto_sugerido_alternativo?: string | null
          quiere_envio?: boolean | null
          sku_maquina?: string | null
          status?: Database["public"]["Enums"]["status_incidente"]
          tipologia?: string | null
          updated_at?: string
        }
        Update: {
          accesorios?: string | null
          centro_servicio?: string | null
          cobertura_garantia?: boolean
          codigo?: string
          codigo_cliente?: string
          codigo_producto?: string
          codigo_tecnico?: string | null
          confirmacion_cliente?: Json | null
          created_at?: string
          descripcion_problema?: string
          embarque_id?: string | null
          es_herramienta_manual?: boolean | null
          es_reingreso?: boolean | null
          familia_producto?: string | null
          fecha_ingreso?: string
          id?: string
          ingresado_en_mostrador?: boolean | null
          log_observaciones?: string | null
          producto_descontinuado?: boolean | null
          producto_sugerido_alternativo?: string | null
          quiere_envio?: boolean | null
          sku_maquina?: string | null
          status?: Database["public"]["Enums"]["status_incidente"]
          tipologia?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidentes_codigo_cliente_fkey"
            columns: ["codigo_cliente"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "incidentes_codigo_producto_fkey"
            columns: ["codigo_producto"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "incidentes_embarque_id_fkey"
            columns: ["embarque_id"]
            isOneToOne: false
            referencedRelation: "embarques"
            referencedColumns: ["id"]
          },
        ]
      }
      media_files: {
        Row: {
          created_at: string
          descripcion: string | null
          id: string
          incidente_id: string
          nombre: string
          tipo: Database["public"]["Enums"]["media_tipo"]
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          id?: string
          incidente_id: string
          nombre: string
          tipo: Database["public"]["Enums"]["media_tipo"]
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          id?: string
          incidente_id?: string
          nombre?: string
          tipo?: Database["public"]["Enums"]["media_tipo"]
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_files_incidente_id_fkey"
            columns: ["incidente_id"]
            isOneToOne: false
            referencedRelation: "incidentes"
            referencedColumns: ["id"]
          },
        ]
      }
      productos: {
        Row: {
          clave: string
          codigo: string
          created_at: string
          descontinuado: boolean
          descripcion: string
          id: string
          updated_at: string
          url_foto: string | null
        }
        Insert: {
          clave: string
          codigo: string
          created_at?: string
          descontinuado?: boolean
          descripcion: string
          id?: string
          updated_at?: string
          url_foto?: string | null
        }
        Update: {
          clave?: string
          codigo?: string
          created_at?: string
          descontinuado?: boolean
          descripcion?: string
          id?: string
          updated_at?: string
          url_foto?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          apellido: string
          created_at: string
          email: string
          id: string
          nombre: string
          updated_at: string
          user_id: string
        }
        Insert: {
          apellido: string
          created_at?: string
          email: string
          id?: string
          nombre: string
          updated_at?: string
          user_id: string
        }
        Update: {
          apellido?: string
          created_at?: string
          email?: string
          id?: string
          nombre?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      repuestos: {
        Row: {
          clave: string
          codigo: string
          codigo_producto: string
          created_at: string
          descripcion: string
          disponible_mostrador: boolean | null
          es_catalogo_truper: boolean | null
          id: string
          numero: string
          stock_actual: number | null
          ubicacion_bodega: string | null
          updated_at: string
          url_foto: string | null
        }
        Insert: {
          clave: string
          codigo: string
          codigo_producto: string
          created_at?: string
          descripcion: string
          disponible_mostrador?: boolean | null
          es_catalogo_truper?: boolean | null
          id?: string
          numero: string
          stock_actual?: number | null
          ubicacion_bodega?: string | null
          updated_at?: string
          url_foto?: string | null
        }
        Update: {
          clave?: string
          codigo?: string
          codigo_producto?: string
          created_at?: string
          descripcion?: string
          disponible_mostrador?: boolean | null
          es_catalogo_truper?: boolean | null
          id?: string
          numero?: string
          stock_actual?: number | null
          ubicacion_bodega?: string | null
          updated_at?: string
          url_foto?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "repuestos_codigo_producto_fkey"
            columns: ["codigo_producto"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["codigo"]
          },
        ]
      }
      tecnicos: {
        Row: {
          apellido: string
          codigo: string
          created_at: string
          email: string
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          apellido: string
          codigo: string
          created_at?: string
          email: string
          id?: string
          nombre: string
          updated_at?: string
        }
        Update: {
          apellido?: string
          codigo?: string
          created_at?: string
          email?: string
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generar_codigo_hpc: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generar_codigo_incidente: {
        Args: Record<PropertyKey, never>
        Returns: string
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
      app_role: "admin" | "mostrador" | "logistica" | "taller" | "bodega"
      media_tipo: "foto" | "video"
      status_incidente:
        | "Ingresado"
        | "En ruta"
        | "Pendiente de diagnostico"
        | "En diagnostico"
        | "Pendiente por repuestos"
        | "Presupuesto"
        | "Porcentaje"
        | "Reparado"
        | "Cambio por garantia"
        | "Nota de credito"
        | "Bodega pedido"
        | "Rechazado"
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
      app_role: ["admin", "mostrador", "logistica", "taller", "bodega"],
      media_tipo: ["foto", "video"],
      status_incidente: [
        "Ingresado",
        "En ruta",
        "Pendiente de diagnostico",
        "En diagnostico",
        "Pendiente por repuestos",
        "Presupuesto",
        "Porcentaje",
        "Reparado",
        "Cambio por garantia",
        "Nota de credito",
        "Bodega pedido",
        "Rechazado",
      ],
    },
  },
} as const
