import { ParseRule, ParsedRecord } from '@/types';

/**
 * PDF parser - handles PDF text extraction results
 * 
 * PDF text from pdf-parse is plain text with line breaks.
 * Key challenge: items are often concatenated without spaces
 * e.g., "1饮品类ZBWP0001茶语柠听紫苏风味糖浆750ml*6瓶/件件2"
 * 
 * Strategy: Use item code pattern (e.g., ZBWP\d+) as anchor to split items
 */
export function parsePdf(rawText: string, rule: ParseRule): ParsedRecord[] {
  const records: ParsedRecord[] = [];

  // Extract header-level fields from the entire text
  const headerFields = extractHeaderFields(rawText, rule);

  // Extract item lines using code pattern as anchor
  const items = extractItems(rawText, rule);

  // Build records from items + header fields
  for (const item of items) {
    const record: ParsedRecord = {
      rowIndex: item.seq,
      externalCode: headerFields['externalCode'] || '',
      storeName: headerFields['storeName'] || '',
      receiverName: headerFields['receiverName'] || '',
      receiverPhone: headerFields['receiverPhone'] || '',
      receiverAddress: headerFields['receiverAddress'] || '',
      skuCode: item.code,
      skuName: item.name,
      skuQuantity: item.quantity,
      skuSpec: item.spec,
      remark: '',
      errors: [],
    };
    records.push(record);
  }

  return records;
}

interface PdfItem {
  seq: number;
  category: string;
  code: string;
  name: string;
  spec: string;
  unit: string;
  quantity: number;
}

function extractHeaderFields(rawText: string, rule: ParseRule): Record<string, string> {
  const headerFields: Record<string, string> = {};

  // Extract from text config field patterns
  const textConfig = rule.text;
  if (textConfig?.fieldPatterns) {
    for (const fieldPattern of textConfig.fieldPatterns) {
      const regex = new RegExp(fieldPattern.pattern);
      const match = rawText.match(regex);
      if (match && match[1]) {
        headerFields[fieldPattern.field] = match[1].trim();
      }
    }
  }

  // Extract from tailExtraction patterns
  if (rule.tailExtraction?.enabled) {
    for (const pattern of rule.tailExtraction.patterns) {
      if (headerFields[pattern.field]) continue; // Already found
      const regex = new RegExp(pattern.pattern);
      const match = rawText.match(regex);
      if (match && match[1]) {
        headerFields[pattern.field] = match[1].trim();
      }
    }
  }

  // Built-in common PDF field patterns as fallback
  const builtinPatterns: Record<string, RegExp> = {
    externalCode: /单据编号[：:]\s*(PS\d+|[A-Z]+\d+|[A-Za-z0-9\-]+)/,
    storeName: /收货机构[：:]\s*(.+?)(?:\s*订货机构|\s*供货机构|\s*$)/m,
    receiverName: /收货人[：:]\s*(.+?)(?:\s*收货电话|\s*收货地址|\s*$)/m,
    receiverPhone: /收货电话[：:]\s*(1\d{10}|\d{3,4}-?\d{7,8}|\d{7,12})/,
    receiverAddress: /收货地址[：:]\s*(.+?)$/m,
  };

  for (const [field, regex] of Object.entries(builtinPatterns)) {
    if (!headerFields[field]) {
      const match = rawText.match(regex);
      if (match && match[1]) {
        headerFields[field] = match[1].trim();
      }
    }
  }

  return headerFields;
}

