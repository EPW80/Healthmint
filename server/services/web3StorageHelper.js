import { create } from "@web3-storage/w3up-client";
import { logger } from "../config/loggerConfig.js";

export async function createAuthenticatedClient() {
  try {
    logger.info("Creating storage client with w3up-client");

    // Create the client
    const client = await create();

    // Get the DID from environment variable to ensure we use the right space
    const spaceDID = process.env.WEB3_STORAGE_TOKEN;

    // Check if it's what we expect
    if (
      spaceDID !== "did:key:z6MkqqowtdccpY2kJxXcfSr27xCKKCL1eFL6wSBZq1ATUgzo"
    ) {
      logger.warn(
        "Environment variable space DID doesn't match expected space"
      );
    }

    // First authenticate with email
    if (process.env.WEB3_AUTH_EMAIL) {
      try {
        logger.info(
          `Authenticating with email: ${process.env.WEB3_AUTH_EMAIL}`
        );
        await client.login(process.env.WEB3_AUTH_EMAIL);

        // Specifically set the correct space instead of using default from email login
        logger.info(`Forcing use of space: ${spaceDID}`);

        try {
          // For newer clients: first add the space, then set it
          await client.addSpace(spaceDID);
          logger.info(`Added space: ${spaceDID}`);
        } catch (err) {
          logger.info(`Space may already be added: ${err.message}`);
          // Continue anyway - it might be already added
        }

        // Now try to set it as current space
        await client.setCurrentSpace(spaceDID);
        logger.info(`Successfully set current space to: ${spaceDID}`);

        // Verify we're using the correct space
        const currentSpace = client.currentSpace();
        logger.info(`Current space is now: ${currentSpace.did()}`);

        if (currentSpace.did() !== spaceDID) {
          logger.error(
            "Failed to set the correct space! Using fallback options..."
          );
        }

        return client;
      } catch (err) {
        logger.error("Email authentication failed:", err);
      }
    }

    // Fall back to direct space setting if email login fails
    try {
      logger.info(`Attempting to directly set space: ${spaceDID}`);
      await client.setCurrentSpace(spaceDID);
      logger.info("Successfully set space directly");
      return client;
    } catch (err) {
      logger.error("Failed to set space directly:", err);
    }

    logger.info(
      "All Web3Storage authentication methods failed, falling back to local storage"
    );
    return null;
  } catch (error) {
    logger.error("Web3Storage connection failed:", error);
    return null;
  }
}
