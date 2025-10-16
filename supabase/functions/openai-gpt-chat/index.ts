
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
  }

  try {
    let messages;
    try {
      const body = await req.json();
      messages = body.messages;
    } catch (err) {
      console.error("No se pudo leer JSON de la request", err);
      return new Response(JSON.stringify({ error: 'Solicitud inválida. Debe enviarse JSON.' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Mejorar el sistema de instrucciones para incluir rutas de servicios
    const enhancedMessages = messages.map((msg: any) => {
      if (msg.role === 'system') {
        return {
          ...msg,
          content: `${msg.content}

INSTRUCCIONES IMPORTANTES PARA RESPONDER:
- Eres el asistente oficial de ProSalud, el Sindicato de Profesionales de la Salud
- Puedes responder sobre TODOS los temas que se mencionan en la documentación proporcionada
- Esto incluye: servicios, trámites, EPS Sura, convenios, contacto, estructura organizacional, etc.
- Si la información está en el contexto proporcionado, úsala para responder de manera completa y útil
- NO rechaces preguntas solo porque no mencionen directamente "ProSalud"
- Mantén un tono profesional, amable y cercano
- Si realmente no tienes información sobre el tema consultado, entonces indica que no puedes ayudar con eso

⚠️ IMPORTANTE - RECEPCIÓN DE DOCUMENTOS Y ANEXOS:
- Para todos los trámites y solicitudes, SIEMPRE menciona que:
  * Se recomienda adjuntar los archivos/anexos preferiblemente en formato PDF
  * Solo se reciben solicitudes y anexos de forma digital a través del formulario web
  * NO se aceptan documentos de forma física o por correo electrónico
  * Ningún coordinador está autorizado para recibir estos documentos de forma física

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
- Compensación por Descanso (Compensación Anual por Descanso): /servicios/compensacion-descanso
- Compensación Anual Diferida: /servicios/compensacion-anual
- Verificación de Pagos: /servicios/consulta-pagos
- Certificado de Seguridad Social (Certificado de Aportes): /servicios/certificado-seguridad-social
- Actualizar Cuenta Bancaria: /servicios/actualizar-cuenta
- Incapacidades y Licencias de Maternidad: /servicios/incapacidad-maternidad
- Seguridad y Salud en el Trabajo (SST): /servicios/sst
- Galería de Bienestar: /servicios/galeria-bienestar
- Permisos y Cambio de Turnos: /servicios/permisos-turnos
- Microcrédito: /servicios/microcredito
- Retiro Sindical: /servicios/retiro-sindical
- Afiliación a Comfenalco: /servicios/afiliacion-comfenalco
- Información EPS Sura: /servicios/eps-sura

⚠️ IMPORTANTE - CERTIFICADO DE APORTES A LA SEGURIDAD SOCIAL:
Para consultar el certificado de aportes a la seguridad social, existen DOS proveedores según la fecha:
1. **Aportes en Línea** (https://www.aportesenlinea.com/Autoservicio/CertificadoAportes.aspx): Para consultar aportes realizados HASTA AGOSTO DE 2022
2. **ARUS SUAPORTE** (https://www.suaporte.com.co): Para consultar aportes realizados DESDE SEPTIEMBRE DE 2022 hasta la fecha actual

⚠️ IMPORTANTE - REQUISITOS PARA COMPENSACIÓN ANUAL POR DESCANSO (VACACIONES):
Cuando el usuario pregunte sobre "vacaciones", "descanso", "compensación por descanso" o "requisitos para vacaciones", DEBES responder SIEMPRE con estos requisitos:
1. Ser un afiliado activo del sindicato
2. Tener 12 meses consecutivos en el sindicato al momento de realizar la solicitud
   - EJEMPLO IMPORTANTE que DEBES MENCIONAR: Si su ingreso fue en el mes de enero de 2024, la solicitud debe realizarse en el mes de enero del año 2025 antes del día 24, que es la fecha de corte para que el pago se vea reflejado en la siguiente compensación que se realiza los primeros días de marzo. Si se carga después del día 24, el reconocimiento quedará para el pago que se realiza los primeros días de abril.
3. Contar con el visto bueno (V°B°) del coordinador del servicio

IMPORTANTE: Cuando menciones estos requisitos, también indica que los documentos deben adjuntarse preferiblemente en formato PDF y que solo se reciben solicitudes de forma digital a través del formulario web, NO de forma física ni por correo electrónico.

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

RECUERDA: Tu función es ayudar con TODA la información disponible de ProSalud. SIEMPRE proporciona enlaces cuando sea relevante. NUNCA uses terminología relacionada con trabajo o empleo.`
        };
      }
      return msg;
    });

    // Llama OpenAI con las instrucciones mejoradas
    let openAIresp;
    try {
      openAIresp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: enhancedMessages,
          max_tokens: 500, // Aumentado para incluir enlaces
          temperature: 0.7,
        }),
      });
    } catch (e) {
      console.error("Error al llamar API OpenAI:", e);
      return new Response(
        JSON.stringify({ error: 'Error de red contactando OpenAI.' }),
        { status: 502, headers: corsHeaders }
      );
    }
    
    let rawText = await openAIresp.text();
    let data;
    try {
      data = JSON.parse(rawText);
    } catch (err) {
      console.error("Respuesta OpenAI NO es JSON válido:", rawText);
      return new Response(JSON.stringify({ error: 'Respuesta inválida desde OpenAI', openaiRaw: rawText }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    if (!openAIresp.ok) {
      const errMsg = (data && data.error && data.error.message) ? data.error.message : 'Error OpenAI API';
      console.error("OpenAI error data:", data);
      return new Response(JSON.stringify({ error: errMsg }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    const generatedText = data.choices?.[0]?.message?.content || '';

    return new Response(JSON.stringify({ generatedText }), {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error('Error in openai-gpt-chat function:', error);
    const err = error as Error;
    return new Response(
      JSON.stringify({ error: err.message || 'Error inesperado en función OpenAI.' }),
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
});
