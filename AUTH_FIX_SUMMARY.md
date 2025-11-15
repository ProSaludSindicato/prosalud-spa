# 🔧 Corrección de Autenticación - Token Bearer

## 🐛 Problema Identificado

El frontend no estaba enviando el header `Authorization: Bearer <token>` en las peticiones HTTP a los endpoints protegidos del backend.

### Causa Raíz

Los servicios existentes estaban creando sus propias instancias de axios sin incluir el token Bearer:

```typescript
// ❌ ANTES - Sin token
const myApi = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json"
  }
});
```

## ✅ Solución Implementada

Se ha actualizado **TODOS** los servicios de administración para usar la instancia `authenticatedApi` que incluye automáticamente el token Bearer en cada petición.

### Archivos Modificados

#### 1. **`src/services/api.ts`**
- ✅ Ya tenía `authenticatedApi` con interceptor de token Bearer
- ✅ El interceptor agrega automáticamente: `Authorization: Bearer <token>`

#### 2. **`src/services/requestsApi.ts`**
```typescript
// ✅ DESPUÉS - Con token automático
import { authenticatedApi } from "./api";
const requestsApi = authenticatedApi;
```

#### 3. **`src/services/inventoryApiService.ts`**
```typescript
// ✅ DESPUÉS
import { authenticatedApi as api } from './api';
```

#### 4. **`src/services/wellnessEventsApi.ts`**
```typescript
// ✅ DESPUÉS
import { authenticatedApi as api } from './api';
```

#### 5. **`src/services/rolesApi.ts`**
```typescript
// ✅ DESPUÉS
import { authenticatedApi } from "./api";
const rolesApi = authenticatedApi;
```

#### 6. **`src/services/realUsersApi.ts`**
```typescript
// ✅ DESPUÉS
import { authenticatedApi } from "./api";
const backendApi = authenticatedApi;
```

#### 7. **`src/services/wellnessRequestsApi.ts`**
```typescript
// ✅ DESPUÉS
import { authenticatedApi } from './api';
const wellnessRequestsApi = authenticatedApi;
```

#### 8. **`src/services/rolesPermissionsService.ts`**
```typescript
// ✅ Recreado con authenticatedApi
import { authenticatedApi } from './api';
```

## 🔒 Cómo Funciona Ahora

### 1. Login
```typescript
// Usuario hace login
await authService.login('email@prosalud.com', 'password');
// Token se guarda en localStorage: 'prosalud_auth_token'
```

### 2. Peticiones Automáticas con Token
```typescript
// Cualquier llamada usa authenticatedApi automáticamente
const { data } = await authenticatedApi.get('/api/requests');

// El interceptor agrega automáticamente:
// Headers: { Authorization: 'Bearer <token>' }
```

### 3. Flujo Completo

```
Usuario Login
     ↓
Token guardado en localStorage
     ↓
authenticatedApi interceptor lee el token
     ↓
Agrega header: Authorization: Bearer <token>
     ↓
Backend recibe token válido
     ↓
Respuesta exitosa ✅
```

## 🧪 Verificación

### Método 1: Usando DevTools

1. Abre DevTools (F12)
2. Ve a la tab **Network**
3. Haz login
4. Realiza una acción (ej: ver solicitudes)
5. Click en la petición
6. Verifica en **Headers** → **Request Headers**:
   ```
   Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...
   ```

### Método 2: Usando cURL

```bash
# 1. Hacer login y obtener token
curl -X POST https://prosalud.test/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@prosalud.com","password":"ProSalud2024","device_name":"Test"}'

# 2. Usar el token en peticiones
curl https://prosalud.test/api/requests \
  -H "Authorization: Bearer <TOKEN_AQUI>" \
  -H "Accept: application/json"
```

### Método 3: Console Log

```javascript
// En la consola del navegador después del login
localStorage.getItem('prosalud_auth_token')
// Deberías ver: "eyJ0eXAiOiJKV1QiLCJhbGc..."
```

## 📊 Estado de los Servicios

