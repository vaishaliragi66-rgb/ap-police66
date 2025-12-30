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
      setEmployees(res.data || []);
    } catch (err) {
      console.error("Error fetching employees:", err);
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

  // Fetch family members when employee changes
  useEffect(() => {
    const fetchFamilyMembers = async () => {
      if (!formData.Employee_ID) return setFamilyMembers([]);
      try {
        const res = await axios.get(
          `http://localhost:${BACKEND_PORT_NO}/family-api/family/${formData.Employee_ID}`
        );
        setFamilyMembers(res.data || []);
      } catch (err) {
        console.error("Error fetching family members:", err);
      }
    };
    fetchFamilyMembers();
  }, [formData.Employee_ID]);

  const handleEmployeeSelect = (emp) => {
    setFormData((prev) => ({ ...prev, Employee_ID: emp._id }));
    setSearchTerm(emp.ABS_NO || "");
    setFilteredEmployees([]);
  };

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
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
      Symptoms: formData.Symptoms.split(",").map((s) => s.trim()),
      Common_Medicines: formData.Common_Medicines.split(",").map((m) =>
        m.trim()
      ),
      Severity_Level: formData.Severity_Level,
      Notes: formData.Notes,
    };

    try {
      await axios.post(
        `http://localhost:${BACKEND_PORT_NO}/disease-api/diseases`,
        payload
      );
      alert("✅ Disease record saved successfully!");

      setFormData({
        ...formData,
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
    } catch (err) {
      console.error("Error saving disease:", err);
      alert("❌ Error saving disease record");
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
      }}
    >
      <h2 style={{ textAlign: "center" }}>🧬 Disease Entry Form</h2>

      <form onSubmit={handleSubmit} autoComplete="off">
        {/* Institute */}
        <label>Institute</label>
        <input
          type="text"
          value={instituteName || "Loading..."}
          readOnly
          style={{
            width: "100%",
            padding: 8,
            borderRadius: 6,
            border: "1px solid #ccc",
            marginBottom: 10,
          }}
        />

        {/* Employee */}
        <label>Employee ABS_NO</label>
        <input
          type="text"
          placeholder="Type ABS_NO..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: "100%",
            padding: 8,
            borderRadius: 6,
            border: "1px solid #ccc",
          }}
        />
        {searchTerm && filteredEmployees.length > 0 && (
          <div
            style={{
              border: "1px solid #ccc",
              maxHeight: 150,
              overflowY: "auto",
              marginTop: 6,
            }}
          >
            {filteredEmployees.map((emp) => (
              <div
                key={emp._id}
                onClick={() => handleEmployeeSelect(emp)}
                style={{
                  padding: "8px 10px",
                  cursor: "pointer",
                  borderBottom: "1px solid #eee",
                }}
              >
                {emp.ABS_NO} — {emp.Name}
              </div>
            ))}
          </div>
        )}

        {/* Family Member Checkbox */}
        <label style={{ marginTop: 12 }}>
          <input
            type="checkbox"
            checked={formData.IsFamilyMember}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                IsFamilyMember: e.target.checked,
              }))
            }
          />{" "}
          Disease for Family Member?
        </label>

        {/* Family Member Select */}
        {formData.IsFamilyMember && (
          <>
            <label style={{ marginTop: 10 }}>Select Family Member</label>
            <select
              name="FamilyMember_ID"
              value={formData.FamilyMember_ID}
              onChange={handleChange}
              style={{
                width: "100%",
                padding: 8,
                borderRadius: 6,
                border: "1px solid #ccc",
              }}
            >
              <option value="">Select Family Member</option>
              {familyMembers.map((f) => (
                <option key={f._id} value={f._id}>
                  {f.Name} ({f.Relationship})
                </option>
              ))}
            </select>
          </>
        )}

        {/* Disease Details */}
        <h4 style={{ marginTop: 20 }}>Disease Details</h4>

        <label>Category</label>
        <select
          name="Category"
          value={formData.Category}
          onChange={handleCategoryChange}
          style={{
            width: "100%",
            padding: 8,
            borderRadius: 6,
            border: "1px solid #ccc",
            marginBottom: 10,
          }}
        >
          <option>Communicable</option>
          <option>Non-Communicable</option>
        </select>

        <label>Disease Name</label>
        <select
          name="Disease_Name"
          value={formData.Disease_Name}
          onChange={handleDiseaseNameChange}
          required
          style={{
            width: "100%",
            padding: 8,
            borderRadius: 6,
            border: "1px solid #ccc",
            marginBottom: 10,
          }}
        >
          <option value="">Select Disease</option>
          {currentDiseaseList.map((disease, idx) => (
            <option key={idx} value={disease}>
              {disease}
            </option>
          ))}
          <option value="Other">Other</option>
        </select>

        {showOtherDiseaseInput && (
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
            style={{
              width: "100%",
              padding: 8,
              borderRadius: 6,
              border: "1px solid #ccc",
              marginBottom: 10,
            }}
          />
        )}

        <label>Description</label>
        <textarea
          name="Description"
          value={formData.Description}
          onChange={handleChange}
          placeholder="Brief description of the disease"
          rows={3}
          style={{
            width: "100%",
            padding: 8,
            borderRadius: 6,
            border: "1px solid #ccc",
            marginBottom: 10,
          }}
        />

        <label>Symptoms (comma-separated)</label>
        <input
          type="text"
          name="Symptoms"
          value={formData.Symptoms}
          onChange={handleChange}
          placeholder="e.g., Fever, Cough, Fatigue"
          style={{
            width: "100%",
            padding: 8,
            borderRadius: 6,
            border: "1px solid #ccc",
            marginBottom: 10,
          }}
        />

        

        <label>Severity Level</label>
        <select
          name="Severity_Level"
          value={formData.Severity_Level}
          onChange={handleChange}
          style={{
            width: "100%",
            padding: 8,
            borderRadius: 6,
            border: "1px solid #ccc",
            marginBottom: 15,
          }}
        >
          <option>Mild</option>
          <option>Moderate</option>
          <option>Severe</option>
          <option>Chronic</option>
        </select>

        <label>Notes</label>
        <textarea
          name="Notes"
          value={formData.Notes}
          onChange={handleChange}
          placeholder="Additional notes (optional)"
          rows={3}
          style={{
            width: "100%",
            padding: 8,
            borderRadius: 6,
            border: "1px solid #ccc",
            marginBottom: 15,
          }}
        />

        {/* Submit Button */}
        <button
          type="submit"
          style={{
            marginTop: 20,
            width: "100%",
            padding: 10,
            background: "black",
            color: "white",
            border: "none",
            borderRadius: 8,
            fontWeight: "bold",
          }}
        >
          ➕ Submit Disease Record
        </button>
      </form>
    </div>
  );
};

export default Diseases;
