import axios from "axios";

// API client for public endpoints (no authentication required)
const publicApi = axios.create({
  baseURL: "https://prosalud.test",
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Suppress console errors in production for network failures
publicApi.interceptors.response.use(
  response => response,
  error => {
    // In production, silently handle network errors to prevent console logs
    if (import.meta.env.PROD && error.code === 'ERR_NETWORK') {
      return Promise.reject(error);
    }
    return Promise.reject(error);
  }
);

export default publicApi;