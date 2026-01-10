# API - Encuesta Sociodemográfica y Diagnóstico de Condiciones de Salud

Esta documentación describe todos los endpoints disponibles para la funcionalidad de Encuesta Sociodemográfica y Diagnóstico de Condiciones de Salud.

## Base URL
`/api/socio-demographic-surveys`

---

## Endpoints Disponibles

### 1. Crear Encuesta Sociodemográfica (Público)
**POST** `/api/socio-demographic-surveys`

Endpoint público para que los afiliados envíen su encuesta. Requiere reCAPTCHA.

**Rate Limiting:** 20 requests por minuto

**Headers:**
```
Content-Type: application/json
Accept: application/json
```

**Cuerpo de la petición (JSON):**

```json
{
  // Datos Básicos
  "correo": "afiliado@example.com",
  "tipoDocumento": "CC",
  "numeroDocumento": "1234567890",
  "hospital": "HOSPITAL_001",
  "profesion": "Enfermera",
  "rh": "A+",
  "fechaExpedicion": "2020-01-15",
  "lugarNacimiento": "Medellín",
  "departamento": "antioquia",
  "celular": "3001234567",
  "direccion": "Calle 123 #45-67",
  "municipio": "medellin",
  "tallaCalzado": "40",
  "tallaVestimenta": "m",
  "paisNacimiento": "colombia",
  
  // Contacto de Emergencia
  "nombreContactoEmergencia": "María Pérez",
  "relacionContactoEmergencia": "madre",
  "telefonoContactoEmergencia": "3009876543",
  
  // Información Sociodemográfica
  "tienePersonasACargo": "si",
  "estadoCivil": "casado",
  "fechaNacimiento": "1990-05-20",
  "estatura": "165",
  "peso": "70",
  "genero": "femenino",
  "raza": "ninguno",
  "numeroHijos": "2",
  "hijos": [
    {
      "tipoDocumento": "TI",
      "numeroDocumento": "1001234567",
      "nombre": "Juan Pérez",
      "genero": "masculino",
      "fechaNacimiento": "2015-03-10"
    },
    {
      "tipoDocumento": "TI",
      "numeroDocumento": "1001234568",
      "nombre": "Ana Pérez",
      "genero": "femenino",
      "fechaNacimiento": "2018-07-22"
    }
  ],
  "numeroPersonasDependientes": "0",
  "vivienda": "propia",
  "serviciosPublicos": {
    "agua": true,
    "luz": true,
    "telefono": false,
    "internet": true,
    "gas": true
  },
  "estratoSocioeconomico": "3",
  "conviveCon": "nueva_familia",
  "transporte": "transporte_publico",
  "manejoTiempoLibre": {
    "recreativas": true,
    "deportivas": true,
    "educativas": false,
    "descanso": true,
    "artisticas": false,
    "religiosas": true,
    "otras": false
  },
  "tiempoLibreCon": "familia",
  
  // Consumo
  "consumoLicor": "si",
  "frecuenciaLicor": "fines_semana",
  "consumoCigarrillo": "no",
  "frecuenciaCigarrillo": null,
  
  // Condiciones de Salud
  "sobrepesoObesidad": "si",
  "hipertensionArterial": "no",
  "enfermedadesCorazon": "no",
  "diabetes": "no",
  "problemasRenales": "no",
  "depresionBipolaridad": "no",
  "antecedentesMedicosMentales": "no",
  "epilepsiaConvulsiones": "no",
  "trasplante": "no",
  "tipoTrasplante": null,
  "cancer": "no",
  "problemasPulmonares": "si",
  "tipoProblemaPulmonar": "Asma leve",
  "alergias": "si",
  "tipoAlergia": "Polvo y ácaros",
  "tuberculosis": "no",
  "problemasVisuales": "si",
  "tipoProblemaVisual": "Miopía",
  "doloresArticulares": "si",
  "tipoDolorArticular": "Rodillas",
  "problemasSangre": "no",
  "otraEnfermedad": "no",
  "tipoOtraEnfermedad": null,
  "protesisArticular": "no",
  "medicamentoPermanente": "si",
  "tipoMedicamento": "Antihipertensivos",
  "tratamientoMedico": "si",
  "cirugias": "si",
  "tipoCirugia": "Apéndice",
  "tiempoCirugia": "2015",
  "accidenteLaboral": "no",
  "tipoAccidenteLaboral": null,
  "tiempoAccidenteLaboral": null,
  "accidenteTransitoCasero": "si",
  "tipoAccidenteTransito": "Caída en casa",
  "tiempoAccidenteTransito": "2020",
  "vacunadoCovid": "si",
  
  // Limitaciones Físicas
  "esfuerzosIntensos": "limita_poco",
  "esfuerzosModerados": "no_limita",
  "subirPisos": "limita_poco",
  "agacharseArrodillarse": "limita_mucho",
  
  // Recomendaciones Laborales
  "recomendacionRestriccionLaboral": "si",
  "detalleRecomendacionLaboral": "Evitar esfuerzos físicos intensos y agacharse frecuentemente",
  
  // Firma Digital
  "firma": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "numeroDocumentoFirma": "1234567890",
  
  // reCAPTCHA
  "recaptcha_token": "03AGdBq27Q..."
}
```

