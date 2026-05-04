const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const parseCollegeEmail = require('../utils/parseEmail');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;

        if (!email.endsWith('@kongu.edu')) {
          return done(new Error('Unauthorized domain'));
        }

        const { name, department, year } = parseCollegeEmail(email);

        const result = await pool.query(
          `
          INSERT INTO students (email, name, department, year, email_verified)
          VALUES ($1, $2, $3, $4, TRUE)
          ON CONFLICT (email)
          DO UPDATE SET
            email = EXCLUDED.email,
            email_verified = TRUE
          RETURNING id, email, name, department, year
          `,
          [email, name, department, year]
        );

        const student = result.rows[0];

        const token = jwt.sign(
          { studentId: student.id },
          process.env.JWT_SECRET,
          { expiresIn: '7d' }
        );

        done(null, { token });
      } catch (err) {
        done(err);
      }
    }
  )
);

module.exports = passport;
