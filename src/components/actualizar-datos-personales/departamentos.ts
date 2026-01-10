// Lista de departamentos de Colombia
export interface Departamento {
  value: string;
  label: string;
}

export const departamentos: Departamento[] = [
  { value: 'amazonas', label: 'Amazonas' },
  { value: 'antioquia', label: 'Antioquia' },
  { value: 'arauca', label: 'Arauca' },
  { value: 'atlantico', label: 'Atlántico' },
  { value: 'bolivar', label: 'Bolívar' },
  { value: 'boyaca', label: 'Boyacá' },
  { value: 'caldas', label: 'Caldas' },
  { value: 'caqueta', label: 'Caquetá' },
  { value: 'casanare', label: 'Casanare' },
  { value: 'cauca', label: 'Cauca' },
  { value: 'cesar', label: 'Cesar' },
  { value: 'choco', label: 'Chocó' },
  { value: 'cordoba', label: 'Córdoba' },
  { value: 'cundinamarca', label: 'Cundinamarca' },
  { value: 'guainia', label: 'Guainía' },
  { value: 'guaviare', label: 'Guaviare' },
  { value: 'huila', label: 'Huila' },
  { value: 'la_guajira', label: 'La Guajira' },
  { value: 'magdalena', label: 'Magdalena' },
  { value: 'meta', label: 'Meta' },
  { value: 'narino', label: 'Nariño' },
  { value: 'norte_de_santander', label: 'Norte de Santander' },
  { value: 'putumayo', label: 'Putumayo' },
  { value: 'quindio', label: 'Quindío' },
  { value: 'risaralda', label: 'Risaralda' },
  { value: 'san_andres', label: 'San Andrés y Providencia' },
  { value: 'santander', label: 'Santander' },
  { value: 'sucre', label: 'Sucre' },
  { value: 'tolima', label: 'Tolima' },
  { value: 'valle_del_cauca', label: 'Valle del Cauca' },
  { value: 'vaupes', label: 'Vaupés' },
  { value: 'vichada', label: 'Vichada' },
];

// Función para normalizar el departamento
export const normalizeDepartamento = (value: string | null | undefined): string => {
  if (!value) return '';
  const normalized = value.toLowerCase().trim().replace(/\s+/g, '_');
  const found = departamentos.find(d => 
    d.value === normalized || 
    d.label.toLowerCase() === normalized ||
    d.label.toLowerCase().includes(normalized) ||
    normalized.includes(d.value)
  );
  return found?.value || normalized;
};

