// index.js
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

// Setup directory structure for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define standard locations for .env files
const possibleEnvPaths = [
  path.resolve(__dirname, "../.env"), // Project root .env
  path.resolve(__dirname, ".env"), // Server directory .env
  path.resolve(process.cwd(), ".env"), // Current working directory .env
];

// Load environment variables from the first available .env file
let envLoaded = false;
for (const envPath of possibleEnvPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log(`✅ Loaded environment variables from ${envPath}`);
    envLoaded = true;
    break;
  }
}

// Fall back to system environment variables if no .env file found
if (!envLoaded) {
  console.warn("⚠️ No .env file found, using system environment variables");
  dotenv.config();
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
const requiredEnvVars = [
  { name: "ENCRYPTION_KEY", fallback: null },
  { name: "JWT_SECRET", fallback: null },
  { name: "PORT", fallback: "5000" },
  { name: "NODE_ENV", fallback: "development" },
];

// Apply fallback values and track missing required variables
const missingVars = [];
requiredEnvVars.forEach(({ name, fallback }) => {
  if (!process.env[name]) {
    if (fallback !== null) {
      process.env[name] = fallback;
      console.warn(`⚠️ Using fallback value for ${name}: ${fallback}`);
    } else {
      missingVars.push(name);
    }
  }
});

// Exit if critical variables are missing
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

    // We don't need to explicitly call a method on the server object
    // since server.js already sets up the HTTP server listening
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
