// middleware/auth.js
const jwt = require('jsonwebtoken');
const Admin = require('./Admin');

// ── Protect: require valid JWT ────────────────────────────────
exports.protectStudent = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized — no token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Accept student token or admin token
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Token invalid or expired'
    });
  }
};

// ── Authorize: check roles ────────────────────────────────────
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.admin.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.admin.role}' is not permitted to access this route`,
      });
    }
    next();
  };
};