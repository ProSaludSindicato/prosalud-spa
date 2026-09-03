import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import fs from "fs";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Configuración HTTPS para desarrollo
  const httpsConfig = mode === 'development' ? {
    key: fs.readFileSync('./192.168.1.60-key.pem'),
    cert: fs.readFileSync('./192.168.1.60.pem'),
  } : undefined;

  return {
    server: {
      host: "::",
      port: 8080,
      https: httpsConfig,
      headers: {
        // SAMEORIGIN permite incrustar PDFs propios (p. ej. política de datos) sin abrir a sitios externos.
        'X-Frame-Options': 'SAMEORIGIN',
        'X-Content-Type-Options': 'nosniff',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      },
    },
    plugins: [
      react(),
      mode === 'development' &&
      componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      sourcemap: false,
    },
  };
});