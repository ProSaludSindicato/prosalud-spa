/**
 * Formatea una hora en formato 24h a 12h con AM/PM
 * Ej: "14:30" -> "2:30 PM", "09:15" -> "9:15 AM"
 */
export const formatTime12Hour = (timeString: string): string => {
  if (!timeString) return 'N/A';
  
  try {
    // Si está en formato HH:MM
    if (timeString.includes(':')) {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours, 10);
      const minute = parseInt(minutes, 10);
      
      if (isNaN(hour) || isNaN(minute)) return timeString;
      
      // Convertir a formato 12h
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      
      return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
    }
    
    // Para otros formatos, retornar tal cual
    return timeString;
  } catch (error) {
    console.warn('Error formatting time:', timeString, error);
    return timeString;
  }
};

/**
 * Utilidades para formatear fechas consistentemente sin problemas de timezone
 */

/**
 * Parsea una cadena YYYY-MM-DD (o ISO con parte de fecha) como fecha local.
 * Evita el desfase de un día que produce new Date("YYYY-MM-DD") al interpretar medianoche UTC.
 */
export function parseLocalDate(dateString: string | null | undefined): Date {
  if (dateString == null || dateString === '') return new Date(NaN);
  const dateOnly = String(dateString).split('T')[0].trim();
  const parts = dateOnly.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => isNaN(n))) return new Date(dateString);
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

/**
 * Formatea una fecha en formato "dd MMM yyyy" (ej: "18 feb 2026")
 * Evita problemas de timezone parseando la fecha manualmente
 */
export const formatDateReadable = (dateString: string): string => {
  if (!dateString) return 'N/A';
  
  try {
    // Si está en formato YYYY-MM-DD, parsear manualmente
    if (dateString.includes('-')) {
      const parts = dateString.split('-');
      if (parts.length === 3) {
        const [year, month, day] = parts;
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        
        // Formatear en español: "dd MMM yyyy"
        const options: Intl.DateTimeFormatOptions = {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        };
        
        return date.toLocaleDateString('es-ES', options);
      }
    }
    
    // Para otros formatos, intentar con Date pero en UTC
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      const options: Intl.DateTimeFormatOptions = {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      };
      
      return date.toLocaleDateString('es-ES', options);
    }
  } catch (error) {
    console.warn('Error formatting date:', dateString, error);
  }
  
  return dateString;
};

/**
 * Formatea una fecha en formato completo "dd de MMMM de yyyy" (ej: "18 de febrero de 2026")
 */
export const formatDateFull = (dateString: string): string => {
  if (!dateString) return 'N/A';
  
  try {
    // Si está en formato YYYY-MM-DD, parsear manualmente
    if (dateString.includes('-')) {
      const parts = dateString.split('-');
      if (parts.length === 3) {
        const [year, month, day] = parts;
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        
        // Formatear en español completo
        const options: Intl.DateTimeFormatOptions = {
          day: '2-digit',
          month: 'long',
          year: 'numeric'
        };
        
        return date.toLocaleDateString('es-ES', options);
      }
    }
    
    // Para otros formatos, intentar con Date pero en UTC
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      const options: Intl.DateTimeFormatOptions = {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      };
      
      return date.toLocaleDateString('es-ES', options);
    }
  } catch (error) {
    console.warn('Error formatting date:', dateString, error);
  }
  
  return dateString;
};

/**
 * Formatea una fecha en formato corto "dd/MM/yyyy" sin problemas de timezone
 */
export const formatDateShort = (dateString: string): string => {
  if (!dateString) return 'N/A';
  
  try {
    // Si está en formato YYYY-MM-DD, parsear manualmente
    if (dateString.includes('-')) {
      const parts = dateString.split('-');
      if (parts.length === 3) {
        const [year, month, day] = parts;
        // Remover ceros a la izquierda del día y mes para formato colombiano
        const dayNum = parseInt(day, 10);
        const monthNum = parseInt(month, 10);
        return `${dayNum}/${monthNum}/${year}`;
      }
    }
    
    // Para otros formatos, intentar con Date pero en UTC
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      const day = date.getDate();
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    }
  } catch (error) {
    console.warn('Error formatting date:', dateString, error);
  }
  
  return dateString;
};
