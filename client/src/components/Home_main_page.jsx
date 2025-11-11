import React from "react";
import { Link } from "react-router-dom";
import { FaIndustry, FaUniversity, FaUserShield } from "react-icons/fa";

function Home_main_page() {
  return (
    <div className="min-h-screen bg-[#f5f6f7] flex flex-col">
      {/* Remove underline + link blue globally */}
      <style>
        {`
          a {
            text-decoration: none !important;
            color: inherit !important;
          }
        `}
      </style>

      {/* Top Navbar */}
      <nav className="w-full bg-white border-b border-gray-300 py-4 px-10 flex justify-between items-center shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold">
            AP
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-gray-900 tracking-tight">
              AP Police Medical Inventory System
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Department of Health & Welfare
            </p>
          </div>
        </div>
        <span className="text-sm text-gray-500">
          Powered by AP Police Health Division
        </span>
      </nav>

      {/* Main Content */}
      <main className="flex flex-col items-center justify-center flex-grow p-10">
        {/* Header */}
        <div className="text-center mb-14">
          <h2 className="text-3xl font-semibold text-gray-900 mb-2">
            Welcome to the Dashboard
          </h2>
          <p className="text-gray-500 text-sm">
            Select your portal to proceed with registration or management
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-10 max-w-6xl w-full">
          {/* Manufacturer Card */}
          <Link
            to="/manufacturer-register"
            className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col items-center text-center hover:-translate-y-1"
          >
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <FaIndustry className="text-gray-700 text-3xl" />
            </div>
            <h3 className="text-lg font-semibold text-black mb-2 hover:text-gray-800 transition-all duration-200">
              Manufacturer Portal
            </h3>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
              Register and manage verified medicine suppliers.
            </p>
            <div className="bg-black text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-[#1a1a1a] transition-all">
              Proceed
            </div>
          </Link>

          {/* Institute Card */}
          <Link
            to="/institutes/register"
            className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col items-center text-center hover:-translate-y-1"
          >
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <FaUniversity className="text-gray-700 text-3xl" />
            </div>
            <h3 className="text-lg font-semibold text-black mb-2 hover:text-gray-800 transition-all duration-200">
              Institute Portal
            </h3>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
              Manage hospitals, clinics, or health institute registrations.
            </p>
            <div className="bg-black text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-[#1a1a1a] transition-all">
              Proceed
            </div>
          </Link>

          {/* Employee Card */}
          <Link
            to="/employee-register"
            className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col items-center text-center hover:-translate-y-1"
          >
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <FaUserShield className="text-gray-700 text-3xl" />
            </div>
            <h3 className="text-lg font-semibold text-black mb-2 hover:text-gray-800 transition-all duration-200">
              Employee Portal
            </h3>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
              Register and manage police medical department employees.
            </p>
            <div className="bg-black text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-[#1a1a1a] transition-all">
              Proceed
            </div>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-300 text-gray-500 text-sm text-center py-4">
        © 2025 AP Police Health Division — All Rights Reserved
      </footer>
    </div>
  );
}

export default Home_main_page;
