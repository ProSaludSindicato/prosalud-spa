import publicApi from './publicApi';
import axios, { AxiosError } from 'axios';

export interface SocioDemographicSurveyData {
  // Tipo de encuesta
  survey_type?: 'active_affiliate' | 'bulk_entry';
  
  // Datos Básicos
  nombres?: string;
  apellidos?: string;
  correo: string;
  tipoDocumento: string;
  numeroDocumento: string;
  hospital: string;
  profesion: string;
  rh?: string;
  fechaExpedicion?: string;
  lugarNacimiento?: string;
  departamento?: string;
  celular?: string;
  direccion?: string;
  municipio?: string;
  tallaCalzado?: string;
  tallaVestimenta?: string;
  paisNacimiento?: string;
  
  // Contacto de Emergencia
  nombreContactoEmergencia?: string;
  relacionContactoEmergencia?: string;
  telefonoContactoEmergencia?: string;
  
  // Información Sociodemográfica
  tienePersonasACargo: string;
  estadoCivil: string;
  fechaNacimiento: string;
  estatura: string;
  peso: string;
  genero: string;
  raza: string;
  numeroHijos?: string;
  hijos?: Array<{
    tipoDocumento: string;
    numeroDocumento: string;
    nombre: string;
    genero: string;
    fechaNacimiento: string;
  }>;
  numeroPersonasDependientes?: string;
  vivienda: string;
  serviciosPublicos: {
    agua?: boolean;
    luz?: boolean;
    telefono?: boolean;
    internet?: boolean;
    gas?: boolean;
  };
  estratoSocioeconomico: string;
  conviveCon: string;
  transporte: string;
  manejoTiempoLibre: {
    recreativas?: boolean;
    deportivas?: boolean;
    educativas?: boolean;
    descanso?: boolean;
    artisticas?: boolean;
    religiosas?: boolean;
    otras?: boolean;
  };
  tiempoLibreCon: string;
  
  // Consumo
  consumoLicor: string;
  frecuenciaLicor?: string;
  consumoCigarrillo: string;
  frecuenciaCigarrillo?: string;
  
  // Condiciones de Salud
  sobrepesoObesidad: string;
  hipertensionArterial: string;
  enfermedadesCorazon: string;
  diabetes: string;
  problemasRenales: string;
  depresionBipolaridad: string;
  antecedentesMedicosMentales: string;
  epilepsiaConvulsiones: string;
  trasplante: string;
  tipoTrasplante?: string;
  cancer: string;
  problemasPulmonares: string;
  tipoProblemaPulmonar?: string;
  alergias: string;
  tipoAlergia?: string;
  tuberculosis: string;
  problemasVisuales: string;
  tipoProblemaVisual?: string;
  doloresArticulares: string;
  tipoDolorArticular?: string;
  problemasSangre: string;
  otraEnfermedad: string;
  tipoOtraEnfermedad?: string;
  protesisArticular: string;
  medicamentoPermanente: string;
  tipoMedicamento?: string;
  tratamientoMedico: string;
  cirugias: string;
  tipoCirugia?: string;
  tiempoCirugia?: string;
  accidenteLaboral: string;
  tipoAccidenteLaboral?: string;
  tiempoAccidenteLaboral?: string;
  accidenteTransitoCasero: string;
  tipoAccidenteTransito?: string;
  tiempoAccidenteTransito?: string;
  vacunadoCovid: string;
  
  // Limitaciones Físicas
  esfuerzosIntensos: string;
  esfuerzosModerados: string;
  subirPisos: string;
  agacharseArrodillarse: string;
  
  // Recomendaciones Laborales
  recomendacionRestriccionLaboral: string;
  detalleRecomendacionLaboral?: string;
  
  // Firma Digital
  firma: string; // Base64 string
  numeroDocumentoFirma: string;
}

export interface ValidationError {
  success: false;
  message: string;
  errors: Record<string, string[]>;
}

export interface SuccessResponse {
  success: true;
  message: string;
  data: {
    id: string;
    tipo_documento: string;
    numero_documento: string;
    created_at: string;
  };
}

/**
 * Convertir data URI (base64) a Blob
 */
