import "https://deno.land/x/xhr@0.1.0/mod.ts";
// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

// @ts-ignore
serve(async (req) => {
  // Manejar CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Obtener las variables de entorno del frontend desde el body
    const frontendEnvVars = await req.json().catch(() => ({}));

    // Obtener todas las variables de entorno del servidor disponibles
    // @ts-ignore
    const serverEnvVars: Record<string, string | undefined> = {
      SUPABASE_URL: Deno.env.get("SUPABASE_URL"),
      SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ? "[REDACTED]" : undefined,
      SUPABASE_ANON_KEY: Deno.env.get("SUPABASE_ANON_KEY") ? "[REDACTED]" : undefined,
      LOVABLE_API_KEY: Deno.env.get("LOVABLE_API_KEY") ? "[REDACTED]" : undefined,
      ENABLE_CHATBOT_RATE_LIMITING: Deno.env.get("ENABLE_CHATBOT_RATE_LIMITING"),
    };

    // Preparar el objeto de respuesta con información detallada
    const envInfo = {
      timestamp: new Date().toISOString(),
      frontend: {
        variables: frontendEnvVars,
        status: {
          VITE_PUBLIC_API_BASE_URL: frontendEnvVars.VITE_PUBLIC_API_BASE_URL 
            ? "✅ DEFINIDA" 
            : "❌ NO DEFINIDA (usando fallback)",
          VITE_ADMIN_API_BASE_URL: frontendEnvVars.VITE_ADMIN_API_BASE_URL 
            ? "✅ DEFINIDA" 
            : "❌ NO DEFINIDA (usando fallback)",
          VITE_API_BASE_URL: frontendEnvVars.VITE_API_BASE_URL 
            ? "✅ DEFINIDA" 
            : "❌ NO DEFINIDA (usando fallback)",
          VITE_RECAPTCHA_SITE_KEY: frontendEnvVars.VITE_RECAPTCHA_SITE_KEY 
            ? "✅ DEFINIDA" 
            : "❌ NO DEFINIDA (usando fallback)",
          VITE_SUPABASE_URL: frontendEnvVars.VITE_SUPABASE_URL 
            ? "✅ DEFINIDA" 
            : "❌ NO DEFINIDA",
          VITE_SUPABASE_PUBLISHABLE_KEY: frontendEnvVars.VITE_SUPABASE_PUBLISHABLE_KEY 
            ? "✅ DEFINIDA" 
            : "❌ NO DEFINIDA",
          VITE_APP_ENABLE_DEBUG_LOGS: frontendEnvVars.VITE_APP_ENABLE_DEBUG_LOGS 
            ? "✅ DEFINIDA" 
            : "❌ NO DEFINIDA",
        },
        values: {
          VITE_PUBLIC_API_BASE_URL: frontendEnvVars.VITE_PUBLIC_API_BASE_URL || "[NO DEFINIDA - usando fallback: https://prosalud.test]",
          VITE_ADMIN_API_BASE_URL: frontendEnvVars.VITE_ADMIN_API_BASE_URL || "[NO DEFINIDA - usando fallback: https://prosalud.test]",
          VITE_API_BASE_URL: frontendEnvVars.VITE_API_BASE_URL || "[NO DEFINIDA - usando fallback: https://prosalud.test]",
          VITE_RECAPTCHA_SITE_KEY: frontendEnvVars.VITE_RECAPTCHA_SITE_KEY || "[NO DEFINIDA - usando fallback hardcode]",
          VITE_SUPABASE_URL: frontendEnvVars.VITE_SUPABASE_URL || "[NO DEFINIDA]",
          VITE_SUPABASE_PUBLISHABLE_KEY: frontendEnvVars.VITE_SUPABASE_PUBLISHABLE_KEY ? "[REDACTED - pero definida]" : "[NO DEFINIDA]",
          VITE_APP_ENABLE_DEBUG_LOGS: frontendEnvVars.VITE_APP_ENABLE_DEBUG_LOGS || "[NO DEFINIDA]",
        },
      },
      server: {
        variables: serverEnvVars,
        status: {
          SUPABASE_URL: serverEnvVars.SUPABASE_URL ? "✅ DEFINIDA" : "❌ NO DEFINIDA",
          SUPABASE_SERVICE_ROLE_KEY: serverEnvVars.SUPABASE_SERVICE_ROLE_KEY ? "✅ DEFINIDA" : "❌ NO DEFINIDA",
          SUPABASE_ANON_KEY: serverEnvVars.SUPABASE_ANON_KEY ? "✅ DEFINIDA" : "❌ NO DEFINIDA",
          LOVABLE_API_KEY: serverEnvVars.LOVABLE_API_KEY ? "✅ DEFINIDA" : "❌ NO DEFINIDA",
          ENABLE_CHATBOT_RATE_LIMITING: serverEnvVars.ENABLE_CHATBOT_RATE_LIMITING ? "✅ DEFINIDA" : "❌ NO DEFINIDA",
        },
      },
    };

    // IMPRIMIR EN CONSOLA DEL SERVIDOR (esto es lo importante para producción)
    console.log("=".repeat(80));
    console.log("🔍 VERIFICACIÓN TEMPORAL DE VARIABLES DE ENTORNO");
    console.log("=".repeat(80));
    console.log(`📅 Timestamp: ${envInfo.timestamp}`);
    console.log("\n📱 VARIABLES DE ENTORNO DEL FRONTEND:");
    console.log("-".repeat(80));
    Object.entries(envInfo.frontend.status).forEach(([key, status]) => {
      console.log(`${status} ${key}`);
    });
    console.log("\n📋 VALORES DEL FRONTEND:");
    console.log("-".repeat(80));
    Object.entries(envInfo.frontend.values).forEach(([key, value]) => {
      console.log(`${key}: ${value}`);
    });
    console.log("\n🖥️  VARIABLES DE ENTORNO DEL SERVIDOR:");
    console.log("-".repeat(80));
    Object.entries(envInfo.server.status).forEach(([key, status]) => {
      console.log(`${status} ${key}`);
    });
    console.log("\n⚠️  RESUMEN:");
    console.log("-".repeat(80));
    const frontendUndefined = Object.values(envInfo.frontend.status).filter(s => s.includes("❌")).length;
    const serverUndefined = Object.values(envInfo.server.status).filter(s => s.includes("❌")).length;
    console.log(`Frontend: ${frontendUndefined} variable(s) no definida(s)`);
    console.log(`Servidor: ${serverUndefined} variable(s) no definida(s)`);
    console.log("=".repeat(80));

    // Retornar respuesta JSON (opcional, para verificar desde el frontend también)
    return new Response(
      JSON.stringify({
        success: true,
        message: "Variables de entorno verificadas. Revisa los logs del servidor.",
        ...envInfo,
      }),
      {
        headers: corsHeaders,
        status: 200,
      }
    );
  } catch (error) {
    console.error("❌ ERROR en verificación de variables de entorno:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      }),
      {
        headers: corsHeaders,
        status: 500,
      }
    );
  }
});

