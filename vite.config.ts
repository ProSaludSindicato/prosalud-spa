import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import fs from "fs";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Configuración HTTPS para desarrollo
  // Rutas por variable de entorno (DEV_HTTPS_KEY / DEV_HTTPS_CERT) para mantener los certificados fuera del repo.
  // Si no existen los archivos, el servidor de desarrollo arranca sin HTTPS.
  const keyPath = process.env.DEV_HTTPS_KEY || './192.168.1.60-key.pem';
  const certPath = process.env.DEV_HTTPS_CERT || './192.168.1.60.pem';
  const httpsConfig = mode === 'development' && fs.existsSync(keyPath) && fs.existsSync(certPath) ? {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
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