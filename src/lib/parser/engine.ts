import { ParseRule, ParsedRecord, FieldMapping } from '@/types';
import { parseTable } from './table-parser';
import { parseMatrix } from './matrix-parser';
import { parseCard } from './card-parser';
import { parseText } from './text-parser';
import { parsePdf } from './pdf-parser';
import { validateRecord } from './validators';

export interface RawSheetData {
  sheetName: string;
  rows: string[][];
}

export interface ParseContext {
  rule: ParseRule;
  sheets: RawSheetData[];
  rawText?: string;
  fileName: string;
}

export function executeParse(ctx: ParseContext): ParsedRecord[] {
  const { rule, sheets, rawText, fileName } = ctx;
  let allRecords: ParsedRecord[] = [];

  const targetSheets = rule.fileConfig.sheetMode === 'all'
    ? sheets
    : rule.fileConfig.sheetMode === 'named'
      ? sheets.filter(s => rule.fileConfig.sheetNames?.includes(s.sheetName))
      : sheets.slice(rule.fileConfig.sheetIndex || 0, (rule.fileConfig.sheetIndex || 0) + 1);

  for (const sheet of targetSheets) {
    let records: ParsedRecord[] = [];

    switch (rule.parseMode) {
      case 'table':
        records = parseTable(sheet.rows, rule);
        break;
      case 'matrix':
        records = parseMatrix(sheet.rows, rule);
        break;
      case 'card':
        records = parseCard(sheet.rows, rule);
        break;
      case 'text':
        records = parseText(rawText || sheet.rows.map(r => r.join('\t')).join('\n'), rule);
        break;
      case 'pdf':
        records = parsePdf(rawText || sheet.rows.map(r => r.join('\t')).join('\n'), rule);
        break;
    }

    // Apply tail/header field extraction (scan ALL rows, not just tail)
    if (rule.tailExtraction?.enabled) {
      records = applyHeaderTailExtraction(records, sheet.rows, rule);
    }

    // Apply aggregation if enabled
    if (rule.aggregation?.enabled) {
      records = applyAggregation(records, rule);
    }

    // Apply defaults
    if (rule.defaults) {
      for (const record of records) {
        for (const [key, value] of Object.entries(rule.defaults)) {
          const currentValue = (record as any)[key];
          if (!currentValue || currentValue === '') {
            (record as any)[key] = value;
          }
        }
      }
    }

    // Validate all records
    for (const record of records) {
      record.errors = validateRecord(record);
    }

    allRecords.push(...records);
  }

  // Re-index rows
  allRecords.forEach((r, i) => r.rowIndex = i + 1);

  // Check for duplicate records within batch (same externalCode + skuCode)
  const compositeKeyMap = new Map<string, number[]>();
  for (const record of allRecords) {
    const code = record.externalCode?.trim() || '';
    const skuCode = record.skuCode?.trim() || '';
    if (code && skuCode) {
      const compositeKey = `${code}::${skuCode}`;
      if (!compositeKeyMap.has(compositeKey)) compositeKeyMap.set(compositeKey, []);
      compositeKeyMap.get(compositeKey)!.push(record.rowIndex);
    }
  }

  for (const record of allRecords) {
    const code = record.externalCode?.trim() || '';
    const skuCode = record.skuCode?.trim() || '';
    if (code && skuCode) {
      const compositeKey = `${code}::${skuCode}`;
      const indices = compositeKeyMap.get(compositeKey);
      if (indices && indices.length > 1) {
        record.isDuplicate = true;
        record.duplicateOf = indices.find(i => i !== record.rowIndex);
        if (!record.errors.find(e => e.field === 'skuCode')) {
          record.errors.push({
            field: 'skuCode',
            message: `同一单据下物品编码与第${record.duplicateOf}行重复`,
          });
        }
      }
    }
  }

  return allRecords;
}

function applyHeaderTailExtraction(records: ParsedRecord[], rows: string[][], rule: ParseRule): ParsedRecord[] {
  if (!rule.tailExtraction?.enabled || records.length === 0) return records;

  for (const pattern of rule.tailExtraction.patterns) {
    const value = extractFieldFromRows(rows, pattern.pattern, pattern.field);
    if (value) {
      for (const record of records) {
        if (!(record as any)[pattern.field] || (record as any)[pattern.field] === '') {
          (record as any)[pattern.field] = value;
        }
      }
    }
  }

  return records;
}

