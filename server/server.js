import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

// Convert __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 5000;

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

// Import Routes (ES Module compatible dynamic import)
import authRoutes from "./routes/auth.js";
import dataRoutes from "./routes/data.js";

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

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log("Available routes:");
  console.log("  GET  /");
  console.log("  GET  /health");
  console.log("  POST /api/auth/wallet/connect");
});

export default app;
