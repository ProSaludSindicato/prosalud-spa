import { logger } from "@/utils/logger";

/**
 * Generadores de respuestas para consultas de incapacidades y liquidaciones
 */
/**
 * Genera respuesta cuando no se encuentran datos
 */
export const generateNoDataResponse = (formData?: { tipoDocumento?: string; numeroDocumento?: string; fechaExpedicion?: string }): string => {
  // Construir query params si hay datos del formulario
  const queryParams = formData && (formData.tipoDocumento || formData.numeroDocumento || formData.fechaExpedicion)
    ? `?${new URLSearchParams({
        ...(formData.tipoDocumento && { tipoDocumento: formData.tipoDocumento }),
        ...(formData.numeroDocumento && { numeroDocumento: formData.numeroDocumento }),
        ...(formData.fechaExpedicion && { fechaExpedicion: formData.fechaExpedicion }),
      }).toString()}`
    : '';

  return `ℹ️ **No se encontraron registros de incapacidad**

No encontramos información de incapacidades asociadas al documento consultado.

**Posibles razones:**
- No hay incapacidades registradas con estos datos
- La información aún no ha sido procesada en el sistema
- Los datos ingresados no coinciden con nuestros registros

**📋 Alternativa disponible:**

Si necesitas consultar o verificar el estado de tus incapacidades, puedes realizar tu consulta a través del [servicio de verificación de pagos](/servicios/consulta-pagos${queryParams}).

En el formulario podrás:
- Seleccionar el tipo de pago relacionado con tu consulta (Incapacidades)
- Proporcionar los detalles necesarios (mes/año, descripción, etc.)
- Adjuntar documentos de soporte si es necesario

Nuestro equipo revisará tu solicitud y te responderá con la información disponible.

**🔒 Nota:** Esta consulta es confidencial y solo visible para ti.`;
};

/**
 * Genera respuesta de error del servidor
 */
export const generateServerErrorResponse = (formData?: { tipoDocumento?: string; numeroDocumento?: string; fechaExpedicion?: string }): string => {
  // Construir query params si hay datos del formulario
  const queryParams = formData && (formData.tipoDocumento || formData.numeroDocumento || formData.fechaExpedicion)
    ? `?${new URLSearchParams({
        ...(formData.tipoDocumento && { tipoDocumento: formData.tipoDocumento }),
        ...(formData.numeroDocumento && { numeroDocumento: formData.numeroDocumento }),
        ...(formData.fechaExpedicion && { fechaExpedicion: formData.fechaExpedicion }),
      }).toString()}`
    : '';

  return `ℹ️ **No se pudo realizar la consulta en este momento**

No fue posible consultar tu información de incapacidades a través de este medio en este momento.

**📋 Alternativa disponible:**

Puedes realizar tu consulta a través del [servicio de verificación de pagos](/servicios/consulta-pagos${queryParams}), donde podrás:

- Seleccionar el tipo de pago relacionado con tu consulta (Incapacidades)
- Proporcionar los detalles necesarios (mes/año, descripción, etc.)
- Adjuntar documentos de soporte si es necesario

Nuestro equipo revisará tu solicitud y te responderá con la información disponible.

**¿Qué puedes hacer?**
- Intenta nuevamente la consulta rápida en unos días
- O utiliza el [servicio de verificación de pagos](/servicios/consulta-pagos${queryParams}) como alternativa

**🔒 Nota de privacidad:** Esta información es confidencial y solo visible para ti.`;
};

/**
 * Genera respuesta de error de validación
 */
export const generateValidationErrorResponse = (errors: any, formData?: { tipoDocumento?: string; numeroDocumento?: string; fechaExpedicion?: string }): string => {
  // Construir query params si hay datos del formulario
  const queryParams = formData && (formData.tipoDocumento || formData.numeroDocumento || formData.fechaExpedicion)
    ? `?${new URLSearchParams({
        ...(formData.tipoDocumento && { tipoDocumento: formData.tipoDocumento }),
        ...(formData.numeroDocumento && { numeroDocumento: formData.numeroDocumento }),
        ...(formData.fechaExpedicion && { fechaExpedicion: formData.fechaExpedicion }),
      }).toString()}`
    : '';

  return `❌ **Error en los datos ingresados**

Los datos proporcionados no son válidos:

${errors ? `\`\`\`json\n${JSON.stringify(errors, null, 2)}\n\`\`\`` : "- Verifica que todos los campos estén completos"}

**📋 Alternativa disponible:**

Si tienes problemas con el formato de los datos, puedes realizar tu consulta a través del [servicio de verificación de pagos](/servicios/consulta-pagos${queryParams}), donde podrás:

- Seleccionar el tipo de pago relacionado con tu consulta (Incapacidades)
- Proporcionar los detalles necesarios (mes/año, descripción, etc.)
- Adjuntar documentos de soporte si es necesario

