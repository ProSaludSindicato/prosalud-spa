
import * as XLSX from 'xlsx';
import { ReportData, ReportType } from '../types/reportTypes';

const formatNumber = (value: number) => new Intl.NumberFormat('es-CO').format(value);

const translateRequestStatus = (status: string) => {
  switch (status) {
    case 'pending':
      return 'Pendiente';
    case 'approved':
      return 'Aprobada';
    case 'preparing':
      return 'Preparando';
    case 'shipped':
      return 'Enviada';
    case 'delivered':
      return 'Entregada';
    case 'rejected':
      return 'Rechazada';
    default:
      return status;
  }
};

const translateDeliveryStatus = (status: string) => {
  switch (status) {
    case 'pending':
      return 'Pendiente';
    case 'received':
      return 'Recibida';
    case 'completed':
      return 'Completada';
    default:
      return status;
  }
};

export const generateExcelReport = (data: ReportData, reportType: ReportType): XLSX.WorkBook => {
  const wb = XLSX.utils.book_new();
  
  const summaryRows = [
    ['REPORTE DE INVENTARIO PROSALUD'],
    [`Fecha de generación: ${data.metadata.generatedAt}`],
    [`ID del Reporte: ${data.metadata.reportId}`],
    [`Tipo de Reporte: ${
      reportType === 'strategic' ? 'Estratégico' : reportType === 'operational' ? 'Operacional' : 'Stock Crítico'
    }`],
    data.metadata.dateRange ? [`Período: ${data.metadata.dateRange.start} - ${data.metadata.dateRange.end}`] : [],
    [''],
    ['RESUMEN GENERAL'],
    ['Métrica', 'Valor'],
    ['Total de categorías activas', formatNumber(data.summary.totalCategories)],
    ['Total de productos (SKU únicos)', formatNumber(data.summary.totalProducts)],
    ['Total de variantes', formatNumber(data.summary.totalVariants)],
    ['Unidades en stock', formatNumber(data.summary.totalStock)],
    ['Variantes con stock bajo', formatNumber(data.summary.lowStockCount)],
    ['Variantes con stock crítico', formatNumber(data.summary.criticalStockCount)],
    ['Solicitudes pendientes', formatNumber(data.summary.pendingHospitalRequests)],
    ['Solicitudes en preparación', formatNumber(data.summary.preparingHospitalRequests)],
    ['Solicitudes enviadas', formatNumber(data.summary.shippedHospitalRequests)],
    ['Solicitudes entregadas', formatNumber(data.summary.deliveredHospitalRequests)],
    ['Solicitudes rechazadas', formatNumber(data.summary.rejectedHospitalRequests)],
    ['Entregas pendientes', formatNumber(data.summary.pendingDeliveries)],
  ].filter((row) => row.length > 0);

  const summaryWs = XLSX.utils.aoa_to_sheet(summaryRows);
  summaryWs['!cols'] = [{ wch: 35 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Resumen');

  const detailStartRow = 4;
  const detailRows = [
    ['DETALLE DE INVENTARIO'],
    [''],
    ['Categoría', 'SKU', 'Producto / Variante', 'Stock', 'Mínimo', 'Máximo', 'Estado', 'Solicitudes pendientes', 'Hospitales pendientes', 'Última solicitud'],
    ];

  data.categories.forEach((category) => {
    category.products.forEach((product) => {
      detailRows.push([
          category.name,
          product.sku,
          product.name,
        product.stock,
        product.min,
        product.max,
        product.status === 'ok' ? 'Óptimo' : product.status === 'low' ? 'Bajo' : 'Crítico',
        product.pendingRequests,
        product.pendingHospitals.join(', ') || '—',
        product.lastRequestDate ? new Date(product.lastRequestDate).toLocaleString('es-CO') : '—',
        ]);
      });
    });

  const detailWs = XLSX.utils.aoa_to_sheet(detailRows);
  detailWs['!cols'] = [
    { wch: 28 },
    { wch: 18 },
    { wch: 45 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 16 },
    { wch: 20 },
    { wch: 32 },
    { wch: 22 },
  ];
  const detailHeaderRow = detailStartRow - 1;
  detailWs['!autofilter'] = {
    ref: `A${detailHeaderRow}:J${detailRows.length}`,
    filterCols: [0, 2, 3, 4, 5, 6, 7, 8, 9],
  } as any;
  XLSX.utils.book_append_sheet(wb, detailWs, 'Inventario');

  const lowStockStartRow = 4;
  const lowStockRows = [
    ['VARIANTES CON STOCK CRÍTICO O BAJO'],
    [''],
    ['Categoría', 'SKU', 'Producto / Variante', 'Stock', 'Mínimo', 'Estado', 'Solicitudes pendientes', 'Hospitales'],
  ];

  data.categories.forEach((category) => {
    category.products
      .filter((product) => product.status === 'low' || product.status === 'critical')
      .forEach((product) => {
        lowStockRows.push([
          category.name,
          product.sku,
          product.name,
          product.stock,
          product.min,
          product.status === 'low' ? 'Stock bajo' : 'Stock crítico',
          product.pendingRequests,
          product.pendingHospitals.join(', ') || '—',
        ]);
      });
  });

  const lowStockWs = XLSX.utils.aoa_to_sheet(lowStockRows);
  lowStockWs['!cols'] = [
    { wch: 28 },
    { wch: 18 },
    { wch: 45 },
    { wch: 12 },
    { wch: 12 },
    { wch: 18 },
    { wch: 18 },
    { wch: 32 },
  ];
  const lowStockHeaderRow = lowStockStartRow - 1;
  lowStockWs['!autofilter'] = {
    ref: `A${lowStockHeaderRow}:H${lowStockRows.length}`,
    filterCols: [0, 2, 3, 4, 5, 6, 7],
  } as any;
  XLSX.utils.book_append_sheet(wb, lowStockWs, 'Stock Bajo');

  if (data.requests.length > 0) {
    const requestStartRow = 4;
    const requestRows = [
      ['SOLICITUDES DE HOSPITALES'],
      [''],
      ['ID', 'Hospital', 'Coordinador', 'Fecha creación', 'Estado', 'Total ítems', 'Ítems pendientes', 'Última actualización'],
    ];

    data.requests.forEach((request) => {
      requestRows.push([
        request.id,
        request.hospital,
        request.coordinator ?? '—',
        new Date(request.createdAt).toLocaleString('es-CO'),
        translateRequestStatus(request.status),
        request.totalItems,
        request.pendingItems,
        new Date(request.lastUpdate).toLocaleString('es-CO'),
      ]);
    });

    const requestWs = XLSX.utils.aoa_to_sheet(requestRows);
    requestWs['!cols'] = [
      { wch: 18 },
      { wch: 36 },
      { wch: 26 },
      { wch: 24 },
      { wch: 16 },
      { wch: 16 },
      { wch: 18 },
      { wch: 24 },
    ];
    const requestHeaderRow = requestStartRow - 1;
    requestWs['!autofilter'] = {
      ref: `A${requestHeaderRow}:H${requestRows.length}`,
      filterCols: [1, 4, 5, 6, 7],
    } as any;
    XLSX.utils.book_append_sheet(wb, requestWs, 'Solicitudes');
  }

  if (data.deliveries.length > 0) {
    const deliveryStartRow = 4;
    const deliveryRows = [
      ['ENTREGAS DE PROVEEDORES'],
      [''],
      ['ID', 'Proveedor', 'Fecha', 'Total ítems', 'Estado', 'Productos'],
    ];

    data.deliveries.forEach((delivery) => {
      deliveryRows.push([
        delivery.id,
        delivery.supplier,
        new Date(delivery.date).toLocaleDateString('es-ES'),
        delivery.totalItems,
        translateDeliveryStatus(delivery.status),
        delivery.products.join(', ') || '—',
      ]);
    });

    const deliveryWs = XLSX.utils.aoa_to_sheet(deliveryRows);
    deliveryWs['!cols'] = [
      { wch: 18 },
      { wch: 32 },
      { wch: 18 },
      { wch: 14 },
      { wch: 16 },
      { wch: 60 },
    ];
    const deliveryHeaderRow = deliveryStartRow - 1;
    deliveryWs['!autofilter'] = {
      ref: `A${deliveryHeaderRow}:F${deliveryRows.length}`,
      filterCols: [1, 4, 5],
    } as any;
    XLSX.utils.book_append_sheet(wb, deliveryWs, 'Entregas');
  }

  return wb;
};
