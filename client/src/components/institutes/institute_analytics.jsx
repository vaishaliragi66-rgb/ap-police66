import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
import { fetchMasterDataMap, getMasterOptions } from "../../utils/masterData_clean";
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  Scatter,
  ScatterChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const DEFAULT_BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
const DEFAULT_DESIGNATIONS = [
  "HC",
  "ARSI",
  "ASI",
  "RSI",
  "SI",
  "RI",
  "CI",
  "DSP",
  "AC",
  "Adl.Commandant",
  "Adl.SP",
  "SP",
  "COMMANDANT",
  "DIG",
  "IG",
  "ADGP",
  "DGP",
  "AO",
  "SR.Assistant",
  "Jr.Assistant",
  "Superintendent",
  "CLASS IV",
  "Record Assistant",
  "COOK",
  "OTHERS & PC"
];

const isPresent = (value) => {
  if (value === null || value === undefined) return false;
  const normalized = String(value).trim();
  return normalized !== "" && normalized !== "N/A" && normalized !== "-" && normalized !== "—";
};

const pickFirstPresent = (...values) => values.find(isPresent);

const parseAddressParts = (address) => {
  if (!address || typeof address !== "string") {
    return { district: "", state: "" };
  }

  const parts = address.split(",").map(part => part.trim());
  const district = parts[1] || "";
  const state = (parts[2] || "").split("-")[0].trim();

  return { district, state };
};

const normalizeAnalyticsRow = (row, employeeIndex) => {
  const employee =
    employeeIndex.byAbs.get(String(row.ABS_NO || "").trim()) ||
    employeeIndex.byName.get(String(row.Name || "").trim().toLowerCase()) ||
    null;

  const parsedAddress = parseAddressParts(employee?.Address);

  return {
    ...row,
    ABS_NO: pickFirstPresent(row.ABS_NO, employee?.ABS_NO) || "",
    Name: pickFirstPresent(row.Name, employee?.Name) || "",
    Designation: pickFirstPresent(row.Designation, employee?.Designation) || "",
    District: pickFirstPresent(row.District, row.Address?.District, parsedAddress.district) || "",
    State: pickFirstPresent(row.State, row.Address?.State, parsedAddress.state) || "",
    Gender: pickFirstPresent(row.Gender, employee?.Gender) || "",
    Blood_Group: pickFirstPresent(row.Blood_Group, employee?.Blood_Group) || "",
    Phone_No: pickFirstPresent(row.Phone_No, employee?.Phone_No) || "",
    Height: pickFirstPresent(row.Height, employee?.Height) || "",
    Weight: pickFirstPresent(row.Weight, employee?.Weight) || ""
  };
};


/* ===============================
   Utility: Abnormal Test Checker
=================================*/
const isAbnormal = (value, range) => {
  if (!value || !range) return false;
  const num = parseFloat(value);
  if (isNaN(num)) return false;
  
  if (range.includes("–")) {
    const [min, max] = range.split("–").map(parseFloat);
    return num < min || num > max;
  }
  if (range.startsWith("<")) return num >= parseFloat(range.slice(1));
  if (range.startsWith(">")) return num <= parseFloat(range.slice(1));
  
  return false;
};

const countBy = (data, getLabel) => {
  const map = new Map();
  data.forEach(item => {
    const label = getLabel(item);
    if (!label) return;
    map.set(label, (map.get(label) || 0) + 1);
  });
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
};

const buildAnalyticsInsights = (data) => {
  const designationCounts = countBy(data, row => row.Designation || "Unknown").slice(0, 8);
  const genderCounts = countBy(data, row => row.Gender || "Unknown");
  const diseaseCounts = countBy(
    data.flatMap(row => [
      ...(row.Communicable_Diseases || []),
      ...(row.NonCommunicable_Diseases || [])
    ]),
    disease => String(disease || "").trim()
  ).slice(0, 8);

  const abnormalCount = data.filter(row =>
    (row.Tests || []).some(test => isAbnormal(test.Result_Value, test.Reference_Range))
  ).length;

  return {
    designationCounts,
    genderCounts,
    diseaseCounts,
    abnormalSplit: [
      { name: "Abnormal", value: abnormalCount },
      { name: "Normal", value: Math.max(data.length - abnormalCount, 0) }
    ]
  };
};

const getActiveFilters = (filters) => {
  const active = [];
  Object.entries(filters).forEach(([key, value]) => {
    if (typeof value === "boolean" ? value : String(value || "").trim()) {
      active.push(key);
    }
  });
  return active;
};

const uniqueCount = (data, selector) => {
  const values = new Set();
  data.forEach(item => {
    const value = selector(item);
    if (value === null || value === undefined || value === "") return;
    values.add(String(value).trim().toLowerCase());
  });
  return values.size;
};

const getAgeBuckets = (data) => {
  const buckets = [
    { name: "0-20", value: 0 },
    { name: "21-30", value: 0 },
    { name: "31-40", value: 0 },
    { name: "41-50", value: 0 },
    { name: "51-60", value: 0 },
    { name: "60+", value: 0 }
  ];

  data.forEach(row => {
    const age = Number(row.Age);
    if (Number.isNaN(age)) return;
    if (age <= 20) buckets[0].value += 1;
    else if (age <= 30) buckets[1].value += 1;
    else if (age <= 40) buckets[2].value += 1;
    else if (age <= 50) buckets[3].value += 1;
    else if (age <= 60) buckets[4].value += 1;
    else buckets[5].value += 1;
  });

  return buckets;
};

