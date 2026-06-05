import { ParseRule, ParsedRecord } from '@/types';

export function parseCard(rows: string[][], rule: ParseRule): ParsedRecord[] {
  const records: ParsedRecord[] = [];
  const cardConfig = rule.card;
  if (!cardConfig) return records;

  const startPattern = new RegExp(cardConfig.startPattern);
  
  // Find all card start indices
  const cardStarts: number[] = [];
  for (let i = 0; i < rows.length; i++) {
    const rowText = rows[i].join(' ').trim();
    if (startPattern.test(rowText)) {
      cardStarts.push(i);
    }
  }

  // Process each card
  for (let c = 0; c < cardStarts.length; c++) {
    const startIdx = cardStarts[c];
    const endIdx = c + 1 < cardStarts.length ? cardStarts[c + 1] : rows.length;
    
    // Extract card-level fields (storeName, receiverName, etc.)
    const cardFields: Record<string, string> = {};
    
    for (const fieldPattern of cardConfig.fieldPatterns) {
      const regex = new RegExp(fieldPattern.pattern);
      for (let i = startIdx; i < endIdx; i++) {
        const rowText = rows[i].join(' ').trim();
        const match = rowText.match(regex);
        if (match && match[1]) {
          cardFields[fieldPattern.field] = match[1].trim();
          break;
        }
        // Also try key-value pairs in adjacent cells
        for (let j = 0; j < rows[i].length; j++) {
          const cell = rows[i][j]?.trim() || '';
          if (cell === fieldPattern.field || cell.includes(fieldPattern.field.replace('收货', '').replace('联系', ''))) {
            const nextCell = rows[i][j + 1]?.trim() || '';
            if (nextCell && !cardFields[fieldPattern.field]) {
              cardFields[fieldPattern.field] = nextCell;
              break;
            }
          }
        }
      }
    }

    // Find the item table within the card
    // Look for header row with 物品编码/物品名称 etc.
    let headerRowIdx = -1;
    let itemStartIdx = -1;
    
    for (let i = startIdx; i < endIdx; i++) {
      const rowText = rows[i].join(' ').trim();
      if (rowText.includes('物品编码') || rowText.includes('编码') && rowText.includes('名称')) {
        headerRowIdx = i;
        itemStartIdx = i + 1;
        break;
      }
    }

    if (headerRowIdx === -1) {
      // No header found, try to use fieldMappings directly
      // Use data rows after card start + field patterns
      itemStartIdx = startIdx + 2; // Skip card header and field rows
    }

    // Parse item rows
    const fieldMappings = rule.fieldMappings;
    const colMap = new Map<string, number>();
    
    if (headerRowIdx >= 0) {
      for (const mapping of fieldMappings) {
        if (mapping.sourceType === 'column') {
          const colIdx = parseInt(mapping.sourceValue);
          if (!isNaN(colIdx)) {
            colMap.set(mapping.targetField, colIdx);
          } else {
            // Try to find by header name in the card's header row
            const headerRow = rows[headerRowIdx] || [];
            const headerIdx = headerRow.findIndex(h => h && h.trim().includes(mapping.sourceValue));
            if (headerIdx >= 0) {
              colMap.set(mapping.targetField, headerIdx);
            }
          }
        }
      }
    } else {
      // Default column positions
      for (const mapping of fieldMappings) {
        if (mapping.sourceType === 'column') {
          const colIdx = parseInt(mapping.sourceValue);
          if (!isNaN(colIdx)) {
            colMap.set(mapping.targetField, colIdx);
          }
        }
      }
    }

    // Read item data rows
    for (let i = itemStartIdx; i < endIdx; i++) {
      const row = rows[i];
      if (!row || row.every(cell => !cell || cell.trim() === '')) continue;
      
      const firstCell = (row[0] || '').trim();
      if (firstCell.includes('合计') || firstCell.includes('小计') || firstCell.includes('总计')) continue;
      if (startPattern.test(row.join(' '))) continue;
      // Skip rows that are field labels (e.g., "调入门店", "收货地址", "物品编码")
      const skipLabels = ['调入门店', '收货地址', '收货人', '联系电话', '物品编码', '调拨单号', '制单人', '审核人'];
      if (skipLabels.some(label => firstCell.includes(label))) continue;

      const record: ParsedRecord = {
        rowIndex: i,
        externalCode: '',
        storeName: cardFields['storeName'] || '',
        receiverName: cardFields['receiverName'] || '',
        receiverPhone: cardFields['receiverPhone'] || '',
        receiverAddress: cardFields['receiverAddress'] || '',
        skuCode: '',
        skuName: '',
        skuQuantity: 0,
        skuSpec: '',
        remark: '',
        errors: [],
      };

      // Map item fields from row
      for (const mapping of fieldMappings) {
        if (mapping.sourceType === 'column') {
          const colIdx = colMap.get(mapping.targetField);
          if (colIdx !== undefined && colIdx < row.length) {
            const value = String(row[colIdx] || '').trim();
            if (value) {
              (record as any)[mapping.targetField] = mapping.targetField === 'skuQuantity'
                ? parseFloat(value) || 0
                : value;
            }
          }
        }
      }

      // Skip empty item rows
      if (!record.skuCode && !record.skuName) continue;

      records.push(record);
    }
  }

  return records;
}
