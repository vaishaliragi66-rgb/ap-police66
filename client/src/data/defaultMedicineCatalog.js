const RAW_DEFAULT_MEDICINE_CATALOG = `
Antibiotics|Capsule|Amoxicillin|250mg
Antibiotics|Tablet|Amoxicillin|250mg
Antibiotics|Syrup|Amoxicillin|250mg
Antibiotics|Capsule|Amoxicillin|500mg
Antibiotics|Tablet|Amoxicillin|500mg
Antibiotics|Syrup|Amoxicillin|500mg
Antibiotics|Tablet|Amoxicillin + Clavulanate|250mg
Antibiotics|Syrup|Amoxicillin + Clavulanate|250mg
Antibiotics|Tablet|Amoxicillin + Clavulanate|500mg
Antibiotics|Syrup|Amoxicillin + Clavulanate|500mg
Antibiotics|Capsule|Ampicillin|250mg
Antibiotics|Syrup|Ampicillin|250mg
Antibiotics|Capsule|Ampicillin|500mg
Antibiotics|Syrup|Ampicillin|500mg
Antibiotics|Capsule|Cloxacillin|250mg
Antibiotics|Syrup|Cloxacillin|250mg
Antibiotics|Capsule|Cloxacillin|500mg
Antibiotics|Syrup|Cloxacillin|500mg
Antibiotics|Capsule|Cephalexin|250mg
Antibiotics|Syrup|Cephalexin|250mg
Antibiotics|Capsule|Cephalexin|500mg
Antibiotics|Syrup|Cephalexin|500mg
Antibiotics|Tablet|Cefuroxime|250mg
Antibiotics|Syrup|Cefuroxime|250mg
Antibiotics|Tablet|Cefuroxime|500mg
Antibiotics|Syrup|Cefuroxime|500mg
Antibiotics|Tablet|Cefixime|200mg
Antibiotics|Syrup|Cefixime|200mg
Antibiotics|Tablet|Cefixime|400mg
Antibiotics|Syrup|Cefixime|400mg
Antibiotics|Tablet|Cefpodoxime|200mg
Antibiotics|Syrup|Cefpodoxime|200mg
Antibiotics|Tablet|Cefpodoxime|400mg
Antibiotics|Syrup|Cefpodoxime|400mg
Antibiotics|Capsule|Doxycycline|100mg
Antibiotics|Tablet|Doxycycline|100mg
Antibiotics|Tablet|Ciprofloxacin|250mg
Antibiotics|Tablet|Ciprofloxacin|500mg
Antibiotics|Tablet|Ofloxacin|200mg
Antibiotics|Tablet|Ofloxacin|400mg
Antibiotics|Tablet|Levofloxacin|250mg
Antibiotics|Tablet|Levofloxacin|500mg
Antibiotics|Tablet|Azithromycin|250mg
Antibiotics|Syrup|Azithromycin|250mg
Antibiotics|Tablet|Azithromycin|500mg
Antibiotics|Syrup|Azithromycin|500mg
Antibiotics|Tablet|Clarithromycin|250mg
Antibiotics|Tablet|Clarithromycin|500mg
Antibiotics|Tablet|Erythromycin|250mg
Antibiotics|Syrup|Erythromycin|250mg
Antibiotics|Tablet|Erythromycin|500mg
Antibiotics|Syrup|Erythromycin|500mg
Antibiotics|Tablet|Metronidazole|200mg
Antibiotics|Syrup|Metronidazole|200mg
Antibiotics|Tablet|Metronidazole|400mg
Antibiotics|Syrup|Metronidazole|400mg
Antibiotics|Tablet|Tinidazole|300mg
Antibiotics|Tablet|Tinidazole|500mg
Antibiotics|Tablet|Cotrimoxazole|480mg
Antibiotics|Syrup|Cotrimoxazole|480mg
Antibiotics|Tablet|Cotrimoxazole|960mg
Antibiotics|Syrup|Cotrimoxazole|960mg
Antibiotics|Tablet|Nitrofurantoin|100mg
Antibiotics|Tablet|Linezolid|600mg
Antibiotics|Injection|Vancomycin|500mg
Antibiotics|Injection|Vancomycin|1000mg
Antibiotics|Injection|Gentamicin|40mg/ml
Antibiotics|Injection|Amikacin|250mg/ml
Antibiotics|Injection|Amikacin|500mg/ml
Antibiotics|Injection|Ceftriaxone|500mg
Antibiotics|Injection|Ceftriaxone|1000mg
Antibiotics|Injection|Cefotaxime|500mg
Antibiotics|Injection|Cefotaxime|1000mg
Antibiotics|Injection|Cefepime|500mg
Antibiotics|Injection|Cefepime|1000mg
Antibiotics|Injection|Meropenem|500mg
Antibiotics|Injection|Meropenem|1000mg
Antibiotics|Injection|Imipenem + Cilastatin|500mg
Antibiotics|Injection|Imipenem + Cilastatin|1000mg
Antibiotics|Injection|Piperacillin + Tazobactam|2.25g
Antibiotics|Injection|Piperacillin + Tazobactam|4.5g
Antibiotics|Injection|Aztreonam|500mg
Antibiotics|Injection|Aztreonam|1000mg
Antibiotics|Injection|Colistin|1MU
Antibiotics|Injection|Colistin|2MU
Antibiotics|Injection|Sulbactam|500mg
Antibiotics|Injection|Sulbactam|1000mg
Antibiotics|Injection|Tazobactam|500mg
Antibiotics|Injection|Tazobactam|1000mg
Antibiotics|Capsule|Clindamycin|150mg
Antibiotics|Injection|Clindamycin|150mg
Antibiotics|Capsule|Clindamycin|300mg
Antibiotics|Injection|Clindamycin|300mg
Antibiotics|Injection|Teicoplanin|200mg
Antibiotics|Injection|Teicoplanin|400mg
Antibiotics|Injection|Tigecycline|50mg
Antibiotics|Injection|Polymyxin B|5000U/ml
Antibiotics|Capsule|Rifampicin|150mg
Antibiotics|Capsule|Rifampicin|300mg
Antibiotics|Tablet|Isoniazid|100mg
Antibiotics|Tablet|Isoniazid|300mg
Antibiotics|Tablet|Pyrazinamide|500mg
Antibiotics|Tablet|Ethambutol|400mg
Antibiotics|Injection|Streptomycin|1g
Antivirals|Tablet|Acyclovir|200mg
Antivirals|Cream|Acyclovir|200mg
Antivirals|Tablet|Acyclovir|400mg
Antivirals|Cream|Acyclovir|400mg
Antifungals|Tablet|Fluconazole|50mg
Antifungals|Syrup|Fluconazole|50mg
Antifungals|Tablet|Fluconazole|150mg
Antifungals|Syrup|Fluconazole|150mg
Antifungals|Tablet|Fluconazole|200mg
Antifungals|Syrup|Fluconazole|200mg
Antifungals|Capsule|Itraconazole|100mg
Antifungals|Capsule|Itraconazole|200mg
Antifungals|Tablet|Ketoconazole|200mg
Antifungals|Cream|Ketoconazole|200mg
Antifungals|Cream|Clotrimazole|1%
Antifungals|Cream|Miconazole|2%
Antifungals|Tablet|Terbinafine|250mg
Antifungals|Cream|Terbinafine|250mg
Antifungals|Injection|Amphotericin B|50mg
Antihelminthics|Tablet|Albendazole|200mg
Antihelminthics|Syrup|Albendazole|200mg
Antihelminthics|Tablet|Albendazole|400mg
Antihelminthics|Syrup|Albendazole|400mg
Antimalarials|Tablet|Chloroquine|150mg
Antimalarials|Syrup|Chloroquine|150mg
Antimalarials|Tablet|Chloroquine|300mg
Antimalarials|Syrup|Chloroquine|300mg
Antimalarials|Tablet|Hydroxychloroquine|200mg
Antimalarials|Tablet|Hydroxychloroquine|400mg
Antimalarials|Tablet|Quinine|300mg
Antimalarials|Tablet|Artesunate|50mg
Antimalarials|Injection|Artesunate|50mg
Antimalarials|Tablet|Artesunate|100mg
Antimalarials|Injection|Artesunate|100mg
Antimalarials|Injection|Artemether|80mg/ml
Antimalarials|Tablet|Lumefantrine|120mg
Antimalarials|Tablet|Artemether + Lumefantrine|20mg + 120mg
Antidiabetics|Tablet|Metformin|500mg
Antidiabetics|Tablet|Metformin|850mg
Antidiabetics|Tablet|Metformin|1000mg
Antidiabetics|Tablet|Glibenclamide|2.5mg
Antidiabetics|Tablet|Glibenclamide|5mg
Antidiabetics|Tablet|Gliclazide|40mg
Antidiabetics|Tablet|Gliclazide|80mg
Antidiabetics|Tablet|Glimepiride|1mg
Antidiabetics|Tablet|Glimepiride|2mg
Antidiabetics|Tablet|Glimepiride|4mg
Antidiabetics|Tablet|Pioglitazone|15mg
Antidiabetics|Tablet|Pioglitazone|30mg
Antidiabetics|Tablet|Sitagliptin|50mg
Antidiabetics|Tablet|Sitagliptin|100mg
Antidiabetics|Tablet|Vildagliptin|50mg
Antidiabetics|Injection|Insulin (Regular)|40IU/ml
Antidiabetics|Injection|Insulin (Regular)|100IU/ml
Antidiabetics|Injection|Insulin (NPH)|40IU/ml
Antidiabetics|Injection|Insulin (NPH)|100IU/ml
Antidiabetics|Injection|Insulin (Glargine)|100IU/ml
Antacids|Capsule|Omeprazole|20mg
Antacids|Tablet|Omeprazole|20mg
Antacids|Capsule|Omeprazole|40mg
Antacids|Tablet|Omeprazole|40mg
Antacids|Tablet|Pantoprazole|20mg
Antacids|Tablet|Pantoprazole|40mg
Antacids|Tablet|Rabeprazole|20mg
Antacids|Tablet|Esomeprazole|20mg
Antacids|Tablet|Esomeprazole|40mg
Antacids|Capsule|Lansoprazole|30mg
Antacids|Tablet|Ranitidine|150mg
Antacids|Tablet|Ranitidine|300mg
Antacids|Tablet|Famotidine|20mg
Antacids|Tablet|Famotidine|40mg
Antacids|Tablet|Sucralfate|1g
Antacids|Syrup|Sucralfate|1g
Laxatives|Syrup|Lactulose|
Laxatives|Tablet|Bisacodyl|
Laxatives|Suppository|Bisacodyl|
Laxatives|Tablet|Senna|
Laxatives|Syrup|Senna|
Laxatives|Suspension|Magnesium Hydroxide|
Laxatives|Tablet|Sodium Picosulfate|
Laxatives|Syrup|Sodium Picosulfate|
Lipid Lowering Agents|Tablet|Atorvastatin|10mg
Lipid Lowering Agents|Tablet|Atorvastatin|20mg
Lipid Lowering Agents|Tablet|Atorvastatin|40mg
Lipid Lowering Agents|Tablet|Atorvastatin|80mg
Lipid Lowering Agents|Tablet|Simvastatin|10mg
Lipid Lowering Agents|Tablet|Simvastatin|20mg
Lipid Lowering Agents|Tablet|Simvastatin|40mg
Lipid Lowering Agents|Tablet|Simvastatin|80mg
Lipid Lowering Agents|Tablet|Rosuvastatin|5mg
Lipid Lowering Agents|Tablet|Rosuvastatin|10mg
Lipid Lowering Agents|Tablet|Rosuvastatin|20mg
Lipid Lowering Agents|Tablet|Rosuvastatin|40mg
Lipid Lowering Agents|Tablet|Fenofibrate|160mg
Antihypertensives|Tablet|Amlodipine|2.5mg
Antihypertensives|Tablet|Amlodipine|5mg
Antihypertensives|Tablet|Amlodipine|10mg
Antihypertensives|Tablet|Atenolol|25mg
Antihypertensives|Tablet|Atenolol|50mg
Antihypertensives|Tablet|Atenolol|100mg
Antihypertensives|Tablet|Metoprolol|25mg
Antihypertensives|Tablet|Metoprolol|50mg
Antihypertensives|Tablet|Metoprolol|100mg
Antihypertensives|Tablet|Propranolol|10mg
Antihypertensives|Tablet|Propranolol|40mg
Antihypertensives|Tablet|Propranolol|80mg
Antihypertensives|Tablet|Enalapril|2.5mg
Antihypertensives|Tablet|Ramipril|5mg
Antihypertensives|Tablet|Ramipril|10mg
Antihypertensives|Tablet|Losartan|25mg
Antihypertensives|Tablet|Losartan|50mg
Antihypertensives|Tablet|Losartan|100mg
Antihypertensives|Tablet|Telmisartan|20mg
Antihypertensives|Tablet|Telmisartan|40mg
Antihypertensives|Tablet|Telmisartan|80mg
Antihypertensives|Tablet|Valsartan|40mg
Antihypertensives|Tablet|Valsartan|80mg
Antihypertensives|Tablet|Valsartan|160mg
Antihypertensives|Tablet|Valsartan|320mg
Antihypertensives|Tablet|Hydralazine|25mg
Antihypertensives|Tablet|Hydralazine|50mg
Antihypertensives|Tablet|Clonidine|0.1mg
Antihypertensives|Tablet|Clonidine|0.2mg
Antihypertensives|Tablet|Clonidine|0.3mg
Diuretics|Tablet|Furosemide|20mg
Diuretics|Tablet|Furosemide|40mg
Diuretics|Tablet|Furosemide|80mg
Diuretics|Injection|Furosemide|20mg
Diuretics|Injection|Furosemide|40mg
Diuretics|Tablet|Hydrochlorothiazide|12.5mg
Diuretics|Tablet|Hydrochlorothiazide|25mg
Diuretics|Tablet|Hydrochlorothiazide|50mg
Diuretics|Tablet|Spironolactone|25mg
Diuretics|Tablet|Spironolactone|50mg
Diuretics|Tablet|Spironolactone|100mg
Diuretics|Tablet|Acetazolamide|250mg
Diuretics|Injection|Mannitol|20%
Diuretics|Injection|Mannitol|25%
Anti Platelets|Tablet|Aspirin|75mg
Anti Platelets|Tablet|Aspirin|150mg
Anti Platelets|Tablet|Aspirin|300mg
Anti Platelets|Tablet|Clopidogrel|75mg
Anti Platelets|Tablet|Clopidogrel|150mg
Anti Anemics|Tablet|Levothyroxine|25mcg
Anti Anemics|Tablet|Levothyroxine|50mcg
Anti Anemics|Tablet|Levothyroxine|75mcg
Anti Anemics|Tablet|Levothyroxine|100mcg
Anti Anemics|Tablet|Levothyroxine|125mcg
Anti Anemics|Tablet|Levothyroxine|150mcg
Anti Anemics|Tablet|Prednisolone|5mg
Anti Anemics|Tablet|Prednisolone|10mg
Anti Anemics|Tablet|Prednisolone|20mg
Anti Anemics|Tablet|Hydrocortisone|10mg
Anti Anemics|Tablet|Hydrocortisone|20mg
Anti Anemics|Injection|Hydrocortisone|
Anti Anemics|Tablet|Dexamethasone|0.5mg
Anti Anemics|Tablet|Dexamethasone|4mg
Anti Anemics|Injection|Dexamethasone|
Anti Anemics|Tablet|Estrogen (Conjugated)|0.625mg
Anti Anemics|Tablet|Estrogen (Conjugated)|1.25mg
Anti Anemics|Capsule|Progesterone|100mg
Anti Anemics|Capsule|Progesterone|200mg
Anti Anemics|Injection|Progesterone|
Vitamins|Capsule|Vitamin A|5000IU
Vitamins|Capsule|Vitamin A|10000IU
Vitamins|Tablet|Vitamin D3|400IU
Vitamins|Tablet|Vitamin D3|1000IU
Vitamins|Capsule|Vitamin D3|60000IU
Vitamins|Capsule|Vitamin E|200mg
Vitamins|Capsule|Vitamin E|400mg
Vitamins|Tablet|Vitamin C|250mg
Vitamins|Tablet|Vitamin C|500mg
Vitamins|Syrup|Vitamin C|
Vitamins|Tablet|Vitamin B Complex|
Vitamins|Syrup|Vitamin B Complex|
Vitamins|Tablet|Multivitamin|
Vitamins|Syrup|Multivitamin|
Minerals|Tablet|Calcium Carbonate|500mg
Minerals|Tablet|Calcium Carbonate|1000mg
Minerals|Tablet|Calcium Citrate|500mg
Minerals|Tablet|Calcium Citrate|1000mg
Minerals|Tablet|Zinc Sulfate|20mg
Minerals|Syrup|Zinc Sulfate|
Minerals|Tablet|Magnesium Oxide|250mg
Minerals|Tablet|Magnesium Oxide|500mg
Minerals|Tablet|Potassium Chloride|600mg
Minerals|Syrup|Potassium Chloride|
Minerals|Injection|Potassium Chloride|
Minerals|Tablet|Sodium Bicarbonate|500mg
Minerals|Injection|Sodium Bicarbonate|
Minerals|Tablet|Selenium|50mcg
Minerals|Tablet|Selenium|100mcg
Analgesics & Anti Pyretics|Tablet|Paracetamol|250mg
Analgesics & Anti Pyretics|Tablet|Paracetamol|500mg
Analgesics & Anti Pyretics|Tablet|Paracetamol|650mg
Analgesics & Anti Pyretics|Syrup|Paracetamol|
Analgesics & Anti Pyretics|Injection|Paracetamol|
Analgesics & Anti Pyretics|Tablet|Ibuprofen|200mg
Analgesics & Anti Pyretics|Tablet|Ibuprofen|400mg
Analgesics & Anti Pyretics|Tablet|Diclofenac|50mg
Analgesics & Anti Pyretics|Tablet|Diclofenac|100mg
Analgesics & Anti Pyretics|Injection|Diclofenac|
Analgesics & Anti Pyretics|Tablet|Naproxen|250mg
Analgesics & Anti Pyretics|Tablet|Naproxen|500mg
Analgesics & Anti Pyretics|Tablet|Tramadol|50mg
Analgesics & Anti Pyretics|Tablet|Tramadol|100mg
Analgesics & Anti Pyretics|Injection|Tramadol|
Antipsychotics|Tablet|Haloperidol|1mg
Antipsychotics|Tablet|Haloperidol|5mg
Antipsychotics|Tablet|Haloperidol|10mg
Antipsychotics|Injection|Haloperidol|
Antipsychotics|Tablet|Chlorpromazine|25mg
Antipsychotics|Tablet|Chlorpromazine|100mg
Antipsychotics|Injection|Chlorpromazine|
Antipsychotics|Tablet|Risperidone|1mg
Antipsychotics|Tablet|Risperidone|2mg
Antipsychotics|Tablet|Risperidone|4mg
Antipsychotics|Tablet|Risperidone|6mg
Antipsychotics|Tablet|Olanzapine|5mg
Antipsychotics|Tablet|Olanzapine|10mg
Anti Epileptics|Tablet|Phenytoin|100mg
Anti Epileptics|Tablet|Phenytoin|300mg
Anti Epileptics|Injection|Phenytoin|
Anti Epileptics|Tablet|Carbamazepine|200mg
Anti Epileptics|Tablet|Carbamazepine|400mg
Anti Epileptics|Tablet|Phenobarbital|30mg
Anti Epileptics|Tablet|Phenobarbital|100mg
Anti Epileptics|Injection|Phenobarbital|
Anti Epileptics|Tablet|Topiramate|25mg
Anti Epileptics|Tablet|Topiramate|50mg
Anti Epileptics|Tablet|Topiramate|100mg
Anti Epileptics|Capsule|Gabapentin|100mg
Anti Epileptics|Capsule|Gabapentin|300mg
Anti Epileptics|Capsule|Gabapentin|400mg
Respiratory|Tablet|Salbutamol|2mg
Respiratory|Tablet|Salbutamol|4mg
Respiratory|Syrup|Salbutamol|
Respiratory|Inhaler|Salbutamol|
Respiratory|Tablet|Terbutaline|2.5mg
Respiratory|Syrup|Terbutaline|
Respiratory|Inhaler|Terbutaline|
Respiratory|Tablet|Theophylline|100mg
Respiratory|Tablet|Theophylline|200mg
Respiratory|Tablet|Theophylline|400mg
Respiratory|Injection|Aminophylline|
Respiratory|Inhaler|Beclomethasone|
Respiratory|Inhaler|Budesonide|
Respiratory|Inhaler|Fluticasone|
Respiratory|Tablet|Montelukast|4mg
Respiratory|Tablet|Montelukast|5mg
Respiratory|Tablet|Montelukast|10mg
Respiratory|Inhaler|Ipratropium|
Respiratory|Inhaler|Tiotropium|
Gastro Intestinal|Capsule|Omeprazole|20mg
Gastro Intestinal|Capsule|Omeprazole|40mg
Gastro Intestinal|Injection|Omeprazole|
Gastro Intestinal|Tablet|Pantoprazole|20mg
Gastro Intestinal|Tablet|Pantoprazole|40mg
Gastro Intestinal|Injection|Pantoprazole|
Gastro Intestinal|Tablet|Ranitidine|150mg
Gastro Intestinal|Tablet|Ranitidine|300mg
Gastro Intestinal|Injection|Ranitidine|
Gastro Intestinal|Tablet|Famotidine|20mg
Gastro Intestinal|Tablet|Famotidine|40mg
Gastro Intestinal|Injection|Famotidine|
Gastro Intestinal|Tablet|Domperidone|10mg
Gastro Intestinal|Tablet|Domperidone|20mg
Gastro Intestinal|Syrup|Domperidone|
Gastro Intestinal|Tablet|Metoclopramide|10mg
Gastro Intestinal|Injection|Metoclopramide|
Gastro Intestinal|Tablet|Ondansetron|4mg
Gastro Intestinal|Tablet|Ondansetron|8mg
Gastro Intestinal|Injection|Ondansetron|
Gastro Intestinal|Tablet|Loperamide|2mg
Gastro Intestinal|Syrup|Loperamide|
Gastro Intestinal|Powder|Oral Rehydration Salt (ORS)|
Gastro Intestinal|Suspension|Sucralfate|
Gastro Intestinal|Tablet|Sucralfate|1g
`.trim();

const parseCatalogLine = (line) => {
  const [medicineType = "", dosageForm = "", value_name = "", strength = ""] = line.split("|");

  return {
    value_name,
    meta: {
      kind: "medicine",
      medicineType,
      dosageForm,
      strength
    }
  };
};

export const DEFAULT_MEDICINE_CATALOG = RAW_DEFAULT_MEDICINE_CATALOG.split("\n")
  .map((line) => line.trim())
  .filter(Boolean)
  .map(parseCatalogLine);

export const DEFAULT_MEDICINE_TYPES = [...new Set(DEFAULT_MEDICINE_CATALOG.map((item) => item.meta.medicineType))];
export const DEFAULT_DOSAGE_FORMS = [...new Set(DEFAULT_MEDICINE_CATALOG.map((item) => item.meta.dosageForm))];

export default DEFAULT_MEDICINE_CATALOG;
