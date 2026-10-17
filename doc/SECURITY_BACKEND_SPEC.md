# Especificación de cambios para el backend Laravel (auditoría 2026-10-17)

Este repo es solo el frontend. Los siguientes cambios deben hacerse en la API Laravel; el frontend se adapta después
(el backend debe aceptar el flujo antiguo y el nuevo durante la transición para no romper una votación en curso).

## 1. Votación (H-01, H-15) — prioridad P0
Endpoints: `POST /api/activos/search-hospital`, `POST /api/activos/search-candidate-voting`,
`POST /api/assembly/questions/{id}/votes`, `GET .../votes/me`, `GET /api/votes/check`, `POST /api/votes`,
`GET /api/delegados/by-sede`.

- La validación (documento + fecha de expedición + firma) debe emitir un **token de votante** firmado
  (JWT corto o token opaco en BD), ligado a: documento, tipo de documento, asamblea/elección, expiración (≤ 2 h), un solo uso por pregunta.
- `votes`, `votes/me` y `votes/check` exigen ese token (`Authorization: Bearer`). El `voterId` y el documento se
  **derivan del token**, se ignoran los enviados en el body/query.
- `delegados/by-sede` no debe devolver `cedula`; usar un identificador opaco.
- Rate limit por IP y por documento en todos los endpoints de validación y voto (p. ej. 5/min, bloqueo progresivo).
- Registrar (log de auditoría) intentos fallidos y votos con IP/UA; alertar picos.
- Pruebas: voto sin token → 401; token de A no vota como B; token reutilizado/expirado → rechazado; `votes/me` sin token → 401.
- Contención inmediata sin código: revisar logs de votos sin validación previa; desactivar `allowChangeVote`/`resultsVisible` hasta corregir.

## 2. Consultas por documento + fecha de expedición (H-02, H-16) — P0
Endpoints: `/api/afiliados/authenticate`, `/api/afiliados/authenticate-for-data-update`, `/api/liquidaciones/search`,
`/api/incapacidades/search`, `/api/kit-bienestar/authenticate`.

- Exigir OTP (ya existe `request-otp`/`verify-otp`) antes de devolver datos personales, bancarios o de salud.
- Si no hay OTP: devolver datos **enmascarados** (cuenta `****1234`, celular parcial) y no devolver `numero_cuenta` completo nunca.
- Respuesta 401 **uniforme**: eliminar `auth_failure_reason` (`affiliate_not_found` vs `affiliate_data_mismatch`).
- Verificar reCAPTCHA en servidor en estos endpoints (hoy el cliente solo lo usa en `request-otp`).
- Rate limit + bloqueo temporal por documento y por IP (la fecha de expedición es acotable por fuerza bruta).
- Pruebas: 401 idéntico en ambos casos; > N intentos → 429; sin OTP la respuesta no incluye campos sensibles.

## 3. Creación de solicitudes (H-07) — P1
`POST /api/requests` (incl. actualización de datos y cuenta bancaria).
- Exigir el token emitido tras OTP; validar que `id_number` del body coincide con el del token.
- Solicitudes que cambien cuenta bancaria: marcar como "alto riesgo" y confirmar con el afiliado por el canal registrado
  antes de aprobar (el frontend mostrará la alerta en el panel).
- Verificar reCAPTCHA en servidor (hoy el cliente lo ejecuta fail-open).

## 4. Otros puntos de verificación en backend
- **CSRF (H-19):** confirmar `SameSite` de la cookie de sesión (`Lax`/`Strict` preferible) y `config/cors.php`
  (`allowed_origins` explícitos, no `*`, `supports_credentials`). Si es `SameSite=None`, implementar `X-XSRF-TOKEN` (Sanctum).
- **Autorización por recurso (IDOR):** revisar `requests/{id}/files`, `requests/{id}`, `assembly/*`, exports; toda ruta
  admin debe verificar el permiso en servidor (los guards del frontend son solo visuales).
- **URLs (H-20):** validar esquema `http(s)` en `registration_link`, `file_url`, `signature_url`, `pdf_url` al guardar.
- **Archivos (H-22):** validar tipo real (magic bytes), tamaño y extensión en servidor; nombres aleatorios; sin ejecución en el storage.
- **Chatbot:** `PATCH /api/chatbot-conversations/client/{client_turn_id}/feedback` es público; exigir un token de la conversación.
- **Logs/retención:** no registrar documentos ni fechas de expedición en logs de acceso (hoy llegan por query en `votes/check`).
