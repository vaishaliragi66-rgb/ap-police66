const path = require("path");
const dns = require("dns");
const mongoose = require("mongoose");

require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });

const Institute = require("../models/master_institute");
const Medicine = require("../models/master_medicine");
const InstituteLedger = require("../models/InstituteLedger");

const parseArgs = (argv) => {
  const args = {
    apply: false,
    email: "",
    codes: []
  };

  for (let index = 2; index < argv.length; index += 1) {
    const token = String(argv[index] || "").trim();
    if (!token) continue;

    if (token === "--apply") {
      args.apply = true;
      continue;
    }

    if (token === "--email" && argv[index + 1]) {
      args.email = String(argv[index + 1] || "").trim();
      index += 1;
      continue;
    }

    if (token === "--codes" && argv[index + 1]) {
      args.codes = String(argv[index + 1] || "")
        .split(",")
        .map((value) => String(value || "").trim())
        .filter(Boolean);
      index += 1;
      continue;
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

async function run() {
  const args = parseArgs(process.argv);
  if (!args.email) {
    throw new Error("Provide --email for the institute");
  }
  if (!args.codes.length) {
    throw new Error("Provide --codes as a comma-separated list");
  }

  const mongoUri = process.env.MONGO_URL || process.env.MONGO_URI || process.env.MONGO;
  if (!mongoUri) {
    throw new Error("No MongoDB connection string found in server/.env");
  }

  await connectWithFallback(mongoUri);

  const institute = await Institute.findOne({
    Email_ID: { $regex: `^${String(args.email).trim()}$`, $options: "i" }
  }).lean();

  if (!institute) {
    throw new Error(`No institute found for ${args.email}`);
  }

  const codes = args.codes.map((code) => String(code || "").trim());
  const medicines = await Medicine.find({
    Institute_ID: institute._id,
    Medicine_Code: { $in: codes }
  }).lean();

  console.log(`Target institute: ${institute.Institute_Name} <${institute.Email_ID}>`);
  console.log(`Requested codes: ${codes.join(", ")}`);
  console.log(`Matched medicines: ${medicines.length}`);

  if (!medicines.length) {
    return;
  }

  const ids = medicines.map((medicine) => medicine._id);
  const ledgerRows = await InstituteLedger.find({
    Institute_ID: institute._id,
    Medicine_Model: "Medicine",
    Medicine_ID: { $in: ids }
  }).lean();

  medicines.forEach((medicine) => {
    const relatedLedger = ledgerRows.filter(
      (row) => String(row.Medicine_ID) === String(medicine._id)
    );
    console.log(
      [
        medicine.Medicine_Code,
        medicine.Medicine_Name,
        medicine.Strength || "-",
        medicine.Quantity,
        `ledger:${relatedLedger.length}`
      ].join(" | ")
    );
  });

  if (!args.apply) {
    console.log("Dry run only. No data was removed.");
    return;
  }

  const deletedLedger = await InstituteLedger.deleteMany({
    Institute_ID: institute._id,
    Medicine_Model: "Medicine",
    Medicine_ID: { $in: ids }
  });

  const deletedMedicines = await Medicine.deleteMany({
    Institute_ID: institute._id,
    _id: { $in: ids }
  });

  console.log(`Deleted ledger rows: ${deletedLedger.deletedCount}`);
  console.log(`Deleted sub-store medicines: ${deletedMedicines.deletedCount}`);
}

if (require.main === module) {
  run()
    .catch((err) => {
      console.error("Failed to remove sub-store medicines:", err);
      process.exitCode = 1;
    })
    .finally(async () => {
      try {
        await mongoose.disconnect();
      } catch (disconnectError) {
        // Ignore cleanup errors.
      }
    });
}
