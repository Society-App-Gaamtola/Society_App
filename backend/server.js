// Must be the first import so every module below sees the .env values
import "dotenv/config";
import express from "express";
import cors from "cors";
import pool from "./config/db.js";
import Codes from "./config/status_codes.js";
import middleware from "./middleware/middleware.js";
import authRoutes from "./modules/v1/routes/authRoute.js";
import userRoutes from "./modules/v1/routes/userRoute.js";
import startCronJobs from "./config/cron.js";
import constant from "./config/constant.js";

const PORT = constant.PORT;
const app = express();

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
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
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
    app.listen(PORT, () => {
      console.log(`✓ Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
}

startServer();
