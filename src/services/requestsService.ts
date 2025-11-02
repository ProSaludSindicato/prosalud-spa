import publicApi from './publicApi';

export interface RequestData {
  request_type: string;
  id_type: string;
  id_number: string;
  name: string;
  last_name: string;
  email: string;
  phone_number: string;
  payload: Record<string, any>;
  files?: Record<string, File | FileList>;
}

export const submitRequest = async (requestData: RequestData): Promise<any> => {
  try {
    const formData = new FormData();
    
    // Add basic request fields
    formData.append('request_type', requestData.request_type);
    formData.append('id_type', requestData.id_type);
    formData.append('id_number', requestData.id_number);
    formData.append('name', requestData.name);
    formData.append('last_name', requestData.last_name);
    formData.append('email', requestData.email);
    formData.append('phone_number', requestData.phone_number);
    
    // Add payload fields individually - handle nested objects properly
    const addPayloadFields = (obj: Record<string, any>, prefix: string = 'payload') => {
      Object.entries(obj).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          const fieldName = `${prefix}[${key}]`;
          if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof File)) {
            // For nested objects, add each property as a separate field
            Object.entries(value).forEach(([nestedKey, nestedValue]) => {
              if (nestedValue !== null && nestedValue !== undefined) {
                formData.append(`${fieldName}[${nestedKey}]`, String(nestedValue));
              }
            });
          } else {
            formData.append(fieldName, String(value));
          }
        }
      });
    };
    
    addPayloadFields(requestData.payload);
    
    // Add files if present
    if (requestData.files) {
      Object.entries(requestData.files).forEach(([key, fileOrFileList]) => {
        if (fileOrFileList) {
          // Handle both File and FileList
          let file: File;
          if (fileOrFileList instanceof FileList) {
            // Extract first file from FileList
            if (fileOrFileList.length > 0) {
              file = fileOrFileList[0];
            } else {
              return; // Skip if FileList is empty
            }
          } else if (fileOrFileList instanceof File) {
            file = fileOrFileList;
          } else {
            console.warn(`Invalid file type for key "${key}":`, fileOrFileList);
            return; // Skip invalid file types
          }
          
          formData.append(`files[${key}]`, file);
        }
      });
    }

    const response = await publicApi.post('/api/requests', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  } catch (error) {
    console.error('Error submitting request:', error);
    throw error;
  }
};