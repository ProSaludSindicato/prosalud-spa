
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";

// Definir tipo para los chunks recuperados
export type RelevantChunk = {
  id: string;
  doc_path: string;
  chunk_index: number;
  content: string;
  embedding: any;
  created_at: string;
  similarity: number;
};

// Genera embedding usando la edge function de Supabase con Lovable AI
export async function getQuestionEmbedding(text: string): Promise<number[]> {
  try {
    const { data, error } = await supabase.functions.invoke('prosalud-embedding', {
      body: { input: text }
    });

    if (error) {
      logger.error('Error en embed-question', error.message || error);
      throw new Error(`Error al generar embedding: ${error.message}`);
    }

    if (!data?.embedding) {
      throw new Error('No se recibió embedding válido de la función');
    }

    return data.embedding;
  } catch (error) {
    logger.error('Error en getQuestionEmbedding', error instanceof Error ? error.message : error);
    throw error;
  }
}

/**
 * Expande la consulta del usuario con términos relacionados para mejorar la búsqueda
 */
function expandQuery(query: string): string {
  const expansions = {
    // Servicios y trámites
    'certificado': 'certificado convenio comprobante aportes seguridad social ProSalud',
    'incapacidad': 'incapacidad licencia maternidad paternidad ProSalud',
    'datos personales': 'actualizar datos personales cuenta bancaria contacto correo dirección compensaciones pagos ProSalud',
    'cuenta bancaria': 'actualizar datos personales cuenta bancaria compensaciones pagos ProSalud',
    'turnos': 'cuadro turnos ProSanet programación ProSalud',
    'descanso': 'descanso compensación solicitud ProSalud',
    'retiro': 'retiro sindical afiliado ProSalud',
    'microcrédito': 'microcrédito CEII Capital Ideas ProSalud',
    'pagos': 'verificación pagos compensaciones ProSalud',
    'permisos': 'permisos cambio turnos ProSalud',
    'bienestar': 'bienestar galería eventos ProSalud',
    
    // EPS y salud
    'sura': 'EPS Sura traslado cambio IPS beneficiarios ProSalud',
    'eps': 'EPS Sura salud afiliación ProSalud',
    'traslado': 'traslado EPS Sura ProSalud',
    'beneficiarios': 'beneficiarios EPS Sura retiro ProSalud',
    'ips': 'IPS cambio punto atención EPS Sura ProSalud',
    
    // Organización y estructura
    'sindicato': 'sindicato ProSalud afiliados partícipes',
    'contrato sindical': 'contrato sindical ProSalud afiliados',
    'estatutos': 'estatutos beneficios sindicales ProSalud',
    'misión': 'misión visión ProSalud sindicato',
    'valores': 'valores principios ProSalud',
    'convenios': 'convenios hospitales instituciones ProSalud',
    
    // Contacto y ubicación
    'contacto': 'contacto teléfono correo dirección ProSalud',
    'telefono': 'teléfono contacto comunicación ProSalud',
    'correo': 'correo electrónico contacto ProSalud',
    'direccion': 'dirección ubicación sede ProSalud',
    'medellin': 'Caldas Antioquia sede ProSalud',
    'caldas': 'Caldas Antioquia sede ProSalud',
    
    // Seguridad y salud en el trabajo
    'sst': 'SST seguridad salud trabajo ProSalud',
    'emergencias': 'emergencias protocolo SST ProSalud',
    'accidente': 'accidente trabajo protocolo SST ProSalud',
    
    // Convenios específicos
    'comfenalco': 'Comfenalco convenio bienestar ProSalud',
    'hospital': 'hospital convenio institución ProSalud',
    'bello': 'Bello hospital Marco Fidel Suárez ProSalud',
    'rionegro': 'Rionegro hospital San Juan Dios ProSalud'
  };

  let expandedQuery = query.toLowerCase();
  
  // Buscar términos clave y expandir
  for (const [term, expansion] of Object.entries(expansions)) {
    if (expandedQuery.includes(term)) {
      expandedQuery += ' ' + expansion;
    }
  }
  
  // Siempre agregar ProSalud al contexto para mantener relevancia
  if (!expandedQuery.includes('prosalud')) {
    expandedQuery += ' ProSalud sindicato salud';
  }
  
  return expandedQuery;
}

/**
 * Recupera los N chunks más relevantes usando similitud de embeddings cosine.
 * Ahora con búsqueda expandida y múltiples estrategias.
 * @param query Texto de la pregunta del usuario
 * @param topK Número de bloques a devolver (default: 5, aumentado para mejor cobertura)
 * @returns Lista de objetos RelevantChunk
 */