Nuestro equipo revisará tu solicitud y te responderá con la información disponible.

**¿Qué puedes hacer?**
- Revisa los datos ingresados y asegúrate de que el formato sea correcto
- Intenta nuevamente la consulta rápida
- O utiliza el [servicio de verificación de pagos](/servicios/consulta-pagos${queryParams}) como alternativa

**🔒 Nota de privacidad:** Esta información es confidencial y solo visible para ti.`;
};

/**
 * Genera respuesta de error específica para compensación final
 */
export const generateLiquidacionErrorResponse = (formData?: { tipoDocumento?: string; numeroDocumento?: string; fechaExpedicion?: string }): string => {
  // Construir query params si hay datos del formulario
  const queryParams = formData && (formData.tipoDocumento || formData.numeroDocumento || formData.fechaExpedicion)
    ? `?${new URLSearchParams({
        ...(formData.tipoDocumento && { tipoDocumento: formData.tipoDocumento }),
        ...(formData.numeroDocumento && { numeroDocumento: formData.numeroDocumento }),
        ...(formData.fechaExpedicion && { fechaExpedicion: formData.fechaExpedicion }),
      }).toString()}`
    : '';

  return `ℹ️ **No se pudo realizar la consulta en este momento**

No fue posible consultar tu información de compensación final a través de este medio en este momento.

**📋 Alternativa disponible:**

Puedes realizar tu consulta a través del [servicio de verificación de pagos](/servicios/consulta-pagos${queryParams}), donde podrás:

- Seleccionar el tipo de pago relacionado con tu consulta (Compensación Final)
- Proporcionar los detalles necesarios (mes/año, descripción, etc.)
- Adjuntar documentos de soporte si es necesario

Nuestro equipo revisará tu solicitud y te responderá con la información disponible.

**¿Qué puedes hacer?**
- Intenta nuevamente la consulta rápida en unos días
- O utiliza el [servicio de verificación de pagos](/servicios/consulta-pagos${queryParams}) como alternativa

**🔒 Nota de privacidad:** Esta información es confidencial y solo visible para ti.`;
};

/**
 * Genera respuesta genérica de error
 */
export const generateGenericErrorResponse = (formData?: { tipoDocumento?: string; numeroDocumento?: string; fechaExpedicion?: string }): string => {
  // Construir query params si hay datos del formulario
  const queryParams = formData && (formData.tipoDocumento || formData.numeroDocumento || formData.fechaExpedicion)
    ? `?${new URLSearchParams({
        ...(formData.tipoDocumento && { tipoDocumento: formData.tipoDocumento }),
        ...(formData.numeroDocumento && { numeroDocumento: formData.numeroDocumento }),
        ...(formData.fechaExpedicion && { fechaExpedicion: formData.fechaExpedicion }),
      }).toString()}`
    : '';

  return `ℹ️ **No se pudo realizar la consulta en este momento**

No fue posible consultar tu información de incapacidades a través de este medio en este momento.

**📋 Alternativa disponible:**

Puedes realizar tu consulta a través del [servicio de verificación de pagos](/servicios/consulta-pagos${queryParams}), donde podrás:

- Seleccionar el tipo de pago relacionado con tu consulta (Incapacidades)
- Proporcionar los detalles necesarios (mes/año, descripción, etc.)
- Adjuntar documentos de soporte si es necesario

Nuestro equipo revisará tu solicitud y te responderá con la información disponible.

**¿Qué puedes hacer?**
- Intenta nuevamente la consulta rápida en unos días
- O utiliza el [servicio de verificación de pagos](/servicios/consulta-pagos${queryParams}) como alternativa

**🔒 Nota de privacidad:** Esta información es confidencial y solo visible para ti.`;
};

/**
 * Normaliza el estado de incapacidad: convierte "PAGADA" a "RECONOCIDA"
 */
const normalizeEstado = (estado: string | undefined | null): string => {
  if (!estado) return estado || "";
  const estadoUpper = estado.toUpperCase();
  return estadoUpper === "PAGADA" ? "RECONOCIDA" : estado;
};

/**
 * Genera respuesta con múltiples incapacidades
 */
export const generateMultipleIncapacidadesResponse = (incapacidades: any[]): { content: string; selectionOptions: any[] } => {
  let response = `📋 **Se encontraron ${incapacidades.length} incapacidades registradas**

