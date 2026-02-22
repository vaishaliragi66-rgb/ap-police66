import React, { useEffect, useState } from "react";
import axios from "axios";
import PatientSelector from "../institutes/PatientSelector";

const XrayEntryForm = () => {
  const [instituteName, setInstituteName] = useState("");
  const [visitId, setVisitId] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedFamilyMember, setSelectedFamilyMember] = useState(null);
  const [pastRecords, setPastRecords] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [tokenNumber, setTokenNumber] = useState(null);
  const [xrayTypes, setXrayTypes] = useState([]);
  const [xrayMaster, setXrayMaster] = useState([]);



  const BASE_URL = import.meta.env.VITE_BASE_URL;

  const [formData, setFormData] = useState({
    Institute_ID: "",
    Employee_ID: "",
    IsFamilyMember: false,
    FamilyMember_ID: "",
    Xrays: [
      {
        Xray_Type: "",
        Body_Part: "",
        Side: "NA",
        View: "",
        Film_Size: "",
        Findings: "",
        Impression: "",
        Remarks: "",
      },
    ],
    Xray_Notes: "",
  });

  useEffect(() => {
    const localInstituteId =
      localStorage.getItem("instituteId");
    if (localInstituteId) {
      setFormData((s) => ({
        ...s,
        Institute_ID: localInstituteId,
      }));
      fetchInstituteName(localInstituteId);
        // ADD THIS
  fetchXrayTypes();
    }
  }, []);

  const fetchInstituteName = async (id) => {
    try {
      const res = await axios.get(
        `${BASE_URL}/institute-api/institution/${id}`
      );
      setInstituteName(res.data?.Institute_Name || "");
    } catch (err) {
      console.error("Error fetching institute name:", err);
    }
  };
