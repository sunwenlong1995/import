import * as XLSX from 'xlsx';
import { ParsedRecord, WAYBILL_FIELDS } from '@/types';

export function exportToExcel(records: ParsedRecord[], fileName: string = '导出数据'): void {
  const headers = WAYBILL_FIELDS.map(f => f.label);
  const data = records.map(record =>
    WAYBILL_FIELDS.map(f => (record as any)[f.key] ?? '')
  );

  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);

  // Set column widths
  ws['!cols'] = WAYBILL_FIELDS.map(f => ({
    wch: Math.max(f.label.length * 2, 12),
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '运单数据');
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}
