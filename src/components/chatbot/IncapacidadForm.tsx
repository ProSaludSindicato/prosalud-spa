
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useSanitizedInput } from '@/hooks/useSanitizedInput';

interface IncapacidadFormProps {
  onSubmit: (data: FormData) => void;
  isLoading: boolean;
  initialData?: {
    tipoDocumento?: string;
    numeroDocumento?: string;
  };
}

interface FormData {
  tipoDocumento: string;
  numeroDocumento: string;
  fechaExpedicion: string;
  radicado?: string;
}

const documentTypes = [
    { value: "CC", label: "Cédula de Ciudadanía (CC)" },
    { value: "CE", label: "Cédula de Extranjería (CE)" },
    { value: "PP", label: "Pasaporte (PP)" },
    { value: "PT", label: "Permiso por protección temporal (PT)" },
];

const getDocumentValidation = (tipo: string) => {
  const validations = {
    'CC': { min: 6, max: 10 },
    'TI': { min: 10, max: 11 },
    'CE': { min: 6, max: 12 },
    'PP': { min: 6, max: 20 },
    'RC': { min: 10, max: 11 }
  };
  return validations[tipo as keyof typeof validations] || { min: 6, max: 20 };
};

// Get today's date in YYYY-MM-DD format for max attribute
const getTodayDate = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

export default function IncapacidadForm({ onSubmit, isLoading, initialData }: IncapacidadFormProps) {
  const [formData, setFormData] = useState<FormData>({
    tipoDocumento: initialData?.tipoDocumento || 'CC',
    numeroDocumento: initialData?.numeroDocumento || '',
    fechaExpedicion: '',
    radicado: ''
  });
  const [errors, setErrors] = useState<Partial<FormData>>({});
  // Security: Use centralized sanitization hook
  const { sanitizeId, sanitizeGeneral } = useSanitizedInput();

  // Actualizar el formulario cuando cambien los datos iniciales
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        tipoDocumento: initialData.tipoDocumento || prev.tipoDocumento,
        numeroDocumento: initialData.numeroDocumento || prev.numeroDocumento,
      }));
    }
  }, [initialData]);

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};
    
    if (!formData.tipoDocumento) {
      newErrors.tipoDocumento = 'El tipo de documento es requerido';
    }
    
    if (!formData.numeroDocumento) {
      newErrors.numeroDocumento = 'El número de documento es requerido';
    } else {
      const validation = getDocumentValidation(formData.tipoDocumento);
      if (formData.numeroDocumento.length < validation.min || formData.numeroDocumento.length > validation.max) {
        newErrors.numeroDocumento = `Debe tener entre ${validation.min} y ${validation.max} dígitos`;
      }
      if (!/^\d+$/.test(formData.numeroDocumento)) {
        newErrors.numeroDocumento = 'Solo se permiten números';
      }
    }
    
    if (!formData.fechaExpedicion) {
      newErrors.fechaExpedicion = 'La fecha de expedición del documento es requerida';
    } else {
      const fechaSeleccionada = new Date(formData.fechaExpedicion);
      const hoy = new Date();
      if (fechaSeleccionada > hoy) {
        newErrors.fechaExpedicion = 'La fecha no puede ser futura';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
      <CardContent className="py-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tipo de documento *
            </label>
            <Select 
              value={formData.tipoDocumento} 
              onValueChange={(value) => handleInputChange('tipoDocumento', value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {documentTypes.map((doc) => (
                  <SelectItem key={doc.value} value={doc.value}>
                    {doc.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.tipoDocumento && (
              <p className="text-red-500 text-xs mt-1">{errors.tipoDocumento}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Número de documento *
            </label>
            <Input
              type="text"
              value={formData.numeroDocumento}
              onChange={(e) => {
                // Security: Sanitize document number input
                const sanitized = sanitizeId(e.target.value, { maxLength: 20 });
                handleInputChange('numeroDocumento', sanitized);
              }}
              placeholder="Ingresa tu número de documento"
              className="w-full"
            />
            {errors.numeroDocumento && (
              <p className="text-red-500 text-xs mt-1">{errors.numeroDocumento}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Fecha de expedición del documento *
            </label>
            <Input
              type="date"
              value={formData.fechaExpedicion}
              onChange={(e) => handleInputChange('fechaExpedicion', e.target.value)}
              max={getTodayDate()}
              className="w-full"
            />
            {errors.fechaExpedicion && (
              <p className="text-red-500 text-xs mt-1">{errors.fechaExpedicion}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Número de radicado (opcional)
            </label>
            <Input
              type="text"
              value={formData.radicado}
              onChange={(e) => {
                // Security: Sanitize radicado input (alphanumeric)
                const sanitized = sanitizeGeneral(e.target.value, { maxLength: 50 });
                handleInputChange('radicado', sanitized);
              }}
              placeholder="Ej: 004252"
              className="w-full"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Si conoces el número de radicado, ingrésalo para ver solo esa incapacidad
            </p>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-prosalud-salud hover:bg-prosalud-salud/90 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Consultando...
              </>
            ) : (
              'Consultar Incapacidad'
            )}
          </Button>
        </form>

        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            🔒 <strong>Privacidad:</strong> Tus datos son tratados de forma segura y confidencial según nuestras políticas de privacidad.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}