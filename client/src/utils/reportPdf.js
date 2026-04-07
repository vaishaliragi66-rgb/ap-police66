export const getReportInstitutionName = (...values) => {
  const candidate = values
    .flat()
    .map((value) => String(value || "").trim())
    .find(Boolean);

  return candidate || "POLICE HOSPITAL MANAGEMENT";
};

export const formatReportTimestamp = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("en-IN");
};

export const addCenteredReportHeader = (doc, options = {}) => {
  const {
    centerX = 105,
    left = 14,
    right = 196,
    institutionName = "POLICE HOSPITAL MANAGEMENT",
    title = "REPORT",
    subtitle = "",
    institutionY = 18,
    titleY = 26,
    lineY = 30,
  } = options;

  doc.setFontSize(16);
  doc.text(String(institutionName).toUpperCase(), centerX, institutionY, { align: "center" });

  doc.setFontSize(12);
  doc.text(title, centerX, titleY, { align: "center" });

  if (subtitle) {
    doc.setFontSize(9);
    doc.text(subtitle, centerX, titleY + 5, { align: "center" });
  }

  doc.line(left, lineY, right, lineY);
};

export const addDownloadTimestamp = (doc, options = {}) => {
  const {
    label = "Downloaded On",
    timestamp = formatReportTimestamp(),
    x = 14,
    y = 12,
    align = "right",
  } = options;

  doc.setFontSize(8);
  doc.text(`${label}: ${timestamp}`, x, y, { align });
};