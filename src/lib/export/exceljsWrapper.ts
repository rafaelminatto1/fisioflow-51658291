/**
 * ExcelJS wrapper that provides xlsx-compatible API
 * This allows us to use exceljs (secure) without rewriting all calling code
 */


// Types to match xlsx API

import ExcelJS from 'exceljs';

export interface WorkSheet {
  [key: string]: any;
  '!cols'?: ColInfo[];
  '!ref'?: string;
}

export interface ColInfo {
  wch?: number;
  wpx?: number;
  width?: number;
}

export interface WorkBook {
  SheetNames: string[];
  Sheets: Record<string, WorkSheet>;
}

export interface Utils {
  book_new(): WorkBook;
  aoa_to_sheet(data: any[][]): WorkSheet;
  sheet_to_json<T>(sheet: WorkSheet): T[];
  book_append_sheet(wb: WorkBook, ws: WorkSheet, name: string): void;
}

class ExcelJSUtils implements Utils {
  book_new(): WorkBook {
    return {
      SheetNames: [],
      Sheets: {}
    };
  }

  aoa_to_sheet(data: any[][]): WorkSheet {
    const sheet: WorkSheet = {};
    const range = { s: { c: 0, r: 0 }, e: { c: 0, r: 0 } };

    data.forEach((row, r) => {
      row.forEach((cell, c) => {
        const cellRef = this.encodeCell(c, r);
        sheet[cellRef] = { v: cell, t: typeof cell === 'number' ? 'n' : 's' };

        if (c > range.e.c) range.e.c = c;
        if (r > range.e.r) range.e.r = r;
      });
    });

    sheet['!ref'] = this.encodeRange(range);
    return sheet;
  }

  sheet_to_json<T>(sheet: WorkSheet): T[] {
    const result: T[] = [];
    const ref = sheet['!ref'];
    if (!ref) return result;

    const range = this.decodeRange(ref);
    const headers: string[] = [];

    // Get headers from first row
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cellRef = this.encodeCell(c, range.s.r);
      const cell = sheet[cellRef];
      headers.push(String(cell?.v || `Column${c}`));
    }

    // Convert rows to objects
    for (let r = range.s.r + 1; r <= range.e.r; r++) {
      const row: any = {};
      let hasData = false;
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cellRef = this.encodeCell(c, r);
        const cell = sheet[cellRef];
        if (cell !== undefined && cell.v !== undefined && cell.v !== '') {
          row[headers[c]] = cell.v;
          hasData = true;
        }
      }
      if (hasData) {
        result.push(row);
      }
    }

    return result;
  }

  book_append_sheet(wb: WorkBook, ws: WorkSheet, name: string): void {
    const safeName = name.replace(/[\\/?*\u005B\u005D]/g, '').slice(0, 31);
    wb.SheetNames.push(safeName);
    wb.Sheets[safeName] = ws;
  }

  private encodeCell(c: number, r: number): string {
    return this.encodeCol(c) + (r + 1);
  }

  private encodeCol(c: number): string {
    let s = '';
    ++c;
    for (; c > 0; c = Math.floor(c / 26)) {
      s = String.fromCharCode(((c - 1) % 26) + 65) + s;
    }
    return s;
  }

  private encodeRange(range: { s: { c: number; r: number }; e: { c: number; r: number } }): string {
    return this.encodeCell(range.s.c, range.s.r) + ':' + this.encodeCell(range.e.c, range.e.r);
  }

  private decodeRange(ref: string): { s: { c: number; r: number }; e: { c: number; r: number } } {
    const parts = ref.split(':');
    return {
      s: this.decodeCell(parts[0]),
      e: this.decodeCell(parts[1] || parts[0])
    };
  }

  private decodeCell(cell: string): { c: number; r: number } {
    const match = cell.match(/^([A-Z]+)(\d+)$/);
    if (!match) return { c: 0, r: 0 };

    const col = match[1];
    const row = parseInt(match[2], 10) - 1;

    let c = 0;
    for (let i = 0; i < col.length; i++) {
      c = c * 26 + (col.charCodeAt(i) - 64);
    }

    return { c: c - 1, r: row };
  }
}

export const utils = new ExcelJSUtils();

/**
 * Read an Excel file from buffer/binary string
 */
