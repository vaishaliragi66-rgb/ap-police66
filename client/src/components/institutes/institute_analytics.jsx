import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
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

    // Fetch orders and inventory data
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

  // Prepare bar chart data
  const barData = ordersData.map((o) => ({
    name: o.Manufacturer_ID?.Manufacturer_Name || "Unknown",
    quantity: o.Quantity_Requested,
  }));

  // Prepare pie chart data
  const pieData = inventoryData.map((m) => ({
    name: m.medicineName,
    value: m.quantity,
  }));

  // Line chart for monthly trends
  const monthlyTrend = ordersData.reduce((acc, order) => {
    const month = new Date(order.Order_Date).toLocaleString("default", {
      month: "short",
    });
    const existing = acc.find((a) => a.month === month);
    if (existing) existing.orders++;
    else acc.push({ month, orders: 1 });
    return acc;
  }, []);

  return (
    <div className="container py-4">
      <h2 className="text-center fw-bold mb-4">📊 Institute Analytics Dashboard</h2>
      <div className="row g-4">
        {/* Bar Chart */}
        <div className="col-md-6">
          <div className="p-3 bg-white rounded-4 shadow-sm">
            <h5 className="text-center mb-3 fw-semibold">
              Orders To Manufacturers
            </h5>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="quantity" fill="#1e90ff" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
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
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Line Chart */}
        <div className="col-md-12">
          <div className="p-3 bg-white rounded-4 shadow-sm mt-4">
            <h5 className="text-center mb-3 fw-semibold">
              Monthly Order Trend
            </h5>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="orders" stroke="#ff7300" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstituteAnalytics;