function dataURItoBlob(dataURI: string): Blob {
  // Separar el data URI en sus partes
  const splitDataURI = dataURI.split(',');
  const byteString = splitDataURI[0].includes('base64')
    ? atob(splitDataURI[1])
    : decodeURIComponent(splitDataURI[1]);
  
  // Extraer el tipo MIME
  const mimeString = splitDataURI[0].split(':')[1].split(';')[0];
  
  // Escribir los bytes
  const ua = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) {
    ua[i] = byteString.charCodeAt(i);
  }
  
  return new Blob([ua], { type: mimeString });
}

/**
 * Enviar encuesta sociodemográfica
 * @param surveyData - Datos de la encuesta
 * @param signatureBase64 - Firma digital en formato base64 (data:image/png;base64,...)
 * @param recaptchaToken - Token de reCAPTCHA
 * @returns Respuesta del servidor
 */
export const submitSurvey = async (
  surveyData: SocioDemographicSurveyData,
  signatureBase64: string,
  recaptchaToken?: string
): Promise<SuccessResponse> => {
  try {
    const formData = new FormData();
    
    // Agregar todos los campos del formulario
    Object.entries(surveyData).forEach(([key, value]) => {
      // Saltar el campo firma, lo manejaremos por separado
      if (key === 'firma') return;
      
      // Manejar arrays (hijos)
      if (Array.isArray(value)) {
        value.forEach((item, index) => {
          if (item && typeof item === 'object') {
            Object.entries(item).forEach(([fieldKey, fieldValue]) => {
              if (fieldValue !== null && fieldValue !== undefined && fieldValue !== '') {
                formData.append(`${key}[${index}][${fieldKey}]`, String(fieldValue));
              }
            });
          }
        });
      }
      // Manejar objetos anidados (serviciosPublicos, manejoTiempoLibre)
      else if (typeof value === 'object' && value !== null) {
        Object.entries(value).forEach(([nestedKey, nestedValue]) => {
          if (nestedValue !== null && nestedValue !== undefined) {
            // Convertir boolean a string para FormData
            const stringValue = typeof nestedValue === 'boolean' 
              ? (nestedValue ? '1' : '0')
              : String(nestedValue);
            formData.append(`${key}[${nestedKey}]`, stringValue);
          }
        });
      }
      // Campos primitivos (string, number)
      else if (value !== null && value !== undefined && value !== '') {
        formData.append(key, String(value));
      }
    });
    
    // Agregar firma como archivo
    if (signatureBase64) {
      const signatureBlob = dataURItoBlob(signatureBase64);
      const signatureFile = new File([signatureBlob], 'firma.png', { type: 'image/png' });
      formData.append('files[firma]', signatureFile);
    }
    
    // Agregar reCAPTCHA token si está presente
    if (recaptchaToken) {
      formData.append('recaptcha_token', recaptchaToken);
    }
    
    // Verificar que la URL base esté configurada
    if (!publicApi.defaults.baseURL) {
      throw new Error('PUBLIC_BASE_URL no está configurada. Verifica VITE_PUBLIC_API_BASE_URL o VITE_API_BASE_URL en las variables de entorno.');
    }
    
    const baseURL = publicApi.defaults.baseURL;
    const response = await axios.post(
      `${baseURL}/api/socio-demographic-surveys`,
      formData,
      {
        headers: {
          'Accept': 'application/json',
          // No establecer Content-Type, axios lo hará automáticamente con boundary para FormData
        },
        withCredentials: false,
        timeout: 30000, // 30 segundos
      }
    );
    
    // Esperar 201 Created para creación exitosa
    if (response.status === 201) {
      return response.data as SuccessResponse;
    }
    
    return response.data;
  } catch (error) {
    // Manejar errores de validación (422)
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ValidationError>;
      
      if (axiosError.response?.status === 422) {
        // Error de validación - retornar la estructura de error
        const validationError = axiosError.response.data;
        throw {
          ...validationError,
          isValidationError: true,
        };
      }
      
      // Manejar otros errores HTTP
      if (axiosError.response) {
        throw {
          success: false,
          message: axiosError.response.data?.message || 'Error al procesar la encuesta',
          errors: axiosError.response.data?.errors || {},
          status: axiosError.response.status,
        };
      }
      
      // Manejar errores de red
      if (axiosError.code === 'ERR_NETWORK') {
        throw {
          success: false,
          message: 'Error de conexión. Verifica tu conexión a internet e intenta nuevamente.',
          errors: {},
        };
      }
    }
    
    throw {
      success: false,
      message: 'Error desconocido al enviar la encuesta',
      errors: {},
    };
  }
};

