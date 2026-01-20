import { supabase } from "@/integrations/supabase/client";

export async function limpiarClavesDuplicadas() {
  try {
    // Obtener productos donde clave = codigo
    const { data: productos, error: fetchError } = await supabase
      .from('productos')
      .select('id, codigo, clave')
      .filter('clave', 'not.is', null);

    if (fetchError) throw fetchError;

    // Filtrar los que tienen clave = codigo
    const productosConClaveDuplicada = productos?.filter(p => p.clave === p.codigo) || [];
    
    console.log(`Encontrados ${productosConClaveDuplicada.length} productos con clave duplicada`);

    if (productosConClaveDuplicada.length === 0) {
      return { success: true, updated: 0 };
    }

    // Actualizar en lotes de 100
    let updated = 0;
    const batchSize = 100;
    
    for (let i = 0; i < productosConClaveDuplicada.length; i += batchSize) {
      const batch = productosConClaveDuplicada.slice(i, i + batchSize);
      const ids = batch.map(p => p.id);
      
      const { error: updateError } = await supabase
        .from('productos')
        .update({ clave: '' })
        .in('id', ids);

      if (updateError) {
        console.error(`Error en lote ${i / batchSize + 1}:`, updateError);
      } else {
        updated += batch.length;
        console.log(`Actualizados ${updated}/${productosConClaveDuplicada.length}`);
      }
    }

    return { success: true, updated };
  } catch (error) {
    console.error('Error limpiando claves duplicadas:', error);
    return { success: false, error };
  }
}

// Para ejecutar manualmente
limpiarClavesDuplicadas().then(result => {
  console.log('Resultado:', result);
});
