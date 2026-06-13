// middleware/auth.js
const jwt = require('jsonwebtoken');
const Admin = require('./Admin');

// ── Protect: require valid JWT ────────────────────────────────
exports.protect = async (req, res, next) => {
  let token;

  // Accept token from Authorization header OR cookie
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized — no token provided',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = await Admin.findById(decoded.id);

    if (!req.admin || !req.admin.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized — account inactive or not found',
      });
    }

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized — token invalid or expired',
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