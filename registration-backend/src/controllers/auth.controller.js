const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

async function me(req, res) {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await pool.query(
      `
      SELECT id, email, name, department, year
      FROM students
      WHERE id = $1
      `,
      [decoded.studentId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid user' });
    }

    res.json({ student: result.rows[0] });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = { me };
