import React from "react";

export const APP_HEADER_HEIGHT = 88;

function GlobalHeader() {
  return (
    <header
      className="w-full bg-white border-b border-[#BCCCDC] px-4 md:px-10 flex justify-between items-center"
      style={{ minHeight: `${APP_HEADER_HEIGHT}px`, position: "sticky", top: 0, zIndex: 1200 }}
    >
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-full bg-[#4A70A9] text-white flex items-center justify-center font-semibold shadow-sm">
          AP
        </div>
        <div>
          <h1 className="text-base md:text-2xl font-semibold tracking-tight mb-0">
            AP Police Medical Inventory System
          </h1>
          <p className="text-xs text-[#6B7280] mb-0">
            Department of Health and Welfare
          </p>
        </div>
      </div>
      <span className="text-sm text-[#6B7280] hidden md:inline">
       SARCPL
      </span>
    </header>
  );
}

export default GlobalHeader;
