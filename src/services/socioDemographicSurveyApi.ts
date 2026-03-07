import { authenticatedApi } from './api';
import { buildAdminApiUrl } from '@/config/api';

export interface SocioDemographicSurveyListItem {
  id: string;
  survey_type: 'active_affiliate' | 'bulk_entry' | null;
  correo: string;
  tipo_documento: string;
  numero_documento: string;
  hospital?: string | null;
  profesion?: string | null;
  created_at: string;
  formatted_created_at: string;
  nombres?: string | null;
  apellidos?: string | null;
}

export interface PaginationData {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface SurveyMetrics {
  total: number;
  current_month: {
    total: number;
    by_type: {
      active_affiliate: number;
      bulk_entry: number;
    };
  };
  by_type: {
    active_affiliate: number;
    bulk_entry: number;
  };
}

export interface SurveyFilterOptions {
  hospitals: string[];
  years: number[];
}

export interface SocioDemographicSurveyListResponse {
  success: true;
  data: SocioDemographicSurveyListItem[];
  pagination: PaginationData;
  metrics: SurveyMetrics;
  filter_options?: SurveyFilterOptions;
}

export interface SurveyFilterOptionsResponse {
  success: true;
  data: SurveyFilterOptions;
}

export interface HijoData {
  tipoDocumento: string;
  numeroDocumento: string;
  nombre: string;
  genero: string;
  fechaNacimiento: string;
}

export interface ServiciosPublicos {
  agua?: boolean;
  luz?: boolean;
  telefono?: boolean;
  internet?: boolean;
  gas?: boolean;
}

export interface ManejoTiempoLibre {
  recreativas?: boolean;
  deportivas?: boolean;
  educativas?: boolean;
  descanso?: boolean;
  artisticas?: boolean;
  religiosas?: boolean;
  otras?: boolean;
}

export interface DatosSociodemograficos {
  tienePersonasACargo: string;
  estadoCivil: string;
  nivelEducativo?: string;
  fechaNacimiento: string;
  estatura: string;
  peso: string;
  genero: string;
  raza: string;
  numeroHijos?: string;
  hijos?: HijoData[];
  numeroPersonasDependientes?: string;
  vivienda: string;
  serviciosPublicos: ServiciosPublicos;
  estratoSocioeconomico: string;
  conviveCon: string;
  transporte: string;
  manejoTiempoLibre: ManejoTiempoLibre;
  tiempoLibreCon: string;
}

export interface DatosConsumo {
  consumoLicor: string;
  frecuenciaLicor?: string | null;
  consumoCigarrillo: string;
  frecuenciaCigarrillo?: string | null;
}

export interface CondicionesSalud {
  sobrepesoObesidad: string;
  hipertensionArterial: string;
  enfermedadesCorazon: string;
  diabetes: string;
  problemasRenales: string;
  depresionBipolaridad: string;
  antecedentesMedicosMentales: string;
  epilepsiaConvulsiones: string;
  trasplante: string;
  tipoTrasplante?: string | null;
  cancer: string;
  problemasPulmonares: string;
  tipoProblemaPulmonar?: string | null;
  alergias: string;
  tipoAlergia?: string | null;
  tuberculosis: string;
  problemasVisuales: string;
  tipoProblemaVisual?: string | null;
  doloresArticulares: string;
  tipoDolorArticular?: string | null;
  problemasSangre: string;
  otraEnfermedad: string;
  tipoOtraEnfermedad?: string | null;
  protesisArticular: string;
  medicamentoPermanente: string;
  tipoMedicamento?: string | null;
  tratamientoMedico: string;
  cirugias: string;
  tipoCirugia?: string | null;
  tiempoCirugia?: string | null;
  accidenteLaboral: string;
  tipoAccidenteLaboral?: string | null;
  tiempoAccidenteLaboral?: string | null;
  accidenteTransitoCasero: string;
  tipoAccidenteTransito?: string | null;
  tiempoAccidenteTransito?: string | null;
  vacunadoCovid: string;
}

export interface LimitacionesFisicas {
  esfuerzosIntensos: string;
  esfuerzosModerados: string;
  subirPisos: string;
  agacharseArrodillarse: string;
}

export interface SocioDemographicSurveyDetail {
  id: string;
  survey_type: 'active_affiliate' | 'bulk_entry' | null;
  correo: string;
  tipo_documento: string;
  numero_documento: string;
  hospital?: string | null;
  profesion?: string | null;
  nombres?: string | null;
  apellidos?: string | null;
  rh?: string;
  fecha_expedicion?: string;
  lugar_nacimiento?: string;
  departamento?: string;
  celular?: string;
  direccion?: string;
  municipio?: string;
  talla_calzado?: string;
  talla_vestimenta?: string;
  pais_nacimiento?: string;
  nombre_contacto_emergencia?: string;
  relacion_contacto_emergencia?: string;
  telefono_contacto_emergencia?: string;
  datos_sociodemograficos: DatosSociodemograficos;
  datos_consumo: DatosConsumo;
  condiciones_salud: CondicionesSalud;
  limitaciones_fisicas: LimitacionesFisicas;
  recomendacion_restriccion_laboral: string;
  detalle_recomendacion_laboral?: string;
  tiene_firma: boolean;
  firma_download_url: string;
  numero_documento_firma: string;
  created_at: string;
  updated_at?: string | null;
}

export interface SocioDemographicSurveyDetailResponse {
  success: true;
  data: SocioDemographicSurveyDetail;
}

export interface GetSurveysParams {
  hospital?: string;
  /** Filtro por año (created_at). Rango 2000-2100. Backend acepta year o ano */
  year?: number;
  /** Filtro por mes (1-12). Backend acepta month o mes */
  month?: number;
  /** Filtro por hospitales (selección múltiple). Backend acepta hospitals[] o hospital */
  hospitals?: string[];
  survey_type?: string;
  numero_documento?: string;
  nombre?: string;
  per_page?: number;
  page?: number;
}

/** Filtros compartidos por export PDF y Excel (alineados con la API de consulta + profesion y date_range) */
export interface ExportSurveysFilters {
  year?: number;
  month?: number;
  hospitals?: string[];
  numero_documento?: string;
  tipo_documento?: string;
  nombre?: string;
  survey_type?: string;
  profesion?: string;
  date_range: {
    include_all: boolean;
    start_date?: string;
    end_date?: string;
  };
}

/** Solo Excel: incluir firmas digitales (proceso asíncrono) */
export interface ExportToExcelFilters extends ExportSurveysFilters {
  include_signatures?: boolean;
}

class SocioDemographicSurveyApi {
  /**
   * Listar encuestas sociodemográficas
   */
  async getSurveys(params?: GetSurveysParams): Promise<SocioDemographicSurveyListResponse> {
    const queryParams = new URLSearchParams();

    if (params?.year != null && params.year >= 2000 && params.year <= 2100) {
      queryParams.append('year', params.year.toString());
    }
    if (params?.month != null && params.month >= 1 && params.month <= 12) {
      queryParams.append('month', params.month.toString());
    }
    if (params?.hospitals?.length) {
      params.hospitals.forEach((h) => queryParams.append('hospitals[]', h));
    }
    if (params?.hospital && !params?.hospitals?.length) {
      queryParams.append('hospital', params.hospital);
    }
    if (params?.survey_type) {
      queryParams.append('survey_type', params.survey_type);
    }
    if (params?.numero_documento) {
      queryParams.append('numero_documento', params.numero_documento);
    }
    if (params?.nombre) {
      queryParams.append('nombre', params.nombre);
    }
    if (params?.per_page) {
      queryParams.append('per_page', params.per_page.toString());
    }
    if (params?.page) {
      queryParams.append('page', params.page.toString());
    }

    const queryString = queryParams.toString();
    const url = `/api/socio-demographic-surveys${queryString ? `?${queryString}` : ''}`;

    const response = await authenticatedApi.get<SocioDemographicSurveyListResponse>(url);
    return response.data;
  }

