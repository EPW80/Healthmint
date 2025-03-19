// /home/epw/Healthmint-copyone/Healthmint-two/server/services/authService.js
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

/**
 * Server-side Authentication Service
 * 
 * Handles authentication-related functionality including JWT token management,
 * nonce generation for wallet-based authentication, and signature verification.
 */
class AuthService {
  constructor() {
    this.JWT_SECRET = process.env.JWT_SECRET || 'healthmint-dev-secret-key';
    this.JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';
    this.REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d';
    
    // In-memory challenge storage (in production, use Redis or similar)
    this.challengeStore = new Map();
  }

  /**
   * Generate a secure nonce/challenge for authentication
   * @param {string} address - Wallet address requesting challenge
   * @returns {string} Secure nonce
   */
  generateChallenge(address) {
    if (!address) throw new Error('Address is required');
    
    // Normalize address
    const normalizedAddress = address.toLowerCase();
    
    // Generate a secure random nonce
    const nonce = crypto.randomBytes(32).toString('hex');
    
    // Store the nonce with timestamp (for expiration)
    this.challengeStore.set(normalizedAddress, {
      nonce,
      timestamp: Date.now()
    });
    
    return nonce;
  }

  /**
   * Verify a stored challenge for an address
   * @param {string} address - Wallet address
   * @param {string} nonce - Nonce to verify
   * @returns {boolean} Verification result
   */
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

  /**
   * Generate a JWT token
   * @param {Object} payload - Token payload
   * @returns {Object} JWT token and refresh token
   */
  generateTokens(payload) {
    if (!payload) throw new Error('Payload is required');
    
    // Create the token
    const token = jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRY
    });
    
    // Create a refresh token
    const refreshToken = crypto.randomBytes(40).toString('hex');
    
    // Return token info
    return {
      token,
      refreshToken,
      expiresIn: this.getExpirySeconds(this.JWT_EXPIRY),
    };
  }

  /**
   * Verify JWT token
   * @param {string} token - JWT token to verify
   * @returns {Object|null} Decoded token or null if invalid
   */
  verifyToken(token) {
    if (!token) return null;
    
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET);
      return decoded;
    } catch (error) {
      console.error('Token verification error:', error.message);
      return null;
    }
  }

  /**
   * Get expiry time in seconds from string like '24h', '7d', etc.
   * @param {string} expiryString - Expiry time string
   * @returns {number} Expiry in seconds
   */
  getExpirySeconds(expiryString) {
    const unit = expiryString.charAt(expiryString.length - 1);
    const value = parseInt(expiryString.slice(0, -1), 10);
    
    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 60 * 60;
      case 'd': return value * 24 * 60 * 60;
      default: return 24 * 60 * 60; // Default 24 hours
    }
  }

  /**
   * Extract token from authorization header
   * @param {string} authHeader - Authorization header
   * @returns {string|null} JWT token or null
   */
  extractTokenFromHeader(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    return authHeader.substring(7); // Remove 'Bearer ' prefix
  }

  /**
   * Ensure a valid token and extracted user ID
   * Used as middleware or in other services
   * @param {Object} req - Express request object with headers
   * @returns {Object} User info from token
   */
  ensureAuthenticated(req) {
    // Get the auth header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new Error('No authorization header provided');
    }
    
    // Extract the token
    const token = this.extractTokenFromHeader(authHeader);
    if (!token) {
      throw new Error('Invalid token format');
    }
    
    // Verify the token
    const decoded = this.verifyToken(token);
    if (!decoded) {
      throw new Error('Invalid or expired token');
    }
    
    return decoded;
  }
}

// Create singleton instance
const authService = new AuthService();

export default authService;