const COLOR_REFERENCE = [
  { id: 'AGUAMA', label: 'Aguamarina', hex: '#14B8A6' },
  { id: 'AMARILLO', label: 'Amarillo', hex: '#FACC15' },
  { id: 'AZUL', label: 'Azul', hex: '#2563EB' },
  { id: 'AZUL_CLARO', label: 'Azul Claro', hex: '#93C5FD' },
  { id: 'AZUL_MARINO', label: 'Azul Marino', hex: '#1E40AF' },
  { id: 'AZUL_OSCURO', label: 'Azul Oscuro', hex: '#1F2937' },
  { id: 'AZUL_REY', label: 'Azul Rey', hex: '#1E3A8A' },
  { id: 'BEIGE', label: 'Beige', hex: '#D4C4A8' },
  { id: 'BLANCO', label: 'Blanco', hex: '#FFFFFF' },
  { id: 'CAFE', label: 'Café', hex: '#92400E' },
  { id: 'GRIS', label: 'Gris Claro', hex: '#6B7280' },
  { id: 'GRIS_OSCURO', label: 'Gris Oscuro', hex: '#374151' },
  { id: 'GRIS_RATON', label: 'Gris Ratón', hex: '#4B5563' },
  { id: 'GRIS_REFLECTIVO', label: 'Gris Reflectivo', hex: '#9CA3AF' },
  { id: 'MORADO', label: 'Morado', hex: '#A855F7' },
  { id: 'NARANJA', label: 'Naranja', hex: '#FB923C' },
  { id: 'NEGRO', label: 'Negro', hex: '#000000' },
  { id: 'NEGRA', label: 'Negra', hex: '#000000' },
  { id: 'PETROLEO', label: 'Petróleo', hex: '#0F172A' },
  { id: 'ROJO', label: 'Rojo', hex: '#EF4444' },
  { id: 'ROSA', label: 'Rosa', hex: '#F472B6' },
  { id: 'VERDE', label: 'Verde', hex: '#22C55E' },
  { id: 'VERDE_AGUA', label: 'Verde Agua', hex: '#5EEAD4' },
  { id: 'VERDE_QUIRURGICO', label: 'Verde Quirúrgico', hex: '#065F46' },
  { id: 'VINO_TINTO', label: 'Vino Tinto', hex: '#881337' },
] as const;

const normalizeColorKey = (color?: string) =>
  color
    ? color
        .toLowerCase()
        .replace(/_/g, ' ')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
    : undefined;

const colorLookup = (() => {
  const map = new Map<
    string,
    {
      id: string;
      label: string;
      hex: string;
    }
  >();

  COLOR_REFERENCE.forEach(({ id, label, hex }) => {
    const normalizedId = normalizeColorKey(id);
    const normalizedLabel = normalizeColorKey(label);
    if (normalizedId) {
      map.set(normalizedId, { id, label, hex });
    }
    if (normalizedLabel) {
      map.set(normalizedLabel, { id, label, hex });
    }
  });

  return map;
})();

export const resolveSstColorInfo = (color?: string) => {
  if (!color) return undefined;
  const normalized = normalizeColorKey(color);
  if (!normalized) return undefined;
  return colorLookup.get(normalized);
};

export const normalizeSstColorKey = normalizeColorKey;

