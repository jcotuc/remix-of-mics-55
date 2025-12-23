import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Permiso {
  id: string;
  codigo: string;
  nombre: string;
  modulo: string;
}

interface PermisoRol {
  permiso_id: string;
  permisos: Permiso;
}

interface PermisoUsuario {
  permiso_id: string;
  es_denegado: boolean;
  permisos: Permiso;
}

export function usePermisos() {
  const { user, userRole } = useAuth();
  const [permisosUsuario, setPermisosUsuario] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchPermisos = useCallback(async () => {
    if (!user || !userRole) {
      setPermisosUsuario(new Set());
      setLoading(false);
      return;
    }

    // Admin tiene todos los permisos
    if (userRole === 'admin') {
      const { data: todosPermisos } = await supabase
        .from('permisos')
        .select('codigo')
        .eq('activo', true);
      
      const codigosPermisos = new Set(todosPermisos?.map(p => p.codigo) || []);
      setPermisosUsuario(codigosPermisos);
      setLoading(false);
      return;
    }

    try {
      // 1. Obtener permisos del rol
      const { data: permisosRol } = await supabase
        .from('permisos_roles')
        .select(`
          permiso_id,
          permisos:permiso_id (
            id,
            codigo,
            nombre,
            modulo
          )
        `)
        .eq('rol', userRole);

      const permisosDelRol = new Set<string>();
      (permisosRol as unknown as PermisoRol[] || []).forEach(pr => {
        if (pr.permisos?.codigo) {
          permisosDelRol.add(pr.permisos.codigo);
        }
      });

      // 2. Obtener permisos especiales del usuario (agregados o denegados)
      const { data: permisosEspeciales } = await supabase
        .from('permisos_usuarios')
        .select(`
          permiso_id,
          es_denegado,
          permisos:permiso_id (
            id,
            codigo,
            nombre,
            modulo
          )
        `)
        .eq('user_id', user.id);

      // Aplicar permisos especiales
      const permisosFinal = new Set(permisosDelRol);
      (permisosEspeciales as unknown as PermisoUsuario[] || []).forEach(pe => {
        if (pe.permisos?.codigo) {
          if (pe.es_denegado) {
            permisosFinal.delete(pe.permisos.codigo);
          } else {
            permisosFinal.add(pe.permisos.codigo);
          }
        }
      });

      setPermisosUsuario(permisosFinal);
    } catch (error) {
      console.error('Error fetching permisos:', error);
      setPermisosUsuario(new Set());
    } finally {
      setLoading(false);
    }
  }, [user, userRole]);

  useEffect(() => {
    fetchPermisos();
  }, [fetchPermisos]);

  const tienePermiso = useCallback((codigoPermiso: string): boolean => {
    if (!user) return false;
    if (userRole === 'admin') return true;
    return permisosUsuario.has(codigoPermiso);
  }, [user, userRole, permisosUsuario]);

  const tieneAlgunPermiso = useCallback((codigosPermisos: string[]): boolean => {
    if (!user) return false;
    if (userRole === 'admin') return true;
    return codigosPermisos.some(codigo => permisosUsuario.has(codigo));
  }, [user, userRole, permisosUsuario]);

  const tieneTodosPermisos = useCallback((codigosPermisos: string[]): boolean => {
    if (!user) return false;
    if (userRole === 'admin') return true;
    return codigosPermisos.every(codigo => permisosUsuario.has(codigo));
  }, [user, userRole, permisosUsuario]);

  return {
    permisosUsuario,
    loading,
    tienePermiso,
    tieneAlgunPermiso,
    tieneTodosPermisos,
    refetch: fetchPermisos
  };
}

