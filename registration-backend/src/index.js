require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const passport = require('./auth/passport');
const schedulerService = require('./services/scheduler.service');

const app = express();

app.set('trust proxy', 1);

app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '1mb' }));
app.use(cookieParser());

app.use(helmet());
app.use(compression());

const limiter = rateLimit({
  windowMs: 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_PER_MINUTE || 300),
  standardHeaders: 'draft-7',
  legacyHeaders: false
});
app.use(limiter);

app.use(passport.initialize());

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.use(
  cors({
    origin: (origin, callback) => {
      const raw =
        process.env.FRONTEND_ORIGINS ||
        process.env.FRONTEND_URL;
      const allowed = raw
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);

      if (!origin) return callback(null, true);
      if (allowed.includes(origin)) return callback(null, true);

      callback(new Error('Not allowed by CORS'));
    },
    credentials: true
  })
);

const authRoutes = require('./routes/auth.routes');
app.use('/auth', authRoutes);

const studentRoutes = require('./routes/student.routes');
app.use('/student', studentRoutes);

const adminRoutes = require('./routes/admin.routes');
app.use('/admin', adminRoutes);

const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
  console.log(`Backend running on ${port}`);
});

schedulerService.start().catch((err) => {
  console.error('Scheduler failed to start:', err);
});

// Centralized error handler (keeps server from crashing on thrown errors)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[API_ERROR]', err);
  if (res.headersSent) return;
  res.status(500).json({ error: 'Internal server error' });
});

async function shutdown(signal) {
  try {
    console.log(`[SHUTDOWN] Received ${signal}, closing server...`);
    server.close(() => {
      console.log('[SHUTDOWN] HTTP server closed');
      process.exit(0);
    });

    // Force exit if close hangs
    setTimeout(() => {
      console.error('[SHUTDOWN] Force exit');
      process.exit(1);
    }, 10_000).unref();
  } catch (e) {
    console.error('[SHUTDOWN] Error during shutdown', e);
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
