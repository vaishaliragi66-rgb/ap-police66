import React from "react";

export const APP_HEADER_HEIGHT = 120;

const StyledSentence = ({ text, className }) => {
  const words = text.split(" ");

  return (
    <p className={className + " mb-0 flex flex-wrap gap-1"}>
      {words.map((word, index) => (
        <span key={index}>
          <span style={{ color: "#d7504c" }}>
            {word.charAt(0).toUpperCase()}
          </span>
          <span style={{ color: "#1E3A8A" }}>
            {word.slice(1).toLowerCase()}
          </span>
        </span>
      ))}
    </p>
  );
};

function GlobalHeader() {
  return (
    <header
      className="w-full bg-white border-b border-[#BCCCDC] px-6 md:px-14 flex justify-between items-center"
      style={{
        minHeight: `${APP_HEADER_HEIGHT}px`,
        position: "sticky",
        top: 0,
        zIndex: 1200,
      }}
    >
      <div className="flex items-center space-x-5">

        {/* Bigger Logo */}
        <div className="w-16 h-16 rounded-full overflow-hidden shadow-md">
          <img
            src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRVWEyi8l5UBqob3o7ijL-cK1wbk63yuK7bsHcfo-cmCmWaHXG5"
            alt="AP Logo"
            className="w-full h-full object-cover"
          />
        </div>

        <div>
          <StyledSentence
            text="App Mohan"
            className="text-2xl md:text-4xl font-bold tracking-tight"
          />

          <StyledSentence
            text="Andhra Pradesh Police Management Of Online Hospital Analysis Network"
            className="text-base md:text-lg"
          />

          
        </div>
      </div>

      <span className="text-base text-[#6B7280] hidden md:inline font-medium">
        SARCPL
      </span>
    </header>
  );
}

export default GlobalHeader;