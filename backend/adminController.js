// controllers/adminController.js
const Student     = require('./Student');
const Internship  = require('./Internship');
const Application = require('./Application');
const Admin       = require('./Admin');
const { sendSuccess, sendError } = require('./apiResponse');
const { getBulkBestMatches }     =  require('./aiMatcher');

// ── GET /api/admin/dashboard ──────────────────────────────────
exports.getDashboard = async (req, res) => {
  try {
    const [
      totalStudents,
      totalInternships,
      totalApplications,
      accepted,
      pending,
      shortlisted,
      deptBreakdown,
      domainBreakdown,
      cgpaStats,
      recentStudents,
      recentApps,
    ] = await Promise.all([
      Student.countDocuments({ isActive: true }),
      Internship.countDocuments({ isActive: true }),
      Application.countDocuments(),
      Application.countDocuments({ status: 'Accepted' }),
      Application.countDocuments({ status: 'Pending' }),
      Application.countDocuments({ status: 'Shortlisted' }),

      Student.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$department', count: { $sum: 1 } } },
        { $sort:  { count: -1 } },
      ]),

      Student.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$preferredDomain', count: { $sum: 1 } } },
        { $sort:  { count: -1 } },
      ]),

      Student.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: null,
            avgCgpa: { $avg: '$cgpa' },
            maxCgpa: { $max: '$cgpa' },
            minCgpa: { $min: '$cgpa' },
          },
        },
      ]),

      Student.find({ isActive: true })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('fullName rollNo department cgpa preferredDomain createdAt'),

      Application.find()
        .populate('student',    'fullName rollNo')
        .populate('internship', 'title company')
        .sort({ createdAt: -1 })
        .limit(5),
    ]);

    return sendSuccess(res, {
      data: {
        stats: {
          totalStudents,
          totalInternships,
          totalApplications,
          accepted,
          pending,
          shortlisted,
          rejected: totalApplications - accepted - pending - shortlisted,
        },
        cgpaStats: cgpaStats[0] || { avgCgpa: 0, maxCgpa: 0, minCgpa: 0 },
        deptBreakdown,
        domainBreakdown,
        recentStudents,
        recentApplications: recentApps,
      },
    });
  } catch (err) {
    return sendError(res, { message: err.message });
  }
};

// ── GET /api/admin/allocation ─────────────────────────────────
// Full allocation table: every student + their best match
exports.getAllocationReport = async (req, res) => {
  try {
    const students    = await Student.find({ isActive: true });
    const internships = await Internship.find({ isActive: true });

    const matches = getBulkBestMatches(students, internships);

    // Enrich with application status
    const appMap = {};
    const apps   = await Application.find({ student: { $in: students.map(s => s._id) } })
      .sort({ matchScore: -1 });
    apps.forEach(a => {
      const key = a.student.toString();
      if (!appMap[key]) appMap[key] = a;
    });

    const result = matches.map(m => ({
      student:        m.student,
      bestMatch:      m.bestMatch,
      bestScore:      m.bestScore,
      breakdown:      m.breakdown,
      applicationStatus: appMap[m.student._id.toString()]?.status || 'Not Applied',
    }));

    return sendSuccess(res, {
      data: result,
      meta: { totalStudents: students.length, totalInternships: internships.length },
    });
  } catch (err) {
    return sendError(res, { message: err.message });
  }
};

// ── GET /api/admin/reports/students ──────────────────────────
exports.reportStudents = async (req, res) => {
  try {
    const students = await Student.find({ isActive: true })
      .select('fullName rollNo department semester cgpa percentage preferredDomain technicalSkills certifications email phone city createdAt profileCompleteness')
      .sort({ createdAt: -1 });
    return sendSuccess(res, { data: students, meta: { total: students.length } });
  } catch (err) {
    return sendError(res, { message: err.message });
  }
};

// ── GET /api/admin/reports/recommendations ────────────────────
exports.reportRecommendations = async (req, res) => {
  try {
    const students    = await Student.find({ isActive: true });
    const internships = await Internship.find({ isActive: true });
    const matches     = getBulkBestMatches(students, internships);

    const data = matches.map(m => ({
      studentName: m.student.fullName,
      rollNo:      m.student.rollNo,
      department:  m.student.department,
      cgpa:        m.student.cgpa,
      bestMatch:   m.bestMatch?.title || '—',
      company:     m.bestMatch?.company || '—',
      matchScore:  m.bestScore,
    }));

    return sendSuccess(res, { data, meta: { total: data.length } });
  } catch (err) {
    return sendError(res, { message: err.message });
  }
};

// ── PUT /api/admin/profile ────────────────────────────────────
exports.updateProfile = async (req, res) => {
  try {
    const { username, email } = req.body;
    const admin = await Admin.findByIdAndUpdate(
      req.admin._id, { username, email }, { new: true, runValidators: true }
    );
    return sendSuccess(res, { message: 'Profile updated', data: admin });
  } catch (err) {
    return sendError(res, { message: err.message, statusCode: 400 });
  }
};

// ── PUT /api/admin/change-password ───────────────────────────
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const admin = await Admin.findById(req.admin._id).select('+password');

    const isMatch = await admin.matchPassword(currentPassword);
    if (!isMatch) {
      return sendError(res, { message: 'Current password incorrect', statusCode: 400 });
    }

    admin.password = newPassword;
    await admin.save();
    return sendSuccess(res, { message: 'Password changed successfully' });
  } catch (err) {
    return sendError(res, { message: err.message, statusCode: 400 });
  }
};