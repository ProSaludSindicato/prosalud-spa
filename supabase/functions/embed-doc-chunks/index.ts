
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_KEY");
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const EMBEDDING_MODEL = "text-embedding-ada-002";
const CHUNK_SIZE = 1200; // aprox 300-400 tokens, ajusta si necesitas

// Helper: Divide texto Markdown en bloques de longitud máxima
function chunkText(text: string, maxLen: number = CHUNK_SIZE): string[] {
  const paragraphs = text.split(/\n{2,}/g);
  const chunks = [];
  let current = "";
  for (const para of paragraphs) {
    if ((current + "\n\n" + para).length > maxLen && current) {
      chunks.push(current.trim());
      current = para;
    } else {
      current += "\n\n" + para;
    }
  }
  if (current) chunks.push(current.trim());
  return chunks;
}

// Helper: Genera un embedding usando OpenAI
async function getEmbedding(text: string) {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: text,
      model: EMBEDDING_MODEL,
    }),
  });
  const result = await response.json();
  if (result.data && result.data[0] && result.data[0].embedding) {
    return result.data[0].embedding;
  }
  throw new Error("No embedding generated: " + result.error?.message || "");
}

// Helper: Inserta chunk y embedding en Supabase
async function insertChunk({ doc_path, chunk_index, content, embedding }: {
  doc_path: string;
  chunk_index: number;
  content: string;
  embedding: number[];
}) {
  if (!SUPABASE_SERVICE_KEY) {
    throw new Error("SUPABASE_SERVICE_KEY no configurada");
  }
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/doc_chunks`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_SERVICE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation",
    },
    body: JSON.stringify([{ doc_path, chunk_index, content, embedding }]),
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error("Supabase insert error: " + err);
  }
}

// MAIN HANDLER
serve(async (req: Request) => {
  // CORS preflight support
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type, apikey" },
    });
  }

  try {
    const { docPath, markdown } = await req.json();

    // 1. Chunk the text
    const chunks = chunkText(markdown);

    // 2. For each chunk, get embedding and store
    for (let i = 0; i < chunks.length; ++i) {
      const content = chunks[i];
      // Llama OpenAI solo si hay contenido significativo
      if (content && content.length > 50) {
        const embedding = await getEmbedding(content);
        await insertChunk({ doc_path: docPath, chunk_index: i, content, embedding });
      }
    }

    return new Response(JSON.stringify({ ok: true, count: chunks.length }), {
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  } catch (e) {
    const error = e as Error;
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Access-Control-Allow-Origin": "*" } });
  }
});