**Nota sobre la firma digital:**
- Puedes enviar la firma como base64 en el campo `firma` (formato: `data:image/png;base64,...`)
- O enviar el archivo PNG en el campo `files[firma]` usando FormData (multipart/form-data)
- Si usas FormData, NO incluyas el campo `firma` con base64

**Ejemplo con FormData (multipart/form-data):**

```
correo: afiliado@example.com
tipoDocumento: CC
numeroDocumento: 1234567890
...
files[firma]: [archivo PNG]
recaptcha_token: 03AGdB...
```

**Respuesta exitosa (201):**

```json
{
  "success": true,
  "message": "Encuesta sociodemográfica registrada exitosamente",
  "data": {
    "id": "1234567890",
    "tipo_documento": "CC",
    "numero_documento": "1234567890",
    "created_at": "10/01/2026 13:30:45"
  }
}
```

**Errores de validación (422):**

```json
{
  "success": false,
  "message": "Errores de validación",
  "errors": {
    "correo": [
      "El correo electrónico es obligatorio."
    ],
    "fechaNacimiento": [
      "La fecha de nacimiento debe ser anterior a hoy."
    ],
    "frecuenciaLicor": [
      "Debe indicar la frecuencia de consumo de licor."
    ]
  }
}
```

---

### 2. Listar Encuestas (Admin)
**GET** `/api/socio-demographic-surveys`

Endpoint protegido para usuarios autenticados con permiso `socio_demographic_surveys.view`.

**Autenticación requerida:** Bearer Token

**Permiso requerido:** `socio_demographic_surveys.view`

**Parámetros de consulta:**
- `hospital` (opcional): Filtrar por código de hospital
- `tipo_documento` (opcional): Filtrar por tipo de documento (requiere `numero_documento`)
- `numero_documento` (opcional): Filtrar por número de documento (requiere `tipo_documento`)
- `per_page` (opcional): Elementos por página (default: 15, máximo: 100)

**Ejemplo de petición:**
```
GET /api/socio-demographic-surveys?hospital=HOSPITAL_001&per_page=20
Authorization: Bearer {token}
```

