const express = require('express');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const expressLayouts = require('express-ejs-layouts');
const rateLimit = require('express-rate-limit');

const env = require('./config/env');
const pool = require('./config/database');
const { errorHandler, notFoundHandler } = require('./middlewares/error.middleware');
const routes = require('./routes');

const app = express();

// =========================
// Reverse Proxy Support
// =========================
// Trust first proxy (Nginx on DOM Cloud/Passenger) so req.secure and client IP work
app.set('trust proxy', 1);

// =========================
// Security
// =========================
app.use(helmet({
  contentSecurityPolicy: false, // Relaxed for dev, tighten in production
}));

// =========================
// Logging
// =========================
if (env.isDevelopment) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// =========================
// Body parsers
// =========================
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// =========================
// Static files
// =========================
app.use(express.static(path.join(__dirname, '..', 'public')));

// =========================
// View engine (EJS)
// =========================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// =========================
// Session
// =========================
const sessionStore = new MySQLStore({
  clearExpired: env.nodeEnv !== 'test',
  checkExpirationInterval: env.nodeEnv === 'test' ? 0 : 900000, // 15 min (disabled during tests)
  expiration: env.session.maxAge,
}, pool);

app.sessionStore = sessionStore;

app.use(session({
  key: 'minimarket_pos_sid',
  secret: env.session.secret,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'lax',
    maxAge: env.session.maxAge,
  },
}));

// =========================
// Rate limiting (login submissions only)
// =========================
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 30, // 30 percobaan gagal
  message: 'Terlalu banyak percobaan login. Coba lagi dalam beberapa menit.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.post('/api/auth/login', loginLimiter);
app.post('/auth/login', loginLimiter);

// =========================
// Global template variables
// =========================
app.use((req, res, next) => {
  // Make user session available in all views
  res.locals.currentUser = req.session?.user || null;
  res.locals.success_msg = req.session?.success_msg || null;
  res.locals.error_msg = req.session?.error_msg || null;
  if (req.session) {
    // Clear flash messages after reading
    delete req.session.success_msg;
    delete req.session.error_msg;
  }
  next();
});

// =========================
// Routes
// =========================
app.use('/', routes);

// =========================
// Error handling
// =========================
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
