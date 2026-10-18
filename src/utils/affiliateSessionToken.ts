const TOKEN_KEY = 'prosalud_affiliate_session_token';

export function setAffiliateSessionToken(token: string | undefined | null): void {
  try {
    if (token) {
      sessionStorage.setItem(TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    /* sessionStorage no disponible */
  }
}

export function getAffiliateSessionToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function clearAffiliateSessionToken(): void {
  setAffiliateSessionToken(null);
}
