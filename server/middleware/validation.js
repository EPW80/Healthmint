// validation.js is a middleware that validates the registration request body
const validateRegistration = (req, res, next) => {
  const { address, age, name, role } = req.body;

  // Validate wallet address
  if (!address || typeof address !== "string" || !address.startsWith("0x")) {
    return res
      .status(400)
      .json({ message: "Valid wallet address is required" });
  }

  // Validate age
  if (!age || typeof parseInt(age) !== "number" || parseInt(age) < 18) {
    return res.status(400).json({ message: "Valid age (18+) is required" });
  }

  // Validate name
  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return res.status(400).json({ message: "Valid name is required" });
  }

  // Validate role
  const validRoles = ["patient", "provider", "researcher"];
  if (!role || !validRoles.includes(role)) {
    return res.status(400).json({ message: "Valid role is required" });
  }

  next();
};

module.exports = {
  validateRegistration,
};
