import React, { useRef, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { submitSurvey } from '@/services/socioDemographicSurveyService';
import RequireAfiliadoDataUpdateAuth from '@/components/auth/RequireAfiliadoDataUpdateAuth';
import { useAfiliadoAuth } from '@/context/AfiliadoAuthContext';
import { surveyConfigApi } from '@/services/surveyConfigApi';
import { useQuery } from '@tanstack/react-query';
import { SignaturePad, SignaturePadRef } from '@/components/admin/sst/SignaturePad';
import { Send, Home, FileText, User, PhoneCall, Users, Wine, HeartPulse, Activity, ClipboardCheck, FileSignature, Briefcase } from 'lucide-react';
import InvisibleRecaptcha, { InvisibleRecaptchaRef } from '@/components/shared/InvisibleRecaptcha';
import { RECAPTCHA_CONFIG } from '@/config/api';
import { logger } from '@/utils/logger';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Plus, X } from 'lucide-react';
import { relacionesContactoEmergencia, tiposDocumentoCompletos, municipios, tallasUniforme } from '@/components/actualizar-datos-personales/formOptions';
import { paises, getDefaultPais, normalizePais } from '@/components/actualizar-datos-personales/paises';
import { obfuscateValue, isObfuscated as isObfuscatedValue } from '@/utils/obfuscate';
import { useSanitizedInput } from '@/hooks/useSanitizedInput';
import { sanitizePhone, sanitizeEmail, sanitizeGeneral } from '@/utils/inputSanitizer';
import { useWatch } from 'react-hook-form';

// Función para obtener el nombre completo del tipo de documento
const getTipoDocumentoDisplayName = (tipoDocumento: string | null | undefined): string => {
  if (!tipoDocumento) return '';
  const tipo = tiposDocumentoCompletos.find(t => t.value === tipoDocumento);
  return tipo?.label || tipoDocumento;
};

// Función para normalizar el municipio
const normalizeMunicipio = (value: string | null | undefined): string => {
  if (!value) return '';
  const normalized = value.toLowerCase().trim();
  const found = municipios.find(m => 
    m.value === normalized || 
    m.label.toLowerCase() === normalized ||
    m.label.toLowerCase().includes(normalized) ||
    normalized.includes(m.value)
  );
  return found?.value || normalized.replace(/\s+/g, '_');
};

// Función para normalizar la talla de uniforme/vestimenta
const normalizeTallaUniforme = (value: string | null | undefined): string => {
  if (!value) return '';
  const normalized = value.toLowerCase().trim();
  const found = tallasUniforme.find(t => 
    t.value === normalized || 
    t.label.toLowerCase().includes(normalized)
  );
  return found?.value || normalized;
};

// Función mejorada para parsear el campo de contacto de emergencia
// Maneja múltiples formatos: nombre puede estar primero, teléfono puede estar en cualquier posición
// El nombre siempre está antes del parentesco/relación
const parseContactoEmergencia = (value: string | null | undefined): {
  telefono: string;
  nombre: string;
  relacion: string;
} => {
  if (!value || !value.trim()) {
    return { telefono: '', nombre: '', relacion: '' };
  }

  // Dividir por " - " (espacio, guion, espacio) - manejar espacios múltiples
  const parts = value.split(/\s*-\s*/).map(part => part.trim()).filter(part => part.length > 0);
  
  if (parts.length === 0) {
    return { telefono: '', nombre: '', relacion: '' };
  }

  // Función helper para detectar si una parte es un teléfono
  // Un teléfono es: solo números, o empieza con números (puede tener espacios pero principalmente números)
  const isPhone = (part: string): boolean => {
    // Remover espacios para verificar
    const cleaned = part.replace(/\s/g, '');
    // Debe tener al menos 7 dígitos y ser principalmente números (sin letras)
    // También puede empezar con números seguido solo de números
    if (/^\d{7,}$/.test(cleaned)) {
      return true;
    }
    // Si empieza con número y tiene al menos 7 caracteres, verificar que sea principalmente números
    if (/^\d/.test(cleaned) && cleaned.length >= 7) {
      // Debe ser al menos 80% números
      const digitCount = (cleaned.match(/\d/g) || []).length;
      return digitCount >= 7 && (digitCount / cleaned.length) >= 0.8;
    }
    return false;
  };

  // Lista de parentescos comunes para identificar relaciones
  // Incluye variaciones en mayúsculas, minúsculas, con acentos y con "/a"
  const parentescosComunes = [
    'madre', 'padre', 'mamá', 'mama', 'papá', 'papa',
    'hijo', 'hija', 'hijo/a', 'hija/a',
    'hermano', 'hermana', 'hermano/a', 'hermana/a',
    'conyuge', 'cónyuge', 'conyugue', 'cónyugue', 'esposo', 'esposa',
    'abuelo', 'abuela', 'abuelo/a', 'abuela/a',
    'tio', 'tío', 'tia', 'tía', 'tio/a', 'tía/a',
    'primo', 'prima', 'primo/a', 'prima/a',
    'amigo', 'amiga', 'amigo/a', 'amiga/a',
    'pareja', 'otro'
  ];

  // Función helper para detectar si una parte es un parentesco/relación
  const isRelacion = (part: string): boolean => {
    const normalized = part.toLowerCase().trim();
    return parentescosComunes.some(p => normalized === p || normalized.includes(p));
  };

  // Identificar qué parte es teléfono, nombre y relación
  let telefono = '';
  let nombre = '';
  let relacion = '';

  // Primero, identificar el teléfono (puede estar en cualquier posición)
  const phoneIndex = parts.findIndex(p => isPhone(p));
  if (phoneIndex !== -1) {
    telefono = parts[phoneIndex];
  }

  // Identificar la relación (puede estar en cualquier posición excepto donde está el teléfono)
  const relacionIndex = parts.findIndex((p, idx) => idx !== phoneIndex && isRelacion(p));
  if (relacionIndex !== -1) {
    relacion = parts[relacionIndex];
  }

  // El nombre es lo que queda: la parte que no es teléfono ni relación
  // REGLA: El nombre siempre está antes del parentesco/relación
  // Si el teléfono está primero, el nombre viene después del teléfono
  
  if (relacionIndex !== -1) {
    // Hay relación identificada
    if (phoneIndex !== -1) {
      // Hay teléfono y relación
      // El nombre es todo lo que está antes de la relación y no es el teléfono
      const nombreParts = parts.slice(0, relacionIndex).filter((p, idx) => idx !== phoneIndex);
      nombre = nombreParts.join(' ').trim();
      
      // Si no encontramos nombre pero hay 3 partes, asumir formato según posiciones
      if (!nombre && parts.length === 3) {
        if (phoneIndex === 0 && relacionIndex === 1) {
          // "telefono - relacion - nombre" → nombre al final
          nombre = parts[2];
        } else if (phoneIndex === 0 && relacionIndex === 2) {
          // "telefono - nombre - relacion" → nombre en medio
          nombre = parts[1];
    } else {
          // "nombre - relacion - telefono" (caso normal)
          nombre = parts[0];
        }
      }
    } else {
      // Hay relación pero no teléfono identificado
      // El nombre es todo lo que está antes de la relación
      nombre = parts.slice(0, relacionIndex).join(' ').trim();
    }
  } else if (phoneIndex !== -1) {
    // Hay teléfono pero no relación
    if (phoneIndex === 0) {
      // Teléfono está primero: "telefono - nombre"
      nombre = parts.slice(1).join(' ').trim();
    } else {
      // Teléfono está después: "nombre - telefono"
      nombre = parts.slice(0, phoneIndex).join(' ').trim();
    }
  } else {
    // No hay teléfono ni relación identificada, todo es nombre
    nombre = parts.join(' ').trim();
  }

  // Casos especiales para 3 partes cuando no identificamos relación:
  if (parts.length === 3 && phoneIndex !== -1 && relacionIndex === -1) {
    // La parte del medio probablemente es la relación (aunque no la reconocimos)
    relacion = parts[1];
    if (phoneIndex === 0) {
      // "telefono - relacion - nombre"
      nombre = parts[2];
    } else if (phoneIndex === 2) {
      // "nombre - relacion - telefono"
      nombre = parts[0];
    } else {
      // "nombre - telefono - relacion" (menos común)
      nombre = parts[0];
      relacion = parts[2];
    }
  }

  // Casos especiales para 3 partes cuando no identificamos teléfono:
  if (parts.length === 3 && phoneIndex === -1 && relacionIndex !== -1) {
    nombre = parts[0];
    // La última parte podría ser teléfono aunque no lo reconocimos
    if (parts[2] && /^\d/.test(parts[2].replace(/\s/g, ''))) {
      telefono = parts[2];
    }
  }

  return {
    telefono: telefono || '',
    nombre: nombre || '',
    relacion: relacion || '',
  };
};

// Función para normalizar la relación de contacto de emergencia
const normalizeRelacionContactoEmergencia = (value: string | null | undefined): string => {
  if (!value) return '';
  const normalized = value.toLowerCase().trim();
  
  // Mapear valores comunes a los valores del select
  const mapping: Record<string, string> = {
    'conyuge': 'conyuge',
    'cónyuge': 'conyuge',
    'esposo': 'conyuge',
    'esposa': 'conyuge',
    'padre': 'padre',
    'papá': 'padre',
    'papa': 'padre',
    'madre': 'madre',
    'mamá': 'madre',
    'mama': 'madre',
    'hijo': 'hijo',
    'hija': 'hijo',
    'hermano': 'hermano',
    'hermana': 'hermano',
    'abuelo': 'abuelo',
    'abuela': 'abuelo',
    'tio': 'tio',
    'tío': 'tio',
    'tia': 'tio',
    'tía': 'tio',
    'primo': 'primo',
    'prima': 'primo',
    'amigo': 'amigo',
    'amiga': 'amigo',
    'otro': 'otro',
  };
  
  return mapping[normalized] || normalized.replace(/\s+/g, '_');
};

