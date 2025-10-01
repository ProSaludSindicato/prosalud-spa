
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { input } = await req.json();

    if (!input || typeof input !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Se requiere un texto válido para generar embedding' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: input.trim(),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Error de OpenAI:', data);
      return new Response(
        JSON.stringify({ error: data.error?.message || 'Error al generar embedding' }),
        { status: 500, headers: corsHeaders }
      );
    }

    const embedding = data.data?.[0]?.embedding;
    if (!embedding) {
      return new Response(
        JSON.stringify({ error: 'No se pudo generar el embedding' }),
        { status: 500, headers: corsHeaders }
      );
    }

    return new Response(JSON.stringify({ embedding }), {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error('Error en embed-question:', error);
    const err = error as Error;
    return new Response(
      JSON.stringify({ error: err.message || 'Error interno del servidor' }),
      { status: 500, headers: corsHeaders }
    );
  }
});
