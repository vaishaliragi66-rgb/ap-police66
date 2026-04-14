import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import PatientSelector from "../institutes/PatientSelector";

const DoctorDiagnosisForm = () => {
  const [testsMaster, setTestsMaster] = useState([]);
  const [instituteName, setInstituteName] = useState("");
  const [formData, setFormData] = useState({
    Institute_ID: "",
    Employee_ID: "",
    IsFamilyMember: false,
    FamilyMember_ID: "",
    Tests: [ { Category: "", Test_ID: "", Test_Name: "", Result_Value: null, Reference_Range: "", Units: "" } ],
    Diagnosis_Notes: ""
  });
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [visitId, setVisitId] = useState(null);

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  const testsByCategory = useMemo(() => {
    const grouped = {};
    (testsMaster || []).forEach((test) => {
      const group = String(test?.Group || "").trim();
      const testName = String(test?.Test_Name || "").trim();
      if (!group || !testName) return;
      if (!grouped[group]) grouped[group] = [];
      grouped[group].push({
        _id: test._id,
        name: testName,
        reference: test.Reference_Range || "",
        unit: test.Units || ""
      });
    });
    Object.keys(grouped).forEach((group) => {
      const seen = new Set();
      grouped[group] = grouped[group]
        .filter((item) => {
          const key = String(item?.name || "").trim().toLowerCase();
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .sort((a, b) => a.name.localeCompare(b.name));
    });
    return grouped;
  }, [testsMaster]);

  useEffect(() => {
    const localInstituteId = localStorage.getItem("instituteId");
    if (localInstituteId) {
      setFormData(prev => ({ ...prev, Institute_ID: localInstituteId }));
      fetchInstituteName(localInstituteId);
      fetchTests();
    }
  }, []);

  const fetchInstituteName = async (id) => {
    try {
      const res = await axios.get(`${BACKEND_URL}/institute-api/institution/${id}`);
      setInstituteName(res.data?.Institute_Name || "");
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTests = async () => {
    try {
      const instituteId = localStorage.getItem("instituteId") || "";
      const res = await axios.get(`${BACKEND_URL}/diagnosis-api/tests`, {
        params: instituteId ? { instituteId } : {}
      });
      setTestsMaster(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleTestChange = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.Tests];
      if (field === "Test_ID") {
        const sel = testsMaster.find(t => t._id === value);
        if (sel) {
          updated[index] = {
            ...updated[index],
            Test_ID: sel._id,
            Test_Name: sel.Test_Name,
            Result_Value: null,
            Reference_Range: sel.Reference_Range || "",
            Units: sel.Units || ""
          };
        } else {
          updated[index] = { ...updated[index], Test_ID: value || "" };
        }
      } else if (field === "Category") {
        updated[index] = { ...updated[index], Category: value, Test_ID: "", Test_Name: "", Reference_Range: "", Units: "" };
      } else if (field === "Test_Name") {
        const cat = updated[index].Category;
        const list = cat && testsByCategory[cat] ? testsByCategory[cat] : [];
        const found = list.find(x => x.name === value);
        if (found) {
          updated[index] = { ...updated[index], Test_ID: found._id || "", Test_Name: found.name, Reference_Range: found.reference || "", Units: found.unit || "" };
        } else {
          updated[index] = { ...updated[index], Test_Name: value };
        }
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      return { ...prev, Tests: updated };
    });
  };

  const addTest = () => setFormData(prev => ({ ...prev, Tests: [ ...prev.Tests, { Category: "", Test_ID: "", Test_Name: "", Result_Value: null, Reference_Range: "", Units: "" } ] }));
  const removeTest = (i) => setFormData(prev => ({ ...prev, Tests: prev.Tests.filter((_, idx) => idx !== i) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.Institute_ID) return alert('Institute ID missing');
    if (!formData.Employee_ID) return alert('Please select an employee');

    for (let i=0;i<formData.Tests.length;i++){
      if (!formData.Tests[i].Test_Name) return alert(`Test name is required for test #${i+1}`);
    }

    const payload = {
      Institute_ID: formData.Institute_ID,
      Employee_ID: formData.Employee_ID,
      IsFamilyMember: formData.IsFamilyMember,
      FamilyMember_ID: formData.IsFamilyMember ? formData.FamilyMember_ID : null,
      Tests: formData.Tests.map(t=>({ Test_ID: t.Test_ID || null, Test_Name: t.Test_Name, Result_Value: t.Result_Value, Reference_Range: t.Reference_Range || "", Units: t.Units || "" })),
      Diagnosis_Notes: formData.Diagnosis_Notes || ""
    };

    try {
      await axios.post(`${BACKEND_URL}/api/medical-actions`, {
        employee_id: formData.Employee_ID,
        visit_id: visitId,
        action_type: "DOCTOR_DIAGNOSIS",
        source: "DOCTOR",
        data: { Institute_ID: formData.Institute_ID, IsFamilyMember: formData.IsFamilyMember, FamilyMember_ID: formData.IsFamilyMember ? formData.FamilyMember_ID : null, tests: payload.Tests, notes: payload.Diagnosis_Notes }
      });
      alert('✅ Diagnosis record saved successfully!');
      setFormData(prev => ({ ...prev, Employee_ID: "", Tests: [{ Category: "", Test_ID: "", Test_Name: "", Result_Value: null, Reference_Range: "", Units: "" }], Diagnosis_Notes: "" }));
      setVisitId(null);
      setSelectedEmployee(null);
    } catch (err) {
      console.error(err);
      alert('❌ Error saving diagnosis');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f8fe', padding: '40px 16px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: 32, background: '#fff', borderRadius: 14 }}>
        <h2 style={{ textAlign: 'center', marginBottom: 32 }}>🏥 Diagnosis / Lab Test Entry</h2>
        <form onSubmit={handleSubmit} autoComplete="off">
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 6, fontWeight:600 }}>Institute</label>
            <input type="text" readOnly value={instituteName || 'Loading...'} style={{ width: '100%', padding:12, borderRadius:8, border:'1px solid #ddd', backgroundColor:'#f9fafb' }} />
          </div>

          <div style={{ marginBottom: 24 }}>
            <PatientSelector instituteId={formData.Institute_ID} onSelect={({ employee, visit_id }) => { setSelectedEmployee(employee); setVisitId(visit_id||null); setFormData(prev => ({ ...prev, Employee_ID: employee._id, IsFamilyMember: false, FamilyMember_ID: '' })); }} />
          </div>

          {formData.Employee_ID && (<div style={{ marginBottom: 24, padding:14, borderRadius:8, background:'#f3f4f6' }}><strong>Selected Employee:</strong> {selectedEmployee?.Name} (ABS_NO: {selectedEmployee?.ABS_NO})</div>)}

          <h4 style={{ marginBottom: 16, borderBottom: '2px solid #000', paddingBottom:8 }}>Tests</h4>

          {formData.Tests.map((t,i)=> (
            <div key={i} style={{ padding:16, marginBottom:16, borderRadius:10, border:'1px solid #e5e7eb', background:'#fafafa' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr auto', gap:12, alignItems:'end' }}>
                <div>
                  <label style={{ fontSize:12, fontWeight:600 }}>Category</label>
                  <select className="form-select" value={t.Category||""} onChange={e=>handleTestChange(i,'Category', e.target.value)}>
                    <option value="">Select Category</option>
                    {Object.keys(testsByCategory).map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize:12, fontWeight:600 }}>Test Name</label>
                  <select className="form-select" value={t.Test_Name||""} onChange={e=>handleTestChange(i,'Test_Name', e.target.value)} disabled={!t.Category}>
                    <option value="">Select Test</option>
                    {(t.Category && testsByCategory[t.Category] ? testsByCategory[t.Category] : []).map(testObj => (<option key={testObj.name} value={testObj.name}>{testObj.name}</option>))}
                  </select>
                </div>

                {formData.Tests.length > 1 && (<button type="button" onClick={()=>removeTest(i)} style={{ padding:'10px 14px', background:'#000', color:'#fff', border:'none', borderRadius:6 }}>Remove</button>)}
              </div>
            </div>
          ))}

          <button type="button" onClick={addTest} style={{ marginBottom:28, padding:'12px 18px', background:'#000', color:'#fff', border:'none', borderRadius:8 }}>+ Add Another Test</button>

          <div style={{ marginBottom:28 }}>
            <label style={{ display:'block', marginBottom:6, fontWeight:600 }}>Diagnosis Notes</label>
            <textarea rows={4} value={formData.Diagnosis_Notes} onChange={e=>setFormData(prev=>({...prev, Diagnosis_Notes: e.target.value}))} style={{ width:'100%', padding:12, borderRadius:8, border:'1px solid #ccc' }} />
          </div>

          <button type="submit" style={{ width: '100%', padding:16, background:'#000', color:'#fff', border:'none', borderRadius:10 }}>💾 Save Diagnosis Record</button>
        </form>
      </div>
    </div>
  );
};

export default DoctorDiagnosisForm;
