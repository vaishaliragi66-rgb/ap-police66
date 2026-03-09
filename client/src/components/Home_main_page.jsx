import React from "react";
import { Link } from "react-router-dom";
import { FaUniversity, FaUserShield, FaUserCog } from "react-icons/fa";

function Home_main_page() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col text-[#1F2933]">
      <style>
        {`
          a {
            text-decoration: none !important;
            color: inherit !important;
          }
        `}
      </style>

      <main className="flex flex-col items-center justify-center flex-grow p-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-semibold mb-2">Welcome to the Dashboard</h2>
          <p className="text-[#6B7280] text-sm max-w-md mx-auto">
            Select your portal to proceed with registration or management
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-10 max-w-6xl w-full">
          {[
            {
              title: "Institute Portal",
              desc: "Manage hospitals, clinics, or health institute registrations.",
              icon: <FaUniversity />,
              link: "/institutes/login"
            },
            {
              title: "Employee Portal",
              desc: "Register and manage police medical department employees.",
              icon: <FaUserShield />,
              link: "/employee-login"
            },
            {
              title: "Admin Portal",
              desc: "Manage system-wide configurations and user roles.",
              icon: <FaUserCog />,
              link: "/admin/login"
            }
          ].map((card, i) => (
            <Link
              key={i}
              to={card.link}
              className="relative bg-white rounded-xl p-8 border border-[#BCCCDC] shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-2 text-center group"
            >
              <div className="absolute top-0 left-0 w-full h-[3px] bg-[#4A70A9]" />

              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#EAF2FF] flex items-center justify-center text-[#4A70A9] text-3xl shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all">
                {card.icon}
              </div>

              <h3 className="text-lg font-semibold mb-2">{card.title}</h3>

              <p className="text-[#6B7280] text-sm mb-6 leading-relaxed">{card.desc}</p>

              <div className="inline-flex items-center gap-2 bg-[#4A70A9] text-white px-7 py-2 rounded-full text-sm font-medium hover:bg-[#3E5F8C] transition-all shadow-sm hover:shadow-md">
                Proceed
                <span className="text-lg">&rarr;</span>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <footer className="bg-white border-t border-[#BCCCDC] text-[#6B7280] text-sm text-center py-4">
        &copy; 2025 AP Police Health Division &mdash; All Rights Reserved
      </footer>
    </div>
  );
}

export default Home_main_page;
