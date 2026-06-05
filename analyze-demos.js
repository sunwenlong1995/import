const XLSX = require('./node_modules/xlsx');
const fs = require('fs');
const path = require('path');

const demosDir = 'C:\\Users\\Administrator\\Desktop\\demos';
const files = fs.readdirSync(demosDir);

for (const file of files) {
  const filePath = path.join(demosDir, file);
  const ext = path.extname(file).toLowerCase();
  const stat = fs.statSync(filePath);
  
  console.log('\n' + '='.repeat(80));
  console.log(`FILE: ${file} (${(stat.size / 1024).toFixed(1)} KB)`);
  console.log('='.repeat(80));
  
  if (ext === '.xlsx' || ext === '.xls') {
    try {
      const workbook = XLSX.readFile(filePath);
      console.log(`Sheets: ${workbook.SheetNames.join(', ')}`);
      
      for (const sheetName of workbook.SheetNames) {
        const ws = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
        console.log(`\n--- Sheet: ${sheetName} (${data.length} rows) ---`);
        // Print first 25 rows
        for (let i = 0; i < Math.min(25, data.length); i++) {
          const row = data[i];
          const rowStr = row.map((cell, idx) => `[${idx}]${String(cell).substring(0, 30)}`).join(' | ');
          console.log(`Row ${i}: ${rowStr}`);
        }
        if (data.length > 25) {
          console.log(`... ${data.length - 25} more rows`);
        }
      }
    } catch (e) {
      console.log(`Error reading Excel: ${e.message}`);
    }
  } else if (ext === '.pdf') {
    console.log('PDF file - needs pdf-parse to analyze');
  } else {
    // Try as xlsx anyway (some files might have wrong extension)
    try {
      const workbook = XLSX.readFile(filePath);
      console.log(`(Detected as Excel) Sheets: ${workbook.SheetNames.join(', ')}`);
      for (const sheetName of workbook.SheetNames) {
        const ws = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
        console.log(`\n--- Sheet: ${sheetName} (${data.length} rows) ---`);
        for (let i = 0; i < Math.min(25, data.length); i++) {
          const row = data[i];
          const rowStr = row.map((cell, idx) => `[${idx}]${String(cell).substring(0, 30)}`).join(' | ');
          console.log(`Row ${i}: ${rowStr}`);
        }
      }
    } catch (e) {
      console.log(`Not an Excel file: ${e.message}`);
    }
  }
}
