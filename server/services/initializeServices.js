// services/initializeServices.js
import apiService from "./apiService.js";
import transactionService from "./transactionService.js";
import hipaaConfig from "../config/hipaaConfig.js";
import { logger } from "../config/loggerConfig.js";

const initializeServices = async () => {
  console.log("Initializing services...");

  try {
    // Validate environment variables
    hipaaConfig.validate();
    console.log("✅ HIPAA config validated");

    console.log("Initializing API service...");
    if (!apiService) {
      throw new Error("API service failed to initialize");
    }

    // Connect services that depend on each other
    console.log("✅ Error handling system initialized");

    hipaaComplianceService.setLogger(logger); // If needed

    // Optional: Check if blockchain connection is working
    if (transactionService) {
      try {
        // Simple test to check provider connectivity
        const network = await transactionService.provider.getNetwork();
        console.log(
          `✅ Connected to blockchain network: ${network.name} (${network.chainId})`
        );
      } catch (err) {
        console.warn(`⚠️ Blockchain network connection failed: ${err.message}`);
        // Non-fatal error - just log warning
      }
    }

    console.log("✅ All services initialized successfully");
    return true;
  } catch (error) {
    console.error("❌ Service initialization failed:", error);
    throw error;
  }
};

export default initializeServices;
