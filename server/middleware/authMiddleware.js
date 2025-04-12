import jwt from "jsonwebtoken";
import { ApiError } from "../utils/apiError.js";
import { ERROR_CODES } from "../config/networkConfig.js";
import User from "../models/User.js";
import { logger } from "../config/loggerConfig.js";
import hipaaCompliance from "../middleware/hipaaCompliance.js";
import { AUDIT_TYPES, SECURITY_SETTINGS } from "../constants/index.js";

const extractToken = (req) => {
  try {
    // Check Authorization header first (Bearer token)
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      return authHeader.split(" ")[1];
    }

    // Check for token in cookie as fallback
    if (req.cookies?.token) {
      return req.cookies.token;
    }

    // Check custom header as another fallback
    if (req.headers["x-access-token"]) {
      return req.headers["x-access-token"];
    }

    return null;
  } catch (error) {
    logger.error("Token extraction error", { error: error.message });
    return null;
  }
};

// Verify JWT token and decode payload
const verifyToken = (token) => {
  try {
    // Get JWT secret from environment variables with fallback
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error("JWT_SECRET not configured");
    }

    // Verify token with appropriate options
    const decoded = jwt.verify(token, jwtSecret, {
      algorithms: ["HS256"], // Restrict to specific algorithm
      clockTolerance: 30, // Allow 30 seconds clock skew
      ignoreExpiration: false, // Never ignore expiration
      maxAge: SECURITY_SETTINGS.TOKEN_EXPIRY, // Maximum age validation
    });

    return decoded;
  } catch (error) {
    logger.debug("Token verification failed", {
      errorName: error.name,
      errorMessage: error.message,
    });
    throw error;
  }
};

// Middleware function to authenticate user
const authMiddleware = async (req, res, next) => {
  const requestId = req.id || `req_${Date.now()}`;
  const requestLogger = logger.child({ requestId });

  try {
    // Check for public routes that don't require authentication
    if (isPublicRoute(req.path)) {
      return next();
    }

    // Extract token from request
    const token = extractToken(req);

    if (!token) {
      requestLogger.info("Authentication failed - no token provided", {
        path: req.path,
        method: req.method,
        ip: req.ip,
      });

      return next(
        new ApiError(ERROR_CODES.UNAUTHORIZED.code, "Authentication required")
      );
    }

    try {
      // Verify and decode token
      const decoded = verifyToken(token);

      // Extract roles from token (support both formats)
      const userRoles = decoded.roles || (decoded.role ? [decoded.role] : []);

      // Create user object from token data
      req.user = {
        id: decoded.id,
        role: decoded.role, // Keep for backward compatibility
        roles: userRoles,
        address: decoded.address,
        iat: decoded.iat,
        exp: decoded.exp,
      };

      // Set token expiration time for response headers
      res.set("X-Token-Expires", new Date(decoded.exp * 1000).toISOString());

      // Enhance with request-specific logger
      req.logger = requestLogger.child({ userId: req.user.id });

      // Determine if we need to perform additional verification
      const needsVerification = shouldVerifyUserInDatabase(req);

      if (needsVerification) {
        try {
          // Fetch user from database to verify existence and current roles
          const user = await User.findByAddress(req.user.address);

          if (!user) {
            requestLogger.warn("User in token not found in database", {
              address: req.user.address,
            });

            // Optional: Create audit log for security monitoring
            await hipaaCompliance.createAuditLog(AUDIT_TYPES.UNAUTHORIZED, {
              tokenAddress: req.user.address,
              ip: req.ip,
              userAgent: req.get("User-Agent"),
              action: "USER_NOT_FOUND",
            });

            return next(
              new ApiError(
                ERROR_CODES.UNAUTHORIZED.code,
                "User account not found"
              )
            );
          }

          // Check for account lockout
          if (
            user.security?.lockoutUntil &&
            user.security.lockoutUntil > new Date()
          ) {
            requestLogger.warn("Account locked out", {
              address: req.user.address,
              lockoutUntil: user.security.lockoutUntil,
            });

            return next(
              new ApiError(
                ERROR_CODES.FORBIDDEN.code,
                `Account locked. Try again after ${new Date(user.security.lockoutUntil).toLocaleString()}`
              )
            );
          }

          // Merge additional user properties from database
          enhanceUserFromDatabase(req.user, user);

          // Create audit log for successful authentication
          await hipaaCompliance.createAuditLog(AUDIT_TYPES.ACCESS_GRANTED, {
            userId: user.id,
            address: user.address,
            ip: req.ip,
            userAgent: req.get("User-Agent"),
            action: "AUTHENTICATED",
            path: req.path,
          });
        } catch (dbError) {
          requestLogger.error("Database verification failed", {
            error: dbError.message,
            stack:
              process.env.NODE_ENV === "development"
                ? dbError.stack
                : undefined,
          });

          // Continue with token-only data but log the issue
          await hipaaCompliance.createAuditLog(AUDIT_TYPES.SYSTEM_ERROR, {
            error: "AUTH_DB_ERROR",
            message: dbError.message,
            ip: req.ip,
          });
        }
      }

      // Successfully authenticated
      next();
    } catch (jwtError) {
      // Handle specific JWT error types
      handleJwtError(jwtError, req, next, requestLogger);
    }
  } catch (error) {
    requestLogger.error("Authentication middleware error", {
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });

    return next(
      new ApiError(
        ERROR_CODES.SERVER_ERROR.code,
        "Authentication processing error"
      )
    );
  }
};

