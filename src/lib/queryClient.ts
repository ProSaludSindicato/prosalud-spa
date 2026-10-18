import { QueryClient } from '@tanstack/react-query';
import axios from 'axios';

const NON_RETRYABLE_STATUSES = [400, 401, 403, 404, 409, 422];

export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (axios.isAxiosError(error) && error.response && NON_RETRYABLE_STATUSES.includes(error.response.status)) {
    return false;
  }
  return failureCount < 2;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
      retry: shouldRetryQuery,
    },
  },
});
