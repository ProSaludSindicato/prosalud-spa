/** Ruta pública donde el delegado ingresa documento, firma y vota. */
export const ASSEMBLY_DELEGATE_VOTE_PATH = '/asamblea';

/**
 * Pantalla sólo para mostrar en monitor/tableta: QR + texto orientado al afiliado (sin panel admin).
 */
export const ASSEMBLY_DELEGATE_KIOSK_PATH = '/asamblea/acceso';

/**
 * QR en SVG (colóquelo en public/images/). Escala nítida en pantallas grandes; mismo archivo en todos los despliegues.
 */
export const ASSEMBLY_DELEGATES_QR_IMAGE_PATH = '/images/asamblea-delegados-acceso-qr.svg';
