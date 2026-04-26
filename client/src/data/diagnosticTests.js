const diagnosticTestsByCategory = {
  "HEMATOLOGY": [
    { name: "Hemoglobin", reference: "M: 13.0\u201317.0 | F: 12.0\u201315.0", unit: "g/dL" },
    { name: "RBC Count", reference: "M: 4.7\u20136.1 | F: 4.2\u20135.4", unit: "million/\u00b5L" },
    { name: "WBC Count (TLC)", reference: "4,000\u201311,000", unit: "/\u00b5L" },
    { name: "Platelet Count", reference: "1,50,000\u20134,50,000", unit: "/\u00b5L" },
    { name: "Hematocrit (PCV)", reference: "M: 40\u201354 | F: 36\u201348", unit: "%" },
    { name: "MCV", reference: "80\u201396", unit: "fL" },
    { name: "MCH", reference: "27\u201333", unit: "pg" },
    { name: "MCHC", reference: "32\u201336", unit: "g/dL" },
    { name: "ESR", reference: "M: 0\u201315 | F: 0\u201320", unit: "mm/hr" },
    { name: "Neutrophils", reference: "50\u201370", unit: "%" },
    { name: "Lymphocytes", reference: "20\u201340", unit: "%" },
    { name: "Eosinophils", reference: "1\u20136", unit: "%" },
    { name: "Monocytes", reference: "2\u20138", unit: "%" },
    { name: "Basophils", reference: "0\u20131", unit: "%" },
    { name: "RDW", reference: "11.5\u201314.5", unit: "%" }
  ],
  "DIABETES & GLUCOSE": [
    { name: "Fasting Blood Sugar (FBS)", reference: "70\u2013100", unit: "mg/dL" },
    { name: "Postprandial Blood Sugar (PPBS)", reference: "<140", unit: "mg/dL" },
    { name: "HbA1c", reference: "<5.7% Normal | 5.7\u20136.4% Pre | \u22656.5% DM", unit: "%" },
    { name: "Random Blood Sugar (RBS)", reference: "<200", unit: "mg/dL" },
    { name: "Insulin (Fasting)", reference: "2.6\u201324.9", unit: "\u00b5IU/mL" },
    { name: "C-Peptide", reference: "1.1\u20134.4", unit: "ng/mL" }
  ],
  "LIPID PROFILE": [
    { name: "Total Cholesterol", reference: "<200", unit: "mg/dL" },
    { name: "LDL Cholesterol", reference: "<100 (Optimal)", unit: "mg/dL" },
    { name: "HDL Cholesterol", reference: "M: >40 | F: >50", unit: "mg/dL" },
    { name: "Triglycerides", reference: "<150", unit: "mg/dL" },
    { name: "VLDL Cholesterol", reference: "5\u201340", unit: "mg/dL" },
    { name: "Non-HDL Cholesterol", reference: "<130", unit: "mg/dL" },
    { name: "LDL/HDL Ratio", reference: "<3.0", unit: "Ratio" }
  ],
  "LIVER FUNCTION TESTS": [
    { name: "Bilirubin - Total", reference: "0.3\u20131.2", unit: "mg/dL" },
    { name: "Bilirubin - Direct", reference: "0.0\u20130.3", unit: "mg/dL" },
    { name: "Bilirubin - Indirect", reference: "0.1\u20131.0", unit: "mg/dL" },
    { name: "ALT (SGPT)", reference: "7\u201356", unit: "U/L" },
    { name: "AST (SGOT)", reference: "10\u201340", unit: "U/L" },
    { name: "Alkaline Phosphatase (ALP)", reference: "44\u2013147", unit: "U/L" },
    { name: "GGT", reference: "M: 8\u201361 | F: 5\u201336", unit: "U/L" },
    { name: "Total Protein", reference: "6.0\u20138.3", unit: "g/dL" },
    { name: "Albumin", reference: "3.5\u20135.0", unit: "g/dL" },
    { name: "Globulin", reference: "2.0\u20133.5", unit: "g/dL" },
    { name: "A/G Ratio", reference: "1.0\u20132.2", unit: "Ratio" }  ],
  "KIDNEY FUNCTION TESTS": [
    { name: "Serum Creatinine", reference: "M: 0.6\u20131.2 | F: 0.5\u20131.1", unit: "mg/dL" },
    { name: "Blood Urea Nitrogen (BUN)", reference: "10\u201320", unit: "mg/dL" },
    { name: "Urea", reference: "15\u201340", unit: "mg/dL" },
    { name: "Uric Acid", reference: "M: 3.5\u20137.2 | F: 2.6\u20136.0", unit: "mg/dL" },
    { name: "eGFR", reference: ">90 (Normal)", unit: "mL/min/1.73m\u00b2" },
    { name: "BUN/Creatinine Ratio", reference: "10:1\u201320:1", unit: "Ratio" },
    { name: "Cystatin C", reference: "0.52\u20130.98", unit: "mg/L" }
  ],
  "THYROID PROFILE": [
    { name: "TSH", reference: "0.4\u20134.0", unit: "mIU/L" },
    { name: "Free T4 (fT4)", reference: "0.8\u20132.0", unit: "ng/dL" },
    { name: "Free T3 (fT3)", reference: "2.3\u20134.2", unit: "pg/mL" },
    { name: "Total T4", reference: "4.5\u201312.5", unit: "\u00b5g/dL" },
    { name: "Total T3", reference: "80\u2013200", unit: "ng/dL" },
    { name: "Anti-TPO Antibody", reference: "<35", unit: "IU/mL" }
  ],
  "ELECTROLYTES": [
    { name: "Sodium (Na+)", reference: "135\u2013145", unit: "mEq/L" },
    { name: "Potassium (K+)", reference: "3.5\u20135.0", unit: "mEq/L" },
    { name: "Chloride (Cl-)", reference: "98\u2013106", unit: "mEq/L" },
    { name: "Calcium (Total)", reference: "8.5\u201310.5", unit: "mg/dL" },
    { name: "Magnesium", reference: "1.7\u20132.2", unit: "mg/dL" },
    { name: "Phosphate (Inorganic)", reference: "2.5\u20134.5", unit: "mg/dL" },
    { name: "Bicarbonate (HCO3-)", reference: "22\u201329", unit: "mEq/L" }
  ],
  "URINALYSIS": [
    { name: "Urine pH", reference: "4.5\u20138.0", unit: "pH" },
    { name: "Urine Specific Gravity", reference: "1.005\u20131.030", unit: "" },
    { name: "Urine Protein", reference: "Negative", unit: "" },
    { name: "Urine Glucose", reference: "Negative", unit: "" },
    { name: "Urine Ketones", reference: "Negative", unit: "" },
    { name: "Urine RBC", reference: "0\u20132", unit: "/HPF" },
    { name: "Urine WBC", reference: "0\u20135", unit: "/HPF" },
    { name: "Urine Nitrite", reference: "Negative", unit: "" },
    { name: "Urine Bilirubin", reference: "Negative", unit: "" },
    { name: "Microalbuminuria (Spot)", reference: "<30", unit: "mg/g creatinine" }
  ],
  "CARDIAC MARKERS": [
    { name: "Troponin I (High Sensitivity)", reference: "<0.04", unit: "ng/mL" },
    { name: "CK-MB", reference: "<5", unit: "ng/mL" },
    { name: "BNP", reference: "<100", unit: "pg/mL" },
    { name: "hs-CRP", reference: "<3.0", unit: "mg/L" },
    { name: "Homocysteine", reference: "5\u201315", unit: "\u00b5mol/L" },
    { name: "Lipoprotein(a)", reference: "<30", unit: "mg/dL" }
  ],
  "VITAMINS & MINERALS": [
    { name: "Vitamin D (25-OH)", reference: "20\u201350 (Sufficient)", unit: "ng/mL" },
    { name: "Vitamin B12", reference: "200\u2013900", unit: "pg/mL" },
    { name: "Folate", reference: "2.0\u201320.0", unit: "ng/mL" },
    { name: "Serum Iron", reference: "M: 60\u2013170 | F: 50\u2013170", unit: "\u00b5g/dL" },
    { name: "Ferritin", reference: "M: 12\u2013300 | F: 12\u2013150", unit: "ng/mL" },
    { name: "TIBC", reference: "250\u2013370", unit: "\u00b5g/dL" },
    { name: "Zinc", reference: "70\u2013120", unit: "\u00b5g/dL" },
    { name: "Vitamin B1", reference: "2.5\u20137.5", unit: "\u00b5g/dL" }
  ],
  "COAGULATION STUDIES": [
    { name: "Prothrombin Time (PT)", reference: "11.0\u201313.5", unit: "sec" },
    { name: "INR", reference: "0.8\u20131.2", unit: "Ratio" },
    { name: "aPTT", reference: "30\u201340", unit: "sec" },
    { name: "Fibrinogen", reference: "200\u2013400", unit: "mg/dL" },
    { name: "D-Dimer", reference: "<0.5", unit: "\u00b5g/mL FEU" },
    { name: "Bleeding Time (BT)", reference: "2\u20137", unit: "min" }
  ],
  "INFECTIOUS DISEASE": [
    { name: "HBsAg", reference: "Negative (Non-Reactive)", unit: "" },
    { name: "Anti-HCV", reference: "Negative (Non-Reactive)", unit: "" },
    { name: "HIV 1 & 2 ELISA", reference: "Non-Reactive", unit: "" },
    { name: "VDRL / RPR", reference: "Non-Reactive", unit: "" },
    { name: "Dengue NS1 Antigen", reference: "Negative", unit: "" },
    { name: "Malaria Parasite (MP)", reference: "Negative", unit: "" },
    { name: "Widal Test", reference: "O <1:80 | H <1:80", unit: "Titer" }
  ],
  "TUMOR MARKERS": [
    { name: "PSA", reference: "<4.0", unit: "ng/mL" },
    { name: "CEA", reference: "<3 (non-smoker), <5 (smoker)", unit: "ng/mL" },
    { name: "AFP", reference: "<10", unit: "ng/mL" },
    { name: "CA-125", reference: "<35", unit: "U/mL" },
    { name: "CA 19-9", reference: "<37", unit: "U/mL" }
  ],
  "HORMONAL PROFILE": [
    { name: "Testosterone (Total)", reference: "270\u20131070", unit: "ng/dL" },
    { name: "FSH", reference: "M: 1.5\u201312.4 | F: varies by phase", unit: "mIU/mL" },
    { name: "LH", reference: "M: 1.7\u20138.6 | F: varies by phase", unit: "mIU/mL" },
    { name: "Prolactin", reference: "M: 2\u201318 | F: 2\u201329", unit: "ng/mL" },
    { name: "Cortisol", reference: "6.2\u201319.4", unit: "\u00b5g/dL" },
    { name: "DHEA-S", reference: "M: 80\u2013560 | F: 35\u2013430", unit: "\u00b5g/dL" }
  ],
  "BONE HEALTH": [
    { name: "Calcium (Serum)", reference: "8.5\u201310.5", unit: "mg/dL" },
    { name: "Phosphorus (Serum)", reference: "2.5\u20134.5", unit: "mg/dL" },
    { name: "PTH", reference: "10\u201365", unit: "pg/mL" },
    { name: "Alkaline Phosphatase (Bone)", reference: "15\u201341", unit: "U/L" }
  ],
  "IMMUNOLOGY": [
    { name: "IgE", reference: "<100 (adults)", unit: "IU/mL" },
    { name: "ANA", reference: "Negative (<1:40)", unit: "Titer" },
    { name: "Rheumatoid Factor (RF)", reference: "<20", unit: "IU/mL" },
    { name: "CRP", reference: "<6.0", unit: "mg/L" }
  ]
};

export default diagnosticTestsByCategory;
