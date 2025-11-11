import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";

function ManufacturerLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const links = [
    { path: "add_medicine", label: "Add Medicine" },
    { path: "manufacturer_medicine_table", label: "Medicines" },
    { path: "orders_institutes", label: "Orders" },
    { path: "home_manu", label: "Analytics" },
    { path: "profile_manufacturer", label: "Profile" },
  ];

  const handleLogout = () => {
    localStorage.removeItem("manufacturer");
    alert("You have been logged out.");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-[#f5f6f7] font-[Inter,sans-serif]">
      {/* 🧩 Global link reset */}
      <style>
        {`
          a {
            color: inherit !important;
            text-decoration: none !important;
          }
        `}
      </style>

      {/* Navbar */}
      <nav className="bg-white shadow-sm py-3 px-10 border-b border-gray-200 flex justify-between items-center">
        {/* Left: Branding */}
        <div className="text-lg font-semibold text-gray-800 tracking-tight">
          AP Police Medical Inventory
        </div>

        {/* Right: Navigation Links */}
        <ul className="flex space-x-4 items-center">
          {links.map((link) => {
            const isActive = location.pathname.includes(link.path);
            return (
              <li key={link.path}>
                <Link
                  to={link.path}
                  className={`font-medium px-4 py-2 rounded-md transition-all duration-200 ${
                    isActive
                      ? "bg-black text-white"
                      : "text-gray-800 hover:bg-gray-100 hover:text-black"
                  }`}
                  style={{
                    fontSize: "0.95rem",
                    letterSpacing: "0.3px",
                  }}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}

          {/* Logout — styled same as tabs */}
          <li>
            <button
              onClick={handleLogout}
              className={`font-medium px-4 py-2 rounded-md transition-all duration-200 text-gray-800 hover:bg-gray-100 hover:text-black`}
              style={{
                fontSize: "0.95rem",
                letterSpacing: "0.3px",
              }}
            >
              Logout
            </button>
          </li>
        </ul>
      </nav>

      {/* Page Content */}
      <div className="p-6">
        <Outlet />
      </div>
    </div>
  );
}

export default ManufacturerLayout;
