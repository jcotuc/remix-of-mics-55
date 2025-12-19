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
 * Si el código tiene un Padre, devuelve ese código padre
 */
export async function obtenerCodigoPadre(codigoHijo: string): Promise<CodigoPadreResult> {
  try {
    // First find the record for this code
    const { data: childRecord, error: childError } = await supabase
      .from('repuestos_relaciones')
      .select('*')
      .eq('Código', codigoHijo)
      .maybeSingle();

    if (childError || !childRecord || !childRecord.Padre) {
      return { codigoPadre: null, descripcionPadre: null };
    }

    // Now get the parent record by its ID
    const { data: parentRecord, error: parentError } = await supabase
      .from('repuestos_relaciones')
      .select('*')
      .eq('id', childRecord.Padre)
      .maybeSingle();

    if (parentError || !parentRecord) {
      return { codigoPadre: null, descripcionPadre: null };
    }

    return {
      codigoPadre: parentRecord["Código"] || null,
      descripcionPadre: parentRecord["Descripción"] || null
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
  centroServicioId: string
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
        ubicacion: stockDirecto.ubicacion || '',
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
          ubicacion: stockPadre.ubicacion || '',
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
    .from('inventario')
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
  // Find the record for this code
  const { data: record } = await supabase
    .from('repuestos_relaciones')
    .select('*')
    .eq('Código', codigoRepuesto)
    .maybeSingle();

  if (!record) return false;

  // If it has a parent, it has alternatives (siblings via parent)
  if (record.Padre) return true;

  // Check if it's a parent (has children)
  const { data: children } = await supabase
    .from('repuestos_relaciones')
    .select('id')
    .eq('Padre', record.id)
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