export async function read(data: ArrayBuffer | string, options?: { type?: 'buffer' | 'binary' }): Promise<WorkBook> {
  const workbook = new ExcelJS.Workbook();
  const buffer = options?.type === 'binary' && typeof data === 'string'
    ? new TextEncoder().encode(data).buffer
    : data as ArrayBuffer;

  await workbook.xlsx.load(buffer);

  // Convert to xlsx-compatible format
  const result: WorkBook = {
    SheetNames: [],
    Sheets: {}
  };

  for (const sheetName of workbook.worksheets) {
    result.SheetNames.push(sheetName.name);
    result.Sheets[sheetName.name] = convertWorksheetToXlsxFormat(sheetName);
  }

  return result;
}

/**
 * Write workbook to file
 */
export async function writeFile(wb: WorkBook, filename: string): Promise<void> {
  const workbook = new ExcelJS.Workbook();

  for (const sheetName of wb.SheetNames) {
    const worksheet = workbook.addWorksheet(sheetName);
    const sheet = wb.Sheets[sheetName];

    // Convert xlsx sheet format to ExcelJS worksheet
    if (sheet['!ref']) {
      const range = decodeRangeValue(sheet['!ref']);
      for (let r = range.s.r; r <= range.e.r; r++) {
        for (let c = range.s.c; c <= range.e.c; c++) {
          const cellRef = encodeCell(c, r);
          const cell = sheet[cellRef];
          if (cell) {
            const excelCol = excelEncodeCol(c);
            const excelRow = r + 1;
            if (cell.t === 'n') {
              worksheet.getCell(`${excelCol}${excelRow}`).value = cell.v;
            } else {
              worksheet.getCell(`${excelCol}${excelRow}`).value = String(cell.v || '');
            }
          }
        }
      }
    }

    // Set column widths
    if (sheet['!cols']) {
      sheet['!cols'].forEach((colInfo, index) => {
        if (colInfo.wch) {
          const col = worksheet.getColumn(index + 1);
          col.width = colInfo.wch;
        }
      });
    }
  }

  // Write file
  await workbook.xlsx.writeBuffer().then(buffer => {
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  });
}

function convertWorksheetToXlsxFormat(worksheet: ExcelJS.Worksheet): WorkSheet {
  const sheet: WorkSheet = {};
  const colCount = worksheet.columnCount;
  const rowCount = worksheet.rowCount;

  const range = {
    s: { c: 0, r: 0 },
    e: { c: Math.max(colCount - 1, 0), r: Math.max(rowCount - 1, 0) }
  };

  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell, colNumber) => {
      const c = colNumber - 1;
      const r = rowNumber - 1;
      const cellRef = encodeCell(c, r);

      const value = cell.value;
      let cellData: any;

      if (typeof value === 'number') {
        cellData = { v: value, t: 'n' };
      } else if (value instanceof Date) {
        cellData = { v: value.toISOString(), t: 's' };
      } else {
        cellData = { v: String(value ?? ''), t: 's' };
      }

      sheet[cellRef] = cellData;

      if (c > range.e.c) range.e.c = c;
      if (r > range.e.r) range.e.r = r;
    });
  });

  // Column widths
  const cols: ColInfo[] = [];
  worksheet.columns.forEach((col, index) => {
    if (col.width) {
      cols[index] = { wch: col.width };
    }
  });
  if (cols.length > 0) {
    sheet['!cols'] = cols;
  }

  sheet['!ref'] = encodeRangeValue(range);
  return sheet;
}

function encodeCell(c: number, r: number): string {
  return excelEncodeCol(c) + (r + 1);
}

function excelEncodeCol(c: number): string {
  let s = '';
  ++c;
  for (; c > 0; c = Math.floor(c / 26)) {
    s = String.fromCharCode(((c - 1) % 26) + 65) + s;
  }
  return s;
}

function encodeRangeValue(range: { s: { c: number; r: number }; e: { c: number; r: number } }): string {
  return encodeCell(range.s.c, range.s.r) + ':' + encodeCell(range.e.c, range.e.r);
}

function decodeRangeValue(ref: string): { s: { c: number; r: number }; e: { c: number; r: number } } {
  const parts = ref.split(':');
  return {
    s: decodeCellValue(parts[0]),
    e: decodeCellValue(parts[1] || parts[0])
  };
}

function decodeCellValue(cell: string): { c: number; r: number } {
  const match = cell.match(/^([A-Z]+)(\d+)$/);
  if (!match) return { c: 0, r: 0 };

  const col = match[1];
  const row = parseInt(match[2], 10) - 1;

  let c = 0;
  for (let i = 0; i < col.length; i++) {
    c = c * 26 + (col.charCodeAt(i) - 64);
  }

  return { c: c - 1, r: row };
}

// Export a default object that mimics xlsx module
const XLSXCompat = {
  read,
  writeFile,
  utils
};

export default XLSXCompat;
