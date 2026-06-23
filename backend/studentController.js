/* ================================================================
   AI INTERNSHIP ALLOCATION & RECOMMENDATION SYSTEM
   studentController.js — FINAL FIXED VERSION
   ================================================================ */

const path = require('path');
const fs = require('fs');

const Student = require('./Student');
const Application = require('./Application');
const Internship = require('./Internship');

const { sendSuccess, sendError, paginate } = require('./apiResponse');
const { getRecommendations } = require('./aiMatcher');

/* ── Helper: normalise comma-separated or array values ─────── */
function normalizeArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val.map(function (s) { return String(s).trim(); }).filter(Boolean);
  }
  return String(val)
    .split(',')
    .map(function (s) { return s.trim(); })
    .filter(Boolean);
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
      page = 1,
      limit = 20,
      search,
      department,
      semester,
      preferredDomain,
      sortBy = 'createdAt',
      order = 'desc'
    } = req.query;

    var filter = { isActive: true };

    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { rollNo: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (department) filter.department = department;
    if (semester) filter.semester = semester;
    if (preferredDomain) filter.preferredDomain = preferredDomain;

    var pageNum = parseInt(page, 10) || 1;
    var limitNum = parseInt(limit, 10) || 20;
    var skip = (pageNum - 1) * limitNum;
    var sort = { [sortBy]: order === 'asc' ? 1 : -1 };

    var total = await Student.countDocuments(filter);

    var students = await Student.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .select('-__v -password');

    return sendSuccess(res, {
      data: students,
      meta: paginate(pageNum, limitNum, total)
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
   ============================================================ */
exports.registerStudent = async (req, res) => {
  try {
    var {
      fullName,
      email,
      password,
      rollNo,
      department = 'Computer Engineering',
      semester = 'Semester 6',
      cgpa = 7.0,
      percentage = null,
      preferredDomain = 'Artificial Intelligence',
      technicalSkills = [],
      softSkills = [],
      certifications = [],
      areasOfInterest = [],
      projects = '',
      phone = '',
      city = ''
    } = req.body;

    if (!fullName || !email || !password || !rollNo) {
      return sendError(res, {
        message: 'Full name, email, password and roll number are required.',
        statusCode: 400
      });
    }

    if (String(password).length < 6) {
      return sendError(res, {
        message: 'Password must be at least 6 characters.',
        statusCode: 400
      });
    }

    var cleanEmail = String(email).trim().toLowerCase();
    var cleanRoll = String(rollNo).trim().toUpperCase();
    var parsedCgpa = parseFloat(cgpa);

    if (isNaN(parsedCgpa) || parsedCgpa < 0 || parsedCgpa > 10) {
      return sendError(res, {
        message: 'CGPA must be between 0 and 10.',
        statusCode: 400
      });
    }

    var existingEmail = await Student.findOne({ email: cleanEmail });
    if (existingEmail) {
      return sendError(res, {
        message: 'Email already registered.',
        statusCode: 400
      });
    }

    var existingRoll = await Student.findOne({ rollNo: cleanRoll });
    if (existingRoll) {
      return sendError(res, {
        message: 'Roll number already registered.',
        statusCode: 400
      });
    }

    var studentData = {
      fullName: String(fullName).trim(),
      email: cleanEmail,
      password: password,
      rollNo: cleanRoll,
      department: department,
      semester: semester,
      cgpa: parsedCgpa,
      percentage: percentage !== null && percentage !== '' ? parseFloat(percentage) : null,
      preferredDomain: preferredDomain,
      technicalSkills: normalizeArray(technicalSkills),
      softSkills: normalizeArray(softSkills),
      certifications: normalizeArray(certifications),
      areasOfInterest: normalizeArray(areasOfInterest),
      projects: String(projects || '').trim(),
      phone: String(phone || '').trim(),
      city: String(city || '').trim(),
      isActive: true,
      role: 'student'
    };

    var student = await Student.create(studentData);

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
      softSkills: normalizeArray(req.body.softSkills),
      certifications: normalizeArray(req.body.certifications),
      areasOfInterest: normalizeArray(req.body.areasOfInterest)
    });

    if (studentData.rollNo) {
      studentData.rollNo = String(studentData.rollNo).trim().toUpperCase();
    }

    if (studentData.email) {
      studentData.email = String(studentData.email).trim().toLowerCase();
    }

    if (studentData.cgpa !== undefined && studentData.cgpa !== '') {
      studentData.cgpa = parseFloat(studentData.cgpa);
    }

    if (studentData.percentage !== undefined && studentData.percentage !== '') {
      studentData.percentage = parseFloat(studentData.percentage);
    }

    if (req.file) {
      studentData.resumeFile = req.file.filename;
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

    if (req.body.technicalSkills !== undefined) {
      updates.technicalSkills = normalizeArray(req.body.technicalSkills);
    }
    if (req.body.softSkills !== undefined) {
      updates.softSkills = normalizeArray(req.body.softSkills);
    }
    if (req.body.certifications !== undefined) {
      updates.certifications = normalizeArray(req.body.certifications);
    }
    if (req.body.areasOfInterest !== undefined) {
      updates.areasOfInterest = normalizeArray(req.body.areasOfInterest);
    }

    if (updates.rollNo) {
      updates.rollNo = String(updates.rollNo).trim().toUpperCase();
    }

    if (updates.email) {
      updates.email = String(updates.email).trim().toLowerCase();
    }

    if (updates.cgpa !== undefined && updates.cgpa !== '') {
      updates.cgpa = parseFloat(updates.cgpa);
    }

    if (updates.percentage !== undefined && updates.percentage !== '') {
      updates.percentage = parseFloat(updates.percentage);
    }

    delete updates.role;
    delete updates.password;

    if (req.file) {
      var existing = await Student.findById(req.params.id);

      if (existing && existing.resumeFile) {
        var oldPath = path.join(__dirname, '..', 'uploads', existing.resumeFile);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }

      updates.resumeFile = req.file.filename;
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
    var topN = parseInt(req.query.topN, 10) || 10;
    var results = getRecommendations(student, internships, topN);

    return sendSuccess(res, {
      data: results,
      meta: {
        studentId: student._id,
        studentName: student.fullName,
        total: results.length
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