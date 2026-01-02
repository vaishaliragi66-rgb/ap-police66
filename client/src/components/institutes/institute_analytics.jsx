import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

const InstituteAnalytics = () => {
  const [ordersData, setOrdersData] = useState([]);
  const [inventoryData, setInventoryData] = useState([]);
  const BACKEND_PORT_NO = import.meta.env.VITE_BACKEND_PORT || 6100;

  useEffect(() => {
    const institute = JSON.parse(localStorage.getItem("institute"));
    if (!institute?._id) return;

    const fetchData = async () => {
      try {
        const [ordersRes, inventoryRes] = await Promise.all([
          axios.get(
            `http://localhost:${BACKEND_PORT_NO}/institute-api/orders/${institute._id}`
          ),
          axios.get(
            `http://localhost:${BACKEND_PORT_NO}/institute-api/inventory/${institute._id}`
          ),
        ]);

        setOrdersData(ordersRes.data || []);
        setInventoryData(inventoryRes.data || []);
      } catch (err) {
        console.error("Error loading analytics:", err);
      }
    };

    fetchData();
  }, []);

  // ===========================
  // MONTH-WISE + MANUFACTURER-WISE ORDERS
  // ===========================
  const barData = ordersData.reduce((acc, order) => {
    const date = new Date(order.Order_Date);

    const month = date.toLocaleString("default", {
      month: "short",
      year: "numeric",
    });

    const manufacturer =
      order?.Manufacturer_ID?.Manufacturer_Name || "Unknown";

    let monthEntry = acc.find((m) => m.month === month);

    if (!monthEntry) {
      monthEntry = {
        month,
        quantity: 0,
        manufacturers: {},
      };
      acc.push(monthEntry);
    }

    const qty = order?.Quantity_Requested || 0;
    monthEntry.quantity += qty;

    monthEntry.manufacturers[manufacturer] =
      (monthEntry.manufacturers[manufacturer] || 0) + qty;

    return acc;
  }, []);

  // convert manufacturers object to list for tooltip
  const formattedBarData = barData.map((m) => ({
    ...m,
    manufacturersList: Object.entries(m.manufacturers).map(
      ([name, qty]) => ({ name, qty })
    ),
  }));

  // ===========================
  // INVENTORY PIE DATA + BATCH NO
  // ===========================
  const pieData = inventoryData.map((m) => ({
    name: m.medicineName,
    value: m.quantity,
    batch:
      m.batchNo ||
      m.batch_number ||
      m.batchNumber ||
      m.Medicine_Code ||
      "Not Available",
  }));

  // ===========================
  // CUSTOM BAR TOOLTIP
  // ===========================
  const CustomBarTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;

    const data = payload[0].payload;

    return (
      <div
        style={{
          background: "#fff",
          border: "1px solid #ddd",
          padding: "10px",
          borderRadius: "8px",
        }}
      >
        <strong>{data.month}</strong>
        <br />
        Total Quantity: {data.quantity}
        <hr />
        <strong>Manufacturers</strong>
        <ul style={{ margin: 0, paddingLeft: "18px" }}>
          {data.manufacturersList.map((m, i) => (
            <li key={i}>
              {m.name} — <b>{m.qty}</b>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  // ===========================
  // CUSTOM PIE TOOLTIP (BATCH NO)
  // ===========================
  const CustomPieTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;

    const data = payload[0].payload;

    return (
      <div
        style={{
          background: "#fff",
          border: "1px solid #ddd",
          padding: "10px",
          borderRadius: "8px",
        }}
      >
        <strong>{data.name}</strong>
        <br />
        Quantity: {data.value}
        <br />
        Batch No: <b>{data.batch}</b>
      </div>
    );
  };

  return (
    <div className="container py-4">
      <h2 className="text-center fw-bold mb-4">
        📊 Institute Analytics Dashboard
      </h2>

      <div className="row g-4">

        {/* ================= BAR CHART ================= */}
        <div className="col-md-12">
          <div className="p-3 bg-white rounded-4 shadow-sm">
            <h5 className="text-center mb-3 fw-semibold">
              Monthly Orders From Manufacturers
            </h5>

            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={formattedBarData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip content={<CustomBarTooltip />} />
                <Legend />
                <Bar dataKey="quantity" fill="#1e90ff" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ================= PIE CHART ================= */}
        <div className="col-md-6">
          <div className="p-3 bg-white rounded-4 shadow-sm">
            <h5 className="text-center mb-3 fw-semibold">
              Medicine Stock Distribution
            </h5>

            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>

                <Tooltip content={<CustomPieTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};

export default InstituteAnalytics;