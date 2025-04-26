import { create } from "@web3-storage/w3up-client";

export async function createAuthenticatedClient() {
  try {
    // Create the client without token - we'll use local storage
    console.log("Creating storage client with w3up-client");
    return null; // Return null to trigger fallback to local storage
  } catch (error) {
    console.error("❌ Failed to create storage client:", error);
    throw error;
  }
}
