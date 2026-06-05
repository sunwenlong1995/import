import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileData, fileName } = body;

    if (!fileData || !fileName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const buffer = Buffer.from(fileData, 'base64');
    const ext = fileName.split('.').pop()?.toLowerCase();

    if (ext === 'xlsx' || ext === 'xls') {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const result: any = {
        fileName,
        fileType: ext,
        sheetCount: workbook.SheetNames.length,
        sheetNames: workbook.SheetNames,
        sheets: {},
      };

      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: '',
          raw: false,
        }) as string[][];

        const rows = jsonData.map(row => row.map(cell => String(cell ?? '').trim()));
        const maxCols = Math.max(...rows.map(r => r.length), 0);

        result.sheets[sheetName] = {
          totalRows: rows.length,
          maxCols,
          // First 20 rows for preview
          preview: rows.slice(0, 20).map((row, idx) => ({
            rowIndex: idx,
            cells: row.slice(0, 15).map((cell, colIdx) => ({
              colIndex: colIdx,
              value: cell.slice(0, 50),
            })),
            totalCols: row.length,
          })),
          // Last 10 rows
          tail: rows.slice(-10).map((row, idx) => ({
            rowIndex: rows.length - 10 + idx,
            cells: row.map((cell, colIdx) => ({
              colIndex: colIdx,
              value: cell.slice(0, 80),
            })),
            totalCols: row.length,
          })),
        };
      }

      return NextResponse.json(result);
    } else if (ext === 'pdf') {
      try {
        const pdfParse = (await import('pdf-parse')).default;
        const pdfResult = await pdfParse(buffer);
        return NextResponse.json({
          fileName,
          fileType: ext,
          pageCount: pdfResult.numpages,
          textPreview: pdfResult.text.slice(0, 3000),
          textLength: pdfResult.text.length,
        });
      } catch (e) {
        return NextResponse.json({ error: 'PDF parsing failed: ' + (e as Error).message }, { status: 500 });
      }
    } else if (ext === 'docx' || ext === 'doc') {
      try {
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({ buffer });
        return NextResponse.json({
          fileName,
          fileType: ext,
          textPreview: result.value.slice(0, 3000),
          textLength: result.value.length,
        });
      } catch (e) {
        return NextResponse.json({ error: 'Word parsing failed: ' + (e as Error).message }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Unsupported file format' }, { status: 400 });
  } catch (error) {
    console.error('File preview error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Preview failed' },
      { status: 500 }
    );
  }
}
