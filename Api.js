/* ============================================================
   AI INTERNSHIP ALLOCATION & RECOMMENDATION SYSTEM
   api.js — Frontend REST API Client
   Connects the HTML pages to the Node.js/Express backend.
   Falls back to LocalStorage if backend is unreachable.
   ============================================================ */
'use strict';

/* ============================================================
   GLOBAL CONFIG
   ============================================================ */
window._backendOnline = null;
window.API_BASE =
  window.API_BASE || 'https://capstone-project-backend-m20u.onrender.com/api';

/* ============================================================
   SMALL HELPERS
   ============================================================ */
function genId() {
  return (
    'id_' +
    Date.now().toString(36) +
    '_' +
    Math.random().toString(36).slice(2, 9)
  );
}

/**
 * Normalise a comma-separated string OR array into an array of strings.
 * Example:
 *   "C, C++, Java" -> ["C","C++","Java"]
 */
function normaliseArray(v) {
  if (v == null) return [];
  if (Array.isArray(v)) {
    return v.map(x => String(x).trim()).filter(Boolean);
  }
  return String(v)
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

/**
 * Safely extract an ID from a primitive, object, or mixed field.
 */
function extractId(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return value._id || value.id || null;
  return null;
}

/* ============================================================
   TOKEN MANAGEMENT
   ============================================================ */
const TokenStore = {
  get() {
    return localStorage.getItem('aiias_admin_token');
  },
  set(t) {
    localStorage.setItem('aiias_admin_token', t);
  },
  clear() {
    localStorage.removeItem('aiias_admin_token');
  },
  isPresent() {
    return !!this.get();
  },
};

/* ============================================================
   CONNECTION STATE
   ============================================================ */
window.isBackendOnline = async function (force = false) {
  if (!force && window._backendOnline !== null) {
    return window._backendOnline;
  }

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);

    const r = await fetch(`${window.API_BASE}/health`, {
      signal: ctrl.signal,
    });

    clearTimeout(timer);
    window._backendOnline = r.ok;
  } catch (e) {
    window._backendOnline = false;
  }

  const badge = document.getElementById('connBadge');
  if (badge) {
    badge.textContent = window._backendOnline
      ? '🟢 API Connected'
      : '🟡 Offline Mode';
  }

  return window._backendOnline;
};

/* ============================================================
   BASE HTTP HELPER
   ============================================================ */
async function apiRequest(method, path, body = null, isFormData = false) {
  const headers = {};

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  if (TokenStore.isPresent()) {
    headers['Authorization'] = `Bearer ${TokenStore.get()}`;
  }

  const options = { method, headers };
  if (body) {
    options.body = isFormData ? body : JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(`${window.API_BASE}${path}`, options);
  } catch (err) {
    window._backendOnline = false;
    throw new Error('Backend request failed');
  }

  const rawText = await response.text();
  let json = null;

  try {
    json = rawText ? JSON.parse(rawText) : null;
  } catch {
    json = null;
  }

  if (!response.ok) {
    window._backendOnline = false;
    throw new Error(json?.message || `API error ${response.status}`);
  }

  if (json && json.success === false) {
    throw new Error(json.message || `API error ${response.status}`);
  }

  return json || { success: true };
}

/* ============================================================
   SHORTHAND HTTP METHODS
   ============================================================ */
const http = {
  get: path => apiRequest('GET', path),
  post: (path, body) => apiRequest('POST', path, body),
  put: (path, body) => apiRequest('PUT', path, body),
  patch: (path, body) => apiRequest('PATCH', path, body),
  del: path => apiRequest('DELETE', path),
  postForm: (path, formData) => apiRequest('POST', path, formData, true),
  putForm: (path, formData) => apiRequest('PUT', path, formData, true),
};

/* ============================================================
   STUDENTS API
   ============================================================ */
const StudentsAPI = {
  async getAll(params = {}) {
    const qs = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== '' && v != null)
      )
    ).toString();

    return await http.get(`/students${qs ? '?' + qs : ''}`);
  },

  async getById(id) {
    const res = await http.get(`/students/${id}`);
    return res.data;
  },

  async create(payload) {
    const res =
      payload instanceof FormData
        ? await http.postForm('/students', payload)
        : await http.post('/students', payload);
    return res.data;
  },

  async update(id, payload) {
    const res =
      payload instanceof FormData
        ? await http.putForm(`/students/${id}`, payload)
        : await http.put(`/students/${id}`, payload);
    return res.data;
  },

  async delete(id) {
    await http.del(`/students/${id}`);
  },

  async getRecommendations(id, topN = 10) {
    const res = await http.get(`/students/${id}/recommendations?topN=${topN}`);
    return res.data;
  },

  async getApplications(id) {
    const res = await http.get(`/students/${id}/applications`);
    return res.data;
  },

  downloadResume(id) {
    window.open(`${window.API_BASE}/students/${id}/resume`, '_blank');
  },
};

