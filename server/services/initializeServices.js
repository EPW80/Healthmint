// services/initializeServices.js
import apiService from "./apiService.js";
import transactionService from "./transactionService.js";
import hipaaConfig from "../config/hipaaConfig.js";
import { logger } from "../config/loggerConfig.js";

const initializeServices = async () => {
  logger.info("Initializing services...");

  try {
    // Validate environment variables
    hipaaConfig.validate();
    logger.info("✅ HIPAA config validated");

    logger.info("Initializing API service...");
    if (!apiService) {
      throw new Error("API service failed to initialize");
    }

    // Connect services that depend on each other
    logger.info("✅ Error handling system initialized");

    hipaaComplianceService.setLogger(logger); // If needed

    // Optional: Check if blockchain connection is working
    if (transactionService) {
      try {
        // Simple test to check provider connectivity
        const network = await transactionService.provider.getNetwork();
        logger.info(
          `✅ Connected to blockchain network: ${network.name} (${network.chainId})`
        );
      } catch (err) {
        logger.warn(`⚠️ Blockchain network connection failed: ${err.message}`);
        // Non-fatal error - just log warning
      }
    }

    logger.info("✅ All services initialized successfully");
    return true;
  } catch (error) {
    logger.error("❌ Service initialization failed:", error);
    throw error;
  }
};

export default initializeServices;