A continuación se muestran tus incapacidades:`;

  // Preparar opciones de selección para los botones
  const selectionOptions = incapacidades.map((inc, index) => ({
    index,
    radicado: inc["N° Radicado"] || "N/A",
    periodo: `${inc["Fecha Incio Incapacidad"]} al ${inc["Fecha Fin Incapacidad"]}`,
    dias: inc["Dias Incapacidad"],
    estado: normalizeEstado(inc.estado),
    valor: inc["valor Incapacidad Recibido"],
  }));

  response += `\n\n**🔒 Nota:** Esta información es confidencial y solo visible para ti.`;

  return {
    content: response,
    selectionOptions,
  };
};

/**
 * Determina el icono según el estado
 */
const getStatusIcon = (estado: string): string => {
  switch (estado?.toUpperCase()) {
    case "PAGADA":
    case "RECONOCIDA":
      return "✅";
    case "EN_PROCESO":
      return "🔄";
    case "PENDIENTE_DOCUMENTOS":
      return "📋";
    case "RECHAZADA":
      return "❌";
    default:
      return "ℹ️";
  }
};

/**
 * Genera respuesta completa de incapacidad
 */
export const generateIncapacidadResponse = (
  incapacidad: any,
  includePersonalData: boolean = true,
  includeConfidentialNote: boolean = true,
): string => {
  // Intentar determinar el estado desde diferentes campos posibles
  const estado =
    incapacidad.estado ||
    incapacidad["Estado"] ||
    incapacidad["ESTADO"] ||
    incapacidad["estado_pago"] ||
    incapacidad["Estado Pago"] ||
    "DESCONOCIDO";

  logger.debug("🔍 Estado de incapacidad", {
    estado,
    keys: Object.keys(incapacidad || {}).slice(0, 8),
  });

  // Determinar el estado de reconocimiento de compensación
  const estadoUpper = estado?.toUpperCase() || "";
  const tieneValorRecibido = incapacidad["valor Incapacidad Recibido"] && 
    incapacidad["valor Incapacidad Recibido"].toString().trim() !== "" &&
    incapacidad["valor Incapacidad Recibido"].toString().trim() !== "N/A";
  
  // Determinar si fue reconocida (usando "RECONOCIDA" en lugar de "PAGADA")
  const esEstadoReconocido = estadoUpper === "PAGADA" || estadoUpper === "RECONOCIDA";
  const fueReconocida = esEstadoReconocido || tieneValorRecibido;
  
  // Si el estado es desconocido, no podemos determinar el estado de reconocimiento
  const estadoDesconocido = estadoUpper === "DESCONOCIDO" || !estado || estado.trim() === "";
  
  // Determinar el texto del título y el icono
  let tituloEstado: string;
  let statusIcon: string;
  
  if (estadoDesconocido) {
    // Si el estado es desconocido, usar el estado original
    statusIcon = getStatusIcon(estado);
    tituloEstado = estado;
  } else if (fueReconocida) {
    statusIcon = "✅";
    tituloEstado = "Reconocida";
  } else {
    statusIcon = "⏳";
    tituloEstado = "Pendiente por reconocer";
  }

  // Determinar mensaje según el estado
  let mensajeEstado = "";
  if (fueReconocida) {
    mensajeEstado = "Tu incapacidad ha sido reconocida y el pago ha sido procesado.";
  } else if (!estadoDesconocido) {
    mensajeEstado = "Tu incapacidad está pendiente de reconocimiento y pago.";
  }

  let response = `${statusIcon} **Estado de tu Incapacidad - ${tituloEstado}**\n\n`;

  if (mensajeEstado) {
    response += `${mensajeEstado}\n\n`;
  }

  // Mensaje aclaratorio sobre EPS (más claro y directo)
  response += `💡 **Información importante sobre el pago:**

Cuando la EPS es Sura o Colmena, el pago se realiza a través de ProSalud, quien reconoce y transfiere la incapacidad al afiliado.

Si la EPS es otra, el afiliado debe gestionar el trámite directamente con su EPS por los canales que esta tenga disponibles para el reconocimiento y pago de la incapacidad.

`;

  // Datos personales (solo si se requiere)
  if (includePersonalData) {
    response += `**👤 Tus datos:**

- Nombre: ${incapacidad.Nombres || "N/A"}
- Documento: ${incapacidad.Tipo || "N/A"} ${incapacidad["Numero Documento"] || "N/A"}
${incapacidad.Cargo ? `- Proceso: ${incapacidad.Cargo}\n` : ""}
${incapacidad.Hospital ? `- Hospital: ${incapacidad.Hospital}\n` : ""}

---

`;
  }

  // Información de incapacidad
  response += `**📋 Información de tu incapacidad:**

`;
  
  if (incapacidad["fecha recibido"]) {
    response += `- Fecha recibido: ${incapacidad["fecha recibido"]}\n\n`;
  }
  
  response += `- Fecha inicio: ${incapacidad["Fecha Incio Incapacidad"] || "N/A"}

- Fecha fin: ${incapacidad["Fecha Fin Incapacidad"] || "N/A"}

- Total días: ${incapacidad["Dias Incapacidad"] || "N/A"}

