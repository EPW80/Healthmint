import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs"; // Add this for basic fs operations
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import mongoose from "mongoose";

// Create equivalents of __dirname and __filename for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try multiple locations for the .env file
const envPaths = [
  "./.env", // Server directory
  "../.env", // Project root
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "../.env"),
];

let envLoaded = false;

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    console.log(`Found .env file at: ${envPath}`);
    dotenv.config({ path: envPath });
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.warn(
    "⚠️ No .env file found! Using environment variables if available."
  );
}

// Import standardized error handling
import { errorHandler } from "./errors/index.js";

// Import HIPAA middleware
import hipaaCompliance from "./middleware/hipaaCompliance.js";

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
console.log("✅ Services initialized successfully");

// MongoDB Connection
console.log("Connecting to MongoDB...");
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB successfully");
    console.log(`Database: ${mongoose.connection.name}`);
    console.log(`Host: ${mongoose.connection.host}`);
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    // Consider whether you want to exit or continue with limited functionality
    // process.exit(1);  // Uncomment this if you want to fail hard when MongoDB is unavailable
  });

// Add connection event listeners
mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err.message);
});

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB disconnected");
});

mongoose.connection.on("reconnected", () => {
  console.log("MongoDB reconnected");
});

// Initialize Express app
const app = express();
const PORT = parseInt(process.env.PORT ?? "5000", 10);

// Add this to your server.js or app.js file
const frontendURL = process.env.FRONTEND_URL || 'https://healthmint-copyone.vercel.app';

// Configure CORS
app.use(cors({
  origin: [frontendURL, 'http://localhost:3000'],
  credentials: true
}));

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

// Import blockchain routes
import blockchainRoutes from "./routes/blockchain.js";

// Import audit routes
import auditRoutes from "./routes/audit.js";

// Import secure storage service
import secureStorageService from "./services/secureStorageService.js";

// Initialize the storage service before proceeding
try {
  // Wait for initialization to complete
  await secureStorageService.initialize();

  const isConnected = await secureStorageService.validateIPFSConnection();
  console.log(
    isConnected
      ? "✅ Web3Storage connection validated"
      : "⚠️ Web3Storage connection failed"
  );
} catch (error) {
  console.error("❌ Error initializing storage service:", error.message);
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

console.log("Mounting blockchain routes at /api/blockchain");
apiRouter.use("/blockchain", blockchainRoutes);

console.log("Mounting audit routes at /api/audit");
apiRouter.use("/audit", auditRoutes);

// Import storage routes
import storageRoutes from "./routes/storage.js";

// Replace existing storage test routes with this comprehensive version
console.log("Mounting storage routes at /api/storage");
apiRouter.use("/storage", storageRoutes);

// Add this with your other route imports
import testRoutes from "./routes/test.js";

// Add this with your other route registrations (before the catch-all routes)
app.use("/api/test", testRoutes);
console.log("Mounting test routes at /api/test");

// Import the researcher routes
import researcherRoutes from "./routes/researcher.js";

// Register the routes
app.use("/api/researcher", researcherRoutes);

// Mount the API Router to the app
app.use("/api", apiRouter);

// 404 Handler - Convert to standardized error
app.use((req, _res, next) => {
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
  global.SERVER_INITIALIZING = true;
  server = app.listen(PORT, () => {
    console.log(`🚀 Server running and accessible at http://0.0.0.0:${PORT}`);
    // Server is now initialized
    global.SERVER_INITIALIZING = false;
  });
} catch (err) {
  console.error("❌ Failed to start server:", err);
  process.exit(1);
}

export default app;