export async function searchRelevantChunks(query: string, topK: number = 5): Promise<RelevantChunk[]> {
  try {
    logger.debug('Vector search query recibida', { queryLength: query.length });
    
    // Expandir la consulta con términos relacionados
    const expandedQuery = expandQuery(query);
    logger.debug('Vector search query expandida', { expandedLength: expandedQuery.length });
    
    logger.debug('Generando embedding para query expandida');
    const questionEmbedding = await getQuestionEmbedding(expandedQuery);
    
    logger.debug('Buscando chunks relevantes para vector search');
    // @ts-ignore - RPC function exists in database
    const { data, error } = await supabase.rpc("match_doc_chunks", {
      query_embedding: JSON.stringify(questionEmbedding),
      match_count: topK * 2 // Obtenemos más resultados para filtrar mejor
    }) as { data: RelevantChunk[] | null, error: any };

    if (error) {
      logger.error('Error en match_doc_chunks', error?.message || error);
      throw new Error(`Error en búsqueda vectorial: ${error.message}`);
    }

    let chunks = data || [];
    logger.debug('Chunks iniciales recuperados', { total: chunks.length });
    
    // Si no encontramos suficientes resultados con la query expandida, 
    // intentamos con la query original
    if (chunks.length < topK && expandedQuery !== query) {
      logger.debug('Buscando con query original como fallback');
      const originalEmbedding = await getQuestionEmbedding(query);
      
      // @ts-ignore - RPC function exists in database
      const { data: fallbackData, error: fallbackError } = await supabase.rpc("match_doc_chunks", {
        query_embedding: JSON.stringify(originalEmbedding),
        match_count: topK
      }) as { data: RelevantChunk[] | null, error: any };
      
      if (!fallbackError && fallbackData) {
        // Combinar resultados y eliminar duplicados
        const combinedChunks = [...chunks, ...fallbackData];
        const uniqueChunks = combinedChunks.filter((chunk, index, self) => 
          index === self.findIndex(c => c.id === chunk.id)
        );
        chunks = uniqueChunks;
      }
    }
    
    // Filtrar chunks por relevancia mínima (más permisivo)
    const relevantChunks = chunks.filter(chunk => {
      // Umbral más bajo para ser más inclusivo
      const minSimilarity = 0.65; // Reducido de 0.75 para ser más inclusivo
      return chunk.similarity >= minSimilarity;
    });
    
    // Filtrar explícitamente autenticacion.md si la query es sobre actualizar datos personales
    const queryLower = query.toLowerCase();
    const isAboutDataUpdate = queryLower.includes('actualizar datos') || 
                              queryLower.includes('cambiar datos bancarios') || 
                              queryLower.includes('actualizar cuenta bancaria') ||
                              queryLower.includes('datos personales');
    
    const filteredChunks = isAboutDataUpdate 
      ? relevantChunks.filter(chunk => !chunk.doc_path.includes('autenticacion.md'))
      : relevantChunks;
    
    // Si después del filtrado tenemos pocos resultados, usar todos los disponibles
    const finalChunks = filteredChunks.length >= 2 ? filteredChunks : (isAboutDataUpdate ? filteredChunks : chunks);
    
    // Limitar al número solicitado pero garantizar diversidad de fuentes
    const diverseChunks = diversifyChunks(finalChunks.slice(0, topK));
    
    logger.debug('Chunks relevantes preparados', {
      total: diverseChunks.length,
      fuentes: [...new Set(diverseChunks.map((c) => c.doc_path))],
    });
    
    return diverseChunks;
  } catch (error) {
    logger.error('Error en searchRelevantChunks', error instanceof Error ? error.message : error);
    // Fallback: devolver array vacío para que la consulta continúe sin contexto específico
    return [];
  }
}

/**
 * Diversifica los chunks para incluir información de diferentes fuentes cuando sea posible
 */
function diversifyChunks(chunks: RelevantChunk[]): RelevantChunk[] {
  if (chunks.length <= 3) return chunks;
  
  const diversified: RelevantChunk[] = [];
  const usedPaths = new Set<string>();
  
  // Primero, tomar el chunk más relevante de cada archivo único
  for (const chunk of chunks) {
    if (!usedPaths.has(chunk.doc_path)) {
      diversified.push(chunk);
      usedPaths.add(chunk.doc_path);
    }
  }
  
  // Luego, llenar con los chunks restantes más relevantes
  for (const chunk of chunks) {
    if (diversified.length >= 5) break; // Límite máximo
    if (!diversified.find(c => c.id === chunk.id)) {
      diversified.push(chunk);
    }
  }
  
  return diversified;
}
