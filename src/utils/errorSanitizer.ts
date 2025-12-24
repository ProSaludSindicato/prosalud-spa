/**
 * Función utilitaria para sanitizar mensajes de error y mostrar
 * solo información amigable al usuario, sin exponer detalles técnicos.
 */

interface SanitizedError {
  message: string;
  type: 'validation' | 'server' | 'network' | 'not_found' | 'unauthorized' | 'unknown';
}

/**
 * Diccionario completo de traducciones inglés -> español para mensajes de error
 */
const errorTranslations: Record<string, string> = {
  // Mensajes comunes de validación
  'the field is required': 'el campo es obligatorio',
  'is required': 'es obligatorio',
  'required': 'es obligatorio',
  'must be provided': 'debe ser proporcionado',
  'must be a valid email': 'debe ser un correo electrónico válido',
  'must be a valid email address': 'debe ser un correo electrónico válido',
  'must be a valid': 'debe ser un',
  'invalid email': 'correo electrónico inválido',
  'invalid format': 'formato inválido',
  'exceeds maximum': 'excede el máximo',
  'exceeds the maximum': 'excede el máximo',
  'may not be greater than': 'no puede ser mayor que',
  'must not be greater than': 'no debe ser mayor que',
  'must be less than': 'debe ser menor que',
  'must be at least': 'debe tener al menos',
  'must be at most': 'debe tener como máximo',
  'minimum': 'mínimo',
  'maximum': 'máximo',
  'too long': 'demasiado largo',
  'too short': 'demasiado corto',
  'too large': 'demasiado grande',
  'too small': 'demasiado pequeño',
  'must be a string': 'debe ser texto',
  'must be a number': 'debe ser un número',
  'must be an integer': 'debe ser un número entero',
  'must be numeric': 'debe ser numérico',
  'must be one of': 'debe ser uno de',
  'not found': 'no encontrado',
  'already exists': 'ya existe',
  'has already been taken': 'ya ha sido tomado',
  'is already taken': 'ya está en uso',
  'does not exist': 'no existe',
  'failed': 'falló',
  'error': 'error',
  'not allowed': 'no permitido',
  'invalid': 'inválido',
  'must be': 'debe ser',
  'must have': 'debe tener',
  'must match': 'debe coincidir',
  'does not match': 'no coincide',
  
  // Mensajes de servidor
  'internal server error': 'error interno del servidor',
  'server error': 'error del servidor',
  'service unavailable': 'servicio no disponible',
  'bad gateway': 'puerta de enlace incorrecta',
  'gateway timeout': 'tiempo de espera agotado',
  'connection failed': 'fallo de conexión',
  'connection error': 'error de conexión',
  'network error': 'error de red',
  'request failed': 'solicitud fallida',
  'request timeout': 'tiempo de solicitud agotado',
  
  // Mensajes de autenticación/autorización
  'unauthorized': 'no autorizado',
  'forbidden': 'prohibido',
  'authentication failed': 'autenticación fallida',
  'invalid credentials': 'credenciales inválidas',
  'token expired': 'token expirado',
  'session expired': 'sesión expirada',
  
  // Mensajes de archivos
  'file is too large': 'el archivo es demasiado grande',
  'file size exceeds': 'el tamaño del archivo excede',
  'invalid file type': 'tipo de archivo inválido',
  'file not found': 'archivo no encontrado',
  'could not upload': 'no se pudo cargar',
  'upload failed': 'carga fallida',
  
  // Mensajes genéricos
  'an error occurred': 'ocurrió un error',
  'something went wrong': 'algo salió mal',
  'please try again': 'por favor intente nuevamente',
  'contact administrator': 'contacte al administrador',
  'unexpected error': 'error inesperado',
};

/**
 * Traduce un mensaje de error del inglés al español
 */
