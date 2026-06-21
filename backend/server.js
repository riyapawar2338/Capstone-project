// server.js — AI Internship Allocation & Recommendation System

require('dotenv').config();

const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const morgan    = require('morgan');
const path      = require('path');
const rateLimit = require('express-rate-limit');

const connectDB        = require('./db');
const { errorHandler } = require('./errorHandler');

// ── Connect Database ──────────────────────────────────────────
connectDB()
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => {
    console.error('❌ MongoDB Connection Failed:', err.message);
  });

// ── Create App ────────────────────────────────────────────────
const app = express();

// ── Security middleware ───────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

// ── CORS Configuration ────────────────────────────────────────
const allowedOrigins = [
  process.env.CLIENT_ORIGIN || 'http://127.0.0.1:5500',
  'https://riyapawar2338.github.io',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

app.use(cors({
  origin: function(origin, callback) {
    // allow requests with no origin (Postman, curl, mobile apps, same-origin)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true
}));

app.options('*', cors());

// ── Body parsers ──────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Logging ───────────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ── Rate limiting ─────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later.'
  }
});

app.use('/api/', apiLimiter);

// ── Static files ──────────────────────────────────────────────
app.use(
  '/uploads',
  express.static(path.join(__dirname, process.env.UPLOAD_PATH || 'uploads'))
);

// ── Health Check ──────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Backend is running successfully',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// ── API Routes ────────────────────────────────────────────────
app.use('/api/auth',         require('./authRoutes'));
app.use('/api/students',     require('./studentRoutes'));
app.use('/api/internships',  require('./internshipRoutes'));
app.use('/api/applications', require('./applicationRoutes'));
app.use('/api/admin',        require('./adminRoutes'));

// ── Root route (optional, useful for Render test) ────────────
app.get('/', (req, res) => {
  res.send('AI Internship Backend is running 🚀');
});

// ── 404 Handler ───────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// ── Global error handler ──────────────────────────────────────
app.use(errorHandler);

// ── Start server ──────────────────────────────────────────────
const PORT = process.env.PORT || 5001;

const server = app.listen(PORT, () => {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║  AI Internship Allocation System            ║');
  console.log('╠══════════════════════════════════════════════╣');
  console.log(`║  🚀 Server : Port ${PORT}                   ║`);
  console.log(`║  🌿 Env    : ${process.env.NODE_ENV || 'development'}               ║`);
  console.log('╚══════════════════════════════════════════════╝\n');
});

// ── Handle crashes ────────────────────────────────────────────
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err.message);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
  process.exit(1);
});