function extractItems(rawText: string, rule: ParseRule): PdfItem[] {
  const items: PdfItem[] = [];

  // First, merge multi-line items (always needed for PDF)
  const codePattern = /[A-Z]{2,}\d{3,}/g;
  const lines = rawText.split('\n').map(l => l.trim());
  const mergedLines = mergeMultilineItems(lines, codePattern);
  const mergedText = mergedLines.join('\n');

  // If itemPattern is specified in text config, try it on merged text first
  if (rule.text?.itemPattern) {
    const itemRegex = new RegExp(rule.text.itemPattern, 'g');
    let match;
    while ((match = itemRegex.exec(mergedText)) !== null) {
      const item = parseItemFromRegexMatch(match);
      if (item) items.push(item);
    }
    if (items.length > 0) return items;
  }

  // Default strategy: parse each merged line using code pattern as anchor
  for (const line of mergedLines) {
    const item = parseItemLine(line);
    if (item) items.push(item);
  }

  return items;
}

/**
 * Merge multi-line items where the spec/name wraps to next lines
 * e.g.:
 *   "7饮品类ZBWP0023茶语柠听木姜子糖浆"
 *   "1.25kg*12瓶/"
 *   "件"
 *   "件1"
 * Should become: "7饮品类ZBWP0023茶语柠听木姜子糖浆1.25kg*12瓶/件件1"
 */
function mergeMultilineItems(lines: string[], codePattern: RegExp): string[] {
  const merged: string[] = [];
  let i = 0;

  // Known non-item line patterns
  const skipPatterns = [
    /^物品类别/, /^第\d+页/, /^合\s*$/, /^计$/, /^\d+$/,  // 合计 split across lines
    /^制单日期/, /^收货人签字/, /^打印次数/, /^备注[：:]/,
    /^单据编号/, /^单据状态/, /^分拣状态/, /^是否需要推送/,
    /^订单日期/, /^预计发货日期/, /^期望到货日期/, /^发货日期/,
    /^发货操作时间/, /^收货机构/, /^订货机构/, /^供货机构/,
    /^送货机构/, /^业务模式/, /^配送重量/,
    /^收货人[：:]/, /^收货电话[：:]/, /^收货地址[：:]/,
    /^创建人/, /^发货人/, /^配送单$/,
  ];

  while (i < lines.length) {
    const line = lines[i];

    // Skip empty lines
    if (!line) { i++; continue; }

    // Skip known non-item lines
    if (skipPatterns.some(p => p.test(line))) { i++; continue; }

    // Check if this line contains an item code
    codePattern.lastIndex = 0;
    if (codePattern.test(line)) {
      // This is an item start line - merge with continuation lines
      let mergedLine = line;
      let j = i + 1;

      // Look ahead for continuation lines (no item code, not a skip pattern)
      while (j < lines.length) {
        const nextLine = lines[j];
        if (!nextLine) { j++; continue; }
        if (skipPatterns.some(p => p.test(nextLine))) break;
        codePattern.lastIndex = 0;
        if (codePattern.test(nextLine)) break; // Next item starts
        // Check if next line starts with a number (could be next item)
        if (/^\d+[^\d]/.test(nextLine) && !/^\d+[.\d]*kg|ml|L|g|包|件|瓶|桶|袋|盒|码/.test(nextLine)) break;
        mergedLine += nextLine;
        j++;
      }

      merged.push(mergedLine);
      i = j;
    } else {
      // Not an item line, skip
      i++;
    }
  }

  return merged;
}

/**
 * Parse a single merged item line
 * Format: "序号+类别+编码+名称+规格+单位+数量"
 * e.g., "1饮品类ZBWP0001茶语柠听紫苏风味糖浆750ml*6瓶/件件2"
 * 
 * Strategy: Find the code (e.g., ZBWP0001) as anchor, then:
 * - Before code: seq + category
 * - After code: name + spec + unit + quantity
 */
