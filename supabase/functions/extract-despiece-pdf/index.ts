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
2. INCLUYE el número de fila (NO.) de la tabla original - esto es MUY IMPORTANTE.
3. Extrae TODOS los campos disponibles: no, codigo, clave, descripcion.
4. Si un campo está vacío en el PDF, déjalo como string vacío "" pero NO omitas la fila.
5. Los datos pueden estar en columnas separadas: NO. | CÓDIGO | CLAVE | DESCRIPCIÓN

FORMATO DE DATOS EN EL PDF:
- NO: Número de fila en la tabla (ej: 1, 2, 3, 34)
- CÓDIGO: Número de 5-6 dígitos (ej: 95559, 929934)
- CLAVE: Formato R[número]-[CLAVE_PRODUCTO] (ej: R1-ROTO-1/2A7, R34-ESMA-4-1/2N)
- DESCRIPCIÓN: Nombre del repuesto en español (ej: Brida exterior, Campo, Tornillo ST 4x16)

INFORMACIÓN A EXTRAER:
1. Producto (máquina):
   - CLAVE del producto (ej: ESMA-4-1/2N, ROTO-1/2A7)
   - CÓDIGO del producto (ej: 16441, 15679)
   - Descripción del producto

2. Lista COMPLETA de repuestos con TODOS sus campos:
   - no: Número de fila en la tabla original (OBLIGATORIO)
   - codigo: Código numérico (puede estar vacío "")
   - clave: Clave alfanumérica (puede estar vacío "")
   - descripcion: Descripción en español (puede estar vacío "")

IMPORTANTE: Extrae TODAS las filas de la tabla, incluso si algunos campos están vacíos. El usuario decidirá cuáles usar.

Responde SOLO con un JSON válido con esta estructura:
{
  "producto": {
    "codigo": "string",
    "clave": "string",
    "descripcion": "string"
  },
  "repuestos": [
    {
      "no": "string",
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
