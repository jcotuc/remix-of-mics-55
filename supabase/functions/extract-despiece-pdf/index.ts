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

IMPORTANTE: Debes extraer ABSOLUTAMENTE TODOS los repuestos de la tabla, sin omitir ninguno. Pueden ser 50, 60 o más repuestos.

Debes extraer la siguiente información:
1. Información del producto (máquina):
   - CLAVE del producto (ej: ESMA-4-1/2N) - usualmente aparece en la parte superior
   - CÓDIGO del producto (ej: 16441) - usualmente aparece junto a la clave
   - Descripción del producto (ej: ESMERILADORA ANGULAR DE 4 1/2")

2. Lista COMPLETA de repuestos (extrae TODOS sin excepción):
   - codigo: Código numérico del repuesto (ej: 95559, 95750, etc.)
   - clave: Clave del repuesto (ej: R1-ESMA-4-1/2N, R2-ESMA-4-1/2N)
   - descripcion: Descripción del repuesto (ej: Brida exterior, Brida interior)

NO incluyas el número de fila/línea (NO.), solo los datos del repuesto.
Asegúrate de extraer CADA UNO de los repuestos listados, desde el primero hasta el último.

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
