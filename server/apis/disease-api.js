const express = require("express");
const mongoose = require("mongoose");
const diseaseApp = express.Router();
const { verifyToken, allowInstituteRoles } = require("./instituteAuth");
const Disease = require("../models/disease");

const formatDiseaseDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN");
};

const extractSymptomsFromNotes = (notes) => {
  if (!notes) return [];
  const match = notes.match(/Symptoms\s*:\s*(.*)/i);
  if (!match) return [];
  const line = match[1].split("\n")[0];
  return line.split(",").map((item) => item.trim()).filter(Boolean);
};

const cleanNotesWithoutSymptoms = (notes) => {
  if (!notes) return "-";
  const cleaned = notes.replace(/Symptoms\s*:\s*.*(\r?\n)?/i, "").trim();
  return cleaned || "-";
};

// =======================================================
// GET ALL DISEASES FOR AN EMPLOYEE (SELF + FAMILY)
// =======================================================
diseaseApp.get("/employee/:employeeId", async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { fromDate, toDate } = req.query;
    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({ message: "Invalid Employee ID" });
    }

    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    const baseQuery = {
      Employee_ID: new mongoose.Types.ObjectId(employeeId),
      $or: [
        { Category: "Non-Communicable" },
        {
          Category: "Communicable",
          createdAt: { $gte: twoMonthsAgo }
        }
      ]
    };

    if (fromDate || toDate) {
      const dateFilter = {};
      const parseAndClamp = (v, endOfDay = false) => {
        if (!v) return null;
        const dmatch = String(v).match(/^(\d{2})-(\d{2})-(\d{4})$/);
        let dt = null;
        if (dmatch) dt = new Date(parseInt(dmatch[3],10), parseInt(dmatch[2],10)-1, parseInt(dmatch[1],10));
        else dt = new Date(v);
        if (isNaN(dt.getTime())) return null;
        if (endOfDay) dt.setHours(23,59,59,999); else dt.setHours(0,0,0,0);
        const now = new Date();
        if (dt > now) {
          if (endOfDay) {
            const nowEnd = new Date(now);
            nowEnd.setHours(23,59,59,999);
            return nowEnd;
          } else {
            const nowStart = new Date(now);
            nowStart.setHours(0,0,0,0);
            return nowStart;
          }
        }
        return dt;
      };

      let s = parseAndClamp(fromDate, false);
      let e = parseAndClamp(toDate, true);
      if (s && e && s > e) {
        const tmp = s; s = e; e = tmp;
      }
      if (s) dateFilter.$gte = s;
      if (e) dateFilter.$lte = e;
      if (Object.keys(dateFilter).length > 0) baseQuery.createdAt = dateFilter;
    }

    const diseases = await Disease.find(baseQuery)
      .populate("Employee_ID", "Name ABS_NO")
      .populate("FamilyMember_ID", "Name Relationship")
      .sort({ createdAt: -1 });

    res.status(200).json(diseases);

  } catch (err) {
    console.error("Disease fetch error:", err);
    res.status(500).json({
      message: "Failed to fetch diseases",
      error: err.message
    });
  }
});



diseaseApp.post("/diseases",verifyToken,
  allowInstituteRoles("doctor"), async (req, res) => {
  try {
    const {
      Institute_ID,
      Employee_ID,
      IsFamilyMember,
      FamilyMember_ID,
      Disease_Name,
      Category,
      Severity_Level,
      Notes
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(Employee_ID)) {
      return res.status(400).json({ message: "Invalid Employee ID" });
    }

    const newDisease = await Disease.create({
      Institute_ID: new mongoose.Types.ObjectId(Institute_ID),
      Employee_ID: new mongoose.Types.ObjectId(Employee_ID),
      IsFamilyMember,
      FamilyMember_ID: IsFamilyMember && FamilyMember_ID
        ? new mongoose.Types.ObjectId(FamilyMember_ID)
        : null,
      Disease_Name,
      Category,
      Severity_Level,
      Notes
    });

    await Employee.findByIdAndUpdate(
      new mongoose.Types.ObjectId(Employee_ID),
      {
        $push: {
          Medical_History: {
            Date: new Date(),
            Diseases: [newDisease._id],
            Diagnosis: Disease_Name,
            Medicines: [],
            Notes: Notes || ""
          }
        }
      }
    );

    res.status(201).json({
      message: "Disease added and linked to medical history",
      disease: newDisease
    });

  } catch (err) {
    console.error("Disease creation error:", err);
    res.status(500).json({
      message: "Failed to add disease",
      error: err.message
    });
  }
});



module.exports = diseaseApp;

