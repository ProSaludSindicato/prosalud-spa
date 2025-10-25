# API Configuration

Este directorio contiene la configuración centralizada para las APIs del proyecto ProSalud.

## Configuración Centralizada

### Variables de Entorno

El sistema soporta las siguientes variables de entorno para configurar las URLs base:

- `VITE_PUBLIC_API_BASE_URL`: URL base para el sitio web público
- `VITE_ADMIN_API_BASE_URL`: URL base para el panel de administración
- `VITE_API_BASE_URL`: URL base general (fallback para ambas)

### Uso

```typescript
import { API_CONFIG, buildPublicApiUrl, buildAdminApiUrl } from '@/config/api';

// URLs base
console.log(API_CONFIG.PUBLIC_BASE_URL);  // URL para sitio público
console.log(API_CONFIG.ADMIN_BASE_URL);   // URL para panel admin

// Construir URLs completas
const publicUrl = buildPublicApiUrl('/api/events');
const adminUrl = buildAdminApiUrl('/api/users');
```

### Configuración por Entorno

#### Desarrollo Local
```bash
VITE_PUBLIC_API_BASE_URL=http://localhost:8000
VITE_ADMIN_API_BASE_URL=http://localhost:8000
```

#### Producción
```bash
VITE_PUBLIC_API_BASE_URL=https://api.prosalud.com
VITE_ADMIN_API_BASE_URL=https://admin-api.prosalud.com
```

#### Separación de Servicios
```bash
# Sitio público y admin en servidores diferentes
VITE_PUBLIC_API_BASE_URL=https://public-api.prosalud.com
VITE_ADMIN_API_BASE_URL=https://admin-api.prosalud.com
```

## Servicios Actualizados

Los siguientes servicios han sido actualizados para usar la configuración centralizada:

- `src/services/api.ts` - Usa `API_CONFIG.PUBLIC_BASE_URL`
- `src/services/publicApi.ts` - Usa `API_CONFIG.PUBLIC_BASE_URL`
- `src/services/realUsersApi.ts` - Usa `API_CONFIG.ADMIN_BASE_URL`
- `src/services/rolesApi.ts` - Usa `API_CONFIG.ADMIN_BASE_URL`
- `src/services/requestsApi.ts` - Usa `API_CONFIG.ADMIN_BASE_URL`
- `src/services/comfenalcoEventsApi.ts` - Ya usa `buildApiUrl`

## Beneficios

1. **Centralización**: Una sola fuente de verdad para las URLs
2. **Flexibilidad**: Fácil cambio de entornos
3. **Separación**: URLs independientes para público y admin
4. **Mantenibilidad**: Cambios en un solo lugar
5. **Escalabilidad**: Preparado para separar servicios en el futuro

## Migración

Si necesitas agregar un nuevo servicio:

```typescript
// ❌ Antes
const api_ = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "https://prosalud.laravel.cloud",
});

// ✅ Después
import { API_CONFIG } from '../config/api';

const api = axios.create({
  baseURL: API_CONFIG.PUBLIC_BASE_URL, // o ADMIN_BASE_URL según el caso
});
```
