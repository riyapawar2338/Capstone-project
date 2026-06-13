// controllers/studentController.js
const path        = require('path');
const fs          = require('fs');
const Student     = require('./Student');
const Application = require('./Application');
const { sendSuccess, sendError, paginate } = require('./apiResponse');
const { getRecommendations }               =  require('./aiMatcher');
const Internship  = require('./Internship');

// ── GET /api/students ─────────────────────────────────────────
// Query params: page, limit, search, department, semester, domain, sortBy
exports.getAllStudents = async (req, res) => {
  try {
    const {
      page = 1, limit = 20,
      search, department, semester, preferredDomain,
      sortBy = 'createdAt', order = 'desc',
    } = req.query;

    const filter = { isActive: true };

    // Text search on fullName + rollNo
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { rollNo:   { $regex: search, $options: 'i' } },
        { email:    { $regex: search, $options: 'i' } },
      ];
    }
    if (department)      filter.department      = department;
    if (semester)        filter.semester        = semester;
    if (preferredDomain) filter.preferredDomain = preferredDomain;

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const sort  = { [sortBy]: order === 'asc' ? 1 : -1 };
    const total = await Student.countDocuments(filter);

    const students = await Student.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');

    return sendSuccess(res, {
      data: students,
      meta: paginate(page, limit, total),
    });
  } catch (err) {
    return sendError(res, { message: err.message });
  }
};

// ── GET /api/students/:id ─────────────────────────────────────
exports.getStudentById = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).select('-__v');
    if (!student || !student.isActive) {
      return sendError(res, { message: 'Student not found', statusCode: 404 });
    }
    return sendSuccess(res, { data: student });
  } catch (err) {
    return sendError(res, { message: err.message });
  }
};

// ── POST /api/students ────────────────────────────────────────
exports.createStudent = async (req, res) => {
  try {
    // Handle arrays that might come as comma-separated strings from FormData
    const normalizeArray = (val) => {
      if (!val) return [];
      if (Array.isArray(val)) return val.map(s => s.trim()).filter(Boolean);
      return val.split(',').map(s => s.trim()).filter(Boolean);
    };

    const studentData = {
      ...req.body,
      technicalSkills:  normalizeArray(req.body.technicalSkills),
      softSkills:       normalizeArray(req.body.softSkills),
      certifications:   normalizeArray(req.body.certifications),
      areasOfInterest:  normalizeArray(req.body.areasOfInterest),
    };

    // Attach resume if uploaded
    if (req.file) {
      studentData.resumeFile         = req.file.filename;
      studentData.resumeOriginalName = req.file.originalname;
    }

    const student = await Student.create(studentData);
    return sendSuccess(res, {
      message: 'Student profile created successfully',
      statusCode: 201,
      data: student,
    });
  } catch (err) {
    // Clean up uploaded file on error
    if (req.file) {
      const filePath = path.join(__dirname, '..', 'uploads', req.file.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    return sendError(res, { message: err.message, statusCode: 400 });
  }
};

// ── PUT /api/students/:id ─────────────────────────────────────
exports.updateStudent = async (req, res) => {
  try {
    const normalizeArray = (val) => {
      if (!val) return undefined;
      if (Array.isArray(val)) return val.map(s => s.trim()).filter(Boolean);
      return val.split(',').map(s => s.trim()).filter(Boolean);
    };

    const updates = { ...req.body };
    if (req.body.technicalSkills !== undefined) updates.technicalSkills = normalizeArray(req.body.technicalSkills);
    if (req.body.softSkills      !== undefined) updates.softSkills      = normalizeArray(req.body.softSkills);
    if (req.body.certifications  !== undefined) updates.certifications  = normalizeArray(req.body.certifications);
    if (req.body.areasOfInterest !== undefined) updates.areasOfInterest = normalizeArray(req.body.areasOfInterest);

    // New resume upload
    if (req.file) {
      // Delete old resume file
      const existing = await Student.findById(req.params.id);
      if (existing?.resumeFile) {
        const oldPath = path.join(__dirname, '..', 'uploads', existing.resumeFile);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      updates.resumeFile         = req.file.filename;
      updates.resumeOriginalName = req.file.originalname;
    }

    const student = await Student.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!student) {
      return sendError(res, { message: 'Student not found', statusCode: 404 });
    }

    return sendSuccess(res, {
      message: 'Student profile updated successfully',
      data: student,
    });
  } catch (err) {
    return sendError(res, { message: err.message, statusCode: 400 });
  }
};

// ── DELETE /api/students/:id ──────────────────────────────────
exports.deleteStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return sendError(res, { message: 'Student not found', statusCode: 404 });
    }

    // Soft delete
    student.isActive = false;
    await student.save({ validateBeforeSave: false });

    return sendSuccess(res, { message: `Student '${student.fullName}' deleted successfully` });
  } catch (err) {
    return sendError(res, { message: err.message });
  }
};

// ── GET /api/students/:id/recommendations ────────────────────
exports.getRecommendationsForStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return sendError(res, { message: 'Student not found', statusCode: 404 });
    }

    const internships = await Internship.find({ isActive: true });
    const topN        = parseInt(req.query.topN) || 10;
    const results     = getRecommendations(student, internships, topN);

    return sendSuccess(res, {
      data: results,
      meta: {
        studentId:   student._id,
        studentName: student.fullName,
        total:       results.length,
      },
    });
  } catch (err) {
    return sendError(res, { message: err.message });
  }
};

// ── GET /api/students/:id/applications ───────────────────────
exports.getStudentApplications = async (req, res) => {
  try {
    const apps = await Application.find({ student: req.params.id })
      .populate('internship', 'title company domain location stipend deadline')
      .sort({ createdAt: -1 });

    return sendSuccess(res, { data: apps });
  } catch (err) {
    return sendError(res, { message: err.message });
  }
};

// ── GET /api/students/:id/resume ──────────────────────────────
exports.downloadResume = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student || !student.resumeFile) {
      return sendError(res, { message: 'Resume not found', statusCode: 404 });
    }
    const filePath = path.join(__dirname, '..', 'uploads', student.resumeFile);
    if (!fs.existsSync(filePath)) {
      return sendError(res, { message: 'Resume file missing on server', statusCode: 404 });
    }
    res.download(filePath, student.resumeOriginalName || student.resumeFile);
  } catch (err) {
    return sendError(res, { message: err.message });
  }
};