// Mapa de hospitales: valor interno => nombre legible para el afiliado
const hospitalMap: Record<string, string> = {
  'ABEJORRAL': 'E.S.E. Hospital San Juan de Dios - Abejorral',
  'ABEJORRAL - ADMON': 'E.S.E. Hospital San Juan de Dios - Abejorral',
  'ABEJORRAL - ADMON ': 'E.S.E. Hospital San Juan de Dios - Abejorral',
  'ABEJORRAL - ASIST': 'E.S.E. Hospital San Juan de Dios - Abejorral',
  'ABEJORRAL - BUEN COMIENZO': 'E.S.E. Hospital San Juan de Dios Abejorral - Programa Buen Comienzo',
  'ABEJORRAL - CBA': 'E.S.E. Hospital San Juan de Dios - Abejorral',
  'ABEJORRAL - SALUD P': 'E.S.E. Hospital San Juan de Dios Abejorral - Programa Salud Pública',
  'ABEJORRAL SP': 'E.S.E. Hospital San Juan de Dios - Abejorral',
  'ADMON': 'Sede Administrativa',
  'ADMON-HSJDRionegro': 'E.S.E. Hospital San Juan de Dios - Rionegro',
  'BARBOSA': 'E.S.E. Hospital San Vicente de Paul de Barbosa (Ant)',
  'BELLO': 'E.S.E. Hospital Marco Fidel Suarez de Bello',
  'BETANIA': 'E.S.E. Hospital San Antonio de Betania',
  'CALDAS': 'E.S.E. Hospital San Vicente de Paúl de Caldas',
  'CENTRO NEUROLOGICO': 'Centro Neurológico',
  'CISNEROS': 'E.S.E. Hospital San Antonio - Cisneros (Ant)',
  'CIUDAD BOLIVAR': 'E.S.E. Hospital La Merced - Ciudad Bolivar (Ant)',
  'CIUDADBOLIVAR': 'E.S.E. Hospital La Merced - Ciudad Bolivar (Ant)',
  'COPACABANA': 'E.S.E. Hospital Santa Margarita',
  'COPACABANA ': 'E.S.E. Hospital Santa Margarita',
  'E.S.E CARISMA ADMON ': 'E.S.E. Hospital Carisma',
  'E.S.E CARISMA ASISTENCIAL': 'E.S.E. Hospital Carisma',
  'E.S.ECARISMA': 'E.S.E. Hospital Carisma',
  'FREDONIA': 'E.S.E. Hospital Santa Lucia - Fredonia (Ant)',
  'HGM SEDE 80 ADMON': 'E.S.E. Hospital General de Medellín - Sede 80',
  'HGM SEDE 80 ASISTENCIAL': 'E.S.E. Hospital General de Medellín - Sede 80',
  'HGM SEDE 80 ASISTENCIAL ': 'E.S.E. Hospital General de Medellín - Sede 80',
  'HLM - GRUPO 1': 'E.S.E. Hospital La María',
  'HLM - GRUPO 2': 'E.S.E. Hospital La María',
  'HLM - GRUPO 3': 'E.S.E. Hospital La María',
  'HMFS - BELLO': 'E.S.E. Hospital Marco Fidel Suarez de Bello',
  'HSJD Rionegro - ADMON': 'E.S.E. Hospital San Juan de Dios - Rionegro',
  'HSJD Rionegro - ASISTENCIAL': 'Centro Neurológico',
  'HSJD Rionegro - PIC ': 'E.S.E. Hospital San Antonio - Cisneros (Ant)',
  'HSJDRionegro': 'E.S.E. Hospital San Juan de Dios - Rionegro',
  'HSRI': 'E.S.E. Hospital San Rafael de Itagüí',
  'HSRI ': 'E.S.E. Hospital San Rafael de Itagüí',
  'JARDIN': 'E.S.E. Hospital Gabriel Peláez Montoya',
  'LA MARIA': 'E.S.E. Hospital La María',
  'LA MARIA - 000065-2021': 'E.S.E. Hospital La María',
  'LA MARIA - 262-2021': 'E.S.E. Hospital La María',
  'LA MARIA - COOSALUD': 'E.S.E. Hospital La María',
  'LA MARIA - ENTERRITORIO': 'E.S.E. Hospital La María',
  'LA MARIA - ENTERRITORIO 1 - 044': 'E.S.E. Hospital La María',
  'LA MARIA - ENTERRITORIO 2': 'E.S.E. Hospital La María',
  'LA MARIA - ENTERRITORIO 2 - 045': 'E.S.E. Hospital La María',
  'LA MARIA - INFECCIOSA PS 268': 'E.S.E. Hospital La María',
  'LA MARIA - ITS 257': 'E.S.E. Hospital La María',
  'LA MARIA - PROGRAMA ESPECIAL SAVIA SALUD EPS - VIH-SIDA': 'E.S.E. Hospital La María',
  'LA MARIA - TRANSMISIBLES': 'E.S.E. Hospital La María',
  'LA MARIA - TRANSMISIBLES - 122 - 2023': 'E.S.E. Hospital La María',
  'LA MARIA - TRANSMISIBLES 176': 'E.S.E. Hospital La María',
  'LA MARIA - UNION TEMPORAL': 'E.S.E. Hospital La María',
  'LA MARIA - UNION TEMPORAL 020 - 2023': 'E.S.E. Hospital La María',
  'LA MARIA - VIH': 'E.S.E. Hospital La María',
  'LA MARIA - VIH - 1': 'E.S.E. Hospital La María',
  'LA MARIA 216 - 2021': 'E.S.E. Hospital La María',
  'LA MARIA 317 COOSALUD': 'E.S.E. Hospital La María',
  'LA MARIA COOSALUD - 046': 'E.S.E. Hospital La María',
  'LA MARIA COOSALUD 191': 'E.S.E. Hospital La María',
  'LA MARIA COOSALUD 36-2022': 'E.S.E. Hospital La María',
  'LA MARIA ENTERRITORIO - 287': 'E.S.E. Hospital La María',
  'LA MARIA ENTERRITORIO 038': 'E.S.E. Hospital La María',
  'LA MARIA ENTERRITORIO 238': 'E.S.E. Hospital La María',
  'LA MARIA- INFECCIOSA PS 268': 'E.S.E. Hospital La María',
  'LA MARIA ITS ': 'E.S.E. Hospital La María',
  'LA MARIA ITS 127': 'E.S.E. Hospital La María',
  'LA MARIA ITS- 376': 'E.S.E. Hospital La María',
  'LA MARIA PAI ': 'E.S.E. Hospital La María',
  'LA MARIA TB 137': 'E.S.E. Hospital La María',
  'LA MARIA TB Y LEPRA  319-2021': 'E.S.E. Hospital La María',
  'LA MARIA TBC': 'E.S.E. Hospital La María',
  'LA MARIA TRANSMISIBLES - 122': 'E.S.E. Hospital La María',
  'LA MARIA TRANSMISIBLES - 275': 'E.S.E. Hospital La María',
  'LA MARIA TRANSMISIBLES 234': 'E.S.E. Hospital La María',
  'LA MARIA UPAI - 0028 - 2023': 'E.S.E. Hospital La María',
  'LA MARIA UPAI - 140 - 2023': 'E.S.E. Hospital La María',
  'LA MARIA UPAI - 271': 'E.S.E. Hospital La María',
  'LA MARIA UPAI 0028 - 2023': 'E.S.E. Hospital La María',
  'LA MARIA UPAI 245': 'E.S.E. Hospital La María',
  'LA MARIA UPAI 35': 'E.S.E. Hospital La María',
  'LA MARIA VIH - 158': 'E.S.E. Hospital La María',
  'LA MARIA VIH 037': 'E.S.E. Hospital La María',
  'LA MARIA VIH 131': 'E.S.E. Hospital La María',
  'LA MARIA VIH 131 - 2023': 'E.S.E. Hospital La María',
  'LA MARIA VIH 158': 'E.S.E. Hospital La María',
  'LA MARIA VIH 188': 'E.S.E. Hospital La María',
  'LA MARIA VIH N°043': 'E.S.E. Hospital La María',
  'LA MARIA VIH UT ': 'E.S.E. Hospital La María',
  'LAMARIACOOSALUD36': 'E.S.E. Hospital La María',
  'LAMARIAENTERRITORIO038': 'E.S.E. Hospital La María',
  'LAMARIAITS127': 'E.S.E. Hospital La María',
  'LAMARIATB2022': 'E.S.E. Hospital La María',
  'LAMARIAUPAI35': 'E.S.E. Hospital La María',
  'LAMARIAVIH037': 'E.S.E. Hospital La María',
  'POLICLINICO': 'POLICLINICO',
  'PROMOTORA MEDICA Y ODONTOLOGICA DE ANTIOQUIA S.A.': 'PROMOTORA MEDICA Y ODONTOLOGICA DE ANTIOQUIA S.A.',
  'PUERTO BERRIO': 'E.S.E. Hospital La Cruz',
  'SOMER': 'SOMER',
  'STA GERTRUDIS': 'E.S.E. Santa Gertrudis',
  'UNION TEMPORAL - 020 - 2023': 'E.S.E. Hospital La María',
  'VENANCIO': 'E.S.E. Hospital Venancio Diaz Diaz (Sabaneta)',
  'VENANCIO -  SALUD MENTAL ': 'E.S.E. Hospital Venancio Diaz Diaz (Sabaneta)',
  'VENANCIO - ADMON': 'E.S.E. Hospital Venancio Diaz Diaz (Sabaneta)',
  'VENANCIO - ASIST': 'E.S.E. Hospital Venancio Diaz Diaz (Sabaneta)',
  'VENANCIO - ASIST ': 'E.S.E. Hospital Venancio Diaz Diaz (Sabaneta)',
  'VENANCIO - PIC ': 'E.S.E. Hospital Venancio Diaz Diaz (Sabaneta)',
  'VENANCIO - SALUD MENTAL ': 'E.S.E. Hospital Venancio Diaz Diaz (Sabaneta)',
  'VENANCIO - SALUD P.': 'E.S.E. Hospital Venancio Diaz Diaz (Sabaneta)',
  'VENANCIO - UCI': 'E.S.E. Hospital Venancio Diaz Diaz (Sabaneta)',
  'VENANCIO ADMON - APH': 'E.S.E. Hospital Venancio Diaz Diaz (Sabaneta)',
  'VENECIA': 'ESE Hospital San Rafael de Venecia',
};

// Función para obtener el nombre legible del hospital
const getHospitalDisplayName = (hospitalValue: string | null | undefined): string => {
  if (!hospitalValue) return '';
  let displayName = '';
  // Buscar coincidencia exacta primero
  if (hospitalMap[hospitalValue]) {
    displayName = hospitalMap[hospitalValue];
  } else {
    // Buscar coincidencia sin espacios al final
    const trimmedValue = hospitalValue.trim();
    if (hospitalMap[trimmedValue]) {
      displayName = hospitalMap[trimmedValue];
    } else {
      // Si no hay coincidencia, devolver el valor original
      displayName = hospitalValue;
    }
  }
  // Convertir a mayúsculas
  return displayName.toUpperCase();
};

// Esquema de validación completo
const hijoSchema = z.object({
  tipoDocumento: z.string({ required_error: 'Tipo de documento es requerido' }).min(1, 'Tipo de documento es requerido'),
  numeroDocumento: z.string({ required_error: 'Número de documento es requerido' }).min(1, 'Número de documento es requerido'),
  nombre: z.string({ required_error: 'Nombre es requerido' }).min(1, 'Nombre es requerido'),
  genero: z.string({ required_error: 'Género es requerido' }).min(1, 'Género es requerido'),
  fechaNacimiento: z.string({ required_error: 'Fecha de nacimiento es requerida' })
    .min(1, 'Fecha de nacimiento es requerida')
    .refine((val) => {
      if (!val) return false;
      const fecha = new Date(val);
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      return fecha <= hoy;
    }, { message: 'La fecha de nacimiento no puede ser futura' }),
});

