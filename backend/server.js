// Must be the first import so every module below sees the .env values
import "dotenv/config";
import express from "express";
import cors from "cors";
import db from "./config/db.js";
import Codes from "./config/status_codes.js";
import middleware from "./middleware/middleware.js";
import authRoutes from "./modules/v1/routes/authRoute.js";
import userRoutes from "./modules/v1/routes/userRoute.js";
import executiveRoutes from "./modules/v1/routes/executiveRoute.js";
import adminRoutes from "./modules/v1/routes/adminRoute.js";
import startCronJobs from "./config/cron.js";
import constant from "./config/constant.js";

const PORT = constant.PORT;
const app = express();

// Render puts a proxy in front: take the visitor's IP from X-Forwarded-For (activity log)
app.set("trust proxy", 1);

// Health / wake-up route for Render and uptime monitors (e.g. a ping every 10 minutes keeps the free plan awake).
// Registered before everything else: no api-key, no token, no rate limit and never a database query,
// so pinging it costs the database nothing (Neon can keep sleeping)
app.get("/health", (req, res) => res.json({ status: "ok", uptime_seconds: Math.round(process.uptime()) }));

app.use(cors({
  origin: constant.ADMIN_PANEL_URL, 
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.text({ type: "text/plain" })); // encrypted bodies arrive as text/plain

// Resolve response language from the Accept-Language header (en / hi / gu)
app.use(middleware.extractHeaderLanguage);

app.use("/uploads", express.static("uploads"));

app.use(middleware.checkApi);
app.use(middleware.decryption);
app.use(middleware.tokenMiddleware);

// API Routes
app.use("/api/v1/auth/", authRoutes);
app.use("/api/v1/user/", userRoutes);
app.use("/api/v1/executive/", executiveRoutes);
app.use("/api/v1/admin/", adminRoutes);

// Bad JSON / rejected uploads / unexpected errors → JSON response instead of Express's HTML page
app.use((err, req, res, next) => {
  if (err.name === "MulterError") {
    return middleware.sendApiResponse(res, Codes.SUCCESS, Codes.RESPONSE_ERROR, "rest_invalid_file", null);
  }
  if (err.status === 400) {
    return middleware.sendApiResponse(res, Codes.SUCCESS, Codes.RESPONSE_ERROR, "rest_invalid_request_payload", null);
  }
  console.error("Unhandled error:", err);
  return middleware.sendApiResponse(res, Codes.INTERNAL_ERROR, Codes.RESPONSE_ERROR, "rest_keywords_error", null);
});

// Test database connection
async function testDbConnection() {
  try {
    await db.query("SELECT 1");
    console.log("✓ Database connection established successfully");
    return true;
  } catch (error) {
    console.error("✗ Database connection failed:", error.message);
    return false;
  }
}

// Start server
async function startServer() {
  try {
    const isConnected = await testDbConnection();
    if (!isConnected) {
      process.exit(1);
    }

    startCronJobs();
    const server = app.listen(PORT, () => {
      console.log(`✓ Server is running on port ${PORT}`);
    });

    // On a redeploy Render sends SIGTERM: stop taking new requests, let the open ones finish, then close the pool
    const shutdown = (signal) => {
      console.log(`${signal} received, shutting down`);
      setTimeout(() => process.exit(0), constant.SHUTDOWN_TIMEOUT_MS).unref();
      server.close(() => db.pool.end().finally(() => process.exit(0)));
    };
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
}

// A forgotten await somewhere is logged instead of stopping the server for everyone
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});

startServer();