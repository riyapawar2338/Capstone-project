// controllers/authController.js
const Admin = require('./Admin');
const { sendSuccess, sendError } = require('./apiResponse');

// ── POST /api/auth/login ──────────────────────────────────────
exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    // Include password (select: false by default)
    const admin = await Admin.findOne({ email }).select('+password');
    if (!admin) {
      return sendError(res, { message: 'Invalid credentials', statusCode: 401 });
    }

    const isMatch = await admin.matchPassword(password);
    if (!isMatch) {
      return sendError(res, { message: 'Invalid credentials', statusCode: 401 });
    }

    if (!admin.isActive) {
      return sendError(res, { message: 'Account disabled', statusCode: 403 });
    }

    // Update lastLogin
    admin.lastLogin = new Date();
    await admin.save({ validateBeforeSave: false });

    const token = admin.getSignedJWT();

    return sendSuccess(res, {
      message: 'Login successful',
      data: {
        token,
        admin: {
          id:       admin._id,
          username: admin.username,
          email:    admin.email,
          role:     admin.role,
        },
      },
    });
  } catch (err) {
    return sendError(res, { message: err.message });
  }
};

// ── GET /api/auth/me ──────────────────────────────────────────
exports.getMe = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin._id);
    return sendSuccess(res, { data: admin });
  } catch (err) {
    return sendError(res, { message: err.message });
  }
};

// ── POST /api/auth/logout ─────────────────────────────────────
exports.logout = (req, res) => {
  return sendSuccess(res, { message: 'Logged out successfully' });
};

// ── POST /api/auth/register (superadmin only) ─────────────────
exports.register = async (req, res) => {
  const { username, email, password, role } = req.body;
  try {
    const admin = await Admin.create({ username, email, password, role: role || 'admin' });
    const token = admin.getSignedJWT();
    return sendSuccess(res, {
      message: 'Admin created successfully',
      statusCode: 201,
      data: { token, admin: { id: admin._id, username: admin.username, email: admin.email, role: admin.role } },
    });
  } catch (err) {
    return sendError(res, { message: err.message, statusCode: 400 });
  }
};