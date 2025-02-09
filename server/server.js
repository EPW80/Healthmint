// server/server.js
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const app = express();

app.options("*", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return res.sendStatus(204); // ✅ No Content response for preflight
});


// Basic middleware
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
app.use(morgan("dev")); // Use dev logging for better visibility

// Import routes
const authRoutes = require("./routes/auth");

// Basic root route for testing
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Healthmint API Server",
    timestamp: new Date().toISOString(),
  });
});

// Health check route
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Service is operational",
    timestamp: new Date().toISOString(),
  });
});

// Mount auth routes - explicitly log the mounting
console.log("Mounting auth routes at /api/auth");
app.use("/api/auth", authRoutes);

// Debug logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
    timestamp: new Date().toISOString(),
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log("Available routes:");
  console.log("  GET  /");
  console.log("  GET  /health");
  console.log("  POST /api/auth/wallet/connect");
});

module.exports = app;
