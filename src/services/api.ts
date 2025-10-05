import axios from "axios";

const api = axios.create({
  baseURL: "https://prosalud.test",
  withCredentials: true,
});

api.defaults.xsrfCookieName = "XSRF-TOKEN";
api.defaults.xsrfHeaderName = "X-XSRF-TOKEN";

// Suppress console errors in production for network failures
api.interceptors.response.use(
  response => response,
  error => {
    // In production, silently handle network errors to prevent console logs
    if (import.meta.env.PROD && error.code === 'ERR_NETWORK') {
      return Promise.reject(error);
    }
    return Promise.reject(error);
  }
);

export default api;
