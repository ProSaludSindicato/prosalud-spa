import axios from "axios";
import { API_CONFIG } from "../config/api";
import {
  isExplicitCorsError,
  isNetworkErrorWithoutResponse,
} from "@/utils/errorSanitizer";

// API client for public endpoints (no authentication required)
const publicApi = axios.create({
  baseURL: API_CONFIG.PUBLIC_BASE_URL,
  withCredentials: false,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Suppress console errors in production for network failures
publicApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (isNetworkErrorWithoutResponse(error)) {
      (error as { isSuspectedCors?: boolean }).isSuspectedCors = isExplicitCorsError(error);
      return Promise.reject(error);
    }

    // In production, silently handle network errors to prevent console logs
    if (import.meta.env.PROD && error.code === "ERR_NETWORK") {
      return Promise.reject(error);
    }
    return Promise.reject(error);
  },
);

export default publicApi;