**Respuesta exitosa (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "1234567890",
      "correo": "afiliado@example.com",
      "tipo_documento": "CC",
      "numero_documento": "1234567890",
      "hospital": "HOSPITAL_001",
      "profesion": "Enfermera",
      "created_at": "10/01/2026 13:30:45"
    }
  ],
  "pagination": {
    "current_page": 1,
    "last_page": 3,
    "per_page": 20,
    "total": 45
  }
}
```

---

### 3. Obtener Encuesta Específica (Admin)
**GET** `/api/socio-demographic-surveys/{id}`

Endpoint protegido para obtener los detalles completos de una encuesta.

**Autenticación requerida:** Bearer Token

**Permiso requerido:** `socio_demographic_surveys.view`

**Ejemplo de petición:**
```
GET /api/socio-demographic-surveys/1234567890
Authorization: Bearer {token}
```

**Respuesta exitosa (200):**

```json
{
  "success": true,
  "data": {
    "id": "1234567890",
    "correo": "afiliado@example.com",
    "tipo_documento": "CC",
    "numero_documento": "1234567890",
    "hospital": "HOSPITAL_001",
    "profesion": "Enfermera",
    "rh": "A+",
    "fecha_expedicion": "2020-01-15",
    "lugar_nacimiento": "Medellín",
    "departamento": "antioquia",
    "celular": "3001234567",
    "direccion": "Calle 123 #45-67",
    "municipio": "medellin",
    "talla_calzado": "40",
    "talla_vestimenta": "m",
    "pais_nacimiento": "colombia",
    "nombre_contacto_emergencia": "María Pérez",
    "relacion_contacto_emergencia": "madre",
    "telefono_contacto_emergencia": "3009876543",
    "datos_sociodemograficos": {
      "tienePersonasACargo": "si",
      "estadoCivil": "casado",
      "fechaNacimiento": "1990-05-20",
      "estatura": "165",
      "peso": "70",
      "genero": "femenino",
      "raza": "ninguno",
      "numeroHijos": "2",
      "hijos": [...],
      "numeroPersonasDependientes": "0",
      "vivienda": "propia",
      "serviciosPublicos": {...},
      "estratoSocioeconomico": "3",
      "conviveCon": "nueva_familia",
      "transporte": "transporte_publico",
      "manejoTiempoLibre": {...},
      "tiempoLibreCon": "familia"
    },
    "datos_consumo": {
      "consumoLicor": "si",
      "frecuenciaLicor": "fines_semana",
      "consumoCigarrillo": "no",
      "frecuenciaCigarrillo": null
    },
    "condiciones_salud": {
      "sobrepesoObesidad": "si",
      "hipertensionArterial": "no",
      ...
    },
    "limitaciones_fisicas": {
      "esfuerzosIntensos": "limita_poco",
      "esfuerzosModerados": "no_limita",
      "subirPisos": "limita_poco",
      "agacharseArrodillarse": "limita_mucho"
    },
    "recomendacion_restriccion_laboral": "si",
    "detalle_recomendacion_laboral": "Evitar esfuerzos físicos intensos...",
    "tiene_firma": true,
    "firma_download_url": "/api/socio-demographic-surveys/1234567890/signature",
    "numero_documento_firma": "1234567890",
    "created_at": "10/01/2026 13:30:45",
    "updated_at": null
  }
}
```

**Error si no existe (404):**

```json
{
  "success": false,
  "message": "No query results for model [App\\Models\\SocioDemographicSurvey] 1234567890"
}
```

---

### 4. Descargar/Ver Firma Digital (Admin)
**GET** `/api/socio-demographic-surveys/{id}/signature`

Endpoint protegido para descargar o visualizar la firma digital de una encuesta.

**Autenticación requerida:** Bearer Token

**Permiso requerido:** `socio_demographic_surveys.view`

**Ejemplo de petición:**
```
GET /api/socio-demographic-surveys/1234567890/signature
Authorization: Bearer {token}
```

**Respuesta exitosa (200):**
- Content-Type: `image/png`
- Retorna el archivo PNG de la firma

**Error si no existe (404):**

```json
{
  "success": false,
  "message": "No se encontró la firma digital para esta encuesta."
}
```

---

## Valores Posibles

### Tipos de Documento
- `CC` - Cédula de Ciudadanía
- `TI` - Tarjeta de Identidad
- `CE` - Cédula de Extranjería
- `PA` - Pasaporte
- `RC` - Registro Civil
- `PT` - Pasaporte (alternativa)

### Tipos RH
- `A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, `O-`

### Tallas de Vestimenta
- `xs`, `s`, `m`, `l`, `xl`, `xxl`, `xxxl`, `4xl`, `5xl`

### Estados Civiles
- `soltero`, `casado`, `divorciado`, `viudo`, `union_libre`

### Géneros
- `masculino`, `femenino`, `otro`

### Razas (Grupo étnico)
- `ninguno`, `afro`, `indigena`, `otro`, `no_responde`

### Tipos de Vivienda
- `propia`, `arrendada`, `familiar`

### Estratos Socioeconómicos
- `1`, `2`, `3`, `4`, `5`, `6`

### Opciones de Convivencia
- `familia_origen`, `nueva_familia`, `ambas`, `amigos`, `otros_familiares`, `solo`

### Tipos de Transporte
- `carro`, `motocicleta`, `bicicleta`, `transporte_publico`, `caminando`, `otra`

### Tiempo Libre Con
- `familia`, `pareja`, `amigos`, `solo`, `otros`

