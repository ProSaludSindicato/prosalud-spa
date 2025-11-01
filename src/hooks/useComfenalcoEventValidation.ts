import { useState } from 'react';
import { CreateComfenalcoEventData, UpdateComfenalcoEventData } from '@/types/comfenalco';

export interface ValidationErrors {
  title?: string;
  banner_image?: string;
  category?: string;
  description?: string;
  display_size?: string;
  event_date?: string;
  registration_deadline?: string;
  registration_link?: string;
  is_visible?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationErrors;
}

const validateUrl = (url: string): boolean => {
  if (!url) return true; // URL is optional
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const validateDate = (dateString: string): boolean => {
  if (!dateString) return true; // Date is optional
  const date = new Date(dateString + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date >= today;
};

const validateFile = (file: File | null): boolean => {
  if (!file) return false;
  
  // Check file size (5MB limit)
  if (file.size > 5 * 1024 * 1024) {
    return false;
  }
  
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  return allowedTypes.includes(file.type);
};

export const useComfenalcoEventValidation = () => {
  const [errors, setErrors] = useState<ValidationErrors>({});

  const validateCreateEvent = (data: CreateComfenalcoEventData): ValidationResult => {
    const newErrors: ValidationErrors = {};

    console.log('Validating create event data:', data);

    // Title validation
    if (!data.title || data.title.trim().length === 0) {
      newErrors.title = 'El título es obligatorio';
    } else if (data.title.length > 255) {
      newErrors.title = 'El título no puede exceder 255 caracteres';
    }

    // Banner image validation
    if (!data.banner_image) {
      newErrors.banner_image = 'La imagen del banner es obligatoria';
    } else if (!validateFile(data.banner_image)) {
      newErrors.banner_image = 'La imagen debe ser JPG, PNG o WebP y menor a 5MB';
    }

    // Category validation
    if (!data.category || data.category.trim().length === 0) {
      newErrors.category = 'La categoría es obligatoria';
    } else if (data.category.length > 255) {
      newErrors.category = 'La categoría no puede exceder 255 caracteres';
    }

    // Description validation (optional but has length limit)
    if (data.description && data.description.length > 1000) {
      newErrors.description = 'La descripción no puede exceder 1000 caracteres';
    }

    // Display size validation
    if (data.display_size && !['carousel', 'mosaic'].includes(data.display_size)) {
      newErrors.display_size = 'El tamaño de visualización debe ser "carousel" o "mosaic"';
    }

    // Date validations
    if (data.event_date && !validateDate(data.event_date)) {
      newErrors.event_date = 'La fecha del evento debe ser hoy o una fecha futura';
    }

    if (data.registration_deadline && !validateDate(data.registration_deadline)) {
      newErrors.registration_deadline = 'La fecha límite de registro debe ser hoy o una fecha futura';
    }

    // URL validation
    if (data.registration_link && !validateUrl(data.registration_link)) {
      newErrors.registration_link = 'El enlace de registro debe ser una URL válida';
    }

    console.log('Validation errors found:', newErrors);

    // Update errors state
    setErrors(newErrors);
    
    return {
      isValid: Object.keys(newErrors).length === 0,
      errors: newErrors
    };
  };

  const validateUpdateEvent = (data: UpdateComfenalcoEventData, skipDateValidation: boolean = false): ValidationResult => {
    const newErrors: ValidationErrors = {};

    // Title validation (if provided)
    if (data.title !== undefined) {
      if (!data.title || data.title.trim().length === 0) {
        newErrors.title = 'El título es obligatorio';
      } else if (data.title.length > 255) {
        newErrors.title = 'El título no puede exceder 255 caracteres';
      }
    }

    // Category validation (if provided)
    if (data.category !== undefined) {
      if (!data.category || data.category.trim().length === 0) {
        newErrors.category = 'La categoría es obligatoria';
      } else if (data.category.length > 255) {
        newErrors.category = 'La categoría no puede exceder 255 caracteres';
      }
    }

    // Description validation (if provided)
    if (data.description !== undefined && data.description && data.description.length > 1000) {
      newErrors.description = 'La descripción no puede exceder 1000 caracteres';
    }

    // Display size validation (if provided)
    if (data.display_size && !['carousel', 'mosaic'].includes(data.display_size)) {
      newErrors.display_size = 'El tamaño de visualización debe ser "carousel" o "mosaic"';
    }

    // Date validations (if provided and not skipping validation)
    if (!skipDateValidation) {
      if (data.event_date && !validateDate(data.event_date)) {
        newErrors.event_date = 'La fecha del evento debe ser hoy o una fecha futura';
      }

      if (data.registration_deadline && !validateDate(data.registration_deadline)) {
        newErrors.registration_deadline = 'La fecha límite de registro debe ser hoy o una fecha futura';
      }
    }

    // URL validation (if provided)
    if (data.registration_link && !validateUrl(data.registration_link)) {
      newErrors.registration_link = 'El enlace de registro debe ser una URL válida';
    }

    setErrors(newErrors);
    return {
      isValid: Object.keys(newErrors).length === 0,
      errors: newErrors
    };
  };

  const clearErrors = () => {
    setErrors({});
  };

  const setFieldError = (field: keyof ValidationErrors, message: string) => {
    setErrors(prev => ({
      ...prev,
      [field]: message
    }));
  };

  const clearFieldError = (field: keyof ValidationErrors) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };

  return {
    errors,
    validateCreateEvent,
    validateUpdateEvent,
    clearErrors,
    setFieldError,
    clearFieldError
  };
};