const getTimeSeries = (data, field) => {
  const counts = new Map();
  data.forEach(row => {
    const value = row[field];
    if (!value) return;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return;
    const key = date.toLocaleDateString("en-GB");
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  return [...counts.entries()]
    .map(([name, value]) => ({ name, value, sortKey: new Date(name.split("/").reverse().join("-")).getTime() }))
    .sort((a, b) => a.sortKey - b.sortKey)
    .map(({ name, value }) => ({ name, value }));
};

const getScatterData = (data) =>
  data
    .map(row => ({
      x: Number(row.Height),
      y: Number(row.Weight),
      name: row.Name || row.ABS_NO || "Unknown"
    }))
    .filter(point => !Number.isNaN(point.x) && !Number.isNaN(point.y));

const buildSmartChartConfigs = (data, filters, insights) => {
  if (!Array.isArray(data) || data.length < 3) return [];

  const activeFilters = getActiveFilters(filters);
  const chartConfigs = [];
  const addChart = (config) => {
    chartConfigs.push(config);
  };

  if (!activeFilters.includes("designationFilter") && uniqueCount(data, row => row.Designation) > 1) {
    addChart({
      key: "designation",
      title: "Top Designations",
      subtitle: "Recommended categorical analysis",
      type: "bar",
      data: insights.designationCounts,
      summary: insights.designationCounts.slice(0, 3).map(item => `${item.name} → ${item.value}`),
      tableRows: toDataTableRows(insights.designationCounts, data.length),
      color: "#0d6efd"
    });
  }

  if (!activeFilters.includes("diseaseFilter") && uniqueCount(data, row => [...(row.Communicable_Diseases || []), ...(row.NonCommunicable_Diseases || [])].join("|")) > 1) {
    addChart({
      key: "diseases",
      title: "Top Diseases",
      subtitle: "Highest disease frequency across patients",
      type: "horizontalBar",
      data: insights.diseaseCounts,
      summary: insights.diseaseCounts.slice(0, 3).map(item => `${item.name} → ${item.value}`),
      tableRows: toDataTableRows(insights.diseaseCounts, data.length),
      color: "#198754"
    });
  }

  if (!activeFilters.includes("genderFilter") && uniqueCount(data, row => row.Gender) > 1) {
    addChart({
      key: "gender",
      title: "Gender Distribution",
      subtitle: "Recommended pie chart",
      type: "pie",
      data: insights.genderCounts,
      summary: insights.genderCounts.map(item => `${item.name} → ${item.value}`),
      tableRows: toDataTableRows(insights.genderCounts, data.length)
    });
  }

  const ageBuckets = getAgeBuckets(data);
  if (ageBuckets.some(item => item.value > 0)) {
    addChart({
      key: "age",
      title: "Age Distribution",
      subtitle: "Histogram-style age buckets",
      type: "bar",
      data: ageBuckets,
      summary: ageBuckets.filter(item => item.value > 0).slice(0, 3).map(item => `${item.name} → ${item.value}`),
      tableRows: toDataTableRows(ageBuckets.filter(item => item.value > 0), data.length),
      color: "#fd7e14"
    });
  }

  const districts = countBy(data, row => row.District || "Unknown").slice(0, 8);
  if (!activeFilters.includes("districtFilter") && districts.length > 1) {
    addChart({
      key: "districts",
      title: "District-wise Patients",
      subtitle: "Recommended geographic analysis",
      type: "bar",
      data: districts,
      summary: districts.slice(0, 3).map(item => `${item.name} → ${item.value}`),
      tableRows: toDataTableRows(districts, data.length),
      color: "#6610f2"
    });
  }

  const medicineCounts = countBy(
    data.flatMap(row => row.Medicines || []),
    medicine => medicine?.Medicine_Name || ""
  ).slice(0, 8);
  if (!activeFilters.includes("medicineFilter") && medicineCounts.length > 1) {
    addChart({
      key: "medicines",
      title: "Medicine Usage",
      subtitle: "Most frequently prescribed medicines",
      type: "bar",
      data: medicineCounts,
      summary: medicineCounts.slice(0, 3).map(item => `${item.name} → ${item.value}`),
      tableRows: toDataTableRows(medicineCounts, data.length),
      color: "#6f42c1"
    });
  }

  const testCounts = countBy(
    data.flatMap(row => row.Tests || []),
    test => test?.Test_Name || ""
  ).slice(0, 8);
  if (!activeFilters.includes("testFilter") && testCounts.length > 1) {
    addChart({
      key: "tests",
      title: "Test Result Analysis",
      subtitle: "Frequently observed tests",
      type: "bar",
      data: testCounts,
      summary: testCounts.slice(0, 3).map(item => `${item.name} → ${item.value}`),
      tableRows: toDataTableRows(testCounts, data.length),
      color: "#dc3545"
    });
  }

  const scatterData = getScatterData(data);
  if (scatterData.length > 1 && !activeFilters.includes("ageMin") && !activeFilters.includes("ageMax")) {
    addChart({
      key: "scatter",
      title: "Height vs Weight",
      subtitle: "Health correlation scatter plot",
      type: "scatter",
      data: scatterData,
      summary: [
        `Points → ${scatterData.length}`,
        `Avg Height → ${(scatterData.reduce((sum, item) => sum + item.x, 0) / scatterData.length).toFixed(1)}`,
        `Avg Weight → ${(scatterData.reduce((sum, item) => sum + item.y, 0) / scatterData.length).toFixed(1)}`
      ],
      tableRows: scatterData.slice(0, 12).map((item, index) => ({
        sNo: index + 1,
        label: item.name,
        count: `${item.x} / ${item.y}`,
        percent: "Height / Weight"
      }))
    });
  }

  const visits = getTimeSeries(data, "First_Visit_Date");
  if (visits.length > 1) {
    addChart({
      key: "visits",
      title: "First Visit Trend",
      subtitle: "Time-based visit frequency",
      type: "line",
      data: visits,
      summary: visits.slice(0, 3).map(item => `${item.name} → ${item.value}`),
      tableRows: toDataTableRows(visits, data.length),
      color: "#0dcaf0"
    });
  }

  const preferredOrder = [
    "diseases",
    "gender",
    "age",
    "districts",
    "medicines",
    "tests",
    "scatter",
    "designation",
    "visits"
  ];

  return chartConfigs.sort((a, b) => preferredOrder.indexOf(a.key) - preferredOrder.indexOf(b.key));
};

const toDataTableRows = (data, total) =>
  data.map((item, index) => ({
    sNo: index + 1,
    label: item.name,
    count: item.value,
    percent: total ? ((item.value * 100) / total).toFixed(1) : "0.0"
  }));

const CHART_COLORS = ["#0d6efd", "#198754", "#dc3545", "#ffc107", "#6f42c1", "#0dcaf0", "#6610f2", "#fd7e14"];

const safeText = (doc, text, x, y, options = {}) => {
  const sanitized = String(text || "").trim();
  if (sanitized) {
    doc.text(sanitized, x, y, options);
  }
};

const drawBarChartInPdf = (doc, title, data, startY, opts = {}) => {
  const chartX = 14;
  const chartY = startY + 4;
  const chartWidth = 125;
  const chartHeight = 55;
  const maxValue = Math.max(...data.map(item => item.value), 1);
  const barHeight = Math.min(7, (chartHeight - 8) / Math.max(data.length, 1));

  doc.setFontSize(11);
  safeText(doc, title, chartX, startY);

  data.slice(0, opts.limit || 8).forEach((item, index) => {
    const y = chartY + index * (barHeight + 1);
    const width = (item.value / maxValue) * chartWidth;
    doc.setFillColor(13, 110, 253);
    doc.rect(chartX, y, width, barHeight, "F");
    doc.setTextColor(33, 37, 41);
    doc.setFontSize(8);
    safeText(doc, `${item.name} (${item.value})`, chartX + width + 2, y + barHeight - 1);
  });

  return chartY + Math.max(1, data.slice(0, opts.limit || 8).length) * (barHeight + 1) + 4;
};

const drawHorizontalBarChartInPdf = (doc, title, data, startY, color = [25, 135, 84]) => {
  const chartX = 14;
  const chartY = startY + 4;
  const chartWidth = 125;
  const rowHeight = 6;
  const maxValue = Math.max(...data.map(item => item.value), 1);

  doc.setFontSize(11);
  safeText(doc, title, chartX, startY);

  data.slice(0, 8).forEach((item, index) => {
    const y = chartY + index * (rowHeight + 2);
    const width = (item.value / maxValue) * chartWidth;
    doc.setFillColor(...color);
    doc.rect(chartX, y, width, rowHeight, "F");
    doc.setFontSize(8);
    doc.setTextColor(33, 37, 41);
    safeText(doc, `${item.name} (${item.value})`, chartX + width + 2, y + 4.5);
  });

  return chartY + Math.max(1, Math.min(data.length, 8)) * (rowHeight + 2) + 4;
};

const drawScatterSummaryInPdf = (doc, title, data, startY) => {
  doc.setFontSize(11);
  doc.setTextColor(33, 37, 41);
  safeText(doc, title, 14, startY);

  autoTable(doc, {
    startY: startY + 3,
    head: [["S.No", "Name", "Height", "Weight"]],
    body: data.slice(0, 12).map((item, index) => [index + 1, item.name, item.x, item.y]),
    styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: [33, 37, 41] },
    margin: { left: 14, right: 14 }
  });

  return (doc.lastAutoTable?.finalY || startY + 10) + 7;
};

const drawSimpleBreakdownInPdf = (doc, title, data, x, y) => {
  doc.setFontSize(11);
  doc.setTextColor(33, 37, 41);
  safeText(doc, title, x, y);
  let currentY = y + 7;

  data.forEach((item, index) => {
    const color = CHART_COLORS[index % CHART_COLORS.length];
    const red = Number.parseInt(color.slice(1, 3), 16);
    const green = Number.parseInt(color.slice(3, 5), 16);
    const blue = Number.parseInt(color.slice(5, 7), 16);
    doc.setFillColor(red, green, blue);
    doc.rect(x, currentY - 4, 4, 4, "F");
    doc.setFontSize(9);
    doc.setTextColor(33, 37, 41);
    safeText(doc, `${item.name}: ${item.value}`, x + 6, currentY - 0.5);
    currentY += 6;
  });
};

const addInsightTableToPdf = (doc, title, rows, startY) => {
  doc.setFontSize(11);
  doc.setTextColor(33, 37, 41);
  safeText(doc, title, 14, startY);

  autoTable(doc, {
    startY: startY + 3,
    head: [["S.No", "Category", "Count", "Percentage (%)"]],
    body: rows.map(row => [row.sNo, row.label, row.count, row.percent]),
    styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: [33, 37, 41] },
    margin: { left: 14, right: 14 }
  });

  return (doc.lastAutoTable?.finalY || startY + 10) + 7;
};

