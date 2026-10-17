import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const MAX_INPUT_CHARS = 2000;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Límite por IP (el chat ya limita a 10 mensajes/hora; cada mensaje genera ~1 embedding)
const EMBEDDINGS_PER_HOUR = 40;

// Reutiliza chatbot_rate_limits con clave "emb:<ip>". Fail-closed si no se puede verificar.
async function allowEmbeddingRequest(req: Request): Promise<boolean> {
  try {
    const ip =
      req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-real-ip') ||
      req.headers.get('x-forwarded-for')?.split(',').pop()?.trim() ||
      'unknown';
    const key = `emb:${ip}`;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const now = new Date();
    const { data, error } = await supabase
      .from('chatbot_rate_limits')
      .select('message_count_hour,last_message_at')
      .eq('user_ip', key)
      .maybeSingle();
    if (error) throw error;

    if (!data) {
      const { error: insertError } = await supabase.from('chatbot_rate_limits').insert({
        user_ip: key,
        message_count_hour: 1,
        message_count_day: 1,
        consecutive_messages: 0,
        last_message_at: now.toISOString(),
      });
      if (insertError) throw insertError;
      return true;
    }

    const windowExpired = now.getTime() - new Date(data.last_message_at).getTime() > 60 * 60 * 1000;
    const count = windowExpired ? 0 : data.message_count_hour;
    if (count >= EMBEDDINGS_PER_HOUR) return false;

    const { error: updateError } = await supabase
      .from('chatbot_rate_limits')
      .update({
        message_count_hour: count + 1,
        // En esta ventana last_message_at marca el inicio del conteo; solo se reinicia al expirar
        last_message_at: windowExpired ? now.toISOString() : data.last_message_at,
        updated_at: now.toISOString(),
      })
      .eq('user_ip', key);
    if (updateError) throw updateError;
    return true;
  } catch (error) {
    console.error('⚠️ Error verificando rate limit de embeddings:', error);
    return false;
  }
}

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
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!(await allowEmbeddingRequest(req))) {
      return new Response(
        JSON.stringify({ error: 'Demasiadas solicitudes. Intenta más tarde.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { input } = await req.json();

    if (!input || typeof input !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Se requiere un texto válido para generar embedding' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (input.length > MAX_INPUT_CHARS) {
      return new Response(
        JSON.stringify({ error: 'Texto demasiado largo' }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📊 Generando embedding, caracteres:', input.length);

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
        error: 'Error interno del servidor'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
