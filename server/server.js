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

// Debugging Environment Variables
console.log(
  "✅ Loaded ENCRYPTION_KEY:",
  process.env.ENCRYPTION_KEY ? "Present" : "❌ Not Found"
);
console.log(
  "✅ Loaded JWT_SECRET:",
  process.env.JWT_SECRET ? "Present" : "❌ Not Found"
);
console.log("✅ Running in:", process.env.NODE_ENV || "development");

const app = express();
const PORT = parseInt(process.env.PORT ?? "5000", 10);

// CORS Preflight Handling for OPTIONS requests
app.options("*", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return res.sendStatus(204); // ✅ No Content response for preflight
});

// Basic Middleware
app.use(
  cors({
    origin: "http://localhost:3000", // Explicitly allow frontend origin
    credentials: true, // Allow cookies and authentication headers
    methods: "GET,POST,OPTIONS",
    allowedHeaders: "Content-Type,Authorization",
  })
);
app.use(helmet());
app.use(express.json());
app.use(morgan("dev")); // Log HTTP requests in the terminal

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
  });
});

// Graceful Shutdown Handling
process.on("SIGINT", () => {
  console.log("\n🔴 Server shutting down gracefully...");
  process.exit(0);
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log("Available routes:");
  console.log("  GET  /");
  console.log("  GET  /health");
  console.log("  POST /api/auth/wallet/connect");
});

export default app;
