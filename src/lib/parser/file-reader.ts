import * as XLSX from 'xlsx';
import { RawSheetData } from './engine';

export async function readExcelFile(file: File | ArrayBuffer): Promise<{
  sheets: RawSheetData[];
  rawText: string;
}> {
  const buffer = file instanceof File ? await file.arrayBuffer() : file;
  const workbook = XLSX.read(buffer, { type: 'array' });

  const sheets: RawSheetData[] = [];
  let rawText = '';

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
      raw: false,
    }) as string[][];

    // Convert all values to strings
    const rows = jsonData.map(row =>
      row.map(cell => String(cell ?? '').trim())
    );

    sheets.push({ sheetName, rows });
    rawText += `--- Sheet: ${sheetName} ---\n`;
    rawText += rows.map(r => r.join('\t')).join('\n');
    rawText += '\n\n';
  }

  return { sheets, rawText };
}

export async function readWordFile(file: File | ArrayBuffer): Promise<{
  sheets: RawSheetData[];
  rawText: string;
}> {
  // For Word files, we'll extract text on the server side
  // Client-side: just read as base64
  const buffer = file instanceof File ? await file.arrayBuffer() : file;
  const text = new TextDecoder('utf-8').decode(buffer);

  return {
    sheets: [{ sheetName: 'Document', rows: text.split('\n').map(l => [l]) }],
    rawText: text,
  };
}

export async function readPdfFile(file: File | ArrayBuffer): Promise<{
  sheets: RawSheetData[];
  rawText: string;
}> {
  // PDF parsing will be done server-side
  const buffer = file instanceof File ? await file.arrayBuffer() : file;

  return {
    sheets: [{ sheetName: 'PDF', rows: [] }],
    rawText: '',
  };
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]); // Remove data:xxx;base64, prefix
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
