/**
 * Generadores de respuestas para consultas de incapacidades y liquidaciones
 */

/**
 * Genera respuesta cuando no se encuentran datos
 */
export const generateNoDataResponse = (): string => {
  return `ℹ️ **No se encontraron registros de incapacidad**

No encontramos información de incapacidades asociadas al documento consultado.

**Posibles razones:**
• No hay incapacidades registradas con estos datos
• La información aún no ha sido procesada en el sistema
• Los datos ingresados no coinciden con nuestros registros

**¿Necesitas ayuda?**
Si crees que debería haber información disponible, por favor comunícate con nosotros para verificar el estado de tu solicitud.

**🔒 Nota:** Esta consulta es confidencial y solo visible para ti.`;
};

/**
 * Genera respuesta de error del servidor
 */
export const generateServerErrorResponse = (): string => {
  return `⚠️ **Error del servidor**

Lo sentimos, estamos experimentando problemas técnicos temporales.

**¿Qué puedes hacer?**
• Intenta nuevamente en unos minutos
• Si el problema persiste, comunícate con nosotros

**🔒 Nota:** Esta consulta es confidencial y solo visible para ti.`;
};

/**
 * Genera respuesta de error de validación
 */
export const generateValidationErrorResponse = (errors: any): string => {
  return `❌ **Error en los datos ingresados**

Los datos proporcionados no son válidos:

${errors ? JSON.stringify(errors, null, 2) : "• Verifica que todos los campos estén completos"}

**¿Qué puedes hacer?**
• Revisa los datos ingresados
• Asegúrate de que el formato sea correcto
• Intenta nuevamente

**🔒 Nota:** Esta consulta es confidencial y solo visible para ti.`;
};

/**
 * Genera respuesta genérica de error
 */
export const generateGenericErrorResponse = (): string => {
  return `❌ **Error en la consulta**

No pudimos procesar tu solicitud en este momento.

**¿Qué puedes hacer?**
• Intenta nuevamente en unos minutos
• Si el problema persiste, comunícate con nosotros

**🔒 Nota:** Esta consulta es confidencial y solo visible para ti.`;
};

/**
 * Genera respuesta con múltiples incapacidades
 */
export const generateMultipleIncapacidadesResponse = (incapacidades: any[]): string => {
  let response = `📋 **Se encontraron ${incapacidades.length} incapacidades registradas**

A continuación se muestran tus incapacidades:\n\n`;

  incapacidades.forEach((inc, index) => {
    const statusIcon =
      inc.estado === "PAGADA"
        ? "✅"
        : inc.estado === "EN_PROCESO"
          ? "🔄"
          : inc.estado === "PENDIENTE_DOCUMENTOS"
            ? "📋"
            : inc.estado === "RECHAZADA"
              ? "❌"
              : "ℹ️";

    response += `**${index + 1}. ${statusIcon} Incapacidad**
- Radicado: ${inc["N° Radicado"] || "N/A"}
- Período: ${inc["Fecha Incio Incapacidad"]} al ${inc["Fecha Fin Incapacidad"]}
- Días: ${inc["Dias Incapacidad"]}
- Estado: ${inc.estado}
${inc["valor Incapacidad Recibido"] ? `- Valor: ${inc["valor Incapacidad Recibido"]}` : ""}

`;
  });

  response += `**¿Qué deseas hacer?**
- Escribe el **número** de la incapacidad que deseas ver en detalle (ejemplo: 1, 2, 3...)
- Escribe el **número de radicado** de la incapacidad que deseas consultar
- O escribe **"todas"** para ver el detalle completo de todas

**🔒 Nota:** Esta información es confidencial y solo visible para ti.`;

  return response;
};

/**
 * Determina el icono según el estado
 */