function parseItemLine(line: string): PdfItem | null {
  // Find item code pattern
  const codeMatch = line.match(/([A-Z]{2,}\d{3,})/);
  if (!codeMatch) return null;

  const code = codeMatch[1];
  const codeIndex = codeMatch.index!;

  // Before code: extract seq and category
  const beforeCode = line.substring(0, codeIndex);
  const seqMatch = beforeCode.match(/^(\d+)/);
  const seq = seqMatch ? parseInt(seqMatch[1]) : 0;
  const category = beforeCode.replace(/^\d+/, '').trim();

  // After code: name + spec + unit + quantity
  const afterCode = line.substring(codeIndex + code.length);

  // The last part is: unit + quantity
  // Unit is typically 1-2 Chinese characters (件/瓶/包/桶/袋/盒/码/个)
  // Quantity is a number at the end
  const trailingMatch = afterCode.match(/(件|瓶|包|桶|袋|盒|码|个|kg|g|L|ml)(\d+(?:\.\d+)?)\s*$/);
  
  let name = '';
  let spec = '';
  let unit = '';
  let quantity = 0;

  if (trailingMatch) {
    unit = trailingMatch[1];
    quantity = parseFloat(trailingMatch[2]);
    const nameAndSpec = afterCode.substring(0, afterCode.length - trailingMatch[0].length);

    // Split name and spec
    // Spec typically contains numbers and units like: 750ml*6瓶/件, 2.5kg*6包/件, 25kg/包
    const specMatch = nameAndSpec.match(/^(.+?)((?:\d+(?:\.\d+)?(?:ml|L|kg|g|包|件|瓶|桶|袋|盒|码|个)[^\u4e00-\u9fff\w]*.*))$/);
    if (specMatch) {
      name = specMatch[1].trim();
      spec = specMatch[2].trim();
    } else {
      name = nameAndSpec.trim();
    }
  } else {
    // No unit found, try to extract quantity from end
    const qtyMatch = afterCode.match(/(\d+(?:\.\d+)?)\s*$/);
    if (qtyMatch) {
      quantity = parseFloat(qtyMatch[1]);
      name = afterCode.substring(0, afterCode.length - qtyMatch[0].length).trim();
    } else {
      name = afterCode.trim();
    }
  }

  // Clean up name - remove trailing spec-like patterns that weren't caught
  // e.g., "前厅长裤（砖红）L码件" -> name="前厅长裤（砖红）L码", unit="件" was already captured

  if (!code && !name) return null;

  return { seq, category, code, name, spec, unit, quantity };
}

/**
 * Parse item from a regex match (when itemPattern is specified in rule)
 * Match groups depend on the pattern, but typically:
 * - 3 groups: [full, code, name, quantity]
 * - 4 groups: [full, code, name, spec, quantity]
 * - 5+ groups: [full, seq, category, code, name, quantity]
 */
function parseItemFromRegexMatch(match: RegExpExecArray): PdfItem | null {
  if (match.length < 3) return null;

  const item: PdfItem = {
    seq: 0,
    category: '',
    code: '',
    name: '',
    spec: '',
    unit: '',
    quantity: 0,
  };

  if (match.length >= 7) {
    // [full, seq, category, code, name, unit, quantity]
    item.seq = parseInt(match[1]) || 0;
    item.category = match[2]?.trim() || '';
    item.code = match[3]?.trim() || '';
    item.name = match[4]?.trim() || '';
    item.unit = match[5]?.trim() || '';
    item.quantity = parseFloat(match[6]) || 0;
  } else if (match.length >= 6) {
    // [full, seq, category, code, name, quantity]
    item.seq = parseInt(match[1]) || 0;
    item.category = match[2]?.trim() || '';
    item.code = match[3]?.trim() || '';
    item.name = match[4]?.trim() || '';
    item.quantity = parseFloat(match[5]) || 0;
  } else if (match.length >= 5) {
    // [full, code, name, spec, quantity]
    item.code = match[1]?.trim() || '';
    item.name = match[2]?.trim() || '';
    item.spec = match[3]?.trim() || '';
    item.quantity = parseFloat(match[4]) || 0;
  } else if (match.length >= 4) {
    // [full, code, name, quantity]
    item.code = match[1]?.trim() || '';
    item.name = match[2]?.trim() || '';
    item.quantity = parseFloat(match[3]) || 0;
  }

  if (!item.code && !item.name) return null;
  return item;
}
