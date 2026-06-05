// 预设解析规则种子数据
// 运行: node seed-rules.js

const rules = [
  // 1. 黎明屯配送发货单 - table + tailExtraction
  {
    name: '黎明屯配送发货单',
    description: '42列，3行干扰头部，第4行表头，尾部提取收货人信息',
    parseMode: 'table',
    fileConfig: {
      skipRows: 3,
      headerRow: 3,
      dataStartRow: 4,
      dataEndRow: 'auto',
      sheetMode: 'single',
    },
    fieldMappings: [
      { targetField: 'externalCode', sourceType: 'column', sourceValue: '0', confidence: 'high' },
      { targetField: 'skuCode', sourceType: 'column', sourceValue: '6', confidence: 'medium' },
      { targetField: 'skuName', sourceType: 'column', sourceValue: '7', confidence: 'high' },
      { targetField: 'skuQuantity', sourceType: 'column', sourceValue: '10', confidence: 'high' },
      { targetField: 'skuSpec', sourceType: 'column', sourceValue: '8', confidence: 'medium' },
    ],
    tailExtraction: {
      enabled: true,
      startOffset: 5,
      patterns: [
        { field: 'receiverName', pattern: '收货人[：:]\\s*(.+?)(?:\\s|$)', rowOffset: 0 },
        { field: 'receiverPhone', pattern: '电话[：:]\\s*(.+?)(?:\\s|$)', rowOffset: 0 },
        { field: 'receiverAddress', pattern: '地址[：:]\\s*(.+?)$', rowOffset: 0 },
        { field: 'storeName', pattern: '门店[：:]\\s*(.+?)(?:\\s|$)', rowOffset: 0 },
      ],
    },
    aggregation: { enabled: false, groupByKey: '', sharedFields: [] },
    transpose: { enabled: false, pivotColumn: 0, valueStartColumn: 2, pivotFieldName: '', valueFieldName: '' },
  },

  // 2. 湖南仓发货明细 - table + aggregation
  {
    name: '湖南仓发货明细',
    description: '32列，按配送单号聚合，同一单号共享收货人信息',
    parseMode: 'table',
    fileConfig: {
      skipRows: 1,
      headerRow: 1,
      dataStartRow: 2,
      dataEndRow: 'auto',
      sheetMode: 'single',
    },
    fieldMappings: [
      { targetField: 'externalCode', sourceType: 'column', sourceValue: '0', confidence: 'high' },
      { targetField: 'storeName', sourceType: 'column', sourceValue: '1', confidence: 'high' },
      { targetField: 'receiverName', sourceType: 'column', sourceValue: '2', confidence: 'high' },
      { targetField: 'receiverPhone', sourceType: 'column', sourceValue: '3', confidence: 'high' },
      { targetField: 'receiverAddress', sourceType: 'column', sourceValue: '4', confidence: 'high' },
      { targetField: 'skuCode', sourceType: 'column', sourceValue: '8', confidence: 'medium' },
      { targetField: 'skuName', sourceType: 'column', sourceValue: '9', confidence: 'high' },
      { targetField: 'skuQuantity', sourceType: 'column', sourceValue: '11', confidence: 'high' },
      { targetField: 'skuSpec', sourceType: 'column', sourceValue: '10', confidence: 'medium' },
    ],
    tailExtraction: { enabled: false, startOffset: 3, patterns: [] },
    aggregation: {
      enabled: true,
      groupByKey: 'externalCode',
      sharedFields: ['storeName', 'receiverName', 'receiverPhone', 'receiverAddress'],
    },
    transpose: { enabled: false, pivotColumn: 0, valueStartColumn: 2, pivotFieldName: '', valueFieldName: '' },
  },

  // 3. 欢乐牧场模板 - matrix transpose
  {
    name: '欢乐牧场模板',
    description: 'SKU×门店矩阵，门店名作为列头横向排列，需转置',
    parseMode: 'matrix',
    fileConfig: {
      skipRows: 0,
      headerRow: 1,
      dataStartRow: 2,
      dataEndRow: 'auto',
      sheetMode: 'single',
    },
    fieldMappings: [
      { targetField: 'skuCode', sourceType: 'column', sourceValue: '0', confidence: 'high' },
      { targetField: 'skuName', sourceType: 'column', sourceValue: '1', confidence: 'high' },
      { targetField: 'skuSpec', sourceType: 'column', sourceValue: '2', confidence: 'medium' },
    ],
    tailExtraction: { enabled: false, startOffset: 3, patterns: [] },
    aggregation: { enabled: false, groupByKey: '', sharedFields: [] },
    transpose: {
      enabled: true,
      pivotColumn: 0,
      valueStartColumn: 3,
      pivotFieldName: 'storeName',
      valueFieldName: 'skuQuantity',
    },
  },

  // 4. 多门店分Sheet出库单 - table + multiSheet
  {
    name: '多门店分Sheet出库单',
    description: '3个Sheet，每个Sheet是一个门店出库单，底部有收货人信息',
    parseMode: 'table',
    fileConfig: {
      skipRows: 2,
      headerRow: 2,
      dataStartRow: 3,
      dataEndRow: 'auto',
      sheetMode: 'all',
    },
    fieldMappings: [
      { targetField: 'skuCode', sourceType: 'column', sourceValue: '0', confidence: 'high' },
      { targetField: 'skuName', sourceType: 'column', sourceValue: '1', confidence: 'high' },
      { targetField: 'skuQuantity', sourceType: 'column', sourceValue: '2', confidence: 'high' },
      { targetField: 'skuSpec', sourceType: 'column', sourceValue: '3', confidence: 'medium' },
    ],
    tailExtraction: {
      enabled: true,
      startOffset: 4,
      patterns: [
        { field: 'storeName', pattern: '门店[：:]\\s*(.+?)(?:\\s|$)', rowOffset: 0 },
        { field: 'receiverName', pattern: '收货人[：:]\\s*(.+?)(?:\\s|$)', rowOffset: 0 },
        { field: 'receiverPhone', pattern: '电话[：:]\\s*(.+?)(?:\\s|$)', rowOffset: 0 },
        { field: 'receiverAddress', pattern: '地址[：:]\\s*(.+?)$', rowOffset: 0 },
      ],
    },
    aggregation: { enabled: false, groupByKey: '', sharedFields: [] },
    transpose: { enabled: false, pivotColumn: 0, valueStartColumn: 2, pivotFieldName: '', valueFieldName: '' },
  },

  // 5. 门店调拨单(卡片式) - card
  {
    name: '门店调拨单(卡片式)',
    description: '非标准表格，每条调拨记录是独立卡片区域，纵向堆叠',
    parseMode: 'card',
    fileConfig: {
      skipRows: 0,
      headerRow: 0,
      dataStartRow: 0,
      dataEndRow: 'auto',
      sheetMode: 'single',
    },
    fieldMappings: [
      { targetField: 'skuCode', sourceType: 'column', sourceValue: '0', confidence: 'high' },
      { targetField: 'skuName', sourceType: 'column', sourceValue: '1', confidence: 'high' },
      { targetField: 'skuQuantity', sourceType: 'column', sourceValue: '2', confidence: 'high' },
      { targetField: 'skuSpec', sourceType: 'column', sourceValue: '3', confidence: 'medium' },
    ],
    tailExtraction: { enabled: false, startOffset: 3, patterns: [] },
    aggregation: { enabled: false, groupByKey: '', sharedFields: [] },
    transpose: { enabled: false, pivotColumn: 0, valueStartColumn: 2, pivotFieldName: '', valueFieldName: '' },
    card: {
      startPattern: '▶|调拨记录|记录\\s*#',
      fieldPatterns: [
        { field: 'storeName', pattern: '门店[：:]\\s*(.+?)(?:\\s|$)' },
        { field: 'receiverName', pattern: '收货人[：:]\\s*(.+?)(?:\\s|$)' },
        { field: 'receiverPhone', pattern: '电话[：:]\\s*(.+?)(?:\\s|$)' },
        { field: 'receiverAddress', pattern: '地址[：:]\\s*(.+?)$' },
      ],
    },
  },

  // 6. 门店配送确认单(纯文本) - text
  {
    name: '门店配送确认单(纯文本)',
    description: 'Word纯文本格式，无表格，物品信息嵌在文本行中',
    parseMode: 'text',
    fileConfig: {
      skipRows: 0,
      headerRow: 0,
      dataStartRow: 0,
      dataEndRow: 'auto',
      sheetMode: 'single',
    },
    fieldMappings: [
      { targetField: 'skuCode', sourceType: 'regex', sourceValue: '(\\d+)\\.', confidence: 'medium' },
      { targetField: 'skuName', sourceType: 'regex', sourceValue: '\\|\\s*(.+?)\\s*\\|', confidence: 'medium' },
      { targetField: 'skuQuantity', sourceType: 'regex', sourceValue: '\\|\\s*(\\d+)\\s*$', confidence: 'medium' },
    ],
    tailExtraction: { enabled: false, startOffset: 3, patterns: [] },
    aggregation: { enabled: false, groupByKey: '', sharedFields: [] },
    transpose: { enabled: false, pivotColumn: 0, valueStartColumn: 2, pivotFieldName: '', valueFieldName: '' },
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

  // 7. 周配送计划 - matrix + compositeSplit
  {
    name: '周配送计划',
    description: '日期×门店矩阵，复合单元格拆分',
    parseMode: 'matrix',
    fileConfig: {
      skipRows: 0,
      headerRow: 0,
      dataStartRow: 1,
      dataEndRow: 'auto',
      sheetMode: 'single',
    },
    fieldMappings: [
      { targetField: 'storeName', sourceType: 'column', sourceValue: '0', confidence: 'high' },
    ],
    tailExtraction: { enabled: false, startOffset: 3, patterns: [] },
    aggregation: { enabled: false, groupByKey: '', sharedFields: [] },
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

  // 8. PDF配送单 - pdf + tailExtraction
  {
    name: 'PDF配送单',
    description: 'PDF格式，头部元信息+标准表格+底部收货人签字区',
    parseMode: 'pdf',
    fileConfig: {
      skipRows: 0,
      headerRow: 0,
      dataStartRow: 1,
      dataEndRow: 'auto',
      sheetMode: 'single',
    },
    fieldMappings: [
      { targetField: 'skuCode', sourceType: 'column', sourceValue: '0', confidence: 'medium' },
      { targetField: 'skuName', sourceType: 'column', sourceValue: '1', confidence: 'high' },
      { targetField: 'skuQuantity', sourceType: 'column', sourceValue: '2', confidence: 'high' },
    ],
    tailExtraction: {
      enabled: true,
      startOffset: 5,
      patterns: [
        { field: 'receiverName', pattern: '收货人[：:]\\s*(.+?)(?:\\s|$)', rowOffset: 0 },
        { field: 'receiverPhone', pattern: '电话[：:]\\s*(.+?)(?:\\s|$)', rowOffset: 0 },
        { field: 'receiverAddress', pattern: '地址[：:]\\s*(.+?)$', rowOffset: 0 },
      ],
    },
    aggregation: { enabled: false, groupByKey: '', sharedFields: [] },
    transpose: { enabled: false, pivotColumn: 0, valueStartColumn: 2, pivotFieldName: '', valueFieldName: '' },
    text: {
      recordSeparator: '\\n{3,}',
      fieldPatterns: [
        { field: 'storeName', pattern: '门店[：:]\\s*(.+?)(?:\\n|$)' },
        { field: 'receiverName', pattern: '收货人[：:]\\s*(.+?)(?:\\n|$)' },
        { field: 'receiverPhone', pattern: '电话[：:]\\s*(.+?)(?:\\n|$)' },
        { field: 'receiverAddress', pattern: '地址[：:]\\s*(.+?)(?:\\n|$)' },
      ],
      itemPattern: '(\\S+)\\s+(.+?)\\s+(\\d+)',
    },
  },
];

// API seed endpoint
const http = require('http');

async function seedRules() {
  for (const rule of rules) {
    const data = JSON.stringify({ rule });
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/rules',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };

    await new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            console.log(`✓ Created rule: ${rule.name}`);
          } else {
            console.log(`✗ Failed to create rule: ${rule.name} - ${body}`);
          }
          resolve(undefined);
        });
      });
      req.on('error', (e) => {
        console.log(`✗ Error creating rule: ${rule.name} - ${e.message}`);
        resolve(undefined);
      });
      req.write(data);
      req.end();
    });
  }
  console.log('\nDone! All preset rules have been seeded.');
}

seedRules();