`;

  // Información administrativa
  response += `---

**📄 Información administrativa:**

- N° Radicado: ${incapacidad["N° Radicado"] || "N/A"}

`;
  
  if (incapacidad.RADICADO) {
    response += `- Radicado adicional: ${incapacidad.RADICADO}\n\n`;
  }
  
  if (incapacidad["FECHA ENVIO"]) {
    response += `- Fecha envío: ${incapacidad["FECHA ENVIO"]}\n\n`;
  }

  // Información de reconocimiento de compensación (solo si el estado no es desconocido)
  if (!estadoDesconocido) {
    response += `---

**💰 Estado del pago:**

${fueReconocida ? "✅ Reconocida" : "⏳ Pendiente por reconocer"}

`;
  }

  // Nota de confidencialidad
  if (includeConfidentialNote) {
    response += `---

**🔒 Nota de privacidad:** Esta información es confidencial y solo visible para ti.`;
  }

  return response;
};

/**
 * Genera respuesta para liquidación no encontrada
 */
export const generateLiquidacionNoDataResponse = (formData?: { tipoDocumento?: string; numeroDocumento?: string; fechaExpedicion?: string }): string => {
  // Construir query params si hay datos del formulario
  const queryParams = formData && (formData.tipoDocumento || formData.numeroDocumento || formData.fechaExpedicion)
    ? `?${new URLSearchParams({
        ...(formData.tipoDocumento && { tipoDocumento: formData.tipoDocumento }),
        ...(formData.numeroDocumento && { numeroDocumento: formData.numeroDocumento }),
        ...(formData.fechaExpedicion && { fechaExpedicion: formData.fechaExpedicion }),
      }).toString()}`
    : '';

  return `ℹ️ **No se encontró información de compensación final**

No tenemos información registrada de compensación final asociada al documento consultado en nuestro sistema.

**¿Qué significa esto?**

Esto no es un error del sistema. Puede significar que:
- Tu retiro es reciente y aún no se ha registrado información de compensación final para tu caso
- **Ya se realizó el pago y tu caso no se encuentra pendiente**

**📋 ¿Qué puedes hacer?**

Si necesitas consultar o verificar el estado de tu compensación final, o si ya recibiste el pago y tienes dudas sobre el valor recibido, puedes realizar tu consulta a través del [servicio de verificación de pagos](/servicios/consulta-pagos${queryParams}).

En el formulario podrás:
- Seleccionar el tipo de pago relacionado con tu consulta (Compensación Final)
- Proporcionar los detalles necesarios (mes/año, descripción, etc.)
- Adjuntar documentos de soporte si es necesario

Nuestro equipo revisará tu solicitud y te responderá con la información disponible.

