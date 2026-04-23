const path = require("path");
const dns = require("dns");
const mongoose = require("mongoose");

require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });

const Institute = require("../models/master_institute");
const MainStoreMedicine = require("../models/main_store");
const InstituteLedger = require("../models/InstituteLedger");
const {
  getCanonicalMedicines,
  canonicalizeMedicineType,
  canonicalizeDosageForm
} = require("../utils/canonicalMedicines");

const DEFAULT_ISSUED_BY = "Chief Office-Hyderabad";
const DEFAULT_SOURCE = "distributer";

const normalize = (value) => String(value || "").trim().toLowerCase();

const parseArgs = (argv) => {
  const args = {
    apply: false,
    allowExisting: false,
    email: "",
    issuedBy: DEFAULT_ISSUED_BY
  };

  for (let index = 2; index < argv.length; index += 1) {
    const token = String(argv[index] || "").trim();
    if (!token) continue;

    if (token === "--apply") {
      args.apply = true;
      continue;
    }

    if (token === "--allow-existing") {
      args.allowExisting = true;
      continue;
    }

    if (token === "--email" && argv[index + 1]) {
      args.email = String(argv[index + 1] || "").trim();
      index += 1;
      continue;
    }

    if (token === "--issued-by" && argv[index + 1]) {
      args.issuedBy = String(argv[index + 1] || "").trim() || DEFAULT_ISSUED_BY;
      index += 1;
      continue;
    }

    if (!token.startsWith("--") && !args.email) {
      args.email = token;
    }
  }

  return args;
};

const getResolver = () => {
  const resolver = new dns.promises.Resolver();
  resolver.setServers(["8.8.8.8", "1.1.1.1"]);
  return resolver;
};

const buildFallbackMongoUri = async (mongoSrvUri) => {
  const uri = new URL(mongoSrvUri);
  const host = uri.hostname;
  const dbName = uri.pathname && uri.pathname !== "/" ? uri.pathname.slice(1) : "test";
  const username = decodeURIComponent(uri.username || "");
  const password = decodeURIComponent(uri.password || "");

  const resolver = getResolver();
  const srvRecords = await resolver.resolveSrv(`_mongodb._tcp.${host}`);
  if (!srvRecords?.length) {
    throw new Error("No SRV records found for MongoDB host");
  }

  const hosts = srvRecords
    .sort((a, b) => a.priority - b.priority)
    .map((record) => `${record.name.replace(/\.$/, "")}:${record.port}`)
    .join(",");

  let txtParams = "";
  try {
    const txtRecords = await resolver.resolveTxt(host);
    txtParams = txtRecords.flat().join("");
  } catch (err) {
    txtParams = "";
  }

  const params = new URLSearchParams(uri.search || "");
  if (txtParams) {
    const txtSearchParams = new URLSearchParams(txtParams);
    for (const [key, value] of txtSearchParams.entries()) {
      if (!params.has(key)) {
        params.set(key, value);
      }
    }
  }

  if (!params.has("tls")) params.set("tls", "true");
  if (!params.has("retryWrites")) params.set("retryWrites", "true");
  if (!params.has("w")) params.set("w", "majority");

  const authPart = username
    ? `${encodeURIComponent(username)}:${encodeURIComponent(password)}@`
    : "";

  return `mongodb://${authPart}${hosts}/${dbName}?${params.toString()}`;
};

const connectWithFallback = async (mongoUri) => {
  try {
    await mongoose.connect(mongoUri);
    return;
  } catch (err) {
    const needsFallback =
      mongoUri?.startsWith("mongodb+srv://") &&
      (err?.message?.includes("querySrv ECONNREFUSED") || err?.code === "ECONNREFUSED");

    if (!needsFallback) {
      throw err;
    }

    const fallbackUri = await buildFallbackMongoUri(mongoUri);
    await mongoose.connect(fallbackUri);
  }
};

const buildMedicineKey = (medicine) =>
  [
    normalize(medicine.Type),
    normalize(medicine.Dosage_Form),
    normalize(medicine.Medicine_Name),
    normalize(medicine.Strength)
  ].join("::");

const buildQuantity = (index) => 400 + ((index * 37) % 301);
const buildThresholdQty = (quantity) => Math.max(50, Math.min(150, Math.round(quantity * 0.2)));
const buildExpiryDate = (index) => {
  const baseYear = 2028 + Math.floor(index / 120);
  const month = index % 12;
  return new Date(Date.UTC(baseYear, month, 28, 0, 0, 0, 0));
};

