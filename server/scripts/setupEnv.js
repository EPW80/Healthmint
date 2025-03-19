// scripts/setupEnv.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import dotenv from "dotenv";

// Get directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const envPath = path.join(rootDir, ".env");

// Generate secure random key for encryption
const generateEncryptionKey = () => {
  return crypto.randomBytes(32).toString("hex");
};

// Generate secure JWT secret
const generateJwtSecret = () => {
  return crypto.randomBytes(64).toString("hex");
};

/**
 * Create or update environment variables file
 */
const setupEnvironmentVariables = () => {
  try {
    console.log("Setting up environment variables...");

    // Check if .env file exists
    let envContent = "";
    let existingVars = {};

    if (fs.existsSync(envPath)) {
      console.log("Found existing .env file");
      envContent = fs.readFileSync(envPath, "utf8");
      existingVars = dotenv.parse(envContent);
    }

    // Required variables with default values
    const requiredVars = {
      PORT: "5000",
      NODE_ENV: "development",
      MONGODB_URI: "mongodb://localhost:27017/healthmint",
      ENCRYPTION_KEY: existingVars.ENCRYPTION_KEY || generateEncryptionKey(),
      JWT_SECRET: existingVars.JWT_SECRET || generateJwtSecret(),
      JWT_EXPIRY: "24h",
      ALLOWED_ORIGINS:
        "http://localhost:3000,http://localhost:5000,https://healthmint.com",
      SEPOLIA_RPC_URL: "https://sepolia.infura.io/v3/YOUR_INFURA_KEY",
      CONTRACT_ADDRESS: "0x0000000000000000000000000000000000000000", // Replace with your contract address
    };

    // Merge existing variables with required ones
    const mergedVars = { ...existingVars, ...requiredVars };

    // Create content for .env file
    let newEnvContent = "# Healthmint Environment Variables\n";
    newEnvContent += "# Auto-generated - DO NOT share these values\n\n";

    for (const [key, value] of Object.entries(mergedVars)) {
      newEnvContent += `${key}=${value}\n`;
    }

    // Write to file
    fs.writeFileSync(envPath, newEnvContent);
    console.log("✅ Environment variables setup complete");

    // Output important information
    console.log("\nImportant variables:");
    console.log(`PORT: ${mergedVars.PORT}`);
    console.log(`NODE_ENV: ${mergedVars.NODE_ENV}`);
    console.log(
      `ENCRYPTION_KEY: ${mergedVars.ENCRYPTION_KEY.substring(0, 6)}...${mergedVars.ENCRYPTION_KEY.substring(mergedVars.ENCRYPTION_KEY.length - 6)}`
    );
    console.log(
      `JWT_SECRET: ${mergedVars.JWT_SECRET.substring(0, 6)}...${mergedVars.JWT_SECRET.substring(mergedVars.JWT_SECRET.length - 6)}`
    );

    console.log(
      "\n⚠️ Note: For production, make sure to set secure, unique values for these variables."
    );

    if (mergedVars.SEPOLIA_RPC_URL.includes("YOUR_INFURA_KEY")) {
      console.log(
        "\n⚠️ Warning: You need to update SEPOLIA_RPC_URL with your Infura API key"
      );
    }

    if (
      mergedVars.CONTRACT_ADDRESS ===
      "0x0000000000000000000000000000000000000000"
    ) {
      console.log(
        "\n⚠️ Warning: You need to update CONTRACT_ADDRESS with your deployed contract address"
      );
    }
  } catch (error) {
    console.error("Error setting up environment variables:", error);
    process.exit(1);
  }
};

// Run setup
setupEnvironmentVariables();