| Servicio | Estado | Usa Token |
|----------|--------|-----------|
| `authService.ts` | ✅ OK | Sí (propia instancia) |
| `requestsApi.ts` | ✅ CORREGIDO | Sí |
| `inventoryApiService.ts` | ✅ CORREGIDO | Sí |
| `wellnessEventsApi.ts` | ✅ CORREGIDO | Sí |
| `rolesApi.ts` | ✅ CORREGIDO | Sí |
| `realUsersApi.ts` | ✅ CORREGIDO | Sí |
| `wellnessRequestsApi.ts` | ✅ CORREGIDO | Sí |
| `rolesPermissionsService.ts` | ✅ RECREADO | Sí |
| `publicApi.ts` | ✅ OK | No (público) |
| `afiliadosOtpService.ts` | ✅ OK | No (público) |

## 🚨 Errores Comunes y Soluciones

### Error 401: No autorizado

**Causa**: Token no válido o no enviado

**Solución**:
1. Verificar que el usuario hizo login
2. Verificar que el token existe en localStorage
3. Hacer logout y login de nuevo

```javascript
// Verificar token
const token = localStorage.getItem('prosalud_auth_token');
console.log('Token:', token);

// Si no hay token o está mal, hacer logout y login
```

### Error 403: Cuenta desactivada

**Causa**: Usuario tiene `is_active = false`

**Solución**: Activar la cuenta desde el panel de administración

### Token no se envía

**Causa**: Servicio no usa `authenticatedApi`

**Solución**: Actualizar el servicio para usar `authenticatedApi`:

```typescript
// ❌ MAL
import axios from 'axios';
const api = axios.create({...});

// ✅ BIEN
import { authenticatedApi } from './api';
const api = authenticatedApi;
```

## 🔄 Manejo de Sesiones

### Expiración de Token

El token expira según `API_TOKEN_TTL_HOURS` en el backend (por defecto 12 horas).

Cuando expira:
1. Backend responde con 401
2. Interceptor detecta el 401
3. Limpia localStorage automáticamente
4. Redirige a `/auth/login`

### Múltiples Pestañas

- El token se comparte entre pestañas (localStorage)
- Si se hace logout en una pestaña, todas pierden el token
- Las otras pestañas mostrarán error 401 en la siguiente petición

## 📝 Checklist de Implementación

- [x] Crear `authenticatedApi` con interceptor de token
- [x] Actualizar `requestsApi.ts`
- [x] Actualizar `inventoryApiService.ts`
- [x] Actualizar `wellnessEventsApi.ts`
- [x] Actualizar `rolesApi.ts`
- [x] Actualizar `realUsersApi.ts`
- [x] Actualizar `wellnessRequestsApi.ts`
- [x] Recrear `rolesPermissionsService.ts`
- [x] Verificar que no hay errores de lint
- [x] Documentar los cambios

## 🎯 Pruebas Recomendadas

### Test 1: Login y Petición Simple
1. Hacer login con credenciales válidas
2. Navegar a "Solicitudes"
3. Verificar que se cargan correctamente
4. Revisar en Network que incluye `Authorization` header

### Test 2: Token Persistente
1. Hacer login
2. Recargar la página (F5)
3. Verificar que sigue autenticado
4. Verificar que las peticiones siguen funcionando

### Test 3: Logout
1. Hacer login
2. Hacer logout
3. Intentar acceder a una ruta protegida
4. Verificar que redirige a login
5. Verificar que el token fue eliminado de localStorage

### Test 4: Token Expirado
1. Hacer login
2. Borrar manualmente el token o esperar a que expire
3. Hacer una petición (ej: navegar a solicitudes)
4. Verificar que se redirige automáticamente al login

### Test 5: Múltiples Módulos
1. Hacer login
2. Probar cada módulo:
   - ✅ Solicitudes (`/api/requests`)
   - ✅ Inventario (`/api/inventory/*`)
   - ✅ Usuarios (`/api/users`)
   - ✅ Roles (`/api/roles`)
   - ✅ Bienestar (`/api/wellness-requests`)
3. Verificar que todos funcionan correctamente

## 📞 Soporte

Si después de estos cambios aún ves el error:
- `Token no proporcionado`
- `401 Unauthorized`

Verifica:
1. ✅ El servicio usa `authenticatedApi`
2. ✅ El token existe en localStorage
3. ✅ El token es válido (no expiró)
4. ✅ La URL del API es correcta
5. ✅ No hay problemas de CORS

---

**Estado**: ✅ Corrección Completada  
**Fecha**: Noviembre 2024  
**Cambios**: 8 archivos actualizados


