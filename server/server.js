// server.js
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import fs from "fs";
import multer from "multer";

// Load environment variables first thing
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

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

// Storage test routes
console.log("Mounting storage test routes at /api/storage");
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

apiRouter.post(
  "/storage/test-upload",
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, message: "No file provided" });
      }

      console.log(
        `Test upload: ${req.file.originalname}, size: ${req.file.size} bytes`
      );

      // Upload to IPFS
      const uploadResult = await secureStorageService.uploadToIPFS(
        req.file.buffer,
        {
          fileName: req.file.originalname,
          mimeType: req.file.mimetype,
        }
      );

      return res.json({
        success: true,
        cid: uploadResult.cid,
        fileName: req.file.originalname,
        url: `https://dweb.link/ipfs/${uploadResult.cid}`,
      });
    } catch (error) {
      console.error("Upload error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Upload failed",
      });
    }
  }
);

apiRouter.post(
  "/storage/test-ipfs-flow",
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, message: "No file provided" });
      }

      console.log(
        `Testing IPFS flow: ${req.file.originalname}, size: ${req.file.size} bytes`
      );

      // 1. Upload to IPFS
      const uploadResult = await secureStorageService.uploadToIPFS(
        req.file.buffer,
        {
          fileName: req.file.originalname,
          mimeType: req.file.mimetype,
        }
      );

      console.log("Upload successful, CID:", uploadResult.cid);

      try {
        // 2. Try to retrieve it
        console.log("Attempting to retrieve content from IPFS...");
        const retrievedContent = await secureStorageService.fetchFromIPFS(
          uploadResult.cid
        );

        return res.json({
          success: true,
          uploaded: {
            cid: uploadResult.cid,
            fileName: req.file.originalname,
            url: `https://dweb.link/ipfs/${uploadResult.cid}`,
          },
          retrieved: {
            success: true,
            contentPreview:
              typeof retrievedContent === "object"
                ? JSON.stringify(retrievedContent).substring(0, 100) + "..."
                : String(retrievedContent).substring(0, 100) + "...",
          },
        });
      } catch (retrievalError) {
        console.error("Retrieval error:", retrievalError);
        return res.json({
          success: true,
          uploaded: {
            cid: uploadResult.cid,
            fileName: req.file.originalname,
            url: `https://dweb.link/ipfs/${uploadResult.cid}`,
          },
          retrieved: {
            success: false,
            error: retrievalError.message,
          },
        });
      }
    } catch (error) {
      console.error("IPFS flow test error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "IPFS flow test failed",
      });
    }
  }
);

// Production file upload route
apiRouter.post("/storage/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file provided",
      });
    }

    // Parse metadata if provided
    let metadata = {};
    if (req.body.metadata) {
      try {
        metadata = JSON.parse(req.body.metadata);
      } catch (e) {
        console.warn("Invalid metadata JSON:", e);
      }
    }

    // Add user information if authenticated
    if (req.user) {
      metadata.userId = req.user.id;
      metadata.userAddress = req.user.address;
    }

    // Add IP address for audit
    metadata.ipAddress = req.ip;

    // Upload file to IPFS
    const uploadResult = await secureStorageService.uploadToIPFS({
      buffer: req.file.buffer,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });

    // Return success response
    return res.json({
      success: true,
      reference: uploadResult.cid,
      cid: uploadResult.cid,
      url: uploadResult.url || `https://dweb.link/ipfs/${uploadResult.cid}`,
      fileName: req.file.originalname,
      metadata: {
        ...metadata,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Upload failed",
    });
  }
});

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
