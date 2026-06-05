import { ParseRule, ParsedRecord } from '@/types';

export function parseText(rawText: string, rule: ParseRule): ParsedRecord[] {
  const records: ParsedRecord[] = [];
  const textConfig = rule.text;
  if (!textConfig) return records;

  // Split into records by separator
  const separator = new RegExp(textConfig.recordSeparator || '\\n{3,}');
  const segments = rawText.split(separator).filter(s => s.trim());

  for (const segment of segments) {
    const record: ParsedRecord = {
      rowIndex: 0,
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

    // Extract header-level fields (storeName, receiverName, etc.)
    if (textConfig.fieldPatterns) {
      for (const fieldPattern of textConfig.fieldPatterns) {
        const regex = new RegExp(fieldPattern.pattern);
        const match = segment.match(regex);
        if (match && match[1]) {
          (record as any)[fieldPattern.field] = match[1].trim();
        }
      }
    }

    // Extract item lines
    if (textConfig.itemPattern) {
      const itemRegex = new RegExp(textConfig.itemPattern, 'g');
      let match;
      let itemIndex = 0;
      
      while ((match = itemRegex.exec(segment)) !== null) {
        if (itemIndex === 0) {
          // First item goes into the current record
          // Match groups: typically [full, code, name, spec, quantity] or similar
          if (match.length >= 3) {
            record.skuCode = match[1]?.trim() || '';
            record.skuName = match[2]?.trim() || '';
            if (match.length >= 4) record.skuSpec = match[3]?.trim() || '';
            if (match.length >= 5) record.skuQuantity = parseFloat(match[4]) || 0;
            else if (match.length >= 3) record.skuQuantity = parseFloat(match[3]) || 0;
          }
        } else {
          // Additional items create new records with same header fields
          const newRecord: ParsedRecord = {
            rowIndex: 0,
            externalCode: record.externalCode,
            storeName: record.storeName,
            receiverName: record.receiverName,
            receiverPhone: record.receiverPhone,
            receiverAddress: record.receiverAddress,
            skuCode: match[1]?.trim() || '',
            skuName: match[2]?.trim() || '',
            skuQuantity: 0,
            skuSpec: '',
            remark: '',
            errors: [],
          };
          if (match.length >= 4) newRecord.skuSpec = match[3]?.trim() || '';
          if (match.length >= 5) newRecord.skuQuantity = parseFloat(match[4]) || 0;
          else if (match.length >= 3) newRecord.skuQuantity = parseFloat(match[3]) || 0;
          
          records.push(newRecord);
        }
        itemIndex++;
      }
    }

    // If no item pattern, try to use field mappings with regex
    if (!textConfig.itemPattern && rule.fieldMappings) {
      for (const mapping of rule.fieldMappings) {
        if (mapping.sourceType === 'regex') {
          const regex = new RegExp(mapping.sourceValue);
          const match = segment.match(regex);
          if (match && match[1]) {
            (record as any)[mapping.targetField] = mapping.targetField === 'skuQuantity'
              ? parseFloat(match[1]) || 0
              : match[1].trim();
          }
        }
      }
    }

    // Only add record if it has some content
    if (record.skuCode || record.skuName || record.storeName || record.receiverName) {
      records.push(record);
    }
  }

  return records;
}
