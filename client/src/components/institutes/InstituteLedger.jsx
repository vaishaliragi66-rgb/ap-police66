import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

const LedgerStore = () => {
  const BACKEND_PORT = import.meta.env.VITE_BACKEND_PORT || 6100;
  const instituteId = localStorage.getItem("instituteId");

  // Store type state
  const [storeType, setStoreType] = useState("MAIN");

  // Ledger data state
  const [mainStoreLedger, setMainStoreLedger] = useState([]); // Only OUT transactions
  const [subStoreLedger, setSubStoreLedger] = useState([]); // All transactions
  const [prescriptionsData, setPrescriptionsData] = useState([]); // For employee names
  const [allEmployees, setAllEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Employee details modal state (only for Sub Store)
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeDetails, setEmployeeDetails] = useState(null);
  const [loadingEmployee, setLoadingEmployee] = useState(false);

  // Filters
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [medicineFilter, setMedicineFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [fromTime, setFromTime] = useState("");
  const [toTime, setToTime] = useState("");
  const [expiryDateFilter, setExpiryDateFilter] = useState(""); // New expiry date filter
  const [directionFilter, setDirectionFilter] = useState("ALL"); // Only for Sub Store

  const formatDateDMY = (dateValue) => {
    if (!dateValue) return "—";
    const date = new Date(dateValue);
    if (isNaN(date)) return "—";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const formatDateTime = (dateValue) => {
    if (!dateValue) return "—";
    const date = new Date(dateValue);
    if (isNaN(date)) return "—";
    return date.toLocaleString('en-IN');
  };

  const formatTime = (dateValue) => {
    if (!dateValue) return "—";
    const date = new Date(dateValue);
    if (isNaN(date)) return "—";
    return date.toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const formatDateForDisplay = (dateValue) => {
    if (!dateValue) return "—";
    const date = new Date(dateValue);
    if (isNaN(date)) return "—";
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Calculate days until expiry
  const calculateDaysUntilExpiry = (expiryDate) => {
    if (!expiryDate) return null;
    const today = new Date();
    const expiry = new Date(expiryDate);
    today.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleRowsChange = (e) => {
    setRowsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  // Fetch all data
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        // For Main Store: Fetch only OUT transactions (to Sub Store)
        // For Sub Store: Fetch ALL transactions (IN from Main Store + OUT to patients)
        const [mainRes, subRes, presRes] = await Promise.all([
          axios.get(
            `http://localhost:${BACKEND_PORT}/ledger-api/institute/${instituteId}?type=STORE_TRANSFER`
          ),

          axios.get(
            `http://localhost:${BACKEND_PORT}/ledger-api/institute/${instituteId}`
          ),

          axios.get(`http://localhost:${BACKEND_PORT}/prescription-api/institute/${instituteId}`)
        ]);

        setMainStoreLedger(mainRes.data.ledger || []);
        setSubStoreLedger(subRes.data.ledger || []);
        setPrescriptionsData(presRes.data || []);
        
        // Try to fetch all employees
        try {
          const employeesRes = await axios.get(`http://localhost:${BACKEND_PORT}/employee-api/all`);
          if (employeesRes.data && employeesRes.data.employees) {
            setAllEmployees(employeesRes.data.employees);
          }
        } catch (employeeError) {
          console.log("Could not fetch all employees:", employeeError.message);
          setAllEmployees([]);
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
      }
    };

    fetchAllData();
  }, [instituteId]);

  // Function to get employee info from prescription reference ID (only for Sub Store)
// Replace the getEmployeeInfoFromRef useMemo function with this:
const getEmployeeInfoFromRef = useMemo(() => {
  if (storeType === "MAIN") {
    return () => ({ name: "Patient", employeeId: null });
  }
  
  const lookupMap = {};
  
  prescriptionsData.forEach((prescription) => {
    if (!prescription._id) return;
    
    const fullId = prescription._id;
    const shortId = fullId.slice(-6);
    
    let employeeName = "Unknown";
    let employeeId = null;
    let employeeABS = "-";
    
    if (prescription.Employee) {
      employeeName = prescription.Employee.Name || "Unknown";
      employeeId = prescription.Employee._id || null;
      employeeABS = prescription.Employee.ABS_NO || "-";
    }
    
    // FIXED: Handle family member display without duplication
    let issuedTo = employeeName;
    let isFamilyMember = prescription.IsFamilyMember || false;
    let familyMemberName = prescription.FamilyMember?.Name || "";
    let familyMemberRelationship = prescription.FamilyMember?.Relationship || "";
    
    if (isFamilyMember && familyMemberName && familyMemberRelationship) {
      // Fixed: Don't include employee name in the display for family members
      // Just show "Family Member Name (Relationship)"
      issuedTo = `${familyMemberName} (${familyMemberRelationship})`;
    }
    
    lookupMap[fullId] = {
      name: issuedTo,
      employeeId: employeeId,
      employeeABS: employeeABS,
      employeeName: employeeName, // Original employee name (for reference)
      isFamilyMember: isFamilyMember,
      familyMemberName: familyMemberName,
      familyMemberRelationship: familyMemberRelationship
    };
    
    lookupMap[shortId] = lookupMap[fullId];
  });
  
  return (referenceId) => {
    if (!referenceId) {
      return { name: "Patient", employeeId: null };
    }
    
    const cleanRef = referenceId.toString().trim();
    
    if (lookupMap[cleanRef]) {
      return lookupMap[cleanRef];
    }
    
    // Try with last 6 characters
    const shortRef = cleanRef.slice(-6);
    if (lookupMap[shortRef]) {
      return lookupMap[shortRef];
    }
    
    // Try partial match
    for (const [id, data] of Object.entries(lookupMap)) {
      if (id.includes(cleanRef) || cleanRef.includes(id.slice(-6))) {
        return data;
      }
    }
    
    return { name: "Patient", employeeId: null };
  };
}, [prescriptionsData, storeType]);

  // Function to fetch employee details (only for Sub Store)
  const fetchEmployeeDetails = async (employeeId, employeeABS) => {
    setLoadingEmployee(true);
    
    try {
      let foundEmployee = allEmployees.find(emp => 
        emp._id === employeeId || emp.ABS_NO === employeeABS
      );
      
      if (foundEmployee) {
        try {
          const response = await axios.get(`http://localhost:${BACKEND_PORT}/employee-api/profile/${employeeId}`);
          if (response.data) {
            setEmployeeDetails(response.data);
          } else {
            setEmployeeDetails(foundEmployee);
          }
        } catch (profileError) {
          console.log("Profile endpoint failed, using basic info:", profileError.message);
          setEmployeeDetails(foundEmployee);
        }
      } else {
        try {
          const response = await axios.get(`http://localhost:${BACKEND_PORT}/employee-api/profile/${employeeId}`);
          if (response.data) {
            setEmployeeDetails(response.data);
          } else {
            let prescriptionEmployee = null;
            for (const prescription of prescriptionsData) {
              if (prescription.Employee) {
                if (employeeId && prescription.Employee._id === employeeId) {
                  prescriptionEmployee = prescription.Employee;
                  break;
                } else if (employeeABS && prescription.Employee.ABS_NO === employeeABS) {
                  prescriptionEmployee = prescription.Employee;
                  break;
                }
              }
            }
            setEmployeeDetails(prescriptionEmployee);
          }
        } catch (profileError) {
          console.log("Profile endpoint failed:", profileError.message);
          let prescriptionEmployee = null;
          for (const prescription of prescriptionsData) {
            if (prescription.Employee) {
              if (employeeId && prescription.Employee._id === employeeId) {
                prescriptionEmployee = prescription.Employee;
                break;
              } else if (employeeABS && prescription.Employee.ABS_NO === employeeABS) {
                prescriptionEmployee = prescription.Employee;
                break;
              }
            }
          }
          setEmployeeDetails(prescriptionEmployee);
        }
      }
    } catch (error) {
      console.error("Error in fetchEmployeeDetails:", error);
      setEmployeeDetails(null);
    } finally {
      setLoadingEmployee(false);
    }
  };

  // Handle click on employee name (only for Sub Store)
  const handleEmployeeNameClick = (employeeInfo) => {
    if (employeeInfo.employeeId || employeeInfo.employeeABS) {
      setSelectedEmployee(employeeInfo);
      fetchEmployeeDetails(employeeInfo.employeeId, employeeInfo.employeeABS);
      setShowEmployeeModal(true);
    }
  };

  // Get current store ledger based on selection
  const currentStoreLedger = storeType === "MAIN" ? mainStoreLedger : subStoreLedger;

  // Filtered data - different logic for Main vs Sub Store
  const filteredLedger = useMemo(() => {
    return currentStoreLedger.filter((l) => {
      const txDate = new Date(l.Timestamp);

      if (storeType === "MAIN") {
        // Main Store only shows ORDER_DELIVERY
        if (l.Transaction_Type !== "STORE_TRANSFER") return false;
      } else if (typeFilter !== "ALL" && l.Transaction_Type !== typeFilter) {
        // Sub Store uses normal filtering
        return false;
      }

      // Direction filter only for Sub Store
      if (storeType === "SUB" && directionFilter !== "ALL" && l.Direction !== directionFilter)
        return false;

      if (
        medicineFilter &&
        !l.Medicine_Name.toLowerCase().includes(medicineFilter.toLowerCase())
      )
        return false;

      // Date filter (combined date and time)
      if (fromDate || toDate || fromTime || toTime) {
        const txDateTime = new Date(l.Timestamp);
        
        if (fromDate) {
          const from = new Date(fromDate);
          from.setHours(0, 0, 0, 0);
          if (fromTime) {
            const [hours, minutes] = fromTime.split(':').map(Number);
            from.setHours(hours || 0, minutes || 0, 0, 0);
          }
          if (txDateTime < from) return false;
        }
        
        if (toDate) {
          const to = new Date(toDate);
          to.setHours(23, 59, 59, 999);
          if (toTime) {
            const [hours, minutes] = toTime.split(':').map(Number);
            to.setHours(hours || 23, minutes || 59, 59, 999);
          }
          if (txDateTime > to) return false;
        }
      }

      // Expiry date filter - Show medicines expiring ON OR BEFORE the selected date
      if (expiryDateFilter && l.Expiry_Date) {
        const expiry = new Date(l.Expiry_Date);
        expiry.setHours(0, 0, 0, 0); // Set to start of day for comparison
        const filterDate = new Date(expiryDateFilter);
        filterDate.setHours(23, 59, 59, 999); // Set to end of day
        
        // Show medicines that expire ON OR BEFORE the filter date
        if (expiry > filterDate) return false;
      }

      return true;
    });
  }, [currentStoreLedger, storeType, typeFilter, directionFilter, medicineFilter, fromDate, toDate, fromTime, toTime, expiryDateFilter]);

  // Sort filtered ledger by expiry date (ascending - soonest to expire first)
  const sortedLedger = useMemo(() => {
    return [...filteredLedger].sort((a, b) => {
      // First priority: Sort by expiry date (soonest first)
      const aExpiry = a.Expiry_Date ? new Date(a.Expiry_Date) : null;
      const bExpiry = b.Expiry_Date ? new Date(b.Expiry_Date) : null;
      
      if (aExpiry && bExpiry) {
        if (aExpiry.getTime() !== bExpiry.getTime()) {
          return aExpiry - bExpiry; // Soonest first
        }
      } else if (aExpiry && !bExpiry) {
        return -1; // Items with expiry date first
      } else if (!aExpiry && bExpiry) {
        return 1; // Items without expiry date last
      }
      
      // Second priority: Sort by transaction date (newest first)
      const aDate = new Date(a.Timestamp);
      const bDate = new Date(b.Timestamp);
      return bDate - aDate; // Newest first
    });
  }, [filteredLedger]);

  // Calculate stock summary - different for Main vs Sub Store
  const stockSummary = useMemo(() => {
    const summary = {};
    
    currentStoreLedger.forEach((item) => {
      const medicineName = item.Medicine_Name;
      if (!summary[medicineName]) {
        summary[medicineName] = {
          totalIN: 0,
          totalOUT: 0,
          receivedFromMainStore: 0,    // New
          soldToEmployees: 0,          // New
          otherOut: 0,                 // New
          lastTransaction: item.Timestamp,
          totalTransactions: 0,
          expiryDate: item.Expiry_Date,
          daysUntilExpiry: calculateDaysUntilExpiry(item.Expiry_Date)
        };
      }
      
      if (storeType === "MAIN") {
        // Main Store only has OUT transactions
        summary[medicineName].totalOUT += Math.abs(item.Quantity);
      } else {
        // Sub Store has both IN and OUT
        if (item.Direction === "IN") {
          summary[medicineName].totalIN += Math.abs(item.Quantity);
          summary[medicineName].receivedFromMainStore += Math.abs(item.Quantity);
        } else if (item.Direction === "OUT") {
          summary[medicineName].totalOUT += Math.abs(item.Quantity);
          
          // Check if it's sold to employee (PRESCRIPTION_ISSUE)
          if (item.Transaction_Type === "PRESCRIPTION_ISSUE") {
            summary[medicineName].soldToEmployees += Math.abs(item.Quantity);
          } else {
            summary[medicineName].otherOut += Math.abs(item.Quantity);
          }
        }
      }
      
      summary[medicineName].totalTransactions += 1;
      
      if (new Date(item.Timestamp) > new Date(summary[medicineName].lastTransaction)) {
        summary[medicineName].lastTransaction = item.Timestamp;
      }
    });
    
    return summary;
  }, [currentStoreLedger, storeType]);

  // Pagination calculations
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentLedger = sortedLedger.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(sortedLedger.length / rowsPerPage);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter, directionFilter, medicineFilter, fromDate, toDate, fromTime, toTime, expiryDateFilter, storeType]);

  // Export functions
  const handlePrint = () => window.print();

const downloadCSV = () => {
  if (storeType === "MAIN") {
    // Main Store CSV - Removed Reference ID
    const headers = [
      "Date & Time",
      "Transaction Type",
      "Medicine",
      "Expiry Date",
      "Days Until Expiry",
      "Quantity OUT",
      "Balance After",
      "Destination",  // Removed Reference ID
      "Remarks"
    ];

    const rows = sortedLedger.map((l) => [
      formatDateTime(l.Timestamp),
      l.Transaction_Type,
      l.Medicine_Name,
      l.Expiry_Date ? formatDateDMY(new Date(l.Expiry_Date)) : "-",
      l.Expiry_Date ? calculateDaysUntilExpiry(l.Expiry_Date) : "-",
      Math.abs(l.Quantity),
      Math.abs(l.Balance_After),
      "Sub Store",  // Removed Reference ID
      l.Remarks || "-"
    ]);

    const csv = [headers, ...rows]
      .map((r) => r.map((x) => `"${x ?? ""}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `MAIN_Store_Transfer_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  } else {
    // Sub Store CSV - Removed Reference ID
    const headers = [
      "Date & Time",
      "Transaction Type",
      "Direction",
      "Medicine",
      "Expiry Date",
      "Days Until Expiry",
      "Quantity",
      "Balance After",
      "Issued To",  // Removed Reference ID
      "Remarks"
    ];

    const rows = sortedLedger.map((l) => [
      formatDateTime(l.Timestamp),
      l.Transaction_Type,
      l.Direction,
      l.Medicine_Name,
      l.Expiry_Date ? formatDateDMY(new Date(l.Expiry_Date)) : "-",
      l.Expiry_Date ? calculateDaysUntilExpiry(l.Expiry_Date) : "-",
      Math.abs(l.Quantity),
      Math.abs(l.Balance_After),
      l.Direction === "IN" ? "From Main Store" : getEmployeeInfoFromRef(l.Reference_ID).name,  // Removed Reference ID
      l.Remarks || "-"
    ]);

    const csv = [headers, ...rows]
      .map((r) => r.map((x) => `"${x ?? ""}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `SUB_Store_Ledger_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }
};

  if (loading) {
    return (
      <div className="text-center mt-5">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <strong className="ms-2">Loading ledger data...</strong>
      </div>
    );
  }

  return (
    <div className="container mt-4 ledger-page">
      {/* Store Type Selection */}
      <div className="card shadow mb-4">
        <div className="card-body text-center">
          <h5 className="mb-3">Store Management</h5>
          <div className="d-flex justify-content-center gap-3 mb-3">
            <button
              className={`btn ${storeType === "MAIN" ? "btn-dark" : "btn-outline-dark"} btn-lg`}
              onClick={() => setStoreType("MAIN")}
            >
              📦 Main Store
            </button>
            <button
              className={`btn ${storeType === "SUB" ? "btn-dark" : "btn-outline-dark"} btn-lg`}
              onClick={() => setStoreType("SUB")}
            >
              🏪 Sub Store
            </button>
          </div>
          <div className="text-center">
            <h6 className="mb-2">
              Currently viewing: <strong className="text-primary">{storeType} STORE</strong>
            </h6>
            <div className="d-flex justify-content-center gap-2">
              <span className="badge bg-info">
                Total Medicines: {Object.keys(stockSummary).length}
              </span>
              {storeType === "MAIN" ? (
                <span className="badge bg-danger">
                  Total OUT Transactions: {currentStoreLedger.length}
                </span>
              ) : (
                <>
                  <span className="badge bg-success">
                    Total IN Transactions: {currentStoreLedger.filter(l => l.Direction === "IN").length}
                  </span>
                  <span className="badge bg-danger">
                    Total OUT Transactions: {currentStoreLedger.filter(l => l.Direction === "OUT").length}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stock Summary Card - Different for Main vs Sub */}
      <div className="card shadow mb-4">
        <div className="card-header bg-info text-white">
          <h6 className="mb-0">
            {storeType === "MAIN" 
              ? "📊 Main Store Store Transfer Summary" 
              : "📊 Sub Store Stock Summary"}
          </h6>
        </div>
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-sm table-bordered">
              <thead>
                <tr>
                  <th>Medicine</th>
                  {storeType === "MAIN" ? (
                    <>
                      <th>Total OUT Quantity</th>
                      <th>Total Transactions</th>
                      <th>Expiry Date</th>
                      <th>Days Left</th>
                      <th>Last Transaction</th>
                      <th>Status</th>
                    </>
                  ) : (
                    <>
                      <th>Received from Main Store</th>
                      <th>Sold to Employees</th>
                      <th>Other OUT</th>
                      <th>Net Quantity</th>
                      <th>Expiry Date</th>
                      <th>Days Left</th>
                      <th>Status</th>
                      <th>Last Transaction</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {Object.entries(stockSummary).map(([medicine, data]) => {
                  if (storeType === "MAIN") {
                    const daysLeft = calculateDaysUntilExpiry(data.expiryDate);
                    return (
                      <tr key={medicine}>
                        <td><strong>{medicine}</strong></td>
                        <td>
                          <span className="badge bg-danger">
                            {data.totalOUT} units
                          </span>
                        </td>
                        <td>
                          <span className="badge bg-secondary">
                            {data.totalTransactions}
                          </span>
                        </td>
                        <td>
                          {data.expiryDate ? (
                            <span className={`badge ${
                              daysLeft < 0 ? 'bg-danger' :
                              daysLeft <= 30 ? 'bg-warning' :
                              'bg-success'
                            }`}>
                              {formatDateDMY(data.expiryDate)}
                            </span>
                          ) : "-"}
                        </td>
                        <td>
                          {data.expiryDate && daysLeft !== null ? (
                            <span className={`badge ${
                              daysLeft < 0 ? 'bg-danger' :
                              daysLeft <= 7 ? 'bg-warning' :
                              'bg-success'
                            }`}>
                              {daysLeft < 0 ? `${Math.abs(daysLeft)} days expired` : `${daysLeft} days left`}
                            </span>
                          ) : "-"}
                        </td>
                        <td>{formatDateTime(data.lastTransaction)}</td>
                        <td>
                          📤 Transferred to Sub Store
                        </td>
                      </tr>
                    );
                  } else {
                    const netQty = data.totalIN - data.totalOUT;
                    const daysLeft = calculateDaysUntilExpiry(data.expiryDate);
                    return (
                      <tr key={medicine}>
                        <td><strong>{medicine}</strong></td>
                        <td>
                          <span className="badge bg-success">
                            {data.receivedFromMainStore} units
                          </span>
                        </td>
                        <td>
                          <span className="badge bg-danger">
                            {data.soldToEmployees} units
                            {data.soldToEmployees > 0 && (
                              <small className="ms-1">
                                ({Math.round((data.soldToEmployees / data.receivedFromMainStore) * 100)}%)
                              </small>
                            )}
                          </span>
                        </td>
                        <td>
                          <span className="badge bg-warning">
                            {data.otherOut} units
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${netQty >= 0 ? 'bg-primary' : 'bg-warning'}`}>
                            {netQty} units
                          </span>
                        </td>
                        <td>
                          {data.expiryDate ? (
                            <span className={`badge ${
                              daysLeft < 0 ? 'bg-danger' :
                              daysLeft <= 30 ? 'bg-warning' :
                              'bg-success'
                            }`}>
                              {formatDateDMY(data.expiryDate)}
                            </span>
                          ) : "-"}
                        </td>
                        <td>
                          {data.expiryDate && daysLeft !== null ? (
                            <span className={`badge ${
                              daysLeft < 0 ? 'bg-danger' :
                              daysLeft <= 7 ? 'bg-warning' :
                              'bg-success'
                            }`}>
                              {daysLeft < 0 ? `${Math.abs(daysLeft)} days expired` : `${daysLeft} days left`}
                            </span>
                          ) : "-"}
                        </td>
                        <td>
                          {netQty > 0 
                            ? `📦 In Stock (${Math.round((netQty / data.receivedFromMainStore) * 100)}% remaining)` 
                            : "⚠️ Stock Out"}
                        </td>
                        <td>{formatDateTime(data.lastTransaction)}</td>
                      </tr>
                    );
                  }
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Ledger Card */}
      <div className="card shadow">
        <div className="card-header bg-dark text-white d-flex justify-content-between align-items-center">
          <div>
            <h5 className="mb-0">
              {storeType === "MAIN" 
                ? "📋 Main Store Store Transfer Ledger" 
                : "📋 Sub Store Ledger"}
            </h5>
            <small className="text-light">
              Institute ID: {instituteId} | 
              Showing {sortedLedger.length} of {currentStoreLedger.length} transactions
              {expiryDateFilter && ` | Expiring by: ${formatDateDMY(expiryDateFilter)}`}
            </small>
          </div>
          <div>
            <button className="btn btn-light btn-sm me-2" onClick={handlePrint}>
              🖨 Print
            </button>
            <button className="btn btn-light btn-sm" onClick={downloadCSV}>
              ⬇ Export CSV
            </button>
          </div>
        </div>

        <div className="card-body">
          {/* FILTERS - Different for Main vs Sub */}
          <div className="row g-2 mb-3 align-items-end">
            <div className="col-md-2">
              <label className="form-label mb-1">Transaction Type</label>
              <select
                className="form-select"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="ALL">All Transactions</option>
                {storeType === "MAIN" ? (
                  <option value="STORE_TRANSFER">Store Transfer</option>
                ) : (
                  <>
                    <option value="STORE_TRANSFER">Store Transfer</option>
                    <option value="PRESCRIPTION_ISSUE">Prescription Issue</option>
                    <option value="STORE_TRANSFER">Store Transfer</option>
                    <option value="PRESCRIPTION_ISSUE">Prescription Issue</option>
                  </>
                )}
              </select>
            </div>

            {storeType === "SUB" && (
              <div className="col-md-2">
                <label className="form-label mb-1">Direction</label>
                <select
                  className="form-select"
                  value={directionFilter}
                  onChange={(e) => setDirectionFilter(e.target.value)}
                >
                  <option value="ALL">All (IN/OUT)</option>
                  <option value="IN">IN Only</option>
                  <option value="OUT">OUT Only</option>
                </select>
              </div>
            )}

            <div className="col-md-2">
              <label className="form-label mb-1">Medicine Name</label>
              <input
                className="form-control"
                placeholder="Search medicine"
                value={medicineFilter}
                onChange={(e) => setMedicineFilter(e.target.value)}
              />
            </div>

            <div className="col-md-3">
              <label className="form-label mb-1">Expiry By Date</label>
              <div className="input-group">
                <input
                  type="date"
                  className="form-control"
                  value={expiryDateFilter}
                  onChange={(e) => setExpiryDateFilter(e.target.value)}
                  title="Show medicines expiring ON OR BEFORE this date"
                />
                {expiryDateFilter && (
                  <button
                    className="btn btn-outline-secondary"
                    type="button"
                    onClick={() => setExpiryDateFilter("")}
                    title="Clear expiry filter"
                  >
                    ✕
                  </button>
                )}
              </div>
              <small className="text-muted">Shows medicines expiring by this date</small>
            </div>
          </div>

          {/* Date and Time Filters */}
          <div className="row g-2 mb-3 align-items-end">
            <div className="col-md-3">
              <label className="form-label mb-1">From Date</label>
              <input
                type="date"
                className="form-control"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>

            <div className="col-md-2">
              <label className="form-label mb-1">From Time</label>
              <input
                type="time"
                className="form-control"
                value={fromTime}
                onChange={(e) => setFromTime(e.target.value)}
              />
            </div>

            <div className="col-md-3">
              <label className="form-label mb-1">To Date</label>
              <input
                type="date"
                className="form-control"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>

            <div className="col-md-2">
              <label className="form-label mb-1">To Time</label>
              <input
                type="time"
                className="form-control"
                value={toTime}
                onChange={(e) => setToTime(e.target.value)}
              />
            </div>

            <div className="col-md-2">
              <label className="form-label mb-1">&nbsp;</label>
              <button 
                className="btn btn-outline-secondary btn-sm w-100"
                onClick={() => {
                  setTypeFilter("ALL");
                  setDirectionFilter("ALL");
                  setMedicineFilter("");
                  setFromDate("");
                  setToDate("");
                  setFromTime("");
                  setToTime("");
                  setExpiryDateFilter("");
                }}
              >
                🔄 Clear All
              </button>
            </div>
          </div>

          {/* Rows per page selector */}
          <div className="d-flex justify-content-between mb-3">
            <div className="d-flex align-items-center gap-2">
              <span className="fw-semibold text-muted">Rows per page:</span>
              <select
                className="form-select form-select-sm"
                style={{ width: "80px" }}
                value={rowsPerPage}
                onChange={handleRowsChange}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
            <div className="d-flex align-items-center gap-2">
              <span className="fw-semibold text-muted">
                Page {currentPage} of {totalPages || 1}
              </span>
            </div>
          </div>

          {/* TABLE - Different columns for Main vs Sub Store */}
          {/* TABLE - Different columns for Main vs Sub Store */}
<div className="table-responsive">
  <table className="table table-bordered table-hover align-middle">
    <thead className="table-dark">
      <tr>
        <th>S.No</th>
        <th>Date & Time</th>
        <th>Transaction Type</th>
        {storeType === "SUB" && <th>Direction</th>}
        <th>Medicine</th>
        <th>Expiry Date</th>
        <th>Days Left</th>
        <th>Quantity</th>
        <th>Balance After</th>
        <th>
          {storeType === "MAIN" 
            ? "Destination" 
            : storeType === "SUB" ? "Issued To" : ""}
        </th>
        <th>Remarks</th> {/* Removed Reference ID column */}
      </tr>
    </thead>
    <tbody>
      {sortedLedger.length === 0 ? (
        <tr>
          <td colSpan={storeType === "MAIN" ? "11" : "12"} className="text-center py-4">
            {/* Updated colspan */}
            <div className="text-muted">
              {storeType === "MAIN" 
                ? "📭 No STORE_TRANSFER transactions found for Main Store" 
                : "📭 No transactions found for Sub Store"}
              {(medicineFilter || fromDate || toDate || expiryDateFilter) ? " with current filters" : ""}
            </div>
          </td>
        </tr>
      ) : (
        currentLedger.map((l, i) => {
          // For Sub Store OUT transactions, get employee info
          let employeeInfo = { name: "Patient", employeeId: null };
          let isClickable = false;
          
          if (storeType === "SUB" && l.Direction === "OUT") {
            employeeInfo = getEmployeeInfoFromRef(l.Reference_ID);
            isClickable = employeeInfo.employeeId || employeeInfo.employeeABS;
          }
          
          const daysLeft = calculateDaysUntilExpiry(l.Expiry_Date);
          const isExpired = daysLeft !== null && daysLeft < 0;
          const isNearExpiry = daysLeft !== null && daysLeft <= 30 && daysLeft >= 0;
          
          return (
            <tr key={i}>
              <td>{indexOfFirstRow + i + 1}</td>
              <td>
                <div>{formatDateTime(l.Timestamp)}</div>
                <small className="text-muted">{formatTime(l.Timestamp)}</small>
              </td>
              <td>
                <span className={`badge ${
                  l.Transaction_Type === 'STORE_TRANSFER' ? 'bg-warning' :
                  l.Transaction_Type === 'PRESCRIPTION_ISSUE' ? 'bg-danger' :
                  'bg-info'
                }`}>
                  {l.Transaction_Type}
                </span>
              </td>
              
              {storeType === "SUB" && (
                <td>
                  <span className={`badge ${
                    l.Direction === 'IN' ? 'bg-success' : 'bg-danger'
                  }`}>
                    {l.Direction}
                  </span>
                </td>
              )}
              
              <td><strong>{l.Medicine_Name}</strong></td>
              <td>
                {l.Expiry_Date ? (
                  <div>
                    <span className={`badge ${
                      isExpired ? 'bg-danger' :
                      isNearExpiry ? 'bg-warning' : 'bg-success'
                    }`}>
                      {formatDateDMY(l.Expiry_Date)}
                    </span>
                  </div>
                ) : "—"}
              </td>
              <td>
                {l.Expiry_Date && daysLeft !== null ? (
                  <span className={`badge ${
                    isExpired ? 'bg-danger' :
                    isNearExpiry ? 'bg-warning' : 'bg-success'
                  }`}>
                    {isExpired 
                      ? `Expired ${Math.abs(daysLeft)} days ago`
                      : `${daysLeft} days left`}
                  </span>
                ) : "—"}
              </td>
              <td>
                <span className={`badge ${
                  l.Direction === 'OUT' || storeType === 'MAIN' ? 'bg-danger' : 'bg-success'
                }`}>
                  {Math.abs(l.Quantity)} units
                </span>
              </td>
              <td>
                <span className={`badge ${
                  l.Balance_After >= 0 ? 'bg-primary' : 'bg-warning'
                }`}>
                  {Math.abs(l.Balance_After)} units
                </span>
              </td>
              <td>
                {storeType === "MAIN" ? (
                  <span className="badge bg-info">
                    {l.Destination || "Sub Store"}
                  </span>
                ) : storeType === "SUB" && l.Direction === "IN" ? (
                  <span className="badge bg-success">
                    From Main Store
                  </span>
                ) : (
                  <span
                    className={`badge ${isClickable ? 'bg-primary clickable' : 'bg-secondary'}`}
                    onClick={() => isClickable && handleEmployeeNameClick(employeeInfo)}
                    style={{ cursor: isClickable ? 'pointer' : 'default' }}
                    title={isClickable ? "Click to view employee details" : ""}
                  >
                    {employeeInfo.name}
                    {employeeInfo.isFamilyMember && ` (${employeeInfo.familyMemberRelationship})`}
                  </span>
                )}
              </td>
              {/* Removed Reference ID cell */}
              <td>
                <small className="text-muted">{l.Remarks || "—"}</small>
              </td>
            </tr>
          );
        })
      )}
    </tbody>
  </table>
</div>
          {/* Pagination */}
          <div className="d-flex justify-content-center align-items-center gap-2 py-4">
            <button
              className="btn btn-outline-dark btn-sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => prev - 1)}
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
              onClick={() => setCurrentPage((prev) => prev + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Employee Details Modal (only for Sub Store) */}
      {storeType === "SUB" && (
        <div className={`modal fade ${showEmployeeModal ? 'show' : ''}`} style={{ display: showEmployeeModal ? 'block' : 'none' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">👨‍⚕️ Employee Details</h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowEmployeeModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                {loadingEmployee ? (
                  <div className="text-center py-4">
                    <div className="spinner-border" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-2">Loading employee details...</p>
                  </div>
                ) : employeeDetails ? (
                  <div>
                    <div className="row mb-4">
                      <div className="col-md-4 text-center">
                        {employeeDetails.Photo ? (
                          <img
                            src={`http://localhost:${BACKEND_PORT}${employeeDetails.Photo}`}
                            alt={employeeDetails.Name}
                            className="img-thumbnail rounded-circle"
                            style={{ width: '120px', height: '120px', objectFit: 'cover' }}
                          />
                        ) : (
                          <div className="bg-secondary rounded-circle d-flex align-items-center justify-content-center mx-auto"
                            style={{ width: '120px', height: '120px' }}>
                            <span className="text-white fs-1">👨‍⚕️</span>
                          </div>
                        )}
                      </div>
                      <div className="col-md-8">
                        <h4>{employeeDetails.Name || "Unknown"}</h4>
                        <div className="row mt-3">
                          <div className="col-6">
                            <p><strong>ABS No:</strong> {employeeDetails.ABS_NO || "-"}</p>
                          </div>
                          <div className="col-6">
                            <p><strong>Designation:</strong> {employeeDetails.Designation || "-"}</p>
                          </div>
                          <div className="col-6">
                            <p><strong>Email:</strong> {employeeDetails.Email || "-"}</p>
                          </div>
                          <div className="col-6">
                            <p><strong>Phone:</strong> {employeeDetails.Phone_No || "-"}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {selectedEmployee?.isFamilyMember && (
                      <div className="alert alert-info">
                        <h6>👨‍👩‍👧‍👦 Family Member Information</h6>
                        <p><strong>Name:</strong> {selectedEmployee.familyMemberName}</p>
                        <p><strong>Relationship:</strong> {selectedEmployee.familyMemberRelationship}</p>
                        <p><strong>Primary Employee:</strong> {selectedEmployee.employeeName}</p>
                      </div>
                    )}
                    
                    <div className="card">
                      <div className="card-header">
                        <h6 className="mb-0">Additional Information</h6>
                      </div>
                      <div className="card-body">
                        <div className="row">
                          <div className="col-md-6">
                            <p><strong>Date of Birth:</strong> {employeeDetails.DOB ? formatDateForDisplay(employeeDetails.DOB) : "-"}</p>
                            <p><strong>Blood Group:</strong> {employeeDetails.Blood_Group || "-"}</p>
                          </div>
                          <div className="col-md-6">
                            <p><strong>Height:</strong> {employeeDetails.Height || "-"}</p>
                            <p><strong>Weight:</strong> {employeeDetails.Weight || "-"}</p>
                          </div>
                        </div>
                        {employeeDetails.Address && (
                          <div className="mt-3">
                            <h6>Address</h6>
                            <p className="mb-1">
                              {[employeeDetails.Address.Street, employeeDetails.Address.District, employeeDetails.Address.State]
                                .filter(Boolean).join(", ")}
                            </p>
                            <p className="mb-0"><strong>Pincode:</strong> {employeeDetails.Address.Pincode || "-"}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <div className="alert alert-warning">
                      <h5>⚠️ No Details Available</h5>
                      <p className="mb-0">Employee details could not be retrieved.</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowEmployeeModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LedgerStore;