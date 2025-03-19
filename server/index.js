// index.js
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

// Setup directory structure for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try to load environment variables
try {
  const envPath = path.resolve(__dirname, ".env");
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log("✅ Loaded environment variables from .env");
  } else {
    console.warn("⚠️ No .env file found, using system environment variables");
    dotenv.config();
  }
} catch (error) {
  console.error("❌ Error loading environment variables:", error.message);
  process.exit(1);
}

// Initialize required directories
const dirs = ["logs", "uploads", "data"];
dirs.forEach((dir) => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    try {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`✅ Created directory: ${dir}`);
    } catch (err) {
      console.warn(`⚠️ Could not create directory ${dir}: ${err.message}`);
    }
  }
});

// Check for critical environment variables
const requiredEnvVars = ["ENCRYPTION_KEY", "JWT_SECRET"];
const missingVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingVars.length > 0) {
  console.error(
    `❌ Missing required environment variables: ${missingVars.join(", ")}`
  );
  console.error(
    "❌ Please set these variables in your .env file or run the setup script: node scripts/setupEnv.js"
  );
  process.exit(1);
}

// Import and start the server after environment validation
import initializeServices from "./services/initializeServices.js";
import server from "./server.js";

// Wrap server startup in async function to properly handle errors
const startServer = async () => {
  try {
    // Initialize all services
    await initializeServices();

    // Start server (server.js handles listening on PORT)
    console.log("✅ Server initialization complete");
  } catch (error) {
    console.error("❌ Fatal error starting server:", error);
    process.exit(1);
  }
};

// Handle uncaught exceptions and unhandled rejections
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Start the server
startServer();