const fetchXrayTypes = async () => {
  try {
    const res = await axios.get(
      `${BASE_URL}/xray-api/types`
    );

    setXrayMaster(res.data || []);
    console.log("X-ray types fetched:", res.data?.length);
  } catch (err) {
    console.error("Error fetching X-ray types:", err);
  }
};


 const handleXrayChange = (index, field, value) => {
  setFormData(prev => {
    const updated = [...prev.Xrays];

    if (field === "Xray_ID") {
      const sel = xrayMaster.find(x => x._id === value);

      if (sel) {
        updated[index] = {
          ...updated[index],
          Xray_ID: sel._id,
          Xray_Type: sel.Xray_Type,
          Body_Part: sel.Body_Part,
          Side: sel.Side || "NA",
          View: sel.View || "",
          Film_Size: sel.Film_Size || ""
        };
      } else {
        updated[index] = {
          ...updated[index],
          Xray_ID: value || "",
          Xray_Type: value
            ? updated[index].Xray_Type
            : ""
        };
      }
    } else {
      updated[index] = {
        ...updated[index],
        [field]: value
      };
    }

    return { ...prev, Xrays: updated };
  });
};


  const addXray = () => {
    setFormData((prev) => ({
      ...prev,
      Xrays: [
        ...prev.Xrays,
        {
          Xray_Type: "",
          Body_Part: "",
          Side: "NA",
          View: "",
          Film_Size: "",
          Findings: "",
          Impression: "",
          Remarks: "",
        },
      ],
    }));
  };

  const removeXray = (i) => {
    setFormData((prev) => ({
      ...prev,
      Xrays: prev.Xrays.filter(
        (_, idx) => idx !== i
      ),
    }));
  };

  const fetchPastRecords = async () => {
    if (!formData.Employee_ID) return;

    try {
      const res = await axios.get(
        `${BASE_URL}/xray-api/records/${formData.Employee_ID}?isFamily=${formData.IsFamilyMember}&familyId=${formData.FamilyMember_ID}`
      );
      setPastRecords(res.data || []);
      setShowHistory(true);
    } catch (err) {
      console.error(
        "Error fetching past records:",
        err
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.Employee_ID) {
      alert("Please select an employee");
      return;
    }

    if (formData.Xrays.length === 0) {
      alert("Please add at least one X-ray");
      return;
    }

    for (let i = 0; i < formData.Xrays.length; i++) {
      const x = formData.Xrays[i];
      if (!x.Xray_Type || x.Xray_Type.trim() === "") {
        alert(
          `X-ray type is required for entry #${
            i + 1
          }`
        );
        return;
      }
    }

    try {
      await axios.post(
        `${BASE_URL}/xray-api/add`,
        {
          Institute_ID: formData.Institute_ID,
          Employee_ID: formData.Employee_ID,
          IsFamilyMember: formData.IsFamilyMember,
          FamilyMember_ID:
            formData.IsFamilyMember
              ? formData.FamilyMember_ID
              : null,
          Xrays: formData.Xrays,
          Xray_Notes: formData.Xray_Notes,
          visit_id: visitId,
        }
      );

      alert("✅ X-ray record saved successfully!");

      setFormData((prev) => ({
        ...prev,
        Employee_ID: "",
        Xrays: [
          {
            Xray_Type: "",
            Body_Part: "",
            Side: "NA",
            View: "",
            Film_Size: "",
            Findings: "",
            Impression: "",
            Remarks: "",
          },
        ],
        Xray_Notes: "",
      }));

      setVisitId(null);
      setSelectedEmployee(null);
      setSelectedFamilyMember(null);
    } catch (err) {
      console.error("Error saving X-ray:", err);
      alert("❌ Error saving X-ray record");
    }
  };

  const formatDateDMY = (dateValue) => {
    if (!dateValue) return "—";
    const date = new Date(dateValue);
    if (isNaN(date)) return "—";

    const day = String(date.getDate()).padStart(
      2,
      "0"
    );
    const month = String(
      date.getMonth() + 1
    ).padStart(2, "0");
    const year = date.getFullYear();

    return `${day}-${month}-${year}`;
  };

  return (
    <div
      style={{
        background: "#b7c3cf",
        minHeight: "100vh",
        padding: "40px",
      }}
    >
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        <h2
          style={{
            textAlign: "center",
            marginBottom: 30,
            color: "#333",
          }}
        >
          🩻 X-ray Entry
        </h2>

        <form onSubmit={handleSubmit}>
          {/* Institute */}
          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: "block",
                marginBottom: 8,
                fontWeight: "bold",
                color: "#555",
              }}
            >
              Institute
            </label>
            <input
              value={instituteName || "Loading..."}
              readOnly
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #ddd",
                backgroundColor: "#f9f9f9",
              }}
            />
          </div>

          {/* Patient Selector */}
          <PatientSelector
            instituteId={formData.Institute_ID}
            onSelect={({ employee, visit }) => {
              const vId = visit?._id || null;
              const token =
                visit?.token_no ||
                visit?.Token_Number ||
                null;

              setVisitId(vId);
              setTokenNumber(token);
              setSelectedEmployee(employee);
              setSelectedFamilyMember(
                visit?.IsFamilyMember
                  ? visit.FamilyMember
                  : null
              );

              setFormData((prev) => ({
                ...prev,
                Employee_ID: employee._id,
                IsFamilyMember: Boolean(
                  visit?.IsFamilyMember
                ),
                FamilyMember_ID:
                  visit?.IsFamilyMember
                    ? visit.FamilyMember?._id
                    : "",
              }));
            }}
          />
          {selectedEmployee && (
  <div
    style={{
      marginBottom: 20,
      padding: "14px",
      backgroundColor: "#eef6ff",
      borderRadius: "8px",
      border: "1px solid #cfe2ff",
    }}
  >
    <div>
      <strong>Employee Name:</strong>{" "}
      {selectedEmployee.Name}
    </div>
    <div>
      <strong>ABS No:</strong>{" "}
      {selectedEmployee.ABS_NO}
    </div>

    {tokenNumber && (
      <div>
        <strong>Token Number:</strong>{" "}
        {tokenNumber}
      </div>
    )}

    {formData.IsFamilyMember &&
      selectedFamilyMember && (
        <>
          <div>
            <strong>Family Member:</strong>{" "}
            {selectedFamilyMember.Name}
          </div>
          <div>
            <strong>Relationship:</strong>{" "}
            {selectedFamilyMember.Relationship}
          </div>
        </>
      )}

    <button
      type="button"
      onClick={fetchPastRecords}
      style={{
        marginTop: "10px",
        padding: "8px 16px",
        background:
          "linear-gradient(135deg, #2563eb, #1e40af)",
        color: "#ffffff",
        border: "none",
        borderRadius: "8px",
        cursor: "pointer",
        fontWeight: "600",
        fontSize: "14px",
        boxShadow:
          "0 4px 10px rgba(37, 99, 235, 0.3)",
        transition: "0.2s ease",
      }}
    >
      📄 View History
    </button>
  </div>
)}


          {/* X-ray Section */}
          <div style={{ marginBottom: 30 }}>
            <h4
              style={{
                marginBottom: 20,
                color: "#333",
                borderBottom: "2px solid #eee",
                paddingBottom: 10,
              }}
            >
              X-rays
            </h4>

            {formData.Xrays.map((x, i) => (
              <div
                key={i}
                style={{
                  marginBottom: 20,
                  padding: "15px",
                  backgroundColor: "#f8f9fa",
                  borderRadius: "8px",
                  border: "1px solid #e9ecef",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "1fr 1fr 1fr 1fr auto",
                    gap: "10px",
                    alignItems: "center",
                  }}
                >
                  {/* <select
  value={x.Xray_Type}
  onChange={(e) =>
    handleXrayChange(i, "Xray_Type", e.target.value)
  }
  style={{
    padding: "8px 10px",
    borderRadius: "6px",
    border: "1px solid #ddd",
  }}
>
  <option value="">Select X-ray Type</option>
  {xrayTypes.map((type) => (
    <option
      key={type._id}
      value={type.Xray_Type}
    >
      {type.Xray_Type} — {type.Body_Part}
    </option>
  ))}
</select> */}
<div>
  <div style={{ fontSize: "12px", marginBottom: 4 }}>
    X-ray Selection
  </div>

  <select
    value={x.Xray_ID || ""}
    onChange={(e) =>
      handleXrayChange(i, "Xray_ID", e.target.value)
    }
    style={{
      width: "100%",
      padding: "8px 10px",
      borderRadius: "6px",
      border: "1px solid #ddd",
    }}
  >
    <option value="">
      Select X-ray (or type below)
    </option>

    {xrayMaster.map((xm) => (
      <option key={xm._id} value={xm._id}>
        {xm.Xray_Type} ({xm.Body_Part})
      </option>
    ))}
  </select>
</div>

<div>
  <div style={{ fontSize: "12px", marginBottom: 4 }}>
    X-ray Type
  </div>
  <input
    type="text"
    placeholder="X-ray Type"
    value={x.Xray_Type}
    onChange={(e) =>
      handleXrayChange(
        i,
        "Xray_Type",
        e.target.value
      )
    }
    style={{
      width: "100%",
      padding: "8px 10px",
      borderRadius: "6px",
      border: "1px solid #ddd",
    }}
  />
</div>



                  <input
                    type="text"
                    placeholder="Body Part"
                    value={x.Body_Part}
                    onChange={(e) =>
                      handleXrayChange(
                        i,
                        "Body_Part",
                        e.target.value
                      )
                    }
                    style={{
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid #ddd",
                    }}
                  />

                  <input
                    type="text"
                    placeholder="View (AP/PA)"
                    value={x.View}
                    onChange={(e) =>
                      handleXrayChange(
                        i,
                        "View",
                        e.target.value
                      )
                    }
                    style={{
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid #ddd",
                    }}
                  />
{/* Film Size Field */}
  <input
    type="text"
    placeholder="Film Size (10x8)"
    value={x.Film_Size}
    onChange={(e) =>
      handleXrayChange(i, "Film_Size", e.target.value)
    }
    style={{
      padding: "8px 10px",
      borderRadius: "6px",
      border: "1px solid #ddd",
    }}
  />
                  {formData.Xrays.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        removeXray(i)
                      }
                      style={{
                        background: "#dc3545",
                        color: "#fff",
                        border: "none",
                        borderRadius: "6px",
                        padding: "8px 12px",
                        cursor: "pointer",
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addXray}
              style={{
                padding: "10px 16px",
                background: "#007bff",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              + Add Another X-ray
            </button>
          </div>

          {/* Notes */}
          <div style={{ marginBottom: 30 }}>
            <label
              style={{
                display: "block",
                marginBottom: 8,
                fontWeight: "bold",
                color: "#555",
              }}
            >
              X-ray Notes
            </label>
            <textarea
              value={formData.Xray_Notes}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  Xray_Notes: e.target.value,
                }))
              }
              rows={4}
              placeholder="Enter X-ray notes..."
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid #ddd",
                resize: "vertical",
              }}
            />
          </div>
          {/* HISTORY PANEL */}
{showHistory && (
  <div
    style={{
      position: "fixed",
      top: 0,
      right: 0,
      height: "100vh",
      width: "40%",
      background: "#fff",
      padding: 25,
      overflowY: "auto",
      boxShadow: "-4px 0 20px rgba(0,0,0,0.15)",
      zIndex: 2000,
      transition: "0.3s ease-in-out",
    }}
  >
    {/* Header */}
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
      }}
    >
      <h3 style={{ margin: 0 }}>🩻 X-ray History</h3>
      <button
        onClick={() => setShowHistory(false)}
        style={{
          background: "#dc3545",
          color: "#fff",
          border: "none",
          padding: "6px 10px",
          borderRadius: "6px",
          cursor: "pointer",
        }}
      >
        Close ✖
      </button>
    </div>

    {/* Content */}
    {!pastRecords || pastRecords.length === 0 ? (
      <div style={{ color: "#777" }}>
        No previous records.
      </div>
    ) : (
      pastRecords.map((record, index) => (
        <div
          key={record._id || index}
          style={{
            marginBottom: 20,
            padding: 15,
            borderRadius: 10,
            background: "#f8f9fa",
            border: "1px solid #e0e0e0",
          }}
        >
          {/* Date */}
          <div
            style={{
              fontSize: 13,
              color: "#555",
              marginBottom: 8,
            }}
          >
            Date:{" "}
            {record?.createdAt
              ? formatDateDMY(record.createdAt)
              : "—"}
          </div>

          {/* X-rays */}
          {record?.Xrays?.length > 0 ? (
            record.Xrays.map((x, i) => (
              <div key={i} style={{ marginBottom: 6 }}>
                <strong>
                  {x?.Xray_Type || "X-ray"}
                </strong>
                {" — "}
                {x?.Body_Part || "N/A"}
                {x?.View && ` (${x.View})`}
              </div>
            ))
          ) : (
            <div style={{ color: "#888", fontSize: 13 }}>
              No X-ray details
            </div>
          )}

          {/* Notes */}
          {record?.Xray_Notes && (
            <div
              style={{
                marginTop: 8,
                fontSize: 13,
                color: "#444",
              }}
            >
              Notes: {record.Xray_Notes}
            </div>
          )}
        </div>
      ))
    )}
  </div>
)}


          {/* Submit */}
          <button
            type="submit"
            style={{
              width: "100%",
              padding: "14px",
              background: "#28a745",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            💾 Save X-ray Record
          </button>
        </form>
      </div>
    </div>
  );
};
export default XrayEntryForm;