const getStatusIcon = (estado: string): string => {
  switch (estado?.toUpperCase()) {
    case "PAGADA":
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

  console.log("🔍 Estado de incapacidad:", estado, "Objeto completo:", incapacidad);

  const statusIcon = getStatusIcon(estado);

  let response = `${statusIcon} **Detalle de tu incapacidad - ${estado}**\n\n`;

  // Mensaje aclaratorio sobre EPS
  response += `💡 *Cuando la EPS es Sura o Colmena, el pago se realiza a través de ProSalud, quien reconoce y transfiere la incapacidad al afiliado.*\n\n*Si la EPS es otra, el afiliado debe gestionar el trámite directamente con su EPS por los canales que esta tenga disponibles para el reconocimiento y pago de la incapacidad.*\n\n`;

  // Datos personales (solo si se requiere)
  if (includePersonalData) {
    response += `**👤 Datos personales:**
- Nombre: ${incapacidad.Nombres || "N/A"}
- Tipo documento: ${incapacidad.Tipo || "N/A"}
- Número documento: ${incapacidad["Numero Documento"] || "N/A"}
${incapacidad.Cargo ? `- Proceso: ${incapacidad.Cargo}\n` : ""}
${incapacidad.Hospital ? `- Hospital: ${incapacidad.Hospital}\n` : ""}

`;
  }

  // Información de incapacidad
  response += `**📋 Información de incapacidad:**
${incapacidad["fecha recibido"] ? `- Fecha recibido: ${incapacidad["fecha recibido"]}\n` : ""}- Fecha inicio: ${incapacidad["Fecha Incio Incapacidad"] || "N/A"}
- Fecha fin: ${incapacidad["Fecha Fin Incapacidad"] || "N/A"}
- Total días: ${incapacidad["Dias Incapacidad"] || "N/A"}
${incapacidad["TIPO INCAPACIDAD"] ? `- Tipo: ${incapacidad["TIPO INCAPACIDAD"]}\n` : ""}${incapacidad.CLASIFICACION ? `- Clasificación: ${incapacidad.CLASIFICACION}\n` : ""}
${incapacidad.ADMINISTRADORA ? `- Administradora: ${incapacidad.ADMINISTRADORA}\n` : ""}
`;

  // Información administrativa
  response += `**📄 Información administrativa:**
- N° Radicado: ${incapacidad["N° Radicado"] || "N/A"}
${incapacidad.RADICADO ? `- Radicado adicional: ${incapacidad.RADICADO}\n` : ""}${incapacidad["FECHA ENVIO"] ? `- Fecha envío: ${incapacidad["FECHA ENVIO"]}\n` : ""}
`;

  // Información de pago
  if (incapacidad["valor Incapacidad Recibido"]) {
    response += `**💰 Información de pago:**
- Valor recibido: ${incapacidad["valor Incapacidad Recibido"]}
- Estado: ${estado}

`;
  }

  // Nota de confidencialidad
  if (includeConfidentialNote) {
    response += `\n**🔒 Nota:** Esta información es confidencial y solo visible para ti.`;
  }

  return response;
};

/**
 * Genera respuesta para liquidación no encontrada
 */
export const generateLiquidacionNoDataResponse = (): string => {
  return `ℹ️ **No se encontraron registros de compensación final**

No encontramos información de compensación final asociada al documento consultado.

**Posibles razones:**
• No hay solicitud de compensación registrada con estos datos
• La información aún no ha sido procesada en el sistema
• Los datos ingresados no coinciden con nuestros registros

**¿Necesitas ayuda?**
Si crees que debería haber información disponible, por favor comunícate con nosotros para verificar el estado de tu solicitud.

**🔒 Nota:** Esta consulta es confidencial y solo visible para ti.`;
};

/**
 * Genera respuesta con información de liquidación
 */
export const generateLiquidacionResponse = (liquidacion: any): string => {
  // Debug: Log del objeto recibido
  console.log("🔍 DEBUG - Objeto liquidacion recibido:", liquidacion);
  console.log("🔍 DEBUG - Tipo de liquidacion:", typeof liquidacion);
  console.log("🔍 DEBUG - Keys del objeto:", Object.keys(liquidacion || {}));

  // Mapear los campos de la API a los campos esperados
  const estado = liquidacion["ESTADO BD"] || liquidacion.estado || "DESCONOCIDO";
  const statusIcon = getStatusIcon(estado);

  console.log("🔍 DEBUG - Estado encontrado:", estado);

  // Determinar si hay documentos pendientes
  const documentosPendientes =
    liquidacion["DTOS PENDIENTES"] && liquidacion["DTOS PENDIENTES"] !== "N/A" && liquidacion["DTOS PENDIENTES"] !== ""
      ? liquidacion["DTOS PENDIENTES"]
      : null;

  const tieneDocumentosPendientes =
    documentosPendientes &&
    documentosPendientes.trim() !== "" &&
    documentosPendientes.trim().toUpperCase() !== "NINGUNO";

  // Generar respuesta según el estado
  let response = "";

  if (tieneDocumentosPendientes) {
    response += `⚠️ **Estado de tu Compensación Final**

Tienes pendientes en tu compensación final

**Lo que necesitas completar:**

• Documentos pendientes: ${documentosPendientes}

💡 *La compensación final está sujeta al recaudo previo de la cartera correspondiente del hospital.*

*Si la cartera ya fue recaudada pero la persona tiene documentación pendiente, el proceso se detiene hasta completarlos.*

*Mantén tu documentación al día para que el pago se realice apenas se confirme el recaudo.*

`;
  } else {
    response += `${statusIcon} **Estado de tu Compensación Final**

Tu compensación final está en proceso

💡 *La compensación final está sujeta al recaudo previo de la cartera correspondiente del hospital.*

*Si la cartera ya fue recaudada pero la persona tiene documentación pendiente, el proceso se detiene hasta completarlos.*

*Mantén tu documentación al día para que el pago se realice apenas se confirme el recaudo.*

`;
  }

  // Datos del afiliado
  response += `**👤 Tus datos:**

- Nombre: ${liquidacion["NOMBRE"] || liquidacion.nombre || "N/A"}
- Documento: ${liquidacion["TIPO DE DOCUMENTO"] || liquidacion.tipo_documento || "N/A"} ${liquidacion["N° DOCUMENTO"] || liquidacion.numero_documento || "N/A"}
- Fecha expedición: ${liquidacion["FECHA EXPEDICION"] || liquidacion.fecha_expedicion || "N/A"}

`;

  // Información del proceso
  if (liquidacion["HOSPITAL"] || liquidacion["PROCESO"] || liquidacion["FECHA RETIRO"]) {
    response += `**🏥 Información del Proceso:**

${liquidacion["HOSPITAL"] ? `- Hospital: ${liquidacion["HOSPITAL"]}` : ""}
${liquidacion["PROCESO"] ? `- Proceso: ${liquidacion["PROCESO"]}` : ""}
${liquidacion["FECHA RETIRO"] ? `- Fecha retiro: ${liquidacion["FECHA RETIRO"]}` : ""}

`;
  }

  // Convenios
  if (liquidacion["CONVENIOS"] || liquidacion["N° CONVENIOS FIRMADOS"] || liquidacion["N° CONVENIOS PENDIENTES"]) {
    response += `**📑 Convenios:**

${liquidacion["CONVENIOS"] ? `- Total de convenios: ${liquidacion["CONVENIOS"]}` : ""}
${liquidacion["N° CONVENIOS FIRMADOS"] ? `- Convenios firmados: ${liquidacion["N° CONVENIOS FIRMADOS"]}` : ""}
${liquidacion["N° CONVENIOS PENDIENTES"] ? `- Convenios pendientes: ${liquidacion["N° CONVENIOS PENDIENTES"]}` : ""}

`;
  }

  // Estado de documentos detallado
  response += `**📄 Estado de tus documentos:**

`;

  // Verificar cada tipo de documento
  const solicitudAfiliacion = liquidacion["SOLICITUD AFILIACION"];
  const actaEntendimiento = liquidacion["ACTA DE ENTENDIMIENTO"];
  const actaCompromiso = liquidacion["ACTA DE COMPROMISO"];
  const cartaRetiro = liquidacion["CARTA RETIRO"];

  response += `${solicitudAfiliacion && solicitudAfiliacion !== "N/A" ? "✅" : "⏳"} Solicitud de afiliación: ${solicitudAfiliacion && solicitudAfiliacion !== "N/A" ? "Entregado y completo" : "Pendiente por entregar"}\n\n${actaEntendimiento && actaEntendimiento !== "N/A" ? "✅" : "⏳"} Acta de entendimiento: ${actaEntendimiento && actaEntendimiento !== "N/A" ? "Entregado y completo" : "Pendiente por entregar"}\n\n${actaCompromiso && actaCompromiso !== "N/A" ? "✅" : "⏳"} Acta de compromiso: ${actaCompromiso && actaCompromiso !== "N/A" ? "Entregado y completo" : "Pendiente por entregar"}\n\n${cartaRetiro && cartaRetiro !== "N/A" ? "✅" : "⏳"} Carta de retiro: ${cartaRetiro && cartaRetiro !== "N/A" ? "Entregado y completo" : "Pendiente por entregar"}\n\n`;

  // Detalle de documentos pendientes
  if (tieneDocumentosPendientes) {
    response += `⚠️ **Detalle de documentos pendientes:** ${documentosPendientes}

`;
  }

  // Observaciones
  if (liquidacion["OBSERVACIONES"] && liquidacion["OBSERVACIONES"] !== "N/A" && liquidacion["OBSERVACIONES"] !== "") {
    response += `**📋 Observaciones:**

${liquidacion["OBSERVACIONES"]}

`;
  }

  // Mensaje de ayuda
  response += `**📩 ¿Necesitas ayuda o tienes dudas?**

Contáctanos vía correo electrónico para solicitar y enviar los documentos pendientes: **talentohumano@sindicatoprosalud.com**

`;

  response += `**🔒 Nota de privacidad:** Esta información es confidencial y solo visible para ti.`;

  console.log("🔍 DEBUG - Respuesta generada:", response);
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
