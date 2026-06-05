import { ParseRule, ParsedRecord } from '@/types';

export function parseMatrix(rows: string[][], rule: ParseRule): ParsedRecord[] {
  const records: ParsedRecord[] = [];
  const transpose = rule.transpose;
  if (!transpose?.enabled) return records;

  const pivotColumn = transpose.pivotColumn || 0;
  const valueStartColumn = transpose.valueStartColumn || 1;
  const pivotFieldName = transpose.pivotFieldName || 'storeName';
  const valueFieldName = transpose.valueFieldName || 'skuQuantity';
  const compositeSplit = transpose.compositeSplit;

  // Build base field mappings (non-transpose columns)
  const baseMappings = rule.fieldMappings.filter(m => {
    const colIdx = parseInt(m.sourceValue);
    return !isNaN(colIdx) && colIdx < valueStartColumn;
  });

  // Get header row for pivot column names
  const headerRowIdx = rule.fileConfig.headerRow || 0;
  const headerRow = rows[headerRowIdx] || [];

  // Determine data start/end
  const dataStartRow = rule.fileConfig.dataStartRow || headerRowIdx + 1;
  const dataEndRow = rule.fileConfig.dataEndRow === 'auto' ? rows.length : (rule.fileConfig.dataEndRow || rows.length);

  for (let i = dataStartRow; i < dataEndRow; i++) {
    const row = rows[i];
    if (!row || row.every(cell => !cell || cell.trim() === '')) continue;

    const firstCell = (row[0] || '').trim();
    if (firstCell.includes('合计') || firstCell.includes('小计') || firstCell.includes('总计')) continue;

    // Extract base fields from pivot columns
    const baseFields: Record<string, any> = {};
    for (const mapping of baseMappings) {
      const colIdx = parseInt(mapping.sourceValue);
      if (colIdx < row.length) {
        const value = String(row[colIdx] || '').trim();
        if (value) {
          baseFields[mapping.targetField] = mapping.targetField === 'skuQuantity'
            ? parseFloat(value) || 0
            : value;
        }
      }
    }

    // Process each value column (transposed)
    for (let col = valueStartColumn; col < row.length; col++) {
      const cellValue = String(row[col] || '').trim();
      if (!cellValue) continue;

      // Get pivot name from header
      const pivotValue = headerRow[col]?.trim() || `列${col}`;

      if (compositeSplit?.enabled) {
        // Split composite cell values (e.g., "物品名x数量\n物品名x数量")
        const lines = cellValue.split(/\n/);
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;

          const itemRegex = new RegExp(compositeSplit.itemPattern || '(.+?)\\s*[x×X]\\s*(\\d+)');
          const match = trimmedLine.match(itemRegex);
          
          if (match) {
            const record: ParsedRecord = {
              rowIndex: i,
              externalCode: pivotValue,
              storeName: baseFields['storeName'] || '',
              receiverName: '',
              receiverPhone: '',
              receiverAddress: '',
              skuCode: '',
              skuName: match[1]?.trim() || '',
              skuQuantity: parseFloat(match[2]) || 0,
              skuSpec: '',
              remark: '',
              errors: [],
            };

            // Apply base fields
            for (const [key, value] of Object.entries(baseFields)) {
              if (key !== 'storeName' && key !== 'skuName' && key !== 'skuQuantity') {
                (record as any)[key] = value;
              }
            }

            records.push(record);
          }
        }
      } else {
        // Simple transpose: each cell becomes a record
        const qty = parseFloat(cellValue);
        if (isNaN(qty) || qty <= 0) continue;

        const record: ParsedRecord = {
          rowIndex: i,
          externalCode: '',
          storeName: pivotFieldName === 'storeName' ? pivotValue : '',
          receiverName: '',
          receiverPhone: '',
          receiverAddress: '',
          skuCode: baseFields['skuCode'] || '',
          skuName: baseFields['skuName'] || '',
          skuQuantity: qty,
          skuSpec: baseFields['skuSpec'] || '',
          remark: '',
          errors: [],
        };

        // If pivotFieldName is not storeName, set it accordingly
        if (pivotFieldName !== 'storeName') {
          (record as any)[pivotFieldName] = pivotValue;
        }

        records.push(record);
      }
    }
  }

  return records;
}