**🔒 Nota de privacidad:** Esta información es confidencial y solo visible para ti.`;
};

/**
 * Genera respuesta con información de liquidación
 */
export const generateLiquidacionResponse = (liquidacion: any): string => {
  // Debug: Log del objeto recibido
  logger.debug("🔍 Objeto liquidación recibido", {
    type: typeof liquidacion,
    keys: Object.keys(liquidacion || {}).slice(0, 10),
  });

  // Mapear los campos de la API a los campos esperados
  const estado = liquidacion["ESTADO BD"] || liquidacion.estado || "DESCONOCIDO";
  const statusIcon = getStatusIcon(estado);

  logger.debug("🔍 Estado de liquidación identificado", { estado });

  // PRIMERO: Verificar OBSERVACIONES - tiene mayor prioridad
  const observaciones = liquidacion["OBSERVACIONES"];
  const observacionesUpper = observaciones ? observaciones.trim().toUpperCase() : "";
  const esCarpetaCompleta = observacionesUpper === "CARPETA COMPLETA" || observacionesUpper === "COMPLETA";

  // Función helper para determinar si un documento está completo
  // N/A significa "No Aplica" y se considera completo (especialmente para CARTA RETIRO)
  const isDocumentoCompleto = (valor: string | undefined | null, esCartaRetiro: boolean = false): boolean => {
    // Si está vacío, es pendiente
    if (!valor || valor.toString().trim() === "") return false;
    
    const valorUpper = valor.toString().trim().toUpperCase();
    
    // N/A significa "No Aplica" - se considera completo
    if (valorUpper === "N/A") return true;
    
    // Valores que indican que el documento está completo
    const valoresCompletos = ["OK", "COMPLETO", "ENTREGADO", "FIRMADO", "APROBADO"];
    // Valores que indican que el documento está pendiente
    const valoresPendientes = ["PTE", "PENDIENTE", "PEND"];
    
    // Si está en la lista de pendientes, no está completo
    if (valoresPendientes.includes(valorUpper)) return false;
    // Si está en la lista de completos, está completo
    if (valoresCompletos.includes(valorUpper)) return true;
    // Si no coincide con ninguno, considerar pendiente por seguridad
    return false;
  };

  // Verificar cada tipo de documento
  const solicitudAfiliacion = liquidacion["SOLICITUD AFILIACION"];
  const actaEntendimiento = liquidacion["ACTA DE ENTENDIMIENTO"];
  const actaCompromiso = liquidacion["ACTA DE COMPROMISO"];
  const cartaRetiro = liquidacion["CARTA RETIRO"];

  const solicitudCompleta = isDocumentoCompleto(solicitudAfiliacion);
  const actaEntendimientoCompleta = isDocumentoCompleto(actaEntendimiento);
  const actaCompromisoCompleta = isDocumentoCompleto(actaCompromiso);
  const cartaRetiroCompleta = isDocumentoCompleto(cartaRetiro, true); // true indica que es carta de retiro

  // Determinar si hay documentos pendientes desde el campo DTOS PENDIENTES
  const documentosPendientesRaw = liquidacion["DTOS PENDIENTES"];
  let documentosPendientes: string | null = null;
  let tieneDocumentosPendientes = false;

  if (documentosPendientesRaw && documentosPendientesRaw.toString().trim() !== "" && documentosPendientesRaw.toString().trim().toUpperCase() !== "N/A") {
    const documentosUpper = documentosPendientesRaw.toString().trim().toUpperCase();
    if (documentosUpper !== "NINGUNO") {
      documentosPendientes = documentosPendientesRaw.toString().trim();
      tieneDocumentosPendientes = true;
    }
  }

  // Verificar si hay documentos individuales pendientes
  // Si OBSERVACIONES dice "CARPETA COMPLETA" o "COMPLETA", no hay pendientes individuales
  const tieneDocumentosIndividualesPendientes = esCarpetaCompleta ? false : (
    !solicitudCompleta || 
    !actaEntendimientoCompleta || 
    !actaCompromisoCompleta || 
    !cartaRetiroCompleta
  );

  // Verificar convenios pendientes
  const conveniosPendientes = liquidacion["N° CONVENIOS PENDIENTES"];
  const tieneConveniosPendientes = conveniosPendientes && 
    conveniosPendientes.toString().trim() !== "" && 
    conveniosPendientes.toString().trim() !== "0" &&
    conveniosPendientes.toString().trim() !== "N/A";

  // Determinar si realmente hay pendientes
  // Si OBSERVACIONES dice "CARPETA COMPLETA" o "COMPLETA", no hay pendientes (mayor prioridad)
  const hayPendientesReales = esCarpetaCompleta ? false : (
    tieneDocumentosPendientes || 
    tieneDocumentosIndividualesPendientes || 
    tieneConveniosPendientes
  );

  // Generar respuesta según el estado
  let response = "";

  if (hayPendientesReales) {
    response += `⚠️ **Estado de tu Compensación Final**

Tienes pendientes en tu compensación final

💡 *La compensación final está sujeta al recaudo previo de la cartera correspondiente del hospital.*

*Si la cartera ya fue recaudada pero la persona tiene documentación pendiente, el proceso se detiene hasta completarlos.*

*Mantén tu documentación al día para que el pago se realice apenas se confirme el recaudo.*

`;
  } else {
    // Cuando no hay pendientes, verificar si la carpeta está completa
    const carpetaCompleta = esCarpetaCompleta || (
      solicitudCompleta && 
      actaEntendimientoCompleta && 
      actaCompromisoCompleta && 
      cartaRetiroCompleta && 
      !tieneConveniosPendientes &&
      !tieneDocumentosPendientes
    );
    
    if (carpetaCompleta) {
      // Carpeta completa pero compensación pendiente por recaudo de cartera
      response += `✅ **Estado de tu Compensación Final**

Todos tus documentos están completos y al día

📋 **Estado del pago:**

Tu compensación final está pendiente de pago porque aún no se ha realizado el recaudo previo de la cartera correspondiente del hospital.

Una vez que el hospital complete el recaudo de la cartera, tu pago será procesado automáticamente, ya que tu documentación está completa.

💡 *No necesitas realizar ninguna acción adicional. El pago se realizará tan pronto como se confirme el recaudo de la cartera del hospital.*

`;
    } else {
      response += `${statusIcon} **Estado de tu Compensación Final**

Tu compensación final está en proceso

💡 *La compensación final está sujeta al recaudo previo de la cartera correspondiente del hospital.*

*Si la cartera ya fue recaudada pero la persona tiene documentación pendiente, el proceso se detiene hasta completarlos.*

*Mantén tu documentación al día para que el pago se realice apenas se confirme el recaudo.*

`;
    }
  }

  // Datos del afiliado
  response += `**👤 Tus datos:**

