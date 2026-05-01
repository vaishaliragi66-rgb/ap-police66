const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');

const uploadDir = path.join(__dirname, 'tmp');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

const app = express();

app.post('/admin-api/employee-bulk-upload', upload.any(), async (req, res) => {
  try {
    const files = req.files || [];
    const excel = files.find(f => f.fieldname === 'excelFile');
    if (!excel) return res.status(400).json({ success: false, message: 'excelFile required' });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(excel.path);
    const sheet = workbook.worksheets[0];
    const rows = [];
    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return; // skip header
      rows.push(row.values);
    });

    // list uploaded photos
    const photos = files.filter(f => f.fieldname !== 'excelFile').map(f => path.basename(f.path));

    res.json({ success: true, totalRows: rows.length, photos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

const port = 6200;
app.listen(port, () => console.log(`Test bulk server listening on ${port}`));
