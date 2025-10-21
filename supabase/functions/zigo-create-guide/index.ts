import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuración de Zigo
const ZIGO_CONFIG = {
  protocol: 'https',
  domain: 'dev-api-entregas.zigo.com.gt',
  port: '443',
  apiKey: 'ZG!eA#CHy2E!',
  username: Deno.env.get('ZIGO_USERNAME') || 'cosorio',
  password: Deno.env.get('ZIGO_PASSWORD') || 'Zigo2025!'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { guiaData } = await req.json();

    console.log('=== Iniciando creación de guía en Zigo ===');
    console.log('Datos recibidos:', JSON.stringify(guiaData, null, 2));

    // Paso 1: Autenticación
    const loginUrl = `${ZIGO_CONFIG.protocol}://${ZIGO_CONFIG.domain}:${ZIGO_CONFIG.port}/auth/login`;
    console.log('1. Autenticando en:', loginUrl);

    const authResponse = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: ZIGO_CONFIG.username,
        password: ZIGO_CONFIG.password
      })
    });

    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      console.error('❌ Error en autenticación:', errorText);
      throw new Error(`Error de autenticación: ${authResponse.status} - ${errorText}`);
    }

    const authData = await authResponse.json();
    const accessToken = authData.data.accessToken;
    console.log('✓ Autenticación exitosa');

    // Paso 2: Crear la guía
    const createGuideUrl = `${ZIGO_CONFIG.protocol}://${ZIGO_CONFIG.domain}:${ZIGO_CONFIG.port}/guide`;
    console.log('2. Creando guía en:', createGuideUrl);

    // Estructura según el ejemplo de Postman
    const guidePayload = {
      remitente: "HPC000959", // Código del remitente registrado en Zigo
      dirRemitente: {
        linea1: guiaData.direccion_remitente || "42A Av 9-16 Zona 5",
        pais: "GT",
        departamento: "01",
        municipio: "01",
        sector: "000",
        nombre: guiaData.remitente || "ZIGO",
        telefono: "+50222200000",
        lat: 14.634915,
        lng: -90.506882
      },
      destinatario: guiaData.destinatario,
      dirDestinatario: {
        linea1: guiaData.direccion_destinatario,
        pais: "GT",
        departamento: "01", // Esto debería ser dinámico según la ciudad
        municipio: "01",
        sector: "001",
        nombre: guiaData.destinatario,
        telefono: guiaData.telefono_destinatario || "+50200000000",
        lat: 14.559145, // Coordenadas por defecto
        lng: -90.73339
      },
      referencia01: guiaData.referencia_1 || "",
      referencia02: guiaData.referencia_2 || "",
      tipoServicio: "ST", // Servicio estándar
      bultos: Array.from({ length: guiaData.cantidad_piezas }, () => ({
        tipoEnvio: "02",
        peso: guiaData.peso ? (guiaData.peso / guiaData.cantidad_piezas) : 0
      })),
      detalle: [
        {
          tipoEnvio: "02",
          cantidad: guiaData.cantidad_piezas,
          valor: guiaData.tarifa || 0
        }
      ],
      cantidadBultos: guiaData.cantidad_piezas,
      centroCosto: "CC-HPC",
      retornaDocumentos: false,
      sucursal: "Sucursal Principal",
      valorReferencia: guiaData.tarifa || 0
    };

    console.log('Payload de guía:', JSON.stringify(guidePayload, null, 2));

    const createGuideResponse = await fetch(createGuideUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ZIGO_CONFIG.apiKey,
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(guidePayload)
    });

    const responseText = await createGuideResponse.text();
    console.log('Respuesta de Zigo:', createGuideResponse.status, responseText);

    if (!createGuideResponse.ok) {
      console.error('❌ Error al crear guía:', responseText);
      throw new Error(`Error al crear guía: ${createGuideResponse.status} - ${responseText}`);
    }

    let zigoGuide;
    try {
      zigoGuide = JSON.parse(responseText);
    } catch (e) {
      zigoGuide = { response: responseText };
    }

    console.log('✓ Guía creada exitosamente');

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
    console.error('❌ Error en edge function:', error);
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