- Nombre: ${liquidacion["NOMBRE"] || liquidacion.nombre || "N/A"}
- Documento: ${liquidacion["TIPO DE DOCUMENTO"] || liquidacion.tipo_documento || "N/A"} ${liquidacion["N° DOCUMENTO"] || liquidacion.numero_documento || "N/A"}

---

`;

  // Información del proceso
  if (liquidacion["HOSPITAL"] || liquidacion["PROCESO"] || liquidacion["FECHA RETIRO"]) {
    response += `**🏥 Información del Proceso:**

${liquidacion["HOSPITAL"] ? `- Hospital: ${liquidacion["HOSPITAL"]}` : ""}
${liquidacion["PROCESO"] ? `- Proceso: ${liquidacion["PROCESO"]}` : ""}
${liquidacion["FECHA RETIRO"] ? `- Fecha retiro: ${liquidacion["FECHA RETIRO"]}` : ""}

---

`;
  }

  // Convenios
  if (liquidacion["CONVENIOS"] || liquidacion["N° CONVENIOS FIRMADOS"] || liquidacion["N° CONVENIOS PENDIENTES"]) {
    response += `**📑 Convenios:**

${liquidacion["CONVENIOS"] ? `- Total de convenios: ${liquidacion["CONVENIOS"]}` : ""}
${liquidacion["N° CONVENIOS FIRMADOS"] ? `- Convenios firmados: ${liquidacion["N° CONVENIOS FIRMADOS"]}` : ""}
${liquidacion["N° CONVENIOS PENDIENTES"] ? `- Convenios pendientes: ${liquidacion["N° CONVENIOS PENDIENTES"]}` : ""}

---

`;
  }

  // Estado de documentos detallado
  response += `**📄 Estado de tus documentos:**

`;

  // Determinar el estado de cada documento para mostrar
  const getEstadoDocumento = (completo: boolean, valor: string | undefined | null): string => {
    if (completo) {
      // Si es N/A, mostrar "No aplica" en lugar de "Entregado y completo"
      if (valor && valor.toString().trim().toUpperCase() === "N/A") {
        return "No aplica";
      }
      return "Entregado y completo";
    }
    return "Pendiente por entregar";
  };

  response += `${solicitudCompleta ? "✅" : "⏳"} Solicitud de afiliación: ${getEstadoDocumento(solicitudCompleta, solicitudAfiliacion)}

${actaEntendimientoCompleta ? "✅" : "⏳"} Acta de entendimiento: ${getEstadoDocumento(actaEntendimientoCompleta, actaEntendimiento)}

${actaCompromisoCompleta ? "✅" : "⏳"} Acta de compromiso: ${getEstadoDocumento(actaCompromisoCompleta, actaCompromiso)}

${cartaRetiroCompleta ? "✅" : "⏳"} Carta de retiro: ${getEstadoDocumento(cartaRetiroCompleta, cartaRetiro)}

`;

  // Función para traducir abreviaciones técnicas a lenguaje comprensible
  const traducirAbreviaciones = (texto: string): string => {
    if (!texto || texto.trim() === "") return texto;
    
    let textoTraducido = texto;
    
    // Primero traducir frases completas (deben ir antes de las abreviaciones individuales)
    const frasesCompletas: Record<string, string> = {
      "CARTA RETIRO": "Carta de retiro sindical",
      "CARTA DE RETIRO": "Carta de retiro sindical",
    };
    
    Object.entries(frasesCompletas).forEach(([frase, traduccion]) => {
      const regex = new RegExp(frase.replace(/\s+/g, "\\s+"), "gi");
      textoTraducido = textoTraducido.replace(regex, traduccion);
    });
    
    // Mapeo de abreviaciones técnicas a términos comprensibles
    const abreviaciones: Record<string, string> = {
      "PT": "Pendiente",
      "CONV": "Convenio",
      "SOL": "Solicitud",
    };
    
    // Reemplazar abreviaciones (solo palabras completas, no partes de palabras)
    // Usar expresiones regulares con límites de palabra para evitar reemplazos parciales
    Object.entries(abreviaciones).forEach(([abrev, traduccion]) => {
      // Buscar la abreviación como palabra completa (precedida y seguida por espacio, inicio/fin de línea, o guión)
      const regex = new RegExp(`\\b${abrev}\\b`, "gi");
      textoTraducido = textoTraducido.replace(regex, traduccion);
    });
    
    return textoTraducido;
  };

  // Función para parsear documentos pendientes de manera inteligente
  // No divide por guiones que están entre números (años), ej: "PT CONV 2024 - 2025"
  const parsearDocumentosPendientes = (texto: string): string[] => {
    if (!texto || texto.trim() === "") return [];
    
    // Patrón para detectar años con guión (ej: "2024 - 2025" o "2024-2025")
    // Buscamos números seguidos de guión(es) y espacios opcionales y más números
    const patronAnos = /\d{4}\s*-\s*\d{4}/g;
    
    // Reemplazar temporalmente los guiones entre años con un marcador especial
    const marcador = "___AÑOS___";
    const textoConMarcadores = texto.replace(patronAnos, (match) => {
      return match.replace(/-/g, marcador);
    });
    
    // Ahora dividir por guiones que no sean los marcadores
    const documentos = textoConMarcadores
      .split("-")
      .map(doc => {
        // Restaurar los guiones de años
        return doc.replace(new RegExp(marcador, "g"), "-").trim();
      })
      .filter(doc => doc !== "");
    
    return documentos;
  };

  // Parsear documentos pendientes una sola vez
  let documentosLista: string[] = [];
  let documentosListaOriginal: string[] = [];
  if (tieneDocumentosPendientes && documentosPendientes) {
    documentosListaOriginal = parsearDocumentosPendientes(documentosPendientes);
    documentosLista = documentosListaOriginal.map(doc => doc.toUpperCase());
  }

  // Detalle de documentos pendientes específicos (con traducción de abreviaciones)
  if (tieneDocumentosPendientes && documentosListaOriginal.length > 0) {
    response += `⚠️ **Detalle de documentos pendientes:**