/* ============================================================
   INTERNSHIPS API
   ============================================================ */
const InternshipsAPI = {
  async getAll(params = {}) {
    const qs = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== '' && v != null)
      )
    ).toString();

    return await http.get(`/internships${qs ? '?' + qs : ''}`);
  },

  async getById(id) {
    const res = await http.get(`/internships/${id}`);
    return res.data;
  },

  async create(payload) {
    const res = await http.post('/internships', payload);
    return res.data;
  },

  async update(id, payload) {
    const res = await http.put(`/internships/${id}`, payload);
    return res.data;
  },

  async delete(id) {
    await http.del(`/internships/${id}`);
  },

  async getFilterMeta() {
    const res = await http.get('/internships/meta/filters');
    return res.data;
  },

  async getApplications(id) {
    const res = await http.get(`/internships/${id}/applications`);
    return res.data;
  },
};

/* ============================================================
   APPLICATIONS API
   ============================================================ */
const ApplicationsAPI = {
  async create(studentId, internshipId, coverLetter = '') {
    const res = await http.post('/applications', {
      studentId,
      internshipId,
      coverLetter,
    });
    return res.data;
  },

  async getAll(params = {}) {
    const qs = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== '' && v != null)
      )
    ).toString();

    return await http.get(`/applications${qs ? '?' + qs : ''}`);
  },

  async getById(id) {
    const res = await http.get(`/applications/${id}`);
    return res.data;
  },

  async updateStatus(id, status, adminNotes = '') {
    const res = await http.patch(`/applications/${id}/status`, {
      status,
      adminNotes,
    });
    return res.data;
  },

  async delete(id) {
    await http.del(`/applications/${id}`);
  },

  async getAnalytics() {
    const res = await http.get('/applications/analytics');
    return res.data;
  },
};

/* ============================================================
   ADMIN API
   ============================================================ */
const AdminAPI = {
  async login(email, password) {
    const res = await http.post('/auth/login', { email, password });
    if (res?.data?.token) TokenStore.set(res.data.token);
    return res.data;
  },

  async logout() {
    try {
      await http.post('/auth/logout');
    } catch (_) {}
    TokenStore.clear();
  },

  async getMe() {
    const res = await http.get('/auth/me');
    return res.data;
  },

  async getDashboard() {
    const res = await http.get('/admin/dashboard');
    return res.data;
  },

  async getAllocationReport() {
    const res = await http.get('/admin/allocation');
    return res.data;
  },

  async getStudentsReport() {
    const res = await http.get('/admin/reports/students');
    return res.data;
  },

  async getRecommendationsReport() {
    const res = await http.get('/admin/reports/recommendations');
    return res.data;
  },
};

/* ============================================================
   LOCAL STORAGE STORE (offline fallback)
   ============================================================ */
const API_KEYS = {
  STUDENTS: 'aiias_students',
  INTERNSHIPS: 'aiias_internships',
  APPLICATIONS: 'aiias_applications',
};

const APIStore = {
  get(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || [];
    } catch {
      return [];
    }
  },

  set(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  },

  getOne(key, id) {
    return this.get(key).find(i => (i._id || i.id) === id) || null;
  },

  save(key, item) {
    const list = this.get(key);
    const itemId = item._id || item.id;

    const idx = list.findIndex(i => (i._id || i.id) === itemId);
    if (idx >= 0) list.splice(idx, 1, item);
    else list.push(item);

    this.set(key, list);
  },

  remove(key, id) {
    this.set(
      key,
      this.get(key).filter(i => (i._id || i.id) !== id)
    );
  },
};

/* ============================================================
   UNIFIED DATASERVICE
   Auto-selects API or LocalStorage based on backend availability
   ============================================================ */
