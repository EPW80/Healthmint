import { create } from "@web3-storage/w3up-client";

export async function createAuthenticatedClient() {
  try {
    console.log("Creating storage client with w3up-client");

    // Create the client
    const client = await create();

    // Get the DID from environment variable to ensure we use the right space
    const spaceDID = process.env.WEB3_STORAGE_TOKEN;

    // Check if it's what we expect
    if (
      spaceDID !== "did:key:z6MkqqowtdccpY2kJxXcfSr27xCKKCL1eFL6wSBZq1ATUgzo"
    ) {
      console.warn(
        "⚠️ Environment variable space DID doesn't match expected space"
      );
    }

    // First authenticate with email
    if (process.env.WEB3_AUTH_EMAIL) {
      try {
        console.log(
          `Authenticating with email: ${process.env.WEB3_AUTH_EMAIL}`
        );
        await client.login(process.env.WEB3_AUTH_EMAIL);

        // Specifically set the correct space instead of using default from email login
        console.log(`Forcing use of space: ${spaceDID}`);

        try {
          // For newer clients: first add the space, then set it
          await client.addSpace(spaceDID);
          console.log(`Added space: ${spaceDID}`);
        } catch (err) {
          console.log(`Space may already be added: ${err.message}`);
          // Continue anyway - it might be already added
        }

        // Now try to set it as current space
        await client.setCurrentSpace(spaceDID);
        console.log(`Successfully set current space to: ${spaceDID}`);

        // Verify we're using the correct space
        const currentSpace = client.currentSpace();
        console.log(`Current space is now: ${currentSpace.did()}`);

        if (currentSpace.did() !== spaceDID) {
          console.error(
            "❌ Failed to set the correct space! Using fallback options..."
          );
        }

        return client;
      } catch (err) {
        console.error("Email authentication failed:", err);
      }
    }

    // Fall back to direct space setting if email login fails
    try {
      console.log(`Attempting to directly set space: ${spaceDID}`);
      await client.setCurrentSpace(spaceDID);
      console.log("✅ Successfully set space directly");
      return client;
    } catch (err) {
      console.error("Failed to set space directly:", err);
    }

    console.log(
      "All Web3Storage authentication methods failed, falling back to local storage"
    );
    return null;
  } catch (error) {
    console.error("⚠️ Web3Storage connection failed:", error);
    return null;
  }
}
