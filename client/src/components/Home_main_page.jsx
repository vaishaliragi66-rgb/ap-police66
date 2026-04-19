import React from "react";
import { Link } from "react-router-dom";
import { FaUniversity, FaUserShield, FaUserCog } from "react-icons/fa";

function Home_main_page() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-white to-blue-50 flex flex-col text-slate-800 relative overflow-hidden">
      <style>
        {`
          a {
            text-decoration: none !important;
            color: inherit !important;
          }
        `}
      </style>

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-20 h-72 w-72 rounded-full bg-blue-200/40 blur-3xl" />
        <div className="absolute top-1/3 -right-16 h-80 w-80 rounded-full bg-cyan-100/50 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-sky-100/40 blur-3xl" />
      </div>

      <main className="relative z-10 flex flex-col items-center justify-center flex-grow px-6 py-12 sm:px-10">
        <div className="text-center mb-14">
          <div className="inline-flex items-center rounded-full border border-white/60 bg-white/70 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700 shadow-sm backdrop-blur-md">
            Police Health Services
          </div>
          <h2 className="mt-5 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Welcome to the Dashboard
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-500 max-w-md mx-auto sm:text-base">
            Select your portal to proceed with registration or management
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 max-w-6xl w-full">
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
              className="relative overflow-hidden rounded-2xl border border-white/70 bg-white/65 p-8 text-center shadow-md shadow-blue-100/60 backdrop-blur-xl transition-all duration-300 group hover:-translate-y-2 hover:border-blue-200 hover:bg-white/80 hover:shadow-xl hover:shadow-blue-200/50"
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-400 via-sky-400 to-cyan-300" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/60 via-white/10 to-blue-100/20 opacity-80" />

              <div className="relative z-10 mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/70 bg-gradient-to-br from-blue-100 to-white text-3xl text-blue-700 shadow-md shadow-blue-100/70 transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-blue-200/60">
                {card.icon}
              </div>

              <h3 className="relative z-10 mb-3 text-lg font-semibold tracking-tight text-slate-900">
                {card.title}
              </h3>

              <p className="relative z-10 mb-7 text-sm leading-6 text-slate-500">{card.desc}</p>

              <div className="relative z-10 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-sky-500 px-7 py-2.5 text-sm font-medium text-white shadow-md shadow-blue-200/70 transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-blue-300/60">
                Proceed
                <span className="text-lg">&rarr;</span>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/60 bg-white/70 py-4 text-center text-sm text-slate-500 backdrop-blur-md">
        &copy; 2025 AP Police Health Division &mdash; All Rights Reserved
      </footer>
    </div>
  );
}

export default Home_main_page;
