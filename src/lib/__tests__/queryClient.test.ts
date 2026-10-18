import { describe, expect, it } from 'vitest';
import { AxiosError } from 'axios';
import { shouldRetryQuery } from '@/lib/queryClient';

function axiosErrorWithStatus(status: number): AxiosError {
  const error = new AxiosError('failed');
  error.response = { status, statusText: '', headers: {}, data: {}, config: {} as never };
  return error;
}

describe('shouldRetryQuery', () => {
  it.each([400, 401, 403, 404, 409, 422])('does not retry on %i', (status) => {
    expect(shouldRetryQuery(0, axiosErrorWithStatus(status))).toBe(false);
  });

  it('retries server errors up to twice', () => {
    expect(shouldRetryQuery(0, axiosErrorWithStatus(500))).toBe(true);
    expect(shouldRetryQuery(1, axiosErrorWithStatus(503))).toBe(true);
    expect(shouldRetryQuery(2, axiosErrorWithStatus(500))).toBe(false);
  });

  it('retries network errors without response', () => {
    expect(shouldRetryQuery(0, new AxiosError('Network Error'))).toBe(true);
  });
});