const getNextBatchNumbers = (existingCodes = [], count = 0) => {
  const usedCodes = new Set((existingCodes || []).map((code) => String(code || "").trim().toUpperCase()).filter(Boolean));
  const nextCodes = [];
  let cursor = 1;

  while (nextCodes.length < count) {
    const candidate = `MED_${String(cursor).padStart(3, "0")}`;
    if (!usedCodes.has(candidate)) {
      nextCodes.push(candidate);
      usedCodes.add(candidate);
    }
    cursor += 1;
  }

  return nextCodes;
};

const getCatalogMedicines = () => {
  const unique = new Map();

  getCanonicalMedicines().forEach((item) => {
    const normalizedMedicine = {
      Medicine_Name: String(item?.value_name || "").trim(),
      Strength: String(item?.strength || "").trim(),
      Type: canonicalizeMedicineType(item?.medicineType || "") || "Others",
      Dosage_Form: canonicalizeDosageForm(item?.dosageForm || "") || "Other"
    };

    if (!normalizedMedicine.Medicine_Name) {
      return;
    }

    const key = buildMedicineKey(normalizedMedicine);
    if (!unique.has(key)) {
      unique.set(key, normalizedMedicine);
    }
  });

  return [...unique.values()].sort((left, right) => {
    const typeCompare = left.Type.localeCompare(right.Type);
    if (typeCompare !== 0) return typeCompare;

    const formCompare = left.Dosage_Form.localeCompare(right.Dosage_Form);
    if (formCompare !== 0) return formCompare;

    const nameCompare = left.Medicine_Name.localeCompare(right.Medicine_Name);
    if (nameCompare !== 0) return nameCompare;

    return left.Strength.localeCompare(right.Strength);
  });
};

