
const pool = require('../db/pool');
const parseCollegeEmail = require('../utils/parseEmail');

async function login(email) {
  if (!email) {
    throw new Error('Email required');
  }

  const { name, department, year } = parseCollegeEmail(email);

  const result = await pool.query(
    `
    INSERT INTO students (email, name, department, year)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (email)
    DO UPDATE SET email = EXCLUDED.email
    RETURNING id, email, name, department, year
    `,
    [email, name, department, year]
  );

  return result.rows[0];
}

module.exports = { login };