const DataService = {
  /* ────────────────────────────────────────────────────────────
     STUDENTS
     ──────────────────────────────────────────────────────────── */
  async getStudents(params = {}) {
    if (await window.isBackendOnline()) {
      return StudentsAPI.getAll(params);
    }

    let data = APIStore.get(API_KEYS.STUDENTS);

    if (params.search) {
      const s = String(params.search).toLowerCase();
      data = data.filter(st =>
        (st.fullName || '').toLowerCase().includes(s) ||
        (st.rollNo || '').toLowerCase().includes(s) ||
        (st.department || '').toLowerCase().includes(s) ||
        (st.technicalSkills || []).join(' ').toLowerCase().includes(s)
      );
    }

    if (params.department) {
      data = data.filter(st => st.department === params.department);
    }
    if (params.semester) {
      data = data.filter(st => String(st.semester) === String(params.semester));
    }
    if (params.preferredDomain) {
      data = data.filter(st => st.preferredDomain === params.preferredDomain);
    }

    return {
      data,
      meta: { total: data.length, page: 1, totalPages: 1 },
    };
  },

  async getStudent(id) {
    if (await window.isBackendOnline()) {
      return StudentsAPI.getById(id);
    }
    return APIStore.getOne(API_KEYS.STUDENTS, id);
  },

  async createStudent(payload) {
    if (await window.isBackendOnline()) {
      return StudentsAPI.create(payload);
    }

    const raw =
      payload instanceof FormData ? Object.fromEntries(payload) : { ...payload };

    const newId = genId();

    const student = {
      ...raw,
      _id: newId,
      id: newId,
      technicalSkills: normaliseArray(raw.technicalSkills),
      softSkills: normaliseArray(raw.softSkills),
      certifications: normaliseArray(raw.certifications),
      areasOfInterest: normaliseArray(raw.areasOfInterest),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    APIStore.save(API_KEYS.STUDENTS, student);
    return student;
  },

  async updateStudent(id, payload) {
    if (await window.isBackendOnline()) {
      return StudentsAPI.update(id, payload);
    }

    const existing = APIStore.getOne(API_KEYS.STUDENTS, id) || {};
    const raw =
      payload instanceof FormData ? Object.fromEntries(payload) : { ...payload };

    const updated = {
      ...existing,
      ...raw,
      updatedAt: new Date().toISOString(),
    };

    if (raw.technicalSkills !== undefined) {
      updated.technicalSkills = normaliseArray(raw.technicalSkills);
    }
    if (raw.softSkills !== undefined) {
      updated.softSkills = normaliseArray(raw.softSkills);
    }
    if (raw.certifications !== undefined) {
      updated.certifications = normaliseArray(raw.certifications);
    }
    if (raw.areasOfInterest !== undefined) {
      updated.areasOfInterest = normaliseArray(raw.areasOfInterest);
    }

    APIStore.save(API_KEYS.STUDENTS, updated);
    return updated;
  },

  async deleteStudent(id) {
    if (await window.isBackendOnline()) {
      return StudentsAPI.delete(id);
    }
    APIStore.remove(API_KEYS.STUDENTS, id);
  },

  async getRecommendations(studentId, topN = 10) {
    if (await window.isBackendOnline()) {
      return StudentsAPI.getRecommendations(studentId, topN);
    }

    const student = APIStore.getOne(API_KEYS.STUDENTS, studentId);
    const internships = APIStore.get(API_KEYS.INTERNSHIPS);

    if (!student) return [];

    return internships
      .map(i => {
        const score = typeof calcMatchScore === 'function'
          ? calcMatchScore(student, i)
          : 0;

        return {
          internship: i,
          matchScore: score,
          label:
            score >= 80
              ? 'Excellent Match'
              : score >= 60
              ? 'Good Match'
              : score >= 40
              ? 'Fair Match'
              : 'Low Match',
          breakdown: {},
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, topN);
  },

  async getStudentApplications(studentId) {
    if (await window.isBackendOnline()) {
      return StudentsAPI.getApplications(studentId);
    }

    return APIStore.get(API_KEYS.APPLICATIONS)
      .filter(a => {
        const appStudentId = extractId(a.studentId) || extractId(a.student);
        return appStudentId === studentId;
      })
      .map(a => ({
        ...a,
        internship: APIStore.getOne(
          API_KEYS.INTERNSHIPS,
          extractId(a.internshipId) || extractId(a.internship)
        ),
      }));
  },

  /* ────────────────────────────────────────────────────────────
     INTERNSHIPS
     ──────────────────────────────────────────────────────────── */
  async getInternships(params = {}) {
    if (await window.isBackendOnline()) {
      return InternshipsAPI.getAll(params);
    }

    let data = APIStore.get(API_KEYS.INTERNSHIPS);

    if (params.search) {
      const s = String(params.search).toLowerCase();
      data = data.filter(i =>
        (i.title || '').toLowerCase().includes(s) ||
        (i.company || '').toLowerCase().includes(s) ||
        (i.domain || '').toLowerCase().includes(s)
      );
    }

    if (params.domain) {
      data = data.filter(i => i.domain === params.domain);
    }
    if (params.location) {
      data = data.filter(i => i.location === params.location);
    }
    if (params.duration) {
      data = data.filter(i => i.duration === params.duration);
    }
    if (params.minCgpa) {
      data = data.filter(
        i => parseFloat(i.minCgpa || 0) <= parseFloat(params.minCgpa)
      );
    }

    return { data, meta: { total: data.length } };
  },

  async getInternship(id) {
    if (await window.isBackendOnline()) {
      return InternshipsAPI.getById(id);
    }
    return APIStore.getOne(API_KEYS.INTERNSHIPS, id);
  },

  async getFilterMeta() {
    if (await window.isBackendOnline()) {
      return InternshipsAPI.getFilterMeta();
    }

    const all = APIStore.get(API_KEYS.INTERNSHIPS);
    return {
      domains: [...new Set(all.map(i => i.domain).filter(Boolean))],
      locations: [...new Set(all.map(i => i.location).filter(Boolean))],
      durations: [...new Set(all.map(i => i.duration).filter(Boolean))],
    };
  },

  /* ────────────────────────────────────────────────────────────
     APPLICATIONS
     ──────────────────────────────────────────────────────────── */
  async applyForInternship(studentId, internshipId, coverLetter = '') {
    if (await window.isBackendOnline()) {
      return ApplicationsAPI.create(studentId, internshipId, coverLetter);
    }

    const apps = APIStore.get(API_KEYS.APPLICATIONS);

    const alreadyApplied = apps.some(a => {
      const appStudentId =
        extractId(a.studentId) || extractId(a.student);
      const appInternshipId =
        extractId(a.internshipId) || extractId(a.internship);

      return appStudentId === studentId && appInternshipId === internshipId;
    });

    if (alreadyApplied) {
      throw new Error('You have already applied for this internship');
    }

    const student = APIStore.getOne(API_KEYS.STUDENTS, studentId);
    const internship = APIStore.getOne(API_KEYS.INTERNSHIPS, internshipId);

    const score =
      typeof calcMatchScore === 'function'
        ? calcMatchScore(student, internship)
        : 0;

    const newAppId = genId();

    const app = {
      _id: newAppId,
      id: newAppId,
      studentId,
      internshipId,
      student: {
        _id: student?._id || student?.id || studentId,
        fullName: student?.fullName || '',
        rollNo: student?.rollNo || '',
        department: student?.department || '',
      },
      internship: {
        _id: internship?._id || internship?.id || internshipId,
        title: internship?.title || '',
        company: internship?.company || '',
        domain: internship?.domain || '',
      },
      studentName: student?.fullName || '',
      rollNo: student?.rollNo || '',
      matchScore: score,
      coverLetter,
      status: 'Pending',
      appliedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    APIStore.save(API_KEYS.APPLICATIONS, app);
    return app;
  },

  async getApplications(params = {}) {
    if (await window.isBackendOnline()) {
      return ApplicationsAPI.getAll(params);
    }

    let data = APIStore.get(API_KEYS.APPLICATIONS);

    if (params.status) {
      data = data.filter(a => a.status === params.status);
    }

    if (params.studentId) {
      data = data.filter(a => {
        const appStudentId =
          extractId(a.studentId) || extractId(a.student);
        return appStudentId === params.studentId;
      });
    }

    if (params.internshipId) {
      data = data.filter(a => {
        const appInternshipId =
          extractId(a.internshipId) || extractId(a.internship);
        return appInternshipId === params.internshipId;
      });
    }

    return { data, meta: { total: data.length } };
  },

  async updateApplicationStatus(id, status, notes = '') {
    if (await window.isBackendOnline()) {
      return ApplicationsAPI.updateStatus(id, status, notes);
    }

    const apps = APIStore.get(API_KEYS.APPLICATIONS);
    const idx = apps.findIndex(a => (a._id || a.id) === id);

    if (idx < 0) {
      throw new Error('Application not found');
    }

    apps[idx].status = status;
    if (notes) apps[idx].adminNotes = notes;
    apps[idx].updatedAt = new Date().toISOString();

    APIStore.set(API_KEYS.APPLICATIONS, apps);
    return apps[idx];
  },

  async deleteApplication(id) {
    if (await window.isBackendOnline()) {
      return ApplicationsAPI.delete(id);
    }
    APIStore.remove(API_KEYS.APPLICATIONS, id);
  },

  /* ────────────────────────────────────────────────────────────
     ADMIN DASHBOARD
     ──────────────────────────────────────────────────────────── */
  async getAdminDashboard() {
    if (await window.isBackendOnline()) {
      return AdminAPI.getDashboard();
    }

    const students = APIStore.get(API_KEYS.STUDENTS);
    const internships = APIStore.get(API_KEYS.INTERNSHIPS);
    const apps = APIStore.get(API_KEYS.APPLICATIONS);

    const groupBy = (arr, key) =>
      arr.reduce((m, i) => {
        const k = i[key] || 'Unknown';
        m[k] = (m[k] || 0) + 1;
        return m;
      }, {});

    return {
      stats: {
        totalStudents: students.length,
        totalInternships: internships.length,
        totalApplications: apps.length,
        accepted: apps.filter(a => a.status === 'Accepted').length,
        pending: apps.filter(a => a.status === 'Pending').length,
        shortlisted: apps.filter(a => a.status === 'Shortlisted').length,
        rejected: apps.filter(a => a.status === 'Rejected').length,
      },

      deptBreakdown: Object.entries(groupBy(students, 'department'))
        .map(([_id, count]) => ({ _id, count }))
        .sort((a, b) => b.count - a.count),

      domainBreakdown: Object.entries(groupBy(students, 'preferredDomain'))
        .map(([_id, count]) => ({ _id, count }))
        .sort((a, b) => b.count - a.count),

      cgpaStats: {
        avgCgpa: students.length
          ? (
              students.reduce(
                (sum, st) => sum + (parseFloat(st.cgpa) || 0),
                0
              ) / students.length
            ).toFixed(2)
          : 0,
      },

      recentStudents: [...students]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5),

      recentApplications: [...apps]
        .sort(
          (a, b) =>
            new Date(b.createdAt || b.appliedAt) -
            new Date(a.createdAt || a.appliedAt)
        )
        .slice(0, 5)
        .map(a => ({
          ...a,
          student: {
            fullName: a.studentName || a.student?.fullName || '',
            rollNo: a.rollNo || a.student?.rollNo || '',
          },
          internship: APIStore.getOne(
            API_KEYS.INTERNSHIPS,
            extractId(a.internshipId) || extractId(a.internship)
          ),
        })),
    };
  },

  async getAllocationReport() {
    if (await window.isBackendOnline()) {
      return AdminAPI.getAllocationReport();
    }

    const students = APIStore.get(API_KEYS.STUDENTS);
    const internships = APIStore.get(API_KEYS.INTERNSHIPS);
    const apps = APIStore.get(API_KEYS.APPLICATIONS);

    return students.map(s => {
      const scored = internships
        .map(i => ({
          internship: i,
          matchScore:
            typeof calcMatchScore === 'function'
              ? calcMatchScore(s, i)
              : 0,
        }))
        .sort((a, b) => b.matchScore - a.matchScore);

      const bestApp = apps
        .filter(a => {
          const appStudentId =
            extractId(a.studentId) || extractId(a.student);
          return appStudentId === s._id || appStudentId === s.id;
        })
        .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))[0];

      return {
        student: s,
        bestMatch: scored[0]?.internship || null,
        bestScore: scored[0]?.matchScore || 0,
        applicationStatus: bestApp?.status || 'Not Applied',
      };
    });
  },
};

/* ============================================================
   OPTIONAL GLOBAL EXPORTS
   (useful if other scripts expect these on window)
   ============================================================ */
window.TokenStore = TokenStore;
window.StudentsAPI = StudentsAPI;
window.InternshipsAPI = InternshipsAPI;
window.ApplicationsAPI = ApplicationsAPI;
window.AdminAPI = AdminAPI;
window.APIStore = APIStore;
window.DataService = DataService;