const findInstituteByEmail = async (email) => {
  const exactInstitute = await Institute.findOne({
    Email_ID: { $regex: `^${String(email || "").trim()}$`, $options: "i" }
  }).lean();

  if (exactInstitute) {
    return { institute: exactInstitute, suggestions: [] };
  }

  const [localPart = "", domain = ""] = String(email || "").trim().split("@");
  const safePrefix = localPart.replace(/[^a-z0-9]/gi, "").slice(0, 4);
  const safeDomain = String(domain || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const suggestionRegex = safePrefix
    ? new RegExp(`^${safePrefix}.*@${safeDomain}$`, "i")
    : /@/i;

  const suggestions = await Institute.find({ Email_ID: suggestionRegex })
    .select("Institute_Name Email_ID")
    .sort({ Email_ID: 1 })
    .lean();

  return { institute: null, suggestions };
};

const printPreview = ({ institute, medicines, existingDocs, issuedBy, nextBatchNumbers }) => {
  console.log("Dry run only. No database changes were made.");
  console.log(`Target institute: ${institute.Institute_Name} <${institute.Email_ID}>`);
  console.log(`Existing main-store rows: ${existingDocs.length}`);
  if (existingDocs.length) {
    console.log("Existing rows:");
    existingDocs.slice(0, 10).forEach((row) => {
      console.log(
        `- ${row.Medicine_Code} | ${row.Medicine_Name} | ${row.Type || "-"} | ${row.Dosage_Form || "-"} | ${row.Strength || "-"} | qty ${row.Quantity}`
      );
    });
  }
  console.log(`Medicines to seed: ${medicines.length}`);
  console.log(`Received From / Issued_By: ${issuedBy}`);
  console.log("Preview:");
  medicines.slice(0, 8).forEach((medicine, index) => {
    const quantity = buildQuantity(index);
    console.log(
      [
        nextBatchNumbers[index],
        medicine.Medicine_Name,
        medicine.Type,
        medicine.Dosage_Form,
        medicine.Strength || "-",
        quantity,
        buildExpiryDate(index).toISOString().slice(0, 10)
      ].join(" | ")
    );
  });
};

async function run() {
  const args = parseArgs(process.argv);
  const email = String(args.email || "").trim();
  if (!email) {
    throw new Error("Provide the institute email: node server/scripts/seed_main_store_from_master_catalog.js --email user@example.com [--apply]");
  }

  const mongoUri = process.env.MONGO_URL || process.env.MONGO_URI || process.env.MONGO;
  if (!mongoUri) {
    throw new Error("No MongoDB connection string found in server/.env");
  }

  await connectWithFallback(mongoUri);

  const { institute, suggestions } = await findInstituteByEmail(email);
  if (!institute) {
    console.error(`No institute found for email: ${email}`);
    if (suggestions.length) {
      console.error("Possible matches:");
      suggestions.forEach((row) => {
        console.error(`- ${row.Institute_Name} <${row.Email_ID}>`);
      });
    }
    process.exitCode = 1;
    return;
  }

  const existingDocs = await MainStoreMedicine.find({ Institute_ID: institute._id })
    .select("Medicine_Code Medicine_Name Type Dosage_Form Strength Quantity Expiry_Date")
    .lean();
  const existingCount = existingDocs.length;
  const existingKeys = new Set(existingDocs.map((row) => buildMedicineKey(row)));

  const medicines = getCatalogMedicines();
  const medicinesToSeed = medicines.filter((medicine) => !existingKeys.has(buildMedicineKey(medicine)));
  const nextBatchNumbers = getNextBatchNumbers(
    existingDocs.map((row) => row.Medicine_Code),
    medicinesToSeed.length
  );

  if (existingCount > 0 && !args.allowExisting) {
    console.error(
      `Aborting because ${existingCount} main-store medicine rows already exist for ${institute.Email_ID}. Re-run with --allow-existing only if you want to seed alongside them.`
    );
    existingDocs.forEach((row) => {
      console.error(
        `- ${row.Medicine_Code} | ${row.Medicine_Name} | ${row.Type || "-"} | ${row.Dosage_Form || "-"} | ${row.Strength || "-"} | qty ${row.Quantity}`
      );
    });
    console.error(`${medicinesToSeed.length} catalog medicines are still missing for this institute.`);
    process.exitCode = 1;
    return;
  }

  if (!medicines.length) {
    throw new Error("No medicines were found in the canonical master catalog.");
  }

  if (!args.apply) {
    printPreview({
      institute,
      medicines: medicinesToSeed,
      existingDocs,
      issuedBy: args.issuedBy || DEFAULT_ISSUED_BY,
      nextBatchNumbers
    });
    return;
  }

  if (!medicinesToSeed.length) {
    console.log(`All canonical catalog medicines already exist in the main store for ${institute.Email_ID}.`);
    return;
  }

  const createdAt = new Date();
  const docs = medicinesToSeed.map((medicine, index) => {
    const quantity = buildQuantity(index);
    return {
      Institute_ID: institute._id,
      Medicine_Code: nextBatchNumbers[index],
      Medicine_Name: medicine.Medicine_Name,
      Strength: medicine.Strength || undefined,
      Type: medicine.Type,
      Dosage_Form: medicine.Dosage_Form,
      Category: medicine.Type,
      Quantity: quantity,
      Threshold_Qty: buildThresholdQty(quantity),
      Source: DEFAULT_SOURCE,
      Issued_By: args.issuedBy || DEFAULT_ISSUED_BY,
      Expiry_Date: buildExpiryDate(index),
      createdAt,
      updatedAt: createdAt
    };
  });

  const insertedMedicines = await MainStoreMedicine.insertMany(docs, { ordered: true });
  const ledgerDocs = insertedMedicines.map((medicine, index) => ({
    Institute_ID: institute._id,
    Transaction_Type: "MAINSTORE_ADD",
    Reference_ID: null,
    Medicine_ID: medicine._id,
    Medicine_Model: "MainStoreMedicine",
    Medicine_Name: medicine.Medicine_Name,
    Expiry_Date: medicine.Expiry_Date,
    Direction: "IN",
    Quantity: medicine.Quantity,
    Balance_After: medicine.Quantity,
    Timestamp: new Date(createdAt.getTime() + index * 1000)
  }));

  await InstituteLedger.insertMany(ledgerDocs, { ordered: true });

  console.log(
    `Seeded ${insertedMedicines.length} main-store medicines for ${institute.Institute_Name} <${institute.Email_ID}>.`
  );
  console.log(
    `Batch numbers run from ${insertedMedicines[0].Medicine_Code} to ${insertedMedicines[insertedMedicines.length - 1].Medicine_Code}.`
  );
}

if (require.main === module) {
  run()
    .catch((err) => {
      console.error("Failed to seed main-store medicines:", err);
      process.exitCode = 1;
    })
    .finally(async () => {
      try {
        await mongoose.disconnect();
      } catch (disconnectError) {
        // Ignore disconnect cleanup failures.
      }
    });
}
