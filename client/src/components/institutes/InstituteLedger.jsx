import React, { useEffect, useState } from "react";
import axios from "axios";

const InstituteLedger = () => {
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const BACKEND_PORT =
    import.meta.env.VITE_BACKEND_PORT || 6100;

  const instituteId = localStorage.getItem("instituteId");

  useEffect(() => {
    const fetchLedger = async () => {
      try {
        setLoading(true);
        const res = await axios.get(
          `http://localhost:${BACKEND_PORT}/ledger-api/institute/${instituteId}`
        );
        setLedger(res.data.ledger || []);
      } catch (err) {
        console.error(err);
        setError("Failed to fetch ledger data");
      } finally {
        setLoading(false);
      }
    };

    if (instituteId) fetchLedger();
    else {
      setError("Institute not logged in");
      setLoading(false);
    }
  }, [instituteId]);

  if (loading)
    return (
      <div style={{ textAlign: "center", marginTop: 40 }}>
        Loading ledger...
      </div>
    );

  if (error)
    return (
      <div style={{ textAlign: "center", color: "red", marginTop: 40 }}>
        {error}
      </div>
    );

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ textAlign: "center", marginBottom: 20 }}>
        Institute Medicine Ledger
      </h2>

      <div
        style={{
          overflowX: "auto",
          background: "#fff",
          borderRadius: 8,
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 14
          }}
        >
          <thead>
            <tr style={{ background: "#000", color: "#fff" }}>
              <th style={th}>Date & Time</th>
              <th style={th}>Transaction</th>
              <th style={th}>Medicine</th>
              <th style={th}>Manufacturer</th>
              <th style={th}>Expiry</th>
              <th style={th}>IN / OUT</th>
              <th style={th}>Qty</th>
              <th style={th}>Balance</th>
              <th style={th}>Reference</th>
            </tr>
          </thead>

          <tbody>
            {ledger.length === 0 && (
              <tr>
                <td colSpan="9" style={{ textAlign: "center", padding: 20 }}>
                  No ledger entries found
                </td>
              </tr>
            )}

            {ledger.map((row, index) => (
              <tr key={index} style={{ borderBottom: "1px solid #ddd" }}>
                <td style={td}>
                  {new Date(row.Timestamp).toLocaleString()}
                </td>
                <td style={td}>
                  {row.Transaction_Type === "ORDER_DELIVERY"
                    ? "Order Delivery"
                    : "Prescription"}
                </td>
                <td style={td}>{row.Medicine_Name}</td>
                <td style={td}>{row.Manufacturer_Name || "-"}</td>
                <td style={td}>
                  {row.Expiry_Date
                    ? new Date(row.Expiry_Date)
                        .toISOString()
                        .split("T")[0]
                    : "-"}
                </td>
                <td
                  style={{
                    ...td,
                    fontWeight: "bold",
                    color: row.Direction === "IN" ? "green" : "red"
                  }}
                >
                  {row.Direction}
                </td>
                <td style={td}>{row.Quantity}</td>
                <td style={td}>{row.Balance_After}</td>
                <td style={{ ...td, fontSize: 12 }}>
                  {row.Reference_ID
                    ? row.Reference_ID.toString().slice(-6)
                    : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const th = {
  padding: "10px 8px",
  textAlign: "left",
  whiteSpace: "nowrap"
};

const td = {
  padding: "8px",
  whiteSpace: "nowrap"
};

export default InstituteLedger;
