import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';

describe('xlsx (SheetJS) compatibilidad con los generadores de reportes', () => {
  it('usa la versión corregida de SheetJS', () => {
    const [major, minor, patch] = XLSX.version.split('.').map(Number);
    expect(major).toBe(0);
    expect(minor * 100 + patch).toBeGreaterThanOrEqual(2002);
  });

  it('genera y vuelve a leer un libro con aoa_to_sheet, book_new y book_append_sheet', () => {
    const rows = [
      ['Cédula', 'Nombre', 'Votos'],
      ['1001', 'Ana Pérez', 12],
      ['1002', 'Luis Gómez', 0],
    ];
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Resumen');

    const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
    const reread = XLSX.read(buffer, { type: 'array' });

    expect(reread.SheetNames).toEqual(['Resumen']);
    expect(XLSX.utils.sheet_to_json(reread.Sheets.Resumen, { header: 1 })).toEqual(rows);
  });

  it('mantiene encode_cell y decode_range', () => {
    expect(XLSX.utils.encode_cell({ r: 2, c: 1 })).toBe('B3');
    expect(XLSX.utils.decode_range('A1:C4')).toEqual({ s: { r: 0, c: 0 }, e: { r: 3, c: 2 } });
  });

  it('expone writeFile para las descargas', () => {
    expect(typeof XLSX.writeFile).toBe('function');
  });
});
