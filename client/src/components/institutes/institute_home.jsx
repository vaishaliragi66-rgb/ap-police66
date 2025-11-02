import React, { useState } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { FaUserCircle } from "react-icons/fa";

const Institute_home = () => {
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleProfileClick = () => {
    navigate("/institute/profile");
  };

  const handleSignout = () => {
    localStorage.removeItem("institute");
    navigate("/institutes/login");
  };

  const handleOrderClick = () => {
    // ✅ Corrected route to match nested route definition
    navigate("/institutes/home/placeorder");
  };

  return (
    <div className="d-flex min-vh-100">
      {/* Sidebar */}
      <div
        className="bg-primary text-white p-3"
        style={{ width: "250px", minHeight: "100vh" }}
      >
        <h4 className="text-center mb-4">Institute Panel</h4>
        <ul className="list-unstyled">
          <li
            className="mb-3 p-2 rounded hover:bg-light cursor-pointer"
            onClick={() => alert("Show manufacturer orders")}
          >
            📦 Orders from Manufacturers
          </li>
          <li
            className="mb-3 p-2 rounded hover:bg-light cursor-pointer"
            onClick={() => alert("Show employee orders")}
          >
            👩‍⚕️ Orders from Employees
          </li>
        </ul>
      </div>

      {/* Main Content */}
      <div className="flex-grow-1 p-4 position-relative">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h3 className="fw-bold text-primary">Institute Dashboard</h3>

          <div className="position-relative">
            <FaUserCircle
              size={36}
              className="text-primary cursor-pointer"
              onClick={() => setShowDropdown(!showDropdown)}
            />
            {showDropdown && (
              <div
                className="position-absolute bg-white border rounded shadow p-2"
                style={{ right: 0, top: "40px", zIndex: 100 }}
              >
                <p
                  className="mb-2 cursor-pointer text-primary"
                  onClick={handleProfileClick}
                >
                  Profile
                </p>
                <p
                  className="mb-0 cursor-pointer text-danger"
                  onClick={handleSignout}
                >
                  Sign Out
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="row g-4 mb-4">
          <div className="col-md-4">
            <div className="card shadow text-center p-3 border-0">
              <h5 className="text-secondary">Total Employees</h5>
              <h3 className="fw-bold">25</h3>
            </div>
          </div>

          <div className="col-md-4">
            <div className="card shadow text-center p-3 border-0">
              <h5 className="text-secondary">Total Orders Placed</h5>
              <h3 className="fw-bold">40</h3>
            </div>
          </div>

          <div className="col-md-4">
            <div className="card shadow text-center p-3 border-0">
              <h5 className="text-secondary">Registered Employees</h5>
              <h3 className="fw-bold">18</h3>
            </div>
          </div>
        </div>

        {/* Place Order Button */}
        <div className="text-center mt-4">
          <button
            className="btn btn-primary px-4 py-2 rounded-3"
            onClick={()=>navigate("/institutes/placeorder")}
          >
            ➕ Place New Order
          </button>
        </div>

        {/* ✅ Outlet for nested routes */}
        <div className="mt-5">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default Institute_home;
