const { UnauthorizedError, ForbiddenError } = require('../utils/appError');

function requireAdmin(req, res, next) {
  if (!req.user) {
    return next(new UnauthorizedError('Not authenticated'));
  }

  if (req.user.role !== 'admin') {
    return next(new ForbiddenError('Admin access required'));
  }

  next();
}

module.exports = requireAdmin;
