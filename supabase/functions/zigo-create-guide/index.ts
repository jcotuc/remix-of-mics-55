import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Credenciales de Zigo (hardcoded para facilitar la configuración inicial)
const ZIGO_CONFIG = {
  username: 'cosorio',
  password: 'Zigo2025!',
  apiKey: 'ZG!eA#CHy2E!',
  baseUrl: 'https://api-integration.zigogt.com/api/v1'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { guiaData } = await req.json();

    console.log('Creando guía en Zigo con datos:', guiaData);

    // Autenticar con Zigo
    const authResponse = await fetch(`${ZIGO_CONFIG.baseUrl}/authenticate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apiKey': ZIGO_CONFIG.apiKey
      },
      body: JSON.stringify({
        username: ZIGO_CONFIG.username,
        password: ZIGO_CONFIG.password
      })
    });

    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      console.error('Error en autenticación Zigo:', errorText);
      throw new Error(`Error de autenticación: ${authResponse.status} - ${errorText}`);
    }

    const authData = await authResponse.json();
    const token = authData.token;

    console.log('Autenticación exitosa con Zigo');

    // Crear la guía
    const guidePayload = {
      sender: {
        name: guiaData.remitente || "ZIGO",
        address: guiaData.direccion_remitente || "42A Av 9-16 Zona 5, Ciudad de Guatemala",
        phone: "2220-0000"
      },
      receiver: {
        name: guiaData.destinatario,
        address: guiaData.direccion_destinatario,
        city: guiaData.ciudad_destino,
        phone: guiaData.telefono_destinatario || ""
      },
      shipment: {
        pieces: guiaData.cantidad_piezas,
        weight: guiaData.peso || 0,
        declaredValue: guiaData.tarifa || 0,
        reference1: guiaData.referencia_1 || "",
        reference2: guiaData.referencia_2 || "",
        promisedDeliveryDate: guiaData.fecha_promesa_entrega || null,
        incidentCodes: guiaData.incidentes_codigos || []
      }
    };

    console.log('Enviando payload a Zigo:', JSON.stringify(guidePayload, null, 2));

    const createGuideResponse = await fetch(`${ZIGO_CONFIG.baseUrl}/guides`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apiKey': ZIGO_CONFIG.apiKey
      },
      body: JSON.stringify(guidePayload)
    });

    if (!createGuideResponse.ok) {
      const errorText = await createGuideResponse.text();
      console.error('Error al crear guía en Zigo:', errorText);
      throw new Error(`Error al crear guía: ${createGuideResponse.status} - ${errorText}`);
    }

    const zigoGuide = await createGuideResponse.json();
    console.log('Guía creada exitosamente en Zigo:', zigoGuide);

    return new Response(
      JSON.stringify({
        success: true,
        zigoGuide: zigoGuide,
        message: 'Guía creada exitosamente en Zigo'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error en edge function zigo-create-guide:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
