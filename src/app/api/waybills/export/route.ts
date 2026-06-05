import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { memoryStore } from '@/lib/memory-store';
import { WAYBILL_FIELDS } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids } = body;

    const { waybills: data } = await memoryStore.getWaybills({ pageSize: 10000 });

    const headers = WAYBILL_FIELDS.map(f => f.label);
    const rows = data.map(record =>
      WAYBILL_FIELDS.map(f => (record as any)[f.key] ?? '')
    );

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = WAYBILL_FIELDS.map(f => ({ wch: Math.max(f.label.length * 2, 12) }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '运单数据');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename=waybills_export.xlsx',
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
