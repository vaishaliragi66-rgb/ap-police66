import { Link, Outlet } from 'react-router-dom';

function Home_manu() {
  return (
    <div>
      <nav className="bg-white shadow-md p-4 rounded-lg">
        <ul className="flex space-x-6">
          <li className="nav-item">
            <Link
              className="nav-link text-blue-600 font-semibold hover:text-blue-800 transition-all"
              to="add_medicine"
            >
              Add Medicine
            </Link>
          </li>
          <li className="nav-item">
            <Link
              className="nav-link text-blue-600 font-semibold hover:text-blue-800 transition-all"
              to="manufacturer_medicine_table"
            >
              View all your manufactured Medicines
            </Link>
          </li>
          <li className="nav-item">
            <Link
              className="nav-link text-blue-600 font-semibold hover:text-blue-800 transition-all"
              to="profile_manufacturer"
            >
              Profile
            </Link>
          </li>

        </ul>
      </nav>

      {/* 👇 This is crucial — it tells React Router where to render nested routes */}
      <div className="p-6">
        <Outlet />
      </div>
    </div>
  );
}

export default Home_manu;