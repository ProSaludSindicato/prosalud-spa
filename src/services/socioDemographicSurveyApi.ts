import { authenticatedApi } from './api';

export interface SocioDemographicSurveyListItem {
  id: string;
  correo: string;
  tipo_documento: string;
  numero_documento: string;
  hospital: string;
  profesion: string;
  created_at: string;
  nombres?: string | null;
  apellidos?: string | null;
}

export interface PaginationData {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface SocioDemographicSurveyListResponse {
  success: true;
  data: SocioDemographicSurveyListItem[];
  pagination: PaginationData;
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
  correo: string;
  tipo_documento: string;
  numero_documento: string;
  hospital: string;
  profesion: string;
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
  tipo_documento?: string;
  numero_documento?: string;
  per_page?: number;
  page?: number;
}

class SocioDemographicSurveyApi {
  /**
   * Listar encuestas sociodemográficas
   */
  async getSurveys(params?: GetSurveysParams): Promise<SocioDemographicSurveyListResponse> {
    const queryParams = new URLSearchParams();
    
    if (params?.hospital) {
      queryParams.append('hospital', params.hospital);
    }
    if (params?.tipo_documento) {
      queryParams.append('tipo_documento', params.tipo_documento);
    }
    if (params?.numero_documento) {
      queryParams.append('numero_documento', params.numero_documento);
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
}

export const socioDemographicSurveyApi = new SocioDemographicSurveyApi();

