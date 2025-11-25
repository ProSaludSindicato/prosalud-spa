
export const getInitials = (firstName: string, lastName: string): string => {
  const first = firstName?.trim().charAt(0).toUpperCase() || '';
  const last = lastName?.trim().charAt(0).toUpperCase() || '';
  
  // Si solo hay una palabra (sin apellido), mostrar solo 1 letra
  if (!last) {
    return first;
  }
  
  // Si hay dos palabras, mostrar 2 letras máximo
  return `${first}${last}`;
};

/**
 * Obtiene las iniciales de un nombre completo (1 o 2 letras máximo)
 * Si el nombre tiene una sola palabra, muestra 1 letra
 * Si tiene dos o más palabras, muestra las primeras letras de las dos primeras palabras
 */
export const getInitialsFromName = (fullName: string): string => {
  if (!fullName || !fullName.trim()) {
    return '';
  }
  
  const words = fullName.trim().split(/\s+/).filter(word => word.length > 0);
  
  // Si solo hay una palabra, mostrar solo 1 letra
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }
  
  // Si hay dos o más palabras, mostrar las primeras letras de las dos primeras palabras
  return `${words[0].charAt(0).toUpperCase()}${words[1].charAt(0).toUpperCase()}`;
};

export const getInitialsFromEmail = (email: string): string => {
  if (!email || !email.trim()) {
    return '';
  }
  
  const parts = email.split('@')[0].split('.');
  
  // Si hay al menos dos partes separadas por punto, usar las primeras letras de cada una
  if (parts.length >= 2) {
    const first = parts[0].charAt(0).toUpperCase() || '';
    const second = parts[1].charAt(0).toUpperCase() || '';
    return `${first}${second}`;
  }
  
  // Si solo hay una parte, mostrar máximo 2 letras
  const firstPart = parts[0] || '';
  if (firstPart.length >= 2) {
    return `${firstPart.charAt(0).toUpperCase()}${firstPart.charAt(1).toUpperCase()}`;
  }
  
  // Si solo hay una letra, mostrar solo esa
  return firstPart.charAt(0).toUpperCase();
};