const translateToSpanish = (message: string): string => {
  let translated = message.trim();
  const originalMessage = translated;
  const lowerMessage = translated.toLowerCase();
  
  // Si el mensaje ya está en español (contiene caracteres especiales del español), retornarlo
  if (/[áéíóúñÁÉÍÓÚÑ]/.test(translated)) {
    return translated;
  }
  
  // Ordenar las traducciones de más específicas a menos específicas (por longitud)
  const sortedTranslations = Object.entries(errorTranslations).sort((a, b) => b[0].length - a[0].length);
  
  // Buscar y reemplazar traducciones (de más específicas a menos específicas)
  for (const [english, spanish] of sortedTranslations) {
    const regex = new RegExp(english.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    if (regex.test(translated)) {
      translated = translated.replace(regex, spanish);
    }
  }
  
  // Traducir frases comunes de Laravel con patrones más específicos
  translated = translated.replace(/\bthe\s+([a-z_]+)\s+field\s+is\s+required\b/gi, 'el campo $1 es obligatorio');
  translated = translated.replace(/\bthe\s+([a-z_]+)\s+field\s+must\s+be\s+([^\.]+)\b/gi, 'el campo $1 debe ser $2');
  translated = translated.replace(/\bthe\s+([a-z_]+)\s+field\s+may\s+not\s+be\s+greater\s+than\s+(\d+)\b/gi, 'el campo $1 no puede ser mayor que $2');
  translated = translated.replace(/\bthe\s+([a-z_]+)\s+field\s+must\s+be\s+at\s+most\s+(\d+)\s+characters\b/gi, 'el campo $1 debe tener como máximo $2 caracteres');
  translated = translated.replace(/\bthe\s+([a-z_]+)\s+field\s+must\s+be\s+at\s+least\s+(\d+)\s+characters\b/gi, 'el campo $1 debe tener al menos $2 caracteres');
  translated = translated.replace(/\bthe\s+([a-z_]+)\s+field\s+must\s+be\s+one\s+of:\s+([^\.]+)\b/gi, 'el campo $1 debe ser uno de: $2');
  translated = translated.replace(/\bmust\s+be\s+one\s+of:\s+([^\.]+)/gi, 'debe ser uno de: $1');
  translated = translated.replace(/\bmay\s+not\s+be\s+greater\s+than\s+(\d+)/gi, 'no puede ser mayor que $1');
  translated = translated.replace(/\bmust\s+be\s+at\s+most\s+(\d+)\s+characters/gi, 'debe tener como máximo $1 caracteres');
  translated = translated.replace(/\bmust\s+be\s+at\s+least\s+(\d+)\s+characters/gi, 'debe tener al menos $1 caracteres');
  translated = translated.replace(/\bmust\s+not\s+be\s+greater\s+than\s+(\d+)/gi, 'no debe ser mayor que $1');
  translated = translated.replace(/\bmust\s+be\s+less\s+than\s+or\s+equal\s+to\s+(\d+)/gi, 'debe ser menor o igual a $1');
  translated = translated.replace(/\bmust\s+be\s+greater\s+than\s+or\s+equal\s+to\s+(\d+)/gi, 'debe ser mayor o igual a $1');
  
  // Si después de todas las traducciones el mensaje sigue siendo muy similar al original (y en inglés),
  // y no contiene caracteres especiales, aplicar traducciones más genéricas
  if (translated === originalMessage && !/[áéíóúñÁÉÍÓÚÑ]/.test(translated)) {
    // Intentar detectar si es un mensaje en inglés común
    const commonEnglishPatterns = [
      { pattern: /\berror\b/gi, replacement: 'error' },
      { pattern: /\bfailed\b/gi, replacement: 'falló' },
      { pattern: /\binvalid\b/gi, replacement: 'inválido' },
      { pattern: /\bnot\s+found\b/gi, replacement: 'no encontrado' },
      { pattern: /\brequired\b/gi, replacement: 'obligatorio' },
    ];
    
    for (const { pattern, replacement } of commonEnglishPatterns) {
      if (pattern.test(translated)) {
        translated = translated.replace(pattern, replacement);
      }
    }
  }
  
  return translated;
};

/**
 * Detecta y filtra información técnica de mensajes de error
 */
const filterTechnicalDetails = (message: string): string => {
  let sanitized = message;

  // Primero traducir al español
  sanitized = translateToSpanish(sanitized);

  // Remover nombres de variables (ej: $requestForm, $variable, etc.)
  sanitized = sanitized.replace(/\$[\w]+/g, '');
  
  // Remover referencias a clases/namespaces (ej: App\Models\RequestForm)
  sanitized = sanitized.replace(/[A-Z][\w\\]+::/g, '');
  sanitized = sanitized.replace(/App\\[\w\\]+/g, '');
  
  // Remover stack traces y rutas de archivos
  sanitized = sanitized.replace(/\/[\w\/\-\.]+\.php:\d+/g, '');
  sanitized = sanitized.replace(/at [\w\.]+\([^\)]+\)/g, '');
  
  // Remover referencias SQL técnicas
  sanitized = sanitized.replace(/SQLSTATE\[[\w]+\]/g, '');
  sanitized = sanitized.replace(/\(SQL: [^\)]+\)/g, '');
  
  // Remover códigos de error técnicos entre corchetes
  sanitized = sanitized.replace(/\[[\w\-]+\]/g, '');
  
  // Remover mensajes de error de PHP/Laravel técnicos
  const technicalPatterns = [
    /syntax error/i,
    /unexpected/i,
    /parse error/i,
    /fatal error/i,
    /exception/i,
    /throwable/i,
    /call to undefined/i,
    /trying to get property/i,
    /null pointer/i,
    /undefined variable/i,
    /undefined index/i,
    /undefined offset/i,
  ];

  // Si contiene patrones técnicos, retornar mensaje genérico
  if (technicalPatterns.some(pattern => pattern.test(message))) {
    return 'Error en el servidor. Por favor, contacte al administrador si el problema persiste.';
  }

  return sanitized.trim();
};

