import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';

interface RelacionPadreHijo {
  codigoHijo: string;
  codigoPadre: string;
  descripcion: string;
}

export async function importSustitutos(): Promise<{ success: boolean; message: string; stats?: { total: number; actualizados: number; errores: number } }> {
  try {
    // Fetch the Excel file
    const response = await fetch('/temp/SUSTITUTOS.xlsx');
    const arrayBuffer = await response.arrayBuffer();
    
    // Parse Excel
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON with header row
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    
    const relaciones: RelacionPadreHijo[] = [];
    const padresUnicos = new Set<string>();
    
    // Process rows (skip header rows)
    for (let i = 2; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;
      
      // First set of columns (9 to 9): columns 0, 1, 2
      const hijo1 = row[0]?.toString().trim();
      const desc1 = row[1]?.toString().trim();
      const padre1 = row[2]?.toString().trim();
      
      if (hijo1 && padre1) {
        relaciones.push({
          codigoHijo: hijo1,
          codigoPadre: padre1,
          descripcion: desc1 || ''
        });
        padresUnicos.add(padre1);
      }
      
      // Second set of columns (9 to 1): columns 4, 5, 6
      const hijo2 = row[4]?.toString().trim();
      const desc2 = row[5]?.toString().trim();
      const padre2 = row[6]?.toString().trim();
      
      if (hijo2 && padre2) {
        relaciones.push({
          codigoHijo: hijo2,
          codigoPadre: padre2,
          descripcion: desc2 || ''
        });
        padresUnicos.add(padre2);
      }
    }
    
    console.log(`Relaciones encontradas: ${relaciones.length}`);
    console.log(`Códigos padre únicos: ${padresUnicos.size}`);
    
    let actualizados = 0;
    let errores = 0;
    
    // Update child records with their parent code
    for (const rel of relaciones) {
      const { error } = await supabase
        .from('repuestos')
        .update({ 
          codigo_padre: rel.codigoPadre,
          es_codigo_padre: false
        })
        .eq('codigo', rel.codigoHijo);
      
      if (error) {
        console.warn(`Error actualizando hijo ${rel.codigoHijo}:`, error.message);
        errores++;
      } else {
        actualizados++;
      }
    }
    
    // Mark parent codes as es_codigo_padre = true
    for (const codigoPadre of padresUnicos) {
      const { error } = await supabase
        .from('repuestos')
        .update({ es_codigo_padre: true })
        .eq('codigo', codigoPadre);
      
      if (error) {
        console.warn(`Error marcando padre ${codigoPadre}:`, error.message);
      }
    }
    
    return {
      success: true,
      message: `Importación completada: ${actualizados} hijos actualizados, ${errores} errores`,
      stats: {
        total: relaciones.length,
        actualizados,
        errores
      }
    };
    
  } catch (error) {
    console.error('Error importando sustitutos:', error);
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`
    };
  }
}

/**
 * Get parent code for a given spare part code
 * Returns the parent code if exists, otherwise returns the same code
 */
export async function getCodigoPadre(codigo: string): Promise<string> {
  const { data } = await supabase
    .from('repuestos')
    .select('codigo_padre')
    .eq('codigo', codigo)
    .maybeSingle();
  
  return data?.codigo_padre || codigo;
}

/**
 * Get all spare parts for a product, showing only parent codes
 * If a part has a parent, return the parent info instead
 */
export async function getRepuestosParaProducto(codigoProducto: string) {
  // Primero obtener el producto_id
  const { data: producto } = await supabase
    .from('productos')
    .select('id')
    .eq('codigo', codigoProducto)
    .maybeSingle();

  if (!producto) return [];

  // Get all repuestos for the product
  const { data: repuestos, error } = await (supabase as any)
    .from('repuestos')
    .select('*')
    .eq('producto_id', producto.id);
  
  if (error || !repuestos) return [];
  
  // Filter to show only parent codes (es_codigo_padre = true or codigo_padre is null)
  const repuestosFiltrados = repuestos.filter(r => 
    r.es_codigo_padre === true || r.codigo_padre === null
  );
  
  return repuestosFiltrados;
}