function extractFieldFromRows(rows: string[][], pattern: string, fieldName: string): string {
  const regex = new RegExp(pattern);

  // Map of known field labels (Chinese) for adjacent cell extraction
  const labelMap: Record<string, string[]> = {
    storeName: ['收货门店', '门店', '调入门店', '收货机构', '机构', '仓库名称', '仓库', '货主'],
    receiverName: ['收货人', '收件人', '联系人', '客户'],
    receiverPhone: ['收货电话', '联系电话', '电话', '手机号', '手机', '收件人电话'],
    receiverAddress: ['收货地址', '地址', '收件人地址', '送货地址'],
    externalCode: ['单据号', '配送单号', '外部编码', '单号', '订单号'],
  };

  const labels = labelMap[fieldName] || [];

  // Pass 1: Adjacent cell key-value pattern (most common Excel pattern, most precise)
  // e.g., Cell A1="收货人" and Cell B1="张三"
  // Collect all matches, then prefer more specific labels
  const pass1Matches: { value: string; labelLength: number; rowIndex: number }[] = [];

  for (let ri = 0; ri < rows.length; ri++) {
    const row = rows[ri];
    for (let col = 0; col < row.length - 1; col++) {
      const cell = (row[col] || '').trim();
      const nextCell = (row[col + 1] || '').trim();
      const cell2Away = (row[col + 2] || '').trim();

      // Check if this cell exactly matches or contains a known label for this field
      // But exclude partial matches like "收货人手机号" matching "收货人"
      const matchedLabel = labels.find(label => {
        const cleanCell = cell.replace(/[：:]/g, '').trim();
        // Exact match is best (with or without colon)
        if (cleanCell === label) return true;
        return false;
      });

      if (matchedLabel && nextCell) {
        let value = nextCell;
        // Check if next cell also has a label (like "收货人 张三 电话 138...")
        const nextCellIsAnotherLabel = labels.some(label => nextCell.includes(label) && !labels.some(l => l === fieldName && nextCell.includes(label)));
        if (nextCellIsAnotherLabel) {
          // Try to get value from between the labels
          const textRow = row.join(' ');
          const specificRegex = new RegExp(matchedLabel + '[：:]?\\s*(.+?)(?:\\s+|$)');
          const specificMatch = textRow.match(specificRegex);
          if (specificMatch && specificMatch[1]) {
            const isValueLabel = labels.some(label => specificMatch[1].includes(label));
            if (!isValueLabel) {
              pass1Matches.push({ value: specificMatch[1].trim(), labelLength: matchedLabel.length, rowIndex: ri });
            }
          }
        } else if (value && !labels.some(label => value.includes(label))) {
          pass1Matches.push({ value, labelLength: matchedLabel.length, rowIndex: ri });
        }

        // If next cell looks like another label, try cell2Away
        if (labels.some(label => nextCell.includes(label)) && cell2Away && !pass1Matches.length) {
          pass1Matches.push({ value: cell2Away, labelLength: matchedLabel.length, rowIndex: ri });
        }
      }
    }
  }

  // Prefer more specific (longer) labels, and later rows (footer > header)
  if (pass1Matches.length > 0) {
    pass1Matches.sort((a, b) => {
      // Prefer longer labels (more specific)
      if (b.labelLength !== a.labelLength) return b.labelLength - a.labelLength;
      // If same specificity, prefer later rows
      return b.rowIndex - a.rowIndex;
    });
    return pass1Matches[0].value;
  }

  // Pass 2: Try regex match on joined row text
  for (const row of rows) {
    const rowText = row.join(' ').trim();
    const match = rowText.match(regex);
    if (match && match[1]) {
      const value = match[1].trim();
      if (value && !labels.some(l => value.includes(l))) {
        return value;
      }
    }
  }

  // Pass 3: Try inline key-value pattern within a single cell
  // e.g., "收货人: 张三" or "收货电话：13800001111"
  for (const row of rows) {
    for (const cell of row) {
      const cellText = (cell || '').trim();
      // Check if any label appears in this cell
      for (const label of labels) {
        const inlineRegex = new RegExp(`${label}\\s*[：:]?\\s*(.+?)(?:\\s{2,}|$|\\s+[①②③④⑤⑥⑦⑧⑨⑩])`);
        const match = cellText.match(inlineRegex);
        if (match && match[1]) {
          const value = match[1].trim();
          if (value && !labels.some(l => value.includes(l))) {
            // Clean up - if value contains another label at the end, stop there
            let cleanedValue = value;
            for (const otherLabel of labels) {
              if (otherLabel !== label && cleanedValue.includes(otherLabel)) {
                const idx = cleanedValue.indexOf(otherLabel);
                cleanedValue = cleanedValue.substring(0, idx).trim();
              }
            }
            if (cleanedValue) return cleanedValue;
          }
        }
      }
    }
  }

  // Pass 4: Multi-row pattern - label on one row, value on next (same column)
  // e.g., row X has "收货地址" in column A, row X+1 has "北京市朝阳区..." in column A
  for (let i = 0; i < rows.length - 1; i++) {
    for (let col = 0; col < rows[i].length; col++) {
      const cell = (rows[i][col] || '').trim();
      const nextRowCell = (rows[i + 1][col] || '').trim();
      
      if (cell && labels.some(label => cell.includes(label))) {
        if (nextRowCell && !labels.some(label => nextRowCell.includes(label))) {
          // The value might span multiple cells in the next row
          const remainingCells = rows[i + 1].slice(col).filter(c => c && c.trim());
          if (remainingCells.length > 0) {
            const combined = remainingCells.join(' ');
            if (!labels.some(label => combined.includes(label))) {
              return combined;
            }
          }
        }
      }
    }
  }

  return '';
}

function applyAggregation(records: ParsedRecord[], rule: ParseRule): ParsedRecord[] {
  if (!rule.aggregation?.enabled || records.length === 0) return records;

  const groupByKey = rule.aggregation.groupByKey as keyof ParsedRecord;
  const sharedFields = rule.aggregation.sharedFields as (keyof ParsedRecord)[];

  // Group records by the key
  const groups = new Map<string, ParsedRecord[]>();
  for (const record of records) {
    const key = String(record[groupByKey] || '');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(record);
  }

  // For each group, copy shared fields from the first record that has them
  groups.forEach((groupRecords) => {
    for (const field of sharedFields) {
      // Find the first record in this group with a non-empty value for this field
      const sourceRecord = groupRecords.find(r => {
        const val = (r as any)[field];
        return val && String(val).trim() !== '';
      });
      if (sourceRecord) {
        const value = (sourceRecord as any)[field];
        for (const r of groupRecords) {
          if (!(r as any)[field] || String((r as any)[field]).trim() === '') {
            (r as any)[field] = value;
          }
        }
      }
    }
  });

  return records;
}
