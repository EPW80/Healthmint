// server.js
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import fs from "fs";

// Import standardized error handling
import { errorHandler } from "./utils/errorUtils.js";

// Import HIPAA middleware
import hipaaCompliance from "./middleware/hipaaCompliance.js";

// Resolve the correct .env path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Validate critical environment variables
const REQUIRED_ENV_VARS = ["ENCRYPTION_KEY", "JWT_SECRET"];
const missingVars = REQUIRED_ENV_VARS.filter(
  (varName) => !process.env[varName]
);
if (missingVars.length > 0) {
  console.error(
    `❌ CRITICAL ERROR: Missing required environment variables: ${missingVars.join(", ")}`
  );
  console.error("Server cannot start securely without these variables.");
  process.exit(1);
}

// Configure environment variables
const NODE_ENV = process.env.NODE_ENV || "development";
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : [
      "http://localhost:3000",
      "http://localhost:5000",
      "https://healthmint.com",
    ];

// Setup logging directory
const logDir = path.join(__dirname, "logs");
if (!fs.existsSync(logDir)) {
  try {
    fs.mkdirSync(logDir, { recursive: true });
    console.log("✅ Created logs directory");
  } catch (err) {
    console.warn("⚠️ Could not create logs directory:", err.message);
  }
}

// Initialize service dependencies first individually
import hipaaComplianceService from "./services/hipaaComplianceService.js";
import errorHandlingService from "./services/errorHandlingService.js";

// Debugging Environment Variables
console.log(
  "✅ Loaded ENCRYPTION_KEY:",
  process.env.ENCRYPTION_KEY ? "Present" : "❌ Not Found"
);
console.log(
  "✅ Loaded JWT_SECRET:",
  process.env.JWT_SECRET ? "Present" : "❌ Not Found"
);
console.log("✅ Running in:", NODE_ENV);
console.log("✅ Allowed Origins:", ALLOWED_ORIGINS);

// Connect services after they are both initialized
try {
  errorHandlingService.setAuditLogger(hipaaComplianceService);
  hipaaComplianceService.setErrorHandlingService(errorHandlingService);
  console.log("✅ Services initialized successfully");
} catch (error) {
  console.error("❌ Error initializing services:", error);
  process.exit(1);
}

// Initialize Express app
const app = express();
const PORT = parseInt(process.env.PORT ?? "5000", 10);

