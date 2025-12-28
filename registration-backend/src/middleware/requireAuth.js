const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

async function requireAuth(req, res, next) {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const studentResult = await pool.query(
      `
      SELECT id, email, name, department, year
      FROM students
      WHERE id = $1
      `,
      [decoded.studentId]
    );

    if (studentResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid user' });
    }

    const student = studentResult.rows[0];

    const adminResult = await pool.query(
      `SELECT 1 FROM admins WHERE email = $1`,
      [student.email]
    );

    req.user = {
      ...student,
      role: adminResult.rows.length > 0 ? 'admin' : 'student'
    };

    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = requireAuth;