// Función para crear el schema dinámicamente según el modo
const createEncuestaSchema = (isBulkEntryMode: boolean) => z.object({
  // Autocompletados
  nombres: isBulkEntryMode 
    ? z.string().min(1, 'Nombres es requerido')
    : z.string().optional(),
  apellidos: isBulkEntryMode
    ? z.string().min(1, 'Apellidos es requerido')
    : z.string().optional(),
  correo: z.string().email('Correo inválido').min(1, 'Correo es requerido'),
  tipoDocumento: z.string().min(1, 'Tipo de documento es requerido'),
  numeroDocumento: z.string().min(1, 'Número de documento es requerido'),
  hospital: isBulkEntryMode 
    ? z.string().optional()
    : z.string().min(1, 'Hospital es requerido'),
  profesion: isBulkEntryMode
    ? z.string().optional()
    : z.string().min(1, 'Proceso es requerido'),
  // Campos adicionales de datos básicos - todos requeridos menos hospital y proceso
  rh: z.string({ required_error: 'RH es requerido' }).min(1, 'RH es requerido'),
  fechaExpedicion: z.string({ required_error: 'Fecha de expedición es requerida' }).min(1, 'Fecha de expedición es requerida'),
  lugarNacimiento: z.string({ required_error: 'Lugar de nacimiento es requerido' }).min(1, 'Lugar de nacimiento es requerido'),
  departamento: z.string({ required_error: 'Departamento es requerido' }).min(1, 'Departamento es requerido'),
  celular: z.string({ required_error: 'Celular es requerido' })
    .min(1, 'Celular es requerido')
    .refine((val) => {
      if (!val || val.trim() === '') return false; // Requerido, no puede estar vacío
      // Validar formato colombiano: 10 dígitos comenzando con 3
      const phoneRegex = /^[3][0-9]{9}$/;
      return phoneRegex.test(val.replace(/\s/g, ''));
    }, { message: 'El teléfono debe tener 10 dígitos y comenzar con 3 (ej: 3001234567)' }),
  direccion: z.string({ required_error: 'Dirección es requerida' }).min(1, 'Dirección es requerida'),
  municipio: z.string({ required_error: 'Municipio es requerido' }).min(1, 'Municipio es requerido'),
  tallaCalzado: z.string({ required_error: 'Talla de calzado es requerida' })
    .min(1, 'Talla de calzado es requerida')
    .refine((val) => {
      if (!val || val.trim() === '') return false; // Requerido, no puede estar vacío
      const num = parseInt(val, 10);
      return !isNaN(num) && num >= 20 && num <= 50;
    }, { message: 'La talla de calzado debe ser un número entre 20 y 50' }),
  tallaVestimenta: z.string({ required_error: 'Talla de vestimenta es requerida' }).min(1, 'Talla de vestimenta es requerida'),
  paisNacimiento: z.string({ required_error: 'País de nacimiento es requerido' }).min(1, 'País de nacimiento es requerido'),
  
  // Sección sociodemográfica
  tienePersonasACargo: z.string({ required_error: 'Campo requerido' }).min(1, 'Campo requerido'),
  estadoCivil: z.string({ required_error: 'Estado civil es requerido' }).min(1, 'Estado civil es requerido'),
  fechaNacimiento: z.string({ required_error: 'Fecha de nacimiento es requerida' }).min(1, 'Fecha de nacimiento es requerida'),
  genero: z.string({ required_error: 'Género es requerido' }).min(1, 'Género es requerido'),
  raza: z.string({ required_error: 'Grupo étnico es requerido' }).min(1, 'Grupo étnico es requerido'),
  numeroHijos: z.string().optional(),
  hijos: z.array(hijoSchema).optional(),
  numeroPersonasDependientes: z.string().optional(),
  vivienda: z.string({ required_error: 'Vivienda es requerida' }).min(1, 'Vivienda es requerida'),
  serviciosPublicos: z.object({
    agua: z.boolean().optional(),
    luz: z.boolean().optional(),
    telefono: z.boolean().optional(),
    internet: z.boolean().optional(),
    gas: z.boolean().optional(),
  }),
  estratoSocioeconomico: z.string({ required_error: 'Estrato es requerido' }).min(1, 'Estrato es requerido'),
  conviveCon: z.string({ required_error: 'Campo requerido' }).min(1, 'Campo requerido'),
  transporte: z.string({ required_error: 'Transporte es requerido' }).min(1, 'Transporte es requerido'),
  manejoTiempoLibre: z.object({
    recreativas: z.boolean().optional(),
    deportivas: z.boolean().optional(),
    educativas: z.boolean().optional(),
    descanso: z.boolean().optional(),
    artisticas: z.boolean().optional(),
    religiosas: z.boolean().optional(),
    otras: z.boolean().optional(),
  }),
  tiempoLibreCon: z.string({ required_error: 'Campo requerido' }).min(1, 'Campo requerido'),
  
  // Consumo
  consumoLicor: z.string().min(1, 'Campo requerido'),
  frecuenciaLicor: z.string().optional(),
  consumoCigarrillo: z.string().min(1, 'Campo requerido'),
  frecuenciaCigarrillo: z.string().optional(),
  
  // Salud - Si/No/Otro
  sobrepesoObesidad: z.string().min(1, 'Campo requerido'),
  hipertensionArterial: z.string().min(1, 'Campo requerido'),
  enfermedadesCorazon: z.string().min(1, 'Campo requerido'),
  diabetes: z.string().min(1, 'Campo requerido'),
  problemasRenales: z.string().min(1, 'Campo requerido'),
  depresionBipolaridad: z.string().min(1, 'Campo requerido'),
  antecedentesMedicosMentales: z.string().min(1, 'Campo requerido'),
  epilepsiaConvulsiones: z.string().min(1, 'Campo requerido'),
  trasplante: z.string().min(1, 'Campo requerido'),
  tipoTrasplante: z.string().optional(),
  cancer: z.string().min(1, 'Campo requerido'),
  problemasPulmonares: z.string().min(1, 'Campo requerido'),
  tipoProblemaPulmonar: z.string().optional(),
  alergias: z.string().min(1, 'Campo requerido'),
  tipoAlergia: z.string().optional(),
  tuberculosis: z.string().min(1, 'Campo requerido'),
  problemasVisuales: z.string().min(1, 'Campo requerido'),
  tipoProblemaVisual: z.string().optional(),
  doloresArticulares: z.string().min(1, 'Campo requerido'),
  tipoDolorArticular: z.string().optional(),
  problemasSangre: z.string().min(1, 'Campo requerido'),
  otraEnfermedad: z.string().min(1, 'Campo requerido'),
  tipoOtraEnfermedad: z.string().optional(),
  protesisArticular: z.string().min(1, 'Campo requerido'),
  medicamentoPermanente: z.string().min(1, 'Campo requerido'),
  tipoMedicamento: z.string().optional(),
  tratamientoMedico: z.string().min(1, 'Campo requerido'),
  cirugias: z.string().min(1, 'Campo requerido'),
  tipoCirugia: z.string().optional(),
  tiempoCirugia: z.string().optional(),
  estatura: z.string()
    .min(1, 'Estatura es requerida')
    .refine((val) => {
      const num = parseInt(val, 10);
      return !isNaN(num) && num >= 120 && num <= 230;
    }, { message: 'La estatura debe estar entre 120 y 230 cm' }),
  peso: z.string()
    .min(1, 'Peso es requerido')
    .refine((val) => {
      const num = parseInt(val, 10);
      return !isNaN(num) && num >= 30 && num <= 250;
    }, { message: 'El peso debe estar entre 30 y 250 kg' }),
  accidenteLaboral: z.string().min(1, 'Campo requerido'),
  tipoAccidenteLaboral: z.string().optional(),
  tiempoAccidenteLaboral: z.string().optional(),
  accidenteTransitoCasero: z.string().min(1, 'Campo requerido'),
  tipoAccidenteTransito: z.string().optional(),
  tiempoAccidenteTransito: z.string().optional(),
  vacunadoCovid: z.string().min(1, 'Campo requerido'),
  
  // Limitaciones
  esfuerzosIntensos: z.string().min(1, 'Campo requerido'),
  esfuerzosModerados: z.string().min(1, 'Campo requerido'),
  subirPisos: z.string().min(1, 'Campo requerido'),
  agacharseArrodillarse: z.string().min(1, 'Campo requerido'),
  
  // Recomendaciones
  recomendacionRestriccionLaboral: z.string().min(1, 'Campo requerido'),
  detalleRecomendacionLaboral: z.string().optional(),
  
  // Contacto de emergencia
  nombreContactoEmergencia: z.string({ required_error: 'Nombre de contacto de emergencia es requerido' }).min(1, 'Nombre de contacto de emergencia es requerido'),
  relacionContactoEmergencia: z.string({ required_error: 'Relación de contacto de emergencia es requerida' }).min(1, 'Relación de contacto de emergencia es requerida'),
  telefonoContactoEmergencia: z.string({ required_error: 'Teléfono de contacto de emergencia es requerido' })
    .min(1, 'Teléfono de contacto de emergencia es requerido')
    .refine((val) => {
      if (!val || val.trim() === '') return false; // Requerido, no puede estar vacío
      // Validar formato colombiano: 10 dígitos comenzando con 3
      const phoneRegex = /^[3][0-9]{9}$/;
      return phoneRegex.test(val.replace(/\s/g, ''));
    }, { message: 'El teléfono debe tener 10 dígitos y comenzar con 3 (ej: 3001234567)' }),
  
  // Firma - solo se valida al enviar, no en validación de pasos
  firma: z.string().optional(),
  numeroDocumentoFirma: z.string().min(1, 'Número de documento es requerido'),
});

// Crear un tipo base para el formulario (se usará con el schema dinámico)
type EncuestaFormValuesBase = z.infer<ReturnType<typeof createEncuestaSchema>>;
type EncuestaFormValues = EncuestaFormValuesBase;

interface EncuestaBienestarPageContentProps {
  isBulkEntryMode: boolean;
}

