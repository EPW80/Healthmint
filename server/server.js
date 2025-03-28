// server.js
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

// Import standardized error handling
import { errorHandler } from "./utils/errorUtils.js";

// Import HIPAA middleware
import hipaaCompliance from "./middleware/hipaaCompliance.js";

// Resolve the correct .env path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Configure environment variables
const NODE_ENV = process.env.NODE_ENV || "development";
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : [
      "http://localhost:3000",
      "http://localhost:5000",
      "https://healthmint.com",
    ];

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
}

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
  allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
  exposedHeaders: ["Content-Length", "X-Request-ID"],
  maxAge: 86400, // 24 hours - how long the browser should cache preflight results
};

// CORS Preflight Handling for OPTIONS requests
app.options("*", cors(corsOptions));

// Apply CORS middleware to all routes
app.use(cors(corsOptions));

// Basic Security middleware
app.use(
  helmet({
    // Configure Content Security Policy as needed
    contentSecurityPolicy: NODE_ENV === "production" ? undefined : false,
  })
);

// Parse JSON requests
app.use(express.json({ limit: "50mb" }));

// Parse URL-encoded requests (forms)
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Request logging
app.use(morgan(NODE_ENV === "production" ? "combined" : "dev"));

// Import Routes with Error Handling
let authRoutes, dataRoutes, profileRoutes, usersRoutes;
try {
  authRoutes = (await import("./routes/auth.js")).default;
  dataRoutes = (await import("./routes/data.js")).default;
  profileRoutes = (await import("./routes/profile.js")).default;
  usersRoutes = (await import("./routes/users.js")).default;
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
  });
});

// Health Check Route
app.get("/health", (_req, res) => {
  res.json({
    success: true,
    message: "Service is operational",
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
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
process.on("SIGINT", () => {
  console.log("\n🔴 Server shutting down gracefully...");
  process.exit(0);
});

// Start Server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running and accessible at http://0.0.0.0:${PORT}`);
  console.log(`🌐 Environment: ${NODE_ENV}`);
  console.log("Available routes:");
  console.log("  GET  /");
  console.log("  GET  /health");
  console.log("  POST /api/auth/wallet/connect");
});

export default app;
