/**
 * Utilidades para URLs que provienen de la API o de formularios.
 * Solo se admiten http(s); esquemas como javascript: o data: se descartan.
 */
export const sanitizeExternalUrl = (url?: string | null): string | undefined => {
  if (!url) return undefined;
  try {
    const parsed = new URL(url.trim(), window.location.origin);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
};

export const openExternalUrl = (url?: string | null): void => {
  const safe = sanitizeExternalUrl(url);
  if (safe) window.open(safe, '_blank', 'noopener,noreferrer');
};
