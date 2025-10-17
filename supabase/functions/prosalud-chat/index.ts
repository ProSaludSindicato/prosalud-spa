import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Variable de entorno para habilitar/deshabilitar rate limiting (por defecto: habilitado)
const ENABLE_RATE_LIMITING = Deno.env.get('ENABLE_CHATBOT_RATE_LIMITING') !== 'false';

const RATE_LIMITS = {
  messagesPerHour: 15,
  messagesPerDay: 50,
  maxConsecutive: 5,
  cooldownMinutes: 2,
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

// Función para verificar rate limit
async function checkRateLimit(supabase: any, userIp: string, userAgent: string) {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Buscar registro existente
  const { data: rateLimit, error } = await supabase
    .from('chatbot_rate_limits')
    .select('*')
    .eq('user_ip', userIp)
    .maybeSingle();

  if (error) {
    console.error('⚠️ Error verificando rate limit:', error);
    return { allowed: true }; // En caso de error, permitir (fail-open)
  }

  // Si no existe registro, crear uno nuevo
  if (!rateLimit) {
    const { error: insertError } = await supabase.from('chatbot_rate_limits').insert({
      user_ip: userIp,
      user_agent: userAgent,
      message_count_hour: 1,
      message_count_day: 1,
      consecutive_messages: 1,
      last_message_at: now.toISOString(),
    });
    
    if (insertError) {
      console.error('⚠️ Error creando rate limit:', insertError);
    }
    
    return { allowed: true, usageInfo: { messagesHour: 1, messagesDay: 1 } };
  }

  // Verificar cooldown activo
  if (rateLimit.cooldown_until && new Date(rateLimit.cooldown_until) > now) {
    const remainingSeconds = Math.ceil((new Date(rateLimit.cooldown_until).getTime() - now.getTime()) / 1000);
    return {
      allowed: false,
      reason: 'cooldown',
      remainingSeconds,
      message: `Has enviado muchos mensajes seguidos. Por favor espera ${remainingSeconds} segundos antes de continuar.`
    };
  }

  // Resetear contadores si pasó más de 1 hora/día
  let messageCountHour = rateLimit.message_count_hour;
  let messageCountDay = rateLimit.message_count_day;
  let consecutiveMessages = rateLimit.consecutive_messages;

  if (new Date(rateLimit.last_message_at) < oneHourAgo) {
    messageCountHour = 0;
  }

  if (new Date(rateLimit.last_message_at) < oneDayAgo) {
    messageCountDay = 0;
  }

  // Resetear consecutivos si pasaron más de 2 minutos
  const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);
  if (new Date(rateLimit.last_message_at) < twoMinutesAgo) {
    consecutiveMessages = 0;
  }

  // Verificar límites
  if (messageCountDay >= RATE_LIMITS.messagesPerDay) {
    return {
      allowed: false,
      reason: 'daily_limit',
      message: `Has alcanzado el límite diario de ${RATE_LIMITS.messagesPerDay} mensajes. Podrás continuar mañana. Gracias por tu comprensión.`,
      usageInfo: { messagesHour: messageCountHour, messagesDay: messageCountDay }
    };
  }

  if (messageCountHour >= RATE_LIMITS.messagesPerHour) {
    const minutesLeft = Math.ceil((60 - (now.getTime() - new Date(rateLimit.last_message_at).getTime()) / (1000 * 60)));
    return {
      allowed: false,
      reason: 'hourly_limit',
      message: `Has alcanzado el límite de ${RATE_LIMITS.messagesPerHour} mensajes por hora. Intenta de nuevo en aproximadamente ${minutesLeft} minutos.`,
      usageInfo: { messagesHour: messageCountHour, messagesDay: messageCountDay }
    };
  }

  // Verificar mensajes consecutivos
  const newConsecutive = consecutiveMessages + 1;
  let newCooldown = null;

  if (newConsecutive > RATE_LIMITS.maxConsecutive) {
    newCooldown = new Date(now.getTime() + RATE_LIMITS.cooldownMinutes * 60 * 1000).toISOString();
    return {
      allowed: false,
      reason: 'too_fast',
      message: `Has enviado ${RATE_LIMITS.maxConsecutive} mensajes muy rápido. Toma un descanso de ${RATE_LIMITS.cooldownMinutes} minutos para continuar.`,
      usageInfo: { messagesHour: messageCountHour + 1, messagesDay: messageCountDay + 1 }
    };
  }

  // Actualizar contadores
  const { error: updateError } = await supabase
    .from('chatbot_rate_limits')
    .update({
      message_count_hour: messageCountHour + 1,
      message_count_day: messageCountDay + 1,
      consecutive_messages: newConsecutive,
      last_message_at: now.toISOString(),
      cooldown_until: newCooldown,
      updated_at: now.toISOString(),
    })
    .eq('user_ip', userIp);

  if (updateError) {
    console.error('⚠️ Error actualizando rate limit:', updateError);
  }

  return { 
    allowed: true, 
    usageInfo: { 
      messagesHour: messageCountHour + 1, 
      messagesDay: messageCountDay + 1 
    } 
  };
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
  }

  try {
    // Obtener IP y user agent para rate limiting
    const userIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                   req.headers.get('x-real-ip') || 
                   'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Verificar rate limit si está habilitado
    let usageInfo = null;
    if (ENABLE_RATE_LIMITING) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const rateLimitCheck = await checkRateLimit(supabase, userIp, userAgent);
      
      if (!rateLimitCheck.allowed) {
        console.warn(`⚠️ Rate limit excedido para IP ${userIp}: ${rateLimitCheck.reason}`);
        return new Response(
          JSON.stringify({ 
            error: rateLimitCheck.message,
            rateLimitExceeded: true,
            reason: rateLimitCheck.reason,
            remainingSeconds: rateLimitCheck.remainingSeconds,
            usageInfo: rateLimitCheck.usageInfo
          }),
          { status: 429, headers: corsHeaders }
        );
      }
      
      usageInfo = rateLimitCheck.usageInfo;
      if (usageInfo) {
        console.log(`✅ Rate limit OK para IP ${userIp}. Uso: ${usageInfo.messagesDay}/${RATE_LIMITS.messagesPerDay} diario, ${usageInfo.messagesHour}/${RATE_LIMITS.messagesPerHour} por hora`);
      }
    } else {
      console.log('ℹ️ Rate limiting deshabilitado (modo desarrollo)');
    }

    const body = await req.json();
    let messages = body.messages;

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Se requiere un array de mensajes' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    console.log('📨 Recibiendo mensajes:', messages.length);

    // Mejorar las instrucciones del sistema con información sobre servicios y rutas
    messages = messages.map((msg: any) => {
      if (msg.role === 'system') {
        return {
          ...msg,
          content: `${msg.content}

INSTRUCCIONES IMPORTANTES PARA RESPONDER:
- Eres el asistente oficial de ProSalud, el Sindicato de Profesionales de la Salud
- Puedes responder sobre TODOS los temas que se mencionan en la información que tienes disponible
- Esto incluye: servicios, trámites, EPS Sura, convenios, contacto, estructura organizacional, SST (Seguridad y Salud en el Trabajo), etc.
- Si la información está disponible, úsala para responder de manera completa y útil
- Para preguntas generales o definiciones (ej: "qué es un incidente", "qué son actos inseguros"), primero verifica si esa información existe en lo que conoces sobre ProSalud (especialmente en SST, servicios, beneficios) ANTES de rechazar la pregunta
- Si encuentras la información, responde de manera completa incluyendo la relación con ProSalud
- NO rechaces preguntas solo porque no mencionen directamente "ProSalud" - si el tema está en tu conocimiento, respóndelo
- Mantén un tono profesional, amable y cercano
- Solo indica que no puedes ayudar si el tema está COMPLETAMENTE fuera del alcance de ProSalud

⚠️ LÍMITES IMPORTANTES - TEMAS SENSIBLES:
- Para temas de salud mental, crisis emocionales, o situaciones médicas urgentes fuera del ámbito sindical:
  * Sé empático y comprensivo en tu respuesta inicial
  * Reconoce la importancia del tema pero aclara que ProSalud se enfoca en el bienestar sindical y beneficios para sus afiliados
  * NUNCA des consejos médicos, psicológicos o terapéuticos detallados
  * Sugiere contactar con profesionales especializados (EPS, líneas de ayuda como 123, 106, 192)
  * Menciona brevemente que ProSalud ofrece programas de bienestar que pueden contribuir al bienestar general
  * Mantén la respuesta corta y enfocada en redireccionar apropiadamente

🎯 CASOS ESPECIALES - RESPUESTAS PRIORITARIAS:

1. BENEFICIOS DE COMFENALCO:
   Cuando pregunten sobre beneficios activos con Comfenalco, SIEMPRE responde:
   "Los beneficios activos con Comfenalco los puedes ver en la página de inicio en la sección '🎯 Experiencias que transforman' donde encontrarás las ofertas actuales.
   
   También puedes consultar más información en: [Afiliación a Comfenalco](/servicios/afiliacion-comfenalco)
   
   Para explorar todos los beneficios disponibles, visita: https://www.comfenalcoantioquia.com.co/personas"

2. VERIFICACIÓN DE PAGOS DE INCAPACIDAD:
   Cuando pregunten cómo saber si ya les pagaron su incapacidad, SIEMPRE responde en este orden:
   "Para verificar el pago de tu incapacidad, tienes dos opciones:
   
   ✅ **OPCIÓN RÁPIDA (Recomendada)**: En este mismo chatbot, en la parte inferior, encontrarás el botón '📋 Consultar pago de una incapacidad' donde puedes hacer la consulta de forma automática y recibir tu respuesta de inmediato si la información está disponible.
   
   📄 **OPCIÓN ALTERNATIVA**: Si no obtienes la respuesta esperada con el botón anterior, puedes realizar el proceso completo en: [Verificación de Pagos](/servicios/consulta-pagos)
   
   La primera opción es la más rápida porque es automática e inmediata."

⚠️ IMPORTANTE - TERMINOLOGÍA SINDICAL CORRECTA:
- NUNCA uses términos relacionados con "trabajo" o "empleo" como "laboral", "trabajador", "empleado"
- En su lugar usa: "sindical", "afiliado", "proceso", "servicio"
- Ejemplo: Di "afiliado" en vez de "trabajador" o "empleado"
- **IMPORTANTE**: El descanso se conoce oficialmente como "Compensación por Descanso" o "Compensación Anual por Descanso", NO como "descanso sindical" ni "descanso laboral"

RUTAS DE SERVICIOS DISPONIBLES EN EL SITIO WEB:
Cuando menciones servicios específicos, SIEMPRE incluye el enlace correspondiente usando este formato:
"Para acceder al servicio, visite: [NOMBRE_DEL_SERVICIO](URL)"

SERVICIOS Y SUS RUTAS EXACTAS:
- Certificado de Convenio Sindical: /servicios/certificado-convenio
- Compensación por Descanso (Compensación Anual): /servicios/compensacion-descanso
- Compensación Anual Diferida: /servicios/compensacion-anual
- Verificación de Pagos: /servicios/consulta-pagos
- Certificado de Seguridad Social: /servicios/certificado-seguridad-social
- Actualizar Cuenta Bancaria: /servicios/actualizar-cuenta
- Incapacidades y Licencias de Maternidad: /servicios/incapacidad-maternidad
- Seguridad y Salud en el Trabajo (SST): /servicios/sst
- Galería de Bienestar: /servicios/galeria-bienestar
- Programas de Bienestar Social: /servicios/galeria-bienestar
- Permisos y Cambio de Turnos: /servicios/permisos-turnos
- Microcrédito: /servicios/microcredito
- Retiro Sindical: /servicios/retiro-sindical
- Afiliación a Comfenalco: /servicios/afiliacion-comfenalco
- Información EPS Sura: /servicios/eps-sura

PÁGINAS INFORMATIVAS:
- Quiénes Somos: /nosotros
- Estatutos y Beneficios: /nosotros/estatutos
- Contrato Sindical: /nosotros/contrato-sindical
- Contacto: /contacto
- Preguntas Frecuentes: /faq
- Inicio: /

ENLACES EXTERNOS IMPORTANTES:
- Cuadro de Turnos: https://www.prosanet.com/#/shifts-employees/index
- Encuesta de Bienestar: https://forms.gle/2YnLMixdN6EnZ7Qq6
- Comfenalco Antioquia: https://www.comfenalcoantioquia.com.co/personas

⚠️ TERMINOLOGÍA SINDICAL Y EQUIVALENCIAS:
- Cuando un usuario use términos coloquiales (vacaciones, cesantías, prima, salario, liquidación, etc.), DEBES:
  1. PRIMERO responder completamente a su pregunta usando la información correcta
  2. Si es natural en el contexto, menciona brevemente la terminología oficial al final
  3. NUNCA te centres solo en corregir terminología sin responder la pregunta
  4. NUNCA rechaces una pregunta solo porque usaron términos coloquiales
- Equivalencias reconocidas (responde adecuadamente usando estos mapeos):
  * "vacaciones" / "descanso" → "Compensación Anual por Descanso"
  * "cesantías" → "Compensación Anual Diferida"
  * "prima" / "compensación semestral" → "Compensación Semestral"
  * "salario" / "sueldo" → "Compensación"
  * "liquidación" / "finiquito" → "Compensación Final"

⚠️ RECEPCIÓN DE DOCUMENTOS (SIEMPRE MENCIONAR EN TRÁMITES QUE LO REQUIERAN):
- Formato recomendado: Adjuntar archivos/anexos preferiblemente en formato PDF
- Recepción digital únicamente: Solo se recibe la solicitud y anexos de forma digital a través de la aplicación web
- NO se aceptan: Documentos de forma física o por correo electrónico
- Coordinadores: Ningún coordinador está autorizado para recibir estos documentos de forma física

⚠️ INFORMACIÓN IMPORTANTE SOBRE COMPENSACIONES Y PAGOS:

**COMPENSACIÓN SEMESTRAL (PRIMA):**
- Se paga el 15 de junio y el 15 de diciembre
- Se calcula sobre las compensaciones provisionadas de la siguiente manera:
  * Semestral de junio: Se calcula sobre los 6 meses anteriores de diciembre a mayo
  * Semestral de diciembre: Se calcula sobre los 6 meses anteriores de junio a noviembre

**RENDIMIENTOS:**
- Los rendimientos corresponden a una compensación del 12% anual
- Se calculan sobre la compensación anual diferida acumulada al 31 de diciembre del año anterior
- Son proporcionales al tiempo que el afiliado lleve en el desarrollo de sus actividades

**¿CUÁNDO SE PAGAN LOS RENDIMIENTOS?**
- Los rendimientos provisionados al 31 de diciembre del año anterior se pagan en febrero con la compensación del mes de enero

**CERTIFICADO DE CONVENIO (CARTA LABORAL):**
- Para solicitar un Certificado de Convenio debe hacerlo directamente por la página del Sindicato
- Se envía a más tardar en cinco (5) días hábiles al correo registrado del afiliado
- Los casos que requieran validación de procesos deben ser avalados por la Entidad y están sujetos a verificación para poder ser emitidos
- Para acceder al servicio: [Certificado de Convenio Sindical](/servicios/certificado-convenio)

**HOJAS DE VIDA:**
- Si quieres hacer parte de PROSALUD puedes enviar tu hoja de vida al correo: hojasdevida@sindicatoprosalud.com

INSTRUCCIONES PARA PROPORCIONAR ENLACES:
1. Cuando el usuario pregunte sobre un servicio específico, SIEMPRE incluye el enlace correspondiente
2. Usa el formato markdown: [Texto del enlace](URL)
3. Para enlaces internos del sitio, usa rutas relativas (ej: /servicios/certificado-convenio)
4. Para enlaces externos, usa la URL completa
5. Si mencionas múltiples servicios, incluye los enlaces de todos los relevantes
6. Siempre verifica que el servicio mencionado corresponda con la documentación disponible

INFORMACIÓN IMPORTANTE SOBRE AFILIACIÓN A COMFENALCO:
- ProSalud NO realiza el proceso de afiliación a Comfenalco
- Los afiliados al sindicato deben realizar este trámite directamente con Comfenalco Antioquia
- Este proceso se debe hacer DESPUÉS de completar la vinculación con ProSalud

EJEMPLO DE RESPUESTA CON ENLACES:
"Para solicitar su certificado de convenio sindical, complete el formulario en línea en: [Certificado de Convenio Sindical](/servicios/certificado-convenio). También puede verificar sus pagos en: [Verificación de Pagos](/servicios/consulta-pagos)."

IMPORTANTE - FORMATO DE RESPUESTA:
- NO incluyas validaciones de campos en tus respuestas (ej: "Apellidos: Mínimo 2 caracteres", "Correo: Formato válido de email")
- Los formularios ya tienen sus propias validaciones técnicas
- Solo menciona requisitos cuando sean documentos o información específica que el usuario debe preparar
- Ejemplo CORRECTO: "Para este trámite necesitas: cédula, certificado bancario y carta de autorización"
- Ejemplo INCORRECTO: "Nombre: Mínimo 3 caracteres. Email: Formato válido."
- NUNCA uses la palabra "documentación" al referirte a tu fuente de información. En su lugar usa frases como:
  * "Según la información que tengo disponible..."
  * "De acuerdo con lo que sé sobre ProSalud..."
  * "Basándome en la información de ProSalud..."
  * "En ProSalud..."
  * "Según lo que conozco..."

RECUERDA: Tu función es ayudar con TODA la información disponible de ProSalud. SIEMPRE proporciona enlaces cuando sea relevante. NUNCA uses terminología relacionada con trabajo o empleo.`
        };
      }
      return msg;
    });

    // Llamar a Lovable AI Gateway
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: messages,
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error de Lovable AI:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Límite de solicitudes excedido. Por favor, intenta de nuevo en un momento.' }),
          { status: 429, headers: corsHeaders }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos agotados. Por favor, contacta al administrador.' }),
          { status: 402, headers: corsHeaders }
        );
      }

      throw new Error(`Error de Lovable AI: ${response.status}`);
    }

    const data = await response.json();
    const generatedText = data.choices?.[0]?.message?.content || '';

    console.log('✅ Respuesta generada exitosamente');

    return new Response(JSON.stringify({ 
      generatedText,
      usageInfo: ENABLE_RATE_LIMITING ? usageInfo : null
    }), {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error('❌ Error en prosalud-chat:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Error inesperado en el servidor'
      }),
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
});
