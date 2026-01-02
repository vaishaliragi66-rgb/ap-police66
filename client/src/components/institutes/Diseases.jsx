import React, { useEffect, useState } from "react";
import axios from "axios";

const Diseases = () => {
  const [employees, setEmployees] = useState([]);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [instituteName, setInstituteName] = useState("");

  // Predefined disease lists by category
  const communicableDiseases = [
    "Tuberculosis",
    "Malaria",
    "Dengue",
    "COVID-19",
    "Cholera",
    "Typhoid",
    "Hepatitis A",
    "Hepatitis B",
    "Influenza",
    "Chickenpox",
  ];

  const nonCommunicableDiseases = [
    "Diabetes",
    "Hypertension",
    "Asthma",
    "Cancer",
    "Heart Disease",
    "Arthritis",
    "Kidney Disease",
    "Migraine",
    "Obesity",
    "Stroke",
  ];

  const [showOtherDiseaseInput, setShowOtherDiseaseInput] = useState(false);

  const [formData, setFormData] = useState({
    Institute_ID: "",
    Employee_ID: "",
    IsFamilyMember: false,
    FamilyMember_ID: "",
    Disease_Name: "",
    Category: "Communicable",
    Description: "",
    Symptoms: "",
    Common_Medicines: "",
    Severity_Level: "Mild",
    Notes: "",
  });

  const BACKEND_PORT_NO = import.meta.env.VITE_BACKEND_PORT || "6100";

  // Load institute and employees
  useEffect(() => {
    const localInstituteId = localStorage.getItem("instituteId");
    if (localInstituteId) {
      setFormData((prev) => ({ ...prev, Institute_ID: localInstituteId }));
      fetchInstituteName(localInstituteId);
    }
    fetchEmployees();
  }, []);
  const formatDateDMY = (dateValue) => {
  if (!dateValue) return "—";

  const date = new Date(dateValue);
  if (isNaN(date)) return "—";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}-${month}-${year}`; // ✅ DD-MM-YYYY
};
  const fetchInstituteName = async (id) => {
    try {
      const res = await axios.get(
        `http://localhost:${BACKEND_PORT_NO}/institute-api/institution/${id}`
      );
      setInstituteName(res.data?.Institute_Name || "Unknown Institute");
    } catch (err) {
      console.error("Error fetching institute name:", err);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await axios.get(
        `http://localhost:${BACKEND_PORT_NO}/employee-api/employees`
      );
      // Use employee-api/all instead of /employees if needed
      setEmployees(res.data || []);
    } catch (err) {
      console.error("Error fetching employees:", err);
      // Try alternative endpoint
      try {
        const altRes = await axios.get(
          `http://localhost:${BACKEND_PORT_NO}/employee-api/all`
        );
        setEmployees(altRes.data?.employees || []);
      } catch (altErr) {
        console.error("Alternative endpoint also failed:", altErr);
      }
    }
  };

  // Filter employee by ABS_NO
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredEmployees([]);
    } else {
      const filtered = employees.filter((emp) =>
        String(emp.ABS_NO || "")
          .toLowerCase()
          .startsWith(searchTerm.toLowerCase())
      );
      setFilteredEmployees(filtered);
    }
  }, [searchTerm, employees]);

  // Fetch family members when employee changes - FIXED
  useEffect(() => {
    const fetchFamilyMembers = async () => {
      if (!formData.Employee_ID) {
        setFamilyMembers([]);
        return;
      }
      
      try {
        console.log("Fetching family for employee ID:", formData.Employee_ID);
        
        // Try with employee's _id
        const res = await axios.get(
          `http://localhost:${BACKEND_PORT_NO}/family-api/family/${formData.Employee_ID}`
        );
        
        console.log("Family API response:", res.data);
        setFamilyMembers(res.data || []);
        
        // If no response, try alternative approach
        if (!res.data || res.data.length === 0) {
          console.log("No family members found via direct API, trying alternative...");
          // Check if employee data includes family members
          const employeeRes = await axios.get(
            `http://localhost:${BACKEND_PORT_NO}/employee-api/profile/${formData.Employee_ID}`
          );
          
          if (employeeRes.data?.FamilyMembers) {
            // If employee has FamilyMembers field, fetch details for each
            const familyPromises = employeeRes.data.FamilyMembers.map(async (familyId) => {
              try {
                const familyRes = await axios.get(
                  `http://localhost:${BACKEND_PORT_NO}/family-api/member/${familyId}`
                );
                return familyRes.data;
              } catch (err) {
                console.error(`Error fetching family member ${familyId}:`, err);
                return null;
              }
            });
            
            const familyDetails = await Promise.all(familyPromises);
            setFamilyMembers(familyDetails.filter(f => f !== null));
          }
        }
      } catch (err) {
        console.error("Error fetching family members:", err);
        setFamilyMembers([]);
      }
    };
    
    if (formData.Employee_ID) {
      fetchFamilyMembers();
    }
  }, [formData.Employee_ID]);

  const handleEmployeeSelect = (emp) => {
    console.log("Selected employee:", emp);
    setFormData((prev) => ({ ...prev, Employee_ID: emp._id }));
    setSearchTerm(emp.ABS_NO || "");
    setFilteredEmployees([]);
  };

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({ 
      ...prev, 
      [name]: checked,
      // Reset family member ID when checkbox is unchecked
      ...(name === "IsFamilyMember" && !checked ? { FamilyMember_ID: "" } : {})
    }));
  };

  // Handle category change
  const handleCategoryChange = (e) => {
    const selectedCategory = e.target.value;
    setFormData((prev) => ({
      ...prev,
      Category: selectedCategory,
      Disease_Name: "", // reset disease name
    }));
    setShowOtherDiseaseInput(false);
  };

  // Handle disease name selection (includes 'Other' logic)
  const handleDiseaseNameChange = (e) => {
    const selectedDisease = e.target.value;
    if (selectedDisease === "Other") {
      setShowOtherDiseaseInput(true);
      setFormData((prev) => ({ ...prev, Disease_Name: "" }));
    } else {
      setShowOtherDiseaseInput(false);
      setFormData((prev) => ({ ...prev, Disease_Name: selectedDisease }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.Employee_ID) {
      alert("Please select an employee.");
      return;
    }

    const payload = {
      Institute_ID: formData.Institute_ID,
      Employee_ID: formData.Employee_ID,
      IsFamilyMember: formData.IsFamilyMember,
      FamilyMember_ID: formData.FamilyMember_ID || null,
      Disease_Name: formData.Disease_Name,
      Category: formData.Category,
      Description: formData.Description,
      Symptoms: formData.Symptoms.split(",").map((s) => s.trim()).filter(s => s),
      Common_Medicines: formData.Common_Medicines.split(",").map((m) => m.trim()).filter(m => m),
      Severity_Level: formData.Severity_Level,
      Notes: formData.Notes,
    };

    console.log("Submitting payload:", payload);

    try {
      const response = await axios.post(
        `http://localhost:${BACKEND_PORT_NO}/disease-api/diseases`,
        payload
      );
      
      alert("✅ Disease record saved successfully!");
      console.log("Response:", response.data);

      // Reset form
      setFormData({
        Institute_ID: formData.Institute_ID, // Keep institute ID
        Employee_ID: "",
        IsFamilyMember: false,
        FamilyMember_ID: "",
        Disease_Name: "",
        Category: "Communicable",
        Description: "",
        Symptoms: "",
        Common_Medicines: "",
        Severity_Level: "Mild",
        Notes: "",
      });
      setSearchTerm("");
      setFamilyMembers([]);
      setShowOtherDiseaseInput(false);
      setFilteredEmployees([]);
    } catch (err) {
      console.error("Error saving disease:", err.response?.data || err.message);
      alert(`❌ Error saving disease record: ${err.response?.data?.message || err.message}`);
    }
  };

  // Choose list based on category
  const currentDiseaseList =
    formData.Category === "Communicable"
      ? communicableDiseases
      : nonCommunicableDiseases;

  return (
    <div
      style={{
        maxWidth: 600,
        margin: "40px auto",
        padding: 24,
        background: "#fff",
        borderRadius: 8,
        boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
      }}
    >
      <h2 style={{ textAlign: "center", marginBottom: 24 }}>🧬 Disease Entry Form</h2>

      <form onSubmit={handleSubmit} autoComplete="off">
        {/* Institute */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 6, fontWeight: "bold" }}>Institute</label>
          <input
            type="text"
            value={instituteName || "Loading..."}
            readOnly
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: 6,
              border: "1px solid #ccc",
              backgroundColor: "#f5f5f5",
            }}
          />
        </div>

        {/* Employee Search */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 6, fontWeight: "bold" }}>Employee ABS_NO</label>
          <input
            type="text"
            placeholder="Type ABS_NO to search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: 6,
              border: "1px solid #ccc",
            }}
          />
          {searchTerm && filteredEmployees.length > 0 && (
            <div
              style={{
                border: "1px solid #ddd",
                borderTop: "none",
                maxHeight: 150,
                overflowY: "auto",
                backgroundColor: "white",
                borderRadius: "0 0 6px 6px",
              }}
            >
              {filteredEmployees.map((emp) => (
                <div
                  key={emp._id}
                  onClick={() => handleEmployeeSelect(emp)}
                  style={{
                    padding: "8px 12px",
                    cursor: "pointer",
                    borderBottom: "1px solid #eee",
                    transition: "background-color 0.2s",
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = "#f5f5f5"}
                  onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                >
                  <strong>{emp.ABS_NO}</strong> — {emp.Name} {emp.Email ? `(${emp.Email})` : ""}
                </div>
              ))}
            </div>
          )}
          {searchTerm && filteredEmployees.length === 0 && (
            <div style={{ padding: "8px 12px", color: "#666", fontStyle: "italic" }}>
              No employees found
            </div>
          )}
        </div>

        {/* Family Member Checkbox */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
            <input
              type="checkbox"
              name="IsFamilyMember"
              checked={formData.IsFamilyMember}
              onChange={handleCheckboxChange}
              style={{ marginRight: 8 }}
            />
            <span style={{ fontWeight: "bold" }}>Disease for Family Member?</span>
          </label>
        </div>

        {/* Family Member Select */}
        {formData.IsFamilyMember && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 6, fontWeight: "bold" }}>Select Family Member</label>
            <select
              name="FamilyMember_ID"
              value={formData.FamilyMember_ID}
              onChange={handleChange}
              required={formData.IsFamilyMember}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid #ccc",
                backgroundColor: familyMembers.length === 0 ? "#f9f9f9" : "white",
              }}
            >
              <option value="">Select Family Member</option>
              {familyMembers.length === 0 ? (
                <option value="" disabled>No family members found</option>
              ) : (
                familyMembers.map((f) => (
                  <option key={f._id} value={f._id}>
                    {f.Name} ({f.Relationship || "Unknown"})
                  </option>
                ))
              )}
            </select>
            {familyMembers.length === 0 && formData.Employee_ID && (
              <div style={{ fontSize: "12px", color: "#666", marginTop: 4 }}>
                This employee has no registered family members.
              </div>
            )}
          </div>
        )}

        {/* Disease Details */}
        <div style={{ marginTop: 24, marginBottom: 16 }}>
          <h4 style={{ marginBottom: 16 }}>Disease Details</h4>
          
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 6, fontWeight: "bold" }}>Category</label>
            <select
              name="Category"
              value={formData.Category}
              onChange={handleCategoryChange}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid #ccc",
              }}
            >
              <option value="Communicable">Communicable</option>
              <option value="Non-Communicable">Non-Communicable</option>
            </select>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 6, fontWeight: "bold" }}>Disease Name</label>
            <select
              name="Disease_Name"
              value={formData.Disease_Name}
              onChange={handleDiseaseNameChange}
              required
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid #ccc",
              }}
            >
              <option value="">Select Disease</option>
              {currentDiseaseList.map((disease, idx) => (
                <option key={idx} value={disease}>
                  {disease}
                </option>
              ))}
              <option value="Other">Other (specify below)</option>
            </select>
          </div>

          {showOtherDiseaseInput && (
            <div style={{ marginBottom: 16 }}>
              <input
                type="text"
                placeholder="Enter custom disease name"
                value={formData.Disease_Name}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    Disease_Name: e.target.value,
                  }))
                }
                required
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 6,
                  border: "1px solid #ccc",
                }}
              />
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 6, fontWeight: "bold" }}>Description</label>
            <textarea
              name="Description"
              value={formData.Description}
              onChange={handleChange}
              placeholder="Brief description of the disease"
              rows={3}
              required
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid #ccc",
                resize: "vertical",
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 6, fontWeight: "bold" }}>Symptoms (comma-separated)</label>
            <input
              type="text"
              name="Symptoms"
              value={formData.Symptoms}
              onChange={handleChange}
              placeholder="e.g., Fever, Cough, Fatigue"
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid #ccc",
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 6, fontWeight: "bold" }}>Common Medicines (comma-separated)</label>
            <input
              type="text"
              name="Common_Medicines"
              value={formData.Common_Medicines}
              onChange={handleChange}
              placeholder="e.g., Paracetamol, Ibuprofen, Antibiotics"
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid #ccc",
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 6, fontWeight: "bold" }}>Severity Level</label>
            <select
              name="Severity_Level"
              value={formData.Severity_Level}
              onChange={handleChange}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid #ccc",
              }}
            >
              <option value="Mild">Mild</option>
              <option value="Moderate">Moderate</option>
              <option value="Severe">Severe</option>
              <option value="Chronic">Chronic</option>
            </select>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", marginBottom: 6, fontWeight: "bold" }}>Notes</label>
            <textarea
              name="Notes"
              value={formData.Notes}
              onChange={handleChange}
              placeholder="Additional notes (optional)"
              rows={3}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid #ccc",
                resize: "vertical",
              }}
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          style={{
            width: "100%",
            padding: "12px",
            background: "#000",
            color: "white",
            border: "none",
            borderRadius: 8,
            fontWeight: "bold",
            fontSize: "16px",
            cursor: "pointer",
            transition: "background-color 0.2s",
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = "#333"}
          onMouseLeave={(e) => e.target.style.backgroundColor = "#000"}
        >
          ➕ Submit Disease Record
        </button>
      </form>
    </div>
  );
};

export default Diseases;