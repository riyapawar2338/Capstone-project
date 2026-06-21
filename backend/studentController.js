/* ================================================================
   AI INTERNSHIP ALLOCATION & RECOMMENDATION SYSTEM
   studentController.js — FIXED VERSION
   ================================================================ */
const path    = require('path');
const fs      = require('fs');
const Student = require('./Student');
const Application = require('./Application');
const Internship  = require('./Internship');
const { sendSuccess, sendError, paginate } = require('./apiResponse');
const { getRecommendations } = require('./aiMatcher');

/* ── Helper: normalise comma-separated or array values ─────── */
function normalizeArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(function(s) { return String(s).trim(); }).filter(Boolean);
  return String(val).split(',').map(function(s) { return s.trim(); }).filter(Boolean);
}

/* ── Helper: delete uploaded file on error ──────────────────── */
function cleanupUpload(file) {
  if (!file) return;
  try {
    var filePath = path.join(__dirname, '..', 'uploads', file.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (e) {}
}

/* ============================================================
   GET /api/students
   Query: page, limit, search, department, semester,
          preferredDomain, sortBy, order
   ============================================================ */
exports.getAllStudents = async (req, res) => {
  try {
    var {
      page  = 1,
      limit = 20,
      search,
      department,
      semester,
      preferredDomain,
      sortBy = 'createdAt',
      order  = 'desc'
    } = req.query;

    var filter = { isActive: true };

    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { rollNo:   { $regex: search, $options: 'i' } },
        { email:    { $regex: search, $options: 'i' } }
      ];
    }
    if (department)     filter.department     = department;
    if (semester)       filter.semester       = semester;
    if (preferredDomain) filter.preferredDomain = preferredDomain;

    var skip  = (parseInt(page) - 1) * parseInt(limit);
    var sort  = { [sortBy]: order === 'asc' ? 1 : -1 };
    var total = await Student.countDocuments(filter);

    var students = await Student.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v -password');

    return sendSuccess(res, {
      data: students,
      meta: paginate(page, limit, total)
    });
  } catch (err) {
    return sendError(res, { message: err.message });
  }
};

/* ============================================================
   GET /api/students/:id
   ============================================================ */
exports.getStudentById = async (req, res) => {
  try {
    var student = await Student.findById(req.params.id).select('-__v -password');
    if (!student || !student.isActive) {
      return sendError(res, { message: 'Student not found', statusCode: 404 });
    }
    return sendSuccess(res, { data: student });
  } catch (err) {
    return sendError(res, { message: err.message });
  }
};

/* ============================================================
   POST /api/students/register
   PUBLIC — student self-registration
   FIX: This is the correct public endpoint. The protected
        POST /api/students is for admin-created profiles only.
   ============================================================ */
exports.registerStudent = async (req, res) => {
  try {
    var {
      fullName,
      email,
      password,
      rollNo,
      department      = 'Computer Engineering',
      semester        = 'Semester 6',
      cgpa            = 7.0,
      preferredDomain = 'Artificial Intelligence',
      technicalSkills = [],
      softSkills      = [],
      certifications  = [],
      areasOfInterest = []
    } = req.body;

    /* Validate required fields */
    if (!fullName || !email || !password) {
      return sendError(res, {
        message: 'Full name, email and password are required.',
        statusCode: 400
      });
    }

    if (password.length < 6) {
      return sendError(res, {
        message: 'Password must be at least 6 characters.',
        statusCode: 400
      });
    }

    var cleanEmail = String(email).trim().toLowerCase();
    var cleanRoll  = rollNo ? String(rollNo).trim() : '';

    /* Check duplicate email */
    var existingEmail = await Student.findOne({ email: cleanEmail });
    if (existingEmail) {
      return sendError(res, { message: 'Email already registered.', statusCode: 400 });
    }

    /* Check duplicate roll no */
    if (cleanRoll) {
      var existingRoll = await Student.findOne({ rollNo: cleanRoll });
      if (existingRoll) {
        return sendError(res, { message: 'Roll number already registered.', statusCode: 400 });
      }
    }

    var studentData = {
      fullName:        String(fullName).trim(),
      email:           cleanEmail,
      password:        password,          /* Schema should hash this via pre-save hook */
      rollNo:          cleanRoll,
      department:      department,
      semester:        semester,
      cgpa:            parseFloat(cgpa) || 7.0,
      preferredDomain: preferredDomain,
      technicalSkills: normalizeArray(technicalSkills),
      softSkills:      normalizeArray(softSkills),
      certifications:  normalizeArray(certifications),
      areasOfInterest: normalizeArray(areasOfInterest),
      isActive:        true,
      role:            'student'
    };

    var student = await Student.create(studentData);

    /* Don't return password in response */
    var safeStudent = student.toObject();
    delete safeStudent.password;
    delete safeStudent.__v;

    return sendSuccess(res, {
      message: 'Student registered successfully.',
      statusCode: 201,
      data: safeStudent
    });
  } catch (err) {
    return sendError(res, {
      message: err.message || 'Registration failed.',
      statusCode: 400
    });
  }
};

