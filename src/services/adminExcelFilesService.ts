import { authenticatedApi } from './api';
import { buildAdminApiUrl } from '@/config/api';
import { logger } from '@/utils/logger';

export type AdminExcelFileType = 'afiliados' | 'incapacidades' | 'liquidaciones' | 'delegados' | 'compensaciones';

interface ExcelUploadEndpointConfig {
  endpoint: string;
}

export interface AdminExcelUploadResponse {
  success: boolean;
  message: string;
  file_path?: string;
  file_size?: number;
  disk?: string;
  error_code?: string;
  backup_path?: string;
  rows_count?: number;
  stored_photos_count?: number;
}

export interface AdminExcelFileInfo {
  success: boolean;
  exists: boolean;
  file_path?: string;
  disk?: string;
  file_size?: number;
  last_modified?: string;
  readable?: boolean;
  message?: string;
}

const endpointConfig: Record<AdminExcelFileType, ExcelUploadEndpointConfig> = {
  afiliados: { endpoint: '/api/afiliados-file/upload' },
  incapacidades: { endpoint: '/api/incapacidades-file/upload' },
  liquidaciones: { endpoint: '/api/liquidaciones-file/upload' },
  delegados: { endpoint: '/api/delegados-file/upload' },
  compensaciones: { endpoint: '/api/compensaciones-file/upload' },
};

export const adminExcelFilesService = {
  async uploadExcelFile(type: AdminExcelFileType, file: File): Promise<AdminExcelUploadResponse> {
    const config = endpointConfig[type];
    if (!config) {
      throw new Error(`No existe configuración para el tipo de archivo: ${type}`);
    }

    // Validate file
    if (!file || !(file instanceof File)) {
      throw new Error('El archivo proporcionado no es válido');
    }

    // Validate file extension
    const fileName = file.name.toLowerCase();
    const isValidExtension = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    if (!isValidExtension) {
      throw new Error('El archivo debe ser un Excel (.xlsx o .xls)');
    }

    // Determine correct MIME type based on extension
    // .xlsx files are sometimes detected as application/zip by browsers, so we need to fix it
    const correctMimeType = fileName.endsWith('.xlsx')
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'application/vnd.ms-excel';

    // Create a new File with the correct MIME type
    // This is necessary because browsers sometimes detect .xlsx files as application/zip
    // The backend validates the MIME type, so we need to ensure it's correct
    let fileToUpload: File = file;
    
    // If the file doesn't have the correct MIME type, create a new File with the correct type
    // We read the file as an ArrayBuffer to preserve the exact content
    if (!file.type || file.type !== correctMimeType || file.type === 'application/zip' as string) {
      // Read the file content as ArrayBuffer to preserve it exactly
      const arrayBuffer = await file.arrayBuffer();
      // Create a new Blob with the correct MIME type
      const blob = new Blob([arrayBuffer], { type: correctMimeType });
      // Create a new File from the Blob with the original name and correct MIME type
      fileToUpload = new File([blob], file.name, {
        type: correctMimeType,
        lastModified: file.lastModified,
      });
    }

    const formData = new FormData();
    // Append the file with correct MIME type
    formData.append('file', fileToUpload, fileToUpload.name);

    // Debug: Log file information
    logger.debug('Uploading Excel file:', {
      originalName: file.name,
      originalType: file.type,
      correctedType: fileToUpload.type,
      size: fileToUpload.size,
      lastModified: new Date(fileToUpload.lastModified).toISOString(),
    });

    // Use authenticatedApi which automatically includes Bearer token
    // The interceptor will remove Content-Type for FormData, allowing axios to set it automatically with boundary
    const response = await authenticatedApi.post<AdminExcelUploadResponse>(
      buildAdminApiUrl(config.endpoint),
      formData
    );

    return response.data;
  },

  async uploadDelegadosPhotosZip(file: File): Promise<AdminExcelUploadResponse> {
    if (!file || !(file instanceof File)) {
      throw new Error('El archivo proporcionado no es válido');
    }

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.zip')) {
      throw new Error('El archivo debe ser un ZIP (.zip)');
    }

    const formData = new FormData();
    formData.append('file', file, file.name);

    const response = await authenticatedApi.post<AdminExcelUploadResponse>(
      buildAdminApiUrl('/api/delegados-file/photos/upload'),
      formData
    );

    return response.data;
  },

  async getFileInfo(type: AdminExcelFileType): Promise<AdminExcelFileInfo> {
    const endpoint = `/api/${type}-file/info`;
    const response = await authenticatedApi.get<AdminExcelFileInfo>(
      buildAdminApiUrl(endpoint)
    );
    return response.data;
  },

  async downloadFile(type: AdminExcelFileType): Promise<Blob> {
    const endpoint = `/api/${type}-file/download`;
    const response = await authenticatedApi.get<Blob>(
      buildAdminApiUrl(endpoint),
      {
        responseType: 'blob',
      }
    );
    return response.data;
  },

  /**
   * Get the default filename for a file type when downloading
   */
  getDefaultFilename(type: AdminExcelFileType): string {
    const filenameMap: Record<AdminExcelFileType, string> = {
      afiliados: 'PROSANET_INFORMACION_AFILIADOS.xlsx',
      incapacidades: 'RELACION_INCAPACIDADES.xlsx',
      liquidaciones: 'LIQUIDACIONES_PENDIENTES.xlsx',
      delegados: 'DELEGADOS.xlsx', // Default fallback, may need to be updated
      compensaciones: 'COMPENSACIONES_AFILIADOS_ACTIVOS.xlsx',
    };
    return filenameMap[type];
  },
};


