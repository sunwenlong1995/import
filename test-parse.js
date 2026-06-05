const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Import parsers (we'll simulate the parse logic)
const demoDir = 'C:\\Users\\Administrator\\Desktop\\AI考试附件\\demos';

function testFile(fileName, ruleName, parseFn) {
  const filePath = path.join(demoDir, fileName);
  if (!fs.existsSync(filePath)) {
    console.log(`SKIP: ${fileName} not found`);
    return;
  }
  
  const workbook = XLSX.readFile(filePath);
  console.log(`\n=== ${ruleName} (${fileName}) ===`);
  
  const results = parseFn(workbook);
  console.log(`解析结果: ${results.length} 条记录`);
  
  if (results.length > 0) {
    console.log('前3条:');
    results.slice(0, 3).forEach((r, i) => {
      console.log(`  ${i+1}. 门店=${r.storeName || '(空)'}, 编码=${r.skuCode || '(空)'}, 名称=${r.skuName || '(空)'}, 数量=${r.skuQuantity}, 收货人=${r.receiverName || '(空)'}, 电话=${r.receiverPhone || '(空)'}, 地址=${r.receiverAddress || '(空)'}`);
    });
  }
}

// 1. 黎明屯配送发货单
testFile('12.25海口龙湖天街-配送发货单PS2512220005001(1).xlsx', '黎明屯配送发货单', (workbook) => {
  const ws = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
  
  // 行3=表头, 行4-5=数据, 行6=合计(跳过)
  const results = [];
  for (let i = 4; i <= 5; i++) {
    const row = rows[i];
    if (!row || row[0]?.includes('合计')) continue;
    results.push({
      storeName: '', // 从行1提取
      skuCode: String(row[2] || '').trim(),
      skuName: String(row[3] || '').trim(),
      skuSpec: String(row[5] || '').trim(),
      skuQuantity: parseFloat(row[12]) || 0,
      receiverName: String(rows[8]?.[1] || '').trim(),
      receiverPhone: String(rows[8]?.[4] || '').trim(),
      receiverAddress: '',
    });
  }
  // 从行1提取收货机构
  const storeName = String(rows[1]?.[1] || '').trim();
  results.forEach(r => r.storeName = storeName);
  return results;
});

// 2. 湖南仓发货明细
testFile('湖南仓.xlsx', '湖南仓发货明细', (workbook) => {
  const ws = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
  
  const results = [];
  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row[0]?.includes('合计')) continue;
    results.push({
      storeName: String(row[0] || '').trim(),
      externalCode: String(row[2] || '').trim(),
      skuCode: String(row[5] || '').trim(),
      skuName: String(row[6] || '').trim(),
      skuSpec: String(row[8] || '').trim(),
      skuQuantity: parseFloat(row[11]) || 0,
      receiverName: String(row[23] || '').trim(),
      receiverPhone: String(row[24] || '').trim(),
      receiverAddress: String(row[25] || '').trim(),
    });
  }
  return results;
});

// 3. 欢乐牧场模板
testFile('欢乐牧场模板0430.xlsx', '欢乐牧场库存模板', (workbook) => {
  const ws = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
  
  const results = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row[0]?.includes('合计')) continue;
    results.push({
      storeName: String(row[0] || '').trim(),
      skuName: String(row[2] || '').trim(),
      skuCode: String(row[3] || '').trim(),
      skuSpec: String(row[7] || '').trim(),
      skuQuantity: parseFloat(row[8]) || 0,
    });
  }
  return results;
});

// 4. 多门店分Sheet出库单
testFile('多门店分Sheet出库单.xlsx', '多门店分Sheet出库单', (workbook) => {
  const results = [];
  for (const sheetName of workbook.SheetNames) {
    const ws = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
    
    // 行3=表头, 行4+=数据
    for (let i = 4; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row[0]?.includes('合计') || row.every(c => !c || c.trim() === '')) continue;
      if (!row[1] && !row[2]) continue; // skip non-data rows
      
      results.push({
        storeName: '', // from tail
        skuCode: String(row[1] || '').trim(),
        skuName: String(row[2] || '').trim(),
        skuSpec: String(row[3] || '').trim(),
        skuQuantity: parseFloat(row[5]) || 0,
        receiverName: '',
        receiverPhone: '',
        receiverAddress: '',
      });
    }
    
    // Extract tail info
    const storeName = String(rows[13]?.[1] || '').trim();
    const receiverName = String(rows[13]?.[5] || '').trim();
    const receiverPhone = String(rows[14]?.[1] || '').trim();
    const receiverAddress = String(rows[14]?.[5] || '').trim();
    
    // Apply to last batch of records for this sheet
    const sheetRecordStart = results.length - (rows.length - 4 - 2); // approximate
    for (let i = Math.max(0, sheetRecordStart); i < results.length; i++) {
      results[i].storeName = storeName;
      results[i].receiverName = receiverName;
      results[i].receiverPhone = receiverPhone;
      results[i].receiverAddress = receiverAddress;
    }
  }
  return results;
});

// 5. 门店调拨单(卡片式)
testFile('门店调拨单-卡片式.xlsx', '门店调拨单(卡片式)', (workbook) => {
  const ws = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
  
  const results = [];
  let currentCard = { storeName: '', receiverName: '', receiverPhone: '', receiverAddress: '' };
  
  for (let i = 0; i < rows.length; i++) {
    const rowText = rows[i].join(' ').trim();
    
    if (rowText.includes('▶') || rowText.includes('调拨记录')) {
      // New card - extract fields from next rows
      currentCard = { storeName: '', receiverName: '', receiverPhone: '', receiverAddress: '' };
      
      // Look for fields in subsequent rows
      for (let j = i + 1; j < Math.min(i + 5, rows.length); j++) {
        const r = rows[j];
        for (let k = 0; k < r.length; k++) {
          const cell = String(r[k] || '').trim();
          const nextCell = String(r[k + 1] || '').trim();
          if (cell.includes('调入门店') && nextCell) currentCard.storeName = nextCell;
          if (cell.includes('收货人') && nextCell) currentCard.receiverName = nextCell;
          if (cell.includes('电话') && nextCell) currentCard.receiverPhone = nextCell;
          if (cell.includes('收货地址') && nextCell) currentCard.receiverAddress = nextCell;
        }
      }
      continue;
    }
    
    // Item rows (after header row with 物品编码)
    if (rowText.includes('物品编码')) continue;
    
    // Data row
    const code = String(rows[i][0] || '').trim();
    const name = String(rows[i][1] || '').trim();
    if (code && name && !code.includes('合计') && !code.includes('调拨')) {
      results.push({
        storeName: currentCard.storeName,
        skuCode: code,
        skuName: name,
        skuSpec: String(rows[i][2] || '').trim(),
        skuQuantity: parseFloat(rows[i][3]) || 0,
        receiverName: currentCard.receiverName,
        receiverPhone: currentCard.receiverPhone,
        receiverAddress: currentCard.receiverAddress,
      });
    }
  }
  return results;
});

console.log('\n=== 测试完成 ===');
