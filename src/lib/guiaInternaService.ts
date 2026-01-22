/**
 * Servicio para generación automática de guías INTERNAS de envío
 * Se ejecuta cuando un incidente pasa a estado final y tiene quiere_envio = true
 * 
 * Estados finales que generan guía:
 * - REPARADO
 * - RECHAZADO  
 * - CAMBIO_POR_GARANTIA
 */

import { supabase } from "@/integrations/supabase/client";

interface GenerarGuiaInternaResult {
  success: boolean;
  guiaId?: number;
  numeroGuia?: string;
  error?: string;
}

/**
 * Genera un número de guía interno con formato HPC-XXXXXXXX
 */
async function generarNumeroGuiaInterno(): Promise<string> {
  // Obtener el máximo número actual
  const { data, error } = await supabase
    .from("guias")
    .select("numero_guia")
    .like("numero_guia", "HPC-%")
    .order("id", { ascending: false })
    .limit(1);

  let nextNumber = 1;
  if (!error && data && data.length > 0 && data[0].numero_guia) {
    const match = data[0].numero_guia.match(/HPC-(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  return `HPC-${String(nextNumber).padStart(8, "0")}`;
}

/**
 * Genera automáticamente una guía interna de envío para un incidente
 * y actualiza el estado a EN_ENTREGA
 */
export async function generarGuiaInterna(incidenteId: number): Promise<GenerarGuiaInternaResult> {
  try {
    console.log("🚚 Iniciando generación de guía INTERNA para incidente:", incidenteId);

    // 1. Obtener datos del incidente con cliente y dirección
    const { data: incidente, error: incidenteError } = await supabase
      .from("incidentes")
      .select(`
        id,
        codigo,
        quiere_envio,
        estado,
        direccion_entrega_id,
        centro_de_servicio_id,
        cliente_id,
        clientes:cliente_id (
          id,
          codigo,
          nombre,
          direccion,
          celular,
          telefono_principal,
          municipio,
          departamento
        )
      `)
      .eq("id", incidenteId)
      .single();

    if (incidenteError || !incidente) {
      throw new Error(`No se pudo obtener el incidente: ${incidenteError?.message}`);
    }

    // 2. Validar que quiere envío
    if (!incidente.quiere_envio) {
      console.log("ℹ️ El incidente no requiere envío, omitiendo generación de guía");
      return { success: false, error: "El incidente no requiere envío" };
    }

    // 3. Verificar que no tenga ya una guía
    const { data: guiaExistente } = await supabase
      .from("guias")
      .select("id, numero_guia")
      .eq("incidente_id", incidenteId)
      .limit(1);

    if (guiaExistente && guiaExistente.length > 0) {
      console.log("ℹ️ El incidente ya tiene una guía:", guiaExistente[0].numero_guia);
      return { 
        success: true, 
        guiaId: guiaExistente[0].id, 
        numeroGuia: guiaExistente[0].numero_guia || undefined 
      };
    }

    const cliente = incidente.clientes as any;
    if (!cliente) {
      throw new Error("No se encontró el cliente asociado al incidente");
    }

    // 4. Obtener dirección de entrega específica o usar la del cliente
    let direccionEnvio = cliente.direccion || "";

    if (incidente.direccion_entrega_id) {
      const { data: direccion } = await supabase
        .from("direcciones")
        .select("direccion")
        .eq("id", incidente.direccion_entrega_id)
        .single();

      if (direccion?.direccion) {
        direccionEnvio = direccion.direccion;
      }
    }

    // 5. Obtener datos del centro de servicio (remitente)
    const { data: centroServicio } = await supabase
      .from("centros_de_servicio")
      .select("id, nombre, direccion, telefono")
      .eq("id", incidente.centro_de_servicio_id)
      .single();

    // 6. Generar número de guía interno
    const numeroGuia = await generarNumeroGuiaInterno();

    // 7. Construir datos de la guía
    const ciudadDestino = `${cliente.municipio || ""}, ${cliente.departamento || "Guatemala"}`.trim().replace(/^,\s*/, "");
    
    const guiaData = {
      incidente_id: incidenteId,
      incidentes_codigos: [incidente.codigo] as any,
      centro_de_servicio_origen_id: incidente.centro_de_servicio_id,
      tipo: "ENTREGA" as const,  // Enum válido: RECOLECTA, TRASLADO, ENTREGA
      estado: "PENDIENTE" as const,  // Enum válido: PENDIENTE, CREADA, EN_TRANSITO, ENTREGADA, CANCELADA
      numero_guia: numeroGuia,
      tracking_number: numeroGuia, // Usamos el mismo número como tracking
      fecha_guia: new Date().toISOString(),
      destinatario: cliente.nombre,
      direccion_destinatario: direccionEnvio,
      telefono_destinatario: cliente.celular || cliente.telefono_principal || null,
      ciudad_destino: ciudadDestino,
      referencia_1: incidente.codigo,
      referencia_2: cliente.codigo,
      remitente: centroServicio?.nombre || "HPC Centro de Servicio",
      direccion_remitente: centroServicio?.direccion || "42A Av 9-16 Zona 5",
      cantidad_piezas: 1,
      peso: 5, // Peso default
      tarifa: 0,
      // Campos de Zigo vacíos (no usamos Zigo)
      zigo_guia_id: null,
      zigo_guia_status: "interno",
      zigo_request_payload: { sistema: "interno", generado_automaticamente: true } as any,
      zigo_response_data: null,
    };

    console.log("📦 Datos de la guía interna:", guiaData);

    // 8. Insertar guía en la base de datos
    const { data: guiaCreada, error: guiaError } = await (supabase as any)
      .from("guias")
      .insert(guiaData)
      .select()
      .single();

    if (guiaError) {
      console.error("❌ Error guardando guía en BD:", guiaError);
      throw new Error(`Error al guardar guía: ${guiaError.message}`);
    }

    console.log("✅ Guía interna guardada en BD:", guiaCreada);

    // 9. Actualizar el incidente a EN_ENTREGA
    const { error: updateError } = await supabase
      .from("incidentes")
      .update({ estado: "EN_ENTREGA" as any })
      .eq("id", incidenteId);

    if (updateError) {
      console.warn("⚠️ Guía creada pero error actualizando estado:", updateError);
    } else {
      console.log("✅ Estado del incidente actualizado a EN_ENTREGA");
    }

    return {
      success: true,
      guiaId: guiaCreada.id,
      numeroGuia: guiaCreada.numero_guia,
    };
  } catch (error: any) {
    console.error("❌ Error en generación de guía interna:", error);
    return {
      success: false,
      error: error.message || "Error desconocido",
    };
  }
}

/**
 * Verifica si un incidente tiene guía de envío asociada
 */
export async function tieneGuiaEnvio(incidenteId: number): Promise<boolean> {
  const { data, error } = await supabase
    .from("guias")
    .select("id")
    .eq("incidente_id", incidenteId)
    .limit(1);

  return !error && data && data.length > 0;
}
