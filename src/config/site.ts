/**
 * URL pública del portal (SPA) para enlaces compartibles con afiliados.
 * Si el front y la API están en dominios distintos, defina VITE_PUBLIC_SITE_URL (sin barra final).
 * Ej.: https://www.prosalud.org.co
 */
export function getPortalOrigin(): string {
  const fromEnv = (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined)?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
}

export function buildPortalUrl(path: string): string {
  const origin = getPortalOrigin();
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${origin}${normalized}`;
}

/** Enlace público de inscripción de una campaña de bienestar (modo "Inscripción con listado"). */
export function buildCampaignEnrollmentUrl(slug: string): string {
  return buildPortalUrl(`/entregas-bienestar/${encodeURIComponent(slug)}`);
}

/**
 * Vista previa del identificador que el backend genera para el enlace de una campaña (Str::slug).
 * Si ya existe otra campaña con el mismo, el backend agrega un sufijo (-2, -3...).
 */
export function previewCampaignSlug(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}
