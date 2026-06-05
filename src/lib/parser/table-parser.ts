import { ParseRule, ParsedRecord, FieldMapping } from '@/types';

export function parseTable(rows: string[][], rule: ParseRule): ParsedRecord[] {
  const { fileConfig, fieldMappings } = rule;
  const records: ParsedRecord[] = [];

  const skipRows = fileConfig.skipRows || 0;
  const headerRowIdx = fileConfig.headerRow;
  const dataStartRow = fileConfig.dataStartRow || headerRowIdx + 1;

  // Build column index map
  const headerRow = rows[headerRowIdx] || [];
  const colMap = buildColumnMap(headerRow, fieldMappings);

  // Determine data end row
  let dataEndRow = fileConfig.dataEndRow === 'auto' ? rows.length : (fileConfig.dataEndRow || rows.length);

  for (let i = dataStartRow; i < dataEndRow; i++) {
    const row = rows[i];
    if (!row || row.every(cell => !cell || cell.trim() === '')) continue;

    // Skip summary/total rows
    const firstCell = (row[0] || '').trim();
    if (firstCell.includes('合计') || firstCell.includes('小计') || firstCell.includes('总计')) continue;

    // Skip non-data rows (footer metadata, labels, etc.)
    const skipLabels = ['收货门店', '联系人', '联系电话', '收货地址', '制单人', '审核人', '签字', '收货人', '备注', '出库日期', '仓库', '配送方式', '打印时间'];
    if (skipLabels.some(label => firstCell.includes(label))) continue;

    const record = mapRowToRecord(row, fieldMappings, colMap, i);
    
    // Skip records where all key fields are empty
    if (!record.skuCode && !record.skuName && !record.skuQuantity) continue;
    
    records.push(record);
  }

  return records;
}

function buildColumnMap(headerRow: string[], mappings: FieldMapping[]): Map<string, number> {
  const colMap = new Map<string, number>();

  for (const mapping of mappings) {
    if (mapping.sourceType === 'column') {
      const colIdx = parseInt(mapping.sourceValue);
      if (!isNaN(colIdx)) {
        colMap.set(mapping.targetField, colIdx);
      } else {
        // Try to find by header name
        const headerIdx = headerRow.findIndex(h =>
          h && h.trim().includes(mapping.sourceValue)
        );
        if (headerIdx >= 0) {
          colMap.set(mapping.targetField, headerIdx);
        }
      }
    }
  }

  return colMap;
}

function mapRowToRecord(
  row: string[],
  mappings: FieldMapping[],
  colMap: Map<string, number>,
  rowIdx: number
): ParsedRecord {
  const record: ParsedRecord = {
    rowIndex: rowIdx,
    externalCode: '',
    storeName: '',
    receiverName: '',
    receiverPhone: '',
    receiverAddress: '',
    skuCode: '',
    skuName: '',
    skuQuantity: 0,
    skuSpec: '',
    remark: '',
    errors: [],
  };

  for (const mapping of mappings) {
    const value = extractFieldValue(row, mapping, colMap);
    if (value !== undefined && value !== '') {
      (record as any)[mapping.targetField] = mapping.targetField === 'skuQuantity'
        ? parseFloat(value) || 0
        : value;
    }
  }

  return record;
}

function extractFieldValue(
  row: string[],
  mapping: FieldMapping,
  colMap: Map<string, number>
): string | undefined {
  switch (mapping.sourceType) {
    case 'column': {
      const colIdx = colMap.get(mapping.targetField);
      if (colIdx !== undefined && colIdx < row.length) {
        return String(row[colIdx] || '').trim();
      }
      return undefined;
    }
    case 'static':
      return mapping.sourceValue;
    case 'regex': {
      const rowText = row.join(' ');
      const regex = new RegExp(mapping.sourceValue);
      const match = rowText.match(regex);
      return match ? match[1] || match[0] : undefined;
    }
    case 'position':
      return mapping.sourceValue;
    default:
      return undefined;
  }
}
