import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FileText,
  Search,
  Filter,
  Eye,
  Download,
  Loader2,
  Calendar,
  User,
  Building2,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Image as ImageIcon,
  FileSignature,
  Users,
  PhoneCall,
  Wine,
  HeartPulse,
  Activity,
  ClipboardCheck,
  Info,
  Home,
  Baby,
  UserCheck,
  ClipboardList,
  Settings,
  ShieldAlert,
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import DataPagination from '@/components/ui/data-pagination';
import { TableLoadingSkeleton } from '@/components/ui/loading-skeleton';
import { socioDemographicSurveyApi, SocioDemographicSurveyListItem } from '@/services/socioDemographicSurveyApi';
import { usePermissions } from '@/hooks/usePermissions';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { tiposDocumentoCompletos, tiposDocumento, estadosCiviles, tallasUniforme, nivelesEducativos } from '@/components/actualizar-datos-personales/formOptions';
import { paises, normalizePais } from '@/components/actualizar-datos-personales/paises';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import ExportSurveysDialog from '@/components/admin/encuestas-sociodemograficas/ExportSurveysDialog';
import {
  requestVaccinationSurveyExport,
  getVaccinationExportStatus,
  downloadVaccinationExport,
} from '@/services/vaccinationSurveyAdminApi';
import { MultiSelect, MultiSelectOption } from '@/components/ui/multi-select';

// Función para obtener el nombre completo del tipo de documento
const getTipoDocumentoDisplayName = (tipoDocumento: string | null | undefined): string => {
  if (!tipoDocumento) return '';
  const tipo = tiposDocumentoCompletos.find(t => t.value === tipoDocumento);
  return tipo?.label || tipoDocumento;
};

// Función para obtener solo la abreviación del tipo de documento
const getTipoDocumentoAbbreviation = (tipoDocumento: string | null | undefined): string => {
  if (!tipoDocumento) return '';
  const tipo = tiposDocumento.find(t => t.value === tipoDocumento);
  return tipo?.label || tipoDocumento;
};

// Funciones para mapear valores a texto legible
const getViviendaDisplayName = (value: string | null | undefined): string => {
  if (!value) return 'No especificado';
  const map: Record<string, string> = {
    'propia': 'Propia',
    'arrendada': 'Arrendada',
    'familiar': 'Familiar',
  };
  return map[value.toLowerCase()] || value;
};

const getConviveConDisplayName = (value: string | null | undefined): string => {
  if (!value) return 'No especificado';
  const map: Record<string, string> = {
    'familia_origen': 'Familia de origen',
    'nueva_familia': 'Nueva familia (cónyuge e hijos)',
    'ambas': 'Las dos anteriores',
    'amigos': 'Amigos',
    'otros_familiares': 'Otros familiares',
    'solo': 'Vive solo',
  };
  return map[value.toLowerCase()] || value;
};

const getTransporteDisplayName = (value: string | null | undefined): string => {
  if (!value) return 'No especificado';
  const map: Record<string, string> = {
    'carro': 'Carro',
    'motocicleta': 'Motocicleta',
    'bicicleta': 'Bicicleta',
    'transporte_publico': 'Transporte público',
    'caminando': 'Caminando',
    'otra': 'Otra',
  };
  return map[value.toLowerCase()] || value;
};

const getTiempoLibreConDisplayName = (value: string | null | undefined): string => {
  if (!value) return 'No especificado';
  const map: Record<string, string> = {
    'familia': 'Con la familia',
    'pareja': 'Con la pareja',
    'amigos': 'Con amigos',
    'solo': 'Solo',
    'otros': 'Otros',
  };
  return map[value.toLowerCase()] || value;
};

const getGeneroDisplayName = (value: string | null | undefined): string => {
  if (!value) return 'No especificado';
  const map: Record<string, string> = {
    'masculino': 'Masculino',
    'femenino': 'Femenino',
    'otro': 'Otro',
  };
  return map[value.toLowerCase()] || value;
};

const getRelacionContactoEmergenciaDisplayName = (value: string | null | undefined): string => {
  if (!value) return 'No especificado';
  const map: Record<string, string> = {
    'conyuge': 'Cónyuge',
    'padre': 'Padre',
    'madre': 'Madre',
    'hijo': 'Hijo/a',
    'hermano': 'Hermano/a',
    'abuelo': 'Abuelo/a',
    'tio': 'Tío/a',
    'primo': 'Primo/a',
    'amigo': 'Amigo/a',
    'otro': 'Otro',
  };
  return map[value.toLowerCase()] || value;
};

const getFrecuenciaDisplayName = (value: string | null | undefined): string => {
  if (!value) return 'No especificado';
  const map: Record<string, string> = {
    'diario': 'Diario',
    'varias_veces_semana': 'Varias veces en la semana',
    'fines_semana': 'Fines de semana',
    'cada_quince_dias': 'Cada quince días',
    'ocasionalmente': 'Ocasionalmente',
  };
  return map[value.toLowerCase()] || value;
};

const getRazaDisplayName = (value: string | null | undefined): string => {
  if (!value) return 'No especificado';
  const map: Record<string, string> = {
    'ninguno': 'Ninguno',
    'afro': 'Afrocolombiano',
    'indigena': 'Indígena',
    'otro': 'Otro',
    'no_responde': 'Prefiere no responder',
  };
  return map[value.toLowerCase()] || value;
};

const getEstadoCivilDisplayName = (value: string | null | undefined): string => {
  if (!value) return 'No especificado';
  const estado = estadosCiviles.find(e => e.value === value.toLowerCase());
  return estado?.label || value;
};

const getNivelEducacionDisplayName = (value: string | null | undefined): string => {
  if (!value) return 'No especificado';
  const nivel = nivelesEducativos.find(n => n.value === value.toLowerCase());
  return nivel?.label || value;
};

const getTallaVestimentaDisplayName = (value: string | null | undefined): string => {
  if (!value) return 'No especificado';
  const talla = tallasUniforme.find(t => t.value === value.toLowerCase());
  return talla?.label || value.toUpperCase();
};

// Helper para convertir valores del API (que pueden ser "0"/"1" o 0/1 o booleanos) a boolean
const toBoolean = (value: string | number | boolean | null | undefined): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    // Convertir "0", "false", "False" a false, cualquier otro string a true
    const normalized = value.trim().toLowerCase();
    return normalized !== '0' && normalized !== 'false' && normalized !== '';
  }
  return false;
};

// Función para obtener el país con bandera
const getPaisWithFlag = (value: string | null | undefined): string => {
  if (!value) return 'No especificado';
  const normalized = normalizePais(value);
  const pais = paises.find(p => p.value === normalized);
  if (pais) {
    return `${pais.flag} ${pais.label}`;
  }
  return value;
};

const formatDireccionConBarrio = (
  direccion?: string | null,
  barrio?: string | null,
): string => {
  const direccionTrimmed = (direccion ?? '').trim();
  const barrioTrimmed = (barrio ?? '').trim();

  if (direccionTrimmed && barrioTrimmed) {
    return `${direccionTrimmed}, ${barrioTrimmed}`;
  }

  return direccionTrimmed || barrioTrimmed;
};

// Función para obtener el icono y color del género
const getGeneroIcon = (genero: string | null | undefined) => {
  if (!genero) return null;
  const normalized = genero.toLowerCase();
  if (normalized === 'masculino') {
    // Icono masculino: usar User con color azul
    return <User className="h-4 w-4 text-blue-600" />;
  } else if (normalized === 'femenino') {
    // Icono femenino: usar UserCheck con color rosa
    return <UserCheck className="h-4 w-4 text-pink-500" />;
  }
  return null;
};

// Función para obtener el nombre de visualización del tipo de encuesta
const getSurveyTypeDisplayName = (surveyType: string | null | undefined): string => {
  // null se trata como active_affiliate por compatibilidad
  if (!surveyType) return 'Afiliados Activos';
  // Mapear 'bulk_entry' legacy a 'new_entry' para visualización
  const normalizedType = surveyType === 'bulk_entry' ? 'new_entry' : surveyType;
  const map: Record<string, string> = {
    'active_affiliate': 'Afiliado Activo',
    'new_entry': 'Nuevo Ingreso',
  };
  return map[normalizedType] || normalizedType;
};

// Función para obtener las clases CSS del badge según el tipo de encuesta
const getSurveyTypeBadgeClasses = (surveyType: string | null | undefined): string => {
  // Mapear 'bulk_entry' legacy a 'new_entry' para visualización
  const normalizedType = surveyType === 'bulk_entry' ? 'new_entry' : (surveyType || 'active_affiliate');
  if (normalizedType === 'new_entry') {
    return 'text-xs bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-200 whitespace-nowrap';
  }
  // active_affiliate por defecto (incluye null)
  return 'text-xs bg-green-100 text-green-800 border-green-300 hover:bg-green-200 whitespace-nowrap';
};

const LaborRestrictionIndicator: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span
    className={`inline-block h-2.5 w-2.5 rounded-full bg-purple-600 flex-shrink-0 ${className}`}
    title="Tiene recomendación o restricción laboral"
    aria-label="Tiene recomendación o restricción laboral"
  />
);

const AdminEncuestasSociodemograficasPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { can } = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const currentYear = new Date().getFullYear();

  // Estado para filtros (encuestas agrupadas por año por requisito SST)
  const [yearFilter, setYearFilter] = useState<number>(() => {
    const y = searchParams.get('year') || searchParams.get('ano');
    if (y) {
      const n = parseInt(y, 10);
      if (n >= 2000 && n <= 2100) return n;
    }
    return currentYear;
  });
  const [monthFilter, setMonthFilter] = useState<string>(() => {
    const m = searchParams.get('month') || searchParams.get('mes');
    if (m) {
      const n = parseInt(m, 10);
      if (n >= 1 && n <= 12) return m;
    }
    return '';
  });
  const [hospitalsFilter, setHospitalsFilter] = useState<string[]>(() => {
    const h = searchParams.get('hospitals') || searchParams.get('hospital');
    if (h) return h.split(',').map((s) => s.trim()).filter(Boolean);
    return [];
  });
  const [hospitalFilter, setHospitalFilter] = useState<string>(
    searchParams.get('hospital') && !searchParams.get('hospitals') ? searchParams.get('hospital')! : ''
  );
  const [surveyTypeFilter, setSurveyTypeFilter] = useState<string>(
    searchParams.get('survey_type') || 'all'
  );
  const [numeroDocumentoFilter, setNumeroDocumentoFilter] = useState<string>(
    searchParams.get('numero_documento') || ''
  );
  const [nombreFilter, setNombreFilter] = useState<string>(
    searchParams.get('nombre') || ''
  );
  const [laborRestrictionFilter, setLaborRestrictionFilter] = useState<string>(() => {
    const value = searchParams.get('recomendacion_restriccion_laboral');
    return value === 'si' || value === 'no' ? value : 'all';
  });
  const [perPage, setPerPage] = useState<number>(
    parseInt(searchParams.get('per_page') || '15', 10)
  );
  const [currentPage, setCurrentPage] = useState<number>(
    parseInt(searchParams.get('page') || '1', 10)
  );
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [isExportingVaccination, setIsExportingVaccination] = useState(false);
  const vaccinationExportPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Limpiar polling de export vacunación al desmontar
  useEffect(() => {
    return () => {
      if (vaccinationExportPollingRef.current) {
        clearInterval(vaccinationExportPollingRef.current);
      }
    };
  }, []);

  // Debounce para el filtro de número de documento
  const [numeroDocumentoFilterDebounced, setNumeroDocumentoFilterDebounced] = useState<string>(
    searchParams.get('numero_documento') || ''
  );
  
  // Debounce para el filtro de nombre
  const [nombreFilterDebounced, setNombreFilterDebounced] = useState<string>(
    searchParams.get('nombre') || ''
  );
  
  // Sincronizar el estado debounced cuando cambia el input
  useEffect(() => {
    const timer = setTimeout(() => {
      setNumeroDocumentoFilterDebounced(numeroDocumentoFilter);
    }, 500); // 500ms de debounce
    
    return () => clearTimeout(timer);
  }, [numeroDocumentoFilter]);

  // Sincronizar el estado debounced cuando cambia el input de nombre
  useEffect(() => {
    const timer = setTimeout(() => {
      setNombreFilterDebounced(nombreFilter);
    }, 500); // 500ms de debounce
    
    return () => clearTimeout(timer);
  }, [nombreFilter]);

  // Resetear página a 1 cuando cambian los filtros (excepto perPage y currentPage)
  useEffect(() => {
    if (id) return;
    setCurrentPage(1);
  }, [yearFilter, monthFilter, hospitalsFilter, hospitalFilter, surveyTypeFilter, laborRestrictionFilter, numeroDocumentoFilterDebounced, nombreFilterDebounced, id]);

  // Sincronizar filtros con searchParams automáticamente (reactivo)
  useEffect(() => {
    if (id) return; // No actualizar si estamos en vista de detalle

    const newParams = new URLSearchParams();
    newParams.set('year', yearFilter.toString());
    if (monthFilter) newParams.set('month', monthFilter);
    if (hospitalsFilter.length) newParams.set('hospitals', hospitalsFilter.join(','));
    else if (hospitalFilter.trim()) newParams.set('hospital', hospitalFilter.trim());
    if (surveyTypeFilter && surveyTypeFilter !== 'all') {
      newParams.set('survey_type', surveyTypeFilter);
    }
    if (numeroDocumentoFilterDebounced.trim()) {
      newParams.set('numero_documento', numeroDocumentoFilterDebounced.trim());
    }
    if (nombreFilterDebounced.trim()) {
      newParams.set('nombre', nombreFilterDebounced.trim());
    }
    if (laborRestrictionFilter && laborRestrictionFilter !== 'all') {
      newParams.set('recomendacion_restriccion_laboral', laborRestrictionFilter);
    }
    newParams.set('per_page', perPage.toString());
    newParams.set('page', currentPage.toString());

    // Solo actualizar si hay cambios para evitar loops infinitos
    const currentParams = searchParams.toString();
    const newParamsString = newParams.toString();
    if (currentParams !== newParamsString) {
      setSearchParams(newParams, { replace: true });
    }
  }, [yearFilter, monthFilter, hospitalsFilter, hospitalFilter, surveyTypeFilter, laborRestrictionFilter, numeroDocumentoFilterDebounced, nombreFilterDebounced, perPage, currentPage, id]);

  // Opciones de filtrado (endpoint dedicado; la respuesta index puede incluir filter_options y se usará al cargar)
  const { data: filterOptionsData } = useQuery({
    queryKey: ['socio-demographic-surveys', 'filter-options'],
    queryFn: () => socioDemographicSurveyApi.getFilterOptions(),
    enabled: can('socio_demographic_surveys.view') && !id,
  });

  // Construir parámetros de consulta (ejecutar siempre, incluso si hay id)
  const queryParams = useMemo(() => {
    if (id) return {}; // Retornar objeto vacío si hay id, no se usará
    const params: any = {
      per_page: perPage,
      page: currentPage,
      year: yearFilter,
    };
    if (monthFilter) params.month = parseInt(monthFilter, 10);
    if (hospitalsFilter.length) params.hospitals = hospitalsFilter;
    else if (hospitalFilter.trim()) params.hospital = hospitalFilter.trim();
    if (surveyTypeFilter && surveyTypeFilter !== 'all') params.survey_type = surveyTypeFilter;
    const nombreTrimmed = nombreFilterDebounced.trim();
    if (nombreTrimmed) params.nombre = nombreTrimmed;
    const documentoTrimmed = numeroDocumentoFilterDebounced.trim();
    if (documentoTrimmed) params.numero_documento = documentoTrimmed;
    if (laborRestrictionFilter === 'si' || laborRestrictionFilter === 'no') {
      params.recomendacion_restriccion_laboral = laborRestrictionFilter;
    }
    return params;
  }, [id, yearFilter, monthFilter, hospitalsFilter, hospitalFilter, surveyTypeFilter, laborRestrictionFilter, nombreFilterDebounced, numeroDocumentoFilterDebounced, perPage, currentPage]);

  // Obtener lista de encuestas (ejecutar siempre, pero solo habilitado si no hay id)
  const {
    data: surveysResponse,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['socio-demographic-surveys', queryParams],
    queryFn: () => socioDemographicSurveyApi.getSurveys(queryParams),
    enabled: can('socio_demographic_surveys.view') && !id,
  });

  // Opciones de filtrado: preferir filter_options de la respuesta index, si no del endpoint
  const filterOptions = useMemo(() => {
    const fromIndex = surveysResponse?.filter_options;
    const fromEndpoint = filterOptionsData?.data;
    return {
      years: fromIndex?.years?.length ? fromIndex.years : fromEndpoint?.years ?? [],
      hospitals: fromIndex?.hospitals?.length ? fromIndex.hospitals : fromEndpoint?.hospitals ?? [],
    };
  }, [surveysResponse?.filter_options, filterOptionsData?.data]);

  const availableYears = useMemo(() => {
    const y = filterOptions.years;
    const base = y.length ? y.slice().sort((a, b) => b - a) : [currentYear, currentYear - 1, currentYear - 2];
    if (!base.includes(yearFilter)) base.push(yearFilter);
    return base.sort((a, b) => b - a);
  }, [filterOptions.years, currentYear, yearFilter]);

  // Meses disponibles para el filtro: si es el año actual, solo hasta el mes actual
  const availableMonths = useMemo(() => {
    const now = new Date();
    const maxMonth = yearFilter === now.getFullYear() ? now.getMonth() + 1 : 12;
    return Array.from({ length: maxMonth }, (_, i) => i + 1);
  }, [yearFilter]);

  // Si el año es el actual y el mes seleccionado es futuro, limpiar el filtro de mes
  useEffect(() => {
    const now = new Date();
    if (yearFilter === now.getFullYear() && monthFilter) {
      const m = parseInt(monthFilter, 10);
      if (m > now.getMonth() + 1) setMonthFilter('');
    }
  }, [yearFilter, monthFilter]);

  // Filtrar por número de documento en el frontend (además de backend, por compatibilidad)
  const filteredSurveys = useMemo(() => {
    let surveys = surveysResponse?.data || [];
    
    // Filtrar por número de documento si hay un valor
    const documentoTrimmed = numeroDocumentoFilterDebounced.trim();
    if (documentoTrimmed) {
      surveys = surveys.filter((survey) =>
        survey.numero_documento?.includes(documentoTrimmed)
      );
    }
    
    return surveys;
  }, [surveysResponse?.data, numeroDocumentoFilterDebounced]);

  // Usar la paginación reportada por el backend
  const pagination = useMemo(() => {
    if (!surveysResponse?.pagination) return undefined;
    return {
      ...surveysResponse.pagination,
      // Mantener sincronizados current_page y per_page con el estado local
      current_page: currentPage,
      per_page: perPage,
    };
  }, [currentPage, perPage, surveysResponse?.pagination]);

  const surveys = filteredSurveys;
  const metrics = surveysResponse?.metrics;


  // Verificar permisos (después de todos los hooks)
  if (!can('socio_demographic_surveys.view')) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center min-h-screen">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Acceso denegado</CardTitle>
              <CardDescription>
                No tienes permisos para acceder a esta sección.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  // Si hay un ID en la URL, mostrar el detalle (después de TODOS los hooks)
  if (id) {
    return <AdminEncuestaDetailView surveyId={id} />;
  }

  // Función para actualizar filtros y resetear a página 1 (ya no se usa, pero se mantiene por si acaso)
  // Los filtros ahora son reactivos y se actualizan automáticamente

  // Función para limpiar filtros
  const handleClearFilters = () => {
    setYearFilter(currentYear);
    setMonthFilter('');
    setHospitalsFilter([]);
    setHospitalFilter('');
    setSurveyTypeFilter('all');
    setLaborRestrictionFilter('all');
    setNumeroDocumentoFilter('');
    setNombreFilter('');
    setCurrentPage(1);
    setSearchParams({});
  };

  const hasActiveFilters = Boolean(
    yearFilter !== currentYear ||
    monthFilter ||
    hospitalsFilter.length ||
    hospitalFilter.trim() ||
    surveyTypeFilter !== 'all' ||
    laborRestrictionFilter !== 'all' ||
    numeroDocumentoFilter.trim() ||
    nombreFilter.trim()
  );

  // Formatear fecha (lista: DD/MM/YYYY HH:mm)
  const formatDate = (dateString: string) => {
    try {
      // Manejar formato ISO: "2026-01-10T19:55:10.000000Z" o "2026-01-10T19:55:10Z"
      // o formato alternativo: "10/01/2026 13:30:45" (DD/MM/YYYY HH:MM:SS)
      let date: Date;
      
      if (dateString.includes('T')) {
        // Formato ISO - usar parseISO de date-fns que parsea correctamente YYYY-MM-DDTHH:mm:ss
        // Asegurarse de que el string esté en formato válido removiendo microsegundos si existen
        const isoString = dateString.replace(/\.\d+Z$/, 'Z'); // Remover microsegundos si existen
        date = parseISO(isoString);
        
        // Validar que la fecha sea válida
        if (isNaN(date.getTime())) {
          throw new Error('Invalid date');
        }
      } else if (dateString.includes('/')) {
        // Formato DD/MM/YYYY HH:MM:SS
        const [datePart, timePart] = dateString.split(' ');
        const [day, month, year] = datePart.split('/');
        // Crear fecha en formato YYYY-MM-DD para parseISO
        const time = timePart || '00:00:00';
        const [hours, minutes] = time.split(':');
        date = parseISO(`${year}-${month}-${day}T${hours}:${minutes || '00'}:00`);
      } else {
        // Intentar parsear directamente
        date = parseISO(dateString);
      }
      
      // Validar que la fecha sea válida
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date');
      }
      
      return format(date, "dd/MM/yyyy HH:mm");
    } catch {
      return dateString;
    }
  };

  // Variantes de animación
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 100 }
    }
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-slate-50">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto"
        >
          {/* Header */}
          <motion.div variants={itemVariants}>
            <Card className="border shadow-sm">
              <CardHeader className="pb-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1">
                    <div className="bg-primary-prosalud/10 p-2 sm:p-3 rounded-lg flex-shrink-0">
                      <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-primary-prosalud" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-xl sm:text-2xl lg:text-3xl font-bold text-primary-prosalud block">
                        Encuestas Sociodemográficas y Salud
                      </CardTitle>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2">
                        <span className="text-slate-600 font-medium">Año:</span>
                        <div className="flex items-center gap-1 rounded-lg border bg-white p-0.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              const idx = availableYears.indexOf(yearFilter);
                              if (idx < availableYears.length - 1) setYearFilter(availableYears[idx + 1]);
                            }}
                            disabled={availableYears.indexOf(yearFilter) >= availableYears.length - 1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <Select
                            value={yearFilter.toString()}
                            onValueChange={(v) => setYearFilter(parseInt(v, 10))}
                          >
                            <SelectTrigger className="h-8 w-[4.5rem] border-0 shadow-none">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {availableYears.map((y) => (
                                <SelectItem key={y} value={y.toString()}>
                                  {y}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              const idx = availableYears.indexOf(yearFilter);
                              if (idx > 0) setYearFilter(availableYears[idx - 1]);
                            }}
                            disabled={availableYears.indexOf(yearFilter) <= 0}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                        {pagination && (
                          <Badge variant="secondary" className="text-sm sm:text-base px-2 sm:px-3 py-1 w-fit">
                            Total: {pagination.total}
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-sm sm:text-base mt-1 sm:mt-2">
                        Visualiza y gestiona las encuestas sociodemográficas y de diagnóstico de condiciones de salud. Las encuestas se agrupan por año (requisito SST).
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                    {can('socio_demographic_surveys.view') && (
                      <Button
                        onClick={() => setExportDialogOpen(true)}
                        className="w-full sm:w-auto bg-primary-prosalud hover:bg-primary-prosalud-dark"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">Exportar Reporte</span>
                        <span className="sm:hidden">Exportar</span>
                      </Button>
                    )}
                    {can('vaccination_surveys.view') && (
                      <Button
                        variant="outline"
                        disabled={isExportingVaccination}
                        onClick={async () => {
                          const POLL_INTERVAL_MS = 3000;
                          const MAX_POLL_ATTEMPTS = 100; // ~5 min

                          const startPolling = (jobId: string) => {
                            let attempts = 0;

                            const poll = async () => {
                              attempts++;
                              try {
                                const statusResult = await getVaccinationExportStatus(jobId);

                                if (statusResult.status === 'completed') {
                                  if (vaccinationExportPollingRef.current) {
                                    clearInterval(vaccinationExportPollingRef.current);
                                    vaccinationExportPollingRef.current = null;
                                  }
                                  const fileName = statusResult.file_name;
                                  const { blob, filename } = await downloadVaccinationExport(
                                    jobId,
                                    fileName
                                  );
                                  const url = window.URL.createObjectURL(blob);
                                  const link = document.createElement('a');
                                  link.href = url;
                                  link.download = filename;
                                  document.body.appendChild(link);
                                  link.click();
                                  window.URL.revokeObjectURL(url);
                                  document.body.removeChild(link);
                                  setIsExportingVaccination(false);
                                  toast.success('Reporte descargado correctamente.');
                                  return;
                                }

                                if (statusResult.status === 'failed') {
                                  if (vaccinationExportPollingRef.current) {
                                    clearInterval(vaccinationExportPollingRef.current);
                                    vaccinationExportPollingRef.current = null;
                                  }
                                  setIsExportingVaccination(false);
                                  const errMsg =
                                    statusResult.error ||
                                    statusResult.message ||
                                    'Error al generar el reporte.';
                                  toast.error('Error al generar el reporte', {
                                    description: errMsg,
                                  });
                                  return;
                                }

                                if (!statusResult.success && statusResult.message) {
                                  if (vaccinationExportPollingRef.current) {
                                    clearInterval(vaccinationExportPollingRef.current);
                                    vaccinationExportPollingRef.current = null;
                                  }
                                  setIsExportingVaccination(false);
                                  toast.error('Error', {
                                    description: statusResult.message,
                                  });
                                  return;
                                }

                                if (attempts >= MAX_POLL_ATTEMPTS) {
                                  if (vaccinationExportPollingRef.current) {
                                    clearInterval(vaccinationExportPollingRef.current);
                                    vaccinationExportPollingRef.current = null;
                                  }
                                  setIsExportingVaccination(false);
                                  toast.error('El reporte está tardando más de lo habitual.', {
                                    description: 'Puede intentar de nuevo más tarde.',
                                  });
                                }
                              } catch (error) {
                                if (attempts >= MAX_POLL_ATTEMPTS) {
                                  if (vaccinationExportPollingRef.current) {
                                    clearInterval(vaccinationExportPollingRef.current);
                                    vaccinationExportPollingRef.current = null;
                                  }
                                  setIsExportingVaccination(false);
                                  toast.error(
                                    error instanceof Error ? error.message : 'Error al verificar el estado.'
                                  );
                                }
                              }
                            };

                            poll();
                            vaccinationExportPollingRef.current = setInterval(poll, POLL_INTERVAL_MS);
                          };

                          setIsExportingVaccination(true);
                          try {
                            const result = await requestVaccinationSurveyExport({});
                            toast.info('El reporte se está generando…', {
                              description: 'Se descargará automáticamente cuando esté listo.',
                            });
                            startPolling(result.job_id);
                          } catch (error) {
                            setIsExportingVaccination(false);
                            toast.error(
                              error instanceof Error ? error.message : 'Error al generar el reporte.'
                            );
                          }
                        }}
                        className="w-full sm:w-auto"
                      >
                        {isExportingVaccination ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            <span className="hidden sm:inline">Generando reporte…</span>
                            <span className="sm:hidden">...</span>
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4 mr-2" />
                            <span className="hidden sm:inline">Exportar Excel Vacunación</span>
                            <span className="sm:hidden">Excel Vacunación</span>
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>
          </motion.div>

          {/* Métricas rápidas */}
          {pagination && (
            <motion.div variants={itemVariants}>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-slate-600">
                      Total de Encuestas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{pagination.total}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-slate-600">
                      Mostrando
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {surveys.length} de {pagination.total}
                    </div>
                  </CardContent>
                </Card>
                {metrics && (
                  <>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-slate-600">
                          Este Mes
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{metrics.current_month.total}</div>
                        <div className="text-xs text-slate-500 mt-1">
                          Activos: {metrics.current_month.by_type.active_affiliate} • Nuevos: {(metrics.current_month.by_type as any).new_entry || 0}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-slate-600">
                          Para Afiliados Activos
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{metrics.by_type.active_affiliate}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-slate-600">
                          Para Nuevo Ingreso
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{(metrics.by_type as any).new_entry || 0}</div>
                      </CardContent>
                    </Card>
                  </>
                )}
                {!metrics && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-slate-600">
                        Página Actual
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {pagination.current_page} de {pagination.last_page}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </motion.div>
          )}

          {/* Filtros */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Filter className="h-5 w-5" />
                  Filtros de búsqueda
                </CardTitle>
              </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Número de Documento</label>
                <Input
                  placeholder="Buscar por número"
                  value={numeroDocumentoFilter}
                  onChange={(e) => setNumeroDocumentoFilter(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Buscar por nombre</label>
                <Input
                  placeholder="Nombre o apellido"
                  value={nombreFilter}
                  onChange={(e) => setNombreFilter(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de Encuesta</label>
                <Select value={surveyTypeFilter} onValueChange={setSurveyTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active_affiliate">Afiliados Activos</SelectItem>
                    <SelectItem value="new_entry">Nuevo Ingreso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Restricción laboral</label>
                <Select value={laborRestrictionFilter} onValueChange={setLaborRestrictionFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="si">Con restricción</SelectItem>
                    <SelectItem value="no">Sin restricción</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Mes</label>
                <Select value={monthFilter || 'all'} onValueChange={(v) => setMonthFilter(v === 'all' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los meses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los meses</SelectItem>
                    {availableMonths.map((m) => (
                      <SelectItem key={m} value={String(m)}>
                        {format(new Date(2000, m - 1, 1), 'MMMM', { locale: es })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 lg:col-span-2">
                <label className="text-sm font-medium">Hospitales</label>
                <MultiSelect
                  options={filterOptions.hospitals.map((h) => ({ value: h, label: h }))}
                  selected={hospitalsFilter}
                  onSelectionChange={setHospitalsFilter}
                  placeholder="Todos los hospitales"
                  emptyText="No hay hospitales"
                  maxDisplay={2}
                />
              </div>
              <div className="space-y-2 flex flex-col justify-end">
                {hasActiveFilters && (
                  <Button variant="outline" onClick={handleClearFilters} className="w-full">
                    <Filter className="h-4 w-4 mr-2" />
                    Limpiar filtros
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
            </Card>
          </motion.div>

          {/* Tabla de encuestas */}
          <motion.div variants={itemVariants}>
            <Card>
          <CardHeader>
            <CardTitle>
              Lista de Encuestas {yearFilter}
              {pagination && (
                <span className="ml-2 text-base font-normal text-slate-600">
                  ({pagination.total})
                </span>
              )}
            </CardTitle>
            <CardDescription>
              {pagination
                ? `Mostrando ${(currentPage - 1) * perPage + 1} - ${Math.min(
                    currentPage * perPage,
                    pagination.total
                  )} de ${pagination.total} encuestas del año ${yearFilter}`
                : 'Cargando...'}
              <span className="block sm:inline sm:ml-6 mt-1 sm:mt-0 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <LaborRestrictionIndicator className="h-2 w-2" />
                  Indica afiliado con recomendación o restricción laboral
                </span>
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <TableLoadingSkeleton columns={6} rows={5} />
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-red-600">Error al cargar las encuestas</p>
                <Button onClick={() => refetch()} className="mt-4" variant="outline">
                  Reintentar
                </Button>
              </div>
            ) : surveys.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                <p className="text-slate-600">No se encontraron encuestas</p>
              </div>
            ) : (
              <>
                {/* Desktop Table View - Hidden on mobile */}
                <div className="hidden lg:block rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Afiliado</TableHead>
                        <TableHead>Documento</TableHead>
                        <TableHead>Proceso y Hospital</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {surveys.map((survey) => {
                        const nombreCompleto = [survey.nombres, survey.apellidos].filter(Boolean).join(' ');
                        return (
                        <motion.tr
                          key={survey.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="border-b transition-colors hover:bg-slate-50"
                        >
                          <TableCell>
                            <div className="flex items-start gap-2">
                              {survey.tiene_restriccion_laboral ? (
                                <LaborRestrictionIndicator className="mt-1.5" />
                              ) : (
                                <ClipboardList className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                              )}
                              <div className="min-w-0">
                                {nombreCompleto ? (
                                  <p className="text-sm font-medium text-slate-900">{nombreCompleto}</p>
                                ) : null}
                                <p className="text-sm text-slate-600 mt-0.5">{survey.correo}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm font-medium text-slate-900 font-mono">
                                {survey.numero_documento}
                              </p>
                              <p className="text-xs text-slate-600 mt-0.5">
                                {getTipoDocumentoDisplayName(survey.tipo_documento)}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              {survey.profesion ? (
                                <p className="text-sm font-medium text-slate-900" title={survey.profesion}>
                                  {survey.profesion}
                                </p>
                              ) : (
                                <p className="text-sm text-slate-400 italic">No disponible</p>
                              )}
                              {survey.hospital && (
                                <p className="text-xs text-slate-600 mt-1" title={survey.hospital}>
                                  {survey.hospital}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={getSurveyTypeBadgeClasses(survey.survey_type)}>
                              {getSurveyTypeDisplayName(survey.survey_type || 'active_affiliate')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-slate-600">{formatDate(survey.created_at)}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/admin/encuestas-sociodemograficas/${survey.id}`)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Ver
                              <ChevronRight className="h-4 w-4 ml-2" />
                            </Button>
                          </TableCell>
                        </motion.tr>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card View - Visible on mobile and tablet */}
                <div className="lg:hidden space-y-3">
                  {surveys.map((survey) => {
                    const nombreCompleto = [survey.nombres, survey.apellidos].filter(Boolean).join(' ');
                    return (
                      <Card key={survey.id} className="border shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            {/* Header with user info and actions */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                <div className={`p-2 rounded-full flex-shrink-0 ${survey.tiene_restriccion_laboral ? 'bg-purple-100' : 'bg-slate-100'}`}>
                                  {survey.tiene_restriccion_laboral ? (
                                    <LaborRestrictionIndicator className="h-3 w-3" />
                                  ) : (
                                    <ClipboardList className="h-4 w-4 text-slate-600" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  {nombreCompleto && (
                                    <p className="font-medium text-slate-900 text-sm mb-1">
                                      {nombreCompleto}
                                    </p>
                                  )}
                                  <p className="text-xs text-slate-600 truncate">{survey.correo}</p>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/admin/encuestas-sociodemograficas/${survey.id}`)}
                                className="flex-shrink-0"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>

                            {/* Document */}
                            <div className="border-t pt-2">
                              <p className="text-xs font-medium text-slate-500 mb-1">Documento</p>
                              <div>
                                <p className="text-sm font-medium text-slate-900 font-mono">
                                  {survey.numero_documento}
                                </p>
                                <p className="text-xs text-slate-600 mt-0.5">
                                  {getTipoDocumentoDisplayName(survey.tipo_documento)}
                                </p>
                              </div>
                            </div>

                            {/* Process and Hospital */}
                            <div className="border-t pt-2">
                              <p className="text-xs font-medium text-slate-500 mb-1">Proceso y Hospital</p>
                              {survey.profesion ? (
                                <div>
                                  <p className="text-sm font-medium text-slate-900">
                                    {survey.profesion}
                                  </p>
                                  {survey.hospital && (
                                    <p className="text-xs text-slate-600 mt-1">
                                      {survey.hospital}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <p className="text-xs text-slate-400 italic">No disponible</p>
                              )}
                            </div>

                            {/* Type and Date */}
                            <div className="border-t pt-2">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <div>
                                  <p className="text-xs font-medium text-slate-500 mb-1">Tipo</p>
                                  <Badge variant="outline" className={getSurveyTypeBadgeClasses(survey.survey_type)}>
                                    {getSurveyTypeDisplayName(survey.survey_type || 'active_affiliate')}
                                  </Badge>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs font-medium text-slate-500 mb-1">Fecha</p>
                                  <p className="text-xs text-slate-900">
                                    {formatDate(survey.created_at)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Paginación */}
                {pagination && (
                  <div className="mt-4">
                    <DataPagination
                      currentPage={currentPage}
                      totalPages={pagination.last_page}
                      totalItems={pagination.total}
                      itemsPerPage={perPage}
                      onPageChange={(page) => {
                        setCurrentPage(page);
                        const newParams = new URLSearchParams(searchParams);
                        newParams.set('page', page.toString());
                        setSearchParams(newParams);
                      }}
                      onItemsPerPageChange={(itemsPerPage) => {
                        setPerPage(itemsPerPage);
                        setCurrentPage(1);
                        const newParams = new URLSearchParams(searchParams);
                        newParams.set('per_page', itemsPerPage.toString());
                        newParams.set('page', '1');
                        setSearchParams(newParams);
                      }}
                    />
                  </div>
                )}
              </>
            )}
          </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
      
      {/* Export Dialog */}
      <ExportSurveysDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        initialFilters={{
          year: yearFilter,
          month: monthFilter ? parseInt(monthFilter, 10) : undefined,
          hospitals: hospitalsFilter.length ? hospitalsFilter : undefined,
          numero_documento: numeroDocumentoFilter.trim() || undefined,
          survey_type: surveyTypeFilter && surveyTypeFilter !== 'all' ? surveyTypeFilter : undefined,
        }}
        filterOptions={{
          hospitals: filterOptions.hospitals,
          years: filterOptions.years?.length ? filterOptions.years : [currentYear, currentYear - 1, currentYear - 2],
        }}
      />
    </AdminLayout>
  );
};

// Componente para ver el detalle de una encuesta
const AdminEncuestaDetailView: React.FC<{ surveyId: string }> = ({ surveyId }) => {
  const navigate = useNavigate();
  const { can } = usePermissions();
  
  // Todos los hooks deben estar al inicio, antes de cualquier return condicional
  const [signatureImageUrl, setSignatureImageUrl] = useState<string | null>(null);
  const [isLoadingSignature, setIsLoadingSignature] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const signatureUrlRef = useRef<string | null>(null);
  
  const { data: surveyResponse, isLoading, error } = useQuery({
    queryKey: ['socio-demographic-survey', surveyId],
    queryFn: () => socioDemographicSurveyApi.getSurveyById(surveyId),
    enabled: !!surveyId && can('socio_demographic_surveys.view'),
  });

  const survey = surveyResponse?.data;
  const direccionCompleta = survey
    ? formatDireccionConBarrio(survey.direccion, survey.barrio)
    : '';

  // Cargar imagen de la firma cuando el componente se monta
  useEffect(() => {
    if (survey?.tiene_firma && surveyId) {
      setIsLoadingSignature(true);
      socioDemographicSurveyApi.downloadSignature(surveyId)
        .then((blob) => {
          const url = window.URL.createObjectURL(blob);
          // Limpiar URL anterior si existe
          if (signatureUrlRef.current) {
            window.URL.revokeObjectURL(signatureUrlRef.current);
          }
          signatureUrlRef.current = url;
          setSignatureImageUrl(url);
          setIsLoadingSignature(false);
        })
        .catch((error) => {
          console.error('Error cargando firma:', error);
          setIsLoadingSignature(false);
        });
    } else {
      // Limpiar URL si no hay firma
      if (signatureUrlRef.current) {
        window.URL.revokeObjectURL(signatureUrlRef.current);
        signatureUrlRef.current = null;
      }
      setSignatureImageUrl(null);
    }

    // Cleanup: revocar URL cuando el componente se desmonte o cambie
    return () => {
      if (signatureUrlRef.current) {
        window.URL.revokeObjectURL(signatureUrlRef.current);
        signatureUrlRef.current = null;
      }
    };
  }, [surveyId, survey?.tiene_firma]);

  const handleDownloadSignature = async () => {
    try {
      const blob = await socioDemographicSurveyApi.downloadSignature(surveyId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `firma-encuesta-${surveyId}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error descargando firma:', error);
      // Aquí podrías mostrar un toast de error
    }
  };

  const handleDownloadPdf = async () => {
    if (!survey) return;
    
    setIsDownloadingPdf(true);
    try {
      const blob = await socioDemographicSurveyApi.downloadPdf(surveyId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // El nombre del archivo debe ser: Encuesta_Sociodemografica_{surveyId}_{documento}.pdf
      const filename = `Encuesta_Sociodemografica_${surveyId}_${survey.numero_documento}.pdf`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('PDF descargado', {
        description: 'El PDF de la encuesta se ha descargado correctamente.',
      });
    } catch (error) {
      console.error('Error descargando PDF:', error);
      toast.error('Error al descargar PDF', {
        description: 'No se pudo descargar el PDF de la encuesta. Por favor, intente nuevamente.',
      });
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Helper para formatear valores de respuesta Si/No con iconos
  const formatSiNo = (value: string | null | undefined) => {
    if (!value) {
      return (
        <span className="flex items-center gap-2 text-slate-500">
          <XCircle className="h-4 w-4" />
          No especificado
        </span>
      );
    }
    if (value.toLowerCase() === 'si') {
      return (
        <span className="flex items-center gap-2 text-green-600 font-medium">
          <CheckCircle2 className="h-4 w-4" />
          Sí
        </span>
      );
    }
    return (
      <span className="flex items-center gap-2 text-red-600 font-medium">
        <XCircle className="h-4 w-4" />
        No
      </span>
    );
  };

  // Helper para formatear limitaciones
  const formatLimitacion = (value: string) => {
    // Normalizar a mayúsculas para manejar ambos casos (minúscula y mayúscula)
    const normalizedValue = value?.toUpperCase() || '';
    const map: Record<string, string> = {
      'LIMITA_MUCHO': 'Me limita mucho',
      'LIMITA_POCO': 'Me limita un poco',
      'NO_LIMITA': 'No me limita nada',
      // Mantener compatibilidad con valores en minúscula (por si acaso)
      'limita_mucho': 'Me limita mucho',
      'limita_poco': 'Me limita un poco',
      'no_limita': 'No me limita nada',
    };
    return map[normalizedValue] || map[value] || value;
  };

  // Helper para formatear fechas (sin hora)
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'No especificado';
    try {
      // Usar parseISO de date-fns para parsear correctamente fechas ISO
      const date = dateString.includes('T') ? parseISO(dateString.replace(/\.\d+Z$/, 'Z')) : parseISO(dateString);
      if (isNaN(date.getTime())) {
        return dateString;
      }
      return format(date, "dd 'de' MMMM, yyyy", { locale: es });
    } catch {
      return dateString;
    }
  };

  // Helper para formatear fecha de registro (con hora)
  const formatDateTime = (dateString: string | null | undefined) => {
    if (!dateString) return 'No especificado';
    try {
      let date: Date;
      
      if (dateString.includes('T')) {
        // Formato ISO - usar parseISO de date-fns que parsea correctamente YYYY-MM-DDTHH:mm:ss
        const isoString = dateString.replace(/\.\d+Z$/, 'Z'); // Remover microsegundos si existen
        date = parseISO(isoString);
      } else if (dateString.includes('/')) {
        // Formato DD/MM/YYYY HH:MM:SS
        const [datePart, timePart] = dateString.split(' ');
        const [day, month, year] = datePart.split('/');
        const time = timePart || '00:00:00';
        const [hours, minutes] = time.split(':');
        date = parseISO(`${year}-${month}-${day}T${hours}:${minutes || '00'}:00`);
      } else {
        // Intentar parsear directamente
        date = parseISO(dateString);
      }
      
      // Validar que la fecha sea válida
      if (isNaN(date.getTime())) {
        return dateString;
      }
      
      return format(date, "dd 'de' MMMM, yyyy 'a las' HH:mm", { locale: es });
    } catch {
      return dateString;
    }
  };

  // Variantes de animación para el detalle
  const containerVariantsDetail = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariantsDetail = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 100 }
    }
  };

  if (!can('socio_demographic_surveys.view')) {
    return (
      <AdminLayout>
        <div className="min-h-screen bg-slate-50">
          <div className="p-4 sm:p-6 max-w-7xl mx-auto">
            <div className="flex justify-center items-center min-h-[60vh]">
              <Card className="max-w-md">
                <CardHeader>
                  <CardTitle>Acceso denegado</CardTitle>
                  <CardDescription>
                    No tienes permisos para acceder a esta sección.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="min-h-screen bg-slate-50">
          <div className="p-4 sm:p-6 max-w-7xl mx-auto">
            <div className="flex justify-center items-center min-h-[60vh]">
              <Loader2 className="h-8 w-8 animate-spin text-primary-prosalud" />
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !survey) {
    return (
      <AdminLayout>
        <div className="min-h-screen bg-slate-50">
          <div className="p-4 sm:p-6 max-w-7xl mx-auto">
            <div className="flex justify-center items-center min-h-[60vh]">
              <Card className="max-w-md">
                <CardHeader>
                  <CardTitle>Error</CardTitle>
                  <CardDescription>
                    No se pudo cargar la encuesta. Puede que no exista o no tengas permisos para verla.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => navigate('/admin/encuestas-sociodemograficas')}>
                    Volver a la lista
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="min-h-screen bg-slate-50">
        <motion.div
          variants={containerVariantsDetail}
          initial="hidden"
          animate="visible"
          className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto"
        >
          {/* Header con botón volver */}
          <motion.div variants={itemVariantsDetail}>
            <Card className="border shadow-sm">
              <CardHeader className="pb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="outline"
                      onClick={() => navigate('/admin/encuestas-sociodemograficas')}
                    >
                      ← Volver
                    </Button>
                    <div className="flex-1">
                      <CardTitle className="text-3xl font-bold text-primary-prosalud flex flex-wrap items-center gap-3">
                        Encuesta Sociodemográfica
                        {survey.recomendacion_restriccion_laboral?.toLowerCase() === 'si' && (
                          <Badge className="bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-100 gap-1.5">
                            <LaborRestrictionIndicator className="h-2 w-2" />
                            Restricción laboral
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="text-base mt-2 flex items-center gap-2">
                        <span>ID: <span className="font-mono">{survey.id}</span></span>
                        <span>•</span>
                        <span>Tipo: <Badge variant="outline" className={`ml-1 ${getSurveyTypeBadgeClasses(survey.survey_type)}`}>
                          {getSurveyTypeDisplayName(survey.survey_type || 'active_affiliate')}
                        </Badge></span>
                      </CardDescription>
                    </div>
                  </div>
                  <div className="mt-4 sm:mt-0 flex items-center gap-4">
                    <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-500" />
                        <div>
                          <p className="text-xs text-slate-500 font-medium">Fecha de Registro</p>
                          <p className="text-sm text-slate-900 font-medium">{formatDateTime(survey.created_at)}</p>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="default"
                      onClick={handleDownloadPdf}
                      disabled={isDownloadingPdf}
                      className="flex-shrink-0"
                    >
                      {isDownloadingPdf ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Descargando...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Descargar PDF
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </motion.div>

          {survey.recomendacion_restriccion_laboral?.toLowerCase() === 'si' && (
            <motion.div variants={itemVariantsDetail}>
              <Alert className="border-purple-300 bg-purple-50">
                <ShieldAlert className="h-5 w-5 text-purple-700" />
                <AlertTitle className="text-purple-900">Restricción laboral reportada</AlertTitle>
                <AlertDescription className="text-purple-800">
                  Este afiliado indicó que tiene una recomendación o restricción laboral emitida por un médico o especialista.
                  Revise el detalle para evaluar la situación y definir las acciones que correspondan.
                  {survey.detalle_recomendacion_laboral && (
                    <span className="block mt-2 font-medium whitespace-pre-wrap">
                      {survey.detalle_recomendacion_laboral}
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            </motion.div>
          )}

          {/* Información General */}
          <motion.div variants={itemVariantsDetail}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-primary-prosalud" />
                  Información General
                </CardTitle>
              </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(survey.nombres || survey.apellidos) && (
              <div>
                <label className="text-sm font-medium text-slate-600">Nombre Completo</label>
                <p className="text-base">{[survey.nombres, survey.apellidos].filter(Boolean).join(' ')}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-slate-600">Correo</label>
              <p className="text-base">{survey.correo}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Documento de Identidad</label>
              <p className="text-base">
                <Badge variant="outline" className="mr-2">
                  {getTipoDocumentoDisplayName(survey.tipo_documento)}
                </Badge>
                <span className="font-mono">{survey.numero_documento}</span>
              </p>
            </div>
            {survey.hospital && (
              <div>
                <label className="text-sm font-medium text-slate-600">Hospital</label>
                <p className="text-base">{survey.hospital}</p>
              </div>
            )}
            {survey.profesion && (
              <div>
                <label className="text-sm font-medium text-slate-600">Proceso</label>
                <p className="text-base">{survey.profesion}</p>
              </div>
            )}
          </CardContent>
            </Card>
          </motion.div>

          {/* Datos Básicos Adicionales */}
          {(survey.rh || survey.fecha_expedicion || survey.lugar_nacimiento || survey.departamento || 
            survey.municipio || survey.barrio || survey.celular || survey.direccion || survey.talla_calzado || 
            survey.talla_vestimenta || survey.pais_nacimiento) && (
            <motion.div variants={itemVariantsDetail}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary-prosalud" />
                    Datos Básicos Adicionales
                  </CardTitle>
                </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {survey.rh && (
                <div>
                  <label className="text-sm font-medium text-slate-600">RH</label>
                  <p className="text-base">{survey.rh}</p>
                </div>
              )}
              {survey.fecha_expedicion && (
                <div>
                  <label className="text-sm font-medium text-slate-600">Fecha de Expedición</label>
                  <p className="text-base">{formatDate(survey.fecha_expedicion)}</p>
                </div>
              )}
              {survey.lugar_nacimiento && (
                <div>
                  <label className="text-sm font-medium text-slate-600">Lugar de Nacimiento</label>
                  <p className="text-base">{survey.lugar_nacimiento}</p>
                </div>
              )}
              {(survey.departamento || survey.municipio) && (
                <div>
                  <label className="text-sm font-medium text-slate-600">Departamento y Municipio</label>
                  <p className="text-base">
                    {survey.departamento || 'No especificado'}
                    {survey.departamento && survey.municipio && ' - '}
                    {survey.municipio || ''}
                  </p>
                </div>
              )}
              {survey.pais_nacimiento && (
                <div>
                  <label className="text-sm font-medium text-slate-600">País de Nacimiento</label>
                  <p className="text-base">{getPaisWithFlag(survey.pais_nacimiento)}</p>
                </div>
              )}
              {survey.celular && (
                <div>
                  <label className="text-sm font-medium text-slate-600">Celular</label>
                  <p className="text-base">{survey.celular}</p>
                </div>
              )}
              {direccionCompleta && (
                <div>
                  <label className="text-sm font-medium text-slate-600">Dirección</label>
                  <p className="text-base">{direccionCompleta}</p>
                </div>
              )}
              {survey.talla_calzado && (
                <div>
                  <label className="text-sm font-medium text-slate-600">Talla de Calzado</label>
                  <p className="text-base">{survey.talla_calzado}</p>
                </div>
              )}
              {survey.talla_vestimenta && (
                <div>
                  <label className="text-sm font-medium text-slate-600">Talla de Vestimenta</label>
                  <p className="text-base">{getTallaVestimentaDisplayName(survey.talla_vestimenta)}</p>
                </div>
              )}
            </CardContent>
              </Card>
            </motion.div>
          )}

            {/* Contacto de Emergencia */}
          {(survey.nombre_contacto_emergencia || survey.relacion_contacto_emergencia || 
            survey.telefono_contacto_emergencia) && (
            <motion.div variants={itemVariantsDetail}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PhoneCall className="h-5 w-5 text-primary-prosalud" />
                    Contacto de Emergencia
                  </CardTitle>
                </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {survey.nombre_contacto_emergencia && (
                <div>
                  <label className="text-sm font-medium text-slate-600">Nombre</label>
                  <p className="text-base">{survey.nombre_contacto_emergencia}</p>
                </div>
              )}
              {survey.relacion_contacto_emergencia && (
                <div>
                  <label className="text-sm font-medium text-slate-600">Relación</label>
                  <p className="text-base">{getRelacionContactoEmergenciaDisplayName(survey.relacion_contacto_emergencia)}</p>
                </div>
              )}
              {survey.telefono_contacto_emergencia && (
                <div>
                  <label className="text-sm font-medium text-slate-600">Teléfono</label>
                  <p className="text-base">{survey.telefono_contacto_emergencia}</p>
                </div>
              )}
            </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Datos Sociodemográficos - Esto será muy extenso, así que lo haré en secciones */}
          {survey.datos_sociodemograficos && (
            <motion.div variants={itemVariantsDetail}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary-prosalud" />
                    Datos Sociodemográficos
                  </CardTitle>
                </CardHeader>
            <CardContent className="space-y-6">
              {/* Información personal básica */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border-b pb-4">
                <div>
                  <label className="text-sm font-medium text-slate-600">Fecha de Nacimiento</label>
                  <p className="text-base">{formatDate(survey.datos_sociodemograficos.fechaNacimiento)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Estatura (cm)</label>
                  <p className="text-base">{survey.datos_sociodemograficos.estatura}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Peso (kg)</label>
                  <p className="text-base">{survey.datos_sociodemograficos.peso}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Género</label>
                  <p className="text-base">{getGeneroDisplayName(survey.datos_sociodemograficos.genero)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Estado Civil</label>
                  <p className="text-base">{getEstadoCivilDisplayName(survey.datos_sociodemograficos.estadoCivil)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Nivel Educativo</label>
                  <p className="text-base">{getNivelEducacionDisplayName(survey.datos_sociodemograficos.nivelEducativo)}</p>
                </div>
              </div>

              {/* Información familiar */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border-b pb-4">
                <div>
                  <label className="text-sm font-medium text-slate-600">Tiene Personas a Cargo</label>
                  <p className="text-base">{formatSiNo(survey.datos_sociodemograficos.tienePersonasACargo)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Número de Hijos</label>
                  <p className="text-base">{survey.datos_sociodemograficos.numeroHijos || '0'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Personas Dependientes</label>
                  <p className="text-base">{survey.datos_sociodemograficos.numeroPersonasDependientes || '0'}</p>
                </div>
              </div>

              {/* Hijos */}
              {survey.datos_sociodemograficos.hijos && survey.datos_sociodemograficos.hijos.length > 0 && (
                <div className="border-b pb-4">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Baby className="h-5 w-5 text-primary-prosalud" />
                    Información de Hijos
                  </h3>
                  <div className="space-y-4">
                    {survey.datos_sociodemograficos.hijos.map((hijo, index) => (
                      <Card key={index} className="bg-slate-50">
                        <CardContent className="pt-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                              <label className="text-sm font-medium text-slate-600">Nombre</label>
                              <div className="flex items-center gap-2 mt-1">
                                {getGeneroIcon(hijo.genero)}
                                <p className="text-base">{hijo.nombre}</p>
                              </div>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-slate-600">Documento</label>
                              <p className="text-base mt-1">
                                <span className="font-medium">{getTipoDocumentoAbbreviation(hijo.tipoDocumento)}</span>
                                {' '}
                                <span className="font-mono text-slate-600">{hijo.numeroDocumento}</span>
                              </p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-slate-600">Fecha de Nacimiento</label>
                              <p className="text-base">{formatDate(hijo.fechaNacimiento)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Vivienda y condiciones */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-600">Grupo Étnico</label>
                  <p className="text-base">{getRazaDisplayName(survey.datos_sociodemograficos.raza)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Tipo de Vivienda</label>
                  <p className="text-base">{getViviendaDisplayName(survey.datos_sociodemograficos.vivienda)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Estrato Socioeconómico</label>
                  <p className="text-base">{survey.datos_sociodemograficos.estratoSocioeconomico}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Convive Con</label>
                  <p className="text-base">{getConviveConDisplayName(survey.datos_sociodemograficos.conviveCon)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Transporte</label>
                  <p className="text-base">{getTransporteDisplayName(survey.datos_sociodemograficos.transporte)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Tiempo Libre Con</label>
                  <p className="text-base">{getTiempoLibreConDisplayName(survey.datos_sociodemograficos.tiempoLibreCon)}</p>
                </div>
              </div>

              {/* Servicios Públicos y Manejo del Tiempo Libre */}
              {(() => {
                const servicios = survey.datos_sociodemograficos.serviciosPublicos;
                const tiempoLibre = survey.datos_sociodemograficos.manejoTiempoLibre;
                
                const hasAnyService = servicios && (
                  toBoolean(servicios.agua) || 
                  toBoolean(servicios.luz) || 
                  toBoolean(servicios.telefono) || 
                  toBoolean(servicios.internet) || 
                  toBoolean(servicios.gas)
                );
                
                const hasAnyActivity = tiempoLibre && (
                  toBoolean(tiempoLibre.recreativas) || 
                  toBoolean(tiempoLibre.deportivas) || 
                  toBoolean(tiempoLibre.educativas) || 
                  toBoolean(tiempoLibre.descanso) || 
                  toBoolean(tiempoLibre.artisticas) || 
                  toBoolean(tiempoLibre.religiosas) || 
                  toBoolean(tiempoLibre.otras)
                );
                
                if (!hasAnyService && !hasAnyActivity) return null;
                
                return (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Servicios Públicos */}
                    {hasAnyService && (
                      <div>
                        <label className="text-sm font-medium text-slate-600 mb-2 block">Servicios Públicos</label>
                        <div className="flex flex-wrap gap-2">
                          {toBoolean(servicios.agua) && <Badge>Agua</Badge>}
                          {toBoolean(servicios.luz) && <Badge>Luz</Badge>}
                          {toBoolean(servicios.telefono) && <Badge>Teléfono</Badge>}
                          {toBoolean(servicios.internet) && <Badge>Internet</Badge>}
                          {toBoolean(servicios.gas) && <Badge>Gas</Badge>}
                        </div>
                      </div>
                    )}

                    {/* Manejo del Tiempo Libre */}
                    {hasAnyActivity && (
                      <div>
                        <label className="text-sm font-medium text-slate-600 mb-2 block">Manejo del Tiempo Libre</label>
                        <div className="flex flex-wrap gap-2">
                          {toBoolean(tiempoLibre.recreativas) && <Badge>Recreativas</Badge>}
                          {toBoolean(tiempoLibre.deportivas) && <Badge>Deportivas</Badge>}
                          {toBoolean(tiempoLibre.educativas) && <Badge>Educativas</Badge>}
                          {toBoolean(tiempoLibre.descanso) && <Badge>Descanso</Badge>}
                          {toBoolean(tiempoLibre.artisticas) && <Badge>Artísticas</Badge>}
                          {toBoolean(tiempoLibre.religiosas) && <Badge>Religiosas</Badge>}
                          {toBoolean(tiempoLibre.otras) && <Badge>Otras</Badge>}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Consumo */}
          {survey.datos_consumo && (
            <motion.div variants={itemVariantsDetail}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wine className="h-5 w-5 text-primary-prosalud" />
                    Consumo
                  </CardTitle>
                </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-600">Consumo de Licor</label>
                <p className="text-base">{formatSiNo(survey.datos_consumo.consumoLicor)}</p>
                {survey.datos_consumo.consumoLicor?.toLowerCase() === 'si' && survey.datos_consumo.frecuenciaLicor && (
                  <p className="text-sm text-slate-500 mt-1">Frecuencia: {getFrecuenciaDisplayName(survey.datos_consumo.frecuenciaLicor)}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Consumo de Cigarrillo</label>
                <p className="text-base">{formatSiNo(survey.datos_consumo.consumoCigarrillo)}</p>
                {survey.datos_consumo.consumoCigarrillo?.toLowerCase() === 'si' && survey.datos_consumo.frecuenciaCigarrillo && (
                  <p className="text-sm text-slate-500 mt-1">Frecuencia: {getFrecuenciaDisplayName(survey.datos_consumo.frecuenciaCigarrillo)}</p>
                )}
              </div>
            </CardContent>
          </Card>
            </motion.div>
          )}

          {/* Condiciones de Salud - Esta sección será extensa */}
          {survey.condiciones_salud && (
            <motion.div variants={itemVariantsDetail}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HeartPulse className="h-5 w-5 text-primary-prosalud" />
                    Condiciones de Salud
                  </CardTitle>
                </CardHeader>
              <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(survey.condiciones_salud)
                  // Omitir campos de detalle que se mostrarán después
                  .filter(([key]) => !key.startsWith('tipo') && !key.startsWith('tiempo'))
                  // Enriquecer con etiqueta para poder ordenar
                  .map(([key, value]) => {
                    const label = key
                      .replace(/([A-Z])/g, ' $1')
                      .replace(/^./, str => str.toUpperCase());
                    return { key, value, label };
                  })
                  // Ordenar alfabéticamente por la etiqueta mostrada
                  .sort((a, b) => a.label.localeCompare(b.label, 'es', { sensitivity: 'base' }))
                  .map(({ key, value, label }) => (
                    <div key={key}>
                      <label className="text-sm font-medium text-slate-600">{label}</label>
                      <p className="text-base">{formatSiNo(value as string)}</p>
                    </div>
                  ))}
              </div>
              
              {/* Detalles de condiciones específicas */}
              {(survey.condiciones_salud.problemasPulmonares?.toLowerCase() === 'si' && survey.condiciones_salud.tipoProblemaPulmonar) ||
               (survey.condiciones_salud.alergias?.toLowerCase() === 'si' && survey.condiciones_salud.tipoAlergia) ||
               (survey.condiciones_salud.problemasVisuales?.toLowerCase() === 'si' && survey.condiciones_salud.tipoProblemaVisual) ||
               (survey.condiciones_salud.doloresArticulares?.toLowerCase() === 'si' && survey.condiciones_salud.tipoDolorArticular) ||
               (survey.condiciones_salud.trasplante?.toLowerCase() === 'si' && survey.condiciones_salud.tipoTrasplante) ||
               (survey.condiciones_salud.medicamentoPermanente?.toLowerCase() === 'si' && survey.condiciones_salud.tipoMedicamento) ||
               (survey.condiciones_salud.otraEnfermedad?.toLowerCase() === 'si' && survey.condiciones_salud.tipoOtraEnfermedad) ||
               (survey.condiciones_salud.cirugias?.toLowerCase() === 'si') ||
               (survey.condiciones_salud.accidenteLaboral?.toLowerCase() === 'si') ||
               (survey.condiciones_salud.accidenteTransitoCasero?.toLowerCase() === 'si') ? (
                <div className="mt-6 pt-6 border-t">
                  <h3 className="text-sm font-medium text-slate-600 mb-4">Detalles Adicionales</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {survey.condiciones_salud.problemasPulmonares?.toLowerCase() === 'si' && survey.condiciones_salud.tipoProblemaPulmonar && (
                      <div>
                        <label className="text-sm font-medium text-slate-600">Tipo de Problema Pulmonar</label>
                        <p className="text-base mt-1">{survey.condiciones_salud.tipoProblemaPulmonar}</p>
                      </div>
                    )}
                    {survey.condiciones_salud.alergias?.toLowerCase() === 'si' && survey.condiciones_salud.tipoAlergia && (
                      <div>
                        <label className="text-sm font-medium text-slate-600">Tipo de Alergia</label>
                        <p className="text-base mt-1">{survey.condiciones_salud.tipoAlergia}</p>
                      </div>
                    )}
                    {survey.condiciones_salud.problemasVisuales?.toLowerCase() === 'si' && survey.condiciones_salud.tipoProblemaVisual && (
                      <div>
                        <label className="text-sm font-medium text-slate-600">Tipo de Problema Visual</label>
                        <p className="text-base mt-1">{survey.condiciones_salud.tipoProblemaVisual}</p>
                      </div>
                    )}
                    {survey.condiciones_salud.doloresArticulares?.toLowerCase() === 'si' && survey.condiciones_salud.tipoDolorArticular && (
                      <div>
                        <label className="text-sm font-medium text-slate-600">Tipo de Dolor Articular</label>
                        <p className="text-base mt-1">{survey.condiciones_salud.tipoDolorArticular}</p>
                      </div>
                    )}
                    {survey.condiciones_salud.trasplante?.toLowerCase() === 'si' && survey.condiciones_salud.tipoTrasplante && (
                      <div>
                        <label className="text-sm font-medium text-slate-600">Tipo de Trasplante</label>
                        <p className="text-base mt-1">{survey.condiciones_salud.tipoTrasplante}</p>
                      </div>
                    )}
                    {survey.condiciones_salud.medicamentoPermanente?.toLowerCase() === 'si' && survey.condiciones_salud.tipoMedicamento && (
                      <div>
                        <label className="text-sm font-medium text-slate-600">Medicamento Permanente</label>
                        <p className="text-base mt-1">{survey.condiciones_salud.tipoMedicamento}</p>
                      </div>
                    )}
                    {survey.condiciones_salud.otraEnfermedad?.toLowerCase() === 'si' && survey.condiciones_salud.tipoOtraEnfermedad && (
                      <div>
                        <label className="text-sm font-medium text-slate-600">Otra Enfermedad</label>
                        <p className="text-base mt-1">{survey.condiciones_salud.tipoOtraEnfermedad}</p>
                      </div>
                    )}
                    {survey.condiciones_salud.cirugias?.toLowerCase() === 'si' && (
                      <div className="md:col-span-2 lg:col-span-1">
                        <label className="text-sm font-medium text-slate-600">Cirugías</label>
                        <p className="text-base mt-1">{survey.condiciones_salud.tipoCirugia || 'No especificado'}</p>
                        {survey.condiciones_salud.tiempoCirugia && (
                          <p className="text-sm text-slate-500 mt-1">Tiempo: {survey.condiciones_salud.tiempoCirugia}</p>
                        )}
                      </div>
                    )}
                    {survey.condiciones_salud.accidenteLaboral?.toLowerCase() === 'si' && (
                      <div className="md:col-span-2 lg:col-span-1">
                        <label className="text-sm font-medium text-slate-600">Accidente Laboral</label>
                        <p className="text-base mt-1">{survey.condiciones_salud.tipoAccidenteLaboral || 'No especificado'}</p>
                        {survey.condiciones_salud.tiempoAccidenteLaboral && (
                          <p className="text-sm text-slate-500 mt-1">Tiempo: {survey.condiciones_salud.tiempoAccidenteLaboral}</p>
                        )}
                      </div>
                    )}
                    {survey.condiciones_salud.accidenteTransitoCasero?.toLowerCase() === 'si' && (
                      <div className="md:col-span-2 lg:col-span-1">
                        <label className="text-sm font-medium text-slate-600">Accidente de Tránsito o Casero</label>
                        <p className="text-base mt-1">{survey.condiciones_salud.tipoAccidenteTransito || 'No especificado'}</p>
                        {survey.condiciones_salud.tiempoAccidenteTransito && (
                          <p className="text-sm text-slate-500 mt-1">Tiempo: {survey.condiciones_salud.tiempoAccidenteTransito}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Limitaciones Físicas */}
          {survey.limitaciones_fisicas && (
            <motion.div variants={itemVariantsDetail}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary-prosalud" />
                    Limitaciones Físicas
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-600">Esfuerzos Intensos</label>
                <p className="text-base">{formatLimitacion(survey.limitaciones_fisicas.esfuerzosIntensos)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Esfuerzos Moderados</label>
                <p className="text-base">{formatLimitacion(survey.limitaciones_fisicas.esfuerzosModerados)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Subir Pisos</label>
                <p className="text-base">{formatLimitacion(survey.limitaciones_fisicas.subirPisos)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Agacharse o Arrodillarse</label>
                <p className="text-base">{formatLimitacion(survey.limitaciones_fisicas.agacharseArrodillarse)}</p>
              </div>
            </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Recomendaciones Laborales */}
          <motion.div variants={itemVariantsDetail}>
            <Card className={survey.recomendacion_restriccion_laboral?.toLowerCase() === 'si' ? 'border-purple-300 bg-purple-50/40' : undefined}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardCheck className={`h-5 w-5 ${survey.recomendacion_restriccion_laboral?.toLowerCase() === 'si' ? 'text-purple-700' : 'text-primary-prosalud'}`} />
                  Recomendaciones Laborales
                  {survey.recomendacion_restriccion_laboral?.toLowerCase() === 'si' && (
                    <Badge className="bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-100 ml-1">
                      Pendiente de revisión
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
            {survey.recomendacion_restriccion_laboral?.toLowerCase() === 'si' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-600">¿Tiene recomendación o restricción laboral?</label>
                  <p className="text-base font-medium text-purple-800 flex items-center gap-2">
                    <LaborRestrictionIndicator />
                    Sí
                  </p>
                </div>
                {survey.detalle_recomendacion_laboral && (
                  <div>
                    <label className="text-sm font-medium text-slate-600">Detalle de la Recomendación</label>
                    <p className="text-base whitespace-pre-wrap text-purple-900">{survey.detalle_recomendacion_laboral}</p>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label className="text-sm font-medium text-slate-600">¿Tiene recomendación o restricción laboral?</label>
                <p className="text-base">{formatSiNo(survey.recomendacion_restriccion_laboral)}</p>
              </div>
            )}
          </CardContent>
            </Card>
          </motion.div>

          {/* Información de Firma */}
          <motion.div variants={itemVariantsDetail}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSignature className="h-5 w-5 text-primary-prosalud" />
                  Información de Firma Digital
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-slate-600">¿Tiene Firma?</label>
                      <div className="mt-1">
                        {survey.tiene_firma ? (
                          <span className="flex items-center gap-2 text-green-600 font-medium">
                            <CheckCircle2 className="h-4 w-4" />
                            Sí
                          </span>
                        ) : (
                          <span className="flex items-center gap-2 text-red-600 font-medium">
                            <XCircle className="h-4 w-4" />
                            No
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-600">Número de Documento (Firma)</label>
                      <p className="text-base font-mono mt-1">{survey.numero_documento_firma}</p>
                    </div>
                  </div>

                  {survey.tiene_firma && (
                    <div className="border-t pt-6">
                      <label className="text-sm font-medium text-slate-600 mb-3 block">Firma Digital</label>
                      {isLoadingSignature ? (
                        <div className="flex items-center justify-center py-8 border-2 border-dashed border-slate-300 rounded-lg">
                          <Loader2 className="h-6 w-6 animate-spin text-primary-prosalud" />
                          <span className="ml-2 text-slate-600">Cargando firma...</span>
                        </div>
                      ) : signatureImageUrl ? (
                        <div className="space-y-4">
                          <div className="border-2 border-slate-200 rounded-lg p-4 bg-slate-50 flex items-center justify-center">
                            <img
                              src={signatureImageUrl}
                              alt="Firma digital"
                              className="max-w-full max-h-64 object-contain"
                            />
                          </div>
                          <Button onClick={handleDownloadSignature} variant="outline" className="w-full">
                            <Download className="h-4 w-4 mr-2" />
                            Descargar Firma
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center py-8 border-2 border-dashed border-slate-300 rounded-lg text-slate-500">
                          <ImageIcon className="h-6 w-6 mr-2" />
                          <span>No se pudo cargar la firma</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </AdminLayout>
  );
};

export default AdminEncuestasSociodemograficasPage;