### Frecuencias de Consumo
- `diario`, `varias_veces_semana`, `fines_semana`, `cada_quince_dias`, `ocasionalmente`

### Niveles de Limitación
- `limita_mucho`, `limita_poco`, `no_limita`

### Respuestas Si/No
- `si`, `no`

### Relaciones Contacto Emergencia
- `padre`, `madre`, `hijo`, `hija`, `hermano`, `hermana`, `esposo`, `esposa`, `pareja`, `tio`, `tia`, `primo`, `prima`, `abuelo`, `abuela`, `yerno`, `nuera`, `suegro`, `suegra`, `cuñado`, `cuñada`, `amigo`, `amiga`, `otro`

### Departamentos (32)
- `amazonas`, `antioquia`, `arauca`, `atlantico`, `bolivar`, `boyaca`, `caldas`, `caqueta`, `casanare`, `cauca`, `cesar`, `choco`, `cordoba`, `cundinamarca`, `guainia`, `guaviare`, `huila`, `la_guajira`, `magdalena`, `meta`, `narino`, `norte_de_santander`, `putumayo`, `quindio`, `risaralda`, `san_andres`, `santander`, `sucre`, `tolima`, `valle_del_cauca`, `vaupes`, `vichada`

### Municipios (Antioquia - 125+)
- Ver lista completa: `abejorral`, `medellin`, `rionegro`, `bello`, `itagui`, `envigado`, `sabaneta`, `la_estrella`, `caldas`, `barbosa`, `copacabana`, `girardota`, `guarne`, `la_ceja`, `marinilla`, `retiro`, `rioneuro`, etc. (Ver `formOptions.ts` para lista completa)

### Países (63 + "otro")
- `colombia` (default), `venezuela`, `ecuador`, `peru`, `brasil`, `argentina`, `chile`, `panama`, `costa_rica`, `nicaragua`, `honduras`, `guatemala`, `el_salvador`, `mexico`, `cuba`, `republica_dominicana`, `puerto_rico`, `bolivia`, `paraguay`, `uruguay`, `estados_unidos`, `canada`, `espana`, `francia`, `italia`, `alemania`, `reino_unido`, `portugal`, `holanda`, `belgica`, `suiza`, `australia`, `nueva_zelanda`, `japon`, `china`, `india`, `rusia`, `corea_del_sur`, `filipinas`, `indonesia`, `tailandia`, `singapur`, `malasia`, `vietnam`, `israel`, `turquia`, `egipto`, `sudafrica`, `nigeria`, `kenia`, `marruecos`, `argelia`, `tunez`, `otro`

---

## Validaciones Importantes

### Campos Condicionales

1. **Si `consumoLicor === "si"`** → `frecuenciaLicor` es **requerido**
2. **Si `consumoCigarrillo === "si"`** → `frecuenciaCigarrillo` es **requerido**
3. **Si `trasplante === "si"`** → `tipoTrasplante` es **requerido**
4. **Si `problemasPulmonares === "si"`** → `tipoProblemaPulmonar` es **requerido**
5. **Si `alergias === "si"`** → `tipoAlergia` es **requerido**
6. **Si `problemasVisuales === "si"`** → `tipoProblemaVisual` es **requerido**
7. **Si `doloresArticulares === "si"`** → `tipoDolorArticular` es **requerido**
8. **Si `otraEnfermedad === "si"`** → `tipoOtraEnfermedad` es **requerido**
9. **Si `medicamentoPermanente === "si"`** → `tipoMedicamento` es **requerido**
10. **Si `cirugias === "si"`** → `tipoCirugia` y `tiempoCirugia` son **requeridos**
11. **Si `accidenteLaboral === "si"`** → `tipoAccidenteLaboral` y `tiempoAccidenteLaboral` son **requeridos**
12. **Si `accidenteTransitoCasero === "si"`** → `tipoAccidenteTransito` y `tiempoAccidenteTransito` son **requeridos**
13. **Si `recomendacionRestriccionLaboral === "si"`** → `detalleRecomendacionLaboral` es **requerido**
14. **Firma Digital**: Debe proporcionarse como base64 (`firma`) O como archivo (`files[firma]`)
15. **`numeroDocumentoFirma`** debe coincidir con `numeroDocumento`

### Validaciones Numéricas

