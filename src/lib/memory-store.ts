// 内存存储 - 当数据库不可用时作为 fallback
import { ParseRule } from '@/types';

let rulesStore: ParseRule[] = [];
let waybillsStore: any[] = [];
let nextRuleId = 1;

export const memoryStore = {
  getRules(): ParseRule[] {
    if (rulesStore.length === 0) {
      this.seedPresetRules();
    }
    return rulesStore;
  },

  getRule(id: string): ParseRule | undefined {
    if (rulesStore.length === 0) {
      this.seedPresetRules();
    }
    return rulesStore.find(r => r.id === id);
  },

  addRule(rule: ParseRule): ParseRule {
    const newRule: ParseRule = {
      ...rule,
      id: rule.id || `rule_${nextRuleId++}`,
      createdAt: rule.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    rulesStore.push(newRule);
    return newRule;
  },

  updateRule(id: string, updates: Partial<ParseRule>): ParseRule | undefined {
    const index = rulesStore.findIndex(r => r.id === id);
    if (index === -1) return undefined;
    rulesStore[index] = {
      ...rulesStore[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    return rulesStore[index];
  },

  deleteRule(id: string): boolean {
    const index = rulesStore.findIndex(r => r.id === id);
    if (index === -1) return false;
    rulesStore.splice(index, 1);
    return true;
  },

  // Waybills
  getWaybills(filters?: {
    externalCode?: string;
    receiverName?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
  }) {
    let filtered = [...waybillsStore];
    if (filters?.externalCode) {
      filtered = filtered.filter(w => w.externalCode?.includes(filters.externalCode!));
    }
    if (filters?.receiverName) {
      filtered = filtered.filter(w => w.receiverName?.includes(filters.receiverName!));
    }
    if (filters?.startDate) {
      filtered = filtered.filter(w => new Date(w.submittedAt) >= new Date(filters.startDate!));
    }
    if (filters?.endDate) {
      filtered = filtered.filter(w => new Date(w.submittedAt) <= new Date(filters.endDate!));
    }

    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 20;
    const start = (page - 1) * pageSize;
    const paged = filtered.slice(start, start + pageSize);

    return {
      waybills: paged,
      total: filtered.length,
      page,
      pageSize,
    };
  },

  addWaybills(waybills: any[]): void {
    waybillsStore.push(...waybills);
  },

  // Seed preset rules - based on actual demo file analysis
  seedPresetRules(): void {
    if (rulesStore.length > 0) return;

    const presets: ParseRule[] = [
      // 1. 黎明屯配送发货单
      // 行0: 标题, 行1: 收货机构/供货机构等, 行2: 发货操作时间等, 行3: 表头(序号/物品分类/物品编码/物品名称...)
      // 行4-5: 数据, 行6: 合计, 行7: 单据号等, 行8: 收货人/收货电话, 行9: 备注
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
          startOffset: 4, // last 4 rows: 行7单据号, 行8收货人, 行9备注, +1
          patterns: [
            { field: 'storeName', pattern: '收货机构[：:]?\\s*(.+?)(?:\\s+供|$)', rowOffset: 0 },
            { field: 'externalCode', pattern: '(?:单据号|配送单号)[：:]?\\s*(PS\\d+|[A-Z]+\\d+)', rowOffset: 0 },
            { field: 'receiverName', pattern: '(?<![\\w\\[【])收货人[：:]?\\s*(.+?)(?:\\s+收货电话|\\s+备用|\\s*$)', rowOffset: 0 },
            { field: 'receiverPhone', pattern: '收货电话[：:]?\\s*(1\\d{10}|\\d{3,4}-?\\d{7,8}|\\d{7,12})', rowOffset: 0 },
            { field: 'receiverAddress', pattern: '收货地址[：:]?\\s*(.+?)$', rowOffset: 0 },
          ],
        },
      },

      // 2. 湖南仓发货明细
      // 行0: 说明文字, 行1: 表头(收货机构/配送汇总单号/配送单号/物品行号/物品分类/物品编码/物品名称/物品品牌/规格型号/订货单位/换算率/应发数量...)
      // 列0=收货机构, 列1=配送汇总单号, 列2=配送单号, 列3=物品行号, 列4=物品分类, 列5=物品编码, 列6=物品名称
      // 列7=物品品牌, 列8=规格型号, 列9=订货单位, 列10=换算率, 列11=应发数量
      // 尾部列: 列22=创建日期, 列23=收货人, 列24=收货人电话, 列25=收货地址
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

      // 3. 欢乐牧场模板
      // 行0: 表头(仓库名称/货主名称/SKU名称/SKU条码/外部商品编码/库存状态/库存单位/规格/在库数量/可用数量...)
      // 标准表格，每行一个SKU，没有门店列（这是库存查询表，不是矩阵转置）
      // 列0=仓库名称, 列1=货主名称, 列2=SKU名称, 列3=SKU条码, 列4=外部商品编码
      // 列5=库存状态, 列6=库存单位, 列7=规格, 列8=在库数量
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

      // 4. 多门店分Sheet出库单
      // 每个Sheet: 行0=标题(门店名出库单), 行1=出库日期/仓库, 行2=空, 行3=表头(序号/物品编码/物品名称/规格型号/单位/出库数量/仓库/备注)
      // 行4-10=数据, 行11=合计, 行12=空, 行13=收货门店/联系人, 行14=联系电话/收货地址
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
          startOffset: 5, // last 5 rows: 行12空, 行13收货门店/联系人, 行14联系电话/收货地址, 行15空, 行16制单人
          patterns: [
            { field: 'storeName', pattern: '收货门店[：:]?\\s*(.+?)(?:\\s|$)', rowOffset: 0 },
            { field: 'receiverName', pattern: '联系人[：:]?\\s*(.+?)(?:\\s|$)', rowOffset: 0 },
            { field: 'receiverPhone', pattern: '联系电话[：:]?\\s*(.+?)(?:\\s|$)', rowOffset: 0 },
            { field: 'receiverAddress', pattern: '收货地址[：:]?\\s*(.+?)$', rowOffset: 0 },
          ],
        },
      },

      // 5. 门店调拨单(卡片式)
      // 行0: 标题, 行1: 调拨单号, 行2: 空
      // 行3: ▶ 调拨记录 #1
      // 行4: 调入门店 | 尹三顺自助烤肉（银泰店） | 收货人 | 王店长 | 电话 | 13900001111
      // 行5: 收货地址 | 汉口解放大道688号银泰百货B1层
      // 行6: 物品编码 | 物品名称 | 规格 | 数量
      // 行7-9: 数据行
      // 行10: 空
      // 行11: ▶ 调拨记录 #2 ...
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

      // 6. 门店配送确认单(纯文本) - Word文档，暂无demo文件
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

      // 7. 周配送计划(矩阵+复合拆分) - 暂无demo文件
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

      // 8. PDF配送单 - 黔寨寨贵州烙锅（鞍山店）
      // PDF结构: 头部元信息(单据编号/收货机构等) + 物品列表(序号 类别 编码 名称 规格 单位 数量) + 尾部(收货人/电话/地址)
      // 物品行格式: "1饮品类ZBWP0001茶语柠听紫苏风味糖浆750ml*6瓶/件件2"
      // 有些物品名称跨行（如ZBWP0023、ZBWP0056）
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
        description: '9列标准出库单，头部1行说明，第2行表头，支持自动识别',
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

    rulesStore = presets;
    nextRuleId = presets.length + 1;
  },
};
