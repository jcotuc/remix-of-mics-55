import { supabase } from "@/integrations/supabase/client";
import * as XLSX from 'xlsx';

export async function importRepuestosZona5() {
  try {
    // Obtener el centro de servicio Zona 5
    const { data: centroData, error: centroError } = await supabase
      .from('centros_servicio')
      .select('id')
      .eq('nombre', 'ZONA5')
      .maybeSingle();

    if (centroError) throw centroError;
    if (!centroData) {
      throw new Error('Centro de servicio ZONA5 no encontrado. Contacte al administrador.');
    }

    const centroId = centroData.id;
    console.log('Centro de servicio ZONA 5 encontrado:', centroId);

    // Leer el archivo Excel
    const response = await fetch('/temp/Repuestos_bodega_zona_5.xlsx');
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

    console.log(`Total de registros a procesar: ${jsonData.length}`);

    // Primero, crear los repuestos que no existen
    const repuestosUnicos = new Map();
    jsonData.forEach(row => {
      const sku = String(row.sku || '');
      const descripcion = String(row['descripción'] || row['descripcion'] || '');
      if (sku && !repuestosUnicos.has(sku)) {
        repuestosUnicos.set(sku, {
          numero: '1',
          codigo: sku,
          clave: sku,
          descripcion: descripcion,
          codigo_producto: 'GENERAL',
          disponible_mostrador: false,
        });
      }
    });

    console.log(`Repuestos únicos encontrados: ${repuestosUnicos.size}`);

    // Insertar repuestos (ignorar duplicados)
    if (repuestosUnicos.size > 0) {
      const repuestosArray = Array.from(repuestosUnicos.values());
      const { error: repuestosError } = await supabase
        .from('repuestos')
        .upsert(repuestosArray, {
          onConflict: 'codigo',
          ignoreDuplicates: false,
        });

      if (repuestosError) {
        console.error('Error insertando repuestos:', repuestosError);
      } else {
        console.log('Repuestos creados/actualizados exitosamente');
      }
    }

    // Procesar los datos en lotes para inventario
    const batchSize = 100;
    let processedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < jsonData.length; i += batchSize) {
      const batch = jsonData.slice(i, i + batchSize);
      
      // Preparar datos para inventario
      const inventarioData = batch.map(row => ({
        centro_servicio_id: centroId,
        codigo_repuesto: String(row.sku || ''),
        ubicacion: String(row['Ubicación'] || row['ubicacion'] || '').toUpperCase(),
        cantidad: parseInt(String(row.cantidad || 0)),
        descripcion: String(row['descripción'] || row['descripcion'] || ''),
      })).filter(item => item.codigo_repuesto);

      // Insertar/actualizar inventario
      if (inventarioData.length > 0) {
        const { error: invError } = await supabase
          .from('inventario')
          .upsert(inventarioData, {
            onConflict: 'centro_servicio_id,codigo_repuesto',
            ignoreDuplicates: false,
          });

        if (invError) {
          console.error('Error insertando inventario:', invError);
          errorCount += inventarioData.length;
        } else {
          processedCount += inventarioData.length;
        }
      }

      console.log(`Procesado lote ${Math.floor(i / batchSize) + 1}/${Math.ceil(jsonData.length / batchSize)}`);
    }

    return {
      success: true,
      processedCount,
      errorCount,
      totalCount: jsonData.length,
    };

  } catch (error: any) {
    console.error('Error en importación:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}
