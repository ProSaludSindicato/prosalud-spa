// Lista de países con banderas emoji
export interface Pais {
  value: string;
  label: string;
  flag: string;
}

export const paises: Pais[] = [
  { value: 'colombia', label: 'Colombia', flag: '🇨🇴' },
  { value: 'venezuela', label: 'Venezuela', flag: '🇻🇪' },
  { value: 'ecuador', label: 'Ecuador', flag: '🇪🇨' },
  { value: 'peru', label: 'Perú', flag: '🇵🇪' },
  { value: 'brasil', label: 'Brasil', flag: '🇧🇷' },
  { value: 'argentina', label: 'Argentina', flag: '🇦🇷' },
  { value: 'chile', label: 'Chile', flag: '🇨🇱' },
  { value: 'panama', label: 'Panamá', flag: '🇵🇦' },
  { value: 'costa_rica', label: 'Costa Rica', flag: '🇨🇷' },
  { value: 'nicaragua', label: 'Nicaragua', flag: '🇳🇮' },
  { value: 'honduras', label: 'Honduras', flag: '🇭🇳' },
  { value: 'guatemala', label: 'Guatemala', flag: '🇬🇹' },
  { value: 'el_salvador', label: 'El Salvador', flag: '🇸🇻' },
  { value: 'mexico', label: 'México', flag: '🇲🇽' },
  { value: 'cuba', label: 'Cuba', flag: '🇨🇺' },
  { value: 'republica_dominicana', label: 'República Dominicana', flag: '🇩🇴' },
  { value: 'puerto_rico', label: 'Puerto Rico', flag: '🇵🇷' },
  { value: 'bolivia', label: 'Bolivia', flag: '🇧🇴' },
  { value: 'paraguay', label: 'Paraguay', flag: '🇵🇾' },
  { value: 'uruguay', label: 'Uruguay', flag: '🇺🇾' },
  { value: 'estados_unidos', label: 'Estados Unidos', flag: '🇺🇸' },
  { value: 'canada', label: 'Canadá', flag: '🇨🇦' },
  { value: 'espana', label: 'España', flag: '🇪🇸' },
  { value: 'francia', label: 'Francia', flag: '🇫🇷' },
  { value: 'italia', label: 'Italia', flag: '🇮🇹' },
  { value: 'alemania', label: 'Alemania', flag: '🇩🇪' },
  { value: 'reino_unido', label: 'Reino Unido', flag: '🇬🇧' },
  { value: 'portugal', label: 'Portugal', flag: '🇵🇹' },
  { value: 'holanda', label: 'Holanda', flag: '🇳🇱' },
  { value: 'belgica', label: 'Bélgica', flag: '🇧🇪' },
  { value: 'suiza', label: 'Suiza', flag: '🇨🇭' },
  { value: 'australia', label: 'Australia', flag: '🇦🇺' },
  { value: 'nueva_zelanda', label: 'Nueva Zelanda', flag: '🇳🇿' },
  { value: 'japon', label: 'Japón', flag: '🇯🇵' },
  { value: 'china', label: 'China', flag: '🇨🇳' },
  { value: 'india', label: 'India', flag: '🇮🇳' },
  { value: 'rusia', label: 'Rusia', flag: '🇷🇺' },
  { value: 'corea_del_sur', label: 'Corea del Sur', flag: '🇰🇷' },
  { value: 'filipinas', label: 'Filipinas', flag: '🇵🇭' },
  { value: 'indonesia', label: 'Indonesia', flag: '🇮🇩' },
  { value: 'tailandia', label: 'Tailandia', flag: '🇹🇭' },
  { value: 'singapur', label: 'Singapur', flag: '🇸🇬' },
  { value: 'malasia', label: 'Malasia', flag: '🇲🇾' },
  { value: 'vietnam', label: 'Vietnam', flag: '🇻🇳' },
  { value: 'israel', label: 'Israel', flag: '🇮🇱' },
  { value: 'turquia', label: 'Turquía', flag: '🇹🇷' },
  { value: 'egipto', label: 'Egipto', flag: '🇪🇬' },
  { value: 'sudafrica', label: 'Sudáfrica', flag: '🇿🇦' },
  { value: 'nigeria', label: 'Nigeria', flag: '🇳🇬' },
  { value: 'kenia', label: 'Kenia', flag: '🇰🇪' },
  { value: 'marruecos', label: 'Marruecos', flag: '🇲🇦' },
  { value: 'argelia', label: 'Argelia', flag: '🇩🇿' },
  { value: 'tunez', label: 'Túnez', flag: '🇹🇳' },
  { value: 'otro', label: 'Otro', flag: '🌍' },
];

// Función para obtener el país por defecto (Colombia)
export const getDefaultPais = (): string => 'colombia';

// Función para normalizar el nombre del país desde el API
export const normalizePais = (value: string | null | undefined): string => {
  if (!value) return getDefaultPais();
  const normalized = value.toLowerCase().trim().replace(/\s+/g, '_');
  const found = paises.find(p => 
    p.value === normalized || 
    p.label.toLowerCase() === normalized ||
    p.label.toLowerCase().includes(normalized) ||
    normalized.includes(p.value)
  );
  return found?.value || normalized;
};

