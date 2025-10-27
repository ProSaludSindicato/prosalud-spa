/**
 * Cargador de contexto selectivo
 * Carga documentación relevante según la categoría de la pregunta
 */

import { CATEGORY_FILES } from "../constants/categoryFiles";
import { CategoryType } from "../constants/categoryKeywords";

const docsModules = import.meta.glob("/src/doc/**/*.md", { as: "raw" });

/**
 * Carga contexto selectivo según la categoría
 */
export const loadSelectiveContext = async (
  category: CategoryType
): Promise<string> => {
  try {
    console.log(`📂 Cargando contexto para categoría: ${category}`);

    const filesToLoad = CATEGORY_FILES[category] || CATEGORY_FILES.general;

    // Cargar solo los archivos de la categoría
    const loadPromises = filesToLoad.map(async (filePath) => {
      const fullPath = `/src/doc/${filePath}`;
      if (docsModules[fullPath]) {
        try {
          const content = await docsModules[fullPath]();
          console.log(`✅ Cargado: ${filePath}`);
          return content;
        } catch (error) {
          console.warn(`⚠️ No se pudo cargar: ${filePath}`, error);
          return "";
        }
      } else {
        console.warn(`⚠️ Archivo no encontrado: ${fullPath}`);
        return "";
      }
    });

    const loadedContents = await Promise.all(loadPromises);
    const filteredContents = loadedContents.filter(
      (content) => content.trim() !== ""
    );
    const contextContent = filteredContents.join("\n\n---\n\n");

    console.log(
      `📄 Contexto cargado: ${contextContent.length} caracteres para categoría ${category}`
    );
    console.log(
      `📊 Archivos cargados: ${filteredContents.length}/${filesToLoad.length}`
    );

    return contextContent;
  } catch (error) {
    console.error("❌ Error cargando contexto selectivo:", error);
    // Fallback a contexto mínimo
    try {
      const fallbackPath = "/src/doc/quienes-somos/overview.md";
      if (docsModules[fallbackPath]) {
        const fallbackContent = await docsModules[fallbackPath]();
        console.log("🔄 Usando contexto fallback");
        return fallbackContent;
      }
    } catch (fallbackError) {
      console.error("❌ Error en fallback:", fallbackError);
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
    console.error("Error:", error);
    return { docs: "" };
  }
};

