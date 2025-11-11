import { Link, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { FaChartBar } from "react-icons/fa";

function Home_manu() {
  const [topInstitutes, setTopInstitutes] = useState([]);
  const [topMedicines, setTopMedicines] = useState([]);
  const [manufacturer, setManufacturer] = useState(null);

  useEffect(() => {
    const manu =
      JSON.parse(localStorage.getItem("manufacturer")) || {
        _id: "690ee6a90a843eb7fd79ae95",
        Manufacturer_Name: "srihasa",
      };
    setManufacturer(manu);

    // Simulated orders data
    const orders = [
      {
        Institute_ID: "690ee6fc9e7ae2ecdbe5a515",
        Institute_Name: "Apollo",
        Manufacturer_ID: "690ee6a90a843eb7fd79ae95",
        Medicine_ID: "690ee6f50a843eb7fd79ae9b",
        Medicine_Name: "ORS Solution",
        Quantity_Requested: 14,
        manufacture_Status: "DELIVERED",
      },
      {
        Institute_ID: "690ee6fc9e7ae2ecdbe5a515",
        Institute_Name: "Apollo",
        Manufacturer_ID: "690ee6a90a843eb7fd79ae95",
        Medicine_ID: "690ee6f50a843eb7fd79ae9b",
        Medicine_Name: "ORS Solution",
        Quantity_Requested: 18,
        manufacture_Status: "DELIVERED",
      },
      {
        Institute_ID: "690ee6fc9e7ae2ecdbe5a515",
        Institute_Name: "Apollo",
        Manufacturer_ID: "690ee6a90a843eb7fd79ae95",
        Medicine_ID: "690f11004ef016bd9a28e5b0",
        Medicine_Name: "Cetirizine",
        Quantity_Requested: 23,
        manufacture_Status: "DELIVERED",
      },
      {
        Institute_ID: "690ee6fc9e7ae2ecdbe5a515",
        Institute_Name: "Apollo",
        Manufacturer_ID: "690ee6a90a843eb7fd79ae95",
        Medicine_ID: "690ee6f50a843eb7fd79ae9b",
        Medicine_Name: "ORS Solution",
        Quantity_Requested: 15,
        manufacture_Status: "REJECTED",
      },
    ];

    // Filter only delivered orders
    const filtered = orders.filter(
      (o) =>
        o.Manufacturer_ID === manu._id && o.manufacture_Status === "DELIVERED"
    );

    // Top Institutes
    const instMap = {};
    filtered.forEach((o) => {
      if (!instMap[o.Institute_Name]) instMap[o.Institute_Name] = 0;
      instMap[o.Institute_Name] += o.Quantity_Requested;
    });
    const topInst = Object.entries(instMap)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);

    // Top Medicines
    const medMap = {};
    filtered.forEach((o) => {
      if (!medMap[o.Medicine_Name]) medMap[o.Medicine_Name] = 0;
      medMap[o.Medicine_Name] += o.Quantity_Requested;
    });
    const topMed = Object.entries(medMap)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);

    setTopInstitutes(topInst);
    setTopMedicines(topMed);
  }, []);

  return (
    <div
      className="min-vh-100 d-flex flex-column align-items-center justify-content-start"
      style={{
        backgroundColor: "#f5f6f7",
        fontFamily: "Inter, sans-serif",
        paddingTop: "60px",
      }}
    >
      {/* Header */}
      <div className="text-center mb-4">
        <h2
          className="fw-bold text-dark mb-1"
          style={{ fontSize: "2.4rem", letterSpacing: "0.3px" }}
        >
          <FaChartBar className="me-2 mb-1" />
          Manufacturer Dashboard
        </h2>
        
        <p className="text-muted small mt-1">
          Track your top-performing institutes and medicines
        </p>
      </div>

      {/* Charts Section */}
      <div className="p-4 container">
        <div className="row g-4">
          {/* Institutes */}
          <div className="col-md-6">
            <div
              className="bg-white rounded-4 shadow-sm p-4 h-100"
              style={{
                border: "1px solid #e5e5e5",
                boxShadow:
                  "0 6px 20px rgba(0,0,0,0.05), 0 2px 6px rgba(0,0,0,0.04)",
                transition: "all 0.3s ease",
              }}
            >
              <h5 className="fw-bold text-dark mb-3 text-center">
                Top 3 Institutes (by Orders)
              </h5>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={topInstitutes}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total" fill="#1f2937" name="Total Quantity" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Medicines */}
          <div className="col-md-6">
            <div
              className="bg-white rounded-4 shadow-sm p-4 h-100"
              style={{
                border: "1px solid #e5e5e5",
                boxShadow:
                  "0 6px 20px rgba(0,0,0,0.05), 0 2px 6px rgba(0,0,0,0.04)",
              }}
            >
              <h5 className="fw-bold text-dark mb-3 text-center">
                Top 3 Medicines Supplied
              </h5>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={topMedicines}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total" fill="#111" name="Total Quantity" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 w-100">
        <Outlet />
      </div>
    </div>
  );
}

export default Home_manu;
