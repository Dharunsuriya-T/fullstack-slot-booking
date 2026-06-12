require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const passport = require('./auth/passport');
const schedulerService = require('./services/scheduler.service');
const pool = require('./db/pool');
const redisClient = require('./config/redis');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.set('trust proxy', 1);

app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '1mb' }));
app.use(cookieParser());

app.use(helmet());
app.use(compression());

// Global Rate Limiter
const limiter = rateLimit({
  windowMs: 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_PER_MINUTE || 300),
  standardHeaders: 'draft-7',
  legacyHeaders: false
});
app.use(limiter);

// Stricter Rate Limiter for sensitive Authentication Endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: Number(process.env.AUTH_RATE_LIMIT || 30), // 30 requests per 15 minutes
  message: {
    status: 'fail',
    error: 'Too many authentication attempts. Please try again after 15 minutes.'
  },
  standardHeaders: 'draft-7',
  legacyHeaders: false
});
app.use('/auth/login', authLimiter);
app.use('/auth/register', authLimiter);
app.use('/auth/forgot-password', authLimiter);
app.use('/auth/reset-password', authLimiter);

app.use(passport.initialize());

// Production-Grade Health Check Endpoint
app.get('/health', async (req, res) => {
  try {
    // Run a fast query to check database connectivity
    await pool.query('SELECT 1');
    res.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      services: {
        database: 'healthy',
        server: 'healthy'
      }
    });
  } catch (error) {
    console.error('[HEALTH_CHECK_FAILED]', error);
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      services: {
        database: 'unhealthy',
        server: 'healthy'
      },
      error: error.message
    });
  }
});

app.use(
  cors({
    origin: (origin, callback) => {
      const raw =
        process.env.FRONTEND_ORIGINS ||
        process.env.FRONTEND_URL;
      const allowed = raw
        ? raw.split(',').map((v) => v.trim()).filter(Boolean)
        : [];

      if (!origin) return callback(null, true);
      if (allowed.includes(origin)) return callback(null, true);

      callback(new Error('Not allowed by CORS'));
    },
    credentials: true
  })
);

// Routes
const authRoutes = require('./routes/auth.routes');
app.use('/auth', authRoutes);

const studentRoutes = require('./routes/student.routes');
app.use('/student', studentRoutes);

const adminRoutes = require('./routes/admin.routes');
app.use('/admin', adminRoutes);

// Centralized error handler
app.use(errorHandler);

const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
  console.log(`Backend running on ${port}`);
});

schedulerService.start().catch((err) => {
  console.error('Scheduler failed to start:', err);
});

// Graceful Shutdown Handler
async function shutdown(signal) {
  try {
    console.log(`[SHUTDOWN] Received ${signal}, initiating graceful shutdown...`);
    
    server.close(async () => {
      console.log('[SHUTDOWN] HTTP server closed');
      
      // Close database connection pool
      try {
        await pool.end();
        console.log('[SHUTDOWN] Database connection pool drained');
      } catch (err) {
        console.error('[SHUTDOWN] Error draining database pool', err);
      }

      // Close Redis client if connected
      try {
        if (redisClient && redisClient.isOpen) {
          await redisClient.quit();
          console.log('[SHUTDOWN] Redis connection closed');
        }
      } catch (err) {
        console.error('[SHUTDOWN] Error closing Redis client', err);
      }

      process.exit(0);
    });

    // Force exit if shutdown hangs
    setTimeout(() => {
      console.error('[SHUTDOWN] Force exit triggered');
      process.exit(1);
    }, 10_000).unref();
  } catch (e) {
    console.error('[SHUTDOWN] Error during shutdown', e);
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