const isPublicRoute = (path) => {
  const publicPaths = [
    "/health",
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/wallet/connect",
    "/api/docs",
    "/api/public",
  ];

  return publicPaths.some((publicPath) => path.startsWith(publicPath));
};

const shouldVerifyUserInDatabase = (req) => {
  // Always verify non-GET methods (modifying operations)
  if (req.method !== "GET") return true;

  // Verify sensitive operations
  if (req.path.includes("/sensitive/")) return true;

  // Verify if token is older than 1 hour (forces refresh of roles)
  const tokenAge = Date.now() / 1000 - (req.user.iat || 0);
  if (tokenAge > 3600) return true;

  // Otherwise, trust the token for read operations
  return false;
};

const enhanceUserFromDatabase = (tokenUser, dbUser) => {
  // Make sure we always have a roles array
  if (!tokenUser.roles) tokenUser.roles = [];

  // Add database role if not already in token
  if (dbUser.role && !tokenUser.roles.includes(dbUser.role)) {
    tokenUser.roles.push(dbUser.role);
  }

  // Add additional properties from database
  tokenUser.name = dbUser.name;
  tokenUser.lastLogin = dbUser.lastLogin;
  tokenUser.verified = dbUser.verified || false;
  tokenUser.preferences = dbUser.preferences;

  // Add any permissions from database
  if (dbUser.permissions) {
    tokenUser.permissions = dbUser.permissions;
  }
};

// Handle JWT errors and create audit logs
const handleJwtError = (error, req, next, logger) => {
  // Create specific response based on error type
  if (error.name === "TokenExpiredError") {
    logger.info("Token expired", { exp: error.expiredAt });

    return next(
      new ApiError(
        ERROR_CODES.UNAUTHORIZED.code,
        "Authentication token expired",
        { expiredAt: error.expiredAt }
      )
    );
  }

  if (error.name === "JsonWebTokenError") {
    logger.warn("Invalid token format", { message: error.message });

    // Create security audit log
    hipaaCompliance
      .createAuditLog(AUDIT_TYPES.UNAUTHORIZED, {
        error: "INVALID_TOKEN",
        message: error.message,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
      })
      .catch((e) =>
        logger.error("Failed to create audit log", { error: e.message })
      );

    return next(
      new ApiError(
        ERROR_CODES.UNAUTHORIZED.code,
        "Invalid authentication token"
      )
    );
  }

  if (error.name === "NotBeforeError") {
    logger.warn("Token not yet valid", { nbf: error.date });

    return next(
      new ApiError(ERROR_CODES.UNAUTHORIZED.code, "Token not yet valid")
    );
  }

  // Default case for other JWT errors
  logger.warn("JWT verification failed", {
    name: error.name,
    message: error.message,
  });

  return next(
    new ApiError(
      ERROR_CODES.UNAUTHORIZED.code,
      "Authentication failed: " + error.message
    )
  );
};

