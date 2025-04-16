// /home/epw/Healthmint-copyone/Healthmint-two/server/services/authService.js
import jwt from "jsonwebtoken";
import crypto from "crypto";

// This class handles authentication and token management
class AuthService {
  constructor() {
    this.JWT_SECRET = process.env.JWT_SECRET || "healthmint-dev-secret-key";
    this.JWT_EXPIRY = process.env.JWT_EXPIRY || "24h";
    this.REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || "7d";

    // In-memory challenge storage (in production, use Redis or similar)
    this.challengeStore = new Map();
  }

  // Generate a challenge for a given address
  generateChallenge(address) {
    if (!address) throw new Error("Address is required");

    // Normalize address
    const normalizedAddress = address.toLowerCase();

    // Generate a secure random nonce
    const nonce = crypto.randomBytes(32).toString("hex");

    // Store the nonce with timestamp (for expiration)
    this.challengeStore.set(normalizedAddress, {
      nonce,
      timestamp: Date.now(),
    });

    return nonce;
  }

  // Verify the challenge using the address and nonce
  verifyChallenge(address, nonce) {
    if (!address || !nonce) return false;

    const normalizedAddress = address.toLowerCase();
    const storedChallenge = this.challengeStore.get(normalizedAddress);

    if (!storedChallenge) return false;

    // Check if challenge has expired (5 minutes)
    const expiry = 5 * 60 * 1000; // 5 minutes in milliseconds
    if (Date.now() - storedChallenge.timestamp > expiry) {
      this.challengeStore.delete(normalizedAddress);
      return false;
    }

    // Verify the nonce matches
    const isValid = storedChallenge.nonce === nonce;

    // Clean up after verification
    if (isValid) {
      this.challengeStore.delete(normalizedAddress);
    }

    return isValid;
  }

  // Generate JWT token and refresh token
  generateTokens(payload) {
    if (!payload) throw new Error("Payload is required");

    // Create the token
    const token = jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRY,
    });

    // Create a refresh token
    const refreshToken = crypto.randomBytes(40).toString("hex");

    // Return token info
    return {
      token,
      refreshToken,
      expiresIn: this.getExpirySeconds(this.JWT_EXPIRY),
    };
  }

  // Verify the JWT token
  verifyToken(token) {
    if (!token) return null;

    try {
      const decoded = jwt.verify(token, this.JWT_SECRET);
      return decoded;
    } catch (error) {
      console.error("Token verification error:", error.message);
      return null;
    }
  }

  // Refresh the JWT token using the refresh token
  getExpirySeconds(expiryString) {
    const unit = expiryString.charAt(expiryString.length - 1);
    const value = parseInt(expiryString.slice(0, -1), 10);

    switch (unit) {
      case "s":
        return value;
      case "m":
        return value * 60;
      case "h":
        return value * 60 * 60;
      case "d":
        return value * 24 * 60 * 60;
      default:
        return 24 * 60 * 60; // Default 24 hours
    }
  }

  // Extract token from the authorization header
  extractTokenFromHeader(authHeader) {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }

    return authHeader.substring(7); // Remove 'Bearer ' prefix
  }

  // Middleware to ensure the request is authenticated
  ensureAuthenticated(req) {
    // Get the auth header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    // Extract the token
    const token = this.extractTokenFromHeader(authHeader);
    if (!token) {
      throw new Error("Invalid token format");
    }

    // Verify the token
    const decoded = this.verifyToken(token);
    if (!decoded) {
      throw new Error("Invalid or expired token");
    }

    return decoded;
  }
}

// Create singleton instance
const authService = new AuthService();

export default authService;
