import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearAffiliatePrefill, consumeAffiliatePrefill, stashAffiliatePrefill } from '../affiliatePrefill';

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
});

describe('affiliatePrefill', () => {
  it('devuelve los datos guardados y permite releerlos hasta limpiar', () => {
    stashAffiliatePrefill({ tipoDocumento: 'CC', numeroDocumento: '123' });
    expect(consumeAffiliatePrefill()).toEqual({ tipoDocumento: 'CC', numeroDocumento: '123' });
    expect(consumeAffiliatePrefill()).toBeDefined();
    clearAffiliatePrefill();
    expect(consumeAffiliatePrefill()).toBeUndefined();
  });

  it('caduca a los 2 minutos', () => {
    vi.useFakeTimers();
    stashAffiliatePrefill({ numeroDocumento: '123' });
    vi.advanceTimersByTime(2 * 60 * 1000 + 1);
    expect(consumeAffiliatePrefill()).toBeUndefined();
  });

  it('no guarda datos vacíos', () => {
    stashAffiliatePrefill({});
    stashAffiliatePrefill(undefined);
    expect(consumeAffiliatePrefill()).toBeUndefined();
  });
});