/* ============================================================
   POST /api/students
   ADMIN ONLY — create student from admin panel
   ============================================================ */
exports.createStudent = async (req, res) => {
  try {
    var studentData = Object.assign({}, req.body, {
      technicalSkills: normalizeArray(req.body.technicalSkills),
      softSkills:      normalizeArray(req.body.softSkills),
      certifications:  normalizeArray(req.body.certifications),
      areasOfInterest: normalizeArray(req.body.areasOfInterest)
    });

    if (req.file) {
      studentData.resumeFile         = req.file.filename;
      studentData.resumeOriginalName = req.file.originalname;
    }

    var student = await Student.create(studentData);

    var safeStudent = student.toObject();
    delete safeStudent.password;
    delete safeStudent.__v;

    return sendSuccess(res, {
      message: 'Student profile created successfully.',
      statusCode: 201,
      data: safeStudent
    });
  } catch (err) {
    cleanupUpload(req.file);
    return sendError(res, { message: err.message, statusCode: 400 });
  }
};

/* ============================================================
   PUT /api/students/:id
   ADMIN ONLY
   ============================================================ */
exports.updateStudent = async (req, res) => {
  try {
    var updates = Object.assign({}, req.body);

    if (req.body.technicalSkills !== undefined)
      updates.technicalSkills = normalizeArray(req.body.technicalSkills);
    if (req.body.softSkills !== undefined)
      updates.softSkills = normalizeArray(req.body.softSkills);
    if (req.body.certifications !== undefined)
      updates.certifications = normalizeArray(req.body.certifications);
    if (req.body.areasOfInterest !== undefined)
      updates.areasOfInterest = normalizeArray(req.body.areasOfInterest);

    /* Never allow role/password update via this route */
    delete updates.role;
    delete updates.password;

    if (req.file) {
      var existing = await Student.findById(req.params.id);
      if (existing && existing.resumeFile) {
        var oldPath = path.join(__dirname, '..', 'uploads', existing.resumeFile);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      updates.resumeFile         = req.file.filename;
      updates.resumeOriginalName = req.file.originalname;
    }

    var student = await Student.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true
    }).select('-__v -password');

    if (!student) {
      return sendError(res, { message: 'Student not found', statusCode: 404 });
    }

    return sendSuccess(res, {
      message: 'Student profile updated successfully.',
      data: student
    });
  } catch (err) {
    cleanupUpload(req.file);
    return sendError(res, { message: err.message, statusCode: 400 });
  }
};

/* ============================================================
   DELETE /api/students/:id
   ADMIN ONLY — soft delete
   ============================================================ */
exports.deleteStudent = async (req, res) => {
  try {
    var student = await Student.findById(req.params.id);
    if (!student) {
      return sendError(res, { message: 'Student not found', statusCode: 404 });
    }

    student.isActive = false;
    await student.save({ validateBeforeSave: false });

    return sendSuccess(res, {
      message: 'Student "' + student.fullName + '" deleted successfully.'
    });
  } catch (err) {
    return sendError(res, { message: err.message });
  }
};

/* ============================================================
   GET /api/students/:id/recommendations
   ============================================================ */
exports.getRecommendationsForStudent = async (req, res) => {
  try {
    var student = await Student.findById(req.params.id);
    if (!student || !student.isActive) {
      return sendError(res, { message: 'Student not found', statusCode: 404 });
    }

    var internships = await Internship.find({ isActive: true });
    var topN        = parseInt(req.query.topN) || 10;
    var results     = getRecommendations(student, internships, topN);

    return sendSuccess(res, {
      data: results,
      meta: {
        studentId:   student._id,
        studentName: student.fullName,
        total:       results.length
      }
    });
  } catch (err) {
    return sendError(res, { message: err.message });
  }
};

/* ============================================================
   GET /api/students/:id/applications
   ============================================================ */
exports.getStudentApplications = async (req, res) => {
  try {
    var apps = await Application.find({ student: req.params.id })
      .populate('internship', 'title company domain location stipend deadline')
      .sort({ createdAt: -1 });

    return sendSuccess(res, { data: apps });
  } catch (err) {
    return sendError(res, { message: err.message });
  }
};

/* ============================================================
   GET /api/students/:id/resume
   ============================================================ */
exports.downloadResume = async (req, res) => {
  try {
    var student = await Student.findById(req.params.id);

    if (!student || !student.resumeFile) {
      return sendError(res, { message: 'Resume not found', statusCode: 404 });
    }

    var filePath = path.join(__dirname, '..', 'uploads', student.resumeFile);

    if (!fs.existsSync(filePath)) {
      return sendError(res, {
        message: 'Resume file is missing on the server.',
        statusCode: 404
      });
    }

    return res.download(filePath, student.resumeOriginalName || student.resumeFile);
  } catch (err) {
    return sendError(res, { message: err.message });
  }
};