const InsightDataTable = ({ rows, emptyText = "No data available" }) => {
  if (!rows.length) {
    return <div className="text-muted small mt-2">{emptyText}</div>;
  }

  return (
    <div className="table-responsive mt-2">
      <table className="table table-sm table-bordered mb-0 align-middle">
        <thead className="table-light">
          <tr>
            <th style={{ width: "12%" }}>S.No</th>
            <th>Category</th>
            <th style={{ width: "18%" }}>Count</th>
            <th style={{ width: "20%" }}>%</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.sNo + row.label}>
              <td>{row.sNo}</td>
              <td>{row.label}</td>
              <td>{row.count}</td>
              <td>{row.percent}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/* ===============================
   Export Utilities
=================================*/
const downloadCSV = (data) => {
  if (!data.length) return;

  const headers = [
    "Designation",
    "ABS Number",
    "Name",
    "Gender",
    "District",
    "State",
    "Age",
    "Blood Group",
    "Phone Number",
    "Height",
    "Weight",
    "Diseases",
    "Tests",
    "Medicines",
    "First Visit",
    "Last Visit"
  ];

  const rows = data.map(r => [
    r.Designation,
    r.ABS_NO || "",
    r.Name,
    r.Gender || "",
    r.District || "",
    r.State || "",
    r.Age ?? "",
    r.Blood_Group || "",
    r.Phone_No || "",
    r.Height || "",
    r.Weight || "",
    [...(r.Communicable_Diseases || []), ...(r.NonCommunicable_Diseases || [])].join("; "),
    (r.Tests || []).map(t => `${t.Test_Name}: ${t.Result_Value} ${t.Units || ""}`).join("; "),
    (r.Medicines || []).map(m => `${m.Medicine_Name} (${m.Quantity})`).join("; "),
    r.First_Visit_Date ? new Date(r.First_Visit_Date).toLocaleDateString("en-GB") : "",
    r.Last_Visit_Date ? new Date(r.Last_Visit_Date).toLocaleDateString("en-GB") : ""
  ]);

  const csv = headers.join(",") + "\n" + rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "Institute_Analytics.csv";
  link.click();
};

const downloadPDF = async (data, insights, filters, smartGraphElement) => {
  if (!data.length) {
    alert("No data to export. Please apply filters and try again.");
    return;
  }

  try {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

    // Title page
    doc.setFontSize(16);
    doc.text("Institute Medical Analytics Report", 20, 20);
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleDateString("en-GB")}`, 20, 30);
    doc.text(`Total Records: ${data.length}`, 20, 40);
    
    // Data table
    const headers = [
      "Designation",
      "ABS",
      "Name",
      "Gender",
      "District",
      "State",
      "Age",
      "Blood Group",
      "Phone",
      "Height",
      "Weight",
      "Diseases",
      "Tests",
      "Medicines",
      "First Visit",
      "Last Visit"
    ];

    const rows = data.map(r => [
      String(r.Designation || "—"),
      String(r.ABS_NO || "—"),
      String(r.Name || "—"),
      String(r.Gender || "—"),
      String(r.District || "—"),
      String(r.State || "—"),
      String(r.Age ?? "—"),
      String(r.Blood_Group || "—"),
      String(r.Phone_No || "—"),
      String(r.Height || "—"),
      String(r.Weight || "—"),
      [...(r.Communicable_Diseases || []), ...(r.NonCommunicable_Diseases || [])].filter(d => d).join(", ") || "—",
      (r.Tests || []).map(t => `${t.Test_Name || "—"}`).join("; ") || "—",
      (r.Medicines || []).map(m => `${m.Medicine_Name || "—"}`).join("; ") || "—",
      r.First_Visit_Date ? new Date(r.First_Visit_Date).toLocaleDateString("en-GB") : "—",
      r.Last_Visit_Date ? new Date(r.Last_Visit_Date).toLocaleDateString("en-GB") : "—"
    ]);

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 50,
      margin: { top: 10, right: 10, bottom: 10, left: 10 },
      styles: {
        fontSize: 6,
        cellPadding: 2,
        overflow: "linebreak",
        halign: "left"
      },
      headStyles: {
        fillColor: [33, 37, 41],
        textColor: [255, 255, 255],
        fontStyle: "bold"
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      }
    });

    if (smartGraphElement) {
      const chartCards = Array.from(smartGraphElement.querySelectorAll(".smart-chart-card"));

      if (chartCards.length > 0) {
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 10;
        const contentWidth = pageWidth - margin * 2;
        const topStart = 24;
        const bottomLimit = pageHeight - margin;

        doc.addPage();
        doc.setFontSize(15);
        doc.text("Smart Graph Analysis", margin, 16);

        let currentY = topStart;

        for (const card of chartCards) {
          const canvas = await html2canvas(card, {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
            windowWidth: card.scrollWidth,
            windowHeight: card.scrollHeight
          });

          const imgData = canvas.toDataURL("image/png");
          const naturalHeight = (canvas.height * contentWidth) / canvas.width;
          const maxHeightPerPage = pageHeight - topStart - margin;
          const renderHeight = Math.min(naturalHeight, maxHeightPerPage);

          if (currentY + renderHeight > bottomLimit) {
            doc.addPage();
            doc.setFontSize(15);
            doc.text("Smart Graph Analysis (contd.)", margin, 16);
            currentY = topStart;
          }

          doc.addImage(imgData, "PNG", margin, currentY, contentWidth, renderHeight, undefined, "FAST");
          currentY += renderHeight + 6;
        }
      }
    }

    doc.save("Institute_Analytics_Report.pdf");
  } catch (error) {
    console.error("PDF generation error:", error);
    alert(`Failed to generate PDF: ${error.message}`);
  }
};

/* ===============================
   MAIN COMPONENT
=================================*/
export default function InstituteAnalytics() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [masterMap, setMasterMap] = useState({});
  const smartGraphRef = useRef(null);

  /* -------- Filters -------- */
  const [designationFilter, setDesignationFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [districtFilter, setDistrictFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [absFilter, setAbsFilter] = useState("");
  const [diseaseFilter, setDiseaseFilter] = useState("");
  const [medicineFilter, setMedicineFilter] = useState("");
  const [testFilter, setTestFilter] = useState("");
  const [bloodGroupFilter, setBloodGroupFilter] = useState("");
  const [abnormalOnly, setAbnormalOnly] = useState(false);
  const [ageMin, setAgeMin] = useState("");
  const [ageMax, setAgeMax] = useState("");
const [currentPage, setCurrentPage] = useState(1);
const rowsPerPage = 10;

  useEffect(() => {
    let mounted = true;

    const loadMaster = async () => {
      try {
        const data = await fetchMasterDataMap({ force: true });
        if (mounted) {
          setMasterMap(data || {});
        }
      } catch (err) {
        console.error("Failed to load master data in analytics", err);
      }
    };

    loadMaster();

    const handleMasterUpdate = () => loadMaster();
    window.addEventListener("master-data-updated", handleMasterUpdate);

    return () => {
      mounted = false;
      window.removeEventListener("master-data-updated", handleMasterUpdate);
    };
  }, []);

  const designationOptions = getMasterOptions(masterMap, "Designations");
  const bloodGroupOptions = getMasterOptions(masterMap, "Blood Groups");
  const districtOptions = getMasterOptions(masterMap, "Districts");
  const stateOptions = getMasterOptions(masterMap, "States");

  const uniqueDiseases = useMemo(() => {
    const diseases = new Set();
    rows.forEach(row => {
      [...(row.Communicable_Diseases || []), ...(row.NonCommunicable_Diseases || [])].forEach(d => {
        if (d) diseases.add(String(d).trim());
      });
    });
    return Array.from(diseases).sort();
  }, [rows]);

  const uniqueMedicines = useMemo(() => {
    const medicines = new Set();
    rows.forEach(row => {
      (row.Medicines || []).forEach(m => {
        if (m?.Medicine_Name) medicines.add(String(m.Medicine_Name).trim());
      });
    });
    return Array.from(medicines).sort();
  }, [rows]);

  const uniqueTests = useMemo(() => {
    const tests = new Set();
    rows.forEach(row => {
      (row.Tests || []).forEach(t => {
        if (t?.Test_Name) tests.add(String(t.Test_Name).trim());
      });
    });
    return Array.from(tests).sort();
  }, [rows]);

  useEffect(() => {
    const institute = JSON.parse(localStorage.getItem("institute"));
    if (!institute) {
      setError("Institute not found in local storage");
      setLoading(false);
      return;
    }

    const loadAnalytics = async () => {
      try {
        const [analyticsRes, employeesRes] = await Promise.all([
          axios.get(`${BACKEND_URL}/institute-api/analytics/${institute._id}`),
          axios.get(`${BACKEND_URL}/institute-api/employees-detailed`).catch(() => ({ data: { employees: [] } }))
        ]);

        const employees = employeesRes?.data?.employees || [];
        const employeeIndex = {
          byAbs: new Map(
            employees
              .filter(emp => isPresent(emp.ABS_NO))
              .map(emp => [String(emp.ABS_NO).trim(), emp])
          ),
          byName: new Map(
            employees
              .filter(emp => isPresent(emp.Name))
              .map(emp => [String(emp.Name).trim().toLowerCase(), emp])
          )
        };

        const analyticsRows = Array.isArray(analyticsRes.data) ? analyticsRes.data : [];
        setRows(analyticsRows.map(row => normalizeAnalyticsRow(row, employeeIndex)));
        setLoading(false);
      } catch (err) {
        console.error("Analytics load error:", err);
        setError("Failed to load analytics data");
        setLoading(false);
      }
    };

    loadAnalytics();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    designationFilter,
    genderFilter,
    nameFilter,
    districtFilter,
    stateFilter,
    absFilter,
    diseaseFilter,
    medicineFilter,
    testFilter,
    bloodGroupFilter,
    abnormalOnly,
    ageMin,
    ageMax
  ]);

  

  const filteredRows = rows.filter(r => {
    const match = (v, f) =>
      !f || (v && v.toString().toLowerCase().includes(f.toLowerCase()));

    const ageOK =
      (!ageMin || r.Age >= Number(ageMin)) &&
      (!ageMax || r.Age <= Number(ageMax));

    const hasAbnormal =
      r.Tests?.some(t => isAbnormal(t.Result_Value, t.Reference_Range));

    const allDiseases = [...(r.Communicable_Diseases || []), ...(r.NonCommunicable_Diseases || [])];
    const diseaseMatch = !diseaseFilter || allDiseases.some(d => 
      String(d).trim().toLowerCase() === String(diseaseFilter).trim().toLowerCase()
    );

    const medicineName = (r.Medicines || []).map(m => m.Medicine_Name);
    const medicineMatch = !medicineFilter || medicineName.some(m => 
      String(m).trim().toLowerCase() === String(medicineFilter).trim().toLowerCase()
    );

    const testNames = (r.Tests || []).map(t => t.Test_Name);
    const testMatch = !testFilter || testNames.some(t => 
      String(t).trim().toLowerCase() === String(testFilter).trim().toLowerCase()
    );

    return (
      (!designationFilter || r.Designation === designationFilter) &&
      (!genderFilter || r.Gender === genderFilter) &&
      (!bloodGroupFilter || r.Blood_Group === bloodGroupFilter) &&
      (!districtFilter || r.District === districtFilter) &&
      (!stateFilter || r.State === stateFilter) &&
      match(r.Name, nameFilter) &&
      match(r.ABS_NO, absFilter) &&
      diseaseMatch &&
      medicineMatch &&
      testMatch &&
      ageOK &&
      (!abnormalOnly || hasAbnormal)
    );
  });


  /* -------- Filtering Logic -------- */
const totalPages = Math.ceil(filteredRows.length / rowsPerPage) || 1;

const indexOfLast = currentPage * rowsPerPage;
const indexOfFirst = indexOfLast - rowsPerPage;

const currentRows = filteredRows.slice(indexOfFirst, indexOfLast);

const insights = useMemo(() => buildAnalyticsInsights(filteredRows), [filteredRows]);
  const smartCharts = useMemo(
    () => buildSmartChartConfigs(filteredRows, {
      designationFilter,
      genderFilter,
      districtFilter,
      stateFilter,
      absFilter,
      diseaseFilter,
      medicineFilter,
      testFilter,
      bloodGroupFilter,
      abnormalOnly,
      ageMin,
      ageMax
    }, insights),
    [
      filteredRows,
      designationFilter,
      genderFilter,
      districtFilter,
      stateFilter,
      absFilter,
      diseaseFilter,
      medicineFilter,
      testFilter,
      bloodGroupFilter,
      abnormalOnly,
      ageMin,
      ageMax,
      insights
    ]
  );

const hasSmartCharts = smartCharts.length > 0;


  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "400px" }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading analytics…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger m-4" role="alert">
        <strong>Error:</strong> {error}
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      <div className="mb-4">
        <h2 className="fw-bold">Institute Medical Analytics Dashboard</h2>
        <p className="text-muted">Comprehensive health records and medical data analysis</p>
      </div>

      {/* =============================== FILTER PANEL ================================*/}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <h5 className="card-title mb-3">Filters</h5>
          <div className="row g-3">
            {/* Designation Filter */}
            <div className="col-md-3">
              <label className="form-label fw-semibold">Designation</label>
              <select 
                className="form-select" 
                value={designationFilter} 
                onChange={(e) => setDesignationFilter(e.target.value)}
              >
                <option value="">All Designations</option>
                {(designationOptions.length ? designationOptions : DEFAULT_DESIGNATIONS).map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>

            {/* Gender Filter */}
            <div className="col-md-3">
              <label className="form-label fw-semibold">Gender</label>
              <select 
                className="form-select" 
                value={genderFilter} 
                onChange={(e) => setGenderFilter(e.target.value)}
              >
                <option value="">All Genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Blood Group Filter */}
            <div className="col-md-3">
              <label className="form-label fw-semibold">Blood Group</label>
              <select 
                className="form-select" 
                value={bloodGroupFilter} 
                onChange={(e) => setBloodGroupFilter(e.target.value)}
              >
                <option value="">All Blood Groups</option>
                {(bloodGroupOptions.length ? bloodGroupOptions : DEFAULT_BLOOD_GROUPS).map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>

            {/* Name Filter */}
            <div className="col-md-3">
              <label className="form-label fw-semibold">Name</label>
              <input
                type="text"
                className="form-control"
                placeholder="Search by name"
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
              />
            </div>

            {/* District Filter */}
            <div className="col-md-3">
              <label className="form-label fw-semibold">District</label>
              <select
                className="form-select"
                value={districtFilter}
                onChange={(e) => setDistrictFilter(e.target.value)}
              >
                <option value="">All Districts</option>
                {districtOptions.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>

            {/* State Filter */}
            <div className="col-md-3">
              <label className="form-label fw-semibold">State</label>
              <select
                className="form-select"
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
              >
                <option value="">All States</option>
                {stateOptions.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>

            {/* ABS Number Filter */}
            <div className="col-md-3">
              <label className="form-label fw-semibold">ABS Number</label>
              <input
                type="text"
                className="form-control"
                placeholder="Search by ABS number"
                value={absFilter}
                onChange={(e) => setAbsFilter(e.target.value)}
              />
            </div>

            {/* Disease Filter */}
            <div className="col-md-3">
              <label className="form-label fw-semibold">Disease</label>
              <select
                className="form-select"
                value={diseaseFilter}
                onChange={(e) => setDiseaseFilter(e.target.value)}
              >
                <option value="">All Diseases</option>
                {uniqueDiseases.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>

            {/* Medicine Filter */}
            <div className="col-md-3">
              <label className="form-label fw-semibold">Medicine</label>
              <select
                className="form-select"
                value={medicineFilter}
                onChange={(e) => setMedicineFilter(e.target.value)}
              >
                <option value="">All Medicines</option>
                {uniqueMedicines.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>

            {/* Test Filter */}
            <div className="col-md-3">
              <label className="form-label fw-semibold">Test</label>
              <select
                className="form-select"
                value={testFilter}
                onChange={(e) => setTestFilter(e.target.value)}
              >
                <option value="">All Tests</option>
                {uniqueTests.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>

            {/* Age Min */}
            <div className="col-md-2">
              <label className="form-label fw-semibold">Age Min</label>
              <input
                type="number"
                className="form-control"
                placeholder="Min"
                value={ageMin}
                onChange={(e) => setAgeMin(e.target.value)}
              />
            </div>

            {/* Age Max */}
            <div className="col-md-2">
              <label className="form-label fw-semibold">Age Max</label>
              <input
                type="number"
                className="form-control"
                placeholder="Max"
                value={ageMax}
                onChange={(e) => setAgeMax(e.target.value)}
              />
            </div>

            {/* Abnormal Tests Checkbox */}
            <div className="col-md-8 d-flex align-items-end">
              <div className="form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="abnormalCheckbox"
                  checked={abnormalOnly}
                  onChange={(e) => setAbnormalOnly(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="abnormalCheckbox">
                  Show only patients with abnormal test results
                </label>
              </div>
            </div>
          </div>

          {/* Export Buttons */}
          <div className="mt-3 d-flex gap-2">
            <button 
              className="btn btn-success btn-sm"
              onClick={() => downloadCSV(filteredRows)}
              disabled={filteredRows.length === 0}
            >
              📥 Download CSV
            </button>
            <button 
              className="btn btn-danger btn-sm"
              onClick={() => downloadPDF(filteredRows, insights, {
                designationFilter,
                genderFilter,
                districtFilter,
                stateFilter,
                absFilter,
                diseaseFilter,
                medicineFilter,
                testFilter,
                bloodGroupFilter,
                abnormalOnly,
                ageMin,
                ageMax
              }, smartGraphRef.current)}
              disabled={filteredRows.length === 0}
            >
              📄 Download PDF
            </button>
            <span className="ms-auto text-muted align-self-center">
              Showing {filteredRows.length} of {rows.length} records
            </span>
          </div>
        </div>
      </div>

      {/* =============================== TABLE ================================*/}
      <div className="card shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover table-striped mb-0">
              <thead className="table-dark">
                <tr>
                  <th>Designation</th>
                  <th>ABS Number</th>
                  <th>Name</th>
                  <th>Gender</th>
                  <th>District</th>
                  <th>State</th>
                  <th>Age</th>
                  <th>Blood Group</th>
                  <th>Phone Number</th>
                  <th>Height</th>
                  <th>Weight</th>
                  <th>Diseases</th>
                  <th>Tests</th>
                  <th>Medicines</th>
                  <th>First Visit</th>
                  <th>Last Visit</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan="16" className="text-center py-4 text-muted">
                      No records found matching the current filters
                    </td>
                  </tr>
                )}
                {currentRows.map((r, i) => (

                  <tr key={i}>
                    <td>
                      <span className="badge bg-primary">
                        {r.Designation || "—"}
                      </span>
                    </td>
                    <td>{r.ABS_NO || "—"}</td>
                    <td className="fw-semibold">{r.Name}</td>
                    <td>{r.Gender || "—"}</td>
                    <td>{r.District || "—"}</td>
                    <td>{r.State || "—"}</td>
                    <td>{r.Age ?? "—"}</td>
                    <td>{r.Blood_Group || "—"}</td>
                    <td>{r.Phone_No || "—"}</td>
                    <td>{r.Height || "—"}</td>
                    <td>{r.Weight || "—"}</td>
                    <td>
                      {([...(r.Communicable_Diseases || []), ...(r.NonCommunicable_Diseases || [])]).length ? (
                        <div className="d-flex flex-column gap-1">
                          {([...(r.Communicable_Diseases || []), ...(r.NonCommunicable_Diseases || [])]).map((disease, idx) => (
                            <span key={idx} className="badge bg-warning text-dark">
                              {disease}
                            </span>
                          ))}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      {r.Tests?.length ? (
                        <div className="d-flex flex-column gap-1">
                          {r.Tests.map((t, idx) => {
                            const abnormal = isAbnormal(t.Result_Value, t.Reference_Range);
                            return (
                              <small 
                                key={idx} 
                                className={abnormal ? "text-danger fw-bold" : ""}
                              >
                                {t.Test_Name}: {t.Result_Value} {t.Units || ""}
                                {abnormal && " ⚠️"}
                              </small>
                            );
                          })}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      {r.Medicines?.length ? (
                        <div className="d-flex flex-column gap-1">
                          {r.Medicines.map((m, idx) => (
                            <small key={idx}>
                              {m.Medicine_Name} ({m.Quantity})
                            </small>
                          ))}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      {r.First_Visit_Date
                        ? new Date(r.First_Visit_Date).toLocaleDateString("en-GB")
                        : "—"}
                    </td>
                    <td>
                      {r.Last_Visit_Date
                        ? new Date(r.Last_Visit_Date).toLocaleDateString("en-GB")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="d-flex justify-content-center align-items-center gap-2 py-3">
  <button
    className="btn btn-outline-dark btn-sm"
    disabled={currentPage === 1}
    onClick={() => setCurrentPage(prev => prev - 1)}
  >
    Previous
  </button>

  {[...Array(totalPages)].map((_, i) => (
    <button
      key={i}
      className={`btn btn-sm ${
        currentPage === i + 1 ? "btn-dark" : "btn-outline-dark"
      }`}
      onClick={() => setCurrentPage(i + 1)}
    >
      {i + 1}
    </button>
  ))}

  <button
    className="btn btn-outline-dark btn-sm"
    disabled={currentPage === totalPages}
    onClick={() => setCurrentPage(prev => prev + 1)}
  >
    Next
  </button>
</div>

          </div>
        </div>
      </div>

      {/* =============================== ANALYSIS CHARTS ================================*/}
      <div className="card shadow-sm mt-4" ref={smartGraphRef}>
        <div className="card-body">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <div>
              <h5 className="card-title mb-1">Smart Graph Analysis</h5>
              <p className="text-muted mb-0">Charts are recommended automatically from the filtered hospital data.</p>
            </div>
            <div className="text-muted small">
              {hasSmartCharts ? `${smartCharts.length} recommended chart(s)` : "No charts to display for the current filter set"}
            </div>
          </div>

          {hasSmartCharts ? (
            <div className="row g-4">
              {smartCharts.map(chart => (
                <div className="col-12 col-lg-6" key={chart.key}>
                  <div className="smart-chart-card border rounded-3 p-3 h-100 bg-white shadow-sm">
                    <div className="d-flex justify-content-between align-items-start gap-3 mb-2">
                      <div>
                        <h6 className="fw-semibold mb-1">{chart.title}</h6>
                        <div className="text-muted small">{chart.subtitle}</div>
                      </div>
                      <span className="badge text-bg-primary text-uppercase">{chart.type}</span>
                    </div>

                    <div style={{ width: "100%", height: chart.type === "scatter" ? 320 : 280 }}>
                      <ResponsiveContainer>
                        {chart.type === "pie" ? (
                          <PieChart>
                            <Pie data={chart.data} dataKey="value" nameKey="name" outerRadius={95} label>
                              {chart.data.map((entry, index) => (
                                <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        ) : chart.type === "scatter" ? (
                          <ScatterChart>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="x" type="number" name="Height" />
                            <YAxis dataKey="y" type="number" name="Weight" />
                            <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                            <Scatter data={chart.data} fill="#0d6efd" />
                          </ScatterChart>
                        ) : chart.type === "line" ? (
                          <LineChart data={chart.data}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" angle={-20} textAnchor="end" height={70} interval={0} />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Line type="monotone" dataKey="value" stroke="#0dcaf0" strokeWidth={3} dot={{ r: 4 }} />
                          </LineChart>
                        ) : chart.type === "horizontalBar" ? (
                          <BarChart data={chart.data} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" allowDecimals={false} />
                            <YAxis type="category" dataKey="name" width={120} />
                            <Tooltip />
                            <Bar dataKey="value" fill={chart.color || "#198754"} radius={[0, 4, 4, 0]} />
                          </BarChart>
                        ) : (
                          <BarChart data={chart.data}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" angle={-20} textAnchor="end" height={70} interval={0} />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Bar dataKey="value" fill={chart.color || "#0d6efd"} radius={[4, 4, 0, 0]} />
                          </BarChart>
                        )}
                      </ResponsiveContainer>
                    </div>

                    <div className="mt-3">
                      <div className="fw-semibold small text-uppercase text-muted mb-1">Summary</div>
                      <ul className="small mb-2 ps-3">
                        {chart.summary.map((line, index) => (
                          <li key={index}>{line}</li>
                        ))}
                      </ul>
                      <InsightDataTable rows={chart.tableRows} emptyText="No chart data" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="alert alert-light border mb-0">
              Smart charts are hidden because the current filters leave too little or too uniform data.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