  /**
   * Obtener opciones de filtrado (hospitales y años con encuestas)
   */
  async getFilterOptions(): Promise<SurveyFilterOptionsResponse> {
    const response = await authenticatedApi.get<SurveyFilterOptionsResponse>(
      '/api/socio-demographic-surveys/filter-options'
    );
    return response.data;
  }

  /**
   * Obtener detalles de una encuesta específica
   */
  async getSurveyById(id: string): Promise<SocioDemographicSurveyDetailResponse> {
    const response = await authenticatedApi.get<SocioDemographicSurveyDetailResponse>(
      `/api/socio-demographic-surveys/${id}`
    );
    return response.data;
  }

  /**
   * Descargar firma digital de una encuesta
   */
  async downloadSignature(id: string): Promise<Blob> {
    const response = await authenticatedApi.get(
      `/api/socio-demographic-surveys/${id}/signature`,
      {
        responseType: 'blob',
      }
    );
    return response.data;
  }

  /**
   * Descargar PDF con el detalle de una encuesta sociodemográfica
   */
  async downloadPdf(id: string): Promise<Blob> {
    const response = await authenticatedApi.get(
      `/api/socio-demographic-surveys/${id}/pdf`,
      {
        responseType: 'blob',
      }
    );
    return response.data;
  }

