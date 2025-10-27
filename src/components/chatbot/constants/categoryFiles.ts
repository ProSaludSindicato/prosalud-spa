/**
 * Mapeo de categorías a archivos de documentación
 */

export const CATEGORY_FILES: Record<string, string[]> = {
  incapacidades: [
    "servicios/incapacidades-licencias.md",
    "servicios/verificacion-pagos.md",
  ],
  certificados: [
    "servicios/certificado-convenio.md",
    "servicios/certificado-seguridad-social.md",
  ],
  contacto: ["contacto/informacion-contacto.md"],
  convenios: ["convenios/convenios-alianzas.md"],
  servicios: [
    "servicios/overview.md",
    "servicios/actualizar-cuenta-bancaria.md",
    "servicios/solicitud-compensacion-anual-diferida.md",
    "servicios/solicitud-descanso-laboral.md",
    "servicios/solicitud-microcredito.md",
    "servicios/solicitud-retiro-sindical.md",
    "servicios/permisos-cambio-turnos.md",
    "servicios/cuadro-turnos.md",
  ],
  normatividad: ["legal/estatutos-beneficios.md", "legal/contrato-sindical.md"],
  bienestar: [
    "servicios/galeria-bienestar.md",
    "servicios/encuesta-bienestar.md",
  ],
  sst: ["servicios/sst.md"],
  general: [
    "quienes-somos/overview.md",
    "quienes-somos/mision-vision.md",
    "contacto/informacion-contacto.md",
  ],
};

