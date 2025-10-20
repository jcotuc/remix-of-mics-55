import { supabase } from "@/integrations/supabase/client";

export async function updateClientCodesHPCtoHPS() {
  try {
    // Obtener todos los clientes con código HPC
    const { data: clientes, error: fetchError } = await supabase
      .from('clientes')
      .select('id, codigo')
      .like('codigo', 'HPC-%');

    if (fetchError) throw fetchError;

    if (!clientes || clientes.length === 0) {
      console.log('No se encontraron clientes con código HPC');
      return { success: true, updated: 0 };
    }

    // Actualizar cada cliente
    let updated = 0;
    for (const cliente of clientes) {
      const newCodigo = cliente.codigo.replace('HPC-', 'HPS-');
      
      const { error: updateError } = await supabase
        .from('clientes')
        .update({ codigo: newCodigo })
        .eq('id', cliente.id);

      if (!updateError) {
        updated++;
        console.log(`Actualizado: ${cliente.codigo} → ${newCodigo}`);
      } else {
        console.error(`Error actualizando ${cliente.codigo}:`, updateError);
      }
    }

    return { success: true, updated };
  } catch (error) {
    console.error('Error en actualización de códigos:', error);
    return { success: false, error };
  }
}
