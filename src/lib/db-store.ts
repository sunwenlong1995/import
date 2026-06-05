import prisma from '@/lib/db';
import { ParseRule, FieldMapping, TailExtraction, Aggregation, Transpose, CardConfig, TextConfig, FileConfig } from '@/types';

// 将 ParseRule 转为 Prisma 可存储的格式
function ruleToDb(rule: ParseRule) {
  return {
    id: rule.id || undefined,
    name: rule.name,
    description: rule.description || '',
    parseMode: rule.parseMode,
    fileConfig: JSON.stringify(rule.fileConfig),
    fieldMappings: JSON.stringify(rule.fieldMappings),
    tailExtraction: rule.tailExtraction ? JSON.stringify(rule.tailExtraction) : null,
    aggregation: rule.aggregation ? JSON.stringify(rule.aggregation) : null,
    transpose: rule.transpose ? JSON.stringify(rule.transpose) : null,
    card: rule.card ? JSON.stringify(rule.card) : null,
    text: rule.text ? JSON.stringify(rule.text) : null,
    defaults: rule.defaults ? JSON.stringify(rule.defaults) : null,
    createdAt: rule.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// 将数据库记录转为 ParseRule
function dbToRule(row: any): ParseRule {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    parseMode: row.parseMode,
    fileConfig: JSON.parse(row.fileConfig || '{}'),
    fieldMappings: JSON.parse(row.fieldMappings || '[]'),
    tailExtraction: row.tailExtraction ? JSON.parse(row.tailExtraction) : undefined,
    aggregation: row.aggregation ? JSON.parse(row.aggregation) : undefined,
    transpose: row.transpose ? JSON.parse(row.transpose) : undefined,
    card: row.card ? JSON.parse(row.card) : undefined,
    text: row.text ? JSON.parse(row.text) : undefined,
    defaults: row.defaults ? JSON.parse(row.defaults) : undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export const dbStore = {
  // === Rules ===
  async getRules(): Promise<ParseRule[]> {
    const rows = await prisma.rule.findMany({ orderBy: { createdAt: 'asc' } });
    if (rows.length === 0) {
      await this.seedPresetRules();
      const seeded = await prisma.rule.findMany({ orderBy: { createdAt: 'asc' } });
      return seeded.map(dbToRule);
    }
    return rows.map(dbToRule);
  },

  async getRule(id: string): Promise<ParseRule | undefined> {
    const row = await prisma.rule.findUnique({ where: { id } });
    if (!row) return undefined;
    return dbToRule(row);
  },

  async addRule(rule: ParseRule): Promise<ParseRule> {
    const data = ruleToDb(rule);
    const row = await prisma.rule.create({ data });
    return dbToRule(row);
  },

  async updateRule(id: string, updates: Partial<ParseRule>): Promise<ParseRule | undefined> {
    const existing = await prisma.rule.findUnique({ where: { id } });
    if (!existing) return undefined;

    const data: any = { updatedAt: new Date().toISOString() };
    if (updates.name !== undefined) data.name = updates.name;
    if (updates.description !== undefined) data.description = updates.description;
    if (updates.parseMode !== undefined) data.parseMode = updates.parseMode;
    if (updates.fileConfig !== undefined) data.fileConfig = JSON.stringify(updates.fileConfig);
    if (updates.fieldMappings !== undefined) data.fieldMappings = JSON.stringify(updates.fieldMappings);
    if (updates.tailExtraction !== undefined) data.tailExtraction = updates.tailExtraction ? JSON.stringify(updates.tailExtraction) : null;
    if (updates.aggregation !== undefined) data.aggregation = updates.aggregation ? JSON.stringify(updates.aggregation) : null;
    if (updates.transpose !== undefined) data.transpose = updates.transpose ? JSON.stringify(updates.transpose) : null;
    if (updates.card !== undefined) data.card = updates.card ? JSON.stringify(updates.card) : null;
    if (updates.text !== undefined) data.text = updates.text ? JSON.stringify(updates.text) : null;
    if (updates.defaults !== undefined) data.defaults = updates.defaults ? JSON.stringify(updates.defaults) : null;

    const row = await prisma.rule.update({ where: { id }, data });
    return dbToRule(row);
  },

  async deleteRule(id: string): Promise<boolean> {
    try {
      await prisma.rule.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  // === Waybills ===
  async getWaybills(filters?: {
    externalCode?: string;
    receiverName?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 20;

    const where: any = {};
    if (filters?.externalCode) {
      where.externalCode = { contains: filters.externalCode };
    }
    if (filters?.receiverName) {
      where.receiverName = { contains: filters.receiverName };
    }
    if (filters?.startDate || filters?.endDate) {
      where.submittedAt = {};
      if (filters.startDate) where.submittedAt.gte = filters.startDate;
      if (filters.endDate) where.submittedAt.lte = filters.endDate;
    }

    const [rows, total] = await Promise.all([
      prisma.waybill.findMany({
        where,
        orderBy: { submittedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.waybill.count({ where }),
    ]);

    return {
      waybills: rows,
      total,
      page,
      pageSize,
    };
  },

  async addWaybills(waybills: any[]): Promise<void> {
    await prisma.waybill.createMany({ data: waybills });
  },

  async deleteWaybills(ids: string[]): Promise<number> {
    const result = await prisma.waybill.deleteMany({
      where: { id: { in: ids } },
    });
    return result.count;
  },

  // === Seed preset rules ===
  async seedPresetRules(): Promise<void> {
    const count = await prisma.rule.count();
    if (count > 0) return;

    const presets: ParseRule[] = [
      {
        id: 'preset_1',
        name: '黎明屯配送发货单',
        description: '43列，3行干扰头部，第4行表头，收货人/电话在尾部行',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        parseMode: 'table',
        fileConfig: { skipRows: 3, headerRow: 3, dataStartRow: 4, dataEndRow: 6, sheetMode: 'single' },
        fieldMappings: [
          { targetField: 'skuCode', sourceType: 'column', sourceValue: '2', confidence: 'high', label: '物品编码' },
          { targetField: 'skuName', sourceType: 'column', sourceValue: '3', confidence: 'high', label: '物品名称' },
          { targetField: 'skuSpec', sourceType: 'column', sourceValue: '5', confidence: 'medium', label: '规格型号' },
          { targetField: 'skuQuantity', sourceType: 'column', sourceValue: '12', confidence: 'high', label: '原订货数量' },
        ],
        tailExtraction: {
          enabled: true,
          startOffset: 4,
          patterns: [
            { field: 'storeName', pattern: '收货机构[：:]?\\s*(.+?)(?:\\s+供|$)', rowOffset: 0 },
            { field: 'externalCode', pattern: '(?:单据号|配送单号)[：:]?\\s*(PS\\d+|[A-Z]+\\d+)', rowOffset: 0 },
            { field: 'receiverName', pattern: '(?<![\\w\\[【])收货人[：:]?\\s*(.+?)(?:\\s+收货电话|\\s+备用|\\s*$)', rowOffset: 0 },
            { field: 'receiverPhone', pattern: '收货电话[：:]?\\s*(1\\d{10}|\\d{3,4}-?\\d{7,8}|\\d{7,12})', rowOffset: 0 },
            { field: 'receiverAddress', pattern: '收货地址[：:]?\\s*(.+?)$', rowOffset: 0 },
          ],
        },
      },
      {
        id: 'preset_2',
        name: '湖南仓发货明细',
        description: '32列，按配送单号聚合，收货人/电话/地址在尾部列',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        parseMode: 'table',
        fileConfig: { skipRows: 1, headerRow: 1, dataStartRow: 2, dataEndRow: 'auto', sheetMode: 'single' },
        fieldMappings: [
          { targetField: 'storeName', sourceType: 'column', sourceValue: '0', confidence: 'high', label: '收货机构' },
          { targetField: 'externalCode', sourceType: 'column', sourceValue: '2', confidence: 'high', label: '配送单号' },
          { targetField: 'skuCode', sourceType: 'column', sourceValue: '5', confidence: 'high', label: '物品编码' },
          { targetField: 'skuName', sourceType: 'column', sourceValue: '6', confidence: 'high', label: '物品名称' },
          { targetField: 'skuSpec', sourceType: 'column', sourceValue: '8', confidence: 'medium', label: '规格型号' },
          { targetField: 'skuQuantity', sourceType: 'column', sourceValue: '11', confidence: 'high', label: '应发数量' },
          { targetField: 'receiverName', sourceType: 'column', sourceValue: '26', confidence: 'high', label: '收货人' },
          { targetField: 'receiverPhone', sourceType: 'column', sourceValue: '27', confidence: 'high', label: '收货电话' },
          { targetField: 'receiverAddress', sourceType: 'column', sourceValue: '28', confidence: 'high', label: '收货地址' },
        ],
        aggregation: {
          enabled: true,
          groupByKey: 'externalCode',
          sharedFields: ['storeName', 'receiverName', 'receiverPhone', 'receiverAddress'],
        },
      },
      {
        id: 'preset_3',
        name: '欢乐牧场库存模板',
        description: '19列标准库存表，SKU名称/条码/在库数量',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        parseMode: 'table',
        fileConfig: { skipRows: 0, headerRow: 0, dataStartRow: 1, dataEndRow: 'auto', sheetMode: 'single' },
        fieldMappings: [
          { targetField: 'storeName', sourceType: 'column', sourceValue: '0', confidence: 'high', label: '仓库名称' },
          { targetField: 'skuName', sourceType: 'column', sourceValue: '2', confidence: 'high', label: 'SKU名称' },
          { targetField: 'skuCode', sourceType: 'column', sourceValue: '3', confidence: 'high', label: 'SKU条码' },
          { targetField: 'skuSpec', sourceType: 'column', sourceValue: '7', confidence: 'medium', label: '规格' },
          { targetField: 'skuQuantity', sourceType: 'column', sourceValue: '8', confidence: 'high', label: '在库数量' },
        ],
      },
      {
        id: 'preset_4',
        name: '多门店分Sheet出库单',
        description: '3个Sheet，每个Sheet是一个门店出库单，底部收货信息',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        parseMode: 'table',
        fileConfig: { skipRows: 3, headerRow: 3, dataStartRow: 4, dataEndRow: 'auto', sheetMode: 'all' },
        fieldMappings: [
          { targetField: 'skuCode', sourceType: 'column', sourceValue: '1', confidence: 'high', label: '物品编码' },
          { targetField: 'skuName', sourceType: 'column', sourceValue: '2', confidence: 'high', label: '物品名称' },
          { targetField: 'skuSpec', sourceType: 'column', sourceValue: '3', confidence: 'medium', label: '规格型号' },
          { targetField: 'skuQuantity', sourceType: 'column', sourceValue: '5', confidence: 'high', label: '出库数量' },
        ],
        tailExtraction: {
          enabled: true,
          startOffset: 5,
          patterns: [
            { field: 'storeName', pattern: '收货门店[：:]?\\s*(.+?)(?:\\s|$)', rowOffset: 0 },
            { field: 'receiverName', pattern: '联系人[：:]?\\s*(.+?)(?:\\s|$)', rowOffset: 0 },
            { field: 'receiverPhone', pattern: '联系电话[：:]?\\s*(.+?)(?:\\s|$)', rowOffset: 0 },
            { field: 'receiverAddress', pattern: '收货地址[：:]?\\s*(.+?)$', rowOffset: 0 },
          ],
        },
      },
      {
        id: 'preset_5',
        name: '门店调拨单(卡片式)',
        description: '非标准表格，每条调拨记录是独立卡片区域',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        parseMode: 'card',
        fileConfig: { skipRows: 0, headerRow: 0, dataStartRow: 0, dataEndRow: 'auto', sheetMode: 'single' },
        fieldMappings: [
          { targetField: 'skuCode', sourceType: 'column', sourceValue: '0', confidence: 'high', label: '物品编码' },
          { targetField: 'skuName', sourceType: 'column', sourceValue: '1', confidence: 'high', label: '物品名称' },
          { targetField: 'skuSpec', sourceType: 'column', sourceValue: '2', confidence: 'medium', label: '规格' },
          { targetField: 'skuQuantity', sourceType: 'column', sourceValue: '3', confidence: 'high', label: '数量' },
        ],
        card: {
          startPattern: '▶|调拨记录',
          fieldPatterns: [
            { field: 'storeName', pattern: '调入门店[：:]?\\s*(.+?)(?:\\s+收货|$)' },
            { field: 'receiverName', pattern: '收货人[：:]?\\s*(.+?)(?:\\s+电|$)' },
            { field: 'receiverPhone', pattern: '电话[：:]?\\s*(.+?)(?:\\s|$)' },
            { field: 'receiverAddress', pattern: '收货地址[：:]?\\s*(.+?)$' },
          ],
        },
      },
      {
        id: 'preset_6',
        name: '门店配送确认单(纯文本)',
        description: 'Word纯文本格式，无表格，物品信息嵌在文本行中',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        parseMode: 'text',
        fileConfig: { skipRows: 0, headerRow: 0, dataStartRow: 0, dataEndRow: 'auto', sheetMode: 'single' },
        fieldMappings: [],
        text: {
          recordSeparator: '━{3,}|─{3,}',
          fieldPatterns: [
            { field: 'storeName', pattern: '门店[：:]\\s*(.+?)(?:\\n|$)' },
            { field: 'receiverName', pattern: '收货人[：:]\\s*(.+?)(?:\\n|$)' },
            { field: 'receiverPhone', pattern: '电话[：:]\\s*(.+?)(?:\\n|$)' },
            { field: 'receiverAddress', pattern: '地址[：:]\\s*(.+?)(?:\\n|$)' },
          ],
          itemPattern: '(\\d+)\\.\\s*(.+?)\\|\\s*(.+?)\\|\\s*(.+?)\\|\\s*(\\d+)',
        },
      },
      {
        id: 'preset_7',
        name: '周配送计划(矩阵+复合拆分)',
        description: '日期×门店矩阵，复合单元格拆分',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        parseMode: 'matrix',
        fileConfig: { skipRows: 0, headerRow: 0, dataStartRow: 1, dataEndRow: 'auto', sheetMode: 'single' },
        fieldMappings: [
          { targetField: 'storeName', sourceType: 'column', sourceValue: '0', confidence: 'high' },
        ],
        transpose: {
          enabled: true,
          pivotColumn: 0,
          valueStartColumn: 1,
          pivotFieldName: 'externalCode',
          valueFieldName: 'skuQuantity',
          compositeSplit: {
            enabled: true,
            separator: '\\n',
            itemPattern: '(.+?)\\s*[x×X]\\s*(\\d+)',
          },
        },
      },
      {
        id: 'preset_8',
        name: 'PDF配送签收单',
        description: 'PDF格式，头部元信息+物品列表+底部收货人签字区',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        parseMode: 'pdf',
        fileConfig: { skipRows: 0, headerRow: 0, dataStartRow: 1, dataEndRow: 'auto', sheetMode: 'single' },
        fieldMappings: [
          { targetField: 'skuCode', sourceType: 'column', sourceValue: '2', confidence: 'high', label: '物品编码' },
          { targetField: 'skuName', sourceType: 'column', sourceValue: '3', confidence: 'high', label: '物品名称' },
          { targetField: 'skuQuantity', sourceType: 'column', sourceValue: '5', confidence: 'high', label: '发货数量' },
        ],
        tailExtraction: {
          enabled: true,
          startOffset: 5,
          patterns: [
            { field: 'storeName', pattern: '收货机构[：:]?\\s*(.+?)(?:\\s*订货机构|\\s*供货机构|\\s*$)', rowOffset: 0 },
            { field: 'externalCode', pattern: '单据编号[：:]?\\s*(PS\\d+|[A-Z]+\\d+|[A-Za-z0-9\\-]+)', rowOffset: 0 },
            { field: 'receiverName', pattern: '收货人[：:]?\\s*(.+?)(?:\\s*收货电话|\\s*收货地址|\\s*$)', rowOffset: 0 },
            { field: 'receiverPhone', pattern: '收货电话[：:]?\\s*(1\\d{10}|\\d{3,4}-?\\d{7,8}|\\d{7,12})', rowOffset: 0 },
            { field: 'receiverAddress', pattern: '收货地址[：:]?\\s*(.+?)$', rowOffset: 0 },
          ],
        },
        text: {
          recordSeparator: '\\n{3,}',
          fieldPatterns: [
            { field: 'storeName', pattern: '收货机构[：:]?\\s*(.+?)(?:\\s*订货机构|\\s*供货机构|\\s*$)' },
            { field: 'externalCode', pattern: '单据编号[：:]?\\s*(PS\\d+|[A-Z]+\\d+|[A-Za-z0-9\\-]+)' },
            { field: 'receiverName', pattern: '收货人[：:]?\\s*(.+?)(?:\\s*收货电话|\\s*收货地址|\\s*$)' },
            { field: 'receiverPhone', pattern: '收货电话[：:]?\\s*(1\\d{10}|\\d{3,4}-?\\d{7,8}|\\d{7,12})' },
            { field: 'receiverAddress', pattern: '收货地址[：:]?\\s*(.+?)$' },
          ],
          itemPattern: '(\\d+)(\\S+?)([A-Z]{2,}\\d{3,})(.+?)(件|瓶|包|桶|袋|盒|码|个)(\\d+(?:\\.\\d+)?)',
        },
      },
      {
        id: 'preset_9',
        name: '通用出库模板',
        description: '9列标准出库单',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        parseMode: 'table',
        fileConfig: { skipRows: 1, headerRow: 1, dataStartRow: 2, dataEndRow: 'auto', sheetMode: 'single' },
        fieldMappings: [
          { targetField: 'skuCode', sourceType: 'column', sourceValue: '0', confidence: 'high', label: '物品编码' },
          { targetField: 'skuName', sourceType: 'column', sourceValue: '1', confidence: 'high', label: '物品名称' },
          { targetField: 'skuQuantity', sourceType: 'column', sourceValue: '4', confidence: 'high', label: '数量' },
        ],
      },
    ];

    await prisma.rule.createMany({ data: presets.map(ruleToDb) });
  },
};
