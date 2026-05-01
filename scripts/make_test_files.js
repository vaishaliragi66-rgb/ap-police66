let ExcelJS;
try {
  ExcelJS = require('exceljs');
} catch (err) {
  ExcelJS = require('../server/node_modules/exceljs');
}
const fs = require('fs');
const path = require('path');

(async function(){
  const outDir = path.join(__dirname, 'tmp');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Sheet1');
  ws.addRow(['ABS_NO','Name','Email','Password','Gender']);
  ws.addRow(['POL001','Test User','test@example.com','TempPass123','Male']);

  const xlsxPath = path.join(outDir, 'sample.xlsx');
  await wb.xlsx.writeFile(xlsxPath);

  const jpgPath = path.join(outDir, 'photo1.jpg');
  fs.writeFileSync(jpgPath, Buffer.from([0xff,0xd8,0xff,0xd9])); // minimal JPEG markers

  console.log('Wrote test files:', xlsxPath, jpgPath);
})();
