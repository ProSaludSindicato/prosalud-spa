import { authenticatedApi } from './api';
import { buildAdminApiUrl } from '@/config/api';

export type AdminExcelFileType = 'afiliados' | 'incapacidades' | 'liquidaciones' | 'delegados';

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
}

const endpointConfig: Record<AdminExcelFileType, ExcelUploadEndpointConfig> = {
  afiliados: { endpoint: '/api/afiliados-file/upload' },
  incapacidades: { endpoint: '/api/incapacidades-file/upload' },
  liquidaciones: { endpoint: '/api/liquidaciones-file/upload' },
  delegados: { endpoint: '/api/delegados-file/upload' },
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
    console.debug('Uploading Excel file:', {
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
};