// Middleware for role-based authorization
export const authorize = (roles, options = {}) => {
  // Convert to array if single role provided
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  // Destructure options with defaults
  const {
    requireAll = false,
    allowSelf = true,
    resourceParam = "id",
    auditAction = "ACCESS",
    errorMessage = "Insufficient permissions",
  } = options;

  return (req, res, next) => {
    if (!req.user) {
      return next(
        new ApiError(ERROR_CODES.UNAUTHORIZED.code, "Authentication required")
      );
    }

    // Define request-specific logger
    const requestLogger = logger.child({
      requestId: req.id,
      userId: req.user.id,
    });

    // Get user roles with fallback
    const userRoles = req.user.roles || [req.user.role];

    // Check for self-access if applicable
    const isSelfAccess =
      allowSelf &&
      req.params[resourceParam] &&
      req.params[resourceParam] === req.user.id;

    // Check role-based access
    let hasAccess;

    if (requireAll) {
      hasAccess = allowedRoles.every((role) => userRoles.includes(role));
    } else {
      hasAccess =
        isSelfAccess || allowedRoles.some((role) => userRoles.includes(role));
    }

    if (!hasAccess) {
      requestLogger.warn("Authorization failed", {
        userRoles,
        requiredRoles: allowedRoles,
        path: req.path,
        method: req.method,
        isSelfAccess,
        requireAll,
      });

      // Create audit log for failed authorization
      hipaaCompliance
        .createAuditLog(AUDIT_TYPES.ACCESS_REVOKED, {
          userId: req.user.id,
          address: req.user.address,
          requiredRoles: allowedRoles,
          resourceId: req.params[resourceParam],
          action: auditAction,
          ip: req.ip,
          path: req.path,
        })
        .catch((e) =>
          logger.error("Failed to create audit log", { error: e.message })
        );

      return next(new ApiError(ERROR_CODES.FORBIDDEN.code, errorMessage));
    }

    // Create audit log for successful authorization
    hipaaCompliance
      .createAuditLog(AUDIT_TYPES.ACCESS_GRANTED, {
        userId: req.user.id,
        address: req.user.address,
        roles: userRoles,
        resourceId: req.params[resourceParam],
        action: auditAction,
        path: req.path,
        ip: req.ip,
      })
      .catch((e) =>
        logger.error("Failed to create audit log", { error: e.message })
      );

    // Authorization successful
    next();
  };
};

// Middleware for rate limiting
export const requirePermission = (permissions, options = {}) => {
  // Convert to array if single permission
  const requiredPermissions = Array.isArray(permissions)
    ? permissions
    : [permissions];

  // Default options
  const { requireAll = false } = options;

  return (req, res, next) => {
    // Ensure user is authenticated
    if (!req.user) {
      return next(
        new ApiError(ERROR_CODES.UNAUTHORIZED.code, "Authentication required")
      );
    }

    // Skip for admin role if not explicitly disabled
    if (req.user.roles.includes("admin") && !options.noAdminBypass) {
      return next();
    }

    // Get user permissions with fallback
    const userPermissions = req.user.permissions || [];

    // Check permissions
    let hasPermission;

    if (requireAll) {
      // User must have ALL specified permissions
      hasPermission = requiredPermissions.every((permission) =>
        userPermissions.includes(permission)
      );
    } else {
      // User must have ANY specified permission
      hasPermission = requiredPermissions.some((permission) =>
        userPermissions.includes(permission)
      );
    }

    if (!hasPermission) {
      return next(
        new ApiError(
          ERROR_CODES.FORBIDDEN.code,
          options.errorMessage || "Missing required permissions"
        )
      );
    }

    next();
  };
};

export default authMiddleware;
export {
  extractToken,
  verifyToken,
  isPublicRoute,
  enhanceUserFromDatabase,
  handleJwtError,
};
