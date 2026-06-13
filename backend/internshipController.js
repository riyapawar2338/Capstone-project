// controllers/internshipController.js
const Internship  = require('./Internship');
const Application = require('./Application');
const Student     = require('./Student');
const { sendSuccess, sendError, paginate } = require('./apiResponse');
const { getBulkBestMatches }              =  require('./aiMatcher');

// ── GET /api/internships ──────────────────────────────────────
exports.getAllInternships = async (req, res) => {
  try {
    const {
      page = 1, limit = 20,
      search, domain, location, duration,
      minCgpa, sortBy = 'createdAt', order = 'desc',
      active = 'true',
    } = req.query;

    const filter = {};
    if (active === 'true') filter.isActive = true;

    if (search) {
      filter.$or = [
        { title:       { $regex: search, $options: 'i' } },
        { company:     { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }
    if (domain)   filter.domain   = domain;
    if (location) filter.location = { $regex: location, $options: 'i' };
    if (duration) filter.duration = duration;
    if (minCgpa)  filter.minCgpa  = { $lte: parseFloat(minCgpa) };

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const sort  = { [sortBy]: order === 'asc' ? 1 : -1 };
    const total = await Internship.countDocuments(filter);

    const internships = await Internship.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');

    return sendSuccess(res, {
      data: internships,
      meta: paginate(page, limit, total),
    });
  } catch (err) {
    return sendError(res, { message: err.message });
  }
};

// ── GET /api/internships/:id ──────────────────────────────────
exports.getInternshipById = async (req, res) => {
  try {
    const internship = await Internship.findById(req.params.id).select('-__v');
    if (!internship) {
      return sendError(res, { message: 'Internship not found', statusCode: 404 });
    }
    return sendSuccess(res, { data: internship });
  } catch (err) {
    return sendError(res, { message: err.message });
  }
};

// ── POST /api/internships (admin) ─────────────────────────────
exports.createInternship = async (req, res) => {
  try {
    const normalizeArray = (val) => {
      if (!val) return [];
      if (Array.isArray(val)) return val.map(s => s.trim()).filter(Boolean);
      return String(val).split(',').map(s => s.trim()).filter(Boolean);
    };

    const data = {
      ...req.body,
      requiredSkills: normalizeArray(req.body.requiredSkills),
      tags:           normalizeArray(req.body.tags),
      postedBy:       req.admin?._id || null,
    };

    const internship = await Internship.create(data);
    return sendSuccess(res, {
      message: 'Internship created successfully',
      statusCode: 201,
      data: internship,
    });
  } catch (err) {
    return sendError(res, { message: err.message, statusCode: 400 });
  }
};

// ── PUT /api/internships/:id (admin) ──────────────────────────
exports.updateInternship = async (req, res) => {
  try {
    const normalizeArray = (val) => {
      if (val === undefined) return undefined;
      if (Array.isArray(val)) return val.map(s => s.trim()).filter(Boolean);
      return String(val).split(',').map(s => s.trim()).filter(Boolean);
    };

    const updates = { ...req.body };
    if (req.body.requiredSkills !== undefined) updates.requiredSkills = normalizeArray(req.body.requiredSkills);
    if (req.body.tags           !== undefined) updates.tags           = normalizeArray(req.body.tags);

    const internship = await Internship.findByIdAndUpdate(
      req.params.id, updates, { new: true, runValidators: true }
    );
    if (!internship) {
      return sendError(res, { message: 'Internship not found', statusCode: 404 });
    }
    return sendSuccess(res, { message: 'Internship updated', data: internship });
  } catch (err) {
    return sendError(res, { message: err.message, statusCode: 400 });
  }
};

// ── DELETE /api/internships/:id (admin) ───────────────────────
exports.deleteInternship = async (req, res) => {
  try {
    const internship = await Internship.findByIdAndUpdate(
      req.params.id, { isActive: false }, { new: true }
    );
    if (!internship) {
      return sendError(res, { message: 'Internship not found', statusCode: 404 });
    }
    return sendSuccess(res, { message: `Internship '${internship.title}' deactivated` });
  } catch (err) {
    return sendError(res, { message: err.message });
  }
};

// ── GET /api/internships/:id/applications (admin) ─────────────
exports.getInternshipApplications = async (req, res) => {
  try {
    const apps = await Application.find({ internship: req.params.id })
      .populate('student', 'fullName rollNo department cgpa email phone')
      .sort({ matchScore: -1 });

    return sendSuccess(res, {
      data: apps,
      meta: { total: apps.length },
    });
  } catch (err) {
    return sendError(res, { message: err.message });
  }
};

// ── GET /api/internships/meta/filters ────────────────────────
// Returns distinct values for filter dropdowns
exports.getFilterMeta = async (req, res) => {
  try {
    const [domains, locations, durations] = await Promise.all([
      Internship.distinct('domain',   { isActive: true }),
      Internship.distinct('location', { isActive: true }),
      Internship.distinct('duration', { isActive: true }),
    ]);
    return sendSuccess(res, { data: { domains, locations, durations } });
  } catch (err) {
    return sendError(res, { message: err.message });
  }
};