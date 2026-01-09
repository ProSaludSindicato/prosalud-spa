/**
 * Maneja errores relacionados con reCAPTCHA de manera consistente
 * 
 * @param error - El error recibido de la petición
 * @returns Mensaje de error amigable para el usuario
 */
export function handleRecaptchaError(error: any): string {
  if (!error.response) {
    return 'Error de conexión. Por favor, verifica tu internet.';
  }

  const status = error.response.status;
  const errorData = error.response.data;

  switch (status) {
    case 400:
      if (errorData?.error === 'missing_recaptcha_token') {
        return 'Error: La verificación de reCAPTCHA es requerida. Por favor, recarga la página.';
      }
      return errorData?.message || 'Solicitud inválida.';

    case 403:
      if (errorData?.error === 'recaptcha_verification_failed') {
        return 'Error: La verificación de reCAPTCHA falló. Por favor, intente nuevamente.';
      }
      return errorData?.message || 'Acceso denegado.';

    case 429:
      return 'Demasiadas solicitudes. Por favor, espera un momento antes de intentar nuevamente.';

    default:
      return errorData?.message || 'Ocurrió un error. Por favor, intente nuevamente.';
  }
}

/**
 * Verifica si un error es específico de reCAPTCHA
 * 
 * @param error - El error recibido de la petición
 * @returns true si el error es relacionado con reCAPTCHA
 */
export function isRecaptchaError(error: any): boolean {
  if (!error.response) {
    return false;
  }

  const status = error.response.status;
  const errorData = error.response.data;

  return (
    (status === 400 && errorData?.error === 'missing_recaptcha_token') ||
    (status === 403 && errorData?.error === 'recaptcha_verification_failed') ||
    status === 429
  );
}


