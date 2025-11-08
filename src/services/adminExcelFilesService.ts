import axios from 'axios';
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

    const formData = new FormData();
    formData.append('file', file);

    const response = await axios.post<AdminExcelUploadResponse>(
      buildAdminApiUrl(config.endpoint),
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data;
  },
};


