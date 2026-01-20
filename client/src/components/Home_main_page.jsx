import React from "react";
import { Link } from "react-router-dom";
import { FaUniversity, FaUserShield, FaUserCog } from "react-icons/fa";

function Home_main_page() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col text-[#1F2933]">
      
      {/* Remove underline + link blue globally */}
      <style>
        {`
          a {
            text-decoration: none !important;
            color: inherit !important;
          }
        `}
      </style>

      {/* Navbar */}
      <nav className="w-full bg-white border-b border-[#BCCCDC] py-4 px-10 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-[#4A70A9] text-white flex items-center justify-center font-semibold shadow-sm">
            AP
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight">
              AP Police Medical Inventory System
            </h1>
            <p className="text-xs text-[#6B7280]">
              Department of Health & Welfare
            </p>
          </div>
        </div>
        <span className="text-sm text-[#6B7280]">
          Powered by AP Police Health Division
        </span>
      </nav>

      {/* Main */}
      <main className="flex flex-col items-center justify-center flex-grow p-10">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-semibold mb-2">
            Welcome to the Dashboard
          </h2>
          <p className="text-[#6B7280] text-sm max-w-md mx-auto">
            Select your portal to proceed with registration or management
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-10 max-w-6xl w-full">

          {[
            {
              title: "Institute Portal",
              desc: "Manage hospitals, clinics, or health institute registrations.",
              icon: <FaUniversity />,
              link: "/institutes/register",
            },
            {
              title: "Employee Portal",
              desc: "Register and manage police medical department employees.",
              icon: <FaUserShield />,
              link: "/employee-register",
            },
            {
              title: "Admin Portal",
              desc: "Manage system-wide configurations and user roles.",
              icon: <FaUserCog />,
              link: "/admin/register",
            },
          ].map((card, i) => (
            <Link
              key={i}
              to={card.link}
              className="relative bg-white rounded-xl p-8 border border-[#BCCCDC]
              shadow-sm hover:shadow-lg transition-all duration-300
              hover:-translate-y-2 text-center group"
            >
              {/* Accent Line */}
              <div className="absolute top-0 left-0 w-full h-[3px] bg-[#4A70A9]" />

              {/* Icon */}
              <div className="w-16 h-16 mx-auto mb-6 rounded-full
                bg-[#EAF2FF] flex items-center justify-center
                text-[#4A70A9] text-3xl
                shadow-sm group-hover:shadow-md
                group-hover:scale-105 transition-all">
                {card.icon}
              </div>

              <h3 className="text-lg font-semibold mb-2">
                {card.title}
              </h3>

              <p className="text-[#6B7280] text-sm mb-6 leading-relaxed">
                {card.desc}
              </p>

              {/* Button */}
              <div className="inline-flex items-center gap-2
                bg-[#4A70A9] text-white px-7 py-2 rounded-full
                text-sm font-medium
                hover:bg-[#3E5F8C]
                transition-all shadow-sm hover:shadow-md">
                Proceed
                <span className="text-lg">→</span>
              </div>
            </Link>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-[#BCCCDC] text-[#6B7280] text-sm text-center py-4">
        © 2025 AP Police Health Division — All Rights Reserved
      </footer>
    </div>
  );
}

export default Home_main_page;
