// controllers/applicationController.js
const Application = require('./Application');
const Student     = require('./Student');
const Internship  = require('./Internship');
const { sendSuccess, sendError, paginate } = require('./apiResponse');
const { calcMatchScore }                   =  require('./aiMatcher');

// ── POST /api/applications ────────────────────────────────────
exports.createApplication = async (req, res) => {
  try {
    const { studentId, internshipId, coverLetter } = req.body;

    // Fetch student & internship
    const [student, internship] = await Promise.all([
      Student.findById(studentId),
      Internship.findById(internshipId),
    ]);

    if (!student || !student.isActive) {
      return sendError(res, { message: 'Student not found', statusCode: 404 });
    }
    if (!internship || !internship.isActive) {
      return sendError(res, { message: 'Internship not found or closed', statusCode: 404 });
    }

    // Check deadline
    if (internship.deadline && new Date(internship.deadline) < new Date()) {
      return sendError(res, { message: 'Application deadline has passed', statusCode: 400 });
    }

    // Check seats
    if (internship.acceptedCount >= internship.seats) {
      return sendError(res, { message: 'No seats available for this internship', statusCode: 400 });
    }

    // Compute AI score
    const { total, breakdown } = calcMatchScore(student, internship);

    // Create application (unique index guards duplicate)
    const application = await Application.create({
      student:   studentId,
      internship: internshipId,
      matchScore: total,
      matchBreakdown: breakdown,
      coverLetter: coverLetter || '',
      statusHistory: [{ status: 'Pending', changedAt: new Date(), changedBy: 'Student' }],
    });

    // Increment application count on internship
    await Internship.findByIdAndUpdate(internshipId, { $inc: { applicationCount: 1 } });

    const populated = await Application.findById(application._id)
      .populate('student',    'fullName rollNo department cgpa')
      .populate('internship', 'title company domain location');

    return sendSuccess(res, {
      message: 'Application submitted successfully',
      statusCode: 201,
      data: populated,
    });
  } catch (err) {
    if (err.code === 11000) {
      return sendError(res, { message: 'You have already applied for this internship', statusCode: 400 });
    }
    return sendError(res, { message: err.message, statusCode: 400 });
  }
};

// ── GET /api/applications (admin) ────────────────────────────
exports.getAllApplications = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, internshipId, studentId } = req.query;

    const filter = {};
    if (status)       filter.status     = status;
    if (internshipId) filter.internship = internshipId;
    if (studentId)    filter.student    = studentId;

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await Application.countDocuments(filter);

    const applications = await Application.find(filter)
      .populate('student',    'fullName rollNo department cgpa email')
      .populate('internship', 'title company domain location stipend')
      .sort({ matchScore: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    return sendSuccess(res, {
      data: applications,
      meta: paginate(page, limit, total),
    });
  } catch (err) {
    return sendError(res, { message: err.message });
  }
};

// ── GET /api/applications/:id ─────────────────────────────────
exports.getApplicationById = async (req, res) => {
  try {
    const app = await Application.findById(req.params.id)
      .populate('student',    'fullName rollNo department semester cgpa technicalSkills certifications preferredDomain email phone')
      .populate('internship', 'title company domain location stipend duration deadline requiredSkills');

    if (!app) return sendError(res, { message: 'Application not found', statusCode: 404 });
    return sendSuccess(res, { data: app });
  } catch (err) {
    return sendError(res, { message: err.message });
  }
};

// ── PATCH /api/applications/:id/status (admin) ───────────────
exports.updateStatus = async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    const VALID = ['Pending', 'Shortlisted', 'Accepted', 'Rejected', 'Withdrawn'];

    if (!VALID.includes(status)) {
      return sendError(res, { message: `Invalid status. Must be one of: ${VALID.join(', ')}`, statusCode: 400 });
    }

    const app = await Application.findById(req.params.id);
    if (!app) return sendError(res, { message: 'Application not found', statusCode: 404 });

    const prevStatus = app.status;
    app.status = status;
    if (adminNotes) app.adminNotes = adminNotes;
    app.statusHistory.push({
      status,
      changedAt: new Date(),
      changedBy: req.admin?.username || 'Admin',
      note: adminNotes || '',
    });
    await app.save({ validateBeforeSave: false });

    // Update internship acceptedCount
    if (status === 'Accepted' && prevStatus !== 'Accepted') {
      await Internship.findByIdAndUpdate(app.internship, { $inc: { acceptedCount: 1 } });
    } else if (prevStatus === 'Accepted' && status !== 'Accepted') {
      await Internship.findByIdAndUpdate(app.internship, { $inc: { acceptedCount: -1 } });
    }

    const populated = await Application.findById(app._id)
      .populate('student',    'fullName rollNo')
      .populate('internship', 'title company');

    return sendSuccess(res, {
      message: `Status updated to '${status}'`,
      data: populated,
    });
  } catch (err) {
    return sendError(res, { message: err.message, statusCode: 400 });
  }
};

// ── DELETE /api/applications/:id ──────────────────────────────
exports.deleteApplication = async (req, res) => {
  try {
    const app = await Application.findByIdAndDelete(req.params.id);
    if (!app) return sendError(res, { message: 'Application not found', statusCode: 404 });

    // Decrement counts
    await Internship.findByIdAndUpdate(app.internship, { $inc: { applicationCount: -1 } });
    if (app.status === 'Accepted') {
      await Internship.findByIdAndUpdate(app.internship, { $inc: { acceptedCount: -1 } });
    }

    return sendSuccess(res, { message: 'Application deleted' });
  } catch (err) {
    return sendError(res, { message: err.message });
  }
};

// ── GET /api/applications/analytics (admin) ──────────────────
exports.getAnalytics = async (req, res) => {
  try {
    const [
      totalApps,
      statusBreakdown,
      domainBreakdown,
      avgMatchScore,
      topStudents,
    ] = await Promise.all([
      Application.countDocuments(),

      Application.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort:  { count: -1 } },
      ]),

      Application.aggregate([
        { $lookup: { from: 'internships', localField: 'internship', foreignField: '_id', as: 'int' } },
        { $unwind: '$int' },
        { $group:  { _id: '$int.domain', count: { $sum: 1 }, avgScore: { $avg: '$matchScore' } } },
        { $sort:   { count: -1 } },
      ]),

      Application.aggregate([
        { $group: { _id: null, avg: { $avg: '$matchScore' } } },
      ]),

      Application.aggregate([
        { $sort: { matchScore: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'students',    localField: 'student',    foreignField: '_id', as: 'student' } },
        { $lookup: { from: 'internships', localField: 'internship', foreignField: '_id', as: 'internship' } },
        { $unwind: '$student' },
        { $unwind: '$internship' },
        { $project: {
          matchScore: 1, status: 1,
          'student.fullName': 1, 'student.rollNo': 1, 'student.department': 1,
          'internship.title': 1, 'internship.company': 1,
        }},
      ]),
    ]);

    return sendSuccess(res, {
      data: {
        totalApplications: totalApps,
        averageMatchScore: avgMatchScore[0]?.avg ? Math.round(avgMatchScore[0].avg) : 0,
        statusBreakdown,
        domainBreakdown,
        topStudents,
      },
    });
  } catch (err) {
    return sendError(res, { message: err.message });
  }
};