const express = require('express');
const router = express.Router();
const passport = require('../auth/passport');
const requireAuth = require('../middleware/requireAuth');

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
    res.cookie('token', req.user.token, {
      httpOnly: true,
      sameSite: 'lax'
    });

    res.redirect('http://localhost:5173');
  }
);

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

router.get('/failed', (req, res) => {
  res.status(401).send('Authentication failed');
});

module.exports = router;
