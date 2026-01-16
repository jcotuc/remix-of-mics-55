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
      asignaciones_sac: {
        Row: {
          activo: boolean | null
          created_at: string
          fecha_asignacion: string
          id: string
          incidente_id: string
          user_id: string
        }
        Insert: {
          activo?: boolean | null
          created_at?: string
          fecha_asignacion?: string
          id?: string
          incidente_id: string
          user_id: string
        }
        Update: {
          activo?: boolean | null
          created_at?: string
          fecha_asignacion?: string
          id?: string
          incidente_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asignaciones_sac_incidente_id_fkey"
            columns: ["incidente_id"]
            isOneToOne: false
            referencedRelation: "incidentes"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          accion: Database["public"]["Enums"]["audit_action"]
          campos_modificados: string[] | null
          created_at: string
          id: string
          ip_address: string | null
          motivo: string | null
          registro_id: string
          tabla_afectada: string
          user_agent: string | null
          usuario_email: string | null
          usuario_id: string | null
          valores_anteriores: Json | null
          valores_nuevos: Json | null
        }
        Insert: {
          accion: Database["public"]["Enums"]["audit_action"]
          campos_modificados?: string[] | null
          created_at?: string
          id?: string
          ip_address?: string | null
          motivo?: string | null
          registro_id: string
          tabla_afectada: string
          user_agent?: string | null
          usuario_email?: string | null
          usuario_id?: string | null
          valores_anteriores?: Json | null
          valores_nuevos?: Json | null
        }
        Update: {
          accion?: Database["public"]["Enums"]["audit_action"]
          campos_modificados?: string[] | null
          created_at?: string
          id?: string
          ip_address?: string | null
          motivo?: string | null
          registro_id?: string
          tabla_afectada?: string
          user_agent?: string | null
          usuario_email?: string | null
          usuario_id?: string | null
          valores_anteriores?: Json | null
          valores_nuevos?: Json | null
        }
        Relationships: []
      }
      auditorias_calidad: {
        Row: {
          auditor_id: string | null
          causa_raiz: string | null
          created_at: string
          cumple_ensamblaje: boolean | null
          cumple_limpieza: boolean | null
          cumple_presentacion: boolean | null
          cumple_sellado: boolean | null
          evidencias_urls: string[] | null
          fecha_auditoria: string
          id: string
          incidente_id: string
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
          auditor_id?: string | null
          causa_raiz?: string | null
          created_at?: string
          cumple_ensamblaje?: boolean | null
          cumple_limpieza?: boolean | null
          cumple_presentacion?: boolean | null
          cumple_sellado?: boolean | null
          evidencias_urls?: string[] | null
          fecha_auditoria?: string
          id?: string
          incidente_id: string
          observaciones?: string | null
          presion_medida?: number | null
          proveedor_involucrado?: string | null
          resultado: string
          tecnico_responsable: string
          temperatura_medida?: number | null
          tipo_falla?: string | null
          updated_at?: string
          velocidad_medida?: number | null
          voltaje_medido?: number | null
        }
        Update: {
          auditor_id?: string | null
          causa_raiz?: string | null
          created_at?: string
          cumple_ensamblaje?: boolean | null
          cumple_limpieza?: boolean | null
          cumple_presentacion?: boolean | null
          cumple_sellado?: boolean | null
          evidencias_urls?: string[] | null
          fecha_auditoria?: string
          id?: string
          incidente_id?: string
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
        Relationships: []
      }
      Bodega_CDS: {
        Row: {
          created_at: string
          id: number
        }
        Insert: {
          created_at?: string
          id?: number
        }
        Update: {
          created_at?: string
          id?: number
        }
        Relationships: []
      }
      Bodegas_CDS: {
        Row: {
          activo: boolean | null
          cds_id: string
          centro_servicio_id: string | null
          codigo: string | null
          created_at: string
          id: number
          nombre: string | null
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          cds_id?: string
          centro_servicio_id?: string | null
          codigo?: string | null
          created_at?: string
          id?: number
          nombre?: string | null
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          cds_id?: string
          centro_servicio_id?: string | null
          codigo?: string | null
          created_at?: string
          id?: number
          nombre?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Bodegas_CDS_centro_servicio_id_fkey"
            columns: ["centro_servicio_id"]
            isOneToOne: false
            referencedRelation: "centros_servicio"
            referencedColumns: ["id"]
          },
        ]
      }
      CDS_Accesorios: {
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
            foreignKeyName: "CDS_Accesorios_familia_id_fkey"
            columns: ["familia_id"]
            isOneToOne: false
            referencedRelation: "CDS_Familias"
            referencedColumns: ["id"]
          },
        ]
      }
      CDS_Causas: {
        Row: {
          created_at: string
          familia_id: number | null
          id: number
          nombre: string
        }
        Insert: {
          created_at?: string
          familia_id?: number | null
          id?: number
          nombre: string
        }
        Update: {
          created_at?: string
          familia_id?: number | null
          id?: number
          nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "CDS_Causas_familia_id_fkey"
            columns: ["familia_id"]
            isOneToOne: false
            referencedRelation: "CDS_Familias"
            referencedColumns: ["id"]
          },
        ]
      }
      CDS_Fallas: {
        Row: {
          created_at: string
          familia_id: number | null
          id: number
          nombre: string
        }
        Insert: {
          created_at?: string
          familia_id?: number | null
          id?: number
          nombre: string
        }
        Update: {
          created_at?: string
          familia_id?: number | null
          id?: number
          nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "CDS_Fallas_familia_id_fkey"
            columns: ["familia_id"]
            isOneToOne: false
            referencedRelation: "CDS_Familias"
            referencedColumns: ["id"]
          },
        ]
      }
      CDS_Familias: {
        Row: {
          Categoria: string | null
          id: number
          Padre: number | null
        }
        Insert: {
          Categoria?: string | null
          id?: number
          Padre?: number | null
        }
        Update: {
          Categoria?: string | null
          id?: number
          Padre?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "CDS_Familias_Padre_fkey"
            columns: ["Padre"]
            isOneToOne: false
            referencedRelation: "CDS_Familias"
            referencedColumns: ["id"]
          },
        ]
      }
      centros_servicio: {
        Row: {
          activo: boolean | null
          bodega_id: string | null
          created_at: string
          direccion: string | null
          email: string | null
          es_central: boolean | null
          id: string
          id_numerico: number | null
          nombre: string
          numero_bodega: string | null
          responsable_id: string | null
          telefono: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean | null
          bodega_id?: string | null
          created_at?: string
          direccion?: string | null
          email?: string | null
          es_central?: boolean | null
          id?: string
          id_numerico?: number | null
          nombre: string
          numero_bodega?: string | null
          responsable_id?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean | null
          bodega_id?: string | null
          created_at?: string
          direccion?: string | null
          email?: string | null
          es_central?: boolean | null
          id?: string
          id_numerico?: number | null
          nombre?: string
          numero_bodega?: string | null
          responsable_id?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "centros_servicio_bodega_id_fkey"
            columns: ["bodega_id"]
            isOneToOne: false
            referencedRelation: "Bodegas_CDS"
            referencedColumns: ["cds_id"]
          },
          {
            foreignKeyName: "centros_servicio_responsable_id_fkey"
            columns: ["responsable_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      centros_supervisor: {
        Row: {
          centro_servicio_id: string
          created_at: string | null
          id: string
          supervisor_id: string
        }
        Insert: {
          centro_servicio_id: string
          created_at?: string | null
          id?: string
          supervisor_id: string
        }
        Update: {
          centro_servicio_id?: string
          created_at?: string | null
          id?: string
          supervisor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "centros_supervisor_centro_servicio_id_fkey"
            columns: ["centro_servicio_id"]
            isOneToOne: false
            referencedRelation: "centros_servicio"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          celular: string
          codigo: string
          codigo_sap: string | null
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
          origen: string | null
          pais: string | null
          telefono_principal: string | null
          telefono_secundario: string | null
          updated_at: string
        }
        Insert: {
          celular: string
          codigo: string
          codigo_sap?: string | null
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
          origen?: string | null
          pais?: string | null
          telefono_principal?: string | null
          telefono_secundario?: string | null
          updated_at?: string
        }
        Update: {
          celular?: string
          codigo?: string
          codigo_sap?: string | null
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
          origen?: string | null
          pais?: string | null
          telefono_principal?: string | null
          telefono_secundario?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      configuracion_fifo_centro: {
        Row: {
          activo: boolean | null
          centro_servicio_id: string
          familia_abuelo_id: number
          id: string
          orden: number
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          activo?: boolean | null
          centro_servicio_id: string
          familia_abuelo_id: number
          id?: string
          orden?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          activo?: boolean | null
          centro_servicio_id?: string
          familia_abuelo_id?: number
          id?: string
          orden?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "configuracion_fifo_centro_centro_servicio_id_fkey"
            columns: ["centro_servicio_id"]
            isOneToOne: false
            referencedRelation: "centros_servicio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "configuracion_fifo_centro_familia_abuelo_id_fkey"
            columns: ["familia_abuelo_id"]
            isOneToOne: false
            referencedRelation: "CDS_Familias"
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
      defectos_calidad: {
        Row: {
          auditoria_id: string | null
          codigo_elemento: string
          comentarios_tecnicos: string | null
          created_at: string
          descripcion_defecto: string
          descripcion_elemento: string | null
          frecuencia: number | null
          gravedad: string | null
          id: string
          proveedor: string | null
          sugerencias_mejora: string | null
          tipo_defecto: string
          tipo_elemento: string
        }
        Insert: {
          auditoria_id?: string | null
          codigo_elemento: string
          comentarios_tecnicos?: string | null
          created_at?: string
          descripcion_defecto: string
          descripcion_elemento?: string | null
          frecuencia?: number | null
          gravedad?: string | null
          id?: string
          proveedor?: string | null
          sugerencias_mejora?: string | null
          tipo_defecto: string
          tipo_elemento: string
        }
        Update: {
          auditoria_id?: string | null
          codigo_elemento?: string
          comentarios_tecnicos?: string | null
          created_at?: string
          descripcion_defecto?: string
          descripcion_elemento?: string | null
          frecuencia?: number | null
          gravedad?: string | null
          id?: string
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
          created_by: string | null
          descripcion: string
          estado: string
          fecha_ingreso: string
          id: string
          repuestos_disponibles: Json
          sku_maquina: string
          updated_at: string
        }
        Insert: {
          codigo_producto: string
          created_at?: string
          created_by?: string | null
          descripcion: string
          estado?: string
          fecha_ingreso?: string
          id?: string
          repuestos_disponibles?: Json
          sku_maquina: string
          updated_at?: string
        }
        Update: {
          codigo_producto?: string
          created_at?: string
          created_by?: string | null
          descripcion?: string
          estado?: string
          fecha_ingreso?: string
          id?: string
          repuestos_disponibles?: Json
          sku_maquina?: string
          updated_at?: string
        }
        Relationships: []
      }
      diagnosticos: {
        Row: {
          accesorios: string | null
          causas: string[]
          costo_estimado: number | null
          created_at: string | null
          digitador_asignado: string | null
          digitador_codigo: string | null
          estado: string | null
          fallas: string[]
          fecha_inicio_digitacion: string | null
          fotos_urls: string[] | null
          id: string
          incidente_id: string
          recomendaciones: string | null
          repuestos_utilizados: Json | null
          resolucion: string | null
          tecnico_codigo: string
          tiempo_estimado: string | null
          updated_at: string | null
        }
        Insert: {
          accesorios?: string | null
          causas: string[]
          costo_estimado?: number | null
          created_at?: string | null
          digitador_asignado?: string | null
          digitador_codigo?: string | null
          estado?: string | null
          fallas: string[]
          fecha_inicio_digitacion?: string | null
          fotos_urls?: string[] | null
          id?: string
          incidente_id: string
          recomendaciones?: string | null
          repuestos_utilizados?: Json | null
          resolucion?: string | null
          tecnico_codigo: string
          tiempo_estimado?: string | null
          updated_at?: string | null
        }
        Update: {
          accesorios?: string | null
          causas?: string[]
          costo_estimado?: number | null
          created_at?: string | null
          digitador_asignado?: string | null
          digitador_codigo?: string | null
          estado?: string | null
          fallas?: string[]
          fecha_inicio_digitacion?: string | null
          fotos_urls?: string[] | null
          id?: string
          incidente_id?: string
          recomendaciones?: string | null
          repuestos_utilizados?: Json | null
          resolucion?: string | null
          tecnico_codigo?: string
          tiempo_estimado?: string | null
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
        ]
      }
      direcciones_envio: {
        Row: {
          codigo_cliente: string
          created_at: string
          direccion: string
          es_principal: boolean | null
          id: string
          nombre_referencia: string | null
          updated_at: string
        }
        Insert: {
          codigo_cliente: string
          created_at?: string
          direccion: string
          es_principal?: boolean | null
          id?: string
          nombre_referencia?: string | null
          updated_at?: string
        }
        Update: {
          codigo_cliente?: string
          created_at?: string
          direccion?: string
          es_principal?: boolean | null
          id?: string
          nombre_referencia?: string | null
          updated_at?: string
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
      garantias_manuales: {
        Row: {
          cantidad_sku: number
          codigo_cliente: string
          comentarios_logistica: string | null
          created_at: string
          created_by: string | null
          descripcion_problema: string
          descripcion_sku: string
          estatus: string
          fotos_urls: string[] | null
          id: string
          incidente_id: string | null
          modified_by: string | null
          numero_incidente: string | null
          origen: string | null
          sku_reportado: string
          updated_at: string
        }
        Insert: {
          cantidad_sku?: number
          codigo_cliente: string
          comentarios_logistica?: string | null
          created_at?: string
          created_by?: string | null
          descripcion_problema: string
          descripcion_sku: string
          estatus?: string
          fotos_urls?: string[] | null
          id?: string
          incidente_id?: string | null
          modified_by?: string | null
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
          created_by?: string | null
          descripcion_problema?: string
          descripcion_sku?: string
          estatus?: string
          fotos_urls?: string[] | null
          id?: string
          incidente_id?: string | null
          modified_by?: string | null
          numero_incidente?: string | null
          origen?: string | null
          sku_reportado?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "garantias_manuales_incidente_id_fkey"
            columns: ["incidente_id"]
            isOneToOne: false
            referencedRelation: "incidentes"
            referencedColumns: ["id"]
          },
        ]
      }
      grupos_cola_fifo: {
        Row: {
          activo: boolean | null
          centro_servicio_id: string
          color: string | null
          created_at: string | null
          id: string
          nombre: string
          orden: number
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          activo?: boolean | null
          centro_servicio_id: string
          color?: string | null
          created_at?: string | null
          id?: string
          nombre: string
          orden: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          activo?: boolean | null
          centro_servicio_id?: string
          color?: string | null
          created_at?: string | null
          id?: string
          nombre?: string
          orden?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grupos_cola_fifo_centro_servicio_id_fkey"
            columns: ["centro_servicio_id"]
            isOneToOne: false
            referencedRelation: "centros_servicio"
            referencedColumns: ["id"]
          },
        ]
      }
      grupos_cola_fifo_familias: {
        Row: {
          created_at: string | null
          familia_abuelo_id: number
          grupo_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          familia_abuelo_id: number
          grupo_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          familia_abuelo_id?: number
          grupo_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grupos_cola_fifo_familias_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos_cola_fifo"
            referencedColumns: ["id"]
          },
        ]
      }
      guias_envio: {
        Row: {
          cantidad_piezas: number
          ciudad_destino: string
          created_at: string
          created_by: string | null
          destinatario: string
          direccion_destinatario: string
          direccion_remitente: string | null
          empacador: string | null
          estado: string
          fecha_entrega: string | null
          fecha_guia: string
          fecha_ingreso: string
          fecha_promesa_entrega: string | null
          id: string
          incidentes_codigos: string[] | null
          numero_guia: string
          operador_pod: string | null
          peso: number | null
          recibido_por: string | null
          referencia_1: string | null
          referencia_2: string | null
          remitente: string
          tarifa: number | null
          telefono_destinatario: string | null
          updated_at: string
        }
        Insert: {
          cantidad_piezas?: number
          ciudad_destino: string
          created_at?: string
          created_by?: string | null
          destinatario: string
          direccion_destinatario: string
          direccion_remitente?: string | null
          empacador?: string | null
          estado?: string
          fecha_entrega?: string | null
          fecha_guia?: string
          fecha_ingreso?: string
          fecha_promesa_entrega?: string | null
          id?: string
          incidentes_codigos?: string[] | null
          numero_guia: string
          operador_pod?: string | null
          peso?: number | null
          recibido_por?: string | null
          referencia_1?: string | null
          referencia_2?: string | null
          remitente?: string
          tarifa?: number | null
          telefono_destinatario?: string | null
          updated_at?: string
        }
        Update: {
          cantidad_piezas?: number
          ciudad_destino?: string
          created_at?: string
          created_by?: string | null
          destinatario?: string
          direccion_destinatario?: string
          direccion_remitente?: string | null
          empacador?: string | null
          estado?: string
          fecha_entrega?: string | null
          fecha_guia?: string
          fecha_ingreso?: string
          fecha_promesa_entrega?: string | null
          id?: string
          incidentes_codigos?: string[] | null
          numero_guia?: string
          operador_pod?: string | null
          peso?: number | null
          recibido_por?: string | null
          referencia_1?: string | null
          referencia_2?: string | null
          remitente?: string
          tarifa?: number | null
          telefono_destinatario?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      importaciones: {
        Row: {
          centro_destino_id: string | null
          created_at: string
          created_by: string | null
          estado: string | null
          fecha_llegada: string
          id: string
          notas: string | null
          numero_embarque: string
          origen: string
          updated_at: string
        }
        Insert: {
          centro_destino_id?: string | null
          created_at?: string
          created_by?: string | null
          estado?: string | null
          fecha_llegada: string
          id?: string
          notas?: string | null
          numero_embarque: string
          origen: string
          updated_at?: string
        }
        Update: {
          centro_destino_id?: string | null
          created_at?: string
          created_by?: string | null
          estado?: string | null
          fecha_llegada?: string
          id?: string
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
            referencedRelation: "centros_servicio"
            referencedColumns: ["id"]
          },
        ]
      }
      importaciones_detalle: {
        Row: {
          cantidad: number
          created_at: string
          descripcion: string
          id: string
          importacion_id: string
          procesado: boolean | null
          sku: string
          ubicacion_asignada: string | null
        }
        Insert: {
          cantidad: number
          created_at?: string
          descripcion: string
          id?: string
          importacion_id: string
          procesado?: boolean | null
          sku: string
          ubicacion_asignada?: string | null
        }
        Update: {
          cantidad?: number
          created_at?: string
          descripcion?: string
          id?: string
          importacion_id?: string
          procesado?: boolean | null
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
        ]
      }
      incidente_fotos: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          incidente_id: string
          orden: number | null
          storage_path: string
          tipo: string
          url: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          incidente_id: string
          orden?: number | null
          storage_path: string
          tipo: string
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          incidente_id?: string
          orden?: number | null
          storage_path?: string
          tipo?: string
          url?: string
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
          created_by: string | null
          descripcion_problema: string
          direccion_envio_id: string | null
          embarque_id: string | null
          es_herramienta_manual: boolean | null
          es_reingreso: boolean | null
          es_stock_cemaco: boolean | null
          estado_fisico_recepcion: string | null
          familia_padre_id: number | null
          fecha_ingreso: string
          garantia_manual_id: string | null
          id: string
          incidente_reingreso_de: string | null
          ingresado_en_mostrador: boolean | null
          log_observaciones: string | null
          observaciones_recepcion: string | null
          persona_deja_maquina: string | null
          presupuesto_cliente_aprobado: boolean | null
          producto_descontinuado: boolean | null
          producto_sugerido_alternativo: string | null
          quiere_envio: boolean | null
          sku_maquina: string | null
          status: Database["public"]["Enums"]["status_incidente"]
          tecnico_asignado_id: string | null
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
          created_by?: string | null
          descripcion_problema: string
          direccion_envio_id?: string | null
          embarque_id?: string | null
          es_herramienta_manual?: boolean | null
          es_reingreso?: boolean | null
          es_stock_cemaco?: boolean | null
          estado_fisico_recepcion?: string | null
          familia_padre_id?: number | null
          fecha_ingreso?: string
          garantia_manual_id?: string | null
          id?: string
          incidente_reingreso_de?: string | null
          ingresado_en_mostrador?: boolean | null
          log_observaciones?: string | null
          observaciones_recepcion?: string | null
          persona_deja_maquina?: string | null
          presupuesto_cliente_aprobado?: boolean | null
          producto_descontinuado?: boolean | null
          producto_sugerido_alternativo?: string | null
          quiere_envio?: boolean | null
          sku_maquina?: string | null
          status?: Database["public"]["Enums"]["status_incidente"]
          tecnico_asignado_id?: string | null
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
          created_by?: string | null
          descripcion_problema?: string
          direccion_envio_id?: string | null
          embarque_id?: string | null
          es_herramienta_manual?: boolean | null
          es_reingreso?: boolean | null
          es_stock_cemaco?: boolean | null
          estado_fisico_recepcion?: string | null
          familia_padre_id?: number | null
          fecha_ingreso?: string
          garantia_manual_id?: string | null
          id?: string
          incidente_reingreso_de?: string | null
          ingresado_en_mostrador?: boolean | null
          log_observaciones?: string | null
          observaciones_recepcion?: string | null
          persona_deja_maquina?: string | null
          presupuesto_cliente_aprobado?: boolean | null
          producto_descontinuado?: boolean | null
          producto_sugerido_alternativo?: string | null
          quiere_envio?: boolean | null
          sku_maquina?: string | null
          status?: Database["public"]["Enums"]["status_incidente"]
          tecnico_asignado_id?: string | null
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
            foreignKeyName: "incidentes_direccion_envio_id_fkey"
            columns: ["direccion_envio_id"]
            isOneToOne: false
            referencedRelation: "direcciones_envio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidentes_embarque_id_fkey"
            columns: ["embarque_id"]
            isOneToOne: false
            referencedRelation: "embarques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidentes_familia_padre_id_fkey"
            columns: ["familia_padre_id"]
            isOneToOne: false
            referencedRelation: "CDS_Familias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidentes_garantia_manual_id_fkey"
            columns: ["garantia_manual_id"]
            isOneToOne: false
            referencedRelation: "garantias_manuales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidentes_incidente_reingreso_de_fkey"
            columns: ["incidente_reingreso_de"]
            isOneToOne: false
            referencedRelation: "incidentes"
            referencedColumns: ["id"]
          },
        ]
      }
      ingresos_logistica: {
        Row: {
          created_at: string | null
          fecha_recepcion: string | null
          fotos_urls: string[]
          id: string
          incidente_id: string
          observaciones: string | null
          recibido_por: string | null
          sku_corregido: string | null
          sku_original: string
        }
        Insert: {
          created_at?: string | null
          fecha_recepcion?: string | null
          fotos_urls: string[]
          id?: string
          incidente_id: string
          observaciones?: string | null
          recibido_por?: string | null
          sku_corregido?: string | null
          sku_original: string
        }
        Update: {
          created_at?: string | null
          fecha_recepcion?: string | null
          fotos_urls?: string[]
          id?: string
          incidente_id?: string
          observaciones?: string | null
          recibido_por?: string | null
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
        ]
      }
      inventario: {
        Row: {
          bodega: string | null
          cantidad: number
          centro_servicio_id: string
          codigo_repuesto: string
          costo_unitario: number | null
          created_at: string
          descripcion: string | null
          id: string
          ubicacion_id: number | null
          ubicacion_legacy: string
          updated_at: string
        }
        Insert: {
          bodega?: string | null
          cantidad?: number
          centro_servicio_id: string
          codigo_repuesto: string
          costo_unitario?: number | null
          created_at?: string
          descripcion?: string | null
          id?: string
          ubicacion_id?: number | null
          ubicacion_legacy?: string
          updated_at?: string
        }
        Update: {
          bodega?: string | null
          cantidad?: number
          centro_servicio_id?: string
          codigo_repuesto?: string
          costo_unitario?: number | null
          created_at?: string
          descripcion?: string | null
          id?: string
          ubicacion_id?: number | null
          ubicacion_legacy?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventario_centro_servicio_id_fkey"
            columns: ["centro_servicio_id"]
            isOneToOne: false
            referencedRelation: "centros_servicio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_ubicacion_id_fkey"
            columns: ["ubicacion_id"]
            isOneToOne: false
            referencedRelation: "Ubicación_CDS"
            referencedColumns: ["id"]
          },
        ]
      }
      inventario_ciclico: {
        Row: {
          centro_servicio_id: string
          created_at: string
          estado: string | null
          fecha_completado: string | null
          fecha_inicio: string
          id: string
          notas: string | null
          numero_conteo: string
          realizado_por: string | null
          ubicacion: string
        }
        Insert: {
          centro_servicio_id: string
          created_at?: string
          estado?: string | null
          fecha_completado?: string | null
          fecha_inicio?: string
          id?: string
          notas?: string | null
          numero_conteo: string
          realizado_por?: string | null
          ubicacion: string
        }
        Update: {
          centro_servicio_id?: string
          created_at?: string
          estado?: string | null
          fecha_completado?: string | null
          fecha_inicio?: string
          id?: string
          notas?: string | null
          numero_conteo?: string
          realizado_por?: string | null
          ubicacion?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventario_ciclico_centro_servicio_id_fkey"
            columns: ["centro_servicio_id"]
            isOneToOne: false
            referencedRelation: "centros_servicio"
            referencedColumns: ["id"]
          },
        ]
      }
      inventario_ciclico_detalle: {
        Row: {
          ajustado: boolean | null
          cantidad_fisica: number | null
          cantidad_sistema: number
          codigo_repuesto: string
          created_at: string
          descripcion: string | null
          diferencia: number | null
          id: string
          inventario_id: string
          notas: string | null
        }
        Insert: {
          ajustado?: boolean | null
          cantidad_fisica?: number | null
          cantidad_sistema: number
          codigo_repuesto: string
          created_at?: string
          descripcion?: string | null
          diferencia?: number | null
          id?: string
          inventario_id: string
          notas?: string | null
        }
        Update: {
          ajustado?: boolean | null
          cantidad_fisica?: number | null
          cantidad_sistema?: number
          codigo_repuesto?: string
          created_at?: string
          descripcion?: string | null
          diferencia?: number | null
          id?: string
          inventario_id?: string
          notas?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventario_ciclico_detalle_inventario_id_fkey"
            columns: ["inventario_id"]
            isOneToOne: false
            referencedRelation: "inventario_ciclico"
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
      movimientos_inventario: {
        Row: {
          cantidad: number
          centro_servicio_id: string | null
          codigo_repuesto: string
          created_at: string
          created_by: string | null
          id: string
          motivo: string | null
          referencia: string | null
          stock_anterior: number | null
          stock_nuevo: number | null
          tipo_movimiento: Database["public"]["Enums"]["tipo_movimiento_inventario"]
          ubicacion: string | null
        }
        Insert: {
          cantidad: number
          centro_servicio_id?: string | null
          codigo_repuesto: string
          created_at?: string
          created_by?: string | null
          id?: string
          motivo?: string | null
          referencia?: string | null
          stock_anterior?: number | null
          stock_nuevo?: number | null
          tipo_movimiento: Database["public"]["Enums"]["tipo_movimiento_inventario"]
          ubicacion?: string | null
        }
        Update: {
          cantidad?: number
          centro_servicio_id?: string | null
          codigo_repuesto?: string
          created_at?: string
          created_by?: string | null
          id?: string
          motivo?: string | null
          referencia?: string | null
          stock_anterior?: number | null
          stock_nuevo?: number | null
          tipo_movimiento?: Database["public"]["Enums"]["tipo_movimiento_inventario"]
          ubicacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_inventario_centro_servicio_id_fkey"
            columns: ["centro_servicio_id"]
            isOneToOne: false
            referencedRelation: "centros_servicio"
            referencedColumns: ["id"]
          },
        ]
      }
      notificaciones: {
        Row: {
          created_at: string | null
          id: string
          incidente_id: string | null
          leido: boolean | null
          mensaje: string
          metadata: Json | null
          tipo: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          incidente_id?: string | null
          leido?: boolean | null
          mensaje: string
          metadata?: Json | null
          tipo: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          incidente_id?: string | null
          leido?: boolean | null
          mensaje?: string
          metadata?: Json | null
          tipo?: string
          updated_at?: string | null
          user_id?: string
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
      notificaciones_cliente: {
        Row: {
          canal: string
          created_at: string
          enviado_por: string | null
          fecha_envio: string
          fecha_respuesta: string | null
          id: string
          incidente_id: string
          mensaje: string | null
          notas: string | null
          numero_notificacion: number
          respondido: boolean | null
        }
        Insert: {
          canal: string
          created_at?: string
          enviado_por?: string | null
          fecha_envio?: string
          fecha_respuesta?: string | null
          id?: string
          incidente_id: string
          mensaje?: string | null
          notas?: string | null
          numero_notificacion: number
          respondido?: boolean | null
        }
        Update: {
          canal?: string
          created_at?: string
          enviado_por?: string | null
          fecha_envio?: string
          fecha_respuesta?: string | null
          id?: string
          incidente_id?: string
          mensaje?: string | null
          notas?: string | null
          numero_notificacion?: number
          respondido?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "notificaciones_cliente_incidente_id_fkey"
            columns: ["incidente_id"]
            isOneToOne: false
            referencedRelation: "incidentes"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos_bodega_central: {
        Row: {
          aprobado_jefe_taller_id: string | null
          aprobado_supervisor_id: string | null
          centro_servicio_id: string
          convertido_cxg: boolean | null
          created_at: string
          dias_sin_stock: number | null
          estado: string
          fecha_aprobacion_jt: string | null
          fecha_aprobacion_sr: string | null
          fecha_convertido_cxg: string | null
          id: string
          incidente_id: string
          notas: string | null
          notas_rechazo: string | null
          repuestos: Json
          solicitado_por: string
          updated_at: string
        }
        Insert: {
          aprobado_jefe_taller_id?: string | null
          aprobado_supervisor_id?: string | null
          centro_servicio_id: string
          convertido_cxg?: boolean | null
          created_at?: string
          dias_sin_stock?: number | null
          estado?: string
          fecha_aprobacion_jt?: string | null
          fecha_aprobacion_sr?: string | null
          fecha_convertido_cxg?: string | null
          id?: string
          incidente_id: string
          notas?: string | null
          notas_rechazo?: string | null
          repuestos?: Json
          solicitado_por: string
          updated_at?: string
        }
        Update: {
          aprobado_jefe_taller_id?: string | null
          aprobado_supervisor_id?: string | null
          centro_servicio_id?: string
          convertido_cxg?: boolean | null
          created_at?: string
          dias_sin_stock?: number | null
          estado?: string
          fecha_aprobacion_jt?: string | null
          fecha_aprobacion_sr?: string | null
          fecha_convertido_cxg?: string | null
          id?: string
          incidente_id?: string
          notas?: string | null
          notas_rechazo?: string | null
          repuestos?: Json
          solicitado_por?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_bodega_central_centro_servicio_id_fkey"
            columns: ["centro_servicio_id"]
            isOneToOne: false
            referencedRelation: "centros_servicio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_bodega_central_incidente_id_fkey"
            columns: ["incidente_id"]
            isOneToOne: false
            referencedRelation: "incidentes"
            referencedColumns: ["id"]
          },
        ]
      }
      permisos: {
        Row: {
          activo: boolean | null
          codigo: string
          created_at: string | null
          descripcion: string | null
          id: string
          modulo: string
          nombre: string
        }
        Insert: {
          activo?: boolean | null
          codigo: string
          created_at?: string | null
          descripcion?: string | null
          id?: string
          modulo: string
          nombre: string
        }
        Update: {
          activo?: boolean | null
          codigo?: string
          created_at?: string | null
          descripcion?: string | null
          id?: string
          modulo?: string
          nombre?: string
        }
        Relationships: []
      }
      permisos_roles: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          permiso_id: string | null
          rol: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          permiso_id?: string | null
          rol: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          permiso_id?: string | null
          rol?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "permisos_roles_permiso_id_fkey"
            columns: ["permiso_id"]
            isOneToOne: false
            referencedRelation: "permisos"
            referencedColumns: ["id"]
          },
        ]
      }
      permisos_usuarios: {
        Row: {
          created_at: string | null
          created_by: string | null
          es_denegado: boolean | null
          id: string
          motivo: string | null
          permiso_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          es_denegado?: boolean | null
          id?: string
          motivo?: string | null
          permiso_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          es_denegado?: boolean | null
          id?: string
          motivo?: string | null
          permiso_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permisos_usuarios_permiso_id_fkey"
            columns: ["permiso_id"]
            isOneToOne: false
            referencedRelation: "permisos"
            referencedColumns: ["id"]
          },
        ]
      }
      presupuestos: {
        Row: {
          aprobado_por: string | null
          created_at: string | null
          created_by: string | null
          estado: string | null
          fecha_aprobacion: string | null
          id: string
          incidente_id: string
          mano_obra: number | null
          notas: string | null
          repuestos: Json | null
          total: number | null
          updated_at: string | null
        }
        Insert: {
          aprobado_por?: string | null
          created_at?: string | null
          created_by?: string | null
          estado?: string | null
          fecha_aprobacion?: string | null
          id?: string
          incidente_id: string
          mano_obra?: number | null
          notas?: string | null
          repuestos?: Json | null
          total?: number | null
          updated_at?: string | null
        }
        Update: {
          aprobado_por?: string | null
          created_at?: string | null
          created_by?: string | null
          estado?: string | null
          fecha_aprobacion?: string | null
          id?: string
          incidente_id?: string
          mano_obra?: number | null
          notas?: string | null
          repuestos?: Json | null
          total?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "presupuestos_incidente_id_fkey"
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
          familia_padre_id: number | null
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
          familia_padre_id?: number | null
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
          familia_padre_id?: number | null
          id?: string
          updated_at?: string
          url_foto?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "productos_familia_padre_id_fkey"
            columns: ["familia_padre_id"]
            isOneToOne: false
            referencedRelation: "CDS_Familias"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          apellido: string
          centro_servicio_id: string | null
          codigo_empleado: string | null
          created_at: string
          email: string
          id: string
          id_numerico: number
          nombre: string
          updated_at: string
          user_id: string
        }
        Insert: {
          apellido: string
          centro_servicio_id?: string | null
          codigo_empleado?: string | null
          created_at?: string
          email: string
          id?: string
          id_numerico?: never
          nombre: string
          updated_at?: string
          user_id: string
        }
        Update: {
          apellido?: string
          centro_servicio_id?: string | null
          codigo_empleado?: string | null
          created_at?: string
          email?: string
          id?: string
          id_numerico?: never
          nombre?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_centro_servicio_id_fkey"
            columns: ["centro_servicio_id"]
            isOneToOne: false
            referencedRelation: "centros_servicio"
            referencedColumns: ["id"]
          },
        ]
      }
      puestos: {
        Row: {
          activo: boolean | null
          created_at: string | null
          descripcion: string | null
          id: string
          nombre: string
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          descripcion?: string | null
          id?: string
          nombre: string
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          descripcion?: string | null
          id?: string
          nombre?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      reclamos_faltantes: {
        Row: {
          cantidad_faltante: number
          codigo_repuesto: string
          descripcion: string | null
          estado: string | null
          fecha_reclamo: string
          fecha_resolucion: string | null
          id: string
          notas_resolucion: string | null
          reclamado_por: string | null
          resuelto_por: string | null
          transito_id: string
        }
        Insert: {
          cantidad_faltante: number
          codigo_repuesto: string
          descripcion?: string | null
          estado?: string | null
          fecha_reclamo?: string
          fecha_resolucion?: string | null
          id?: string
          notas_resolucion?: string | null
          reclamado_por?: string | null
          resuelto_por?: string | null
          transito_id: string
        }
        Update: {
          cantidad_faltante?: number
          codigo_repuesto?: string
          descripcion?: string | null
          estado?: string | null
          fecha_reclamo?: string
          fecha_resolucion?: string | null
          id?: string
          notas_resolucion?: string | null
          reclamado_por?: string | null
          resuelto_por?: string | null
          transito_id?: string
        }
        Relationships: [
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
          id: string
          tipo: string | null
          titulo: string
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          descripcion?: string | null
          familia_hija_id: number
          id?: string
          tipo?: string | null
          titulo: string
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          descripcion?: string | null
          familia_hija_id?: number
          id?: string
          tipo?: string | null
          titulo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recomendaciones_familia_hija_id_fkey"
            columns: ["familia_hija_id"]
            isOneToOne: false
            referencedRelation: "CDS_Familias"
            referencedColumns: ["id"]
          },
        ]
      }
      repuestos: {
        Row: {
          clave: string
          codigo: string
          codigo_padre: string | null
          codigo_producto: string | null
          created_at: string
          descripcion: string
          disponible_mostrador: boolean | null
          es_catalogo_truper: boolean | null
          es_codigo_padre: boolean | null
          id: string
          updated_at: string
        }
        Insert: {
          clave: string
          codigo: string
          codigo_padre?: string | null
          codigo_producto?: string | null
          created_at?: string
          descripcion: string
          disponible_mostrador?: boolean | null
          es_catalogo_truper?: boolean | null
          es_codigo_padre?: boolean | null
          id?: string
          updated_at?: string
        }
        Update: {
          clave?: string
          codigo?: string
          codigo_padre?: string | null
          codigo_producto?: string | null
          created_at?: string
          descripcion?: string
          disponible_mostrador?: boolean | null
          es_catalogo_truper?: boolean | null
          es_codigo_padre?: boolean | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_repuestos_codigo_padre"
            columns: ["codigo_padre"]
            isOneToOne: false
            referencedRelation: "repuestos"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "repuestos_codigo_producto_fkey"
            columns: ["codigo_producto"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["codigo"]
          },
        ]
      }
      repuestos_clasificacion_abc: {
        Row: {
          clasificacion: Database["public"]["Enums"]["clasificacion_abc"]
          codigo_repuesto: string
          frecuencia_uso: number | null
          id: string
          stock_maximo_sugerido: number | null
          stock_minimo_sugerido: number | null
          ultima_actualizacion: string
          valor_rotacion: number | null
        }
        Insert: {
          clasificacion: Database["public"]["Enums"]["clasificacion_abc"]
          codigo_repuesto: string
          frecuencia_uso?: number | null
          id?: string
          stock_maximo_sugerido?: number | null
          stock_minimo_sugerido?: number | null
          ultima_actualizacion?: string
          valor_rotacion?: number | null
        }
        Update: {
          clasificacion?: Database["public"]["Enums"]["clasificacion_abc"]
          codigo_repuesto?: string
          frecuencia_uso?: number | null
          id?: string
          stock_maximo_sugerido?: number | null
          stock_minimo_sugerido?: number | null
          ultima_actualizacion?: string
          valor_rotacion?: number | null
        }
        Relationships: []
      }
      repuestos_productos: {
        Row: {
          codigo_producto: string
          codigo_repuesto: string
          created_at: string | null
          es_original: boolean | null
          id: string
          notas: string | null
        }
        Insert: {
          codigo_producto: string
          codigo_repuesto: string
          created_at?: string | null
          es_original?: boolean | null
          id?: string
          notas?: string | null
        }
        Update: {
          codigo_producto?: string
          codigo_repuesto?: string
          created_at?: string | null
          es_original?: boolean | null
          id?: string
          notas?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_producto"
            columns: ["codigo_producto"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "fk_repuesto"
            columns: ["codigo_repuesto"]
            isOneToOne: false
            referencedRelation: "repuestos"
            referencedColumns: ["codigo"]
          },
        ]
      }
      repuestos_relaciones: {
        Row: {
          Código: string | null
          Descripción: string | null
          id: number
          Padre: number | null
        }
        Insert: {
          Código?: string | null
          Descripción?: string | null
          id?: number
          Padre?: number | null
        }
        Update: {
          Código?: string | null
          Descripción?: string | null
          id?: number
          Padre?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "repuestos_relaciones_Padre_fkey"
            columns: ["Padre"]
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
          id: string
          notas: string | null
          solicitud_id: string
          updated_at: string | null
          verificado_por: string | null
        }
        Insert: {
          cantidad_encontrada?: number | null
          cantidad_solicitada: number
          codigo_repuesto: string
          created_at?: string | null
          estado?: string | null
          fecha_verificacion?: string | null
          id?: string
          notas?: string | null
          solicitud_id: string
          updated_at?: string | null
          verificado_por?: string | null
        }
        Update: {
          cantidad_encontrada?: number | null
          cantidad_solicitada?: number
          codigo_repuesto?: string
          created_at?: string | null
          estado?: string | null
          fecha_verificacion?: string | null
          id?: string
          notas?: string | null
          solicitud_id?: string
          updated_at?: string | null
          verificado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "repuestos_solicitud_detalle_solicitud_id_fkey"
            columns: ["solicitud_id"]
            isOneToOne: false
            referencedRelation: "solicitudes_repuestos"
            referencedColumns: ["id"]
          },
        ]
      }
      revisiones_stock_cemaco: {
        Row: {
          aprobado_por: string | null
          created_at: string | null
          decision: string
          fecha_aprobacion: string | null
          fecha_revision: string
          fotos_urls: string[] | null
          id: string
          incidente_id: string
          justificacion: string
          observaciones: string | null
          revisor_id: string | null
          updated_at: string | null
        }
        Insert: {
          aprobado_por?: string | null
          created_at?: string | null
          decision: string
          fecha_aprobacion?: string | null
          fecha_revision?: string
          fotos_urls?: string[] | null
          id?: string
          incidente_id: string
          justificacion: string
          observaciones?: string | null
          revisor_id?: string | null
          updated_at?: string | null
        }
        Update: {
          aprobado_por?: string | null
          created_at?: string | null
          decision?: string
          fecha_aprobacion?: string | null
          fecha_revision?: string
          fotos_urls?: string[] | null
          id?: string
          incidente_id?: string
          justificacion?: string
          observaciones?: string | null
          revisor_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "revisiones_stock_cemaco_incidente_id_fkey"
            columns: ["incidente_id"]
            isOneToOne: false
            referencedRelation: "incidentes"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitudes_cambio: {
        Row: {
          aprobado_por: string | null
          created_at: string | null
          estado: string | null
          fecha_aprobacion: string | null
          fotos_urls: string[] | null
          id: string
          incidente_id: string
          justificacion: string
          observaciones_aprobacion: string | null
          tecnico_solicitante: string
          tipo_cambio: string
          updated_at: string | null
        }
        Insert: {
          aprobado_por?: string | null
          created_at?: string | null
          estado?: string | null
          fecha_aprobacion?: string | null
          fotos_urls?: string[] | null
          id?: string
          incidente_id: string
          justificacion: string
          observaciones_aprobacion?: string | null
          tecnico_solicitante: string
          tipo_cambio: string
          updated_at?: string | null
        }
        Update: {
          aprobado_por?: string | null
          created_at?: string | null
          estado?: string | null
          fecha_aprobacion?: string | null
          fotos_urls?: string[] | null
          id?: string
          incidente_id?: string
          justificacion?: string
          observaciones_aprobacion?: string | null
          tecnico_solicitante?: string
          tipo_cambio?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "solicitudes_cambio_incidente_id_fkey"
            columns: ["incidente_id"]
            isOneToOne: false
            referencedRelation: "incidentes"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitudes_repuestos: {
        Row: {
          asignado_a: string | null
          created_at: string | null
          entregado_por: string | null
          estado: string | null
          fecha_asignacion: string | null
          fecha_entrega: string | null
          id: string
          incidente_id: string
          notas: string | null
          presupuesto_aprobado: boolean | null
          repuestos: Json
          tecnico_solicitante: string
          tipo_despacho: string | null
          tipo_resolucion: string | null
          updated_at: string | null
        }
        Insert: {
          asignado_a?: string | null
          created_at?: string | null
          entregado_por?: string | null
          estado?: string | null
          fecha_asignacion?: string | null
          fecha_entrega?: string | null
          id?: string
          incidente_id: string
          notas?: string | null
          presupuesto_aprobado?: boolean | null
          repuestos: Json
          tecnico_solicitante: string
          tipo_despacho?: string | null
          tipo_resolucion?: string | null
          updated_at?: string | null
        }
        Update: {
          asignado_a?: string | null
          created_at?: string | null
          entregado_por?: string | null
          estado?: string | null
          fecha_asignacion?: string | null
          fecha_entrega?: string | null
          id?: string
          incidente_id?: string
          notas?: string | null
          presupuesto_aprobado?: boolean | null
          repuestos?: Json
          tecnico_solicitante?: string
          tipo_despacho?: string | null
          tipo_resolucion?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "solicitudes_repuestos_incidente_id_fkey"
            columns: ["incidente_id"]
            isOneToOne: false
            referencedRelation: "incidentes"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitudes_transferencia_maquinas: {
        Row: {
          aprobado_por: string | null
          centro_destino_id: string
          centro_origen_id: string
          created_at: string | null
          estado: string | null
          fecha_aprobacion: string | null
          id: string
          incidente_id: string
          motivo: string
          notas_aprobacion: string | null
          solicitado_por: string
          updated_at: string | null
        }
        Insert: {
          aprobado_por?: string | null
          centro_destino_id: string
          centro_origen_id: string
          created_at?: string | null
          estado?: string | null
          fecha_aprobacion?: string | null
          id?: string
          incidente_id: string
          motivo: string
          notas_aprobacion?: string | null
          solicitado_por: string
          updated_at?: string | null
        }
        Update: {
          aprobado_por?: string | null
          centro_destino_id?: string
          centro_origen_id?: string
          created_at?: string | null
          estado?: string | null
          fecha_aprobacion?: string | null
          id?: string
          incidente_id?: string
          motivo?: string
          notas_aprobacion?: string | null
          solicitado_por?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "solicitudes_transferencia_maquinas_centro_destino_id_fkey"
            columns: ["centro_destino_id"]
            isOneToOne: false
            referencedRelation: "centros_servicio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_transferencia_maquinas_centro_origen_id_fkey"
            columns: ["centro_origen_id"]
            isOneToOne: false
            referencedRelation: "centros_servicio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_transferencia_maquinas_incidente_id_fkey"
            columns: ["incidente_id"]
            isOneToOne: false
            referencedRelation: "incidentes"
            referencedColumns: ["id"]
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
      tecnicos_familias: {
        Row: {
          activo: boolean | null
          centro_servicio_id: string | null
          created_at: string | null
          familia_abuelo_id: number | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          activo?: boolean | null
          centro_servicio_id?: string | null
          created_at?: string | null
          familia_abuelo_id?: number | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          activo?: boolean | null
          centro_servicio_id?: string | null
          created_at?: string | null
          familia_abuelo_id?: number | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tecnicos_familias_centro_servicio_id_fkey"
            columns: ["centro_servicio_id"]
            isOneToOne: false
            referencedRelation: "centros_servicio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tecnicos_familias_familia_abuelo_id_fkey"
            columns: ["familia_abuelo_id"]
            isOneToOne: false
            referencedRelation: "CDS_Familias"
            referencedColumns: ["id"]
          },
        ]
      }
      transitos_bodega: {
        Row: {
          centro_destino_id: string
          centro_origen_id: string
          created_at: string
          enviado_por: string | null
          estado: string | null
          fecha_envio: string
          fecha_recepcion: string | null
          id: string
          notas: string | null
          numero_transito: string
          recibido_por: string | null
        }
        Insert: {
          centro_destino_id: string
          centro_origen_id: string
          created_at?: string
          enviado_por?: string | null
          estado?: string | null
          fecha_envio?: string
          fecha_recepcion?: string | null
          id?: string
          notas?: string | null
          numero_transito: string
          recibido_por?: string | null
        }
        Update: {
          centro_destino_id?: string
          centro_origen_id?: string
          created_at?: string
          enviado_por?: string | null
          estado?: string | null
          fecha_envio?: string
          fecha_recepcion?: string | null
          id?: string
          notas?: string | null
          numero_transito?: string
          recibido_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transitos_bodega_centro_destino_id_fkey"
            columns: ["centro_destino_id"]
            isOneToOne: false
            referencedRelation: "centros_servicio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transitos_bodega_centro_origen_id_fkey"
            columns: ["centro_origen_id"]
            isOneToOne: false
            referencedRelation: "centros_servicio"
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
          id: string
          transito_id: string
          ubicacion_destino: string | null
          verificado: boolean | null
        }
        Insert: {
          cantidad_enviada: number
          cantidad_recibida?: number | null
          codigo_repuesto: string
          created_at?: string
          descripcion: string
          id?: string
          transito_id: string
          ubicacion_destino?: string | null
          verificado?: boolean | null
        }
        Update: {
          cantidad_enviada?: number
          cantidad_recibida?: number | null
          codigo_repuesto?: string
          created_at?: string
          descripcion?: string
          id?: string
          transito_id?: string
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
      Ubicación_CDS: {
        Row: {
          activo: boolean | null
          bodega_id: string | null
          caja: string | null
          codigo: string | null
          created_at: string
          id: number
          nivel: string | null
          pasillo: string | null
          rack: string | null
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          bodega_id?: string | null
          caja?: string | null
          codigo?: string | null
          created_at?: string
          id?: number
          nivel?: string | null
          pasillo?: string | null
          rack?: string | null
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          bodega_id?: string | null
          caja?: string | null
          codigo?: string | null
          created_at?: string
          id?: number
          nivel?: string | null
          pasillo?: string | null
          rack?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Ubicación_CDS_bodega_id_fkey"
            columns: ["bodega_id"]
            isOneToOne: false
            referencedRelation: "Bodegas_CDS"
            referencedColumns: ["cds_id"]
          },
        ]
      }
      ubicaciones_historicas: {
        Row: {
          cantidad_asignada: number | null
          centro_servicio_id: string | null
          codigo_repuesto: string
          fecha_asignacion: string
          id: string
          ubicacion: string
          usuario_asigno: string | null
        }
        Insert: {
          cantidad_asignada?: number | null
          centro_servicio_id?: string | null
          codigo_repuesto: string
          fecha_asignacion?: string
          id?: string
          ubicacion: string
          usuario_asigno?: string | null
        }
        Update: {
          cantidad_asignada?: number | null
          centro_servicio_id?: string | null
          codigo_repuesto?: string
          fecha_asignacion?: string
          id?: string
          ubicacion?: string
          usuario_asigno?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ubicaciones_historicas_centro_servicio_id_fkey"
            columns: ["centro_servicio_id"]
            isOneToOne: false
            referencedRelation: "centros_servicio"
            referencedColumns: ["id"]
          },
        ]
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
      verificaciones_reincidencia: {
        Row: {
          aplica_reingreso: boolean
          codigo_falla_actual: string | null
          codigo_falla_original: string | null
          created_at: string
          es_reincidencia_valida: boolean
          fecha_verificacion: string
          fotos_urls: string[] | null
          id: string
          incidente_actual_id: string
          incidente_anterior_id: string | null
          justificacion: string
          updated_at: string
          verificador_id: string | null
        }
        Insert: {
          aplica_reingreso?: boolean
          codigo_falla_actual?: string | null
          codigo_falla_original?: string | null
          created_at?: string
          es_reincidencia_valida: boolean
          fecha_verificacion?: string
          fotos_urls?: string[] | null
          id?: string
          incidente_actual_id: string
          incidente_anterior_id?: string | null
          justificacion: string
          updated_at?: string
          verificador_id?: string | null
        }
        Update: {
          aplica_reingreso?: boolean
          codigo_falla_actual?: string | null
          codigo_falla_original?: string | null
          created_at?: string
          es_reincidencia_valida?: boolean
          fecha_verificacion?: string
          fotos_urls?: string[] | null
          id?: string
          incidente_actual_id?: string
          incidente_anterior_id?: string | null
          justificacion?: string
          updated_at?: string
          verificador_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verificaciones_reincidencia_incidente_actual_id_fkey"
            columns: ["incidente_actual_id"]
            isOneToOne: false
            referencedRelation: "incidentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verificaciones_reincidencia_incidente_anterior_id_fkey"
            columns: ["incidente_anterior_id"]
            isOneToOne: false
            referencedRelation: "incidentes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      buscar_repuesto_disponible: {
        Args: { p_centro_servicio_id: string; p_codigo_solicitado: string }
        Returns: {
          codigo_encontrado: string
          descripcion: string
          prioridad: number
          stock_disponible: number
          tipo_coincidencia: string
          ubicacion: string
        }[]
      }
      contar_asignaciones_tecnico: {
        Args: { tecnico_id: string }
        Returns: number
      }
      generar_codigo_hpc: { Args: never; Returns: string }
      generar_codigo_incidente: { Args: never; Returns: string }
      generar_numero_guia: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      inventario_totales: {
        Args: { p_centro_servicio_id: string; p_search: string }
        Returns: {
          skus: number
          unidades: number
          valor: number
        }[]
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "mostrador"
        | "logistica"
        | "taller"
        | "bodega"
        | "digitador"
        | "jefe_taller"
        | "tecnico"
        | "sac"
        | "control_calidad"
        | "asesor"
        | "gerente_centro"
        | "supervisor_regional"
        | "jefe_logistica"
        | "jefe_bodega"
        | "supervisor_bodega"
        | "supervisor_calidad"
        | "supervisor_sac"
        | "auxiliar_bodega"
        | "auxiliar_logistica"
        | "supervisor_inventarios"
        | "capacitador"
      audit_action: "INSERT" | "UPDATE" | "DELETE"
      clasificacion_abc: "A" | "B" | "C"
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
        | "Pendiente entrega"
        | "Logistica envio"
        | "Pendiente de aprobación NC"
        | "Entregado"
        | "NC Autorizada"
        | "NC Emitida"
      tipo_movimiento_inventario:
        | "entrada"
        | "salida"
        | "transferencia"
        | "ajuste"
        | "devolucion"
        | "reubicacion"
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
        "mostrador",
        "logistica",
        "taller",
        "bodega",
        "digitador",
        "jefe_taller",
        "tecnico",
        "sac",
        "control_calidad",
        "asesor",
        "gerente_centro",
        "supervisor_regional",
        "jefe_logistica",
        "jefe_bodega",
        "supervisor_bodega",
        "supervisor_calidad",
        "supervisor_sac",
        "auxiliar_bodega",
        "auxiliar_logistica",
        "supervisor_inventarios",
        "capacitador",
      ],
      audit_action: ["INSERT", "UPDATE", "DELETE"],
      clasificacion_abc: ["A", "B", "C"],
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
        "Pendiente entrega",
        "Logistica envio",
        "Pendiente de aprobación NC",
        "Entregado",
        "NC Autorizada",
        "NC Emitida",
      ],
      tipo_movimiento_inventario: [
        "entrada",
        "salida",
        "transferencia",
        "ajuste",
        "devolucion",
        "reubicacion",
      ],
    },
  },
} as const
