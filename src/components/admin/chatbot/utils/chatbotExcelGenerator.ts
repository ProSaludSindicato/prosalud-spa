import * as XLSX from 'xlsx';
import { ChatbotConversation } from '@/types/chatbot';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { logger } from '@/utils/logger';

interface DateRangeFilter {
  includeAll: boolean;
  start?: Date;
  end?: Date;
}

export const generateChatbotExcelReport = (
  conversations: ChatbotConversation[], 
  dateRange: DateRangeFilter
): XLSX.WorkBook => {
  logger.debug('Generando reporte Excel del chatbot', { total: conversations.length });
  
  try {
    const wb = XLSX.utils.book_new();
    
    // Calcular métricas
    const totalMessages = conversations.length;
    const uniqueConversations = new Set(
      conversations.map(c => c.conversation_id).filter(Boolean)
    ).size;
    const likesCount = conversations.filter(c => c.feedback === 'like').length;
    const dislikesCount = conversations.filter(c => c.feedback === 'dislike').length;
    const noFeedbackCount = conversations.filter(c => !c.feedback).length;
    const feedbackRate = totalMessages > 0 
      ? ((likesCount + dislikesCount) / totalMessages * 100).toFixed(1)
      : '0';

    // 1. HOJA DE RESUMEN
    const summaryData = [
      ['REPORTE DE CONVERSACIONES CHATBOT PROSALUD'],
      [`Fecha de generación: ${format(new Date(), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}`],
      ...(dateRange.includeAll ? [] : [[`Período: ${dateRange.start ? format(dateRange.start, 'dd/MM/yyyy', { locale: es }) : 'N/A'} - ${dateRange.end ? format(dateRange.end, 'dd/MM/yyyy', { locale: es }) : 'N/A'}`]]),
      [''],
      ['MÉTRICAS GENERALES'],
      ['Métrica', 'Valor'],
      ['Total de mensajes', totalMessages.toString()],
      ['Conversaciones únicas', uniqueConversations.toString()],
      ['Promedio mensajes/conversación', uniqueConversations > 0 ? (totalMessages / uniqueConversations).toFixed(1) : '0'],
      [''],
      ['FEEDBACK DE USUARIOS'],
      ['Tipo', 'Cantidad', 'Porcentaje'],
      ['👍 Me gusta', likesCount.toString(), `${totalMessages > 0 ? ((likesCount / totalMessages) * 100).toFixed(1) : '0'}%`],
      ['👎 No me gusta', dislikesCount.toString(), `${totalMessages > 0 ? ((dislikesCount / totalMessages) * 100).toFixed(1) : '0'}%`],
      ['Sin feedback', noFeedbackCount.toString(), `${totalMessages > 0 ? ((noFeedbackCount / totalMessages) * 100).toFixed(1) : '0'}%`],
      ['Tasa de feedback', `${feedbackRate}%`, ''],
      [''],
      ['SATISFACCIÓN'],
      ['Indicador', 'Valor'],
      ['Ratio positivo/negativo', dislikesCount > 0 ? (likesCount / dislikesCount).toFixed(2) : likesCount > 0 ? '∞' : '0'],
      ['Satisfacción (%)', likesCount + dislikesCount > 0 ? `${((likesCount / (likesCount + dislikesCount)) * 100).toFixed(1)}%` : 'N/A']
    ];

    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
    
    // Aplicar estilos a la hoja de resumen
    const summaryRange = XLSX.utils.decode_range(summaryWs['!ref'] || 'A1');
    for (let R = summaryRange.s.r; R <= summaryRange.e.r; ++R) {
      for (let C = summaryRange.s.c; C <= summaryRange.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        if (!summaryWs[cellAddress]) continue;
        
        // Encabezados en negrita
        if (R === 0 || R === 4 || R === 10 || R === 17) {
          summaryWs[cellAddress].s = {
            font: { bold: true, sz: 14 },
            alignment: { horizontal: 'center' }
          };
        }
      }
    }
    
    // Ajustar ancho de columnas
    summaryWs['!cols'] = [
      { wch: 35 },
      { wch: 20 },
      { wch: 15 }
    ];

    XLSX.utils.book_append_sheet(wb, summaryWs, 'Resumen');

    // 2. HOJA DE CONVERSACIONES DETALLADAS
    const detailData = [
      ['ID', 'Conversation ID', 'Pregunta del Usuario', 'Respuesta del Bot', 'Feedback', 'IP Usuario', 'User Agent', 'Fecha y Hora', 'Metadata']
    ];

    conversations.forEach(conv => {
      detailData.push([
        conv.id.toString(),
        conv.conversation_id || 'N/A',
        conv.user_question,
        conv.bot_answer,
        conv.feedback ? (conv.feedback === 'like' ? '👍 Me gusta' : '👎 No me gusta') : 'Sin feedback',
        conv.user_ip || 'N/A',
        conv.user_agent || 'N/A',
        format(parseISO(conv.created_at), "dd/MM/yyyy HH:mm:ss", { locale: es }),
        conv.metadata ? JSON.stringify(conv.metadata) : 'N/A'
      ]);
    });

    const detailWs = XLSX.utils.aoa_to_sheet(detailData);
    
    // Ajustar ancho de columnas para mejor legibilidad
    detailWs['!cols'] = [
      { wch: 8 },   // ID
      { wch: 20 },  // Conversation ID
      { wch: 50 },  // Pregunta
      { wch: 50 },  // Respuesta
      { wch: 15 },  // Feedback
      { wch: 15 },  // IP
      { wch: 30 },  // User Agent
      { wch: 18 },  // Fecha
      { wch: 30 }   // Metadata
    ];

    XLSX.utils.book_append_sheet(wb, detailWs, 'Conversaciones Detalladas');

    // 3. HOJA DE ANÁLISIS TEMPORAL
    const messagesByDate: { [key: string]: number } = {};
    conversations.forEach(conv => {
      const dateKey = format(parseISO(conv.created_at), 'dd/MM/yyyy', { locale: es });
      messagesByDate[dateKey] = (messagesByDate[dateKey] || 0) + 1;
    });

    const temporalData = [
      ['ANÁLISIS TEMPORAL DE MENSAJES'],
      [''],
      ['Fecha', 'Cantidad de Mensajes']
    ];

    Object.entries(messagesByDate)
      .sort((a, b) => {
        const [dayA, monthA, yearA] = a[0].split('/').map(Number);
        const [dayB, monthB, yearB] = b[0].split('/').map(Number);
        const dateA = new Date(yearA, monthA - 1, dayA);
        const dateB = new Date(yearB, monthB - 1, dayB);
        return dateA.getTime() - dateB.getTime();
      })
      .forEach(([date, count]) => {
        temporalData.push([date, count.toString()]);
      });

    const temporalWs = XLSX.utils.aoa_to_sheet(temporalData);
    temporalWs['!cols'] = [
      { wch: 15 },
      { wch: 20 }
    ];

    XLSX.utils.book_append_sheet(wb, temporalWs, 'Análisis Temporal');

    // 4. HOJA DE TEMAS MÁS CONSULTADOS
    const topicKeywords = {
      'Incapacidades': ['incapacidad', 'incapacidades', 'licencia', 'eps', 'arl'],
      'Certificados': ['certificado', 'certificados', 'constancia'],
      'Contacto': ['teléfono', 'correo', 'contacto', 'dirección'],
      'Convenios': ['convenio', 'convenios', 'descuento', 'beneficio'],
      'Servicios': ['servicio', 'servicios', 'trámite', 'solicitud'],
      'Bienestar': ['bienestar', 'evento', 'actividad', 'recreación'],
      'Normatividad': ['norma', 'ley', 'estatuto', 'reglamento']
    };

    const topicCounts: { [key: string]: number } = {};
    Object.keys(topicKeywords).forEach(topic => {
      topicCounts[topic] = 0;
    });
    topicCounts['Otros'] = 0;

    conversations.forEach(conv => {
      const question = conv.user_question.toLowerCase();
      let matched = false;

      for (const [topic, keywords] of Object.entries(topicKeywords)) {
        if (keywords.some(keyword => question.includes(keyword))) {
          topicCounts[topic]++;
          matched = true;
          break;
        }
      }

      if (!matched) {
        topicCounts['Otros']++;
      }
    });

    const topicsData = [
      ['TEMAS MÁS CONSULTADOS'],
      [''],
      ['Tema', 'Cantidad', 'Porcentaje']
    ];

    Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([topic, count]) => {
        const percentage = totalMessages > 0 ? ((count / totalMessages) * 100).toFixed(1) : '0';
        topicsData.push([topic, count.toString(), `${percentage}%`]);
      });

    const topicsWs = XLSX.utils.aoa_to_sheet(topicsData);
    topicsWs['!cols'] = [
      { wch: 20 },
      { wch: 12 },
      { wch: 12 }
    ];

    XLSX.utils.book_append_sheet(wb, topicsWs, 'Temas Consultados');

    // 5. HOJA DE PREGUNTAS FRECUENTES
    const questionCounts: { [key: string]: number } = {};
    conversations.forEach(conv => {
      const normalizedQuestion = conv.user_question.toLowerCase().trim();
      questionCounts[normalizedQuestion] = (questionCounts[normalizedQuestion] || 0) + 1;
    });

    const faqData = [
      ['PREGUNTAS MÁS FRECUENTES (TOP 20)'],
      [''],
      ['#', 'Pregunta', 'Veces Consultada']
    ];

    Object.entries(questionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .forEach(([question, count], index) => {
        faqData.push([
          (index + 1).toString(),
          question.charAt(0).toUpperCase() + question.slice(1),
          count.toString()
        ]);
      });

    const faqWs = XLSX.utils.aoa_to_sheet(faqData);
    faqWs['!cols'] = [
      { wch: 5 },
      { wch: 60 },
      { wch: 15 }
    ];

    XLSX.utils.book_append_sheet(wb, faqWs, 'Preguntas Frecuentes');

    // 6. HOJA DE FEEDBACK DETALLADO
    const feedbackConversations = conversations.filter(c => c.feedback);
    
    const feedbackData = [
      ['FEEDBACK DETALLADO DE USUARIOS'],
      [''],
      ['ID', 'Fecha', 'Pregunta', 'Respuesta', 'Feedback', 'Conversation ID']
    ];

    feedbackConversations.forEach(conv => {
      feedbackData.push([
        conv.id.toString(),
        format(parseISO(conv.created_at), "dd/MM/yyyy HH:mm", { locale: es }),
        conv.user_question,
        conv.bot_answer,
        conv.feedback === 'like' ? '👍 Positivo' : '👎 Negativo',
        conv.conversation_id || 'N/A'
      ]);
    });

    const feedbackWs = XLSX.utils.aoa_to_sheet(feedbackData);
    feedbackWs['!cols'] = [
      { wch: 8 },
      { wch: 18 },
      { wch: 40 },
      { wch: 40 },
      { wch: 12 },
      { wch: 20 }
    ];

    XLSX.utils.book_append_sheet(wb, feedbackWs, 'Feedback Detallado');

    logger.debug('Reporte Excel del chatbot generado exitosamente');
    return wb;
  } catch (error) {
    logger.error('Error generando reporte Excel del chatbot', error instanceof Error ? error.message : error);
    throw new Error('Failed to generate chatbot Excel report: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
};
