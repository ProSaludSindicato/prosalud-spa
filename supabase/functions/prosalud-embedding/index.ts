import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

// Lista de dominios permitidos para CORS
const ALLOWED_ORIGINS = [
  'https://sindicatoprosalud.com',
  'https://www.sindicatoprosalud.com',
  'https://prosalud.org.co',
  'https://www.prosalud.org.co',
  // 'https://192.168.1.52:8080',
  // 'https://192.168.1.52:8081',
  // 'https://192.168.1.119:8080',
];

// Función para generar headers CORS seguros basados en origen permitido
function getCorsHeaders(req: Request) {
  // Permitir override con variable de entorno si está disponible (para flexibilidad futura)
  const envOrigins = Deno.env.get("CORS_ALLOWED_ORIGINS");
  const allowedOrigins = envOrigins
    ? envOrigins.split(",").map((origin) => origin.trim()).filter((origin) => origin.length > 0)
    : ALLOWED_ORIGINS;

  const origin = req.headers.get("origin") || "";
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || "";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Credentials": "true",
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { input } = await req.json();

    if (!input || typeof input !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Se requiere un texto válido para generar embedding' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📊 Generando embedding para:', input.substring(0, 100) + '...');

    // Usar Lovable AI para generar embeddings vía OpenAI
    const response = await fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: input.trim(),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error de Lovable AI:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Error al generar embedding' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const embedding = data.data?.[0]?.embedding;
    
    if (!embedding) {
      return new Response(
        JSON.stringify({ error: 'No se pudo generar el embedding' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Embedding generado exitosamente');

    return new Response(JSON.stringify({ embedding }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('❌ Error en prosalud-embedding:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Error interno del servidor'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
