const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const demoDir = 'C:\\Users\\Administrator\\Desktop\\AI考试附件\\demos';
const outFile = 'C:\\Users\\Administrator\\Documents\\trae_projects\\UniversalImport\\analysis-output.txt';

const files = fs.readdirSync(demoDir).filter(f => 
  f.endsWith('.xlsx') || f.endsWith('.xls') || f.endsWith('.pdf') || f.endsWith('.docx')
);

let output = '';
const log = (msg) => { output += msg + '\n'; console.log(msg); };

log('找到文件: ' + files.length);

for (const file of files) {
  const filePath = path.join(demoDir, file);
  log('\n' + '='.repeat(80));
  log('文件: ' + file);
  log('='.repeat(80));

  if (file.endsWith('.xlsx') || file.endsWith('.xls')) {
    try {
      const workbook = XLSX.readFile(filePath);
      log('Sheet数量: ' + workbook.SheetNames.length);
      log('Sheet名称: ' + workbook.SheetNames.join(', '));

      for (const sheetName of workbook.SheetNames.slice(0, 3)) {
        log('\n--- Sheet: ' + sheetName + ' ---');
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: false });
        
        log('总行数: ' + jsonData.length);
        const maxCols = Math.max(...jsonData.map(r => r.length));
        log('最大列数: ' + maxCols);

        log('\n前15行:');
        for (let i = 0; i < Math.min(15, jsonData.length); i++) {
          const row = jsonData[i];
          const preview = row.slice(0, 12).map(c => String(c).trim().slice(0, 25)).join(' | ');
          log('  行' + i + ': [' + preview + ']' + (row.length > 12 ? ' ...' : ''));
        }

        if (jsonData.length > 15) {
          log('\n最后8行:');
          for (let i = Math.max(15, jsonData.length - 8); i < jsonData.length; i++) {
            const row = jsonData[i];
            const preview = row.map(c => String(c).trim().slice(0, 40)).join(' | ');
            log('  行' + i + ': [' + preview + ']');
          }
        }
      }
    } catch (e) {
      log('解析失败: ' + e.message);
    }
  } else {
    log('非Excel文件，跳过详细分析');
  }
}

log('\n\n=== 分析完成 ===');
fs.writeFileSync(outFile, output, 'utf-8');
log('结果已写入: ' + outFile);
