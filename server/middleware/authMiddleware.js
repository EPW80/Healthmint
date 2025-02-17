const jwt = require("jsonwebtoken");
const { ApiError } = require("../utils/apiError");
const { ERROR_CODES } = require("../config/networkConfig");

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return next(
      new ApiError(ERROR_CODES.UNAUTHORIZED.code, "Authentication required")
    );
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: decoded.id,
      role: decoded.role,
      address: decoded.address,
    };
    next();
  } catch (error) {
    return next(
      new ApiError(ERROR_CODES.UNAUTHORIZED.code, "Invalid or expired token")
    );
  }
};

module.exports = authMiddleware;