// Mapeo de rutas a códigos de permisos
export const RUTAS_PERMISOS: Record<string, string> = {
  // Mostrador
  '/mostrador/clientes': 'ver_clientes',
  '/mostrador/repuestos': 'ver_repuestos',
  '/mostrador/consulta-precios': 'ver_precios',
  '/mostrador/incidentes': 'ver_incidentes',
  '/mostrador/herramientas-manuales': 'ver_herramientas_manuales',
  '/mostrador/entrega-maquinas': 'ver_entregas',
  // Logística
  '/logistica/clientes': 'ver_clientes',
  '/logistica/embarques': 'ver_embarques',
  '/logistica/garantias-manuales': 'ver_garantias_manuales',
  '/logistica/guias': 'ver_guias',
  '/logistica/ingreso-maquinas': 'ver_ingresos_log',
  '/logistica/salida-maquinas': 'ver_salidas_log',
  '/logistica/faltante-accesorios': 'ver_faltantes_acc',
  '/logistica/maquinas-nuevas-rt': 'ver_maquinas_rt',
  '/logistica/danos-transporte': 'ver_danos_transporte',
  '/logistica/consulta-precios': 'ver_precios',
  '/logistica/consulta-ubicaciones': 'ver_ubicaciones',
  // Taller
  '/taller/asignaciones': 'ver_asignaciones',
  '/taller/mis-asignaciones': 'ver_mis_asignaciones',
  '/taller/busqueda-incidentes': 'ver_incidentes',
  '/taller/pendientes-repuestos': 'ver_pendientes_rep',
  '/taller/asignacion-tecnicos': 'asignar_tecnicos',
  '/taller/configuracion-colas': 'config_colas',
  '/taller/reasignaciones': 'reasignar_incidentes',
  '/taller/transferencias': 'transferir_maquinas',
  // Bodega
  '/bodega/inventario': 'ver_inventario',
  '/bodega/reubicacion-repuestos': 'reubicar_repuestos',
  '/bodega/relaciones-repuestos': 'ver_relaciones_rep',
  '/bodega/inventario-ciclico': 'ver_inv_ciclico',
  '/bodega/consulta-cardex': 'ver_cardex',
  '/bodega/ubicaciones': 'gestionar_ubicaciones',
  '/bodega/documentos-pendientes': 'ver_docs_pendientes',
  '/bodega/documentos-ubicacion': 'ver_docs_ubicacion',
  '/bodega/ingresos-inventario': 'ingresar_inventario',
  '/bodega/salidas-inventario': 'salir_inventario',
  '/bodega/despieces': 'ver_despieces',
  '/bodega/solicitudes': 'ver_solicitudes',
  '/bodega/despachos': 'ver_despachos',
  '/bodega/importacion': 'importar_productos',
  '/bodega/analisis-abc-xyz': 'ver_analisis_abc',
  // SAC
  '/sac/incidentes': 'ver_incidentes_sac',
  '/sac/consulta-existencias': 'ver_existencias',
  // Calidad
  '/calidad': 'ver_calidad',
  '/calidad/reincidencias': 'ver_reincidencias',
  '/calidad/auditorias': 'ver_auditorias',
  '/calidad/defectos': 'ver_defectos',
  // Admin - siempre requiere rol admin
  '/admin/usuarios': 'admin_usuarios',
  '/admin/productos': 'admin_productos',
  '/admin/familias-productos': 'admin_familias',
  '/admin/fallas-causas': 'admin_fallas',
  '/admin/sustitutos-repuestos': 'admin_sustitutos',
  '/admin/importar-despieces': 'admin_despieces',
  '/admin/inventario': 'admin_inventario',
  '/admin/centros-servicio': 'admin_centros',
  '/admin/recomendaciones-familias': 'admin_recomendaciones',
  '/admin/permisos': 'admin_permisos',
  '/admin/audit-logs': 'admin_auditoria',
  // Gerencia
  '/gerencia/dashboard': 'ver_dashboard_gerencia',
  '/gerencia/regional': 'ver_dashboard_regional',
  '/gerencia/aprobaciones-garantia': 'aprobar_garantias',
  // Supervisores
  '/taller/dashboard-jefe': 'ver_dashboard_taller',
  '/logistica/dashboard-jefe': 'ver_dashboard_logistica',
  '/bodega/dashboard-jefe': 'ver_dashboard_bodega',
  '/bodega/dashboard-supervisor': 'ver_dashboard_bodega',
  '/calidad/dashboard-supervisor': 'ver_dashboard_calidad',
  '/sac/dashboard-supervisor': 'ver_dashboard_sac',
};

// Mapeo de menús a permisos necesarios
export const MENU_PERMISOS: Record<string, string[]> = {
  mostrador: ['ver_clientes', 'ver_repuestos', 'ver_precios', 'ver_incidentes', 'ver_herramientas_manuales', 'ver_entregas'],
  logistica: ['ver_embarques', 'ver_garantias_manuales', 'ver_guias', 'ver_ingresos_log', 'ver_salidas_log', 'ver_faltantes_acc', 'ver_maquinas_rt', 'ver_danos_transporte'],
  taller: ['ver_asignaciones', 'ver_mis_asignaciones', 'ver_incidentes'],
  jefeTaller: ['ver_pendientes_rep', 'asignar_tecnicos', 'config_colas', 'reasignar_incidentes', 'transferir_maquinas'],
  bodega: ['ver_inventario', 'reubicar_repuestos', 'ver_inv_ciclico', 'ver_cardex', 'gestionar_ubicaciones', 'ver_docs_pendientes', 'ingresar_inventario', 'salir_inventario', 'ver_despieces', 'ver_solicitudes', 'ver_despachos', 'importar_productos', 'ver_analisis_abc'],
  sac: ['ver_incidentes_sac', 'ver_existencias'],
  calidad: ['ver_calidad', 'ver_reincidencias', 'ver_auditorias', 'ver_defectos'],
  gerencia: ['ver_dashboard_gerencia', 'ver_dashboard_regional', 'aprobar_garantias'],
  supervisores: ['ver_dashboard_sac', 'ver_dashboard_taller', 'ver_dashboard_logistica', 'ver_dashboard_bodega', 'ver_dashboard_calidad'],
};