// Disease PDF download endpoint
const PDFDocument = require('pdfkit');
diseaseApp.get('/download-pdf', async (req, res) => {
  try {
    const { employeeId, personId, fromDate, toDate } = req.query;
    if (!employeeId) return res.status(400).json({ message: 'employeeId required' });

    const baseQuery = {
      Employee_ID: new mongoose.Types.ObjectId(employeeId)
    };

    if (fromDate || toDate) {
      const dateFilter = {};
      const parseAndClamp = (v, endOfDay = false) => {
        if (!v) return null;
        const dmatch = String(v).match(/^(\d{2})-(\d{2})-(\d{4})$/);
        let dt = null;
        if (dmatch) dt = new Date(parseInt(dmatch[3],10), parseInt(dmatch[2],10)-1, parseInt(dmatch[1],10));
        else dt = new Date(v);
        if (isNaN(dt.getTime())) return null;
        if (endOfDay) dt.setHours(23,59,59,999); else dt.setHours(0,0,0,0);
        const now = new Date();
        if (dt > now) {
          if (endOfDay) {
            const nowEnd = new Date(now);
            nowEnd.setHours(23,59,59,999);
            return nowEnd;
          } else {
            const nowStart = new Date(now);
            nowStart.setHours(0,0,0,0);
            return nowStart;
          }
        }
        return dt;
      };

      let s = parseAndClamp(fromDate, false);
      let e = parseAndClamp(toDate, true);
      if (s && e && s > e) {
        const tmp = s; s = e; e = tmp;
      }
      if (s) dateFilter.$gte = s;
      if (e) dateFilter.$lte = e;
      if (Object.keys(dateFilter).length > 0) baseQuery.createdAt = dateFilter;
    }

    if (personId === 'self') baseQuery.IsFamilyMember = false;
    else if (personId && personId !== 'all') baseQuery.IsFamilyMember = true, baseQuery.FamilyMember_ID = personId;

    const diseases = await Disease.find(baseQuery)
      .populate('Employee_ID', 'Name ABS_NO')
      .populate('FamilyMember_ID', 'Name Relationship')
      .sort({ createdAt: -1 })
      .lean();

    const doc = new PDFDocument({ margin: 40 });
    const filename = `Disease_History_${employeeId}.pdf`;
    res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-type', 'application/pdf');
    doc.pipe(res);

    doc.fontSize(16).text('Disease History', { align: 'center' });
    doc.moveDown(0.2);
    doc.fontSize(10).text(`Date Range: ${fromDate || '-'} to ${toDate || '-'}`);
    doc.moveDown(0.5);

    if (!diseases || diseases.length === 0) {
      doc.text('No disease records found for the selected criteria.', { align: 'center' });
      doc.end();
      return;
    }

    let y = doc.y + 8;
    const pageBottom = () => doc.page.height - doc.page.margins.bottom;
    const columnX = [40, 92, 170, 250, 330, 392, 470];
    const columnWidths = [52, 78, 80, 80, 62, 78, 85];

    const drawHeader = () => {
      doc.font('Helvetica-Bold').fontSize(9);
      doc.text('Date', columnX[0], y, { width: columnWidths[0] });
      doc.text('Person', columnX[1], y, { width: columnWidths[1] });
      doc.text('Disease', columnX[2], y, { width: columnWidths[2] });
      doc.text('Category', columnX[3], y, { width: columnWidths[3] });
      doc.text('Severity', columnX[4], y, { width: columnWidths[4] });
      doc.text('Symptoms', columnX[5], y, { width: columnWidths[5] });
      doc.text('Notes', columnX[6], y, { width: columnWidths[6] });
      y += 18;
      doc.moveTo(40, y - 4).lineTo(555, y - 4).strokeColor('#cccccc').stroke();
      doc.font('Helvetica').fillColor('black');
    };

    drawHeader();

    diseases.forEach((d) => {
      const dateText = formatDiseaseDate(d.createdAt);
      const personText = d.IsFamilyMember
        ? `${d.FamilyMember_ID?.Name || '-'} (${d.FamilyMember_ID?.Relationship || '-'})`
        : 'Self';
      const diseaseText = d.Disease_Name || '-';
      const categoryText = d.Category || '-';
      const severityText = d.Severity_Level || '-';
      const symptomsText = Array.isArray(d.Symptoms) && d.Symptoms.length > 0
        ? d.Symptoms.join(', ')
        : (extractSymptomsFromNotes(d.Notes).join(', ') || '-');
      const notesText = cleanNotesWithoutSymptoms(d.Notes);

      const lineHeight = Math.max(
        doc.heightOfString(dateText, { width: columnWidths[0] }),
        doc.heightOfString(personText, { width: columnWidths[1] }),
        doc.heightOfString(diseaseText, { width: columnWidths[2] }),
        doc.heightOfString(categoryText, { width: columnWidths[3] }),
        doc.heightOfString(severityText, { width: columnWidths[4] }),
        doc.heightOfString(symptomsText, { width: columnWidths[5] }),
        doc.heightOfString(notesText, { width: columnWidths[6] })
      ) + 8;

      if (y + lineHeight > pageBottom()) {
        doc.addPage();
        y = 40;
        drawHeader();
      }

      doc.fontSize(9);
      doc.text(dateText, columnX[0], y, { width: columnWidths[0] });
      doc.text(personText, columnX[1], y, { width: columnWidths[1] });
      doc.text(diseaseText, columnX[2], y, { width: columnWidths[2] });
      doc.text(categoryText, columnX[3], y, { width: columnWidths[3] });
      doc.text(severityText, columnX[4], y, { width: columnWidths[4] });
      doc.text(symptomsText, columnX[5], y, { width: columnWidths[5] });
      doc.text(notesText, columnX[6], y, { width: columnWidths[6] });
      y += lineHeight;
      doc.moveTo(40, y - 4).lineTo(555, y - 4).strokeColor('#e5e7eb').stroke();
    });

    doc.end();
  } catch (err) {
    console.error('Disease PDF error:', err);
    res.status(500).json({ message: 'Failed to generate PDF', error: err.message });
  }
});