${documentosListaOriginal.map(doc => `- ${traducirAbreviaciones(doc)}`).join("\n")}

`;
  }

  // Instrucciones específicas según lo que está pendiente
  const instruccionesPendientes: string[] = [];

  // Detectar si hay carta de retiro pendiente en DTOS PENDIENTES o en el campo individual
  const tieneCartaRetiroEnPendientes = documentosLista.some(doc => 
    (doc.includes("CARTA") && doc.includes("RETIRO")) || doc === "CARTA RETIRO" || doc === "CARTA DE RETIRO"
  );
  const cartaRetiroEsNA = cartaRetiro && cartaRetiro.toString().trim().toUpperCase() === "N/A";
  
  // Instrucciones para carta de retiro pendiente
  // Mostrar si: está pendiente individualmente (y no es N/A) O está en DTOS PENDIENTES
  if ((!cartaRetiroCompleta && !cartaRetiroEsNA) || tieneCartaRetiroEnPendientes) {
    instruccionesPendientes.push(`**📝 Carta de retiro pendiente:**

Para entregar tu carta de retiro, debes:

1. Acceder a la [página de solicitud de retiro sindical](/servicios/retiro-sindical)
2. Realizar la solicitud de retiro sindical a través del sitio web
3. Anexar la carta de retiro con el formato indicado en el formulario

`);
  }

  // Detectar si hay actas pendientes en DTOS PENDIENTES
  const tieneActasEnPendientes = documentosLista.some(doc => 
    doc.includes("ACTA") && (doc.includes("COMPROMISO") || doc.includes("ENTENDIMIENTO"))
  );

  // Instrucciones para actas pendientes
  if ((!actaEntendimientoCompleta || !actaCompromisoCompleta) || tieneActasEnPendientes) {
    instruccionesPendientes.push(`**📋 Actas pendientes:**

Para solicitar y enviar las actas pendientes (Acta de entendimiento o Acta de compromiso), contacta con:

📧 **talentohumano@sindicatoprosalud.com**

Ellos te indicarán cómo proceder y dónde enviar los documentos.

`);
  }

  // Detectar si hay convenios pendientes en DTOS PENDIENTES
  const tieneConveniosEnPendientes = documentosLista.some(doc => 
    doc.includes("CONVENIO") || doc.includes("CONV")
  );

  // Instrucciones para convenios pendientes
  if (tieneConveniosPendientes || tieneConveniosEnPendientes) {
    instruccionesPendientes.push(`**📑 Convenios pendientes:**

Para solicitar y enviar los convenios pendientes, contacta por correo electrónico:

📧 **talentohumano@sindicatoprosalud.com**

`);
  }

  // Instrucciones para otros documentos pendientes que no sean los específicos ya cubiertos
  const documentosCubiertos = ["CARTA", "RETIRO", "ACTA", "COMPROMISO", "ENTENDIMIENTO", "CONVENIO", "CONV"];
  const tieneOtrosDocumentos = documentosLista.some(doc => 
    !documentosCubiertos.some(cubierto => doc.includes(cubierto))
  );

  if (tieneOtrosDocumentos && !instruccionesPendientes.length) {
    // Filtrar solo los documentos no cubiertos
    const otrosDocs = documentosLista
      .filter(doc => !documentosCubiertos.some(cubierto => doc.includes(cubierto)))
      .join(", ");
    
    instruccionesPendientes.push(`**📄 Documentos pendientes adicionales:**

