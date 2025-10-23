import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as XLSX from 'xlsx';

export async function importRepuestosZona5() {
  try {
    // Primero verificar/crear el centro de servicio Zona 5
    let { data: centroData, error: centroError } = await supabase
      .from('centros_servicio')
      .select('id')
      .eq('codigo', 'ZONA5')
      .single();

    let centroId: string;

    if (centroError || !centroData) {
      // Crear el centro de servicio
      const { data: newCentro, error: createError } = await supabase
        .from('centros_servicio')
        .insert({
          codigo: 'ZONA5',
          nombre: 'ZONA 5',
          es_central: true,
          activo: true,
          direccion: 'Guatemala, Zona 5',
        })
        .select('id')
        .single();

      if (createError) throw createError;
      centroId = newCentro.id;
      console.log('Centro de servicio ZONA 5 creado');
    } else {
      centroId = centroData.id;
      console.log('Centro de servicio ZONA 5 encontrado');
    }

    // Leer el archivo Excel
    const response = await fetch('/temp/Repuestos_bodega_zona_5.xlsx');
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

    console.log(`Total de registros a procesar: ${jsonData.length}`);

    // Procesar los datos en lotes
    const batchSize = 100;
    let processedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < jsonData.length; i += batchSize) {
      const batch = jsonData.slice(i, i + batchSize);
      
      // Preparar datos para stock_departamental
      const stockData = batch.map(row => ({
        centro_servicio_id: centroId,
        codigo_repuesto: String(row.sku || ''),
        ubicacion: String(row['Ubicación'] || row['ubicacion'] || '').toUpperCase(),
        cantidad_actual: parseInt(String(row.cantidad || 0)),
        stock_minimo: 0,
        stock_maximo: 0,
      })).filter(item => item.codigo_repuesto); // Solo procesar si tiene SKU

      // Insertar/actualizar stock departamental
      if (stockData.length > 0) {
        const { error: stockError } = await supabase
          .from('stock_departamental')
          .upsert(stockData, {
            onConflict: 'centro_servicio_id,codigo_repuesto',
            ignoreDuplicates: false,
          });

        if (stockError) {
          console.error('Error insertando stock:', stockError);
          errorCount += stockData.length;
        } else {
          processedCount += stockData.length;
        }
      }

      // Registrar ubicaciones históricas
      const ubicacionesData = batch.map(row => ({
        codigo_repuesto: String(row.sku || ''),
        ubicacion: String(row['Ubicación'] || row['ubicacion'] || '').toUpperCase(),
        centro_servicio_id: centroId,
        cantidad_asignada: parseInt(String(row.cantidad || 0)),
      })).filter(item => item.codigo_repuesto && item.ubicacion);

      if (ubicacionesData.length > 0) {
        const { error: ubicError } = await supabase
          .from('ubicaciones_historicas')
          .insert(ubicacionesData);

        if (ubicError) {
          console.error('Error insertando ubicaciones históricas:', ubicError);
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
