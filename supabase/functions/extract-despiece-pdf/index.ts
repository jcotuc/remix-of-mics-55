import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfContent, codigoProducto, claveProducto } = await req.json();

    if (!pdfContent) {
      return new Response(
        JSON.stringify({ success: false, error: "PDF content is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Processing PDF content for spare parts extraction...");

    const systemPrompt = `Eres un experto en análisis de catálogos de repuestos de herramientas eléctricas Truper. 
Tu tarea es extraer TODA la información de tablas de despieces de máquinas.

REGLAS CRÍTICAS:
1. Debes extraer ABSOLUTAMENTE TODOS los repuestos de la tabla, sin omitir ninguno.
2. TODOS los campos son OBLIGATORIOS - cada repuesto DEBE tener codigo, clave y descripcion.
3. Si un campo parece vacío en el PDF, busca el valor en líneas cercanas o adyacentes.
4. Los datos pueden estar en columnas separadas: NO. | CÓDIGO | CLAVE | DESCRIPCIÓN
5. A veces el código y clave están en la misma celda separados por espacio.

FORMATO DE DATOS EN EL PDF:
- CÓDIGO: Número de 5-6 dígitos (ej: 95559, 929934)
- CLAVE: Formato R[número]-[CLAVE_PRODUCTO] (ej: R1-ROTO-1/2A7, R34-ESMA-4-1/2N)
- DESCRIPCIÓN: Nombre del repuesto en español (ej: Brida exterior, Campo, Tornillo ST 4x16)

INFORMACIÓN A EXTRAER:
1. Producto (máquina):
   - CLAVE del producto (ej: ESMA-4-1/2N, ROTO-1/2A7)
   - CÓDIGO del producto (ej: 16441, 15679)
   - Descripción del producto

2. Lista COMPLETA de repuestos - CADA UNO debe tener los 3 campos:
   - codigo: Código numérico (OBLIGATORIO - buscar si parece faltar)
   - clave: Clave alfanumérica (OBLIGATORIO - buscar si parece faltar)  
   - descripcion: Descripción en español (OBLIGATORIO - buscar si parece faltar)

IMPORTANTE: Si ves una fila con datos parciales, los datos faltantes probablemente están en la línea anterior o siguiente. Combínalos correctamente.

NO incluyas repuestos con campos vacíos. Si no puedes determinar un valor, NO incluyas ese repuesto.

Responde SOLO con un JSON válido con esta estructura:
{
  "producto": {
    "codigo": "string",
    "clave": "string",
    "descripcion": "string"
  },
  "repuestos": [
    {
      "codigo": "string",
      "clave": "string",
      "descripcion": "string"
    }
  ]
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: `Analiza el siguiente contenido de un PDF de despiece y extrae TODOS los repuestos (pueden ser más de 50). Es crítico que no omitas ninguno:\n\n${pdfContent}` 
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: "Payment required, please add funds to your Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    console.log("AI Response:", content);

    // Parse the JSON response - handle markdown code blocks
    let extractedData;
    try {
      let jsonContent = content;
      // Remove markdown code blocks if present
      if (jsonContent.includes("```json")) {
        jsonContent = jsonContent.replace(/```json\s*/g, "").replace(/```\s*/g, "");
      } else if (jsonContent.includes("```")) {
        jsonContent = jsonContent.replace(/```\s*/g, "");
      }
      extractedData = JSON.parse(jsonContent.trim());
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", content);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Failed to parse AI response", 
          rawResponse: content 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If codigoProducto was provided, use it instead of extracted
    if (codigoProducto) {
      extractedData.producto.codigo = codigoProducto;
    }
    if (claveProducto) {
      extractedData.producto.clave = claveProducto;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: extractedData 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing PDF:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
