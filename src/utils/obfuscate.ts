/**
 * Ofusca un valor mostrando solo los primeros y últimos caracteres
 * Útil para mostrar información sensible sin revelarla completamente
 */

/**
 * Detecta si un valor ya está ofuscado (contiene caracteres de ofuscación)
 */
export function isObfuscated(value: string | null | undefined): boolean {
  if (!value || value.trim() === '') {
    return false;
  }
  // Si contiene caracteres de ofuscación (asteriscos), asumimos que ya está ofuscado
  return /\*{2,}/.test(value);
}

export function obfuscateValue(value: string | null | undefined, type: 'address' | 'phone' | 'email' | 'account' = 'address'): string {
  if (!value || value.trim() === '') {
    return '';
  }

  const trimmed = value.trim();

  // Si ya está ofuscado, no volver a ofuscar
  if (isObfuscated(trimmed)) {
    return trimmed;
  }

  switch (type) {
    case 'address':
      // Para direcciones: mostrar más información para que sea reconocible
      // Para direcciones cortas (menos de 20 caracteres): mostrar primeros 5 y últimos 5
      // Para direcciones medianas (20-40 caracteres): mostrar primeros 8 y últimos 8
      // Para direcciones largas (más de 40 caracteres): mostrar primeros 12 y últimos 12
      if (trimmed.length <= 10) {
        // Si es muy corta, mostrar casi toda
        const visibleChars = Math.max(2, Math.floor(trimmed.length * 0.6));
        const start = Math.floor(visibleChars / 2);
        const end = trimmed.length - Math.ceil(visibleChars / 2);
        if (end <= start) {
          return trimmed; // Si es muy corta, no ofuscar
        }
        return `${trimmed.substring(0, start)}${'*'.repeat(end - start)}${trimmed.substring(end)}`;
      } else if (trimmed.length <= 20) {
        // Direcciones cortas: primeros 5 y últimos 5
        return `${trimmed.substring(0, 5)}${'*'.repeat(trimmed.length - 10)}${trimmed.substring(trimmed.length - 5)}`;
      } else if (trimmed.length <= 40) {
        // Direcciones medianas: primeros 8 y últimos 8
        return `${trimmed.substring(0, 8)}${'*'.repeat(trimmed.length - 16)}${trimmed.substring(trimmed.length - 8)}`;
      } else {
        // Direcciones largas: primeros 12 y últimos 12
        return `${trimmed.substring(0, 12)}${'*'.repeat(trimmed.length - 24)}${trimmed.substring(trimmed.length - 12)}`;
      }

    case 'phone':
      // Para teléfonos: mostrar primeros 3 dígitos y últimos 3
      const digits = trimmed.replace(/\D/g, '');
      if (digits.length <= 6) {
        return '*'.repeat(digits.length);
      }
      return `${digits.substring(0, 3)}${'*'.repeat(Math.min(digits.length - 6, 4))}${digits.substring(digits.length - 3)}`;

    case 'email':
      // Para emails: mostrar primeras 2 letras y últimas 2 letras antes del @
      const [username, domain] = trimmed.split('@');
      if (!domain) {
        // Si no tiene @, tratar como texto normal
        if (trimmed.length <= 4) {
          return '*'.repeat(trimmed.length);
        }
        return `${trimmed.substring(0, 2)}${'*'.repeat(Math.min(trimmed.length - 4, 8))}${trimmed.substring(trimmed.length - 2)}`;
      }
      if (username.length <= 4) {
        // Si el username es muy corto, mostrar todo
        return `${username}@${domain}`;
      }
      // Mostrar primeras 2 letras y últimas 2 letras del username
      return `${username.substring(0, 2)}${'*'.repeat(Math.min(username.length - 4, 6))}${username.substring(username.length - 2)}@${domain}`;

    case 'account':
      // Para números de cuenta: mostrar primeros 2 dígitos y últimos 4
      const accountDigits = trimmed.replace(/\D/g, '');
      if (accountDigits.length <= 6) {
        return '*'.repeat(accountDigits.length);
      }
      return `${accountDigits.substring(0, 2)}${'*'.repeat(Math.min(accountDigits.length - 6, 6))}${accountDigits.substring(accountDigits.length - 4)}`;

    default:
      // Por defecto, ofuscar como dirección
      if (trimmed.length <= 10) {
        const visibleChars = Math.max(2, Math.floor(trimmed.length * 0.6));
        const start = Math.floor(visibleChars / 2);
        const end = trimmed.length - Math.ceil(visibleChars / 2);
        if (end <= start) {
          return trimmed;
        }
        return `${trimmed.substring(0, start)}${'*'.repeat(end - start)}${trimmed.substring(end)}`;
      } else if (trimmed.length <= 20) {
        return `${trimmed.substring(0, 5)}${'*'.repeat(trimmed.length - 10)}${trimmed.substring(trimmed.length - 5)}`;
      } else if (trimmed.length <= 40) {
        return `${trimmed.substring(0, 8)}${'*'.repeat(trimmed.length - 16)}${trimmed.substring(trimmed.length - 8)}`;
      } else {
        return `${trimmed.substring(0, 12)}${'*'.repeat(trimmed.length - 24)}${trimmed.substring(trimmed.length - 12)}`;
      }
  }
}

/**
 * Ofusca un email
 */
export function obfuscateEmail(value: string | null | undefined): string {
  return obfuscateValue(value, 'email');
}

/**
 * Ofusca un teléfono
 */
export function obfuscatePhone(value: string | null | undefined): string {
  return obfuscateValue(value, 'phone');
}
