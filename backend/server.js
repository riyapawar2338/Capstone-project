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
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5000',
  'http://localhost:5001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5500',
  'http://localhost:5500',
  'https://riyapawar2338.github.io',
  'https://capstone-project-backend-m20u.onrender.com'
];

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

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

// ── Student login (separate from admin JWT login) ─────────────
const Student = require('./Student');
app.post('/api/auth/student-login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }
    const student = await Student.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!student) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }
    const bcrypt = require('bcryptjs');
    const match  = await bcrypt.compare(password, student.password);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }
    if (!student.isActive) {
      return res.status(403).json({ success: false, message: 'Account is disabled.' });
    }
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { id: student._id, role: 'student', email: student.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        student: {
          id:       student._id,
          fullName: student.fullName,
          email:    student.email,
          rollNo:   student.rollNo,
          role:     'student'
        }
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

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
  const env = process.env.NODE_ENV || 'development';
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║  AI Internship Allocation System             ║');
  console.log('╠══════════════════════════════════════════════╣');
  console.log(`║  🚀 Server  : http://localhost:${PORT}          ║`);
  console.log(`║  🌿 Env     : ${env.padEnd(32)}║`);
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