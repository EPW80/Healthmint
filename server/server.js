// server.js
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

// Resolve the correct .env path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Initialize service dependencies first individually
import hipaaComplianceService from "./services/hipaaComplianceService.js";
import errorHandlingService from "./services/errorHandlingService.js";

// Configure environment variables
const NODE_ENV = process.env.NODE_ENV || "development";
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : [
      "http://localhost:3000",
      "http://localhost:5000",
      "https://healthmint.com",
    ];

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
let authRoutes, dataRoutes;
try {
  authRoutes = (await import("./routes/auth.js")).default;
  dataRoutes = (await import("./routes/data.js")).default;
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

// Mount Routes
console.log("Mounting auth routes at /api/auth");
app.use("/api/auth", authRoutes);

console.log("Mounting data routes at /api/data");
app.use("/api/data", dataRoutes);

// Log All Requests
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
});

// Global Error Handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
    timestamp: new Date().toISOString(),
    error: NODE_ENV === "development" ? err.stack : undefined,
  });
});

// Graceful Shutdown Handling
process.on("SIGINT", () => {
  console.log("\n🔴 Server shutting down gracefully...");
  process.exit(0);
});

// Start Server
// In server.js, find the app.listen line and change it to:
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running and accessible at http://0.0.0.0:${PORT}`);
  console.log(`🌐 Environment: ${NODE_ENV}`);
  console.log("Available routes:");
  console.log("  GET  /");
  console.log("  GET  /health");
  console.log("  POST /api/auth/wallet/connect");
});

export default app;
