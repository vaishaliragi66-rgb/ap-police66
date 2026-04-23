const path = require("path");
const dns = require("dns");
const mongoose = require("mongoose");

require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });

const Institute = require("../models/master_institute");
const MainStoreMedicine = require("../models/main_store");
const Medicine = require("../models/master_medicine");
const InstituteLedger = require("../models/InstituteLedger");

const parseArgs = (argv) => {
  const args = {
    apply: false,
    email: ""
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

const buildTransferQty = (index) => 30 + ((index * 11) % 31);

async function run() {
  const args = parseArgs(process.argv);
  if (!args.email) {
    throw new Error("Provide the institute email: node server/scripts/bulk_transfer_mainstore_to_substore.js --email user@example.com [--apply]");
  }

  const mongoUri = process.env.MONGO_URL || process.env.MONGO_URI || process.env.MONGO;
  if (!mongoUri) {
    throw new Error("No MongoDB connection string found in server/.env");
  }

  await connectWithFallback(mongoUri);

  const institute = await Institute.findOne({
    Email_ID: { $regex: `^${String(args.email || "").trim()}$`, $options: "i" }
  }).lean();

  if (!institute) {
    throw new Error(`No institute found for ${args.email}`);
  }

  const mainStoreMedicines = await MainStoreMedicine.find({ Institute_ID: institute._id })
    .sort({ Medicine_Code: 1, Medicine_Name: 1 })
    .lean();
  const subStoreMedicines = await Medicine.find({ Institute_ID: institute._id }).lean();
  const subStoreByCode = new Map(subStoreMedicines.map((row) => [String(row.Medicine_Code), row]));

  if (!mainStoreMedicines.length) {
    console.log(`No main-store medicines found for ${institute.Email_ID}.`);
    return;
  }

  const plan = mainStoreMedicines.map((mainMed, index) => {
    const transferQty = buildTransferQty(index);
    if (mainMed.Quantity < transferQty) {
      throw new Error(
        `Insufficient stock for ${mainMed.Medicine_Code} ${mainMed.Medicine_Name}. Has ${mainMed.Quantity}, needs ${transferQty}.`
      );
    }

    const existingSub = subStoreByCode.get(String(mainMed.Medicine_Code));
    return {
      mainMed,
      existingSub,
      transferQty,
      senderBalanceAfter: mainMed.Quantity - transferQty,
      receiverBalanceAfter: (existingSub?.Quantity || 0) + transferQty
    };
  });

  const creatingCount = plan.filter((item) => !item.existingSub).length;
  const updatingCount = plan.length - creatingCount;

  console.log(`Target institute: ${institute.Institute_Name} <${institute.Email_ID}>`);
  console.log(`Main-store medicines considered: ${plan.length}`);
  console.log(`Sub-store rows to create: ${creatingCount}`);
  console.log(`Sub-store rows to update: ${updatingCount}`);
  console.log("Preview:");
  plan.slice(0, 8).forEach((item) => {
    console.log(
      [
        item.mainMed.Medicine_Code,
        item.mainMed.Medicine_Name,
        `move:${item.transferQty}`,
        `main:${item.mainMed.Quantity}->${item.senderBalanceAfter}`,
        `sub:${item.existingSub?.Quantity || 0}->${item.receiverBalanceAfter}`
      ].join(" | ")
    );
  });

  if (!args.apply) {
    console.log("Dry run only. No inventory was transferred.");
    return;
  }

  let createdSubstoreCount = 0;
  let updatedSubstoreCount = 0;
  let ledgerCreatedCount = 0;

  for (const [index, item] of plan.entries()) {
    const { mainMed, existingSub, transferQty, senderBalanceAfter, receiverBalanceAfter } = item;

    await MainStoreMedicine.updateOne(
      { _id: mainMed._id, Quantity: { $gte: transferQty } },
      { $inc: { Quantity: -transferQty } }
    );

    let subMedId = existingSub?._id || null;
    if (existingSub) {
      const update = { $inc: { Quantity: transferQty } };
      const set = {};

      if (mainMed.Strength && !existingSub.Strength) set.Strength = mainMed.Strength;
      if (mainMed.Type && !existingSub.Type) set.Type = mainMed.Type;
      if (mainMed.Category && !existingSub.Category) set.Category = mainMed.Category;
      if (mainMed.Threshold_Qty && !existingSub.Threshold_Qty) set.Threshold_Qty = mainMed.Threshold_Qty;
      if (mainMed.Expiry_Date && (!existingSub.Expiry_Date || new Date(existingSub.Expiry_Date) < new Date(mainMed.Expiry_Date))) {
        set.Expiry_Date = mainMed.Expiry_Date;
      }
      if (Object.keys(set).length) {
        update.$set = set;
      }

      await Medicine.updateOne({ _id: existingSub._id }, update);
      updatedSubstoreCount += 1;
    } else {
      const createdSub = await Medicine.create({
        Institute_ID: institute._id,
        Medicine_Code: mainMed.Medicine_Code,
        Medicine_Name: mainMed.Medicine_Name,
        Strength: mainMed.Strength,
        Type: mainMed.Type,
        Category: mainMed.Category,
        Quantity: transferQty,
        Threshold_Qty: mainMed.Threshold_Qty,
        Expiry_Date: mainMed.Expiry_Date
      });
      subMedId = createdSub._id;
      createdSubstoreCount += 1;
    }

    await InstituteLedger.create({
      Institute_ID: institute._id,
      Transaction_Type: "SUBSTORE_ADD",
      Reference_ID: null,
      Medicine_ID: mainMed._id,
      Medicine_Model: "MainStoreMedicine",
      Medicine_Name: mainMed.Medicine_Name,
      Expiry_Date: mainMed.Expiry_Date,
      Direction: "OUT",
      Quantity: transferQty,
      Balance_After: senderBalanceAfter,
      Timestamp: new Date(Date.now() + index * 1000)
    });

    await InstituteLedger.create({
      Institute_ID: institute._id,
      Transaction_Type: "SUBSTORE_ADD",
      Reference_ID: null,
      Medicine_ID: subMedId,
      Medicine_Model: "Medicine",
      Medicine_Name: mainMed.Medicine_Name,
      Expiry_Date: mainMed.Expiry_Date,
      Direction: "IN",
      Quantity: transferQty,
      Balance_After: receiverBalanceAfter,
      Timestamp: new Date(Date.now() + index * 1000 + 500)
    });

    ledgerCreatedCount += 2;
  }

  console.log(`Transferred ${plan.length} medicines from main store to sub-store.`);
  console.log(`Created sub-store rows: ${createdSubstoreCount}`);
  console.log(`Updated existing sub-store rows: ${updatedSubstoreCount}`);
  console.log(`Created ledger rows: ${ledgerCreatedCount}`);
}

if (require.main === module) {
  run()
    .catch((err) => {
      console.error("Failed to bulk transfer main store medicines to sub-store:", err);
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
