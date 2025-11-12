import React, { useEffect, useState } from "react";
import axios from "axios";

const DiagnosisEntryForm = () => {
  const [employees, setEmployees] = useState([]);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [testsMaster, setTestsMaster] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [instituteName, setInstituteName] = useState("");

  const [formData, setFormData] = useState({
    Institute_ID: "",
    Employee_ID: "",
    IsFamilyMember: false,
    FamilyMember_ID: "",
    Tests: [{ Test_ID: "", Test_Name: "", Result_Value: "", Reference_Range: "", Units: "" }],
    Diagnosis_Notes: ""
  });

  const BACKEND_PORT_NO = import.meta.env.VITE_BACKEND_PORT || "6100";
 
  useEffect(() => {
    const localInstituteId = localStorage.getItem("instituteId");
    if (localInstituteId) {
      setFormData((s) => ({ ...s, Institute_ID: localInstituteId }));
      fetchInstituteName(localInstituteId);
      fetchTests();
    } else {
      console.warn("No instituteId in localStorage");
    }
    fetchEmployees();
  }, []);

  const fetchInstituteName = async (id) => {
    try {
      const res = await axios.get(`http://localhost:${BACKEND_PORT_NO}/institute-api/institution/${id}`);
      setInstituteName(res.data?.Institute_Name || "");
    } catch (err) {
      console.error("Error fetching institute name:", err);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await axios.get(`http://localhost:${BACKEND_PORT_NO}/employee-api/employees`);
      setEmployees(res.data || []);
    } catch (err) {
      console.error("Error fetching employees:", err);
    }
  };

  const fetchTests = async () => {
    try {
      const res = await axios.get(`http://localhost:${BACKEND_PORT_NO}/diagnosis-api/tests`);
      setTestsMaster(res.data || []);
    } catch (err) {
      console.error("Error fetching tests:", err);
    }
  };

  useEffect(() => {
    if (!searchTerm.trim()) return setFilteredEmployees([]);
    const q = searchTerm.toLowerCase();
    setFilteredEmployees(employees.filter(e => String(e.ABS_NO || "").toLowerCase().startsWith(q)));
  }, [searchTerm, employees]);

  useEffect(() => {
    const fetchFamily = async () => {
      if (!formData.Employee_ID) return setFamilyMembers([]);
      try {
        const res = await axios.get(`http://localhost:${BACKEND_PORT_NO}/family-api/family/${formData.Employee_ID}`);
        setFamilyMembers(res.data || []);
      } catch (err) {
        console.error("Error fetching family:", err);
      }
    };
    fetchFamily();
  }, [formData.Employee_ID]);

  const handleEmployeeSelect = (emp) => {
    setFormData(prev => ({ ...prev, Employee_ID: emp._id }));
    setSearchTerm(emp.ABS_NO || "");
    setFilteredEmployees([]);
  };

  const handleTestChange = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.Tests];
      if (field === "Test_ID") {
        // if selected from master list, fill Test_Name, Reference_Range, Units
        const sel = testsMaster.find(t => t._id === value);
        if (sel) {
          updated[index] = {
            Test_ID: sel._id,
            Test_Name: sel.Test_Name,
            Result_Value: "",
            Reference_Range: sel.Reference_Range || "",
            Units: sel.Units || "",
            Remarks: ""
          };
        } else {
          updated[index] = { ...updated[index], Test_ID: "", Test_Name: "" };
        }
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      return { ...prev, Tests: updated };
    });
  };

  const addTest = () => setFormData(prev => ({ ...prev, Tests: [...prev.Tests, { Test_ID: "", Test_Name: "", Result_Value: "", Reference_Range: "", Units: "" }] }));
  const removeTest = (i) => setFormData(prev => ({ ...prev, Tests: prev.Tests.filter((_, idx) => idx !== i) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      Institute_ID: formData.Institute_ID,
      Employee_ID: formData.Employee_ID,
      IsFamilyMember: formData.IsFamilyMember,
      FamilyMember_ID: formData.IsFamilyMember ? formData.FamilyMember_ID : null,
      Tests: formData.Tests.map(t => ({
        Test_ID: t.Test_ID || null,
        Test_Name: t.Test_Name,
        Result_Value: t.Result_Value,
        Reference_Range: t.Reference_Range,
        Units: t.Units,
        Remarks: t.Remarks || ""
      })),
      Diagnosis_Notes: formData.Diagnosis_Notes || ""
    };

    // basic front validation
    if (!payload.Institute_ID || !payload.Employee_ID || payload.Tests.length === 0) {
      alert("Institute, employee and at least one test are required");
      return;
    }
    for (let i = 0; i < payload.Tests.length; i++) {
      if (!payload.Tests[i].Test_Name || !payload.Tests[i].Result_Value) {
        alert(`Test name and result required for test index ${i + 1}`);
        return;
      }
    }

    try {
      const res = await axios.post(`http://localhost:${BACKEND_PORT_NO}/diagnosis-api/add`, payload);
      alert("✅ Diagnosis record saved");
      // reset tests (keeping institute)
      setFormData(prev => ({ ...prev, Employee_ID: "", IsFamilyMember: false, FamilyMember_ID: "", Tests: [{ Test_ID: "", Test_Name: "", Result_Value: "", Reference_Range: "", Units: "" }], Diagnosis_Notes: "" }));
      setSearchTerm("");
      setFamilyMembers([]);
    } catch (err) {
      console.error("Error saving diagnosis:", err?.response?.data || err);
      alert("❌ Error saving diagnosis: " + (err?.response?.data?.message || err?.message || "server error"));
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: "30px auto", padding: 20, background: "#fff", borderRadius: 8 }}>
      <h2>Diagnosis / Lab Entry</h2>
      <form onSubmit={handleSubmit} autoComplete="off">
        <label>Institute</label>
        <input type="text" value={instituteName} readOnly style={{ width: "100%", padding: 8, marginBottom: 10 }} />

        <label>Employee ABS_NO</label>
        <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Type ABS_NO..." style={{ width: "100%", padding: 8 }} />
        {searchTerm && filteredEmployees.length > 0 && (
          <div style={{ border: "1px solid #ccc", maxHeight: 160, overflowY: "auto" }}>
            {filteredEmployees.map(emp => (
              <div key={emp._id} onClick={() => handleEmployeeSelect(emp)} style={{ padding: 8, cursor: "pointer", borderBottom: "1px solid #eee" }}>
                {emp.ABS_NO} — {emp.Name}
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 10 }}>
          <label>
            <input type="checkbox" checked={formData.IsFamilyMember} onChange={e => setFormData(prev => ({ ...prev, IsFamilyMember: e.target.checked }))} /> Prescription for Family Member?
          </label>
        </div>

        {formData.IsFamilyMember && (
          <>
            <label>Select Family Member</label>
            <select value={formData.FamilyMember_ID} onChange={e => setFormData(prev => ({ ...prev, FamilyMember_ID: e.target.value }))} style={{ width: "100%", padding: 8 }}>
              <option value="">Select Family Member</option>
              {familyMembers.map(f => <option key={f._id} value={f._id}>{f.Name} ({f.Relationship})</option>)}
            </select>
          </>
        )}

        <h4 style={{ marginTop: 16 }}>Tests</h4>
        {formData.Tests.map((t, i) => (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <select value={t.Test_ID || ""} onChange={e => handleTestChange(i, "Test_ID", e.target.value)} style={{ flex: "0 0 45%", padding: 8 }}>
              <option value="">Select Test (or leave blank to type)</option>
              {testsMaster.map(tm => <option key={tm._id} value={tm._id}>{tm.Test_Name} — {tm.Group || ""}</option>)}
            </select>

            <input type="text" placeholder="Test Name" value={t.Test_Name} onChange={e => handleTestChange(i, "Test_Name", e.target.value)} style={{ flex: "0 0 25%", padding: 8 }} />

            <input type="text" placeholder="Result (e.g. 14.2 g/dL)" value={t.Result_Value} onChange={e => handleTestChange(i, "Result_Value", e.target.value)} style={{ flex: "0 0 20%", padding: 8 }} />

            <button type="button" onClick={() => removeTest(i)} style={{ background: "#dc3545", color: "#fff", border: "none", padding: "6px 8px" }}>X</button>
          </div>
        ))}
        <button type="button" onClick={addTest} style={{ padding: 8, background: "#007bff", color: "#fff", border: "none", borderRadius: 6 }}>+ Add Test</button>

        <label style={{ display: "block", marginTop: 12 }}>Notes</label>
        <textarea value={formData.Diagnosis_Notes} onChange={e => setFormData(prev => ({ ...prev, Diagnosis_Notes: e.target.value }))} rows={3} style={{ width: "100%", padding: 8 }} />

        <button type="submit" style={{ marginTop: 12, width: "100%", padding: 10, background: "black", color: "white", border: "none", borderRadius: 6 }}>Save Diagnosis</button>
      </form>
    </div>
  );
};

export default DiagnosisEntryForm;