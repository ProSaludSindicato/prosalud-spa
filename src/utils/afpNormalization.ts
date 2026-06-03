/**
 * AFP reconocidas en ProSalud (fuente: catálogo de afiliados / Excel).
 * Los valores `value` se envían al backend en solicitudes de actualización de datos.
 */

export type AfpOption = { value: string; label: string };

export const afpList: AfpOption[] = [
  { value: 'colfondos', label: 'COLFONDOS' },
  { value: 'colpensiones', label: 'COLPENSIONES' },
  { value: 'old_mutual', label: 'OLD MUTUAL OBLIGATORIO' },
  { value: 'porvenir', label: 'PORVENIR' },
  { value: 'proteccion', label: 'PROTECCION' },
  { value: 'skandia', label: 'SKANDIA' },
  { value: 'pensionado', label: 'PENSIONADO (A)' },
];

/** Patrones ordenados de más específico a más general (substring sobre texto canónico). */
const AFP_PATTERN_MATCHERS: Array<{ value: string; patterns: string[] }> = [
  { value: 'old_mutual', patterns: ['old mutual obligatorio', 'old mutual'] },
  { value: 'colpensiones', patterns: ['colpensiones', 'colpension'] },
  { value: 'pensionado', patterns: ['pensionado'] },
  { value: 'colfondos', patterns: ['colfondos'] },
  { value: 'porvenir', patterns: ['porvenir'] },
  { value: 'proteccion', patterns: ['proteccion'] },
  { value: 'skandia', patterns: ['skandia'] },
];

/**
 * Normaliza texto de AFP para comparación (minúsculas, sin tildes ni puntuación).
 */
export function canonicalizeAfpText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\./g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Convierte el valor de AFP del afiliado (Excel/API) al `value` del formulario.
 */
export function normalizeAfp(value: string | null | undefined): string {
  if (!value) {
    return '';
  }

  const canonical = canonicalizeAfpText(value);
  if (!canonical || canonical === 'afp' || canonical === 'a f p') {
    return '';
  }

  for (const { value: afpValue, patterns } of AFP_PATTERN_MATCHERS) {
    if (patterns.some((pattern) => canonical.includes(pattern) || canonical === pattern)) {
      return afpValue;
    }
  }

  const exactByValue = afpList.find((a) => a.value === canonical.replace(/\s+/g, '_'));
  if (exactByValue) {
    return exactByValue.value;
  }

  const exactByLabel = afpList.find((a) => canonicalizeAfpText(a.label) === canonical);
  if (exactByLabel) {
    return exactByLabel.value;
  }

  return '';
}
