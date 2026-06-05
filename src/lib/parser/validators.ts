import { ParsedRecord, FieldError } from '@/types';

export function validateRecord(record: ParsedRecord): FieldError[] {
  const errors: FieldError[] = [];

  // Required fields: skuCode, skuName, skuQuantity
  if (!record.skuCode?.trim()) {
    errors.push({ field: 'skuCode', message: 'SKU物品编码不能为空' });
  }
  if (!record.skuName?.trim()) {
    errors.push({ field: 'skuName', message: 'SKU物品名称不能为空' });
  }
  if (!record.skuQuantity || record.skuQuantity <= 0) {
    errors.push({ field: 'skuQuantity', message: 'SKU发货数量必须为正数' });
  }

  // A/B group validation: at least one group must be filled
  const hasStoreName = !!record.storeName?.trim();
  const hasReceiverInfo = !!(
    record.receiverName?.trim() &&
    record.receiverPhone?.trim() &&
    record.receiverAddress?.trim()
  );

  if (!hasStoreName && !hasReceiverInfo) {
    if (!record.storeName?.trim()) {
      errors.push({ field: 'storeName', message: '收货门店与收件人信息至少填一组' });
    }
    if (!record.receiverName?.trim()) {
      errors.push({ field: 'receiverName', message: '收货门店与收件人信息至少填一组' });
    }
    if (!record.receiverPhone?.trim()) {
      errors.push({ field: 'receiverPhone', message: '收货门店与收件人信息至少填一组' });
    }
    if (!record.receiverAddress?.trim()) {
      errors.push({ field: 'receiverAddress', message: '收货门店与收件人信息至少填一组' });
    }
  }

  // Phone format validation (if provided) - relaxed to support landlines
  if (record.receiverPhone?.trim()) {
    const phone = record.receiverPhone.replace(/[\s\-]/g, '');
    const phoneRegex = /^1[3-9]\d{9}$|^\d{3,4}-?\d{7,8}$|^\d{7,12}$/;
    if (!phoneRegex.test(phone)) {
      errors.push({ field: 'receiverPhone', message: '电话格式不正确' });
    }
  }

  return errors;
}

export function validateRecords(records: ParsedRecord[]): ParsedRecord[] {
  // Check for duplicate records (same externalCode + skuCode)
  const compositeKeyMap = new Map<string, number[]>();
  for (const record of records) {
    const code = record.externalCode?.trim() || '';
    const skuCode = record.skuCode?.trim() || '';
    if (code && skuCode) {
      const compositeKey = `${code}::${skuCode}`;
      if (!compositeKeyMap.has(compositeKey)) compositeKeyMap.set(compositeKey, []);
      compositeKeyMap.get(compositeKey)!.push(record.rowIndex);
    }
  }

  for (const record of records) {
    // Validate individual record
    record.errors = validateRecord(record);

    // Check for duplicates
    const code = record.externalCode?.trim() || '';
    const skuCode = record.skuCode?.trim() || '';
    if (code && skuCode) {
      const compositeKey = `${code}::${skuCode}`;
      const indices = compositeKeyMap.get(compositeKey);
      if (indices && indices.length > 1) {
        record.isDuplicate = true;
        record.duplicateOf = indices.find(i => i !== record.rowIndex);
        record.errors.push({
          field: 'skuCode',
          message: `同一单据下物品编码与第${record.duplicateOf}行重复`,
        });
      }
    }
  }

  return records;
}
