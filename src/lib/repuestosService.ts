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
 * Obtiene el código padre de un repuesto
 * Uses the repuestos table with codigo_padre column
 */
export async function obtenerCodigoPadre(codigoHijo: string): Promise<CodigoPadreResult> {
  try {
    const { data: repuesto, error } = await supabase
      .from('repuestos')
      .select('codigo_padre, descripcion')
      .eq('codigo', codigoHijo)
      .maybeSingle();

    if (error || !repuesto || !repuesto.codigo_padre) {
      return { codigoPadre: null, descripcionPadre: null };
    }

    // Get parent description
    const { data: padre } = await supabase
      .from('repuestos')
      .select('descripcion')
      .eq('codigo', repuesto.codigo_padre)
      .maybeSingle();

    return {
      codigoPadre: repuesto.codigo_padre,
      descripcionPadre: padre?.descripcion || null
    };
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
  centroServicioId: number
): Promise<AlternativaRepuesto | null> {
  try {
    // First check if the requested code has stock
    const { data: stockDirecto } = await supabase
      .from('inventario')
      .select('*')
      .eq('codigo_repuesto', codigoSolicitado)
      .eq('centro_servicio_id', centroServicioId)
      .maybeSingle();

    if (stockDirecto && stockDirecto.cantidad > 0) {
      return {
        codigo_encontrado: stockDirecto.codigo_repuesto,
        descripcion: stockDirecto.descripcion || '',
        stock_disponible: stockDirecto.cantidad,
        ubicacion: stockDirecto.ubicacion_legacy || '',
        tipo_coincidencia: 'solicitado',
        prioridad: 1
      };
    }

    // Check for parent code
    const padre = await obtenerCodigoPadre(codigoSolicitado);
    if (padre.codigoPadre) {
      const { data: stockPadre } = await supabase
        .from('inventario')
        .select('*')
        .eq('codigo_repuesto', padre.codigoPadre)
        .eq('centro_servicio_id', centroServicioId)
        .maybeSingle();

      if (stockPadre && stockPadre.cantidad > 0) {
        return {
          codigo_encontrado: stockPadre.codigo_repuesto,
          descripcion: stockPadre.descripcion || padre.descripcionPadre || '',
          stock_disponible: stockPadre.cantidad,
          ubicacion: stockPadre.ubicacion_legacy || '',
          tipo_coincidencia: 'padre',
          prioridad: 2
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Error al buscar alternativa:', error);
    return null;
  }
}

/**
 * Obtiene la ubicación física de un repuesto (hereda del padre si es hijo)
 */
export async function obtenerUbicacionRepuesto(
  codigoRepuesto: string,
  centroServicioId: number
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
    .from('inventario')
    .select('ubicacion_legacy')
    .eq('codigo_repuesto', codigoParaUbicacion)
    .eq('centro_servicio_id', centroServicioId)
    .maybeSingle();

  return stock?.ubicacion_legacy || null;
}

/**
 * Obtiene todos los hijos de un código padre
 */
export async function obtenerHijosRepuesto(codigoPadre: string) {
  const { data, error } = await supabase
    .from('repuestos')
    .select('codigo, descripcion')
    .eq('codigo_padre', codigoPadre)
    .order('codigo');

  if (error) {
    console.error('Error al obtener hijos:', error);
    return [];
  }

  return data || [];
}

/**
 * Verifica si un repuesto tiene alternativas (padre o hijos)
 */
export async function tieneAlternativas(codigoRepuesto: string): Promise<boolean> {
  // Check if has parent
  const { data: repuesto } = await supabase
    .from('repuestos')
    .select('codigo_padre')
    .eq('codigo', codigoRepuesto)
    .maybeSingle();

  if (repuesto?.codigo_padre) return true;

  // Check if is a parent (has children)
  const { data: children } = await supabase
    .from('repuestos')
    .select('id')
    .eq('codigo_padre', codigoRepuesto)
    .limit(1);

  return (children?.length || 0) > 0;
}

/**
 * Registra una sustitución en el historial de movimientos
 */
export async function registrarSustitucion(
  codigoSolicitado: string,
  codigoDespachado: string,
  cantidadDespachada: number,
  centroServicioId: number,
  userId: number,
  tipoSustitucion: string
) {
  // First get the repuesto_id
  const { data: repuesto } = await supabase
    .from('repuestos')
    .select('id')
    .eq('codigo', codigoDespachado)
    .maybeSingle();

  if (!repuesto) {
    console.error('Repuesto not found:', codigoDespachado);
    return;
  }

  // Get current stock
  const { data: stock } = await supabase
    .from('inventario')
    .select('cantidad')
    .eq('codigo_repuesto', codigoDespachado)
    .eq('centro_servicio_id', centroServicioId)
    .maybeSingle();

  const stockAnterior = stock?.cantidad || 0;
  const stockNuevo = stockAnterior - cantidadDespachada;

  await supabase.from('movimientos_inventario').insert({
    repuesto_id: repuesto.id,
    tipo_movimiento: 'SALIDA',
    cantidad: cantidadDespachada,
    centro_servicio_id: centroServicioId,
    created_by_id: userId,
    stock_anterior: stockAnterior,
    stock_nuevo: stockNuevo,
    motivo: `Despacho de ${codigoDespachado} (solicitado: ${codigoSolicitado}, tipo: ${tipoSustitucion})`
  });
}
