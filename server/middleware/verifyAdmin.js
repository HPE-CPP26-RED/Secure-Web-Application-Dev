/**
 * verifyAdmin.js
 * RBAC middleware — permits only users with the "admin" role.
 *
 * Must be chained after verifyToken so req.user is populated.
 * Returns 403 Forbidden (not 401) for insufficient privilege.
 */
const { ErrorHandler } = require("../helpers/error");
const { logger } = require("../utils/logger");

module.exports = (req, res, next) => {
  const { role, id } = req.user;

  if (role === "admin") {
    return next();
  }

  logger.warn({
    event: "RBAC_FAILURE",
    userId: id,
    role,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  throw new ErrorHandler(403, "Forbidden: admin role required");
};