Para solicitar y enviar los documentos pendientes (${otrosDocs}), contacta con:

📧 **talentohumano@sindicatoprosalud.com**

Ellos te indicarán cómo proceder y dónde enviar los documentos.

`);
  }

  // Agregar instrucciones si hay pendientes
  if (instruccionesPendientes.length > 0) {
    // Solo agregar separador si hay contenido antes de las instrucciones
    // (como "Detalle de documentos pendientes")
    const hayContenidoAntes = tieneDocumentosPendientes && documentosListaOriginal.length > 0;
    response += `${hayContenidoAntes ? "---\n\n" : ""}**📋 ¿Qué debes hacer?**

${instruccionesPendientes.join("\n")}`;
  }

  // Observaciones (traducir valores técnicos a lenguaje comprensible)
  const observacionesValidas = observaciones && 
    observaciones !== "N/A" && 
    observaciones !== "" &&
    observaciones.trim() !== "";

  if (observacionesValidas) {
    // Traducir valores técnicos a lenguaje comprensible
    let observacionesTraducidas = observaciones;
    
    if (observacionesUpper === "CARPETA COMPLETA" || observacionesUpper === "COMPLETA") {
      observacionesTraducidas = "Todos tus documentos están completos";
    } else if (observacionesUpper === "DTOS PENDIENTES" || observacionesUpper === "DOCUMENTOS PENDIENTES") {
      // Si ya se mostraron los detalles de documentos pendientes, no duplicar
      if (tieneDocumentosPendientes || tieneDocumentosIndividualesPendientes) {
        observacionesTraducidas = null;
      } else {
        observacionesTraducidas = "Tienes documentos pendientes por entregar";
      }
    }
    
    // Solo mostrar observaciones si hay algo que mostrar y no es redundante
    if (observacionesTraducidas) {
      response += `---

**📋 Observaciones:**

${observacionesTraducidas}

`;
    }
  }

  // Mensaje de ayuda contextual
  if (hayPendientesReales) {
    // Verificar si hay pendientes que requieren contacto por email
    const tienePendientesQueRequierenEmail = 
      !actaEntendimientoCompleta || 
      !actaCompromisoCompleta || 
      tieneConveniosPendientes || 
      tieneDocumentosPendientes;

    // Si ya se mostraron instrucciones con email, solo agregar mensaje adicional si hay múltiples tipos
    // Si solo carta de retiro está pendiente, mostrar mensaje más simple
    if (!cartaRetiroCompleta && !tienePendientesQueRequierenEmail) {
      // Solo carta de retiro pendiente - las instrucciones del sitio web ya son claras
      response += `---

**📩 ¿Necesitas ayuda adicional?**

Si tienes dudas sobre cómo realizar la solicitud de retiro sindical o necesitas asistencia, contáctanos:

📧 **talentohumano@sindicatoprosalud.com**

`;
    } else if (instruccionesPendientes.length > 0) {
      // Ya se mostraron instrucciones específicas
      response += `---

**📩 ¿Necesitas ayuda adicional?**

Si tienes más dudas o necesitas asistencia, contáctanos:

📧 **talentohumano@sindicatoprosalud.com**

`;
    } else {
      // No se mostraron instrucciones específicas, mostrar mensaje genérico
      response += `---

**📩 ¿Necesitas ayuda o tienes dudas?**

Contáctanos vía correo electrónico para solicitar y enviar los documentos pendientes:

📧 **talentohumano@sindicatoprosalud.com**

`;
    }
  } else {
    response += `---

**📩 ¿Necesitas ayuda o tienes dudas?**

Si tienes alguna pregunta sobre tu compensación final, contáctanos:

📧 **talentohumano@sindicatoprosalud.com**

`;
  }

  response += `**🔒 Nota de privacidad:** Esta información es confidencial y solo visible para ti.`;

  logger.debug("🔍 Respuesta de liquidación generada", {
    length: response.length,
  });
  return response;
};

/**
 * Formatea el contexto de incapacidades para el prompt
 */
export const formatIncapacidadesContext = (incapacidades: any[]): string => {
  if (!incapacidades || incapacidades.length === 0) {
    return "No hay incapacidades disponibles.";
  }

  let context = `**Información de incapacidades disponibles:**\n\n`;

  incapacidades.forEach((inc, index) => {
    context += `**Incapacidad ${index + 1}:**
- Radicado: ${inc["N° Radicado"] || "N/A"}
- Período: ${inc["Fecha Incio Incapacidad"]} al ${inc["Fecha Fin Incapacidad"]}
- Días: ${inc["Dias Incapacidad"]}
- Estado: ${inc.estado || "N/A"}
${inc["valor Incapacidad Recibido"] ? `- Valor: ${inc["valor Incapacidad Recibido"]}` : ""}

`;
  });

  return context;
};
