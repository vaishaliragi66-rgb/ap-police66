const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config({ path: './.env' });
const path = require("path");
const dns = require("dns");


const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// ✅ Serve uploads folder statically
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);


// import your router here (adjust the path as needed)
const instituteApp = require('./apis/institute_api');
const medicineApp = require("./apis/medicines_api");
const employeeApp=require('./apis/employee_api')
const FamilyApp=require('./apis/family_member_api')
const prescriptionApp = require("./apis/prescription-api");
const diagnosisApp=require("./apis/diagnosis_api")
const diseaseApp=require("./apis/institute_enter_disease");
const ledgerApp = require("./apis/instituteLedgerApi");
const indentApp = require("./apis/institute_indent_api");
const dailyVisitRoutes = require("./apis/daily_visit_api");
const medicalActionRoutes = require("./apis/medical_action_api");
const doctorPrescriptionApi = require("./apis/doctor_prescription_api");
const mainStoreApp = require("./apis/mainstore_api");
const adminApp = require("./apis/admin_api");
const aiQueryApp = require('./apis/ai_query_api');
const xrayApp = require("./apis/xray_api");
const healthSummaryRoutes = require("./apis/healthSummary");
const instituteAuth = require("./apis/instituteAuth");

app.use("/institute-auth", instituteAuth.router);
app.use("/institute-api", healthSummaryRoutes);
app.use("/ai-api", aiQueryApp);
app.use("/doctor-prescription-api", doctorPrescriptionApi);
app.use("/api/visits", dailyVisitRoutes);
app.use("/api/medical-actions", medicalActionRoutes);
app.use("/medicine-api", medicineApp);
app.use("/institute-api", instituteApp);
app.use("/employee-api",employeeApp);
app.use("/family-api",FamilyApp);
app.use("/prescription-api", prescriptionApp);
app.use("/diagnosis-api",diagnosisApp);
app.use("/disease-api",diseaseApp)
app.use("/uploads", express.static("uploads"));
app.use("/ledger-api", ledgerApp);
app.use("/indent-api", indentApp);
app.use("/disease-api", require("./apis/disease-api"));
app.use("/medicine-limit-api", require("./apis/medicine_limit_api"));
app.use("/mainstore", mainStoreApp);
app.use("/admin-api", adminApp);
app.use("/xray-api", xrayApp);

// Base route
app.get("/", (req, res) => res.send("Manufacturer Server Running!"));

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
  if (!srvRecords || srvRecords.length === 0) {
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

const connectToMongo = async () => {
  const mongoUri = process.env.MONGO_URL;

  try {
    await mongoose.connect(mongoUri);
    console.log("MongoDB connected");
  } catch (err) {
    const isSrvDnsIssue =
      mongoUri?.startsWith("mongodb+srv://") &&
      (err?.message?.includes("querySrv ECONNREFUSED") ||
        err?.code === "ECONNREFUSED");

    if (!isSrvDnsIssue) {
      throw err;
    }

    console.warn("Mongo SRV DNS lookup failed. Retrying with DNS fallback...");
    const fallbackUri = await buildFallbackMongoUri(mongoUri);
    await mongoose.connect(fallbackUri);
    console.log("MongoDB connected (DNS fallback)");
  }
};

connectToMongo().catch((err) => {
  console.error("Mongo connection failed:", err);
});

// Start server
const PORT = process.env.PORT || 5200;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));