  /**
   * Iniciar generación asíncrona del PDF masivo de encuestas sociodemográficas.
   * Respuesta 202 Accepted con job_id; usar checkPdfExportStatus y downloadPdfExport para estado y descarga.
   * Filtros alineados con la API de consulta: year, month, hospitals, numero_documento, tipo_documento, nombre, survey_type; más profesion y date_range.
   */
  async exportToPdf(filters: ExportSurveysFilters): Promise<{ job_id: string; status: string; check_status_url: string }> {
    const url = buildAdminApiUrl('/api/socio-demographic-surveys/export/pdf');
    const body: Record<string, unknown> = {
      date_range: filters.date_range,
      survey_type: filters.survey_type || 'all',
    };
    if (filters.year != null && filters.year >= 2000 && filters.year <= 2100) body.year = filters.year;
    if (filters.month != null && filters.month >= 1 && filters.month <= 12) body.month = filters.month;
    if (filters.hospitals?.length) body.hospitals = filters.hospitals;
    if (filters.numero_documento?.trim()) body.numero_documento = filters.numero_documento.trim();
    if (filters.tipo_documento?.trim()) body.tipo_documento = filters.tipo_documento.trim();
    if (filters.nombre?.trim()) body.nombre = filters.nombre.trim();
    if (filters.profesion?.trim()) body.profesion = filters.profesion.trim();

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(body),
    });

    if (response.status === 202) {
      const data = await response.json();
      if (!data.success || !data.job_id) {
        throw new Error(data.message || 'Error al iniciar la generación del PDF');
      }
      return {
        job_id: data.job_id,
        status: data.status || 'processing',
        check_status_url: data.check_status_url || '',
      };
    }

