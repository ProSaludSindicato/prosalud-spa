/**
 * Traspaso temporal de datos de identificación del chatbot al formulario de autenticación.
 * Evita poner documento y fecha de expedición en la URL (historial, logs, Referer, analítica).
 * Los datos caducan a los 2 minutos y se borran con clearAffiliatePrefill() tras usarlos.
 */
const PREFILL_KEY = 'afiliado_prefill';
const PREFILL_TTL_MS = 2 * 60 * 1000;

export interface AffiliatePrefill {
  tipoDocumento?: string;
  numeroDocumento?: string;
  fechaExpedicion?: string;
}

export const stashAffiliatePrefill = (data?: AffiliatePrefill): void => {
  if (!data || !(data.tipoDocumento || data.numeroDocumento || data.fechaExpedicion)) return;
  try {
    localStorage.setItem(PREFILL_KEY, JSON.stringify({ data, expiresAt: Date.now() + PREFILL_TTL_MS }));
  } catch {
    // almacenamiento no disponible: el usuario completa el formulario manualmente
  }
};

export const consumeAffiliatePrefill = (): AffiliatePrefill | undefined => {
  try {
    const raw = localStorage.getItem(PREFILL_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { data?: AffiliatePrefill; expiresAt?: number };
    if (!parsed.expiresAt || Date.now() > parsed.expiresAt) return undefined;
    return parsed.data;
  } catch {
    return undefined;
  }
};

export const clearAffiliatePrefill = (): void => {
  try {
    localStorage.removeItem(PREFILL_KEY);
  } catch {
    // ignorar
  }
};
