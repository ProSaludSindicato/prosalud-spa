# ProSalud — SPA

Frontend del portal ProSalud: afiliados, administración, asambleas y flujos públicos. Está construido con **Vite**, **React 18**, **TypeScript** y **Tailwind CSS v4** (shadcn/ui).

## Requisitos

- **Node.js** (se recomienda instalar con [nvm](https://github.com/nvm-sh/nvm))
- **npm**

La API corre en el repositorio backend **prosalud** (Laravel). En local, alinea las URLs de `VITE_*_API_BASE_URL` con el dominio o puerto donde sirves esa API.

## Puesta en marcha

```sh
git clone <url-del-repositorio>
cd prosalud-spa
npm install
cp .env.example .env
# Edita .env con tus URLs y claves (ver tabla inferior).
npm run dev
```

La app de desarrollo suele quedar en `http://localhost:5173` (Vite lo indica en consola).

### Scripts útiles

| Comando        | Descripción                          |
|----------------|--------------------------------------|
| `npm run dev`  | Servidor de desarrollo con HMR      |
| `npm run build`| Build de producción                  |
| `npm run preview` | Sirve el build localmente       |
| `npm run lint` | ESLint                               |

## Variables de entorno (`VITE_*`)

Vite solo expone al cliente las variables cuyo nombre empieza por `VITE_`. Después de cambiar `.env`, reinicia `npm run dev`.

| Variable | Obligatoria | Descripción |
|----------|-------------|-------------|
| `VITE_API_BASE_URL` | Sí | URL base de la API Laravel (autenticación y rutas generales). |
| `VITE_PUBLIC_API_BASE_URL` | No | API para el sitio público; por defecto usa `VITE_API_BASE_URL`. |
| `VITE_ADMIN_API_BASE_URL` | No | API para el panel admin; por defecto usa `VITE_API_BASE_URL`. |
| `VITE_RECAPTCHA_SITE_KEY` | Sí (la app falla al arrancar sin ella) | Clave pública reCAPTCHA; debe coincidir con la del backend. |
| `VITE_PUBLIC_SITE_URL` | No | Origen público del SPA (sin `/` final) para enlaces y QR cuando el front no coincide con `window.location` (otro dominio o build estático). |
| `VITE_APP_ENABLE_DEBUG_LOGS` | No | `true` para logs de depuración en consola. |
| `VITE_SUPABASE_URL` | Si usas chatbot/Supabase | URL del proyecto Supabase. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Si usas chatbot | Clave anónima/publicable de Supabase. |
| `VITE_SUPABASE_PROJECT_ID` | Opcional | Identificador del proyecto (herramientas/Lovable). |
| `VITE_GA_MEASUREMENT_ID` | No | ID de medición de Google Analytics (p. ej. `G-XXXXXXXX`). |
| `VITE_REVERB_APP_KEY` | No | Clave de la app Reverb (mismo valor que `REVERB_APP_KEY` en Laravel). |
| `VITE_REVERB_HOST` | No | Host del websocket (p. ej. dominio donde expone Reverb). |
| `VITE_REVERB_PORT` | No | Puerto TLS del websocket (típ. `443` en producción). |
| `VITE_REVERB_SCHEME` | No | `https` o `http`. |

Sin Reverb configurado, las pantallas que dependen de tiempo real pueden limitarse a **polling** o no recibir eventos instantáneos.

## Documentación adicional

- Detalle de URLs de API: `src/config/README.md`
- Integración de autenticación: `AUTH_INTEGRATION_GUIDE.md`

## Despliegue

Genera el build con `npm run build` y sirve el contenido de `dist/` con tu CDN, bucket estático o reverse proxy hacia la API Laravel. Asegúrate de definir las mismas `VITE_*` en el entorno de build (CI/CD o hosting) que en producción.