const EncuestaBienestarPageContent: React.FC<EncuestaBienestarPageContentProps> = ({ isBulkEntryMode }) => {
  const navigate = useNavigate();
  const { afiliado, getActiveConvenio, fechaExpedicion } = useAfiliadoAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const signaturePadRef = useRef<SignaturePadRef>(null);
  const recaptchaRef = useRef<InvisibleRecaptchaRef>(null);
  const [hasSignature, setHasSignature] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const TOTAL_STEPS = 5;

  const activeConvenio = getActiveConvenio();
  const hospitalValue = activeConvenio?.cliente || '';
  const profesionValue = activeConvenio?.proceso || '';

  // Crear schema dinámico según el modo
  const encuestaSchema = React.useMemo(
    () => createEncuestaSchema(isBulkEntryMode),
    [isBulkEntryMode]
  );

  const form = useForm<EncuestaFormValues>({
    resolver: zodResolver(encuestaSchema),
    defaultValues: {
      nombres: afiliado?.nombres || '',
      apellidos: afiliado?.apellidos || '',
      correo: afiliado?.correo_personal || '',
      tipoDocumento: afiliado?.tipo_documento || '',
      numeroDocumento: afiliado?.documento || '',
      hospital: hospitalValue || '',
      profesion: profesionValue || '',
      rh: '',
      fechaExpedicion: '',
      lugarNacimiento: '',
      departamento: 'antioquia',
      celular: '',
      direccion: '',
      municipio: '',
      tallaCalzado: '',
      tallaVestimenta: '',
      paisNacimiento: getDefaultPais(),
      fechaNacimiento: '',
      numeroPersonasDependientes: '0',
      serviciosPublicos: {
        agua: false,
        luz: false,
        telefono: false,
        internet: false,
        gas: false,
      },
      manejoTiempoLibre: {
        recreativas: false,
        deportivas: false,
        educativas: false,
        descanso: false,
        artisticas: false,
        religiosas: false,
        otras: false,
      },
      hijos: [],
      numeroHijos: '0',
      consumoLicor: '',
      frecuenciaLicor: '',
      consumoCigarrillo: '',
      frecuenciaCigarrillo: '',
      sobrepesoObesidad: '',
      hipertensionArterial: '',
      enfermedadesCorazon: '',
      diabetes: '',
      problemasRenales: '',
      depresionBipolaridad: '',
      antecedentesMedicosMentales: '',
      epilepsiaConvulsiones: '',
      trasplante: '',
      tipoTrasplante: '',
      cancer: '',
      problemasPulmonares: '',
      tipoProblemaPulmonar: '',
      alergias: '',
      tipoAlergia: '',
      tuberculosis: '',
      problemasVisuales: '',
      tipoProblemaVisual: '',
      doloresArticulares: '',
      tipoDolorArticular: '',
      problemasSangre: '',
      otraEnfermedad: '',
      tipoOtraEnfermedad: '',
      protesisArticular: '',
      medicamentoPermanente: '',
      tipoMedicamento: '',
      tratamientoMedico: '',
      cirugias: '',
      tipoCirugia: '',
      tiempoCirugia: '',
      estatura: '',
      peso: '',
      accidenteLaboral: '',
      tipoAccidenteLaboral: '',
      tiempoAccidenteLaboral: '',
      accidenteTransitoCasero: '',
      tipoAccidenteTransito: '',
      tiempoAccidenteTransito: '',
      vacunadoCovid: '',
      esfuerzosIntensos: '',
      esfuerzosModerados: '',
      subirPisos: '',
      agacharseArrodillarse: '',
      recomendacionRestriccionLaboral: '',
      detalleRecomendacionLaboral: '',
      tienePersonasACargo: '',
      estadoCivil: '',
      genero: '',
      raza: '',
      vivienda: '',
      estratoSocioeconomico: '',
      conviveCon: '',
      transporte: '',
      tiempoLibreCon: '',
      nombreContactoEmergencia: '',
      relacionContactoEmergencia: '',
      telefonoContactoEmergencia: '',
      firma: '',
      numeroDocumentoFirma: '',
    },
  });

  // Actualizar valores cuando cambian los datos del afiliado (solo si están vacíos)
  useEffect(() => {
    if (afiliado) {
      const currentValues = form.getValues();
      
      // Solo establecer valores si están vacíos para no sobrescribir cambios del usuario
      if (!currentValues.nombres) form.setValue('nombres', afiliado.nombres || '');
      if (!currentValues.apellidos) form.setValue('apellidos', afiliado.apellidos || '');
      if (!currentValues.correo) form.setValue('correo', afiliado.correo_personal || '');
      if (!currentValues.tipoDocumento) form.setValue('tipoDocumento', afiliado.tipo_documento || '');
      if (!currentValues.numeroDocumento) form.setValue('numeroDocumento', afiliado.documento || '');
      
      // Prellenar campos adicionales solo si están vacíos
      if (!currentValues.fechaExpedicion) {
        const fechaExp = fechaExpedicion || afiliado.fecha_expedicion || '';
        form.setValue('fechaExpedicion', fechaExp);
      }
      if (!currentValues.rh) form.setValue('rh', afiliado.rh || '');
      if (!currentValues.lugarNacimiento) form.setValue('lugarNacimiento', afiliado.lugar_nacimiento || '');
      // Departamento siempre es Antioquia
      form.setValue('departamento', 'antioquia');
      if (!currentValues.celular) form.setValue('celular', afiliado.celular || '');
      if (!currentValues.direccion) form.setValue('direccion', afiliado.direccion || '');
      if (!currentValues.municipio && afiliado.municipio) {
        form.setValue('municipio', normalizeMunicipio(afiliado.municipio));
      }
      if (!currentValues.tallaCalzado) form.setValue('tallaCalzado', afiliado.talla_calzado || '');
      if (!currentValues.tallaVestimenta) {
        const tallaVest = afiliado.talla_vestimenta || afiliado.talla_uniforme || '';
        if (tallaVest) {
          form.setValue('tallaVestimenta', normalizeTallaUniforme(tallaVest));
        }
      }
      if (!currentValues.paisNacimiento) {
        if (afiliado.pais_nacimiento) {
          form.setValue('paisNacimiento', normalizePais(afiliado.pais_nacimiento));
        } else {
          form.setValue('paisNacimiento', getDefaultPais());
        }
      }
      
      // Prellenar contacto de emergencia solo si están vacíos
      if (!currentValues.nombreContactoEmergencia || !currentValues.telefonoContactoEmergencia) {
        if (afiliado?.contacto_emergencia && !afiliado?.telefono_contacto_emergencia) {
          // Si viene en formato combinado, parsearlo
          const parsed = parseContactoEmergencia(afiliado.contacto_emergencia);
          if (!currentValues.nombreContactoEmergencia) form.setValue('nombreContactoEmergencia', parsed.nombre);
          if (!currentValues.relacionContactoEmergencia) form.setValue('relacionContactoEmergencia', normalizeRelacionContactoEmergencia(parsed.relacion));
          if (!currentValues.telefonoContactoEmergencia) form.setValue('telefonoContactoEmergencia', parsed.telefono);
        } else {
          // Si viene separado, usarlo directamente
          if (!currentValues.nombreContactoEmergencia) form.setValue('nombreContactoEmergencia', afiliado.nombre_contacto_emergencia || '');
          if (!currentValues.relacionContactoEmergencia) form.setValue('relacionContactoEmergencia', normalizeRelacionContactoEmergencia(afiliado.relacion_contacto_emergencia));
          if (!currentValues.telefonoContactoEmergencia) form.setValue('telefonoContactoEmergencia', afiliado.telefono_contacto_emergencia || '');
        }
      }
    }
    if (activeConvenio) {
      const currentValues = form.getValues();
      if (!currentValues.hospital) form.setValue('hospital', activeConvenio.cliente || '');
      if (!currentValues.profesion) form.setValue('profesion', activeConvenio.proceso || '');
    }
    if (afiliado?.documento) {
      const currentValues = form.getValues();
      if (!currentValues.numeroDocumentoFirma) form.setValue('numeroDocumentoFirma', afiliado.documento);
    }
  }, [afiliado, activeConvenio, form, fechaExpedicion]);

  // Asegurar que numeroDocumentoFirma siempre tenga valor cuando se está en el paso 5
  useEffect(() => {
    if (currentStep === 5) {
      const currentValue = form.getValues('numeroDocumentoFirma');
      const numeroDocumento = form.getValues('numeroDocumento');
      if (!currentValue && numeroDocumento) {
        form.setValue('numeroDocumentoFirma', numeroDocumento);
      }
    }
  }, [currentStep, form]);

  // Watch values para ofuscación
  const watchValues = useWatch({ control: form.control });
  
  // Obtener teléfono de contacto de emergencia (puede venir parseado)
  const getTelefonoContactoEmergencia = (): string => {
    if (afiliado?.telefono_contacto_emergencia) {
      return afiliado.telefono_contacto_emergencia;
    }
    if (afiliado?.contacto_emergencia) {
      const parsed = parseContactoEmergencia(afiliado.contacto_emergencia);
      return parsed.telefono || '';
    }
    return '';
  };
  
  // Valores iniciales para ofuscación
  const initialValues = {
    correo: afiliado?.correo_personal || '',
    direccion: afiliado?.direccion || '',
    celular: afiliado?.celular || '',
    telefonoContactoEmergencia: getTelefonoContactoEmergencia(),
  };

  // Función para determinar si un campo debe estar ofuscado
  const shouldObfuscate = (fieldName: keyof typeof initialValues): boolean => {
    const initialValue = initialValues[fieldName];
    return !!initialValue && String(initialValue).trim() !== '';
  };

  const numeroHijos = form.watch('numeroHijos');
  const hijos = form.watch('hijos') || [];

  useEffect(() => {
    const num = parseInt(numeroHijos || '0', 10);
    const currentHijos = form.getValues('hijos') || [];
    if (num > currentHijos.length) {
      // Agregar hijos faltantes
      const nuevosHijos = Array.from({ length: num - currentHijos.length }, () => ({
        tipoDocumento: '',
        numeroDocumento: '',
        nombre: '',
        genero: '',
        fechaNacimiento: '',
      }));
      form.setValue('hijos', [...currentHijos, ...nuevosHijos]);
    } else if (num < currentHijos.length) {
      // Eliminar hijos sobrantes
      form.setValue('hijos', currentHijos.slice(0, num));
    }
  }, [numeroHijos, form]);

  const handleSignatureChange = (dataUrl: string | null) => {
    setHasSignature(Boolean(dataUrl));
    form.setValue('firma', dataUrl || '');
  };

  // Campos por paso para validación
  const stepFields: Record<number, (keyof EncuestaFormValues)[]> = {
    1: [
      'nombres',
      'apellidos',
      'correo',
      'tipoDocumento',
      'numeroDocumento',
      'hospital',
      'profesion',
      'rh',
      'fechaExpedicion',
      'lugarNacimiento',
      'departamento',
      'celular',
      'direccion',
      'municipio',
      'tallaCalzado',
      'tallaVestimenta',
      'paisNacimiento',
      'nombreContactoEmergencia',
      'relacionContactoEmergencia',
      'telefonoContactoEmergencia',
    ],
    2: [
      'tienePersonasACargo',
      'estadoCivil',
      'fechaNacimiento',
      'estatura',
      'peso',
      'genero',
      'raza',
      'vivienda',
      'estratoSocioeconomico',
      'conviveCon',
      'transporte',
      'tiempoLibreCon',
    ],
    3: [
      'consumoLicor',
      'consumoCigarrillo',
      'frecuenciaLicor',
      'frecuenciaCigarrillo',
      'sobrepesoObesidad',
      'hipertensionArterial',
      'enfermedadesCorazon',
      'diabetes',
      'problemasRenales',
      'depresionBipolaridad',
      'antecedentesMedicosMentales',
      'epilepsiaConvulsiones',
      'trasplante',
      'cancer',
      'problemasPulmonares',
      'alergias',
      'tuberculosis',
      'problemasVisuales',
      'doloresArticulares',
      'problemasSangre',
      'otraEnfermedad',
      'protesisArticular',
      'medicamentoPermanente',
      'tratamientoMedico',
      'cirugias',
      'accidenteLaboral',
      'accidenteTransitoCasero',
      'vacunadoCovid',
    ],
    4: [
      'esfuerzosIntensos',
      'esfuerzosModerados',
      'subirPisos',
      'agacharseArrodillarse',
      'recomendacionRestriccionLaboral',
    ],
    5: [
      'numeroDocumentoFirma',
    ],
  };

  // Validar paso actual antes de avanzar
  const validateStep = async (step: number): Promise<boolean> => {
    const fields = stepFields[step] || [];
    const result = await form.trigger(fields as any);
    return result;
  };

  // Navegar al siguiente paso
  const handleNext = async () => {
    const isValid = await validateStep(currentStep);
    if (isValid) {
      if (currentStep < TOTAL_STEPS) {
        setCurrentStep(currentStep + 1);
        // Scroll al inicio del formulario
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else {
      toast.error('Por favor, completa todos los campos requeridos antes de continuar');
    }
  };

  // Navegar al paso anterior
  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      // Scroll al inicio del formulario
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Calcular progreso
  const progress = (currentStep / TOTAL_STEPS) * 100;

  const onSubmit = async (data: EncuestaFormValues) => {
    console.log('onSubmit llamado', { 
      hasAfiliado: !!afiliado,
      hasSignature,
      firmaLength: data.firma?.length || 0,
      isBulkEntryMode,
    });

    // En modo afiliados activos, se requiere autenticación
    if (!isBulkEntryMode && !afiliado) {
      toast.error('No se encontró información del afiliado');
      return;
    }

    if (!hasSignature) {
      toast.error('Debe firmar la encuesta antes de enviarla');
      return;
    }

    if (!data.firma || data.firma.trim() === '') {
      toast.error('La firma digital es requerida');
      return;
    }

    console.log('Pasando validaciones básicas, iniciando envío...');
    setIsSubmitting(true);
    try {
      console.log('Enviando encuesta...', { 
        tieneFirma: !!data.firma, 
        camposRequeridos: {
          correo: !!data.correo,
          tipoDocumento: !!data.tipoDocumento,
          numeroDocumento: !!data.numeroDocumento,
          hospital: !!data.hospital,
          profesion: !!data.profesion,
        }
      });

      // Ejecutar reCAPTCHA - si falla, continuar sin token (fail-open)
      let recaptchaToken: string | null = null;
      try {
        recaptchaToken = await recaptchaRef.current?.execute() ?? null;
        console.log('reCAPTCHA token obtenido:', !!recaptchaToken);
      } catch (error) {
        logger.warn('Error al ejecutar reCAPTCHA, continuando sin token:', error);
        // No bloquear al usuario - permitir continuar
      }

      console.log('Llamando a submitSurvey...');
      // Determinar survey_type según el modo
      const surveyType = isBulkEntryMode ? 'bulk_entry' : 'active_affiliate';
      
      // Preparar datos para envío
      const surveyDataWithType: any = {
        ...data,
        survey_type: surveyType,
      };
      
      // En modo masivo, no enviar hospital y profesion (son campos internos)
      if (isBulkEntryMode) {
        delete surveyDataWithType.hospital;
        delete surveyDataWithType.profesion;
      }
      
      const response = await submitSurvey(
        surveyDataWithType,
        data.firma, // Base64 de la firma
        recaptchaToken || undefined
      );

      console.log('Respuesta recibida:', response);

      // Reset reCAPTCHA después del envío exitoso
      recaptchaRef.current?.reset();

      form.reset();
      toast.success('Encuesta enviada correctamente', {
        description: 'Gracias por participar en la encuesta de bienestar.',
      });

      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (error: any) {
      console.error('Error submitting survey:', error);
      console.error('Error details:', {
        message: error.message,
        isValidationError: error.isValidationError,
        errors: error.errors,
        status: error.status,
        response: error.response,
      });
      
      // Manejar errores de validación
      if (error.isValidationError && error.errors) {
        const errorMessages = Object.values(error.errors).flat().join(', ');
        toast.error('Error de validación', {
          description: errorMessages || 'Por favor, revisa los datos ingresados.',
        });
      } else {
        toast.error('Error al enviar la encuesta', {
          description: error.message || 'Por favor, intenta nuevamente.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-slate-50 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumb className="mb-6">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/" className="flex items-center gap-1">
                  <Home className="h-4 w-4" />
                  Inicio
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Encuesta de Bienestar</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              Encuesta Sociodemográfica y Diagnóstico de Condiciones de Salud
            </h1>
            <p className="text-slate-600 mb-4">
              {isBulkEntryMode ? (
                <>Yo, con autorizo al Sindicato de Profesionales de la salud ProSalud, el suministro de esta información única y exclusivamente para fines de actividades de seguridad y salud en el trabajo.</>
              ) : (
                <>Yo, {afiliado?.nombres} {afiliado?.apellidos}, con {afiliado?.tipo_documento} {afiliado?.documento} autorizo al Sindicato de Profesionales de la salud ProSalud, el suministro de esta información única y exclusivamente para fines de actividades de seguridad y salud en el trabajo.</>
              )}
            </p>
            
            {/* Barra de progreso y contador de secciones */}
            <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">
                  Sección {currentStep} de {TOTAL_STEPS}
                </span>
                <span className="text-sm font-medium text-slate-700">
                  {Math.round(progress)}%
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </div>

          <Form {...form}>
            <form 
              onSubmit={form.handleSubmit(
                onSubmit,
                (errors) => {
                  console.error('Errores de validación del formulario:', errors);
                  const errorCount = Object.keys(errors).length;
                  toast.error(`El formulario tiene ${errorCount} error(es) de validación`, {
                    description: 'Por favor, revisa los campos marcados en rojo y completa todos los campos requeridos.',
                  });
                }
              )} 
              className="space-y-8"
            >
              {/* Paso 1: Datos Básicos y Contacto de Emergencia */}
              {currentStep === 1 && (
                <>
              {/* Sección 1: Datos Básicos (Autocompletados) */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary-prosalud" />
                    Datos Básicos
                  </CardTitle>
                  <CardDescription>
                    {isBulkEntryMode 
                      ? 'Por favor, diligencie todos los campos requeridos'
                      : 'Esta información se ha autocompletado con sus datos personales'
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="nombres"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold text-slate-900">1. Nombres</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              value={field.value || ''} 
                              readOnly={!isBulkEntryMode} 
                              className={!isBulkEntryMode ? "bg-slate-100" : ""}
                              onChange={(e) => {
                                field.onChange(e);
                                form.clearErrors('nombres');
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="apellidos"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold text-slate-900">2. Apellidos</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              value={field.value || ''} 
                              readOnly={!isBulkEntryMode} 
                              className={!isBulkEntryMode ? "bg-slate-100" : ""}
                              onChange={(e) => {
                                field.onChange(e);
                                form.clearErrors('apellidos');
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="tipoDocumento"
                      render={({ field }) => {
                        const displayValue = getTipoDocumentoDisplayName(field.value);
                        if (isBulkEntryMode) {
                          // En modo masivo, mostrar como Select editable
                          return (
                            <FormItem>
                              <FormLabel className="text-base font-semibold text-slate-900">3. Tipo de documento</FormLabel>
                              <Select
                                value={field.value || ''}
                                onValueChange={(value) => {
                                  field.onChange(value);
                                  form.clearErrors('tipoDocumento');
                                }}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccione el tipo de documento" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {tiposDocumentoCompletos.map((tipo) => (
                                    <SelectItem key={tipo.value} value={tipo.value}>
                                      {tipo.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          );
                        }
                        // En modo afiliados activos, mostrar como Input read-only
                        return (
                          <FormItem>
                            <FormLabel className="text-base font-semibold text-slate-900">3. Tipo de documento</FormLabel>
                            <FormControl>
                              <Input value={displayValue} readOnly className="bg-slate-100" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />

                    <FormField
                      control={form.control}
                      name="numeroDocumento"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold text-slate-900">4. Número de documento</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              readOnly={!isBulkEntryMode} 
                              className={!isBulkEntryMode ? "bg-slate-100" : ""}
                              onChange={(e) => {
                                field.onChange(e);
                                form.clearErrors('numeroDocumento');
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Hospital y Profesión solo se muestran en modo afiliados activos */}
                    {!isBulkEntryMode && (
                      <>
                        <FormField
                          control={form.control}
                          name="hospital"
                          render={({ field }) => {
                            const displayValue = getHospitalDisplayName(field.value);
                            return (
                              <FormItem>
                                <FormLabel className="text-base font-semibold text-slate-900">5. Hospital</FormLabel>
                                <FormControl>
                                  <Input 
                                    value={displayValue} 
                                    readOnly 
                                    className="bg-slate-100" 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            );
                          }}
                        />

                        <FormField
                          control={form.control}
                          name="profesion"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-base font-semibold text-slate-900">6. Proceso</FormLabel>
                              <FormControl>
                                <Input {...field} readOnly className="bg-slate-100" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}

                    <FormField
                      control={form.control}
                      name="correo"
                      render={({ field }) => {
                        const currentValue = watchValues?.correo || '';
                        const initialValue = initialValues.correo;
                        const isObfuscated = shouldObfuscate('correo');
                        const initialIsObfuscated = initialValue ? isObfuscatedValue(String(initialValue)) : false;
                        const displayValue = isObfuscated && currentValue === initialValue
                          ? (initialIsObfuscated ? initialValue : obfuscateValue(String(initialValue), 'email'))
                          : currentValue;

                        return (
                          <FormItem>
                            <FormLabel className="text-base font-semibold text-slate-900">
                              {isBulkEntryMode ? '5. Dirección de correo electrónico' : '7. Dirección de correo electrónico'}
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                value={displayValue}
                                onChange={(e) => {
                                  const sanitized = sanitizeEmail(e.target.value, { maxLength: 100 });
                                  field.onChange(sanitized);
                                  form.clearErrors('correo');
                                }}
                                onFocus={() => {
                                  // Si el valor mostrado es ofuscado, preparar el campo para edición
                                  if (isObfuscated && displayValue !== currentValue && displayValue.includes('*')) {
                                    if (initialIsObfuscated) {
                                      // Si viene ofuscado del backend, limpiar para que escriba el valor real
                                      field.onChange('');
                                    } else if (initialValue) {
                                      // Si no viene ofuscado, restaurar el valor real para edición
                                      field.onChange(initialValue);
                                    } else {
                                      field.onChange('');
                                    }
                                  }
                                }}
                                onBlur={(e) => {
                                  const currentVal = e.target.value || '';
                                  if (isObfuscated && !currentVal.trim() && initialValue) {
                                    field.onChange(initialValue);
                                  }
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />

                    <FormField
                        control={form.control}
                        name="celular"
                        render={({ field }) => {
                          const currentValue = watchValues?.celular || '';
                          const initialValue = initialValues.celular;
                          const isObfuscated = shouldObfuscate('celular');
                          const initialIsObfuscated = initialValue ? isObfuscatedValue(String(initialValue)) : false;
                          const displayValue = isObfuscated && currentValue === initialValue
                              ? (initialIsObfuscated ? initialValue : obfuscateValue(String(initialValue), 'phone'))
                              : currentValue;

                          return (
                              <FormItem>
                                <FormLabel className="text-base font-semibold text-slate-900">
                                  {isBulkEntryMode ? '6. Celular' : '8. Celular'}
                                </FormLabel>
                                <FormControl>
                                  <Input
                                      type="tel"
                                      value={displayValue}
                                      onChange={(e) => {
                                        const sanitized = sanitizePhone(e.target.value, { maxLength: 15 });
                                        field.onChange(sanitized);
                                      }}
                                      onFocus={() => {
                                        // Si el valor mostrado es ofuscado, preparar el campo para edición
                                        if (isObfuscated && displayValue !== currentValue && displayValue.includes('*')) {
                                          if (initialIsObfuscated) {
                                            // Si viene ofuscado del backend, limpiar para que escriba el valor real
                                            field.onChange('');
                                          } else if (initialValue) {
                                            // Si no viene ofuscado, restaurar el valor real para edición
                                            field.onChange(initialValue);
                                          } else {
                                            field.onChange('');
                                          }
                                        }
                                      }}
                                      onBlur={(e) => {
                                        const currentVal = e.target.value || '';
                                        if (isObfuscated && !currentVal.trim() && initialValue) {
                                          field.onChange(initialValue);
                                        }
                                      }}
                                      placeholder="Ej: 3001234567"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                          );
                        }}
                    />

                    <FormField
                      control={form.control}
                      name="fechaExpedicion"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold text-slate-900">
                            {isBulkEntryMode ? '7. Fecha de expedición' : '9. Fecha de expedición'}
                          </FormLabel>
                          <FormControl>
                            <Input type="date" {...field} value={field.value || ''} readOnly={!!afiliado?.fecha_expedicion} className={afiliado?.fecha_expedicion ? 'bg-slate-100' : ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="paisNacimiento"
                      render={({ field }) => {
                        const selectedPais = paises.find(p => p.value === field.value);
                        return (
                          <FormItem>
                            <FormLabel className="text-base font-semibold text-slate-900">
                              {isBulkEntryMode ? '8. País de nacimiento' : '10. País de nacimiento'}
                            </FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccione el país">
                                    {selectedPais && (
                                      <span className="flex items-center gap-2">
                                        <span>{selectedPais.flag}</span>
                                        <span>{selectedPais.label}</span>
                                      </span>
                                    )}
                                  </SelectValue>
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="max-h-[300px]">
                                {paises.map((pais) => (
                                  <SelectItem key={pais.value} value={pais.value}>
                                    <span className="flex items-center gap-2">
                                      <span className="text-lg">{pais.flag}</span>
                                      <span>{pais.label}</span>
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />

                    <FormField
                        control={form.control}
                        name="lugarNacimiento"
                        render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-base font-semibold text-slate-900">
                                {isBulkEntryMode ? '9. Lugar de nacimiento' : '11. Lugar de nacimiento'}
                              </FormLabel>
                              <FormControl>
                                <Input {...field} value={field.value || ''} readOnly={!!afiliado?.lugar_nacimiento} className={afiliado?.lugar_nacimiento ? 'bg-slate-100' : ''} placeholder="Ej: Medellín" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="departamento"
                        render={({ field }) => {
                          // Asegurar que el valor del campo siempre sea 'antioquia'
                          if (field.value !== 'antioquia') {
                            field.onChange('antioquia');
                          }

                          return (
                              <FormItem>
                                <FormLabel className="text-base font-semibold text-slate-900">
                                  {isBulkEntryMode ? '10. Departamento de residencia' : '12. Departamento de residencia'}
                                </FormLabel>
                                <FormControl>
                                  <Input
                                      value="Antioquia"
                                      readOnly
                                      className="bg-slate-100 cursor-not-allowed"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                          );
                        }}
                    />

                    <FormField
                        control={form.control}
                        name="municipio"
                        render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-base font-semibold text-slate-900">
                                {isBulkEntryMode ? '11. Municipio de residencia' : '13. Municipio de residencia'}
                              </FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccione el municipio" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {municipios.map((municipio) => (
                                      <SelectItem key={municipio.value} value={municipio.value}>
                                        {municipio.label}
                                      </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                      control={form.control}
                      name="direccion"
                      render={({ field }) => {
                        const currentValue = watchValues?.direccion || '';
                        const initialValue = initialValues.direccion;
                        const isObfuscated = shouldObfuscate('direccion');
                        const initialIsObfuscated = initialValue ? isObfuscatedValue(String(initialValue)) : false;
                        const displayValue = isObfuscated && currentValue === initialValue
                          ? (initialIsObfuscated ? initialValue : obfuscateValue(String(initialValue), 'address'))
                          : currentValue;

                        return (
                          <FormItem>
                            <FormLabel className="text-base font-semibold text-slate-900">
                              {isBulkEntryMode ? '12. Dirección de residencia' : '14. Dirección de residencia'}
                            </FormLabel>
                            <FormControl>
                              <Input
                                value={displayValue}
                                onChange={(e) => {
                                  const sanitized = sanitizeGeneral(e.target.value, { maxLength: 200 });
                                  field.onChange(sanitized);
                                  form.clearErrors('direccion');
                                }}
                                onFocus={() => {
                                  // Si el valor mostrado es ofuscado, preparar el campo para edición
                                  if (isObfuscated && displayValue !== currentValue && displayValue.includes('*')) {
                                    if (initialIsObfuscated) {
                                      // Si viene ofuscado del backend, limpiar para que escriba el valor real
                                      field.onChange('');
                                    } else if (initialValue) {
                                      // Si no viene ofuscado, restaurar el valor real para edición
                                      field.onChange(initialValue);
                                    } else {
                                      field.onChange('');
                                    }
                                  }
                                }}
                                onBlur={(e) => {
                                  const currentVal = e.target.value || '';
                                  if (isObfuscated && !currentVal.trim() && initialValue) {
                                    field.onChange(initialValue);
                                  }
                                }}
                                placeholder="Ej: Calle 50 # 45-23"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />

                    <FormField
                        control={form.control}
                        name="rh"
                        render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-base font-semibold text-slate-900">15 RH</FormLabel>
                              <FormControl>
                                <Select onValueChange={field.onChange} value={field.value} disabled={!!afiliado?.rh}>
                                  <SelectTrigger className={afiliado?.rh ? 'bg-slate-100' : ''}>
                                    <SelectValue placeholder="Seleccione el tipo de sangre" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="A+">A+</SelectItem>
                                    <SelectItem value="A-">A-</SelectItem>
                                    <SelectItem value="B+">B+</SelectItem>
                                    <SelectItem value="B-">B-</SelectItem>
                                    <SelectItem value="AB+">AB+</SelectItem>
                                    <SelectItem value="AB-">AB-</SelectItem>
                                    <SelectItem value="O+">O+</SelectItem>
                                    <SelectItem value="O-">O-</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                      control={form.control}
                      name="tallaVestimenta"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold text-slate-900">16. Talla de vestimenta (Pijama)</FormLabel>
                          <Select onValueChange={(value) => {
                            field.onChange(value);
                            form.clearErrors('tallaVestimenta');
                          }} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccione la talla" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {tallasUniforme.map((talla) => (
                                <SelectItem key={talla.value} value={talla.value}>
                                  {talla.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="tallaCalzado"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold text-slate-900">17. Talla de calzado</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value || ''}
                              placeholder="Ej: 40"
                              type="number"
                              min={20}
                              max={50}
                              onChange={(e) => {
                                const value = e.target.value;
                                // Solo permitir números
                                if (value === '' || /^\d+$/.test(value)) {
                                  field.onChange(value);
                                  form.clearErrors('tallaCalzado');
                                }
                              }}
                            />
                          </FormControl>
                          <FormDescription>Ingrese un número entre 20 y 50</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Sección 1.5: Contacto de Emergencia */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PhoneCall className="h-5 w-5 text-primary-prosalud" />
                    Contacto de Emergencia
                  </CardTitle>
                  <CardDescription>Información de la persona a contactar en caso de emergencia</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <FormField
                      control={form.control}
                      name="nombreContactoEmergencia"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold text-slate-900">Nombre completo</FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              placeholder="Ej: Juan Pérez"
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                form.clearErrors('nombreContactoEmergencia');
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="relacionContactoEmergencia"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold text-slate-900">Relación</FormLabel>
                          <Select onValueChange={(value) => {
                            field.onChange(value);
                            form.clearErrors('relacionContactoEmergencia');
                          }} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccione la relación" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {relacionesContactoEmergencia.map((relacion) => (
                                <SelectItem key={relacion.value} value={relacion.value}>
                                  {relacion.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="telefonoContactoEmergencia"
                      render={({ field }) => {
                        const currentValue = field.value || '';
                        const initialValue = initialValues.telefonoContactoEmergencia;
                        const isObfuscated = shouldObfuscate('telefonoContactoEmergencia');
                        const initialIsObfuscated = initialValue ? isObfuscatedValue(String(initialValue)) : false;
                        
                        // Si el campo está vacío o es igual al valor inicial ofuscado, mostrar valor ofuscado
                        // Si el usuario ha modificado el valor, mostrar el valor actual
                        const hasBeenModified = currentValue !== '' && currentValue !== initialValue;
                        const displayValue = !hasBeenModified && isObfuscated && (currentValue === '' || currentValue === initialValue)
                          ? (initialIsObfuscated ? initialValue : obfuscateValue(String(initialValue), 'phone'))
                          : currentValue;

                        return (
                          <FormItem>
                            <FormLabel className="text-base font-semibold text-slate-900">Número telefónico</FormLabel>
                            <FormControl>
                              <Input
                                type="tel"
                                value={displayValue}
                                onChange={(e) => {
                                  const sanitized = sanitizePhone(e.target.value, { maxLength: 15 });
                                  field.onChange(sanitized);
                                  form.clearErrors('celular');
                                }}
                                onFocus={() => {
                                  // Si el valor mostrado es ofuscado, limpiar el campo para permitir edición
                                  if (isObfuscated && displayValue !== currentValue && displayValue.includes('*')) {
                                    if (initialIsObfuscated) {
                                      field.onChange('');
                                    } else if (initialValue) {
                                      field.onChange(initialValue);
                                    } else {
                                      field.onChange('');
                                    }
                                  }
                                }}
                                onBlur={(e) => {
                                  // Si el usuario no ingresó nada y había un valor inicial, restaurar
                                  const currentVal = e.target.value || '';
                                  if (isObfuscated && !currentVal.trim() && initialValue && !initialIsObfuscated) {
                                    field.onChange(initialValue);
                                  }
                                }}
                                placeholder="Ej: 3001234567"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
                </>
              )}

              {/* Paso 2: Información Sociodemográfica */}
              {currentStep === 2 && (
                <>
              {/* Sección 2: Información Sociodemográfica */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary-prosalud" />
                    Información Sociodemográfica
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="tienePersonasACargo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold text-slate-900">16. ¿Tiene personas a cargo?</FormLabel>
                          <FormControl>
                          <RadioGroup onValueChange={(value) => {
                            field.onChange(value);
                            form.clearErrors('tienePersonasACargo');
                          }} value={field.value} className="flex gap-6">
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="si" id="personas-si" />
                                <label htmlFor="personas-si" className="text-base font-normal text-slate-600 cursor-pointer">Sí</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="no" id="personas-no" />
                                <label htmlFor="personas-no" className="text-base font-normal text-slate-600 cursor-pointer">No</label>
                              </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="estadoCivil"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold text-slate-900">17. Estado civil</FormLabel>
                        <Select onValueChange={(value) => {
                          field.onChange(value);
                          form.clearErrors('estadoCivil');
                        }} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione estado civil" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="soltero">Soltero(a)</SelectItem>
                            <SelectItem value="casado">Casado(a)</SelectItem>
                            <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                            <SelectItem value="viudo">Viudo(a)</SelectItem>
                            <SelectItem value="union_libre">Unión libre</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fechaNacimiento"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold text-slate-900">18. Fecha de nacimiento</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} value={field.value || ''} onChange={(e) => {
                            field.onChange(e);
                            form.clearErrors('fechaNacimiento');
                          }} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="estatura"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold text-slate-900">19. ¿Cuál es su estatura? (cm)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            value={field.value || ''} 
                            placeholder="Ej: 170"
                            min={120}
                            max={230}
                            onChange={(e) => {
                              field.onChange(e);
                              form.clearErrors('estatura');
                            }}
                          />
                        </FormControl>
                        <FormDescription className="text-xs text-slate-500">
                          Rango válido: 120-230 cm
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="peso"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold text-slate-900">20. ¿Cuál es su peso? (kg)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            value={field.value || ''} 
                            placeholder="Ej: 70"
                            min={30}
                            max={250}
                            onChange={(e) => {
                              field.onChange(e);
                              form.clearErrors('peso');
                            }}
                          />
                        </FormControl>
                        <FormDescription className="text-xs text-slate-500">
                          Rango válido: 30-250 kg
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="genero"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold text-slate-900">21. Género</FormLabel>
                        <FormControl>
                          <RadioGroup onValueChange={(value) => {
                            field.onChange(value);
                            form.clearErrors('genero');
                          }} value={field.value} className="flex gap-6">
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="masculino" id="genero-m" />
                              <label htmlFor="genero-m" className="text-base font-normal text-slate-600 cursor-pointer">Masculino</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="femenino" id="genero-f" />
                              <label htmlFor="genero-f" className="text-base font-normal text-slate-600 cursor-pointer">Femenino</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="otro" id="genero-o" />
                              <label htmlFor="genero-o" className="text-base font-normal text-slate-600 cursor-pointer">Otro</label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="raza"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold text-slate-900">22. Grupo étnico</FormLabel>
                        <Select onValueChange={(value) => {
                          field.onChange(value);
                          form.clearErrors('raza');
                        }} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione su grupo étnico" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ninguno">Ninguno</SelectItem>
                            <SelectItem value="afro">Afrocolombiano</SelectItem>
                            <SelectItem value="indigena">Indígena</SelectItem>
                            <SelectItem value="otro">Otro</SelectItem>
                            <SelectItem value="no_responde">Prefiere no responder</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="numeroHijos"
                    render={({ field }) => (
                      <FormItem>
                          <FormLabel className="text-base font-semibold text-slate-900">23. Número de hijos</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" {...field} onChange={(e) => {
                            field.onChange(e);
                            form.setValue('numeroHijos', e.target.value);
                          }} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Registro de hijos dinámico */}
                  {hijos.length > 0 && (
                      <div className="space-y-6 border-t pt-6">
                      <FormLabel className="text-base font-semibold text-slate-900">24. Registro de información de los hijos</FormLabel>
                      {hijos.map((_, index) => (
                        <Card key={index} className="p-4">
                          <div className="flex justify-between items-center mb-4">
                            <h4 className="font-semibold">Hijo {index + 1}</h4>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name={`hijos.${index}.tipoDocumento`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-base font-semibold text-slate-900">Tipo de documento</FormLabel>
                                  <Select onValueChange={(value) => {
                                    field.onChange(value);
                                    form.clearErrors(`hijos.${index}.tipoDocumento` as any);
                                  }} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Seleccione" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="CC">Cédula de Ciudadanía</SelectItem>
                                      <SelectItem value="TI">Tarjeta de Identidad</SelectItem>
                                      <SelectItem value="RC">Registro Civil</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`hijos.${index}.numeroDocumento`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-base font-semibold text-slate-900">Número de documento</FormLabel>
                                  <FormControl>
                                    <Input {...field} onChange={(e) => {
                                      field.onChange(e);
                                      form.clearErrors(`hijos.${index}.numeroDocumento` as any);
                                    }} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`hijos.${index}.nombre`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-base font-semibold text-slate-900">Nombre completo</FormLabel>
                                  <FormControl>
                                    <Input {...field} onChange={(e) => {
                                      field.onChange(e);
                                      form.clearErrors(`hijos.${index}.nombre` as any);
                                    }} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`hijos.${index}.genero`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-base font-semibold text-slate-900">Género</FormLabel>
                                  <Select onValueChange={(value) => {
                                    field.onChange(value);
                                    form.clearErrors(`hijos.${index}.genero` as any);
                                  }} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Seleccione" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="masculino">Masculino</SelectItem>
                                      <SelectItem value="femenino">Femenino</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`hijos.${index}.fechaNacimiento`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-base font-semibold text-slate-900">Fecha de nacimiento</FormLabel>
                                  <FormControl>
                                    <Input type="date" {...field} onChange={(e) => {
                                      field.onChange(e);
                                      form.clearErrors(`hijos.${index}.fechaNacimiento` as any);
                                    }} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="numeroPersonasDependientes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold text-slate-900">25. Número de personas que dependen económicamente de usted</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="vivienda"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold text-slate-900">26. Vivienda</FormLabel>
                        <Select onValueChange={(value) => {
                          field.onChange(value);
                          form.clearErrors('vivienda');
                        }} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione tipo de vivienda" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="propia">Propia</SelectItem>
                            <SelectItem value="arrendada">Arrendada</SelectItem>
                            <SelectItem value="familiar">Familiar</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-3">
                    <FormLabel className="text-base font-semibold text-slate-900">27. La vivienda cuenta con servicios públicos:</FormLabel>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {['agua', 'luz', 'telefono', 'internet', 'gas'].map((servicio) => (
                        <FormField
                          key={servicio}
                          control={form.control}
                          name={`serviciosPublicos.${servicio}` as any}
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <FormLabel className="text-base font-normal capitalize">{servicio}</FormLabel>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="estratoSocioeconomico"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold text-slate-900">28. Estrato socioeconómico</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione estrato" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {[1, 2, 3, 4, 5, 6].map((estrato) => (
                              <SelectItem key={estrato} value={estrato.toString()}>
                                Estrato {estrato}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="conviveCon"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold text-slate-900">29. ¿Con quién convive?</FormLabel>
                        <Select onValueChange={(value) => {
                          field.onChange(value);
                          form.clearErrors('conviveCon');
                        }} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione opción" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="familia_origen">Familia de origen</SelectItem>
                            <SelectItem value="nueva_familia">Nueva familia (cónyuge e hijos)</SelectItem>
                            <SelectItem value="ambas">Las dos anteriores</SelectItem>
                            <SelectItem value="amigos">Amigos</SelectItem>
                            <SelectItem value="otros_familiares">Otros familiares</SelectItem>
                            <SelectItem value="solo">Vive solo</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="transporte"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold text-slate-900">30. Para el desplazamiento a la empresa utiliza:</FormLabel>
                        <Select onValueChange={(value) => {
                          field.onChange(value);
                          form.clearErrors('transporte');
                        }} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione medio de transporte" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="carro">Carro</SelectItem>
                            <SelectItem value="motocicleta">Motocicleta</SelectItem>
                            <SelectItem value="bicicleta">Bicicleta</SelectItem>
                            <SelectItem value="transporte_publico">Transporte público</SelectItem>
                            <SelectItem value="caminando">Caminando</SelectItem>
                            <SelectItem value="otra">Otra</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-3">
                    <FormLabel className="text-base font-semibold text-slate-900">31. En su tiempo libre (fuera de la jornada laboral) usted realiza actividades como:</FormLabel>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {[
                        { key: 'recreativas', label: 'Actividades recreativas' },
                        { key: 'deportivas', label: 'Actividades deportivas' },
                        { key: 'educativas', label: 'Actividades educativas' },
                        { key: 'descanso', label: 'Actividades de descanso' },
                        { key: 'artisticas', label: 'Actividades artísticas' },
                        { key: 'religiosas', label: 'Actividades religiosas' },
                        { key: 'otras', label: 'Otras' },
                      ].map((actividad) => (
                        <FormField
                          key={actividad.key}
                          control={form.control}
                          name={`manejoTiempoLibre.${actividad.key}` as any}
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <FormLabel className="text-base font-normal">{actividad.label}</FormLabel>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="tiempoLibreCon"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold text-slate-900">32. En su tiempo libre, las actividades las realiza:</FormLabel>
                        <Select onValueChange={(value) => {
                          field.onChange(value);
                          form.clearErrors('tiempoLibreCon');
                        }} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione opción" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="familia">Con la familia</SelectItem>
                            <SelectItem value="pareja">Con la pareja</SelectItem>
                            <SelectItem value="amigos">Con amigos</SelectItem>
                            <SelectItem value="solo">Solo</SelectItem>
                            <SelectItem value="otros">Otros</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
                </>
              )}

              {/* Paso 3: Consumo y Condiciones de Salud */}
              {currentStep === 3 && (
                <>
              {/* Sección 3: Consumo */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wine className="h-5 w-5 text-primary-prosalud" />
                    Consumo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="consumoLicor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold text-slate-900">33. Consumo de licor</FormLabel>
                          <FormControl>
                            <RadioGroup onValueChange={(value) => {
                              field.onChange(value);
                              form.clearErrors('consumoLicor');
                              if (value !== 'si') {
                                form.setValue('frecuenciaLicor', '');
                                form.clearErrors('frecuenciaLicor');
                              }
                            }} value={field.value} className="flex gap-6">
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="si" id="consumo-licor-si" />
                                <label htmlFor="consumo-licor-si" className="text-base font-normal text-slate-600 cursor-pointer">Sí</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="no" id="consumo-licor-no" />
                                <label htmlFor="consumo-licor-no" className="text-base font-normal text-slate-600 cursor-pointer">No</label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {form.watch('consumoLicor') === 'si' && (
                      <FormField
                        control={form.control}
                        name="frecuenciaLicor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-semibold text-slate-900">Frecuencia de consumo de licor</FormLabel>
                            <Select onValueChange={(value) => {
                              field.onChange(value);
                              form.clearErrors('frecuenciaLicor');
                            }} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccione la frecuencia" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="diario">Diario</SelectItem>
                                <SelectItem value="varias_veces_semana">Varias veces en la semana</SelectItem>
                                <SelectItem value="fines_semana">Fines de semana</SelectItem>
                                <SelectItem value="cada_quince_dias">Cada quince días</SelectItem>
                                <SelectItem value="ocasionalmente">Ocasionalmente</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={form.control}
                      name="consumoCigarrillo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold text-slate-900">34. Consumo de cigarrillo</FormLabel>
                          <FormControl>
                            <RadioGroup onValueChange={(value) => {
                              field.onChange(value);
                              form.clearErrors('consumoCigarrillo');
                              if (value !== 'si') {
                                form.setValue('frecuenciaCigarrillo', '');
                                form.clearErrors('frecuenciaCigarrillo');
                              }
                            }} value={field.value} className="flex gap-6">
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="si" id="consumo-cigarrillo-si" />
                                <label htmlFor="consumo-cigarrillo-si" className="text-base font-normal text-slate-600 cursor-pointer">Sí</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="no" id="consumo-cigarrillo-no" />
                                <label htmlFor="consumo-cigarrillo-no" className="text-base font-normal text-slate-600 cursor-pointer">No</label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {form.watch('consumoCigarrillo') === 'si' && (
                      <FormField
                        control={form.control}
                        name="frecuenciaCigarrillo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-semibold text-slate-900">Frecuencia de consumo de cigarrillo</FormLabel>
                            <Select onValueChange={(value) => {
                              field.onChange(value);
                              form.clearErrors('frecuenciaCigarrillo');
                            }} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccione la frecuencia" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="diario">Diario</SelectItem>
                                <SelectItem value="varias_veces_semana">Varias veces en la semana</SelectItem>
                                <SelectItem value="fines_semana">Fines de semana</SelectItem>
                                <SelectItem value="cada_quince_dias">Cada quince días</SelectItem>
                                <SelectItem value="ocasionalmente">Ocasionalmente</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Sección 4: Condiciones de Salud - Conteste Si, No u Otro */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HeartPulse className="h-5 w-5 text-primary-prosalud" />
                    Condiciones de Salud
                  </CardTitle>
                  <CardDescription>Conteste Si o No para las siguientes preguntas y especifique de ser necesario</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Microcopy sobre confidencialidad */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-blue-800">
                      <strong>Nota importante:</strong> Esta información es confidencial y se usa únicamente para fines de salud ocupacional.
                    </p>
                  </div>
                  
                  {/* Helper function para crear campos Si/No/Otro */}
                  {[
                    { name: 'sobrepesoObesidad', label: '35. ¿Ha tenido o tiene sobrepeso u obesidad?', showOther: false },
                    { name: 'hipertensionArterial', label: '36. ¿Sufre o ha sufrido hipertensión arterial?', showOther: false },
                    { name: 'enfermedadesCorazon', label: '37. ¿Sufre o ha sufrido enfermedades del corazón (arritmias, infartos, soplos, trombosis, derrames, ataques, etc.)?', showOther: false },
                    { name: 'diabetes', label: '38. ¿Sufre o ha sufrido de diabetes?', showOther: false },
                    { name: 'problemasRenales', label: '39. ¿Sufre o ha sufrido de problemas renales (Insuficiencia renal, cálculos, infecciones, diálisis, falta de un riñón)?', showOther: false },
                    { name: 'depresionBipolaridad', label: '40. ¿Sufre o ha sufrido de depresión, bipolaridad, crisis de pánico, esquizofrenia?', showOther: false },
                    { name: 'antecedentesMedicosMentales', label: '41. ¿Ha tenido antecedentes médicos mentales?', showOther: false },
                    { name: 'epilepsiaConvulsiones', label: '42. ¿Ha tenido ataques de epilepsia, pérdida del conocimiento, convulsiones u otros problemas neurológicos?', showOther: false },
                    { name: 'trasplante', label: '43. ¿Ha recibido o requiere algún trasplante?', showOther: false, otherField: 'tipoTrasplante', otherLabel: '44. ¿Cuál trasplante ha recibido o requiere?' },
                    { name: 'cancer', label: '45. ¿Sufre o ha sufrido cáncer?', showOther: false },
                    { name: 'problemasPulmonares', label: '46. ¿Tiene o ha tenido problemas pulmonares (Asma, bronquitis, EPOC, asfixia)?', showOther: false, otherField: 'tipoProblemaPulmonar', otherLabel: '¿Cuál problema pulmonar tiene o ha tenido?' },
                    { name: 'alergias', label: '47. ¿Sufre de alergias (rinitis, sinusitis, en la piel, etc.)?', showOther: false, otherField: 'tipoAlergia', otherLabel: '48. ¿De qué alergia sufre?' },
                    { name: 'tuberculosis', label: '49. ¿Ha tenido tuberculosis o tos con expectoración por más de 15 días en los últimos meses?', showOther: false },
                    { name: 'problemasVisuales', label: '50. ¿Sufre de problemas visuales?', showOther: false, otherField: 'tipoProblemaVisual', otherLabel: '51. ¿Cuál problema visual sufre?' },
                    { name: 'doloresArticulares', label: '52. ¿Sufre de dolores articulares?', showOther: false, otherField: 'tipoDolorArticular', otherLabel: '53. ¿Cuál dolor articular sufre?' },
                    { name: 'problemasSangre', label: '54. ¿Sufre o ha sufrido de problemas en la sangre (plaquetas, coagulación, etc.)?', showOther: false },
                    { name: 'otraEnfermedad', label: '55. ¿Sufre de alguna enfermedad que no se haya mencionado anteriormente?', showOther: false, otherField: 'tipoOtraEnfermedad', otherLabel: 'Especifique la enfermedad' },
                    { name: 'protesisArticular', label: '56. ¿Requiere de alguna prótesis articular o cirugías de rodilla, cadera, etc.?', showOther: false },
                    { name: 'medicamentoPermanente', label: '57. ¿Consume algún medicamento de forma permanente o crónica?', showOther: false, otherField: 'tipoMedicamento', otherLabel: '58. ¿Cuál medicamento debe consumir de forma permanente o crónica?' },
                    { name: 'tratamientoMedico', label: '59. ¿Está o ha estado en algún tratamiento médico importante en los últimos 4 meses?', showOther: false },
                    { name: 'cirugias', label: '60. ¿Tiene cirugías?', showOther: false, otherField: 'tipoCirugia', otherLabel: '61. ¿Cuál cirugía tiene?', additionalField: 'tiempoCirugia', additionalLabel: '62. ¿Hace cuánto se realizó esa cirugía?' },
                    { name: 'accidenteLaboral', label: '63. ¿Ha tenido algún accidente laboral?', showOther: false, otherField: 'tipoAccidenteLaboral', otherLabel: '64. ¿Qué accidente laboral ha tenido?', additionalField: 'tiempoAccidenteLaboral', additionalLabel: '65. ¿Hace cuánto tuvo el accidente laboral?' },
                    { name: 'accidenteTransitoCasero', label: '66. ¿Ha tenido algún tipo de accidente de tránsito o casero?', showOther: false, otherField: 'tipoAccidenteTransito', otherLabel: '67. ¿Cuál fue el accidente de tránsito o casero?', additionalField: 'tiempoAccidenteTransito', additionalLabel: '68. ¿Hace cuánto tuvo el accidente de tránsito?' },
                    { name: 'vacunadoCovid', label: '69. ¿Se encuentra vacunado contra el COVID-19?', showOther: false },
                  ].map((question, idx) => {
                    return (
                    <div key={question.name} className="space-y-3">
                      <FormField
                        control={form.control}
                        name={question.name as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-semibold text-slate-900">{question.label}</FormLabel>
                            <FormControl>
                              <RadioGroup onValueChange={(value) => {
                                field.onChange(value);
                                form.clearErrors(question.name as any);
                              }} value={field.value} className="flex gap-6">
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="si" id={`${question.name}-si`} />
                                  <label htmlFor={`${question.name}-si`} className="text-base font-normal text-slate-600 cursor-pointer">Sí</label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="no" id={`${question.name}-no`} />
                                  <label htmlFor={`${question.name}-no`} className="text-base font-normal text-slate-600 cursor-pointer">No</label>
                                </div>
                                {question.showOther && (
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="otro" id={`${question.name}-otro`} />
                                    <label htmlFor={`${question.name}-otro`} className="text-base font-normal text-slate-600 cursor-pointer">Otro</label>
                                  </div>
                                )}
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {form.watch(question.name as any) === 'si' && question.otherField && (
                        <FormField
                          control={form.control}
                          name={question.otherField as any}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-base font-semibold text-slate-900">{question.otherLabel}</FormLabel>
                              <FormControl>
                                <Textarea {...field} placeholder="Especifique..." />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      {question.additionalField && form.watch(question.name as any) === 'si' && (
                        <FormField
                          control={form.control}
                          name={question.additionalField as any}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-base font-semibold text-slate-900">{question.additionalLabel}</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Especifique tiempo..." />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                  );
                  })}

                </CardContent>
              </Card>
                </>
              )}

              {/* Paso 4: Limitaciones Físicas y Recomendaciones Laborales */}
              {currentStep === 4 && (
                <>
              {/* Sección 5: Limitaciones Físicas */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary-prosalud" />
                    Limitaciones Físicas
                  </CardTitle>
                  <CardDescription>Responda las siguientes preguntas con: Si, me limita mucho. Si, me limita un poco. No, no me limita nada.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {[
                    { name: 'esfuerzosIntensos', label: '70. Esfuerzos intensos, tales como correr, levantar objetos pesados, o participar en deportes agotadores.' },
                    { name: 'esfuerzosModerados', label: '71. Esfuerzos moderados, como mover una mesa, pasar la aspiradora, jugar a los bolos o caminar más de 1 hora.' },
                    { name: 'subirPisos', label: '72. Subir varios pisos por la escalera.' },
                    { name: 'agacharseArrodillarse', label: '73. Agacharse o arrodillarse.' },
                  ].map((question) => {
                    return (
                    <div key={question.name} className="space-y-3">
                      <FormField
                        control={form.control}
                        name={question.name as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-semibold text-slate-900">{question.label}</FormLabel>
                            <FormControl>
                              <RadioGroup onValueChange={(value) => {
                                field.onChange(value);
                                form.clearErrors(question.name as any);
                              }} value={field.value} className="flex flex-col gap-2">
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="limita_mucho" id={`${question.name}-mucho`} />
                                  <label htmlFor={`${question.name}-mucho`} className="text-base font-normal text-slate-600 cursor-pointer">Sí, me limita mucho</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="limita_poco" id={`${question.name}-poco`} />
                                <label htmlFor={`${question.name}-poco`} className="text-base font-normal text-slate-600 cursor-pointer">Sí, me limita un poco</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="no_limita" id={`${question.name}-no`} />
                                <label htmlFor={`${question.name}-no`} className="text-base font-normal text-slate-600 cursor-pointer">No, no me limita nada</label>
                                </div>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  );
                  })}
                </CardContent>
              </Card>

              {/* Sección 6: Recomendaciones Laborales */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardCheck className="h-5 w-5 text-primary-prosalud" />
                    Recomendaciones Laborales
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="recomendacionRestriccionLaboral"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold text-slate-900">74. ¿Tiene usted alguna recomendación o restricción laboral emitida por un médico o especialista?</FormLabel>
                        <FormControl>
                          <RadioGroup onValueChange={(value) => {
                            field.onChange(value);
                            form.clearErrors('recomendacionRestriccionLaboral');
                          }} value={field.value} className="flex gap-6">
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="si" id="recomendacion-si" />
                              <label htmlFor="recomendacion-si" className="text-base font-normal text-slate-600 cursor-pointer">Sí</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="no" id="recomendacion-no" />
                              <label htmlFor="recomendacion-no" className="text-base font-normal text-slate-600 cursor-pointer">No</label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {form.watch('recomendacionRestriccionLaboral') === 'si' && (
                    <FormField
                      control={form.control}
                      name="detalleRecomendacionLaboral"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold text-slate-900">Especifique la recomendación o restricción laboral:</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Describa la recomendación o restricción..." rows={4} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </CardContent>
              </Card>
                </>
              )}

              {/* Paso 5: Autorización y Firma Digital */}
              {currentStep === 5 && (
                <>
              {/* Sección 7: Autorización y Firma */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileSignature className="h-5 w-5 text-primary-prosalud" />
                    Autorización y Firma Digital
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="rounded-lg border border-primary-prosalud/40 bg-primary-prosalud/5 p-4 text-sm text-slate-700">
                    <p className="mb-2">
                      De acuerdo a la ley 1581 de 2012, que aplica para el tratamiento de datos personales, con el diligenciamiento de esta encuesta, usted autoriza a la empresa, al acceso de esta información personal para efectos del área de Recursos Humanos y SST.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="numeroDocumentoFirma"
                      render={({ field }) => {
                        const tipoDocumento = form.watch('tipoDocumento');
                        const tipoDocumentoLabel = getTipoDocumentoDisplayName(tipoDocumento);
                        // Asegurar que el campo tenga valor (usar numeroDocumento si numeroDocumentoFirma está vacío)
                        const displayValue = field.value || form.watch('numeroDocumento') || '';
                        return (
                          <FormItem>
                            <FormLabel className="text-base font-semibold text-slate-900">Número de documento {tipoDocumentoLabel ? `(${tipoDocumentoLabel})` : ''}</FormLabel>
                            <FormControl>
                              <Input {...field} value={displayValue} readOnly className="bg-slate-100" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />

                    <div className="space-y-3">
                      <FormLabel className="text-base font-semibold text-slate-900">Firma digital</FormLabel>
                      <FormDescription>Por favor, firme en el recuadro de abajo para autorizar la encuesta</FormDescription>
                      <SignaturePad
                        ref={signaturePadRef}
                        onChange={handleSignatureChange}
                        height={200}
                      />
                      <FormField
                        control={form.control}
                        name="firma"
                        render={() => (
                          <FormItem>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
                </>
              )}

              {/* Botones de navegación */}
              <div className="flex gap-4 justify-between pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => navigate('/')}>
                  Cancelar
                </Button>
                <div className="flex gap-4">
                  {currentStep > 1 && (
                    <Button type="button" variant="outline" onClick={handlePrevious}>
                      ← Anterior
                    </Button>
                  )}
                  {currentStep < TOTAL_STEPS ? (
                    <Button type="button" onClick={handleNext} className="bg-primary-prosalud">
                      Siguiente →
                    </Button>
                  ) : (
                    <Button 
                      type="submit" 
                      disabled={isSubmitting} 
                      className="bg-primary-prosalud"
                    >
                      {isSubmitting ? 'Enviando...' : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Enviar Encuesta
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
              
              {/* reCAPTCHA invisible */}
              <InvisibleRecaptcha
                ref={recaptchaRef}
                siteKey={RECAPTCHA_CONFIG.SITE_KEY}
                onVerify={() => {}}
                onError={() => {
                  logger.warn('Error en reCAPTCHA');
                }}
                onExpire={() => {
                  logger.warn('Token de reCAPTCHA expirado');
                }}
              />
            </form>
          </Form>
        </div>
      </div>
    </MainLayout>
  );
};

const EncuestaBienestarPage: React.FC = () => {
  // Verificar modo de configuración antes de renderizar
  const { data: config, isLoading } = useQuery({
    queryKey: ['survey-config-public'],
    queryFn: () => surveyConfigApi.getPublicConfig(),
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  const isBulkEntryMode = config?.data?.allow_bulk_entry_mode ?? false;

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-prosalud mx-auto mb-4"></div>
              <p className="text-slate-600">Cargando configuración...</p>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Si está en modo ingreso masivo, no requiere autenticación
  if (isBulkEntryMode) {
    return <EncuestaBienestarPageContent isBulkEntryMode={isBulkEntryMode} />;
  }

  // Si está en modo afiliados activos, requiere autenticación
  return (
    <RequireAfiliadoDataUpdateAuth>
      <EncuestaBienestarPageContent isBulkEntryMode={isBulkEntryMode} />
    </RequireAfiliadoDataUpdateAuth>
  );
};

export default EncuestaBienestarPage;

