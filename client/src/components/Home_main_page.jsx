import React from "react";
import { Link } from "react-router-dom";

function Home_main_page() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <nav className="bg-white shadow-md p-4 rounded-lg">
        <ul className="flex space-x-6">
          <li className="nav-item">
            <Link
              className="nav-link text-blue-600 font-semibold hover:text-blue-800 transition-all"
              to="/manufacturer-register"
            >
              Register to Manufacturer
            </Link>
            <Link
              className="nav-link text-blue-600 font-semibold hover:text-blue-800 transition-all"
              to="/institutes/register"
            >
              Register to Institute
            </Link>
            <Link
              className="nav-link text-blue-600 font-semibold hover:text-blue-800 transition-all"
              to="/employee/register"
            >
              Register Employee
            </Link>
            <Link
              className="nav-link text-blue-600 font-semibold hover:text-blue-800 transition-all"
              to="/medicine/request"
            >
              Request Medicine
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}

export default Home_main_page;