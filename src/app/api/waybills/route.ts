import { NextRequest, NextResponse } from 'next/server';
import { memoryStore } from '@/lib/memory-store';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const externalCode = searchParams.get('externalCode') || '';
    const receiverName = searchParams.get('receiverName') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';

    const result = await memoryStore.getWaybills({
      externalCode: externalCode || undefined,
      receiverName: receiverName || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      page,
      pageSize,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to fetch waybills:', error);
    return NextResponse.json({ error: 'Failed to fetch waybills' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { records, batchId, fileName } = body;

    const waybillData = records.map((r: any) => ({
      id: crypto.randomUUID(),
      externalCode: r.externalCode || '',
      storeName: r.storeName || '',
      receiverName: r.receiverName || '',
      receiverPhone: r.receiverPhone || '',
      receiverAddress: r.receiverAddress || '',
      skuCode: r.skuCode || '',
      skuName: r.skuName || '',
      skuQuantity: r.skuQuantity || 0,
      skuSpec: r.skuSpec || '',
      remark: r.remark || '',
      batchId: batchId,
      submittedAt: new Date().toISOString(),
    }));

    await memoryStore.addWaybills(waybillData);

    return NextResponse.json({
      success: waybillData.length,
      failed: 0,
      batchId,
    });
  } catch (error) {
    console.error('Failed to create waybills:', error);
    return NextResponse.json({ error: 'Failed to create waybills' }, { status: 500 });
  }
}
