require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const passport = require('./auth/passport');
const schedulerService = require('./services/scheduler.service');

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true
  })
);

const authRoutes = require('./routes/auth.routes');

app.use('/auth', authRoutes);

const studentRoutes = require('./routes/student.routes');
app.use('/student', studentRoutes);

const adminRoutes = require('./routes/admin.routes');
app.use('/admin', adminRoutes);

app.listen(3000, () => {
  console.log('Backend running on 3000');
});

schedulerService.start().catch((err) => {
  console.error('Scheduler failed to start:', err);
});
