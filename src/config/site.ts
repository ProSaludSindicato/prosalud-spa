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