/**
 * Mapea campos de validación a nombres amigables en español
 */
const getFieldLabel = (field: string): string => {
  const fieldMap: Record<string, string> = {
    'status': 'Estado',
    'email_subject': 'Asunto del correo',
    'email_body': 'Cuerpo del correo',
    'attachments': 'Archivos adjuntos',
    'attachments.0': 'Primer archivo adjunto',
    'attachments.1': 'Segundo archivo adjunto',
    'attachments.2': 'Tercer archivo adjunto',
    'attachments.3': 'Cuarto archivo adjunto',
    'id': 'ID de solicitud',
    'request_type': 'Tipo de solicitud',
    'document_number': 'Número de documento',
  };

  return fieldMap[field] || field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

/**
 * Sanitiza un error y retorna un mensaje amigable al usuario
 */
export const sanitizeError = (error: any): SanitizedError => {
  // Si es un string, intentar parsearlo
  if (typeof error === 'string') {
    return {
      message: filterTechnicalDetails(error),
      type: 'unknown',
    };
  }

  // Si es una instancia de Error
  if (error instanceof Error) {
    // Para errores de red
    if (
      error.message.includes('Network Error') ||
      error.message.includes('ERR_NETWORK') ||
      error.message.includes('Failed to fetch') ||
      error.message.includes('CORS')
    ) {
      return {
        message: 'Error de conexión. Verifique su conexión a internet e intente nuevamente.',
        type: 'network',
      };
    }

    return {
      message: filterTechnicalDetails(error.message),
      type: 'unknown',
    };
  }

  // Si es un error de axios/fetch con response
  if (error?.response) {
    const status = error.response.status;
    const data = error.response.data || {};

    // Error 422 - Validación
    if (status === 422) {
      if (data.errors && typeof data.errors === 'object') {
        const validationMessages: string[] = [];
        
        Object.entries(data.errors).forEach(([field, messages]) => {
          const fieldLabel = getFieldLabel(field);
          const messageArray = Array.isArray(messages) ? messages : [messages];
          
          messageArray.forEach((msg: string) => {
            // Sanitizar y traducir cada mensaje de validación
            let sanitizedMsg = filterTechnicalDetails(String(msg));
            
            // Asegurar que el mensaje tenga sentido en español
            // Si el mensaje original no tiene el nombre del campo, agregarlo
            if (!sanitizedMsg.toLowerCase().includes(fieldLabel.toLowerCase()) && 
                !sanitizedMsg.toLowerCase().includes('el campo') &&
                !sanitizedMsg.toLowerCase().includes('la ')) {
              sanitizedMsg = `${sanitizedMsg}`;
            }
            
            validationMessages.push(`${fieldLabel}: ${sanitizedMsg}`);
          });
        });

        if (validationMessages.length > 0) {
          return {
            message: validationMessages.join('\n'),
            type: 'validation',
          };
        }
      }

      // Traducir el mensaje principal si existe
      const mainMessage = data.message 
        ? filterTechnicalDetails(String(data.message))
        : 'Los datos proporcionados no son válidos. Por favor, revise los campos del formulario.';
      
      return {
        message: mainMessage,
        type: 'validation',
      };
    }

    // Error 404 - No encontrado
    if (status === 404) {
      return {
        message: 'El recurso solicitado no fue encontrado. Por favor, verifique la información e intente nuevamente.',
        type: 'not_found',
      };
    }

    // Error 401/403 - No autorizado
    if (status === 401 || status === 403) {
      return {
        message: 'No tiene permisos para realizar esta acción. Por favor, inicie sesión nuevamente.',
        type: 'unauthorized',
      };
    }

    // Error 500, 502, 503 - Errores del servidor
    if (status >= 500) {
      // Intentar extraer mensaje amigable si existe
      if (data.message && typeof data.message === 'string') {
        const sanitized = filterTechnicalDetails(data.message);
        // Si después de sanitizar sigue siendo técnico, usar mensaje genérico
        if (sanitized !== data.message || sanitized.toLowerCase().includes('error')) {
          return {
            message: 'Error interno del servidor. Por favor, intente nuevamente más tarde. Si el problema persiste, contacte al administrador.',
            type: 'server',
          };
        }
        return {
          message: sanitized,
          type: 'server',
        };
      }

      return {
        message: 'Error interno del servidor. Por favor, intente nuevamente más tarde. Si el problema persiste, contacte al administrador.',
        type: 'server',
      };
    }

    // Otros errores HTTP - traducir mensajes
    if (data.message && typeof data.message === 'string') {
      const sanitized = filterTechnicalDetails(data.message);
      return {
        message: sanitized,
        type: 'unknown',
      };
    }

    return {
      message: `Error ${status}. Por favor, intente nuevamente.`,
      type: 'unknown',
    };
  }

  // Error sin información específica
  if (error?.message) {
    return {
      message: filterTechnicalDetails(String(error.message)),
      type: 'unknown',
    };
  }

  // Error completamente desconocido
  return {
    message: 'Ocurrió un error inesperado. Por favor, intente nuevamente. Si el problema persiste, contacte al administrador.',
    type: 'unknown',
  };
};

/**
 * Helper para mostrar mensajes de error en toasts
 */
export const getErrorMessage = (error: any): string => {
  return sanitizeError(error).message;
};

/**
 * Sanitiza información de error para logging
 * En producción, solo loguea información segura
 * En desarrollo, loguea detalles completos para debugging
 */
export const sanitizeErrorForLogging = (error: any): any => {
  const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';
  
  // En desarrollo, retornar el error completo para debugging
  if (isDev) {
    return error;
  }
  
  // En producción, sanitizar información sensible
  const sanitized: any = {
    message: error?.message || 'Error desconocido',
    code: error?.code,
  };
  
  // Solo incluir información HTTP segura
  if (error?.response) {
    sanitized.status = error.response.status;
    sanitized.statusText = error.response.statusText;
    sanitized.url = error.config?.url;
    sanitized.method = error.config?.method;
    
    // NO incluir error.response.data en producción (puede contener info sensible)
    // Solo incluir si es un mensaje de error genérico y seguro
    if (error.response.data?.message && typeof error.response.data.message === 'string') {
      const message = error.response.data.message;
      // Solo incluir si no parece contener información técnica sensible
      if (!message.includes('SQL') && 
          !message.includes('Exception') && 
          !message.includes('Stack trace') &&
          !message.includes('at ') &&
          !message.includes('.php:') &&
          !message.includes('\\')) {
        sanitized.responseMessage = message;
      }
    }
  }
  
  return sanitized;
};

