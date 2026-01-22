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
      accesorios: {
        Row: {
          created_at: string | null
          descripcion: string | null
          familia_id: number | null
          id: number
          nombre: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          descripcion?: string | null
          familia_id?: number | null
          id?: number
          nombre: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          descripcion?: string | null
          familia_id?: number | null
          id?: number
          nombre?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accesorios_familia_id_fkey"
            columns: ["familia_id"]
            isOneToOne: false
            referencedRelation: "familias_producto"
            referencedColumns: ["id"]
          },
        ]
      }
      alembic_version: {
        Row: {
          version_num: string
        }
        Insert: {
          version_num: string
        }
        Update: {
          version_num?: string
        }
        Relationships: []
      }
      analisis_inventario: {
        Row: {
          centro_servicio_id: number
          clasificacion_abc: string | null
          clasificacion_xyz: string | null
          codigo_repuesto: string
          costo_unitario: number
          created_at: string
          dias_en_inventario: number
          dias_sin_movimiento: number
          id: number
          meses_analizados: number
          meses_con_movimiento: number
          primera_entrada: string | null
          stock_actual: number
          total_movimientos: number
          total_salidas: number
          ultimo_movimiento: string | null
          updated_at: string
          valor_inventario: number
        }
        Insert: {
          centro_servicio_id: number
          clasificacion_abc?: string | null
          clasificacion_xyz?: string | null
          codigo_repuesto: string
          costo_unitario: number
          created_at?: string
          dias_en_inventario: number
          dias_sin_movimiento: number
          id?: number
          meses_analizados: number
          meses_con_movimiento: number
          primera_entrada?: string | null
          stock_actual: number
          total_movimientos: number
          total_salidas: number
          ultimo_movimiento?: string | null
          updated_at?: string
          valor_inventario: number
        }
        Update: {
          centro_servicio_id?: number
          clasificacion_abc?: string | null
          clasificacion_xyz?: string | null
          codigo_repuesto?: string
          costo_unitario?: number
          created_at?: string
          dias_en_inventario?: number
          dias_sin_movimiento?: number
          id?: number
          meses_analizados?: number
          meses_con_movimiento?: number
          primera_entrada?: string | null
          stock_actual?: number
          total_movimientos?: number
          total_salidas?: number
          ultimo_movimiento?: string | null
          updated_at?: string
          valor_inventario?: number
        }
        Relationships: [
          {
            foreignKeyName: "analisis_inventario_centro_servicio_id_fkey"
            columns: ["centro_servicio_id"]
            isOneToOne: false
            referencedRelation: "centros_de_servicio"
            referencedColumns: ["id"]
          },
        ]
      }
      asignaciones_sac: {
        Row: {
          activo: boolean | null
          created_at: string
          fecha_asignacion: string
          id: number
          incidente_id: number
          user_id: number
        }
        Insert: {
          activo?: boolean | null
          created_at?: string
          fecha_asignacion?: string
          id?: number
          incidente_id: number
          user_id: number
        }
        Update: {
          activo?: boolean | null
          created_at?: string
          fecha_asignacion?: string
          id?: number
          incidente_id?: number
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "asignaciones_sac_incidente_id_fkey"
            columns: ["incidente_id"]
            isOneToOne: false
            referencedRelation: "incidentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asignaciones_sac_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          accion: string
          created_at: string | null
          id: number
          registro_id: string
          tabla_afectada: string
          usuario_id: number | null
        }
        Insert: {
          accion: string
          created_at?: string | null
          id?: number
          registro_id: string
          tabla_afectada: string
          usuario_id?: number | null
        }
        Update: {
          accion?: string
          created_at?: string | null
          id?: number
          registro_id?: string
          tabla_afectada?: string
          usuario_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      auditorias_calidad: {
        Row: {
          auditor_id: number | null
          causa_raiz: string | null
          created_at: string
          cumple_ensamblaje: boolean | null
          cumple_limpieza: boolean | null
          cumple_presentacion: boolean | null
          cumple_sellado: boolean | null
          evidencias_urls: Json | null
          fecha_auditoria: string
          id: number
          incidente_id: number
          observaciones: string | null
          presion_medida: number | null
          proveedor_involucrado: string | null
          resultado: string
          tecnico_responsable: string
          temperatura_medida: number | null
          tipo_falla: string | null
          updated_at: string
          velocidad_medida: number | null
          voltaje_medido: number | null
        }
        Insert: {
          auditor_id?: number | null
          causa_raiz?: string | null
          created_at?: string
          cumple_ensamblaje?: boolean | null
          cumple_limpieza?: boolean | null
          cumple_presentacion?: boolean | null
          cumple_sellado?: boolean | null
          evidencias_urls?: Json | null
          fecha_auditoria?: string
          id?: number
          incidente_id: number
          observaciones?: string | null
          presion_medida?: number | null
          proveedor_involucrado?: string | null
          resultado: string
          tecnico_responsable: string
          temperatura_medida?: number | null
          tipo_falla?: string | null
          updated_at: string
          velocidad_medida?: number | null
          voltaje_medido?: number | null
        }
        Update: {
          auditor_id?: number | null
          causa_raiz?: string | null
          created_at?: string
          cumple_ensamblaje?: boolean | null
          cumple_limpieza?: boolean | null
          cumple_presentacion?: boolean | null
          cumple_sellado?: boolean | null
          evidencias_urls?: Json | null
          fecha_auditoria?: string
          id?: number
          incidente_id?: number
          observaciones?: string | null
          presion_medida?: number | null
          proveedor_involucrado?: string | null
          resultado?: string
          tecnico_responsable?: string
          temperatura_medida?: number | null
          tipo_falla?: string | null
          updated_at?: string
          velocidad_medida?: number | null
          voltaje_medido?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "auditorias_calidad_auditor_id_fkey"
            columns: ["auditor_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auditorias_calidad_incidente_id_fkey"
            columns: ["incidente_id"]
            isOneToOne: false
            referencedRelation: "incidentes"
            referencedColumns: ["id"]
          },
        ]
      }
      bodegas: {
        Row: {
          activo: boolean | null
          centro_servicio_id: number | null
          codigo: string | null
          created_at: string | null
          id: number
          nombre: string | null
          updated_at: string | null
          uuid_id: string
        }
        Insert: {
          activo?: boolean | null
          centro_servicio_id?: number | null
          codigo?: string | null
          created_at?: string | null
          id?: number
          nombre?: string | null
          updated_at?: string | null
          uuid_id: string
        }
        Update: {
          activo?: boolean | null
          centro_servicio_id?: number | null
          codigo?: string | null
          created_at?: string | null
          id?: number
          nombre?: string | null
          updated_at?: string | null
          uuid_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bodegas_centro_servicio_id_fkey"
            columns: ["centro_servicio_id"]
            isOneToOne: false
            referencedRelation: "centros_de_servicio"
            referencedColumns: ["id"]
          },
        ]
      }
      causas: {
        Row: {
          created_at: string | null
          familia_id: number | null
          id: number
          nombre: string
        }
        Insert: {
          created_at?: string | null
          familia_id?: number | null
          id?: number
          nombre: string
        }
        Update: {
          created_at?: string | null
          familia_id?: number | null
          id?: number
          nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "causas_familia_id_fkey"
            columns: ["familia_id"]
            isOneToOne: false
            referencedRelation: "familias_producto"
            referencedColumns: ["id"]
          },
        ]
      }
      centros_de_servicio: {
        Row: {
          activo: boolean | null
          codigo: string
          correo: string | null
          created_at: string | null
          direccion: string | null
          email: string | null
          empresa_id: number | null
          es_central: boolean | null
          id: number
          id_numerico: number | null
          nombre: string
          numero_bodega: string | null
          responsable_id: number | null
          slug: string
          telefono: string | null
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          codigo: string
          correo?: string | null
          created_at?: string | null
          direccion?: string | null
          email?: string | null
          empresa_id?: number | null
          es_central?: boolean | null
          id?: number
          id_numerico?: number | null
          nombre: string
          numero_bodega?: string | null
          responsable_id?: number | null
          slug: string
          telefono?: string | null
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          codigo?: string
          correo?: string | null
          created_at?: string | null
          direccion?: string | null
          email?: string | null
          empresa_id?: number | null
          es_central?: boolean | null
          id?: number
          id_numerico?: number | null
          nombre?: string
          numero_bodega?: string | null
          responsable_id?: number | null
          slug?: string
          telefono?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "centros_de_servicio_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      centros_supervisor: {
        Row: {
          centro_servicio_id: number
          created_at: string | null
          id: number
          supervisor_id: number
        }
        Insert: {
          centro_servicio_id: number
          created_at?: string | null
          id?: number
          supervisor_id: number
        }
        Update: {
          centro_servicio_id?: number
          created_at?: string | null
          id?: number
          supervisor_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "centros_supervisor_centro_servicio_id_fkey"
            columns: ["centro_servicio_id"]
            isOneToOne: false
            referencedRelation: "centros_de_servicio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "centros_supervisor_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          activo: boolean | null
          celular: string | null
          codigo: string
          codigo_sap: string | null
          correo: string | null
          created_at: string | null
          deleted_at: string | null
          departamento: string | null
          direccion: string | null
          direccion_envio: string | null
          empresa_id: number | null
          id: number
          municipio: string | null
          nit: string | null
          nombre: string
          nombre_facturacion: string | null
          origen: string | null
          pais: string | null
          telefono_principal: string | null
          telefono_secundario: string | null
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          celular?: string | null
          codigo: string
          codigo_sap?: string | null
          correo?: string | null
          created_at?: string | null
          deleted_at?: string | null
          departamento?: string | null
          direccion?: string | null
          direccion_envio?: string | null
          empresa_id?: number | null
          id?: number
          municipio?: string | null
          nit?: string | null
          nombre: string
          nombre_facturacion?: string | null
          origen?: string | null
          pais?: string | null
          telefono_principal?: string | null
          telefono_secundario?: string | null
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          celular?: string | null
          codigo?: string
          codigo_sap?: string | null
          correo?: string | null
          created_at?: string | null
          deleted_at?: string | null
          departamento?: string | null
          direccion?: string | null
          direccion_envio?: string | null
          empresa_id?: number | null
          id?: number
          municipio?: string | null
          nit?: string | null
          nombre?: string
          nombre_facturacion?: string | null
          origen?: string | null
          pais?: string | null
          telefono_principal?: string | null
          telefono_secundario?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      comentarios: {
        Row: {
          autor_id: number | null
          contenido: string
          created_at: string | null
          deleted_at: string | null
          id: number
          incidente_id: number
          tipo: Database["public"]["Enums"]["tipocomentario"]
        }
        Insert: {
          autor_id?: number | null
          contenido: string
          created_at?: string | null
          deleted_at?: string | null
          id?: number
          incidente_id: number
          tipo: Database["public"]["Enums"]["tipocomentario"]
        }
        Update: {
          autor_id?: number | null
          contenido?: string
          created_at?: string | null
          deleted_at?: string | null
          id?: number
          incidente_id?: number
          tipo?: Database["public"]["Enums"]["tipocomentario"]
        }
        Relationships: [
          {
            foreignKeyName: "comentarios_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comentarios_incidente_id_fkey"
            columns: ["incidente_id"]
            isOneToOne: false
            referencedRelation: "incidentes"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracion_fifo_centro: {
        Row: {
          activo: boolean | null
          centro_servicio_id: number
          familia_abuelo_id: number
          id: number
          orden: number
          updated_at: string | null
          updated_by: number | null
        }
        Insert: {
          activo?: boolean | null
          centro_servicio_id: number
          familia_abuelo_id: number
          id?: number
          orden: number
          updated_at?: string | null
          updated_by?: number | null
        }
        Update: {
          activo?: boolean | null
          centro_servicio_id?: number
          familia_abuelo_id?: number
          id?: number
          orden?: number
          updated_at?: string | null
          updated_by?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "configuracion_fifo_centro_centro_servicio_id_fkey"
            columns: ["centro_servicio_id"]
            isOneToOne: false
            referencedRelation: "centros_de_servicio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "configuracion_fifo_centro_familia_abuelo_id_fkey"
            columns: ["familia_abuelo_id"]
            isOneToOne: false
            referencedRelation: "familias_producto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "configuracion_fifo_centro_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      conteos_programados: {
        Row: {
          activo: boolean | null
          centro_servicio_id: number
          clasificacion_abc: string | null
          created_at: string | null
          created_by: number | null
          frecuencia: string | null
          id: number
          proximo_conteo: string | null
          ubicacion: string
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          centro_servicio_id: number
          clasificacion_abc?: string | null
          created_at?: string | null
          created_by?: number | null
          frecuencia?: string | null
          id?: number
          proximo_conteo?: string | null
          ubicacion: string
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          centro_servicio_id?: number
          clasificacion_abc?: string | null
          created_at?: string | null
          created_by?: number | null
          frecuencia?: string | null
          id?: number
          proximo_conteo?: string | null
          ubicacion?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conteos_programados_centro_servicio_id_fkey"
            columns: ["centro_servicio_id"]
            isOneToOne: false
            referencedRelation: "centros_de_servicio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conteos_programados_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      cotizaciones: {
        Row: {
          cantidad: number
          codigo_cliente: string
          codigo_producto: string
          created_at: string
          created_by: number | null
          id: number
          notas: string | null
          precio_unitario: number | null
        }
        Insert: {
          cantidad: number
          codigo_cliente: string
          codigo_producto: string
          created_at?: string
          created_by?: number | null
          id?: number
          notas?: string | null
          precio_unitario?: number | null
        }
        Update: {
          cantidad?: number
          codigo_cliente?: string
          codigo_producto?: string
          created_at?: string
          created_by?: number | null
          id?: number
          notas?: string | null
          precio_unitario?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cotizaciones_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      defectos_calidad: {
        Row: {
          auditoria_id: number | null
          codigo_elemento: string
          comentarios_tecnicos: string | null
          created_at: string
          descripcion_defecto: string
          descripcion_elemento: string | null
          frecuencia: number | null
          gravedad: string | null
          id: number
          proveedor: string | null
          sugerencias_mejora: string | null
          tipo_defecto: string
          tipo_elemento: string
        }
        Insert: {
          auditoria_id?: number | null
          codigo_elemento: string
          comentarios_tecnicos?: string | null
          created_at?: string
          descripcion_defecto: string
          descripcion_elemento?: string | null
          frecuencia?: number | null
          gravedad?: string | null
          id?: number
          proveedor?: string | null
          sugerencias_mejora?: string | null
          tipo_defecto: string
          tipo_elemento: string
        }
        Update: {
          auditoria_id?: number | null
          codigo_elemento?: string
          comentarios_tecnicos?: string | null
          created_at?: string
          descripcion_defecto?: string
          descripcion_elemento?: string | null
          frecuencia?: number | null
          gravedad?: string | null
          id?: number
          proveedor?: string | null
          sugerencias_mejora?: string | null
          tipo_defecto?: string
          tipo_elemento?: string
        }
        Relationships: [
          {
            foreignKeyName: "defectos_calidad_auditoria_id_fkey"
            columns: ["auditoria_id"]
            isOneToOne: false
            referencedRelation: "auditorias_calidad"
            referencedColumns: ["id"]
          },
        ]
      }
      despieces: {
        Row: {
          codigo_producto: string
          created_at: string
          created_by: number | null
          descripcion: string
          estado: string
          fecha_ingreso: string
          id: number
          repuestos_disponibles: Json
          sku_maquina: string
          updated_at: string
        }
        Insert: {
          codigo_producto: string
          created_at?: string
          created_by?: number | null
          descripcion: string
          estado: string
          fecha_ingreso?: string
          id?: number
          repuestos_disponibles: Json
          sku_maquina: string
          updated_at?: string
        }
        Update: {
          codigo_producto?: string
          created_at?: string
          created_by?: number | null
          descripcion?: string
          estado?: string
          fecha_ingreso?: string
          id?: number
          repuestos_disponibles?: Json
          sku_maquina?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "despieces_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostico_causas: {
        Row: {
          causa_id: number
          diagnostico_id: number
        }
        Insert: {
          causa_id: number
          diagnostico_id: number
        }
        Update: {
          causa_id?: number
          diagnostico_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "diagnostico_causas_causa_id_fkey"
            columns: ["causa_id"]
            isOneToOne: false
            referencedRelation: "causas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnostico_causas_diagnostico_id_fkey"
            columns: ["diagnostico_id"]
            isOneToOne: false
            referencedRelation: "diagnosticos"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostico_fallas: {
        Row: {
          diagnostico_id: number
          falla_id: number
        }
        Insert: {
          diagnostico_id: number
          falla_id: number
        }
        Update: {
          diagnostico_id?: number
          falla_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "diagnostico_fallas_diagnostico_id_fkey"
            columns: ["diagnostico_id"]
            isOneToOne: false
            referencedRelation: "diagnosticos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnostico_fallas_falla_id_fkey"
            columns: ["falla_id"]
            isOneToOne: false
            referencedRelation: "fallas"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostico_repuestos: {
        Row: {
          diagnostico_id: number
          repuesto_id: number
        }
        Insert: {
          diagnostico_id: number
          repuesto_id: number
        }
        Update: {
          diagnostico_id?: number
          repuesto_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "diagnostico_repuestos_diagnostico_id_fkey"
            columns: ["diagnostico_id"]
            isOneToOne: false
            referencedRelation: "diagnosticos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnostico_repuestos_repuesto_id_fkey"
            columns: ["repuesto_id"]
            isOneToOne: false
            referencedRelation: "repuestos"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnosticos: {
        Row: {
          aplica_garantia: boolean | null
          created_at: string | null
          descuento_porcentaje: number | null
          es_reparable: boolean | null
          estado: Database["public"]["Enums"]["estadodiagnostico"]
          id: number
          incidente_id: number
          producto_alternativo_id: number | null
          recomendaciones: string | null
          tecnico_id: number
          tipo_resolucion: Database["public"]["Enums"]["tiporesolucion"] | null
          tipo_trabajo: string | null
          updated_at: string | null
        }
        Insert: {
          aplica_garantia?: boolean | null
          created_at?: string | null
          descuento_porcentaje?: number | null
          es_reparable?: boolean | null
          estado: Database["public"]["Enums"]["estadodiagnostico"]
          id?: number
          incidente_id: number
          producto_alternativo_id?: number | null
          recomendaciones?: string | null
          tecnico_id: number
          tipo_resolucion?: Database["public"]["Enums"]["tiporesolucion"] | null
          tipo_trabajo?: string | null
          updated_at?: string | null
        }
        Update: {
          aplica_garantia?: boolean | null
          created_at?: string | null
          descuento_porcentaje?: number | null
          es_reparable?: boolean | null
          estado?: Database["public"]["Enums"]["estadodiagnostico"]
          id?: number
          incidente_id?: number
          producto_alternativo_id?: number | null
          recomendaciones?: string | null
          tecnico_id?: number
          tipo_resolucion?: Database["public"]["Enums"]["tiporesolucion"] | null
          tipo_trabajo?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "diagnosticos_incidente_id_fkey"
            columns: ["incidente_id"]
            isOneToOne: false
            referencedRelation: "incidentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnosticos_producto_alternativo_id_fkey"
            columns: ["producto_alternativo_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnosticos_tecnico_id_fkey"
            columns: ["tecnico_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      direcciones: {
        Row: {
          cliente_id: number
          created_at: string | null
          deleted_at: string | null
          direccion: string
          es_principal: boolean | null
          id: number
          updated_at: string | null
        }
        Insert: {
          cliente_id: number
          created_at?: string | null
          deleted_at?: string | null
          direccion: string
          es_principal?: boolean | null
          id?: number
          updated_at?: string | null
        }
        Update: {
          cliente_id?: number
          created_at?: string | null
          deleted_at?: string | null
          direccion?: string
          es_principal?: boolean | null
          id?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "direcciones_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      direcciones_envio: {
        Row: {
          ciudad: string | null
          codigo_postal: string | null
          created_at: string | null
          direccion_completa: string
          embarque_id: number | null
          estado: string | null
          id: number
          nombre_contacto: string | null
          notas_adicionales: string | null
          pais: string | null
          telefono_contacto: string | null
          updated_at: string | null
        }
        Insert: {
          ciudad?: string | null
          codigo_postal?: string | null
          created_at?: string | null
          direccion_completa: string
          embarque_id?: number | null
          estado?: string | null
          id?: number
          nombre_contacto?: string | null
          notas_adicionales?: string | null
          pais?: string | null
          telefono_contacto?: string | null
          updated_at?: string | null
        }
        Update: {
          ciudad?: string | null
          codigo_postal?: string | null
          created_at?: string | null
          direccion_completa?: string
          embarque_id?: number | null
          estado?: string | null
          id?: number
          nombre_contacto?: string | null
          notas_adicionales?: string | null
          pais?: string | null
          telefono_contacto?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "direcciones_envio_embarque_id_fkey"
            columns: ["embarque_id"]
            isOneToOne: false
            referencedRelation: "embarques"
            referencedColumns: ["id"]
          },
        ]
      }
      embarques: {
        Row: {
          created_at: string | null
          fecha_llegada: string
          id: number
          notas: string | null
          numero_embarque: string
          transportista: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          fecha_llegada?: string
          id?: number
          notas?: string | null
          numero_embarque: string
          transportista?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          fecha_llegada?: string
          id?: number
          notas?: string | null
          numero_embarque?: string
          transportista?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      empresas: {
        Row: {
          activo: boolean | null
          codigo: string
          created_at: string | null
          id: number
          nombre: string
        }
        Insert: {
          activo?: boolean | null
          codigo: string
          created_at?: string | null
          id?: number
          nombre: string
        }
        Update: {
          activo?: boolean | null
          codigo?: string
          created_at?: string | null
          id?: number
          nombre?: string
        }
        Relationships: []
      }
      fallas: {
        Row: {
          created_at: string | null
          familia_id: number | null
          id: number
          nombre: string
        }
        Insert: {
          created_at?: string | null
          familia_id?: number | null
          id?: number
          nombre: string
        }
        Update: {
          created_at?: string | null
          familia_id?: number | null
          id?: number
          nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "fallas_familia_id_fkey"
            columns: ["familia_id"]
            isOneToOne: false
            referencedRelation: "familias_producto"
            referencedColumns: ["id"]
          },
        ]
      }
      familias_producto: {
        Row: {
          created_at: string | null
          id: number
          nombre: string
          parent_id: number | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          nombre: string
          parent_id?: number | null
        }
        Update: {
          created_at?: string | null
          id?: number
          nombre?: string
          parent_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "familias_producto_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "familias_producto"
            referencedColumns: ["id"]
          },
        ]
      }
      garantias_manuales: {
        Row: {
          cantidad_sku: number
          codigo_cliente: string
          comentarios_logistica: string | null
          created_at: string
          created_by: number | null
          descripcion_problema: string
          descripcion_sku: string
          estatus: string
          fotos_urls: Json | null
          id: number
          incidente_id: number | null
          modified_by: number | null
          numero_incidente: string | null
          origen: string | null
          sku_reportado: string
          updated_at: string
        }
        Insert: {
          cantidad_sku: number
          codigo_cliente: string
          comentarios_logistica?: string | null
          created_at?: string
          created_by?: number | null
          descripcion_problema: string
          descripcion_sku: string
          estatus: string
          fotos_urls?: Json | null
          id?: number
          incidente_id?: number | null
          modified_by?: number | null
          numero_incidente?: string | null
          origen?: string | null
          sku_reportado: string
          updated_at?: string
        }
        Update: {
          cantidad_sku?: number
          codigo_cliente?: string
          comentarios_logistica?: string | null
          created_at?: string
          created_by?: number | null
          descripcion_problema?: string
          descripcion_sku?: string
          estatus?: string
          fotos_urls?: Json | null
          id?: number
          incidente_id?: number | null
          modified_by?: number | null
          numero_incidente?: string | null
          origen?: string | null
          sku_reportado?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "garantias_manuales_codigo_cliente_fkey"
            columns: ["codigo_cliente"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "garantias_manuales_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garantias_manuales_incidente_id_fkey"
            columns: ["incidente_id"]
            isOneToOne: false
            referencedRelation: "incidentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garantias_manuales_modified_by_fkey"
            columns: ["modified_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      grupos_cola_fifo: {
        Row: {
          activo: boolean | null
          centro_servicio_id: number
          color: string | null
          created_at: string | null
          id: number
          nombre: string
          orden: number
          updated_at: string | null
          updated_by: number | null
        }
        Insert: {
          activo?: boolean | null
          centro_servicio_id: number
          color?: string | null
          created_at?: string | null
          id?: number
          nombre: string
          orden: number
          updated_at?: string | null
          updated_by?: number | null
        }
        Update: {
          activo?: boolean | null
          centro_servicio_id?: number
          color?: string | null
          created_at?: string | null
          id?: number
          nombre?: string
          orden?: number
          updated_at?: string | null
          updated_by?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "grupos_cola_fifo_centro_servicio_id_fkey"
            columns: ["centro_servicio_id"]
            isOneToOne: false
            referencedRelation: "centros_de_servicio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grupos_cola_fifo_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      grupos_cola_fifo_familias: {
        Row: {
          created_at: string | null
          familia_abuelo_id: number
          grupo_id: number
          id: number
        }
        Insert: {
          created_at?: string | null
          familia_abuelo_id: number
          grupo_id: number
          id?: number
        }
        Update: {
          created_at?: string | null
          familia_abuelo_id?: number
          grupo_id?: number
          id?: number
        }
        Relationships: [
          {
            foreignKeyName: "grupos_cola_fifo_familias_familia_abuelo_id_fkey"
            columns: ["familia_abuelo_id"]
            isOneToOne: false
            referencedRelation: "familias_producto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grupos_cola_fifo_familias_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos_cola_fifo"
            referencedColumns: ["id"]
          },
        ]
      }
      guias: {
        Row: {
          cantidad_piezas: number | null
          centro_de_servicio_destino_id: number | null
          centro_de_servicio_origen_id: number
          ciudad_destino: string | null
          created_at: string | null
          created_by: number | null
          destinatario: string | null
          direccion_destinatario: string | null
          direccion_remitente: string | null
          empacador: string | null
          estado: Database["public"]["Enums"]["estadoguia"]
          fecha_entrega: string | null
          fecha_guia: string | null
          fecha_ingreso: string | null
          fecha_promesa_entrega: string | null
          id: number
          incidente_id: number | null
          incidentes_codigos: Json | null
          numero_guia: string | null
          operador_pod: string | null
          peso: number | null
          recibido_por: string | null
          referencia_1: string | null
          referencia_2: string | null
          remitente: string | null
          tarifa: number | null
          telefono_destinatario: string | null
          tipo: Database["public"]["Enums"]["tipoguia"]
          tracking_number: string | null
          updated_at: string | null
          zigo_guia_id: string | null
          zigo_guia_status: string | null
          zigo_request_payload: Json
          zigo_response_data: Json | null
        }
        Insert: {
          cantidad_piezas?: number | null
          centro_de_servicio_destino_id?: number | null
          centro_de_servicio_origen_id: number
          ciudad_destino?: string | null
          created_at?: string | null
          created_by?: number | null
          destinatario?: string | null
          direccion_destinatario?: string | null
          direccion_remitente?: string | null
          empacador?: string | null
          estado: Database["public"]["Enums"]["estadoguia"]
          fecha_entrega?: string | null
          fecha_guia?: string | null
          fecha_ingreso?: string | null
          fecha_promesa_entrega?: string | null
          id?: number
          incidente_id?: number | null
          incidentes_codigos?: Json | null
          numero_guia?: string | null
          operador_pod?: string | null
          peso?: number | null
          recibido_por?: string | null
          referencia_1?: string | null
          referencia_2?: string | null
          remitente?: string | null
          tarifa?: number | null
          telefono_destinatario?: string | null
          tipo: Database["public"]["Enums"]["tipoguia"]
          tracking_number?: string | null
          updated_at?: string | null
          zigo_guia_id?: string | null
          zigo_guia_status?: string | null
          zigo_request_payload: Json
          zigo_response_data?: Json | null
        }
        Update: {
          cantidad_piezas?: number | null
          centro_de_servicio_destino_id?: number | null
          centro_de_servicio_origen_id?: number
          ciudad_destino?: string | null
          created_at?: string | null
          created_by?: number | null
          destinatario?: string | null
          direccion_destinatario?: string | null
          direccion_remitente?: string | null
          empacador?: string | null
          estado?: Database["public"]["Enums"]["estadoguia"]
          fecha_entrega?: string | null
          fecha_guia?: string | null
          fecha_ingreso?: string | null
          fecha_promesa_entrega?: string | null
          id?: number
          incidente_id?: number | null
          incidentes_codigos?: Json | null
          numero_guia?: string | null
          operador_pod?: string | null
          peso?: number | null
          recibido_por?: string | null
          referencia_1?: string | null
          referencia_2?: string | null
          remitente?: string | null
          tarifa?: number | null
          telefono_destinatario?: string | null
          tipo?: Database["public"]["Enums"]["tipoguia"]
          tracking_number?: string | null
          updated_at?: string | null
          zigo_guia_id?: string | null
          zigo_guia_status?: string | null
          zigo_request_payload?: Json
          zigo_response_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "guias_centro_de_servicio_destino_id_fkey"
            columns: ["centro_de_servicio_destino_id"]
            isOneToOne: false
            referencedRelation: "centros_de_servicio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guias_centro_de_servicio_origen_id_fkey"
            columns: ["centro_de_servicio_origen_id"]
            isOneToOne: false
            referencedRelation: "centros_de_servicio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guias_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guias_incidente_id_fkey"
            columns: ["incidente_id"]
            isOneToOne: false
            referencedRelation: "incidentes"
            referencedColumns: ["id"]
          },
        ]
      }
      importaciones: {
        Row: {
          centro_destino_id: number | null
          created_at: string
          created_by: number | null
          estado: string | null
          fecha_llegada: string
          id: number
          notas: string | null
          numero_embarque: string
          origen: string
          updated_at: string
        }
        Insert: {
          centro_destino_id?: number | null
          created_at?: string
          created_by?: number | null
          estado?: string | null
          fecha_llegada: string
          id?: number
          notas?: string | null
          numero_embarque: string
          origen: string
          updated_at?: string
        }
        Update: {
          centro_destino_id?: number | null
          created_at?: string
          created_by?: number | null
          estado?: string | null
          fecha_llegada?: string
          id?: number
          notas?: string | null
          numero_embarque?: string
          origen?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "importaciones_centro_destino_id_fkey"
            columns: ["centro_destino_id"]
            isOneToOne: false
            referencedRelation: "centros_de_servicio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "importaciones_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      importaciones_detalle: {
        Row: {
          cantidad: number
          cantidad_esperada: number | null
          cantidad_recibida: number | null
          created_at: string
          descripcion: string
          estado: string | null
          id: number
          importacion_id: number
          procesado: boolean | null
          recibido_at: string | null
          recibido_por: number | null
          sku: string
          ubicacion_asignada: string | null
        }
        Insert: {
          cantidad: number
          cantidad_esperada?: number | null
          cantidad_recibida?: number | null
          created_at?: string
          descripcion: string
          estado?: string | null
          id?: number
          importacion_id: number
          procesado?: boolean | null
          recibido_at?: string | null
          recibido_por?: number | null
          sku: string
          ubicacion_asignada?: string | null
        }
        Update: {
          cantidad?: number
          cantidad_esperada?: number | null
          cantidad_recibida?: number | null
          created_at?: string
          descripcion?: string
          estado?: string | null
          id?: number
          importacion_id?: number
          procesado?: boolean | null
          recibido_at?: string | null
          recibido_por?: number | null
          sku?: string
          ubicacion_asignada?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "importaciones_detalle_importacion_id_fkey"
            columns: ["importacion_id"]
            isOneToOne: false
            referencedRelation: "importaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "importaciones_detalle_recibido_por_fkey"
            columns: ["recibido_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      incidente_accesorios: {
        Row: {
          accesorio_id: number
          incidente_id: number
        }
        Insert: {
          accesorio_id: number
          incidente_id: number
        }
        Update: {
          accesorio_id?: number
          incidente_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "incidente_accesorios_accesorio_id_fkey"
            columns: ["accesorio_id"]
            isOneToOne: false
            referencedRelation: "accesorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidente_accesorios_incidente_id_fkey"
            columns: ["incidente_id"]
            isOneToOne: false
            referencedRelation: "incidentes"
            referencedColumns: ["id"]
          },
        ]
      }
      incidente_fotos: {
        Row: {
          created_at: string
          created_by: number | null
          id: number
          incidente_id: number
          orden: number | null
          storage_path: string
          tipo: string
          url: string
        }
        Insert: {
          created_at?: string
          created_by?: number | null
          id?: number
          incidente_id: number
          orden?: number | null
          storage_path: string
          tipo: string
          url: string
        }
        Update: {
          created_at?: string
          created_by?: number | null
          id?: number
          incidente_id?: number
          orden?: number | null
          storage_path?: string
          tipo?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidente_fotos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidente_fotos_incidente_id_fkey"
            columns: ["incidente_id"]
            isOneToOne: false
            referencedRelation: "incidentes"
            referencedColumns: ["id"]
          },
        ]
      }
      incidente_participacion: {
        Row: {
          created_at: string | null
          id: number
          incidente_id: number
          observaciones: string | null
          tipo_participacion: Database["public"]["Enums"]["tipoparticipacion"]
          usuario_id: number
        }
        Insert: {
          created_at?: string | null
          id?: number
          incidente_id: number
          observaciones?: string | null
          tipo_participacion: Database["public"]["Enums"]["tipoparticipacion"]
          usuario_id: number
        }
        Update: {
          created_at?: string | null
          id?: number
          incidente_id?: number
          observaciones?: string | null
          tipo_participacion?: Database["public"]["Enums"]["tipoparticipacion"]
          usuario_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "incidente_participacion_incidente_id_fkey"
            columns: ["incidente_id"]
            isOneToOne: false
            referencedRelation: "incidentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidente_participacion_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      incidente_repuesto: {
        Row: {
          cantidad: string
          created_at: string | null
          deleted_at: string | null
          id: number
          incidente_id: number
          observaciones: string | null
          repuesto_id: number
        }
        Insert: {
          cantidad: string
          created_at?: string | null
          deleted_at?: string | null
          id?: number
          incidente_id: number
          observaciones?: string | null
          repuesto_id: number
        }
        Update: {
          cantidad?: string
          created_at?: string | null
          deleted_at?: string | null
          id?: number
          incidente_id?: number
          observaciones?: string | null
          repuesto_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "incidente_repuesto_incidente_id_fkey"
            columns: ["incidente_id"]
            isOneToOne: false
            referencedRelation: "incidentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidente_repuesto_repuesto_id_fkey"
            columns: ["repuesto_id"]
            isOneToOne: false
            referencedRelation: "repuestos"
            referencedColumns: ["id"]
          },
        ]
      }
      incidente_tecnico: {
        Row: {
          created_at: string | null
          es_principal: boolean | null
          id: number
          incidente_id: number
          tecnico_id: number
        }
        Insert: {
          created_at?: string | null
          es_principal?: boolean | null
          id?: number
          incidente_id: number
          tecnico_id: number
        }
        Update: {
          created_at?: string | null
          es_principal?: boolean | null
          id?: number
          incidente_id?: number
          tecnico_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "incidente_tecnico_incidente_id_fkey"
            columns: ["incidente_id"]
            isOneToOne: false
            referencedRelation: "incidentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidente_tecnico_tecnico_id_fkey"
            columns: ["tecnico_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      incidentes: {
        Row: {
          aplica_garantia: boolean | null
          centro_de_servicio_id: number
          cliente_id: number
          codigo: string
          created_at: string | null
          deleted_at: string | null
          descripcion_problema: string | null
          direccion_entrega_id: number | null
          empresa_id: number | null
          estado: Database["public"]["Enums"]["estadoincidente"]
          fecha_entrega: string | null
          fecha_ingreso: string | null
          id: number
          incidente_origen_id: number | null
          observaciones: string | null
          producto_id: number | null
          propietario_id: number | null
          quiere_envio: boolean
          tipo_resolucion: Database["public"]["Enums"]["tiporesolucion"] | null
          tipologia: Database["public"]["Enums"]["tipoincidente"]
          tracking_token: string
          updated_at: string | null
        }
        Insert: {
          aplica_garantia?: boolean | null
          centro_de_servicio_id: number
          cliente_id: number
          codigo: string
          created_at?: string | null
          deleted_at?: string | null
          descripcion_problema?: string | null
          direccion_entrega_id?: number | null
          empresa_id?: number | null
          estado: Database["public"]["Enums"]["estadoincidente"]
          fecha_entrega?: string | null
          fecha_ingreso?: string | null
          id?: number
          incidente_origen_id?: number | null
          observaciones?: string | null
          producto_id?: number | null
          propietario_id?: number | null
          quiere_envio?: boolean
          tipo_resolucion?: Database["public"]["Enums"]["tiporesolucion"] | null
          tipologia: Database["public"]["Enums"]["tipoincidente"]
          tracking_token: string
          updated_at?: string | null
        }
        Update: {
          aplica_garantia?: boolean | null
          centro_de_servicio_id?: number
          cliente_id?: number
          codigo?: string
          created_at?: string | null
          deleted_at?: string | null
          descripcion_problema?: string | null
          direccion_entrega_id?: number | null
          empresa_id?: number | null
          estado?: Database["public"]["Enums"]["estadoincidente"]
          fecha_entrega?: string | null
          fecha_ingreso?: string | null
          id?: number
          incidente_origen_id?: number | null
          observaciones?: string | null
          producto_id?: number | null
          propietario_id?: number | null
          quiere_envio?: boolean
          tipo_resolucion?: Database["public"]["Enums"]["tiporesolucion"] | null
          tipologia?: Database["public"]["Enums"]["tipoincidente"]
          tracking_token?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incidentes_centro_de_servicio_id_fkey"
            columns: ["centro_de_servicio_id"]
            isOneToOne: false
            referencedRelation: "centros_de_servicio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidentes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidentes_direccion_entrega_id_fkey"
            columns: ["direccion_entrega_id"]
            isOneToOne: false
            referencedRelation: "direcciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidentes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidentes_incidente_origen_id_fkey"
            columns: ["incidente_origen_id"]
            isOneToOne: false
            referencedRelation: "incidentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidentes_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidentes_propietario_id_fkey"
            columns: ["propietario_id"]
            isOneToOne: false
            referencedRelation: "propietarios"
            referencedColumns: ["id"]
          },
        ]
      }
      ingresos_logistica: {
        Row: {
          created_at: string | null
          fecha_recepcion: string | null
          fotos_urls: Json
          id: number
          incidente_id: number
          observaciones: string | null
          recibido_por: number | null
          sku_corregido: string | null
          sku_original: string
        }
        Insert: {
          created_at?: string | null
          fecha_recepcion?: string | null
          fotos_urls: Json
          id?: number
          incidente_id: number
          observaciones?: string | null
          recibido_por?: number | null
          sku_corregido?: string | null
          sku_original: string
        }
        Update: {
          created_at?: string | null
          fecha_recepcion?: string | null
          fotos_urls?: Json
          id?: number
          incidente_id?: number
          observaciones?: string | null
          recibido_por?: number | null
          sku_corregido?: string | null
          sku_original?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingresos_logistica_incidente_id_fkey"
            columns: ["incidente_id"]
            isOneToOne: false
            referencedRelation: "incidentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingresos_logistica_recibido_por_fkey"
            columns: ["recibido_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      inventario: {
        Row: {
          bodega: string | null
          cantidad: number
          centro_servicio_id: number
          codigo_repuesto: string
          costo_unitario: number | null
          created_at: string | null
          descripcion: string | null
          id: number
          ubicacion_id: number | null
          ubicacion_legacy: string
          updated_at: string | null
        }
        Insert: {
          bodega?: string | null
          cantidad: number
          centro_servicio_id: number
          codigo_repuesto: string
          costo_unitario?: number | null
          created_at?: string | null
          descripcion?: string | null
          id?: number
          ubicacion_id?: number | null
          ubicacion_legacy: string
          updated_at?: string | null
        }
        Update: {
          bodega?: string | null
          cantidad?: number
          centro_servicio_id?: number
          codigo_repuesto?: string
          costo_unitario?: number | null
          created_at?: string | null
          descripcion?: string | null
          id?: number
          ubicacion_id?: number | null
          ubicacion_legacy?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventario_centro_servicio_id_fkey"
            columns: ["centro_servicio_id"]
            isOneToOne: false
            referencedRelation: "centros_de_servicio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_ubicacion_id_fkey"
            columns: ["ubicacion_id"]
            isOneToOne: false
            referencedRelation: "ubicaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      inventario_ciclico: {
        Row: {
          centro_servicio_id: number
          created_at: string | null
          estado: Database["public"]["Enums"]["estadoinventariociclico"]
          fecha_completado: string | null
          fecha_inicio: string | null
          id: number
          notas: string | null
          numero_conteo: string
          realizado_por_id: number
          ubicacion: string | null
        }
        Insert: {
          centro_servicio_id: number
          created_at?: string | null
          estado: Database["public"]["Enums"]["estadoinventariociclico"]
          fecha_completado?: string | null
          fecha_inicio?: string | null
          id?: number
          notas?: string | null
          numero_conteo: string
          realizado_por_id: number
          ubicacion?: string | null
        }
        Update: {
          centro_servicio_id?: number
          created_at?: string | null
          estado?: Database["public"]["Enums"]["estadoinventariociclico"]
          fecha_completado?: string | null
          fecha_inicio?: string | null
          id?: number
          notas?: string | null
          numero_conteo?: string
          realizado_por_id?: number
          ubicacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventario_ciclico_centro_servicio_id_fkey"
            columns: ["centro_servicio_id"]
            isOneToOne: false
            referencedRelation: "centros_de_servicio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_ciclico_realizado_por_id_fkey"
            columns: ["realizado_por_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      inventario_ciclico_detalle: {
        Row: {
          ajustado: boolean | null
          cantidad_fisica: number
          cantidad_sistema: number
          created_at: string | null
          descripcion: string | null
          diferencia: number
          id: number
          inventario_id: number
          notas: string | null
          repuesto_id: number
        }
        Insert: {
          ajustado?: boolean | null
          cantidad_fisica: number
          cantidad_sistema: number
          created_at?: string | null
          descripcion?: string | null
          diferencia: number
          id?: number
          inventario_id: number
          notas?: string | null
          repuesto_id: number
        }
        Update: {
          ajustado?: boolean | null
          cantidad_fisica?: number
          cantidad_sistema?: number
          created_at?: string | null
          descripcion?: string | null
          diferencia?: number
          id?: number
          inventario_id?: number
          notas?: string | null
          repuesto_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventario_ciclico_detalle_inventario_id_fkey"
            columns: ["inventario_id"]
            isOneToOne: false
            referencedRelation: "inventario_ciclico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_ciclico_detalle_repuesto_id_fkey"
            columns: ["repuesto_id"]
            isOneToOne: false
            referencedRelation: "repuestos"
            referencedColumns: ["id"]
          },
        ]
      }
      inventario_repuestos: {
        Row: {
          cantidad: number
          centro_de_servicio_id: number
          clave: string | null
          codigo: string
          costo_unitario: number
          created_at: string | null
          descripcion: string | null
          id: number
          nombre: string
          ubicacion: string
          updated_at: string | null
        }
        Insert: {
          cantidad: number
          centro_de_servicio_id: number
          clave?: string | null
          codigo: string
          costo_unitario: number
          created_at?: string | null
          descripcion?: string | null
          id?: number
          nombre: string
          ubicacion: string
          updated_at?: string | null
        }
        Update: {
          cantidad?: number
          centro_de_servicio_id?: number
          clave?: string | null
          codigo?: string
          costo_unitario?: number
          created_at?: string | null
          descripcion?: string | null
          id?: number
          nombre?: string
          ubicacion?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventario_repuestos_centro_de_servicio_id_fkey"
            columns: ["centro_de_servicio_id"]
            isOneToOne: false
            referencedRelation: "centros_de_servicio"
            referencedColumns: ["id"]
          },
        ]
      }
      listados_abastecimiento: {
        Row: {
          centro_servicio_destino_id: number
          created_at: string
          estado: string
          fecha_generacion: string
          generado_por: number | null
          id: number
          nombre: string
          notas: string | null
          updated_at: string
        }
        Insert: {
          centro_servicio_destino_id: number
          created_at?: string
          estado: string
          fecha_generacion?: string
          generado_por?: number | null
          id?: number
          nombre: string
          notas?: string | null
          updated_at?: string
        }
        Update: {
          centro_servicio_destino_id?: number
          created_at?: string
          estado?: string
          fecha_generacion?: string
          generado_por?: number | null
          id?: number
          nombre?: string
          notas?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listados_abastecimiento_centro_servicio_destino_id_fkey"
            columns: ["centro_servicio_destino_id"]
            isOneToOne: false
            referencedRelation: "centros_de_servicio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listados_abastecimiento_generado_por_fkey"
            columns: ["generado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      listados_abastecimiento_items: {
        Row: {
          cantidad_confirmada: number | null
          cantidad_pickeada: number | null
          cantidad_sugerida: number
          codigo_repuesto: string
          created_at: string
          descripcion: string | null
          estado: string
          id: number
          listado_id: number
          notas: string | null
          pickeado_at: string | null
          pickeado_por: number | null
          picker_asignado_at: string | null
          picker_asignado_id: number | null
          ubicacion_origen: string | null
        }
        Insert: {
          cantidad_confirmada?: number | null
          cantidad_pickeada?: number | null
          cantidad_sugerida: number
          codigo_repuesto: string
          created_at?: string
          descripcion?: string | null
          estado: string
          id?: number
          listado_id: number
          notas?: string | null
          pickeado_at?: string | null
          pickeado_por?: number | null
          picker_asignado_at?: string | null
          picker_asignado_id?: number | null
          ubicacion_origen?: string | null
        }
        Update: {
          cantidad_confirmada?: number | null
          cantidad_pickeada?: number | null
          cantidad_sugerida?: number
          codigo_repuesto?: string
          created_at?: string
          descripcion?: string | null
          estado?: string
          id?: number
          listado_id?: number
          notas?: string | null
          pickeado_at?: string | null
          pickeado_por?: number | null
          picker_asignado_at?: string | null
          picker_asignado_id?: number | null
          ubicacion_origen?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listados_abastecimiento_items_listado_id_fkey"
            columns: ["listado_id"]
            isOneToOne: false
            referencedRelation: "listados_abastecimiento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listados_abastecimiento_items_pickeado_por_fkey"
            columns: ["pickeado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listados_abastecimiento_items_picker_asignado_id_fkey"
            columns: ["picker_asignado_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      listados_abastecimiento_pickers: {
        Row: {
          asignado_at: string
          estado: string
          id: number
          items_pickeados: number | null
          listado_id: number
          picker_id: number
        }
        Insert: {
          asignado_at?: string
          estado: string
          id?: number
          items_pickeados?: number | null
          listado_id: number
          picker_id: number
        }
        Update: {
          asignado_at?: string
          estado?: string
          id?: number
          items_pickeados?: number | null
          listado_id?: number
          picker_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "listados_abastecimiento_pickers_listado_id_fkey"
            columns: ["listado_id"]
            isOneToOne: false
            referencedRelation: "listados_abastecimiento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listados_abastecimiento_pickers_picker_id_fkey"
            columns: ["picker_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      media: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          descripcion: string | null
          id: number
          incidente_id: number
          tag_estado: string | null
          tipo: Database["public"]["Enums"]["tipomedia"]
          url: string
          visibilidad: Database["public"]["Enums"]["visibilidadmedia"]
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          descripcion?: string | null
          id?: number
          incidente_id: number
          tag_estado?: string | null
          tipo: Database["public"]["Enums"]["tipomedia"]
          url: string
          visibilidad: Database["public"]["Enums"]["visibilidadmedia"]
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          descripcion?: string | null
          id?: number
          incidente_id?: number
          tag_estado?: string | null
          tipo?: Database["public"]["Enums"]["tipomedia"]
          url?: string
          visibilidad?: Database["public"]["Enums"]["visibilidadmedia"]
        }
        Relationships: [
          {
            foreignKeyName: "media_incidente_id_fkey"
            columns: ["incidente_id"]
            isOneToOne: false
            referencedRelation: "incidentes"
            referencedColumns: ["id"]
          },
        ]
      }
      movimientos_inventario: {
        Row: {
          cantidad: number
          centro_servicio_id: number
          created_at: string | null
          created_by_id: number
          id: number
          motivo: string | null
          referencia: string | null
          repuesto_id: number
          stock_anterior: number
          stock_nuevo: number
          tipo_movimiento: Database["public"]["Enums"]["tipomovimientoinventario"]
          ubicacion: string | null
        }
        Insert: {
          cantidad: number
          centro_servicio_id: number
          created_at?: string | null
          created_by_id: number
          id?: number
          motivo?: string | null
          referencia?: string | null
          repuesto_id: number
          stock_anterior: number
          stock_nuevo: number
          tipo_movimiento: Database["public"]["Enums"]["tipomovimientoinventario"]
          ubicacion?: string | null
        }
        Update: {
          cantidad?: number
          centro_servicio_id?: number
          created_at?: string | null
          created_by_id?: number
          id?: number
          motivo?: string | null
          referencia?: string | null
          repuesto_id?: number
          stock_anterior?: number
          stock_nuevo?: number
          tipo_movimiento?: Database["public"]["Enums"]["tipomovimientoinventario"]
          ubicacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_inventario_centro_servicio_id_fkey"
            columns: ["centro_servicio_id"]
            isOneToOne: false
            referencedRelation: "centros_de_servicio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_inventario_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_inventario_repuesto_id_fkey"
            columns: ["repuesto_id"]
            isOneToOne: false
            referencedRelation: "repuestos"
            referencedColumns: ["id"]
          },
        ]
      }
      notificaciones: {
        Row: {
          created_at: string | null
          destinatario: Database["public"]["Enums"]["tipodestinatario"]
          enviada: boolean | null
          id: number
          incidente_id: number
          mensaje: string
          tipo: string
        }
        Insert: {
          created_at?: string | null
          destinatario: Database["public"]["Enums"]["tipodestinatario"]
          enviada?: boolean | null
          id?: number
          incidente_id: number
          mensaje: string
          tipo: string
        }
        Update: {
          created_at?: string | null
          destinatario?: Database["public"]["Enums"]["tipodestinatario"]
          enviada?: boolean | null
          id?: number
          incidente_id?: number
          mensaje?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificaciones_incidente_id_fkey"
            columns: ["incidente_id"]
            isOneToOne: false
            referencedRelation: "incidentes"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido_repuesto: {
        Row: {
          cantidad: number
          pedido_id: number
          repuesto_id: number
        }
        Insert: {
          cantidad: number
          pedido_id: number
          repuesto_id: number
        }
        Update: {
          cantidad?: number
          pedido_id?: number
          repuesto_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedido_repuesto_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_bodega_central"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_repuesto_repuesto_id_fkey"
            columns: ["repuesto_id"]
            isOneToOne: false
            referencedRelation: "repuestos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos_bodega_central: {
        Row: {
          aprobado_jefe_taller_id: number | null
          aprobado_supervisor_id: number | null
          centro_servicio_id: number
          convertido_cxg: boolean | null
          created_at: string | null
          dias_sin_stock: number | null
          estado: Database["public"]["Enums"]["estadopedidobodega"]
          id: number
          incidente_id: number | null
          solicitado_por_id: number
          updated_at: string | null
        }
        Insert: {
          aprobado_jefe_taller_id?: number | null
          aprobado_supervisor_id?: number | null
          centro_servicio_id: number
          convertido_cxg?: boolean | null
          created_at?: string | null
          dias_sin_stock?: number | null
          estado: Database["public"]["Enums"]["estadopedidobodega"]
          id?: number
          incidente_id?: number | null
          solicitado_por_id: number
          updated_at?: string | null
        }
        Update: {
          aprobado_jefe_taller_id?: number | null
          aprobado_supervisor_id?: number | null
          centro_servicio_id?: number
          convertido_cxg?: boolean | null
          created_at?: string | null
          dias_sin_stock?: number | null
          estado?: Database["public"]["Enums"]["estadopedidobodega"]
          id?: number
          incidente_id?: number | null
          solicitado_por_id?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_bodega_central_aprobado_jefe_taller_id_fkey"
            columns: ["aprobado_jefe_taller_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_bodega_central_aprobado_supervisor_id_fkey"
            columns: ["aprobado_supervisor_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_bodega_central_centro_servicio_id_fkey"
            columns: ["centro_servicio_id"]
            isOneToOne: false
            referencedRelation: "centros_de_servicio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_bodega_central_incidente_id_fkey"
            columns: ["incidente_id"]
            isOneToOne: false
            referencedRelation: "incidentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_bodega_central_solicitado_por_id_fkey"
            columns: ["solicitado_por_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      presupuestos: {
        Row: {
          aprobado_por: string | null
          created_at: string | null
          created_by: number | null
          estado: string | null
          fecha_aprobacion: string | null
          id: number
          incidente_id: number
          mano_obra: number | null
          notas: string | null
          repuestos: Json | null
          total: number | null
          updated_at: string | null
        }
        Insert: {
          aprobado_por?: string | null
          created_at?: string | null
          created_by?: number | null
          estado?: string | null
          fecha_aprobacion?: string | null
          id?: number
          incidente_id: number
          mano_obra?: number | null
          notas?: string | null
          repuestos?: Json | null
          total?: number | null
          updated_at?: string | null
        }
        Update: {
          aprobado_por?: string | null
          created_at?: string | null
          created_by?: number | null
          estado?: string | null
          fecha_aprobacion?: string | null
          id?: number
          incidente_id?: number
          mano_obra?: number | null
          notas?: string | null
          repuestos?: Json | null
          total?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "presupuestos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presupuestos_incidente_id_fkey"
            columns: ["incidente_id"]
            isOneToOne: false
            referencedRelation: "incidentes"
            referencedColumns: ["id"]
          },
        ]
      }
      producto_familia: {
        Row: {
          familia_id: number
          producto_id: number
        }
        Insert: {
          familia_id: number
          producto_id: number
        }
        Update: {
          familia_id?: number
          producto_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "producto_familia_familia_id_fkey"
            columns: ["familia_id"]
            isOneToOne: false
            referencedRelation: "familias_producto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producto_familia_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      productos: {
        Row: {
          activo: boolean | null
          clave: string | null
          codigo: string
          created_at: string | null
          descontinuado: boolean | null
          descripcion: string | null
          es_sugerido: boolean | null
          familia_abuelo_id: number | null
          familia_padre_id: number | null
          id: number
          marca: string | null
          modelo: string | null
          sku: string | null
          updated_at: string | null
          url_foto: string | null
        }
        Insert: {
          activo?: boolean | null
          clave?: string | null
          codigo: string
          created_at?: string | null
          descontinuado?: boolean | null
          descripcion?: string | null
          es_sugerido?: boolean | null
          familia_abuelo_id?: number | null
          familia_padre_id?: number | null
          id?: number
          marca?: string | null
          modelo?: string | null
          sku?: string | null
          updated_at?: string | null
          url_foto?: string | null
        }
        Update: {
          activo?: boolean | null
          clave?: string | null
          codigo?: string
          created_at?: string | null
          descontinuado?: boolean | null
          descripcion?: string | null
          es_sugerido?: boolean | null
          familia_abuelo_id?: number | null
          familia_padre_id?: number | null
          id?: number
          marca?: string | null
          modelo?: string | null
          sku?: string | null
          updated_at?: string | null
          url_foto?: string | null
        }
        Relationships: []
      }
      propietarios: {
        Row: {
          cliente_id: number | null
          created_at: string | null
          deleted_at: string | null
          dpi: string | null
          email: string | null
          id: number
          nombre: string
          telefono: string | null
          updated_at: string | null
        }
        Insert: {
          cliente_id?: number | null
          created_at?: string | null
          deleted_at?: string | null
          dpi?: string | null
          email?: string | null
          id?: number
          nombre: string
          telefono?: string | null
          updated_at?: string | null
        }
        Update: {
          cliente_id?: number | null
          created_at?: string | null
          deleted_at?: string | null
          dpi?: string | null
          email?: string | null
          id?: number
          nombre?: string
          telefono?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "propietarios_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      reclamos_faltantes: {
        Row: {
          cantidad_faltante: number
          codigo_repuesto: string
          descripcion: string | null
          estado: string | null
          fecha_reclamo: string
          fecha_resolucion: string | null
          id: number
          notas_resolucion: string | null
          reclamado_por: number | null
          resuelto_por: number | null
          transito_id: number
        }
        Insert: {
          cantidad_faltante: number
          codigo_repuesto: string
          descripcion?: string | null
          estado?: string | null
          fecha_reclamo?: string
          fecha_resolucion?: string | null
          id?: number
          notas_resolucion?: string | null
          reclamado_por?: number | null
          resuelto_por?: number | null
          transito_id: number
        }
        Update: {
          cantidad_faltante?: number
          codigo_repuesto?: string
          descripcion?: string | null
          estado?: string | null
          fecha_reclamo?: string
          fecha_resolucion?: string | null
          id?: number
          notas_resolucion?: string | null
          reclamado_por?: number | null
          resuelto_por?: number | null
          transito_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "reclamos_faltantes_reclamado_por_fkey"
            columns: ["reclamado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reclamos_faltantes_resuelto_por_fkey"
            columns: ["resuelto_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reclamos_faltantes_transito_id_fkey"
            columns: ["transito_id"]
            isOneToOne: false
            referencedRelation: "transitos_bodega"
            referencedColumns: ["id"]
          },
        ]
      }
      recomendaciones: {
        Row: {
          activo: boolean | null
          created_at: string | null
          descripcion: string | null
          familia_hija_id: number
          id: number
          tipo: string | null
          titulo: string
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          descripcion?: string | null
          familia_hija_id: number
          id?: number
          tipo?: string | null
          titulo: string
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          descripcion?: string | null
          familia_hija_id?: number
          id?: number
          tipo?: string | null
          titulo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recomendaciones_familia_hija_id_fkey"
            columns: ["familia_hija_id"]
            isOneToOne: false
            referencedRelation: "familias_producto"
            referencedColumns: ["id"]
          },
        ]
      }
      repuestos: {
        Row: {
          clave: string | null
          codigo: string
          codigo_padre: string | null
          codigo_producto: string | null
          created_at: string | null
          descripcion: string | null
          disponible_mostrador: boolean | null
          es_catalogo_truper: boolean | null
          es_codigo_padre: boolean | null
          familia_id: number | null
          id: number
          prefijo_clasificacion: string | null
          updated_at: string | null
          url_foto: string | null
        }
        Insert: {
          clave?: string | null
          codigo: string
          codigo_padre?: string | null
          codigo_producto?: string | null
          created_at?: string | null
          descripcion?: string | null
          disponible_mostrador?: boolean | null
          es_catalogo_truper?: boolean | null
          es_codigo_padre?: boolean | null
          familia_id?: number | null
          id?: number
          prefijo_clasificacion?: string | null
          updated_at?: string | null
          url_foto?: string | null
        }
        Update: {
          clave?: string | null
          codigo?: string
          codigo_padre?: string | null
          codigo_producto?: string | null
          created_at?: string | null
          descripcion?: string | null
          disponible_mostrador?: boolean | null
          es_catalogo_truper?: boolean | null
          es_codigo_padre?: boolean | null
          familia_id?: number | null
          id?: number
          prefijo_clasificacion?: string | null
          updated_at?: string | null
          url_foto?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "repuestos_familia_id_fkey"
            columns: ["familia_id"]
            isOneToOne: false
            referencedRelation: "familias_producto"
            referencedColumns: ["id"]
          },
        ]
      }
      repuestos_clasificacion_abc: {
        Row: {
          clasificacion: Database["public"]["Enums"]["clasificacionabc"]
          frecuencia_uso: number | null
          id: number
          repuesto_id: number
          stock_maximo_sugerido: number | null
          stock_minimo_sugerido: number | null
          ultima_actualizacion: string | null
          valor_rotacion: number | null
        }
        Insert: {
          clasificacion: Database["public"]["Enums"]["clasificacionabc"]
          frecuencia_uso?: number | null
          id?: number
          repuesto_id: number
          stock_maximo_sugerido?: number | null
          stock_minimo_sugerido?: number | null
          ultima_actualizacion?: string | null
          valor_rotacion?: number | null
        }
        Update: {
          clasificacion?: Database["public"]["Enums"]["clasificacionabc"]
          frecuencia_uso?: number | null
          id?: number
          repuesto_id?: number
          stock_maximo_sugerido?: number | null
          stock_minimo_sugerido?: number | null
          ultima_actualizacion?: string | null
          valor_rotacion?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "repuestos_clasificacion_abc_repuesto_id_fkey"
            columns: ["repuesto_id"]
            isOneToOne: true
            referencedRelation: "repuestos"
            referencedColumns: ["id"]
          },
        ]
      }
      repuestos_productos: {
        Row: {
          created_at: string | null
          es_original: boolean | null
          id: number
          notas: string | null
          producto_id: number
          repuesto_id: number
        }
        Insert: {
          created_at?: string | null
          es_original?: boolean | null
          id?: number
          notas?: string | null
          producto_id: number
          repuesto_id: number
        }
        Update: {
          created_at?: string | null
          es_original?: boolean | null
          id?: number
          notas?: string | null
          producto_id?: number
          repuesto_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "repuestos_productos_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repuestos_productos_repuesto_id_fkey"
            columns: ["repuesto_id"]
            isOneToOne: false
            referencedRelation: "repuestos"
            referencedColumns: ["id"]
          },
        ]
      }
      repuestos_relaciones: {
        Row: {
          codigo: string
          descripcion: string | null
          id: number
          padre_id: number | null
        }
        Insert: {
          codigo: string
          descripcion?: string | null
          id?: number
          padre_id?: number | null
        }
        Update: {
          codigo?: string
          descripcion?: string | null
          id?: number
          padre_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "repuestos_relaciones_padre_id_fkey"
            columns: ["padre_id"]
            isOneToOne: false
            referencedRelation: "repuestos_relaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      repuestos_solicitud_detalle: {
        Row: {
          cantidad_encontrada: number | null
          cantidad_solicitada: number
          codigo_repuesto: string
          created_at: string | null
          estado: string | null
          fecha_verificacion: string | null
          id: number
          notas: string | null
          solicitud_id: number
          updated_at: string | null
          verificado_por: number | null
        }
        Insert: {
          cantidad_encontrada?: number | null
          cantidad_solicitada: number
          codigo_repuesto: string
          created_at?: string | null
          estado?: string | null
          fecha_verificacion?: string | null
          id?: number
          notas?: string | null
          solicitud_id: number
          updated_at?: string | null
          verificado_por?: number | null
        }
        Update: {
          cantidad_encontrada?: number | null
          cantidad_solicitada?: number
          codigo_repuesto?: string
          created_at?: string | null
          estado?: string | null
          fecha_verificacion?: string | null
          id?: number
          notas?: string | null
          solicitud_id?: number
          updated_at?: string | null
          verificado_por?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "repuestos_solicitud_detalle_codigo_repuesto_fkey"
            columns: ["codigo_repuesto"]
            isOneToOne: false
            referencedRelation: "repuestos"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "repuestos_solicitud_detalle_solicitud_id_fkey"
            columns: ["solicitud_id"]
            isOneToOne: false
            referencedRelation: "solicitudes_repuestos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repuestos_solicitud_detalle_verificado_por_fkey"
            columns: ["verificado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          descripcion: string | null
          id: number
          nombre: string
          slug: string
        }
        Insert: {
          descripcion?: string | null
          id?: number
          nombre: string
          slug: string
        }
        Update: {
          descripcion?: string | null
          id?: number
          nombre?: string
          slug?: string
        }
        Relationships: []
      }
      solicitudes_repuestos: {
        Row: {
          asignado_a: number | null
          created_at: string | null
          entregado_por: number | null
          estado: string | null
          fecha_asignacion: string | null
          fecha_despacho: string | null
          fecha_entrega: string | null
          id: number
          incidente_id: number
          notas: string | null
          presupuesto_aprobado: boolean | null
          repuestos: Json
          tecnico_solicitante_id: number
          tipo_despacho: string | null
          tipo_resolucion: string | null
          updated_at: string | null
        }
        Insert: {
          asignado_a?: number | null
          created_at?: string | null
          entregado_por?: number | null
          estado?: string | null
          fecha_asignacion?: string | null
          fecha_despacho?: string | null
          fecha_entrega?: string | null
          id?: number
          incidente_id: number
          notas?: string | null
          presupuesto_aprobado?: boolean | null
          repuestos: Json
          tecnico_solicitante_id: number
          tipo_despacho?: string | null
          tipo_resolucion?: string | null
          updated_at?: string | null
        }
        Update: {
          asignado_a?: number | null
          created_at?: string | null
          entregado_por?: number | null
          estado?: string | null
          fecha_asignacion?: string | null
          fecha_despacho?: string | null
          fecha_entrega?: string | null
          id?: number
          incidente_id?: number
          notas?: string | null
          presupuesto_aprobado?: boolean | null
          repuestos?: Json
          tecnico_solicitante_id?: number
          tipo_despacho?: string | null
          tipo_resolucion?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "solicitudes_repuestos_asignado_a_fkey"
            columns: ["asignado_a"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_repuestos_entregado_por_fkey"
            columns: ["entregado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_repuestos_incidente_id_fkey"
            columns: ["incidente_id"]
            isOneToOne: false
            referencedRelation: "incidentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_repuestos_tecnico_solicitante_id_fkey"
            columns: ["tecnico_solicitante_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitudes_transferencia_maquinas: {
        Row: {
          aprobado_por: number | null
          centro_destino_id: number
          centro_origen_id: number
          created_at: string | null
          estado: string | null
          fecha_aprobacion: string | null
          id: number
          incidente_id: number
          motivo: string
          notas_aprobacion: string | null
          solicitado_por: number
          updated_at: string | null
        }
        Insert: {
          aprobado_por?: number | null
          centro_destino_id: number
          centro_origen_id: number
          created_at?: string | null
          estado?: string | null
          fecha_aprobacion?: string | null
          id?: number
          incidente_id: number
          motivo: string
          notas_aprobacion?: string | null
          solicitado_por: number
          updated_at?: string | null
        }
        Update: {
          aprobado_por?: number | null
          centro_destino_id?: number
          centro_origen_id?: number
          created_at?: string | null
          estado?: string | null
          fecha_aprobacion?: string | null
          id?: number
          incidente_id?: number
          motivo?: string
          notas_aprobacion?: string | null
          solicitado_por?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "solicitudes_transferencia_maquinas_aprobado_por_fkey"
            columns: ["aprobado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_transferencia_maquinas_centro_destino_id_fkey"
            columns: ["centro_destino_id"]
            isOneToOne: false
            referencedRelation: "centros_de_servicio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_transferencia_maquinas_centro_origen_id_fkey"
            columns: ["centro_origen_id"]
            isOneToOne: false
            referencedRelation: "centros_de_servicio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_transferencia_maquinas_incidente_id_fkey"
            columns: ["incidente_id"]
            isOneToOne: false
            referencedRelation: "incidentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_transferencia_maquinas_solicitado_por_fkey"
            columns: ["solicitado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      sugeridos_mexico: {
        Row: {
          created_at: string
          estado: string
          fecha_importacion: string
          id: number
          importado_por: number | null
          nombre_archivo: string
          notas: string | null
          total_items: number
          updated_at: string
          valor_total_aprobado: number
          valor_total_sugerido: number
        }
        Insert: {
          created_at?: string
          estado: string
          fecha_importacion?: string
          id?: number
          importado_por?: number | null
          nombre_archivo: string
          notas?: string | null
          total_items: number
          updated_at?: string
          valor_total_aprobado: number
          valor_total_sugerido: number
        }
        Update: {
          created_at?: string
          estado?: string
          fecha_importacion?: string
          id?: number
          importado_por?: number | null
          nombre_archivo?: string
          notas?: string | null
          total_items?: number
          updated_at?: string
          valor_total_aprobado?: number
          valor_total_sugerido?: number
        }
        Relationships: [
          {
            foreignKeyName: "sugeridos_mexico_importado_por_fkey"
            columns: ["importado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      sugeridos_mexico_items: {
        Row: {
          cantidad_aprobada: number
          cantidad_sugerida: number
          clasificacion_abc: string | null
          clasificacion_xyz: string | null
          codigo_repuesto: string
          created_at: string
          decision: string
          descripcion: string | null
          dias_inventario: number
          id: number
          notas: string | null
          precio_unitario: number
          stock_actual_zona5: number
          sugerido_id: number
          updated_at: string
        }
        Insert: {
          cantidad_aprobada: number
          cantidad_sugerida: number
          clasificacion_abc?: string | null
          clasificacion_xyz?: string | null
          codigo_repuesto: string
          created_at?: string
          decision: string
          descripcion?: string | null
          dias_inventario: number
          id?: number
          notas?: string | null
          precio_unitario: number
          stock_actual_zona5: number
          sugerido_id: number
          updated_at?: string
        }
        Update: {
          cantidad_aprobada?: number
          cantidad_sugerida?: number
          clasificacion_abc?: string | null
          clasificacion_xyz?: string | null
          codigo_repuesto?: string
          created_at?: string
          decision?: string
          descripcion?: string | null
          dias_inventario?: number
          id?: number
          notas?: string | null
          precio_unitario?: number
          stock_actual_zona5?: number
          sugerido_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sugeridos_mexico_items_sugerido_id_fkey"
            columns: ["sugerido_id"]
            isOneToOne: false
            referencedRelation: "sugeridos_mexico"
            referencedColumns: ["id"]
          },
        ]
      }
      tecnicos_familias: {
        Row: {
          activo: boolean | null
          centro_servicio_id: number | null
          created_at: string | null
          familia_abuelo_id: number | null
          id: number
          updated_at: string | null
          user_id: number
        }
        Insert: {
          activo?: boolean | null
          centro_servicio_id?: number | null
          created_at?: string | null
          familia_abuelo_id?: number | null
          id?: number
          updated_at?: string | null
          user_id: number
        }
        Update: {
          activo?: boolean | null
          centro_servicio_id?: number | null
          created_at?: string | null
          familia_abuelo_id?: number | null
          id?: number
          updated_at?: string | null
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "tecnicos_familias_centro_servicio_id_fkey"
            columns: ["centro_servicio_id"]
            isOneToOne: false
            referencedRelation: "centros_de_servicio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tecnicos_familias_familia_abuelo_id_fkey"
            columns: ["familia_abuelo_id"]
            isOneToOne: false
            referencedRelation: "familias_producto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tecnicos_familias_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      transitos_bodega: {
        Row: {
          centro_destino_id: number
          centro_origen_id: number
          created_at: string
          enviado_por: number | null
          estado: string | null
          fecha_envio: string
          fecha_recepcion: string | null
          id: number
          notas: string | null
          numero_transito: string
          recibido_por: number | null
        }
        Insert: {
          centro_destino_id: number
          centro_origen_id: number
          created_at?: string
          enviado_por?: number | null
          estado?: string | null
          fecha_envio?: string
          fecha_recepcion?: string | null
          id?: number
          notas?: string | null
          numero_transito: string
          recibido_por?: number | null
        }
        Update: {
          centro_destino_id?: number
          centro_origen_id?: number
          created_at?: string
          enviado_por?: number | null
          estado?: string | null
          fecha_envio?: string
          fecha_recepcion?: string | null
          id?: number
          notas?: string | null
          numero_transito?: string
          recibido_por?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transitos_bodega_centro_destino_id_fkey"
            columns: ["centro_destino_id"]
            isOneToOne: false
            referencedRelation: "centros_de_servicio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transitos_bodega_centro_origen_id_fkey"
            columns: ["centro_origen_id"]
            isOneToOne: false
            referencedRelation: "centros_de_servicio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transitos_bodega_enviado_por_fkey"
            columns: ["enviado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transitos_bodega_recibido_por_fkey"
            columns: ["recibido_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      transitos_detalle: {
        Row: {
          cantidad_enviada: number
          cantidad_recibida: number | null
          codigo_repuesto: string
          created_at: string
          descripcion: string
          id: number
          transito_id: number
          ubicacion_destino: string | null
          verificado: boolean | null
        }
        Insert: {
          cantidad_enviada: number
          cantidad_recibida?: number | null
          codigo_repuesto: string
          created_at?: string
          descripcion: string
          id?: number
          transito_id: number
          ubicacion_destino?: string | null
          verificado?: boolean | null
        }
        Update: {
          cantidad_enviada?: number
          cantidad_recibida?: number | null
          codigo_repuesto?: string
          created_at?: string
          descripcion?: string
          id?: number
          transito_id?: number
          ubicacion_destino?: string | null
          verificado?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "transitos_detalle_transito_id_fkey"
            columns: ["transito_id"]
            isOneToOne: false
            referencedRelation: "transitos_bodega"
            referencedColumns: ["id"]
          },
        ]
      }
      ubicaciones: {
        Row: {
          activo: boolean | null
          bodega_id: number | null
          codigo: string | null
          created_at: string | null
          id: number
          nivel: string | null
          pasillo: string | null
          rack: string | null
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          bodega_id?: number | null
          codigo?: string | null
          created_at?: string | null
          id?: number
          nivel?: string | null
          pasillo?: string | null
          rack?: string | null
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          bodega_id?: number | null
          codigo?: string | null
          created_at?: string | null
          id?: number
          nivel?: string | null
          pasillo?: string | null
          rack?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ubicaciones_bodega_id_fkey"
            columns: ["bodega_id"]
            isOneToOne: false
            referencedRelation: "bodegas"
            referencedColumns: ["id"]
          },
        ]
      }
      ubicaciones_historicas: {
        Row: {
          cantidad_asignada: number
          centro_servicio_id: number
          fecha_asignacion: string | null
          id: number
          repuesto_id: number
          ubicacion: string
          usuario_asigno_id: number
        }
        Insert: {
          cantidad_asignada: number
          centro_servicio_id: number
          fecha_asignacion?: string | null
          id?: number
          repuesto_id: number
          ubicacion: string
          usuario_asigno_id: number
        }
        Update: {
          cantidad_asignada?: number
          centro_servicio_id?: number
          fecha_asignacion?: string | null
          id?: number
          repuesto_id?: number
          ubicacion?: string
          usuario_asigno_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "ubicaciones_historicas_centro_servicio_id_fkey"
            columns: ["centro_servicio_id"]
            isOneToOne: false
            referencedRelation: "centros_de_servicio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ubicaciones_historicas_repuesto_id_fkey"
            columns: ["repuesto_id"]
            isOneToOne: false
            referencedRelation: "repuestos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ubicaciones_historicas_usuario_asigno_id_fkey"
            columns: ["usuario_asigno_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      usuario_roles: {
        Row: {
          rol_id: number
          usuario_id: number
        }
        Insert: {
          rol_id: number
          usuario_id: number
        }
        Update: {
          rol_id?: number
          usuario_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "usuario_roles_rol_id_fkey"
            columns: ["rol_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuario_roles_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          activo: boolean | null
          apellido: string | null
          centro_de_servicio_id: number | null
          cliente_id: number | null
          codigo_empleado: string | null
          created_at: string | null
          deleted_at: string | null
          email: string
          empresa_id: number | null
          id: number
          nombre: string
          password_hash: string
          telefono: string | null
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          apellido?: string | null
          centro_de_servicio_id?: number | null
          cliente_id?: number | null
          codigo_empleado?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email: string
          empresa_id?: number | null
          id?: number
          nombre: string
          password_hash: string
          telefono?: string | null
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          apellido?: string | null
          centro_de_servicio_id?: number | null
          cliente_id?: number | null
          codigo_empleado?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string
          empresa_id?: number | null
          id?: number
          nombre?: string
          password_hash?: string
          telefono?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_centro_de_servicio_id_fkey"
            columns: ["centro_de_servicio_id"]
            isOneToOne: false
            referencedRelation: "centros_de_servicio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuarios_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuarios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generar_codigo_hpc: { Args: never; Returns: string }
      generar_codigo_incidente: { Args: never; Returns: string }
    }
    Enums: {
      clasificacionabc: "A" | "B" | "C"
      estadodiagnostico: "PENDIENTE" | "EN_PROGRESO" | "COMPLETADO"
      estadoguia:
        | "PENDIENTE"
        | "CREADA"
        | "EN_TRANSITO"
        | "ENTREGADA"
        | "CANCELADA"
      estadoincidente:
        | "REGISTRADO"
        | "EN_DIAGNOSTICO"
        | "EN_REPARACION"
        | "ESPERA_REPUESTOS"
        | "ESPERA_APROBACION"
        | "REPARADO"
        | "EN_ENTREGA"
        | "ENTREGADO"
        | "CERRADO"
        | "CANCELADO"
        | "NOTA_DE_CREDITO"
        | "CAMBIO_POR_GARANTIA"
        | "RECHAZADO"
        | "COMPLETADO"
      estadoinventariociclico:
        | "PENDIENTE"
        | "EN_PROGRESO"
        | "COMPLETADO"
        | "CANCELADO"
      estadopedidobodega:
        | "PENDIENTE"
        | "APROBADO_JEFE_TALLER"
        | "APROBADO_SUPERVISOR"
        | "RECHAZADO"
        | "ENVIADO"
        | "RECIBIDO"
      tipocomentario: "INTERNO" | "VISIBLE"
      tipodestinatario: "CLIENTE" | "PROPIETARIO"
      tipoguia: "RECOLECTA" | "TRASLADO" | "ENTREGA"
      tipoincidente: "MANTENIMIENTO" | "REPARACION"
      tipomedia: "FOTO" | "VIDEO" | "AUDIO"
      tipomovimientoinventario: "ENTRADA" | "SALIDA" | "AJUSTE"
      tipoparticipacion:
        | "REGISTRADO_POR"
        | "DIAGNOSTICADO_POR"
        | "REPARADO_POR"
        | "APROBADO_GARANTIA_POR"
        | "SUPERVISADO_POR"
        | "SUSTITUIDO_POR"
        | "ENTREGADO_POR"
        | "TECNICO_ASIGNADO"
        | "DIAGNOSTICO_REGISTRADO"
      tiporesolucion:
        | "REPARAR_EN_GARANTIA"
        | "PRESUPUESTO"
        | "CANJE"
        | "NOTA_DE_CREDITO"
      visibilidadmedia: "INTERNO" | "VISIBLE"
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
      clasificacionabc: ["A", "B", "C"],
      estadodiagnostico: ["PENDIENTE", "EN_PROGRESO", "COMPLETADO"],
      estadoguia: [
        "PENDIENTE",
        "CREADA",
        "EN_TRANSITO",
        "ENTREGADA",
        "CANCELADA",
      ],
      estadoincidente: [
        "REGISTRADO",
        "EN_DIAGNOSTICO",
        "EN_REPARACION",
        "ESPERA_REPUESTOS",
        "ESPERA_APROBACION",
        "REPARADO",
        "EN_ENTREGA",
        "ENTREGADO",
        "CERRADO",
        "CANCELADO",
        "NOTA_DE_CREDITO",
        "CAMBIO_POR_GARANTIA",
        "RECHAZADO",
        "COMPLETADO",
      ],
      estadoinventariociclico: [
        "PENDIENTE",
        "EN_PROGRESO",
        "COMPLETADO",
        "CANCELADO",
      ],
      estadopedidobodega: [
        "PENDIENTE",
        "APROBADO_JEFE_TALLER",
        "APROBADO_SUPERVISOR",
        "RECHAZADO",
        "ENVIADO",
        "RECIBIDO",
      ],
      tipocomentario: ["INTERNO", "VISIBLE"],
      tipodestinatario: ["CLIENTE", "PROPIETARIO"],
      tipoguia: ["RECOLECTA", "TRASLADO", "ENTREGA"],
      tipoincidente: ["MANTENIMIENTO", "REPARACION"],
      tipomedia: ["FOTO", "VIDEO", "AUDIO"],
      tipomovimientoinventario: ["ENTRADA", "SALIDA", "AJUSTE"],
      tipoparticipacion: [
        "REGISTRADO_POR",
        "DIAGNOSTICADO_POR",
        "REPARADO_POR",
        "APROBADO_GARANTIA_POR",
        "SUPERVISADO_POR",
        "SUSTITUIDO_POR",
        "ENTREGADO_POR",
        "TECNICO_ASIGNADO",
        "DIAGNOSTICO_REGISTRADO",
      ],
      tiporesolucion: [
        "REPARAR_EN_GARANTIA",
        "PRESUPUESTO",
        "CANJE",
        "NOTA_DE_CREDITO",
      ],
      visibilidadmedia: ["INTERNO", "VISIBLE"],
    },
  },
} as const
