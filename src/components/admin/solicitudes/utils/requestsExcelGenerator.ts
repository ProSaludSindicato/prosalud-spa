
import * as XLSX from 'xlsx';
import { Request } from '@/types/requests';
import { requestTypeLabels, statusLabels } from '@/data/requestsMock';
import { logger } from '@/utils/logger';

interface DateRangeFilter {
  includeAll: boolean;
  start?: Date;
  end?: Date;
}

export const generateRequestsExcelReport = (requests: Request[], dateRange: DateRangeFilter): XLSX.WorkBook => {
  logger.debug('Generando reporte de solicitudes', { total: requests.length });
  
  try {
    const wb = XLSX.utils.book_new();
    
    // Summary sheet
    const summaryData = [
      ['REPORTE DE SOLICITUDES PROSALUD'],
      [`Fecha de generación: ${new Date().toLocaleDateString('es-ES')}`],
      ...(dateRange.includeAll ? [] : [[`Período: ${dateRange.start?.toLocaleDateString('es-ES')} - ${dateRange.end?.toLocaleDateString('es-ES')}`]]),
      [''],
      ['RESUMEN GENERAL'],
      ['Métrica', 'Valor'],
      ['Total de solicitudes', requests.length.toString()],
      ['Solicitudes pendientes', requests.filter(r => r.status === 'pending').length.toString()],
      ['Solicitudes en proceso', requests.filter(r => r.status === 'in_progress').length.toString()],
      ['Solicitudes resueltas', requests.filter(r => r.status === 'resolved').length.toString()],
      ['Solicitudes rechazadas', requests.filter(r => r.status === 'rejected').length.toString()],
      [''],
      ['DISTRIBUCIÓN POR TIPO DE SOLICITUD'],
      ['Tipo', 'Cantidad']
    ];

    // Add requests by type
    const requestsByType: { [key: string]: number } = {};
    requests.forEach(request => {
      const typeLabel = requestTypeLabels[request.request_type] || 'Desconocido';
      requestsByType[typeLabel] = (requestsByType[typeLabel] || 0) + 1;
    });

    Object.entries(requestsByType).forEach(([type, count]) => {
      summaryData.push([type, count.toString()]);
    });

    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Resumen');

    // Detailed requests sheet
    const detailData = [
      ['Nombre', 'Apellido', 'Tipo ID', 'Número ID', 'Email', 'Teléfono', 'Tipo Solicitud', 'Estado', 'Fecha Creación', 'Fecha Procesamiento', 'Fecha Resolución']
    ];

    requests.forEach(request => {
      detailData.push([
        request.name || '',
        request.last_name || '',
        request.id_type || '',
        request.id_number || '',
        request.email || '',
        request.phone_number || '',
        requestTypeLabels[request.request_type] || 'Desconocido',
        statusLabels[request.status] || 'Desconocido',
        request.created_at ? new Date(request.created_at).toLocaleDateString('es-ES') : '',
        request.processed_at ? new Date(request.processed_at).toLocaleDateString('es-ES') : '',
        request.resolved_at ? new Date(request.resolved_at).toLocaleDateString('es-ES') : ''
      ]);
    });

    const detailWs = XLSX.utils.aoa_to_sheet(detailData);
    XLSX.utils.book_append_sheet(wb, detailWs, 'Detalle Solicitudes');

    // Statistics by type sheet
    const typeStatsData = [
      ['ESTADÍSTICAS POR TIPO DE SOLICITUD'],
      [''],
      ['Tipo', 'Total', 'Pendientes', 'En Proceso', 'Resueltas', 'Rechazadas']
    ];

    Object.entries(requestsByType).forEach(([type, total]) => {
      const typeRequests = requests.filter(r => (requestTypeLabels[r.request_type] || 'Desconocido') === type);
      const pending = typeRequests.filter(r => r.status === 'pending').length;
      const inProgress = typeRequests.filter(r => r.status === 'in_progress').length;
      const resolved = typeRequests.filter(r => r.status === 'resolved').length;
      const rejected = typeRequests.filter(r => r.status === 'rejected').length;

      typeStatsData.push([
        type,
        total.toString(),
        pending.toString(),
        inProgress.toString(),
        resolved.toString(),
        rejected.toString()
      ]);
    });

    const typeStatsWs = XLSX.utils.aoa_to_sheet(typeStatsData);
    XLSX.utils.book_append_sheet(wb, typeStatsWs, 'Estadísticas por Tipo');

    // Requests payload details (for specific request types)
    const payloadData = [
      ['DETALLES ESPECÍFICOS DE SOLICITUDES'],
      [''],
      ['ID Solicitud', 'Solicitante', 'Tipo', 'Detalles Específicos']
    ];

    requests.forEach(request => {
      const details = request.payload ? JSON.stringify(request.payload, null, 2) : 'Sin detalles';
      payloadData.push([
        request.id || '',
        `${request.name || ''} ${request.last_name || ''}`.trim(),
        requestTypeLabels[request.request_type] || 'Desconocido',
        details
      ]);
    });

    const payloadWs = XLSX.utils.aoa_to_sheet(payloadData);
    XLSX.utils.book_append_sheet(wb, payloadWs, 'Detalles Específicos');

    logger.info('Excel report generated successfully');
    return wb;
  } catch (error) {
    logger.error('Error generating Excel report:', error);
    throw new Error('Failed to generate Excel report: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
};