// CORS Configuration - Make sure this is properly set up
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);

    // Check if origin is allowed
    if (ALLOWED_ORIGINS.indexOf(origin) !== -1 || NODE_ENV === "development") {
      callback(null, true);
    } else {
      console.warn(`⚠️ Origin denied access: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true, // Allow cookies and authentication headers
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Request-ID",
    "X-Access-Purpose",
  ],
  exposedHeaders: [
    "Content-Length",
    "X-Request-ID",
    "X-HIPAA-Compliant",
    "X-Download-Purpose",
  ],
  maxAge: 86400, // 24 hours - how long the browser should cache preflight results
};

// CORS Preflight Handling for OPTIONS requests
app.options("*", cors(corsOptions));

// Apply CORS middleware to all routes
app.use(cors(corsOptions));

// Enhanced Security middleware
app.use(
  helmet({
    contentSecurityPolicy: NODE_ENV === "production",
    crossOriginEmbedderPolicy: NODE_ENV === "production",
    hsts: {
      maxAge: 15552000, // 180 days
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  })
);

// Add security headers
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  next();
});

// Parse JSON requests - set reasonable size limits
app.use(express.json({ limit: "10mb" }));

// Parse URL-encoded requests - set reasonable size limits
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logging
const morganFormat =
  NODE_ENV === "production"
    ? morgan("combined", {
        skip: (req) =>
          req.path === "/health" || req.path.startsWith("/metrics"),
        stream: fs.createWriteStream(path.join(logDir, "access.log"), {
          flags: "a",
        }),
      })
    : morgan("dev");

app.use(morganFormat);

// Import Routes with Error Handling
let authRoutes, dataRoutes, profileRoutes, usersRoutes, datasetsRoutes;
try {
  authRoutes = (await import("./routes/auth.js")).default;
  dataRoutes = (await import("./routes/data.js")).default;
  profileRoutes = (await import("./routes/profile.js")).default;
  usersRoutes = (await import("./routes/users.js")).default;

  // Try to import datasets routes - add with graceful fallback
  try {
    datasetsRoutes = (await import("./routes/datasets.js")).default;
    console.log("✅ Datasets routes loaded successfully");
  } catch (err) {
    console.warn("⚠️ Datasets routes not found:", err.message);
    // Create a minimal response to prevent 404 errors
    datasetsRoutes = express.Router();
    datasetsRoutes.get("/:id/download", (req, res) => {
      res.status(501).json({
        success: false,
        message: "Dataset download functionality not yet implemented",
        datasetId: req.params.id,
      });
    });
  }
} catch (err) {
  console.error("❌ Failed to import routes:", err.message);
  process.exit(1); // Stops the server if routes fail to load
}

// Root Route
app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "Healthmint API Server",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
  });
});

// Health Check Route
app.get("/health", (_req, res) => {
  res.json({
    success: true,
    message: "Service is operational",
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    uptime: process.uptime(),
  });
});

// Create API Router for /api routes
const apiRouter = express.Router();

// Apply HIPAA compliance middleware centrally to all API routes
// This eliminates the need to apply these in individual route files
console.log("Applying HIPAA compliance middleware to all API routes");
apiRouter.use(hipaaCompliance.validatePHI);
apiRouter.use(hipaaCompliance.auditLog);

// Mount Routes to the API Router
console.log("Mounting auth routes at /api/auth");
apiRouter.use("/auth", authRoutes);

console.log("Mounting data routes at /api/data");
apiRouter.use("/data", dataRoutes);

console.log("Mounting profile routes at /api/profile");
apiRouter.use("/profile", profileRoutes);

console.log("Mounting users routes at /api/users");
apiRouter.use("/users", usersRoutes);

console.log("Mounting datasets routes at /api/datasets");
apiRouter.use("/datasets", datasetsRoutes);

// Mount the API Router to the app
app.use("/api", apiRouter);

// 404 Handler - Convert to standardized error
app.use((req, res, next) => {
  const error = new Error(`Route ${req.originalUrl} not found`);
  error.statusCode = 404;
  error.code = "NOT_FOUND";
  next(error);
});

// Global Error Handler - Use standardized error handler
app.use(errorHandler);

// Graceful Shutdown Handling
let server;
const gracefulShutdown = () => {
  console.log("\n🔴 Graceful shutdown initiated...");

  // Close server first, stop accepting new connections
  if (server) {
    server.close(() => {
      console.log("✅ HTTP server closed");

      // Add any other cleanup tasks here (e.g., database connections)

      console.log("✅ Shutdown complete");
      process.exit(0);
    });

    // If shutdown takes too long, force exit
    setTimeout(() => {
      console.error("❌ Forced shutdown after timeout");
      process.exit(1);
    }, 30000); // 30 seconds timeout
  } else {
    process.exit(0);
  }
};

// Handle different termination signals
process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);
process.on("SIGUSR2", gracefulShutdown); // For Nodemon restarts

// Handle uncaught exceptions and unhandled rejections
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  gracefulShutdown();
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Promise Rejection:", reason);
  gracefulShutdown();
});

// Start Server
try {
  server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running and accessible at http://0.0.0.0:${PORT}`);
    console.log(`🌐 Environment: ${NODE_ENV}`);
    console.log("Available routes:");
    console.log("  GET  /");
    console.log("  GET  /health");
    console.log("  POST /api/auth/wallet/connect");
    console.log("  GET  /api/datasets/:id/download");
  });
} catch (err) {
  console.error("❌ Failed to start server:", err);
  process.exit(1);
}

export default app;
