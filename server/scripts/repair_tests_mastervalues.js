/**
 * Repair canonical diagnostic test master values for one or more institutes.
 *
 * Usage:
 *   node server/scripts/repair_tests_mastervalues.js --instituteId <id>
 *   node server/scripts/repair_tests_mastervalues.js --all
 */
const mongoose = require("mongoose");
const path = require("path");
const dns = require("dns");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const Institute = require("../models/master_institute");
const MasterValue = require("../models/master_value");
const { ensureTestMasterValues } = require("../utils/instituteMasterData");

const argv = process.argv.slice(2).reduce((acc, item, index, arr) => {
  if (!item.startsWith("--")) return acc;
  const next = arr[index + 1];
  const key = item.replace(/^--/, "");
  if (next && !next.startsWith("--")) {
    acc[key] = next;
  } else {
    acc[key] = true;
  }
  return acc;
}, {});

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
  const hosts = srvRecords
    .sort((a, b) => a.priority - b.priority)
    .map((record) => `${record.name.replace(/\.$/, "")}:${record.port}`)
    .join(",");

  let txtParams = "";
  try {
    const txtRecords = await resolver.resolveTxt(host);
    txtParams = txtRecords.flat().join("");
  } catch {
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

  const authPart = username ? `${encodeURIComponent(username)}:${encodeURIComponent(password)}@` : "";
  return `mongodb://${authPart}${hosts}/${dbName}?${params.toString()}`;
};

const MONGO = process.env.MONGO_URL || process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ap-police";

const connect = async () => {
  try {
    await mongoose.connect(MONGO);
  } catch (err) {
    const isSrvDnsIssue =
      MONGO?.startsWith("mongodb+srv://") &&
      (err?.message?.includes("querySrv ECONNREFUSED") || err?.code === "ECONNREFUSED");
    if (!isSrvDnsIssue) throw err;
    console.warn("SRV DNS failed, trying fallback");
    const fallback = await buildFallbackMongoUri(MONGO);
    await mongoose.connect(fallback);
  }
};

const main = async () => {
  const instituteIdArg = String(argv.instituteId || argv.i || "").trim();
  const runAll = Boolean(argv.all);

  if (!instituteIdArg && !runAll) {
    console.log("Please provide --instituteId <id> or --all");
    process.exit(1);
  }

  await connect();
  console.log("Connected to MongoDB");

  let instituteIds = [];
  if (runAll) {
    instituteIds = await Institute.distinct("_id");
  } else {
    instituteIds = [instituteIdArg];
  }

  let processed = 0;
  for (const instituteId of instituteIds) {
    try {
      if (!mongoose.Types.ObjectId.isValid(String(instituteId))) {
        console.warn(`Skipping invalid institute id: ${instituteId}`);
        continue;
      }

      const category = await ensureTestMasterValues(String(instituteId));
      const activeTests = await MasterValue.countDocuments({
        Institute_ID: instituteId,
        category_id: category?._id,
        "meta.kind": "test",
        status: "Active"
      });
      const activeCategories = await MasterValue.countDocuments({
        Institute_ID: instituteId,
        category_id: category?._id,
        "meta.kind": "category",
        status: "Active"
      });

      console.log(
        `Repaired institute ${instituteId}: category=${String(category?._id || "")}, categories=${activeCategories}, tests=${activeTests}`
      );
      processed += 1;
    } catch (err) {
      console.error(`Failed to repair institute ${instituteId}:`, err?.message || err);
    }
  }

  console.log(`Done. Processed ${processed} institute(s).`);
  await mongoose.disconnect();
};

main().catch(async (err) => {
  console.error("Repair failed:", err);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
