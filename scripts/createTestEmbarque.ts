import { supabase } from "@/integrations/supabase/client";

async function createTestEmbarque() {
  try {
    // Productos disponibles
    const productos = ['16441', '15679', '12909', '12908', '12671', '14013'];
    
    // Clientes disponibles
    const clientes = ['HPCN001930', 'HPCN001933', 'HPC-000001', 'HPC009166', 'HPC000019', 'HPC011470'];

    // 1. Crear embarque
    const { data: embarque, error: embarqueError } = await supabase
      .from('embarques')
      .insert({
        numero_embarque: 'EMB-2024-001',
        transportista: 'Transportes Guatemala Express',
        notas: 'Embarque de prueba con máquinas desde zonas'
      })
      .select()
      .single();

    if (embarqueError) throw embarqueError;
    console.log('Embarque creado:', embarque);

    // 2. Generar códigos de incidente
    const { data: lastIncidente } = await supabase
      .from('incidentes')
      .select('codigo')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let nextNumber = 1;
    if (lastIncidente?.codigo) {
      const match = lastIncidente.codigo.match(/INC-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    // 3. Crear 6 incidentes ficticios
    const incidentes = [];
    for (let i = 0; i < 6; i++) {
      const codigo = `INC-${String(nextNumber + i).padStart(6, '0')}`;
      const incidente = {
        codigo,
        codigo_producto: productos[i],
        codigo_cliente: clientes[i],
        descripcion_problema: `Máquina requiere revisión general - Ingreso vía logística`,
        status: 'En ruta' as const,
        cobertura_garantia: Math.random() > 0.5,
        ingresado_en_mostrador: false,
        embarque_id: embarque.id,
        sku_maquina: `SKU-${productos[i]}-${Math.floor(Math.random() * 1000)}`,
        fecha_ingreso: new Date().toISOString()
      };
      incidentes.push(incidente);
    }

    const { data: incidentesCreados, error: incidentesError } = await supabase
      .from('incidentes')
      .insert(incidentes)
      .select();

    if (incidentesError) throw incidentesError;
    
    console.log('✅ Embarque creado con éxito:', embarque.numero_embarque);
    console.log('✅ Incidentes creados:', incidentesCreados?.length);
    console.log('Códigos:', incidentesCreados?.map(inc => inc.codigo).join(', '));

    return { embarque, incidentes: incidentesCreados };
  } catch (error) {
    console.error('❌ Error al crear embarque de prueba:', error);
    throw error;
  }
}

// Ejecutar en consola del navegador:
// import('./scripts/createTestEmbarque').then(m => m.default())
export default createTestEmbarque;
