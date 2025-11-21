import { supabase } from "@/integrations/supabase/client";

export interface AlternativaRepuesto {
  codigo_encontrado: string;
  descripcion: string;
  stock_disponible: number;
  ubicacion: string;
  tipo_coincidencia: 'solicitado' | 'padre' | 'hermano' | 'equivalente';
  prioridad: number;
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
  // Verificar si tiene padre
  const { data: repuesto } = await supabase
    .from('repuestos')
    .select('codigo_padre')
    .eq('codigo', codigoRepuesto)
    .maybeSingle();

  if (repuesto?.codigo_padre) return true;

  // Verificar si tiene equivalencias
  const { data: equivalencias } = await supabase
    .from('repuestos_relaciones')
    .select('id')
    .eq('codigo_principal', codigoRepuesto)
    .eq('activo', true)
    .limit(1);

  return (equivalencias?.length || 0) > 0;
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
