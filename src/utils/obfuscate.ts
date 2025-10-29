/**
 * Ofusca un correo electrónico mostrando solo los primeros caracteres
 * Ejemplo: ejemplo@correo.com -> e***o@correo.com
 */
export const obfuscateEmail = (email: string | null | undefined): string => {
  if (!email) return '';
  
  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) return email;
  
  if (localPart.length <= 2) {
    return `${localPart[0]}***@${domain}`;
  }
  
  const firstChar = localPart[0];
  const lastChar = localPart[localPart.length - 1];
  return `${firstChar}***${lastChar}@${domain}`;
};

/**
 * Ofusca un número de celular mostrando solo los últimos 4 dígitos
 * Ejemplo: 3195245170 -> ******5170
 */
export const obfuscatePhone = (phone: string | null | undefined): string => {
  if (!phone) return '';
  
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 4) return phone;
  
  const lastFour = digits.slice(-4);
  return `${'*'.repeat(digits.length - 4)}${lastFour}`;
};
