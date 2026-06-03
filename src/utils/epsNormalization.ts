/**
 * EPS reconocidas en ProSalud (fuente: catálogo de afiliados / Excel).
 * Los valores `value` se envían al backend en solicitudes de actualización de datos.
 */

export type EpsOption = { value: string; label: string };

export const epsList: EpsOption[] = [
  { value: 'asmet_salud', label: 'ASMET SALUD EPS SAS' },
  { value: 'cajacopi', label: 'CAJACOPI ATLANTICO' },
  { value: 'capital_salud', label: 'CAPITAL SALUD' },
  { value: 'comfachoco', label: 'COMFACHOCÓ' },
  { value: 'compensar', label: 'COMPENSAR' },
  { value: 'coosalud', label: 'COOSALUD EPS' },
  { value: 'coosalud_movilidad', label: 'COOSALUD MOVILIDAD' },
  { value: 'mutual_ser', label: 'MUTUAL SER / EPS MUTUAL SER' },
  { value: 'sura', label: 'EPS SURA (ANTES SUSALUD)' },
  { value: 'famisanar', label: 'FAMISANAR' },
  { value: 'fosyga', label: 'FOSYGA' },
  { value: 'fosyga_regimen_excepcion', label: 'FOSYGA RÉGIMEN DE EXCEPCIÓN' },
  { value: 'mallamas', label: 'MALLAMAS' },
  { value: 'ninguna', label: 'NINGUNA' },
  { value: 'nueva_eps', label: 'NUEVA E.P.S.' },
  { value: 'nueva_eps_movilidad', label: 'NUEVA EPS MOVILIDAD' },
  { value: 'sos', label: 'S.O.S. SERVICIO OCCIDENTAL DE SALUD S.A.' },
  { value: 'salud_total', label: 'SALUD TOTAL' },
  { value: 'sanitas', label: 'SANITAS' },
  { value: 'savia', label: 'SAVIA SALUD' },
  { value: 'coomeva', label: 'Coomeva EPS' },
  { value: 'aliansalud', label: 'Aliansalud' },
  { value: 'otros', label: 'Otros' },
];

/** Patrones ordenados de más específico a más general (substring sobre texto canónico). */
const EPS_PATTERN_MATCHERS: Array<{ value: string; patterns: string[] }> = [
  { value: 'nueva_eps_movilidad', patterns: ['nueva eps movilidad'] },
  { value: 'coosalud_movilidad', patterns: ['coosalud movilidad'] },
  { value: 'fosyga_regimen_excepcion', patterns: ['fosyga regimen de excepcion', 'fosyga regimen excepcion'] },
  { value: 'sura', patterns: ['eps sura', 'susalud', 'eps susalud'] },
  { value: 'nueva_eps', patterns: ['nueva eps', 'nueva e p s'] },
  { value: 'coosalud', patterns: ['coosalud'] },
  { value: 'mutual_ser', patterns: ['eps mutual ser', 'mutual ser'] },
  { value: 'sos', patterns: ['servicio occidental de salud', 's o s servicio', 'sos servicio'] },
  { value: 'asmet_salud', patterns: ['asmet salud'] },
  { value: 'cajacopi', patterns: ['cajacopi'] },
  { value: 'capital_salud', patterns: ['capital salud'] },
  { value: 'comfachoco', patterns: ['comfachoco'] },
  { value: 'compensar', patterns: ['compensar'] },
  { value: 'famisanar', patterns: ['famisanar'] },
  { value: 'fosyga', patterns: ['fosyga'] },
  { value: 'mallamas', patterns: ['mallamas'] },
  { value: 'salud_total', patterns: ['salud total'] },
  { value: 'sanitas', patterns: ['sanitas'] },
  { value: 'savia', patterns: ['savia salud', 'savia'] },
  { value: 'coomeva', patterns: ['coomeva'] },
  { value: 'aliansalud', patterns: ['aliansalud'] },
  { value: 'ninguna', patterns: ['ninguna'] },
];

/**
 * Normaliza texto de EPS para comparación (minúsculas, sin tildes ni puntuación).
 */
export function canonicalizeEpsText(value: string): string {
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
 * Convierte el valor de EPS del afiliado (Excel/API) al `value` del formulario.
 */
export function normalizeEps(value: string | null | undefined): string {
  if (!value) {
    return '';
  }

  const canonical = canonicalizeEpsText(value);
  if (!canonical) {
    return '';
  }

  for (const { value: epsValue, patterns } of EPS_PATTERN_MATCHERS) {
    if (patterns.some((pattern) => canonical.includes(pattern) || canonical === pattern)) {
      return epsValue;
    }
  }

  const exactByValue = epsList.find((e) => e.value === canonical.replace(/\s+/g, '_'));
  if (exactByValue) {
    return exactByValue.value;
  }

  const exactByLabel = epsList.find((e) => canonicalizeEpsText(e.label) === canonical);
  if (exactByLabel) {
    return exactByLabel.value;
  }

  return 'otros';
}
