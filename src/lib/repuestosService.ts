import { supabase } from "@/integrations/supabase/client";

export interface AlternativaRepuesto {
  codigo_encontrado: string;
  descripcion: string;
  stock_disponible: number;
  ubicacion: string;
  tipo_coincidencia: 'solicitado' | 'padre' | 'hermano' | 'equivalente';
  prioridad: number;
}

export interface CodigoPadreResult {
  codigoPadre: string | null;
  descripcionPadre: string | null;
}

/**
 * Obtiene el código padre de un repuesto desde la tabla repuestos_relaciones
 * Si el código es un "Hijo", devuelve su "Padre"
 */
export async function obtenerCodigoPadre(codigoHijo: string): Promise<CodigoPadreResult> {
  try {
    const { data, error } = await supabase
      .from('repuestos_relaciones')
      .select('Padre, "Descripción"')
      .eq('Hijo', codigoHijo)
      .maybeSingle();

    if (error) {
      console.error('Error al buscar código padre:', error);
      return { codigoPadre: null, descripcionPadre: null };
    }

    if (data && data.Padre) {
      return {
        codigoPadre: data.Padre,
        descripcionPadre: data.Descripción || null
      };
    }

    return { codigoPadre: null, descripcionPadre: null };
  } catch (error) {
    console.error('Error:', error);
    return { codigoPadre: null, descripcionPadre: null };
  }
}

/**
 * Busca alternativas disponibles para un repuesto solicitado
 * Jerarquía de búsqueda: solicitado -> padre -> hermanos -> equivalentes
 */
export async function buscarAlternativaDisponible(
  codigoSolicitado: string,
  centroServicioId: string
): Promise<AlternativaRepuesto | null> {
  const { data, error } = await supabase.rpc('buscar_repuesto_disponible', {
    p_codigo_solicitado: codigoSolicitado,
    p_centro_servicio_id: centroServicioId
  });

  if (error) {
    console.error('Error al buscar alternativa:', error);
    return null;
  }

  if (data && data.length > 0) {
    return data[0] as AlternativaRepuesto;
  }

  return null;
}

/**
 * Obtiene la ubicación física de un repuesto (hereda del padre si es hijo)
 */
export async function obtenerUbicacionRepuesto(
  codigoRepuesto: string,
  centroServicioId: string
): Promise<string | null> {
  // Primero obtener info del repuesto
  const { data: repuesto } = await supabase
    .from('repuestos')
    .select('codigo, codigo_padre')
    .eq('codigo', codigoRepuesto)
    .maybeSingle();

  if (!repuesto) return null;

  // Si tiene padre, obtener ubicación del padre
  const codigoParaUbicacion = repuesto.codigo_padre || repuesto.codigo;

  const { data: stock } = await supabase
    .from('stock_departamental')
    .select('ubicacion')
    .eq('codigo_repuesto', codigoParaUbicacion)
    .eq('centro_servicio_id', centroServicioId)
    .maybeSingle();

  return stock?.ubicacion || null;
}

/**
 * Obtiene todos los hijos de un código padre
 */
export async function obtenerHijosRepuesto(codigoPadre: string) {
  const { data, error } = await supabase
    .from('repuestos')
    .select('codigo, descripcion, prefijo_clasificacion')
    .eq('codigo_padre', codigoPadre)
    .order('codigo');

  if (error) {
    console.error('Error al obtener hijos:', error);
    return [];
  }

  return data || [];
}

/**
 * Verifica si un repuesto tiene alternativas (padre, hermanos o equivalentes)
 */
export async function tieneAlternativas(codigoRepuesto: string): Promise<boolean> {
  // Verificar si tiene padre en la tabla de relaciones
  const { data: relacion } = await supabase
    .from('repuestos_relaciones')
    .select('id')
    .eq('Hijo', codigoRepuesto)
    .limit(1);

  if (relacion && relacion.length > 0) return true;

  // Verificar si tiene hijos (es un padre)
  const { data: hijos } = await supabase
    .from('repuestos_relaciones')
    .select('id')
    .eq('Padre', codigoRepuesto)
    .limit(1);

  return (hijos?.length || 0) > 0;
}

/**
 * Registra una sustitución en el historial de movimientos
 */
export async function registrarSustitucion(
  codigoSolicitado: string,
  codigoDespachado: string,
  cantidadDespachada: number,
  centroServicioId: string,
  userId: string,
  tipoSustitucion: string
) {
  await supabase.from('movimientos_inventario').insert({
    codigo_repuesto: codigoDespachado,
    tipo_movimiento: 'salida',
    cantidad: cantidadDespachada,
    centro_servicio_id: centroServicioId,
    created_by: userId,
    motivo: `Despacho de ${codigoDespachado} (solicitado: ${codigoSolicitado}, tipo: ${tipoSustitucion})`
  });
}
