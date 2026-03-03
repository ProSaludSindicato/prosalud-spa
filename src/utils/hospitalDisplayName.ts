// Mapa de hospitales: valor interno => nombre legible para el afiliado
const hospitalMap: Record<string, string> = {
  ABEJORRAL: 'E.S.E. Hospital San Juan de Dios - Abejorral',
  'ABEJORRAL - ADMON': 'E.S.E. Hospital San Juan de Dios - Abejorral',
  'ABEJORRAL - ADMON ': 'E.S.E. Hospital San Juan de Dios - Abejorral',
  'ABEJORRAL - ASIST': 'E.S.E. Hospital San Juan de Dios - Abejorral',
  'ABEJORRAL - BUEN COMIENZO': 'E.S.E. Hospital San Juan de Dios Abejorral - Programa Buen Comienzo',
  'ABEJORRAL - CBA': 'E.S.E. Hospital San Juan de Dios - Abejorral',
  'ABEJORRAL - SALUD P': 'E.S.E. Hospital San Juan de Dios Abejorral - Programa Salud Pública',
  'ABEJORRAL SP': 'E.S.E. Hospital San Juan de Dios - Abejorral',
  ADMON: 'Sede Administrativa',
  'ADMON-HSJDRionegro': 'E.S.E. Hospital San Juan de Dios - Rionegro',
  BARBOSA: 'E.S.E. Hospital San Vicente de Paul de Barbosa (Ant)',
  BELLO: 'E.S.E. Hospital Marco Fidel Suarez de Bello',
  BETANIA: 'E.S.E. Hospital San Antonio de Betania',
  CALDAS: 'E.S.E. Hospital San Vicente de Paúl de Caldas',
  'CENTRO NEUROLOGICO': 'Centro Neurológico',
  CISNEROS: 'E.S.E. Hospital San Antonio - Cisneros (Ant)',
  'CIUDAD BOLIVAR': 'E.S.E. Hospital La Merced - Ciudad Bolivar (Ant)',
  CIUDADBOLIVAR: 'E.S.E. Hospital La Merced - Ciudad Bolivar (Ant)',
  COPACABANA: 'E.S.E. Hospital Santa Margarita',
  'COPACABANA ': 'E.S.E. Hospital Santa Margarita',
  'E.S.E CARISMA ADMON ': 'E.S.E. Hospital Carisma',
  'E.S.E CARISMA ASISTENCIAL': 'E.S.E. Hospital Carisma',
  ESECARISMA: 'E.S.E. Hospital Carisma',
  FREDONIA: 'E.S.E. Hospital Santa Lucia - Fredonia (Ant)',
  'HGM SEDE 80 ADMON': 'E.S.E. Hospital General de Medellín - Sede 80',
  'HGM SEDE 80 ASISTENCIAL': 'E.S.E. Hospital General de Medellín - Sede 80',
  'HGM SEDE 80 ASISTENCIAL ': 'E.S.E. Hospital General de Medellín - Sede 80',
  'HLM - GRUPO 1': 'E.S.E. Hospital La María',
  'HLM - GRUPO 2': 'E.S.E. Hospital La María',
  'HLM - GRUPO 3': 'E.S.E. Hospital La María',
  'HMFS - BELLO': 'E.S.E. Hospital Marco Fidel Suarez de Bello',
  'HSJD Rionegro - ADMON': 'E.S.E. Hospital San Juan de Dios - Rionegro',
  'HSJD Rionegro - ASISTENCIAL': 'Centro Neurológico',
  'HSJD Rionegro - PIC ': 'E.S.E. Hospital San Antonio - Cisneros (Ant)',
  HSJDRionegro: 'E.S.E. Hospital San Juan de Dios - Rionegro',
  HSRI: 'E.S.E. Hospital San Rafael de Itagüí',
  'HSRI ': 'E.S.E. Hospital San Rafael de Itagüí',
  JARDIN: 'E.S.E. Hospital Gabriel Peláez Montoya',
  'LA MARIA': 'E.S.E. Hospital La María',
  'LA MARIA - 000065-2021': 'E.S.E. Hospital La María',
  'LA MARIA - 262-2021': 'E.S.E. Hospital La María',
  'LA MARIA - COOSALUD': 'E.S.E. Hospital La María',
  'LA MARIA - ENTERRITORIO': 'E.S.E. Hospital La María',
  'LA MARIA - ENTERRITORIO 1 - 044': 'E.S.E. Hospital La María',
  'LA MARIA - ENTERRITORIO 2': 'E.S.E. Hospital La María',
  'LA MARIA - ENTERRITORIO 2 - 045': 'E.S.E. Hospital La María',
  'LA MARIA - INFECCIOSA PS 268': 'E.S.E. Hospital La María',
  'LA MARIA - ITS 257': 'E.S.E. Hospital La María',
  'LA MARIA - PROGRAMA ESPECIAL SAVIA SALUD EPS - VIH-SIDA': 'E.S.E. Hospital La María',
  'LA MARIA - TRANSMISIBLES': 'E.S.E. Hospital La María',
  'LA MARIA - TRANSMISIBLES - 122 - 2023': 'E.S.E. Hospital La María',
  'LA MARIA - TRANSMISIBLES 176': 'E.S.E. Hospital La María',
  'LA MARIA - UNION TEMPORAL': 'E.S.E. Hospital La María',
  'LA MARIA - UNION TEMPORAL 020 - 2023': 'E.S.E. Hospital La María',
  'LA MARIA - VIH': 'E.S.E. Hospital La María',
};

// Lista de hospitales permitidos para selects (sociodemográfica, etc.)
export const hospitalesPermitidos = [
  {
    displayName: 'E.S.E. Hospital Marco Fidel Suarez de Bello',
    key: 'BELLO',
  },
  {
    displayName: 'E.S.E. Hospital La María',
    key: 'LA MARIA',
  },
  {
    displayName: 'E.S.E. Hospital Carisma',
    key: 'E.S.ECARISMA',
  },
  {
    displayName: 'E.S.E. Hospital San Juan de Dios - Rionegro',
    key: 'HSJDRionegro',
  },
  {
    displayName: 'Sede Administrativa Caldas',
    key: 'CALDAS',
  },
];

/** Convierte el código interno de hospital al nombre legible que conoce el afiliado. */
export const getHospitalDisplayName = (hospitalValue: string | null | undefined): string => {
  if (!hospitalValue) return '';

  // Primero verificar si es uno de los hospitales permitidos
  const hospitalPermitido = hospitalesPermitidos.find(
    (h) => h.key === hospitalValue || h.key === hospitalValue.trim()
  );
  if (hospitalPermitido) {
    return hospitalPermitido.displayName;
  }

  // Si no está en la lista permitida, usar el mapa original
  let displayName = '';
  // Buscar coincidencia exacta primero
  if (hospitalMap[hospitalValue]) {
    displayName = hospitalMap[hospitalValue];
  } else {
    // Buscar coincidencia sin espacios al final
    const trimmedValue = hospitalValue.trim();
    if (hospitalMap[trimmedValue]) {
      displayName = hospitalMap[trimmedValue];
    } else {
      // Si no hay coincidencia, devolver el valor original
      displayName = hospitalValue;
    }
  }
  // Convertir a mayúsculas para mantener consistencia visual
  return displayName.toUpperCase();
};

/** Dado el nombre legible del hospital, obtiene la clave/código interno asociado. */
export const getHospitalKeyFromDisplay = (displayName: string): string => {
  const hospital = hospitalesPermitidos.find(
    (h) => h.displayName.toUpperCase().trim() === displayName.toUpperCase().trim()
  );
  return hospital?.key || displayName;
};

