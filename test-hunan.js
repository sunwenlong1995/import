const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const demoDir = 'C:\\Users\\Administrator\\Desktop\\AI考试附件\\demos';

// 2. 湖南仓发货明细 - 打印完整表头和数据行
const filePath = path.join(demoDir, '湖南仓.xlsx');
const workbook = XLSX.readFile(filePath);
const ws = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });

console.log('=== 湖南仓 表头 ===');
const header = rows[1];
for (let i = 0; i < header.length; i++) {
  console.log(`  列${i}: ${header[i]}`);
}

console.log('\n=== 湖南仓 第2行数据 ===');
const dataRow = rows[2];
for (let i = 0; i < dataRow.length; i++) {
  if (dataRow[i]) console.log(`  列${i}: ${dataRow[i]}`);
}

console.log('\n=== 湖南仓 最后一行数据 ===');
const lastRow = rows[rows.length - 1];
for (let i = 0; i < lastRow.length; i++) {
  if (lastRow[i]) console.log(`  列${i}: ${lastRow[i]}`);
}
