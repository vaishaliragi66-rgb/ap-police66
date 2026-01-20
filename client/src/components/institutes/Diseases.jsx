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
        <div className="container-fluid py-4" style={{ background: "#f5f8fe" }}>
          <div className="row justify-content-center">
            <div className="col-lg-8">
      
              {/* CARD */}
              <div
                className="card border-0 shadow-sm"
                style={{ borderRadius: 14 }}
              >
                {/* HEADER */}
                <div
                  className="card-header border-0"
                  style={{
                    background: "#000",
                    color: "#fff",
                    borderRadius: "14px 14px 0 0"
                  }}
                >
                  <h5 className="mb-0 fw-semibold">🧬 Disease Entry</h5>
                  <small className="opacity-75">
                    Record employee & family disease information
                  </small>
                </div>
      
                {/* BODY */}
                <div className="card-body p-4">
      
                  {/* Institute */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Institute</label>
                    <input
                      className="form-control bg-light"
                      value={instituteName || "Loading..."}
                      readOnly
                    />
                  </div>
      
                  {/* Employee Search */}
                  <div className="mb-3 position-relative">
                    <label className="form-label fw-semibold">Employee ABS No</label>
                    <input
                      className="form-control"
                      placeholder="Type ABS No..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
      
                    {searchTerm && filteredEmployees.length > 0 && (
                      <div
                        className="list-group position-absolute w-100 shadow-sm"
                        style={{ zIndex: 10 }}
                      >
                        {filteredEmployees.map(emp => (
                          <button
                            type="button"
                            key={emp._id}
                            className="list-group-item list-group-item-action"
                            onClick={() => handleEmployeeSelect(emp)}
                          >
                            <strong>{emp.ABS_NO}</strong> — {emp.Name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
      
                  {/* Family Member */}
                  <div className="form-check mb-3">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      name="IsFamilyMember"
                      checked={formData.IsFamilyMember}
                      onChange={handleCheckboxChange}
                    />
                    <label className="form-check-label fw-semibold">
                      Disease for Family Member
                    </label>
                  </div>
      
                  {formData.IsFamilyMember && (
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Family Member</label>
                      <select
                        className="form-select"
                        name="FamilyMember_ID"
                        value={formData.FamilyMember_ID}
                        onChange={handleChange}
                      >
                        <option value="">Select Family Member</option>
                        {familyMembers.map(f => (
                          <option key={f._id} value={f._id}>
                            {f.Name} ({f.Relationship})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
      
                  <hr className="my-4" />
      
                  {/* Disease Section */}
                  <h6 className="fw-bold mb-3 text-primary">
                    Disease Details
                  </h6>
      
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Category</label>
                      <select
                        className="form-select"
                        name="Category"
                        value={formData.Category}
                        onChange={handleCategoryChange}
                      >
                        <option value="Communicable">Communicable</option>
                        <option value="Non-Communicable">Non-Communicable</option>
                      </select>
                    </div>
      
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Disease Name</label>
                      <select
                        className="form-select"
                        value={formData.Disease_Name}
                        onChange={handleDiseaseNameChange}
                      >
                        <option value="">Select Disease</option>
                        {currentDiseaseList.map((d, i) => (
                          <option key={i} value={d}>{d}</option>
                        ))}
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
      
                  {showOtherDiseaseInput && (
                    <div className="mt-3">
                      <input
                        className="form-control"
                        placeholder="Enter disease name"
                        value={formData.Disease_Name}
                        onChange={(e) =>
                          setFormData(prev => ({ ...prev, Disease_Name: e.target.value }))
                        }
                      />
                    </div>
                  )}
      
                  <div className="mt-3">
                    <label className="form-label fw-semibold">Description</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      name="Description"
                      value={formData.Description}
                      onChange={handleChange}
                    />
                  </div>
      
                  <div className="row g-3 mt-1">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Symptoms</label>
                      <input
                        className="form-control"
                        name="Symptoms"
                        value={formData.Symptoms}
                        onChange={handleChange}
                        placeholder="Comma separated"
                      />
                    </div>
      
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Common Medicines</label>
                      <input
                        className="form-control"
                        name="Common_Medicines"
                        value={formData.Common_Medicines}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
      
                  <div className="mt-3">
                    <label className="form-label fw-semibold">Severity</label>
                    <select
                      className="form-select"
                      name="Severity_Level"
                      value={formData.Severity_Level}
                      onChange={handleChange}
                    >
                      <option>Mild</option>
                      <option>Moderate</option>
                      <option>Severe</option>
                      <option>Chronic</option>
                    </select>
                  </div>
      
                  <div className="mt-3">
                    <label className="form-label fw-semibold">Notes</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      name="Notes"
                      value={formData.Notes}
                      onChange={handleChange}
                    />
                  </div>
      
                  {/* SUBMIT */}
                  <button
                    type="submit"
                    onClick={handleSubmit}
                    className="btn btn-primary w-100 mt-4"
                    style={{ borderRadius: 10, fontWeight: 600 }}
                  >
                    ➕ Submit Disease Record
                  </button>
      
                </div>
              </div>
            </div>
          </div>
        </div>
      );
      
};

export default Diseases;