const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const { UnauthorizedError } = require('../utils/appError');
const { getCache, setCache } = require('../utils/cache');

async function requireAuth(req, res, next) {
  const token = req.cookies.token;

  if (!token) {
    return next(new UnauthorizedError('Not authenticated'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const cacheKey = `user:${decoded.studentId}`;
    let row = await getCache(cacheKey);

    if (!row) {
      const result = await pool.query(
        `
        SELECT s.id, s.email, s.name, s.department, s.year, s.gender, s.residence_type, s.email_verified,
               EXISTS (
                 SELECT 1 FROM admins a WHERE LOWER(a.email) = LOWER(s.email)
               ) AS is_admin
        FROM students s
        WHERE s.id = $1
        `,
        [decoded.studentId]
      );

      if (result.rows.length === 0) {
        return next(new UnauthorizedError('Invalid user'));
      }

      row = result.rows[0];
      // Store user details in Redis cache with 1-hour TTL
      await setCache(cacheKey, row, 3600);
    }

    req.user = {
      id: row.id,
      email: row.email,
      name: row.name,
      department: row.department,
      year: row.year,
      gender: row.gender,
      residence_type: row.residence_type,
      email_verified: row.email_verified,
      role: row.is_admin ? 'admin' : 'student'
    };

    next();
  } catch (err) {
    return next(new UnauthorizedError('Invalid token'));
  }
}

module.exports = requireAuth;
