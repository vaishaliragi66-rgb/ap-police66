import React from "react";

export const APP_HEADER_HEIGHT = 88;

function GlobalHeader() {
  return (
    <header
      className="w-full border-b border-white/60 bg-white/75 px-4 md:px-10 flex justify-between items-center backdrop-blur-xl shadow-sm shadow-blue-100/60"
      style={{ minHeight: `${APP_HEADER_HEIGHT}px`, position: "sticky", top: 0, zIndex: 1200 }}
    >
      <div>
        <div>
          {/* Main Heading */}
          <h1 className="text-lg md:text-2xl font-semibold tracking-tight text-slate-900 mb-0">
            POLICE HOSPITAL MANAGEMENT
          </h1>

          {/* Increased size
          <p className="text-sm md:text-base text-slate-500 mb-0">
            Police Management of Online Hospital Analytics Network
          </p> */}

          <p className="text-xs text-slate-400 mb-0">
            Department of Health and Welfare
          </p>
        </div>
      </div>

      <span className="hidden rounded-full border border-blue-100 bg-gradient-to-r from-blue-100 to-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700 shadow-sm md:inline">
        SARCPL
      </span>
    </header>
  );
}

export default GlobalHeader;
