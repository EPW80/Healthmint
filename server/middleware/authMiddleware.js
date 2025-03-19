// middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import { ApiError, createApiError } from "../utils/apiError.js";
import { ERROR_CODES } from "../config/networkConfig.js";
import { User } from "../models/User.js";

/**
 * Authentication middleware
 * Verifies JWT token and adds user information to request object
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authMiddleware = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return next(
        new ApiError(ERROR_CODES.UNAUTHORIZED.code, "Authentication required")
      );
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Extract roles from token - support both single role and roles array
      const userRoles = decoded.roles || (decoded.role ? [decoded.role] : []);

      // Set user info from token
      req.user = {
        id: decoded.id,
        role: decoded.role, // For backward compatibility
        roles: userRoles,
        address: decoded.address,
      };

      // For sensitive operations, verify user in the database
      if (req.method !== "GET" || req.path.includes("/sensitive/")) {
        try {
          // Optional database check for highly sensitive operations
          const user = await User.findByAddress(req.user.address);

          if (user && user.role && !req.user.roles.includes(user.role)) {
            // If database has a role that's not in the token, add it
            req.user.roles = [...req.user.roles, user.role];
          }
        } catch (dbError) {
          console.warn(
            "Database check in auth middleware failed:",
            dbError.message
          );
          // Continue with token data only
        }
      }

      next();
    } catch (error) {
      // Handle different JWT error types
      if (error.name === "TokenExpiredError") {
        return next(
          new ApiError(ERROR_CODES.UNAUTHORIZED.code, "Token expired")
        );
      } else if (error.name === "JsonWebTokenError") {
        return next(
          new ApiError(ERROR_CODES.UNAUTHORIZED.code, "Invalid token")
        );
      } else {
        return next(
          new ApiError(
            ERROR_CODES.UNAUTHORIZED.code,
            "Invalid or expired token"
          )
        );
      }
    }
  } catch (error) {
    console.error("Auth middleware error:", error);
    return next(
      new ApiError(ERROR_CODES.SERVER_ERROR.code, "Authentication error")
    );
  }
};

/**
 * Role-based authorization middleware
 * Verifies that the user has required roles
 *
 * @param {string|Array} roles - Required role(s) for access
 * @returns {Function} Middleware function
 */
export const authorize = (roles) => {
  // Convert to array if single role
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  return (req, res, next) => {
    if (!req.user) {
      return next(
        new ApiError(ERROR_CODES.UNAUTHORIZED.code, "Authentication required")
      );
    }

    // Check if user has any of the required roles
    const userRoles = req.user.roles || [req.user.role];
    const hasRole = allowedRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      return next(
        new ApiError(ERROR_CODES.FORBIDDEN.code, "Insufficient permissions")
      );
    }

    next();
  };
};

export default authMiddleware;
