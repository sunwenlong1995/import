import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { executeParse, RawSheetData } from '@/lib/parser/engine';
import { memoryStore } from '@/lib/memory-store';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileData, fileName, ruleId } = body;

    if (!fileData || !fileName || !ruleId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch rule from memory store
    const rule = memoryStore.getRule(ruleId);
    if (!rule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    // Decode base64 file
    const buffer = Buffer.from(fileData, 'base64');
    const ext = fileName.split('.').pop()?.toLowerCase();

    let sheets: RawSheetData[] = [];
    let rawText = '';

    if (ext === 'xlsx' || ext === 'xls') {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: '',
          raw: false,
        }) as string[][];
        const rows = jsonData.map(row => row.map(cell => String(cell ?? '').trim()));
        sheets.push({ sheetName, rows });
        rawText += `--- Sheet: ${sheetName} ---\n`;
        rawText += rows.map(r => r.join('\t')).join('\n') + '\n\n';
      }
    } else if (ext === 'docx' || ext === 'doc') {
      try {
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({ buffer });
        rawText = result.value;
        sheets = [{ sheetName: 'Document', rows: rawText.split('\n').map(l => [l]) }];
      } catch (e) {
        return NextResponse.json({ error: 'Word file parsing failed' }, { status: 500 });
      }
    } else if (ext === 'pdf') {
      try {
        const pdfParse = (await import('pdf-parse')).default;
        const pdfResult = await pdfParse(buffer);
        rawText = pdfResult.text;
        sheets = [{ sheetName: 'PDF', rows: rawText.split('\n').map(l => [l]) }];
      } catch (e) {
        return NextResponse.json({ error: 'PDF file parsing failed' }, { status: 500 });
      }
    } else {
      return NextResponse.json({ error: 'Unsupported file format' }, { status: 400 });
    }

    // Execute parse (engine already validates records and checks duplicates)
    const records = executeParse({
      rule,
      sheets,
      rawText,
      fileName,
    });

    const stats = {
      total: records.length,
      success: records.filter(r => r.errors.length === 0).length,
      failed: records.filter(r => r.errors.length > 0).length,
    };

    return NextResponse.json({
      records,
      errors: records
        .filter(r => r.errors.length > 0)
        .map(r => ({ row: r.rowIndex, message: r.errors.map(e => `${e.field}: ${e.message}`).join('; ') })),
      stats,
    });
  } catch (error) {
    console.error('Parse error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Parse failed' },
      { status: 500 }
    );
  }
}
