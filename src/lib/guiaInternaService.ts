/**
 * Servicio para generación automática de guías INTERNAS de envío
 * Se ejecuta cuando un incidente pasa a estado final y tiene quiere_envio = true
 * 
 * Estados finales que generan guía:
 * - REPARADO
 * - RECHAZADO  
 * - CAMBIO_POR_GARANTIA
 */

import { apiBackendAction } from "@/lib/api-backend";

interface GenerarGuiaInternaResult {
  success: boolean;
  guiaId?: number;
  numeroGuia?: string;
  error?: string;
}

/**
 * Genera automáticamente una guía interna de envío para un incidente
 * y actualiza el estado a EN_ENTREGA
 */
export async function generarGuiaInterna(incidenteId: number): Promise<GenerarGuiaInternaResult> {
  try {
    console.log("🚚 Iniciando generación de guía INTERNA para incidente:", incidenteId);

    // 1. Obtener datos del incidente usando apiBackendAction
    const { result: incidente } = await apiBackendAction("incidentes.get", { id: incidenteId });

    if (!incidente) {
      throw new Error(`No se pudo obtener el incidente con ID: ${incidenteId}`);
    }

    // 2. Validar que quiere envío
    if (!incidente.quiere_envio) {
      console.log("ℹ️ El incidente no requiere envío, omitiendo generación de guía");
      return { success: false, error: "El incidente no requiere envío" };
    }

    // 3. Verificar que no tenga ya una guía usando apiBackendAction
    const { results: guiasExistentes } = await apiBackendAction("guias.search", { 
      incidente_id: incidenteId 
    });

    if (guiasExistentes && guiasExistentes.length > 0) {
      const guiaExistente = guiasExistentes[0] as any;
      console.log("ℹ️ El incidente ya tiene una guía:", guiaExistente.numero_guia);
      return { 
        success: true, 
        guiaId: guiaExistente.id, 
        numeroGuia: guiaExistente.numero_guia || undefined 
      };
    }

    const cliente = incidente.cliente as any;
    if (!cliente) {
      throw new Error("No se encontró el cliente asociado al incidente");
    }

    // 4. Obtener dirección de entrega específica o usar la del cliente
    let direccionEnvio = cliente.direccion || "";

    if ((incidente as any).direccion_entrega_id) {
      const { result: direccion } = await apiBackendAction("direcciones.get", { 
        id: (incidente as any).direccion_entrega_id 
      });

      if ((direccion as any)?.direccion) {
        direccionEnvio = (direccion as any).direccion;
      }
    }

    // 5. Obtener datos del centro de servicio (remitente)
    const { result: centroServicio } = await apiBackendAction("centros_de_servicio.get", { 
      id: incidente.centro_de_servicio_id 
    });

    // 6. Generar número de guía interno usando apiBackendAction
    const { numero: numeroGuia } = await apiBackendAction("rpc.generarNumeroGuia", {});

    // 7. Construir datos de la guía
    const ciudadDestino = `${cliente.municipio || ""}, ${cliente.departamento || "Guatemala"}`.trim().replace(/^,\s*/, "");
    
    const guiaData = {
      incidente_id: incidenteId,
      incidentes_codigos: [incidente.codigo],
      centro_de_servicio_origen_id: incidente.centro_de_servicio_id,
      tipo: "ENTREGA" as const,
      estado: "PENDIENTE" as const,
      numero_guia: numeroGuia,
      tracking_number: numeroGuia,
      fecha_guia: new Date().toISOString(),
      destinatario: cliente.nombre,
      direccion_destinatario: direccionEnvio,
      telefono_destinatario: cliente.celular || cliente.telefono_principal || null,
      ciudad_destino: ciudadDestino,
      referencia_1: incidente.codigo,
      referencia_2: cliente.codigo,
      remitente: (centroServicio as any)?.nombre || "HPC Centro de Servicio",
      direccion_remitente: (centroServicio as any)?.direccion || "42A Av 9-16 Zona 5",
      cantidad_piezas: 1,
      peso: 5,
      tarifa: 0,
      zigo_guia_id: null,
      zigo_guia_status: "interno",
      zigo_request_payload: { sistema: "interno", generado_automaticamente: true },
      zigo_response_data: null,
    };

    console.log("📦 Datos de la guía interna:", guiaData);

    // 8. Insertar guía en la base de datos usando apiBackendAction
    const guiaCreada = await apiBackendAction("guias.create", guiaData as any) as any;

    console.log("✅ Guía interna guardada en BD:", guiaCreada);

    // 9. Actualizar el incidente a EN_ENTREGA usando apiBackendAction
    try {
      await apiBackendAction("incidentes.update", {
        id: incidenteId,
        data: { estado: "EN_ENTREGA" }
      } as any);
      console.log("✅ Estado del incidente actualizado a EN_ENTREGA");
    } catch (updateError) {
      console.warn("⚠️ Guía creada pero error actualizando estado:", updateError);
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
  try {
    const { results } = await apiBackendAction("guias.search", { incidente_id: incidenteId });
    return results && results.length > 0;
  } catch {
    return false;
  }
}
