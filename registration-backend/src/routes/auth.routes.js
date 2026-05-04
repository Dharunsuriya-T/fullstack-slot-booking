const express = require('express');
const router = express.Router();
const passport = require('../auth/passport');
const requireAuth = require('../middleware/requireAuth');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const parseCollegeEmail = require('../utils/parseEmail');
const crypto = require('crypto');

const sgMail = require('@sendgrid/mail');
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

function setAuthCookie(res, token) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd,
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

function sha256(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function frontendUrl() {
  if (!process.env.FRONTEND_URL) {
    throw new Error('FRONTEND_URL environment variable is required');
  }
  return process.env.FRONTEND_URL;
}

async function sendEmail({ to, subject, html }) {
  if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM_EMAIL) {
    throw new Error('Email service not configured');
  }
  await sgMail.send({
    to,
    from: process.env.SENDGRID_FROM_EMAIL,
    subject,
    html
  });
}

async function sendVerificationEmail(email, token) {
  const url = `${frontendUrl()}/?verify=${encodeURIComponent(token)}`;
  await sendEmail({
    to: email,
    subject: 'Verify your email',
    html: `<p>Click to verify your email:</p><p><a href="${url}">${url}</a></p>`
  });
}

async function sendPasswordResetEmail(email, token) {
  const url = `${frontendUrl()}/?reset=${encodeURIComponent(token)}`;
  await sendEmail({
    to: email,
    subject: 'Reset your password',
    html: `<p>Click to reset your password (link expires soon):</p><p><a href="${url}">${url}</a></p>`
  });
}

router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    hd: 'kongu.edu'
  })
);

router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: '/auth/failed'
  }),
  (req, res) => {
    setAuthCookie(res, req.user.token);

    res.redirect(frontendUrl());
  }
);

router.post('/register', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (!email.endsWith('@kongu.edu')) {
      return res.status(400).json({ error: 'Only kongu.edu emails are allowed' });
    }

    if (password.length < 8) {
      return res
        .status(400)
        .json({ error: 'Password must be at least 8 characters' });
    }

    const { name, department, year } = parseCollegeEmail(email);
    const passwordHash = await bcrypt.hash(password, 12);

    const existing = await pool.query(
      `SELECT id, password_hash, email_verified FROM students WHERE LOWER(email) = LOWER($1)`,
      [email]
    );

    let student;
    if (existing.rows.length > 0) {
      const row = existing.rows[0];
      if (row.password_hash) {
        return res.status(400).json({ error: 'Account already exists' });
      }

      const updated = await pool.query(
        `
        UPDATE students
        SET password_hash = $2
        WHERE id = $1
        RETURNING id, email, name, department, year, email_verified
        `,
        [row.id, passwordHash]
      );
      student = updated.rows[0];
    } else {
      const created = await pool.query(
        `
        INSERT INTO students (email, name, department, year, password_hash, email_verified)
        VALUES ($1, $2, $3, $4, $5, FALSE)
        RETURNING id, email, name, department, year, email_verified
        `,
        [email, name, department, year, passwordHash]
      );
      student = created.rows[0];
    }

    // Send verification email (best-effort)
    try {
      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = sha256(token);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await pool.query(
        `
        UPDATE students
        SET email_verification_token_hash = $2,
            email_verification_expires_at = $3
        WHERE id = $1
        `,
        [student.id, tokenHash, expiresAt]
      );
      await sendVerificationEmail(email, token);
    } catch {
      // ignore email failures
    }

    const token = jwt.sign(
      { studentId: student.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    setAuthCookie(res, token);
    res.json({ user: student });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await pool.query(
      `
      SELECT id, email, name, department, year, password_hash, email_verified
      FROM students
      WHERE LOWER(email) = LOWER($1)
      `,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const student = result.rows[0];
    if (!student.password_hash) {
      return res.status(400).json({
        error: 'This account uses Google sign-in. Please use Google login.'
      });
    }

    const ok = await bcrypt.compare(password, student.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { studentId: student.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    setAuthCookie(res, token);
    res.json({
      user: {
        id: student.id,
        email: student.email,
        name: student.name,
        department: student.department,
        year: student.year,
        email_verified: student.email_verified
      }
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const result = await pool.query(
      `
      SELECT id, password_hash
      FROM students
      WHERE LOWER(email) = LOWER($1)
      `,
      [email]
    );

    // Avoid email enumeration: always return ok.
    if (result.rows.length === 0) {
      return res.json({ ok: true });
    }

    const student = result.rows[0];
    if (!student.password_hash) {
      return res.json({ ok: true });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = sha256(token);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await pool.query(
      `
      UPDATE students
      SET password_reset_token_hash = $2,
          password_reset_expires_at = $3
      WHERE id = $1
      `,
      [student.id, tokenHash, expiresAt]
    );

    await sendPasswordResetEmail(email, token);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const token = String(req.body.token || '').trim();
    const newPassword = String(req.body.password || '');

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const tokenHash = sha256(token);
    const result = await pool.query(
      `
      SELECT id
      FROM students
      WHERE password_reset_token_hash = $1
        AND password_reset_expires_at IS NOT NULL
        AND password_reset_expires_at > NOW()
      `,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    const studentId = result.rows[0].id;
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await pool.query(
      `
      UPDATE students
      SET password_hash = $2,
          password_reset_token_hash = NULL,
          password_reset_expires_at = NULL
      WHERE id = $1
      `,
      [studentId, passwordHash]
    );

    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/verify-email', async (req, res) => {
  try {
    const token = String(req.query.token || '').trim();
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const tokenHash = sha256(token);
    const result = await pool.query(
      `
      SELECT id
      FROM students
      WHERE email_verification_token_hash = $1
        AND email_verification_expires_at IS NOT NULL
        AND email_verification_expires_at > NOW()
      `,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    const studentId = result.rows[0].id;
    await pool.query(
      `
      UPDATE students
      SET email_verified = TRUE,
          email_verification_token_hash = NULL,
          email_verification_expires_at = NULL
      WHERE id = $1
      `,
      [studentId]
    );

    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/resend-verification', requireAuth, async (req, res) => {
  try {
    const email = req.user.email;
    const result = await pool.query(
      `SELECT id, email_verified FROM students WHERE id = $1`,
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid user' });
    }

    if (result.rows[0].email_verified) {
      return res.json({ ok: true });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = sha256(token);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await pool.query(
      `
      UPDATE students
      SET email_verification_token_hash = $2,
          email_verification_expires_at = $3
      WHERE id = $1
      `,
      [req.user.id, tokenHash, expiresAt]
    );

    await sendVerificationEmail(email, token);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/logout', (req, res) => {
  const isProd = process.env.NODE_ENV === 'production';
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd
  });
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

router.get('/failed', (req, res) => {
  res.status(401).send('Authentication failed');
});

module.exports = router;
