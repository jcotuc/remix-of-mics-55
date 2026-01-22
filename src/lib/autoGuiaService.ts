/**
 * Servicio para generación automática de guías de envío
 * Se ejecuta cuando un incidente pasa a REPARADO y tiene quiere_envio = true
 */

import { supabase } from "@/integrations/supabase/client";

interface GuiaAutoData {
  incidenteId: number;
  incidenteCodigo: string;
  clienteCodigo: string;
  destinatario: string;
  direccionDestinatario: string;
  telefonoDestinatario: string;
  ciudadDestino: string;
  centroServicioId: number;
}

interface GenerarGuiaResult {
  success: boolean;
  guiaId?: number;
  numeroGuia?: string;
  error?: string;
}

/**
 * Genera automáticamente una guía de envío para un incidente reparado
 */
export async function generarGuiaAutomatica(incidenteId: number): Promise<GenerarGuiaResult> {
  try {
    console.log("🚚 Iniciando generación automática de guía para incidente:", incidenteId);

    // 1. Obtener datos del incidente con cliente y dirección
    const { data: incidente, error: incidenteError } = await supabase
      .from("incidentes")
      .select(`
        id,
        codigo,
        quiere_envio,
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

    const cliente = incidente.clientes as any;
    if (!cliente) {
      throw new Error("No se encontró el cliente asociado al incidente");
    }

    // 3. Obtener dirección de entrega específica o usar la del cliente
    let direccionEnvio = cliente.direccion || "";
    let nombreContacto = cliente.nombre;

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

    // 4. Obtener datos del centro de servicio (remitente)
    const { data: centroServicio } = await supabase
      .from("centros_de_servicio")
      .select("id, nombre, direccion, telefono")
      .eq("id", incidente.centro_de_servicio_id)
      .single();

    // 5. Construir payload para Zigo
    const guiaData = {
      destinatario: cliente.nombre,
      direccion_destinatario: direccionEnvio,
      telefono_destinatario: cliente.celular || cliente.telefono_principal || "+50200000000",
      ciudad_destino: `${cliente.municipio || ""}, ${cliente.departamento || "Guatemala"}`.trim().replace(/^,\s*/, ""),
      referencia_1: incidente.codigo,
      referencia_2: cliente.codigo,
      remitente: centroServicio?.nombre || "HPC Centro de Servicio",
      direccion_remitente: centroServicio?.direccion || "42A Av 9-16 Zona 5",
      cantidad_piezas: 1,
      peso: 5, // Peso default
      tarifa: 0,
    };

    console.log("📦 Datos de la guía:", guiaData);

    // 6. Llamar al edge function para crear la guía en Zigo
    const { data: zigoResponse, error: zigoError } = await supabase.functions.invoke(
      "zigo-create-guide",
      {
        body: { guiaData },
      }
    );

    if (zigoError) {
      throw new Error(`Error al llamar a Zigo: ${zigoError.message}`);
    }

    if (!zigoResponse?.success) {
      throw new Error(zigoResponse?.error || "Error desconocido al crear guía en Zigo");
    }

    console.log("✅ Respuesta de Zigo:", zigoResponse);

    // 7. Guardar la guía en la base de datos
    const guiaInsertData = {
      incidente_id: incidenteId,
      incidentes_codigos: [incidente.codigo] as any,
      centro_de_servicio_origen_id: incidente.centro_de_servicio_id,
      tipo: "SALIDA" as const,
      estado: "PENDIENTE" as const,
      destinatario: cliente.nombre,
      direccion_destinatario: direccionEnvio,
      telefono_destinatario: cliente.celular || cliente.telefono_principal,
      ciudad_destino: guiaData.ciudad_destino,
      referencia_1: incidente.codigo,
      referencia_2: cliente.codigo,
      remitente: guiaData.remitente,
      direccion_remitente: guiaData.direccion_remitente,
      cantidad_piezas: 1,
      peso: 5,
      zigo_guia_id: zigoResponse.zigoGuide?.data?.id?.toString() || null,
      zigo_guia_status: zigoResponse.zigoGuide?.data?.status || "created",
      zigo_request_payload: guiaData as any,
      zigo_response_data: zigoResponse.zigoGuide || null,
      numero_guia: zigoResponse.zigoGuide?.data?.guia || null,
      tracking_number: zigoResponse.zigoGuide?.data?.tracking || null,
    };

    const { data: guiaCreada, error: guiaError } = await (supabase as any)
      .from("guias")
      .insert(guiaInsertData)
      .select()
      .single();

    if (guiaError) {
      console.error("❌ Error guardando guía en BD:", guiaError);
      throw new Error(`Error al guardar guía: ${guiaError.message}`);
    }

    console.log("✅ Guía guardada en BD:", guiaCreada);

    // 8. Actualizar el incidente a EN_ENTREGA
    await supabase
      .from("incidentes")
      .update({ estado: "EN_ENTREGA" })
      .eq("id", incidenteId);

    return {
      success: true,
      guiaId: guiaCreada.id,
      numeroGuia: guiaCreada.numero_guia || zigoResponse.zigoGuide?.data?.guia,
    };
  } catch (error: any) {
    console.error("❌ Error en generación automática de guía:", error);
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
