const path = require("path");
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require("mongoose");
const MasterCategory = require("../models/master_category");
const MasterValue = require("../models/master_value");
const { ensureTestMasterValues } = require("../utils/instituteMasterData");

const MONGO_URL = process.env.MONGO_URL || process.env.MONGO_URI || "";

if (!MONGO_URL) {
  console.error("MONGO_URL not set in environment. Aborting.");
  process.exit(1);
}

async function main() {
  const dns = require('dns');

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

    const authPart = username ? `${encodeURIComponent(username)}:${encodeURIComponent(password)}@` : "";

    return `mongodb://${authPart}${hosts}/${dbName}?${params.toString()}`;
  };

  const connect = async () => {
    try {
      await mongoose.connect(MONGO_URL);
    } catch (err) {
      const isSrvDnsIssue =
        MONGO_URL?.startsWith('mongodb+srv://') && (err?.message?.includes('querySrv ECONNREFUSED') || err?.code === 'ECONNREFUSED');
      if (!isSrvDnsIssue) throw err;
      console.warn('SRV DNS failed, trying fallback');
      const fallback = await buildFallbackMongoUri(MONGO_URL);
      await mongoose.connect(fallback);
    }
  };

  await connect();
  console.log("Connected to MongoDB");

  // If an instituteId is provided as argv, only process that one
  const argInstituteId = String(process.argv[2] || "").trim();
  let instituteIds = [];
  if (argInstituteId) {
    instituteIds = [argInstituteId];
  } else {
    // Find all institute IDs that have a Tests category (including global)
    const testsCategoryNormalized = "tests";
    const categories = await MasterCategory.find({ normalized_name: testsCategoryNormalized }).select("_id Institute_ID seed_version").lean();
    instituteIds = Array.from(new Set(categories.map(c => String(c.Institute_ID || "")).filter(Boolean)));
  }

  if (!instituteIds.length) {
    console.log("No Tests categories found. Nothing to do.");
    await mongoose.disconnect();
    return;
  }

  for (const instituteId of instituteIds) {
    try {
      console.log(`Processing instituteId=${instituteId}`);
      const beforeCount = await MasterValue.countDocuments({ Institute_ID: instituteId, "meta.kind": "test" });
      await ensureTestMasterValues(instituteId);
      const afterCount = await MasterValue.countDocuments({ Institute_ID: instituteId, "meta.kind": "test" });
      const inactiveCount = await MasterValue.countDocuments({ Institute_ID: instituteId, "meta.kind": "test", status: "Inactive" });
      console.log(`Institute ${instituteId}: before=${beforeCount}, after=${afterCount}, inactive_archived=${inactiveCount}`);
    } catch (err) {
      console.error(`Failed for ${instituteId}:`, err.message || err);
    }
  }

  await mongoose.disconnect();
  console.log("Done, disconnected.");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
