import React from "react";

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const toArray = (value) => (Array.isArray(value) ? value : []);

const isImageFile = (file = {}) => {
  const mime = String(file?.mimetype || file?.mimeType || "").toLowerCase();
  if (mime.startsWith("image/")) return true;
  const url = String(file?.url || file?.path || "");
  return /\.(png|jpe?g|gif|webp|bmp|svg)(\?|#|$)/i.test(url);
};

const getFileUrl = (file = {}, resolveUrl) => {
  const rawUrl = file?.url || file?.path || "";
  if (!rawUrl) return "";
  if (typeof resolveUrl === "function") return resolveUrl(rawUrl) || rawUrl;
  return rawUrl;
};

const getPatientLabel = (record = {}, reportData = {}) => {
  if (record?.Employee?.Name) return record.Employee.Name;
  if (record?.Employee_Name) return record.Employee_Name;
  if (reportData?.employeeName) return reportData.employeeName;
  return "Patient";
};

const getReportForLabel = (record = {}, reportData = {}) => {
  if (!record?.IsFamilyMember) return reportData?.reportFor || "Self";
  const name = record?.FamilyMember?.Name || reportData?.familyMemberName || "Family Member";
  const relation = record?.FamilyMember?.Relationship || reportData?.familyMemberRelation;
  return relation ? `${name} (${relation})` : name;
};

const getCategory = (test = {}) =>
  test?.Category || test?.Group || test?.Test_ID?.Group || "-";

const getReferenceRange = (test = {}) =>
  test?.Test_ID?.Reference_Range || test?.Reference_Range || "-";

const getStatus = (test = {}) =>
  String(test?.Result_Value || "").trim() ? "result out" : "pending";

const getResultLabel = (test = {}) => {
  const value = test?.Result_Value;
  const units = test?.Units || test?.Test_ID?.Units || "";
  if (value === null || value === undefined || value === "") return "-";
  return `${value} ${units}`.trim();
};

const getReportDate = (record = {}, test = null) =>
  test?.Timestamp ||
  record?.Tests?.[0]?.Timestamp ||
  record?.Timestamp ||
  record?.updatedAt ||
  record?.createdAt ||
  null;

const DiagnosisReportPreview = ({ reportData = {}, resolveUrl }) => {
  const record = reportData?.record || (reportData?.Tests ? reportData : {});
  const selectedTest = reportData?.test || null;
  const tests = selectedTest ? [selectedTest] : toArray(record?.Tests);
  const instituteName =
    record?.Institute?.Institute_Name ||
    reportData?.instituteName ||
    reportData?.Institute?.Institute_Name ||
    "-";
  const reportDate = getReportDate(record, selectedTest);
  const patientName = getPatientLabel(record, reportData);
  const reportFor = getReportForLabel(record, reportData);

  return (
    <div
      style={{
        width: "210mm",
        minHeight: "297mm",
        boxSizing: "border-box",
        padding: "16mm",
        background: "#F5FAFF",
        fontFamily: "'Inter', sans-serif",
        color: "#1F2933",
      }}
    >
      <div
        style={{
          borderRadius: "24px",
          overflow: "hidden",
          border: "1px solid rgba(191,219,254,0.82)",
          background: "rgba(255,255,255,0.92)",
          boxShadow: "0 24px 44px rgba(148,184,255,0.18)",
        }}
      >
        <div
          style={{
            padding: "20px 24px",
            background: "linear-gradient(135deg, #2563EB, #38BDF8)",
            color: "#fff",
          }}
        >
          <div style={{ fontSize: "12px", letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.92 }}>
            {instituteName}
          </div>
          <div style={{ fontSize: "28px", fontWeight: 700, lineHeight: 1.1 }}>
            DIAGNOSIS REPORT
          </div>
          <div style={{ fontSize: "13px", opacity: 0.92, marginTop: "4px" }}>
            {formatDateTime(reportDate)}
          </div>
        </div>

        <div style={{ padding: "22px 24px 8px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: "12px",
              marginBottom: "18px",
            }}
          >
            <InfoCard label="Patient" value={patientName} />
            <InfoCard label="Report For" value={reportFor} />
            <InfoCard label="Institute" value={instituteName} />
            <InfoCard label="Date" value={formatDateTime(reportDate)} />
          </div>

          <div
            style={{
              borderRadius: "18px",
              border: "1px solid rgba(191,219,254,0.78)",
              overflow: "hidden",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                background: "#EFF6FF",
                color: "#1E3A8A",
                fontWeight: 700,
                padding: "12px 16px",
              }}
            >
              Test Details
            </div>

            <div style={{ padding: "16px" }}>
              {tests.length > 0 ? (
                tests.map((test, index) => {
                  const files = toArray(test?.Reports);
                  const status = getStatus(test);

                  return (
                    <div
                      key={`${test?._id || test?.Test_ID?._id || test?.Test_ID || index}`}
                      style={{
                        border: "1px solid rgba(214,224,240,0.95)",
                        borderRadius: "16px",
                        padding: "16px",
                        marginBottom: index === tests.length - 1 ? 0 : "14px",
                        background: "rgba(255,255,255,0.96)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "12px",
                          marginBottom: "14px",
                        }}
                      >
                        <div style={{ fontSize: "16px", fontWeight: 700, color: "#1F2933" }}>
                          {test?.Test_Name || test?.Test_ID?.Test_Name || `Test ${index + 1}`}
                        </div>
                        <span
                          style={{
                            borderRadius: "999px",
                            padding: "4px 10px",
                            fontSize: "12px",
                            fontWeight: 700,
                            background: status === "result out" ? "#DCFCE7" : "#FEF3C7",
                            color: status === "result out" ? "#166534" : "#92400E",
                          }}
                        >
                          {status}
                        </span>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                          gap: "10px 16px",
                        }}
                      >
                        <DetailRow label="Category" value={getCategory(test)} />
                        <DetailRow label="Result" value={getResultLabel(test)} />
                        <DetailRow label="Reference Range" value={getReferenceRange(test)} />
                        <DetailRow label="Sample Type" value={test?.Sample_Type || "-"} />
                      </div>

                      {files.length > 0 && (
                        <div style={{ marginTop: "14px" }}>
                          <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "8px", color: "#1E3A8A" }}>
                            Report Files
                          </div>
                          <div style={{ display: "grid", gap: "8px" }}>
                            {files.map((file, fileIndex) => (
                              (() => {
                                const fileUrl = getFileUrl(file, resolveUrl);
                                const label = file?.originalname || file?.filename || "Report file";

                                return (
                                  <div
                                    key={`${file?.url || fileIndex}`}
                                    style={{
                                      border: "1px solid rgba(214,224,240,0.95)",
                                      borderRadius: "12px",
                                      padding: "10px 12px",
                                      background: "#F8FBFF",
                                    }}
                                  >
                                    <div style={{ fontWeight: 600, fontSize: "13px" }}>
                                      {label}
                                    </div>
                                    <div style={{ fontSize: "12px", color: "#6B7280", marginTop: "2px" }}>
                                      {test?.Test_Name || "Diagnosis Test"}
                                    </div>
                                    {fileUrl && isImageFile(file) && (
                                      <div
                                        style={{
                                          marginTop: "10px",
                                          borderRadius: "10px",
                                          overflow: "hidden",
                                          border: "1px solid rgba(191,219,254,0.65)",
                                          background: "#fff",
                                        }}
                                      >
                                        <img
                                          src={fileUrl}
                                          alt={label}
                                          style={{
                                            width: "100%",
                                            maxHeight: "260px",
                                            objectFit: "contain",
                                            display: "block",
                                            background: "#fff",
                                          }}
                                        />
                                      </div>
                                    )}
                                  </div>
                                );
                              })()
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div style={{ color: "#6B7280" }}>No diagnosis details available.</div>
              )}
            </div>
          </div>
        </div>

        <div
          style={{
            padding: "14px 24px",
            background: "rgba(239,246,255,0.86)",
            borderTop: "1px solid rgba(191,219,254,0.7)",
            fontSize: "12px",
            color: "#4B5563",
          }}
        >
          This is a digitally generated diagnosis report.
        </div>
      </div>
    </div>
  );
};

const InfoCard = ({ label, value }) => (
  <div
    style={{
      borderRadius: "16px",
      border: "1px solid rgba(214,224,240,0.95)",
      background: "#F8FBFF",
      padding: "12px 14px",
    }}
  >
    <div style={{ fontSize: "12px", color: "#6B7280", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
      {label}
    </div>
    <div style={{ fontSize: "14px", fontWeight: 600, lineHeight: 1.4 }}>{value || "-"}</div>
  </div>
);

const DetailRow = ({ label, value }) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "120px minmax(0, 1fr)",
      gap: "10px",
      alignItems: "start",
      fontSize: "13px",
    }}
  >
    <div style={{ color: "#6B7280", fontWeight: 600 }}>{label}</div>
    <div style={{ fontWeight: 500, whiteSpace: "pre-wrap" }}>{value || "-"}</div>
  </div>
);

export default DiagnosisReportPreview;
