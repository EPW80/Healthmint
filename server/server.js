// server/server.js
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");
const morgan = require("morgan");
const session = require("express-session");

// Import merged configuration
const {
  ENV,
  ENV_CONFIG,
  ENDPOINTS,
  ERROR_CODES,
} = require("./config/networkConfig");

const { connectDB, disconnectDB } = require("./config/db");

// Import middleware
const hipaaCompliance = require("./middleware/hipaaCompliance");
const { errorHandler } = require("./middleware/errorHandler");

// Import routes
const authRoutes = require("./routes/auth");
const dataRoutes = require("./routes/data");
const profileRoutes = require("./routes/profile");
const usersRoutes = require("./routes/users");
const browseRoutes = require("./routes/browse");

// Initialize express
const app = express();

// Enhanced CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    const origins =
      ENV.NODE_ENV === "production"
        ? ENV_CONFIG.production.cors.origins
        : [...ENV_CONFIG.development.cors.origins, undefined, "null"];

    if (!origin || origins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`Blocked CORS request from unauthorized origin: ${origin}`);
      callback(new Error(ERROR_CODES.FORBIDDEN.message));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],
  exposedHeaders: ["Content-Range", "X-Content-Range"],
  maxAge: ENV.NODE_ENV === "production" ? 86400 : 3600,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

// Apply security middleware
app.use(
  helmet({
    contentSecurityPolicy: ENV_CONFIG[ENV.NODE_ENV].enableCSP
      ? {
          directives: {
            defaultSrc: ["'self'"],
            connectSrc: ["'self'", ENV.API_URL],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "blob:"],
            fontSrc: ["'self'", "data:"],
          },
        }
      : false,
    crossOriginEmbedderPolicy: { policy: "credentialless" },
    crossOriginOpenerPolicy: { policy: "same-origin" },
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

// Request parsing with configured size limits
app.use(
  express.json({
    limit: ENV_CONFIG[ENV.NODE_ENV].requestSizeLimit,
  })
);
app.use(
  express.urlencoded({
    extended: true,
    limit: ENV_CONFIG[ENV.NODE_ENV].requestSizeLimit,
  })
);

// Logging configuration
if (ENV.NODE_ENV !== "production") {
  app.use(morgan("dev"));
} else {
  app.use(
    morgan("combined", {
      skip: (req) => req.path === "/health",
    })
  );
}

// Rate limiting configuration
const createLimiter = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message: message || ERROR_CODES.RATE_LIMIT.message,
      code: ERROR_CODES.RATE_LIMIT.code,
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

// Different rate limits for different endpoints
const apiLimiter = createLimiter(
  ENV_CONFIG[ENV.NODE_ENV].rateLimitWindow,
  ENV_CONFIG[ENV.NODE_ENV].rateLimitMax
);

const browseLimiter = createLimiter(60 * 1000, 100, "Too many browse requests");
const uploadLimiter = createLimiter(
  60 * 60 * 1000,
  50,
  "Too many upload requests"
);

// Session configuration
const sessionOptions = {
  secret: process.env.SESSION_SECRET || "your-secret-key",
  resave: false,
  saveUninitialized: false,
  name: "sessionId",
  cookie: {
    secure: ENV.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "strict",
    maxAge: ENV_CONFIG[ENV.NODE_ENV].sessionDuration,
    path: "/",
  },
};

if (ENV.NODE_ENV === "production") {
  app.set("trust proxy", 1);
  sessionOptions.cookie.secure = true;
}

app.use(session(sessionOptions));

// HIPAA compliance middleware
app.use(hipaaCompliance.auditLog);
const accessControlMiddleware = hipaaCompliance.accessControl();

// API Routes
const apiPrefix = "/api/v1";

// Health check route
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Service is operational",
    timestamp: new Date().toISOString(),
    environment: ENV.NODE_ENV,
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
  });
});

// API Routes with correct mounting
app.use(`${apiPrefix}/auth`, apiLimiter, authRoutes);
app.use(
  `${apiPrefix}/data`,
  uploadLimiter,
  accessControlMiddleware,
  dataRoutes
);
app.use(
  `${apiPrefix}/browse`,
  browseLimiter,
  accessControlMiddleware,
  browseRoutes
);
app.use(
  `${apiPrefix}/profile`,
  apiLimiter,
  accessControlMiddleware,
  profileRoutes
);
app.use(`${apiPrefix}/users`, apiLimiter, accessControlMiddleware, usersRoutes);

// 404 handler
app.use((req, res) => {
  res.status(ERROR_CODES.NOT_FOUND.status).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    code: ERROR_CODES.NOT_FOUND.code,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use(errorHandler);

// Server startup with enhanced error handling
const startServer = async () => {
  try {
    await connectDB();
    const PORT = process.env.PORT || ENV_CONFIG[ENV.NODE_ENV].defaultPort;

    const server = app.listen(PORT, () => {
      console.log(`✓ Server running in ${ENV.NODE_ENV} mode on port ${PORT}`);
      console.log(
        `✓ Health check available at http://localhost:${PORT}/health`
      );
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      console.log(`\n${signal} received. Starting graceful shutdown...`);

      server.close(async () => {
        console.log("✓ HTTP server closed");
        try {
          await disconnectDB();
          console.log("✓ Database connection closed");
          process.exit(0);
        } catch (err) {
          console.error("Error during cleanup:", err);
          process.exit(1);
        }
      });

      // Force shutdown after timeout
      setTimeout(() => {
        console.error("Could not close connections in time, forcing shutdown");
        process.exit(1);
      }, ENV_CONFIG[ENV.NODE_ENV].shutdownTimeout);
    };

    // Handle shutdown signals
    ["SIGTERM", "SIGINT", "SIGUSR2"].forEach((signal) => {
      process.on(signal, () => shutdown(signal));
    });

    // Handle uncaught exceptions
    process.on("uncaughtException", (error) => {
      console.error("Uncaught Exception:", error);
      shutdown("UNCAUGHT_EXCEPTION");
    });

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (reason, promise) => {
      console.error("Unhandled Rejection at:", promise, "reason:", reason);
      shutdown("UNHANDLED_REJECTION");
    });
  } catch (err) {
    console.error("Server startup error:", err);
    process.exit(1);
  }
};

// Start server if this is the main module
if (require.main === module) {
  startServer();
}

module.exports = app;