- **estatura**: Entre 50 y 250 cm
- **peso**: Entre 20 y 300 kg
- **fechaNacimiento**: Debe ser anterior a hoy (edad válida)

---

## Códigos de Estado HTTP

- `200` - OK (operación exitosa)
- `201` - Created (encuesta creada exitosamente)
- `422` - Unprocessable Entity (errores de validación)
- `404` - Not Found (encuesta no encontrada)
- `401` - Unauthorized (token inválido o faltante)
- `403` - Forbidden (sin permisos)
- `429` - Too Many Requests (rate limit excedido)
- `500` - Internal Server Error (error del servidor)

---

## Notas Importantes

1. **reCAPTCHA**: Todos los endpoints públicos requieren token de reCAPTCHA válido
2. **Rate Limiting**: Endpoint público limitado a 20 requests por minuto
3. **Firma Digital**: Acepta base64 o archivo PNG (máximo 2MB)
4. **Autenticación**: Endpoints admin requieren Bearer Token válido
5. **Permisos**: Endpoints admin requieren permiso `socio_demographic_surveys.view`
6. **Logging**: Todas las operaciones se registran en logs de auditoría
7. **Paginación**: Listado incluye paginación automática (máximo 100 por página)
8. **Filtros**: Se puede filtrar por hospital, tipo y número de documento
9. **Almacenamiento**: Archivos se guardan en disco privado con fallback a local
10. **ID único**: Se genera automáticamente un ID de 10 dígitos único

---

## Ejemplos de Uso con JavaScript/TypeScript

### Crear Encuesta (con base64)

```javascript
const createSurvey = async (surveyData, signatureBase64, recaptchaToken) => {
  const response = await fetch('/api/socio-demographic-surveys', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      ...surveyData,
      firma: signatureBase64,
      recaptcha_token: recaptchaToken
    })
  });
  
  return await response.json();
};
```

### Crear Encuesta (con FormData)

```javascript
const createSurveyWithFile = async (surveyData, signatureFile, recaptchaToken) => {
  const formData = new FormData();
  
  // Agregar todos los campos de texto
  Object.keys(surveyData).forEach(key => {
    if (typeof surveyData[key] === 'object') {
      formData.append(key, JSON.stringify(surveyData[key]));
    } else {
      formData.append(key, surveyData[key]);
    }
  });
  
  // Agregar archivo de firma
  formData.append('files[firma]', signatureFile);
  formData.append('recaptcha_token', recaptchaToken);
  
  const response = await fetch('/api/socio-demographic-surveys', {
    method: 'POST',
    headers: {
      'Accept': 'application/json'
    },
    body: formData
  });
  
  return await response.json();
};
```

### Listar Encuestas (Admin)

```javascript
const listSurveys = async (token, filters = {}) => {
  const queryParams = new URLSearchParams(filters);
  const response = await fetch(`/api/socio-demographic-surveys?${queryParams}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  
  return await response.json();
};
```

### Obtener Encuesta Específica (Admin)

```javascript
const getSurvey = async (token, surveyId) => {
  const response = await fetch(`/api/socio-demographic-surveys/${surveyId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  
  return await response.json();
};
```

### Descargar Firma (Admin)

```javascript
const downloadSignature = async (token, surveyId) => {
  const response = await fetch(`/api/socio-demographic-surveys/${surveyId}/signature`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (response.ok) {
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `firma-${surveyId}.png`;
    a.click();
  }
};
```

---

## Manejo de Errores

### Error de Validación

```javascript
try {
  const result = await createSurvey(data, signature, recaptcha);
  if (!result.success) {
    // Manejar errores de validación
    Object.keys(result.errors).forEach(field => {
      console.error(`${field}: ${result.errors[field].join(', ')}`);
    });
  }
} catch (error) {
  console.error('Error de red:', error);
}
```

### Error de Autenticación

```javascript
if (response.status === 401) {
  // Token inválido o expirado
  // Redirigir a login
}
```

### Error de Permisos

```javascript
if (response.status === 403) {
  // Usuario no tiene permisos
  // Mostrar mensaje de acceso denegado
}
```

---

## Changelog

- **2026-01-10**: Versión inicial de la API de Encuesta Sociodemográfica
  - Endpoint público para crear encuestas
  - Endpoints admin para listar y ver encuestas
  - Endpoint para descargar firmas digitales
  - Validaciones completas según especificación

