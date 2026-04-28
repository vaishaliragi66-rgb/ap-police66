const DEFAULT_DIAGNOSTIC_PANELS = [
  {
    name: "CBC (HEMATOLOGY)",
    categoryName: "HEMATOLOGY",
    tests: [
      "Hemoglobin",
      "Hematocrit (PCV)",
      "RBC Count",
      "MCV",
      "MCH",
      "MCHC",
      "RDW",
      "Platelet Count",
      "WBC Count (TLC)",
      "Neutrophils",
      "Lymphocytes",
      "Monocytes",
      "Eosinophils",
      "Basophils"
    ]
  },
  {
    name: "Lipid Profile",
    categoryName: "LIPID PROFILE",
    tests: [
      "Total Cholesterol",
      "LDL",
      "HDL",
      "Triglycerides",
      "VLDL",
      "Non-HDL",
      "LDL/HDL Ratio"
    ]
  },
  {
    name: "LFT",
    categoryName: "LIVER FUNCTION TESTS",
    tests: [
      "Bilirubin (Total)",
      "Bilirubin (Direct)",
      "Bilirubin (Indirect)",
      "ALT",
      "AST",
      "ALP",
      "GGT",
      "Total Protein",
      "Albumin",
      "Globulin",
      "A/G Ratio"
    ]
  },
  {
    name: "KFT",
    categoryName: "KIDNEY FUNCTION TESTS",
    tests: [
      "Serum Creatinine",
      "BUN",
      "Urea",
      "Uric Acid"
    ]
  },
  {
    name: "Urine Routine",
    categoryName: "URINALYSIS",
    tests: [
      "Urine pH",
      "Urine Specific Gravity",
      "Urine Protein",
      "Urine Glucose",
      "Urine Ketones",
      "Urine RBC",
      "Urine WBC",
      "Urine Nitrite",
      "Urine Bilirubin"
    ]
  }
];

module.exports = {
  DEFAULT_DIAGNOSTIC_PANELS
};
