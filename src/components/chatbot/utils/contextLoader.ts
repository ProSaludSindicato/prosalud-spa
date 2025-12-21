/**
 * Cargador de contexto selectivo
 * Carga documentación relevante según la categoría de la pregunta
 */

import { CATEGORY_FILES } from "../constants/categoryFiles";
import { CategoryType } from "../constants/categoryKeywords";
import { logger } from "@/utils/logger";

const docsModules = import.meta.glob("/src/doc/**/*.md", { as: "raw" });

/**
 * Carga contexto selectivo según la categoría
 */
export const loadSelectiveContext = async (
  category: CategoryType
): Promise<string> => {
  try {
    logger.debug("📂 Cargando contexto para categoría", { category });

    const filesToLoad = CATEGORY_FILES[category] || CATEGORY_FILES.general;

    // Cargar solo los archivos de la categoría
    const loadPromises = filesToLoad.map(async (filePath) => {
      const fullPath = `/src/doc/${filePath}`;
      if (docsModules[fullPath]) {
        try {
          const content = await docsModules[fullPath]();
          logger.debug("✅ Contexto cargado", { filePath });
          return content;
        } catch (error) {
          logger.warn("⚠️ No se pudo cargar el archivo de contexto", { filePath, error });
          return "";
        }
      } else {
        logger.warn("⚠️ Archivo de contexto no encontrado", { fullPath });
        return "";
      }
    });

    const loadedContents = await Promise.all(loadPromises);
    const filteredContents = loadedContents.filter(
      (content) => content.trim() !== ""
    );
    
    // Si es la categoría de servicios y contiene actualizar-datos-personales, agregar nota crítica sobre OTP AL INICIO
    const baseContextContent = filteredContents.join("\n\n---\n\n");
    
    let contextContent = baseContextContent;
    
    if (category === "servicios" && filesToLoad.includes("servicios/actualizar-datos-personales.md")) {
      const criticalNote = `⚠️⚠️⚠️ INSTRUCCIÓN CRÍTICA ABSOLUTA - ACTUALIZACIÓN DE DATOS PERSONALES ⚠️⚠️⚠️

🚫 PROHIBICIÓN ABSOLUTA DE MENCIONAR OTP 🚫

Si la pregunta es sobre "actualizar datos personales", "cambiar datos bancarios", "actualizar cuenta bancaria" o términos similares:

1. ESTÁ ESTRICTAMENTE PROHIBIDO mencionar código OTP, código de verificación, One Time Password, ni ningún tipo de código
2. ESTÁ ESTRICTAMENTE PROHIBIDO decir que se envía un código al correo electrónico
3. ESTÁ ESTRICTAMENTE PROHIBIDO mencionar pasos de verificación adicionales después de la autenticación inicial
4. El proceso es ÚNICAMENTE: autenticarse con documento y fecha de expedición (o contraseña) → acceso directo al formulario
5. Si encuentras información sobre OTP en CUALQUIER parte de la documentación (incluyendo autenticacion.md), DEBES IGNORARLA COMPLETAMENTE
6. El archivo autenticacion.md es para el LOGIN GENERAL del portal, NO para actualizar datos personales

PROCESO CORRECTO:
1. Iniciar sesión con número de documento y fecha de expedición (o contraseña)
2. Acceso directo al formulario (punto final, sin más pasos)

Esta instrucción tiene PRIORIDAD ABSOLUTA sobre cualquier otra información en la documentación.

---DOCUMENTACIÓN A CONTINUACIÓN (IGNORAR CUALQUIER MENCIÓN DE OTP)---

`;
      
      contextContent = criticalNote + baseContextContent;
    }

    logger.debug("📄 Contexto cargado", {
      category,
      characters: contextContent.length,
      loaded: filteredContents.length,
      requested: filesToLoad.length,
    });

    return contextContent;
  } catch (error) {
    logger.error("❌ Error cargando contexto selectivo", error);
    // Fallback a contexto mínimo
    try {
      const fallbackPath = "/src/doc/quienes-somos/overview.md";
      if (docsModules[fallbackPath]) {
        const fallbackContent = await docsModules[fallbackPath]();
        logger.warn("🔄 Usando contexto fallback");
        return fallbackContent;
      }
    } catch (fallbackError) {
      logger.error("❌ Error en fallback de contexto selectivo", fallbackError);
    }
    return "";
  }
};

/**
 * Importa contexto basado en especialidad (función legacy)
 */
export const importContext = async (specialtyPart?: string) => {
  try {
    if (specialtyPart) {
      const listData = await fetch(`/chatbot/contextConfig.json`).then((r) =>
        r.json()
      );
      const files = listData[specialtyPart] || {};

      // Cargamos los MD como texto
      const getDocs = (files.docs || []).map((fp: string) => {
        const key = `/src/doc/${fp}`;
        if (!docsModules[key]) {
          throw new Error("Error cargando documentación");
        }
        return docsModules[key]();
      });

      const docsArray = await Promise.all(getDocs);
      const joinedDocs = docsArray.join("\n\n");

      return { docs: joinedDocs };
    } else {
      return { docs: "" };
    }
  } catch (error) {
    logger.error("Error importando contexto legacy", error);
    return { docs: "" };
  }
};