    let errorMessage = 'Error al generar el PDF';
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.errors ? 'Los filtros proporcionados no son válidos.' : errorMessage;
      } catch {
        // use default
      }
    } else if (response.status === 404) {
      errorMessage = 'No se encontraron encuestas con los filtros especificados.';
    } else if (response.status === 422) {
      errorMessage = 'Los filtros proporcionados no son válidos.';
    }
    throw new Error(errorMessage);
  }

  /**
   * Consultar estado del job de exportación PDF masivo.
   */
  async checkPdfExportStatus(jobId: string): Promise<{
    success: boolean;
    job_id: string;
    status: 'processing' | 'completed' | 'failed';
    download_url?: string;
    file_name?: string;
    error?: string;
    message?: string;
    count?: number;
  }> {
    const url = buildAdminApiUrl(`/api/socio-demographic-surveys/export/pdf/status/${jobId}`);
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });

    if (response.status === 404) {
      try {
        const data = await response.json();
        return {
          success: false,
          job_id: jobId,
          status: 'failed',
          message: data.message || 'Job no encontrado o expirado',
        };
      } catch {
        return {
          success: false,
          job_id: jobId,
          status: 'failed',
          message: 'Job no encontrado o expirado',
        };
      }
    }

    if (!response.ok) {
      throw new Error(`Error al verificar estado: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Descargar el PDF generado (cuando el estado del job es completed).
   * Usa autenticación (credentials) para obtener el blob.
   */
  async downloadPdfExport(jobId: string, suggestedFileName?: string): Promise<{ blob: Blob; filename: string }> {
    const url = buildAdminApiUrl(`/api/socio-demographic-surveys/export/pdf/download/${jobId}`);
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Job no encontrado o expirado');
      }
      if (response.status === 400) {
        try {
          const data = await response.json();
          throw new Error(data.message || 'El PDF aún no está listo');
        } catch (e) {
          if (e instanceof Error) throw e;
          throw new Error('El PDF aún no está listo');
        }
      }
      throw new Error(`Error al descargar PDF: ${response.status}`);
    }

    const blob = await response.blob();
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = suggestedFileName || 'Encuestas_Sociodemograficas.pdf';
    if (contentDisposition) {
      const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match && match[1]) {
        filename = match[1].replace(/['"]/g, '');
      }
    }
    return { blob, filename };
  }

  /**
   * Exportar encuestas sociodemográficas a Excel
   * Mismos filtros que PDF (year, month, hospitals, numero_documento, tipo_documento, nombre, survey_type, profesion, date_range) más include_signatures.
   * Si include_signatures es true, retorna job_id para proceso asíncrono; si no, retorna blob directamente (síncrono).
   */
  async exportToExcel(filters: ExportToExcelFilters): Promise<{ blob: Blob; filename: string } | { job_id: string; status: string; check_status_url: string }> {
    try {
      const includeSignatures = filters.include_signatures ?? false;
      const url = buildAdminApiUrl('/api/socio-demographic-surveys/export/excel');
      const body: Record<string, unknown> = {
        date_range: filters.date_range,
        survey_type: filters.survey_type || 'all',
        include_signatures: includeSignatures,
      };
      if (filters.year != null && filters.year >= 2000 && filters.year <= 2100) body.year = filters.year;
      if (filters.month != null && filters.month >= 1 && filters.month <= 12) body.month = filters.month;
      if (filters.hospitals?.length) body.hospitals = filters.hospitals;
      if (filters.numero_documento?.trim()) body.numero_documento = filters.numero_documento.trim();
      if (filters.tipo_documento?.trim()) body.tipo_documento = filters.tipo_documento.trim();
      if (filters.nombre?.trim()) body.nombre = filters.nombre.trim();
      if (filters.profesion?.trim()) body.profesion = filters.profesion.trim();

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': includeSignatures 
            ? 'application/json' 
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      // Si incluye firmas, es asíncrono (HTTP 202)
      if (response.status === 202) {
        const data = await response.json();
        if (!data.success || !data.job_id) {
          throw new Error(data.message || 'Error al iniciar la generación del reporte');
        }
        return {
          job_id: data.job_id,
          status: data.status,
          check_status_url: data.check_status_url,
        };
      }

      // Manejar errores
      if (!response.ok) {
        let errorMessage = 'Error al generar el reporte';
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
          } catch {
            // Si no se puede parsear, usar el mensaje por defecto
          }
        }
        throw new Error(errorMessage);
      }

      // Si no incluye firmas, es síncrono (HTTP 200) - devolver blob
      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'Encuestas_Sociodemograficas_ProSalud.xlsx';
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }

      return {
        blob,
        filename,
      };
    } catch (error: any) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Error al exportar encuestas');
    }
  }

  /**
   * Verifica el estado de un trabajo de exporte asíncrono
   */
  async checkExportStatus(jobId: string): Promise<{
    success: boolean;
    job_id: string;
    status: 'processing' | 'completed' | 'failed';
    download_url?: string;
    file_name?: string;
    error?: string;
    message?: string;
  }> {
    try {
      const url = buildAdminApiUrl(`/api/socio-demographic-surveys/export/status/${jobId}`);
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 404) {
          return {
            success: false,
            job_id: jobId,
            status: 'failed',
            message: 'Job no encontrado o expirado',
          };
        }
        throw new Error(`Error al verificar estado: ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Error al verificar estado del reporte');
    }
  }

  /**
   * Descarga un reporte completado
   */
  async downloadExport(jobId: string): Promise<{ blob: Blob; filename: string }> {
    try {
      const url = buildAdminApiUrl(`/api/socio-demographic-surveys/export/download/${jobId}`);
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Job no encontrado o expirado');
        }
        if (response.status === 400) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'El reporte aún no está listo');
        }
        throw new Error(`Error al descargar reporte: ${response.status}`);
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'Encuestas_Sociodemograficas_ProSalud.xlsx';
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }

      return {
        blob,
        filename,
      };
    } catch (error: any) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Error al descargar el reporte');
    }
  }
}

export const socioDemographicSurveyApi = new SocioDemographicSurveyApi();

