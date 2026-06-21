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

/*
IMPORTANT:
Your backend health route is:
https://capstone-project-backend-m20u.onrender.com/api/health

So API_BASE must be WITHOUT the final /health
*/
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

function normaliseArray(v) {
  if (v == null || v === '') return [];
  if (Array.isArray(v)) {
    return v.map(x => String(x).trim()).filter(Boolean);
  }
  return String(v)
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

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
  set(token) {
    localStorage.setItem('aiias_admin_token', token);
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
/*
Checks backend using:
GET https://capstone-project-backend-m20u.onrender.com/api/health
*/
window.isBackendOnline = async function (force = false) {
  if (!force && window._backendOnline !== null) {
    return window._backendOnline;
  }

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);

    const res = await fetch(`${window.API_BASE}/health`, {
      method: 'GET',
      signal: ctrl.signal,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    clearTimeout(timer);
    window._backendOnline = !!res.ok;
  } catch (err) {
    window._backendOnline = false;
  }

  const badge = document.getElementById('connBadge');
  if (badge) {
    badge.textContent = window._backendOnline
      ? '🟢 Backend Connected — data saves to MongoDB'
      : '🟡 Offline Mode — data saves to browser only';
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

  const token = TokenStore.get();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers,
  };

  if (body !== null && body !== undefined) {
    options.body = isFormData ? body : JSON.stringify(body);
  }

  let response;

  try {
    response = await fetch(`${window.API_BASE}${path}`, options);
  } catch (err) {
    window._backendOnline = false;
    throw new Error('Could not connect to backend server.');
  }

  let data = null;
  const raw = await response.text();

  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(
      (data && (data.message || data.error)) ||
        `Request failed with status ${response.status}`
    );
  }

  return data;
}

/* ============================================================
   SHORTHAND HTTP METHODS
   ============================================================ */
const http = {
  get(path) {
    return apiRequest('GET', path);
  },
  post(path, body) {
    return apiRequest('POST', path, body);
  },
  put(path, body) {
    return apiRequest('PUT', path, body);
  },
  patch(path, body) {
    return apiRequest('PATCH', path, body);
  },
  del(path) {
    return apiRequest('DELETE', path);
  },
  postForm(path, formData) {
    return apiRequest('POST', path, formData, true);
  },
  putForm(path, formData) {
    return apiRequest('PUT', path, formData, true);
  },
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
    return res.data || res;
  },

  async create(payload) {
    const res =
      payload instanceof FormData
        ? await http.postForm('/students', payload)
        : await http.post('/students', payload);

    return res.data || res;
  },

  async update(id, payload) {
    const res =
      payload instanceof FormData
        ? await http.putForm(`/students/${id}`, payload)
        : await http.put(`/students/${id}`, payload);

    return res.data || res;
  },

  async delete(id) {
    return await http.del(`/students/${id}`);
  },

  async getRecommendations(id, topN = 10) {
    const res = await http.get(`/students/${id}/recommendations?topN=${topN}`);
    return res.data || res;
  },

  async getApplications(id) {
    const res = await http.get(`/students/${id}/applications`);
    return res.data || res;
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
    return res.data || res;
  },

  async create(payload) {
    const res = await http.post('/internships', payload);
    return res.data || res;
  },

  async update(id, payload) {
    const res = await http.put(`/internships/${id}`, payload);
    return res.data || res;
  },

  async delete(id) {
    return await http.del(`/internships/${id}`);
  },

  async getFilterMeta() {
    const res = await http.get('/internships/meta/filters');
    return res.data || res;
  },

  async getApplications(id) {
    const res = await http.get(`/internships/${id}/applications`);
    return res.data || res;
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
    return res.data || res;
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
    return res.data || res;
  },

  async updateStatus(id, status, adminNotes = '') {
    const res = await http.patch(`/applications/${id}/status`, {
      status,
      adminNotes,
    });
    return res.data || res;
  },

  async delete(id) {
    return await http.del(`/applications/${id}`);
  },

  async getAnalytics() {
    const res = await http.get('/applications/analytics');
    return res.data || res;
  },
};

/* ============================================================
   ADMIN API
   ============================================================ */
const AdminAPI = {
  async login(email, password) {
    const res = await http.post('/auth/login', { email, password });

    // expected backend response:
    // { success: true, data: { token, user } }
    if (res?.data?.token) {
      TokenStore.set(res.data.token);
    } else if (res?.token) {
      TokenStore.set(res.token);
    }

    return res.data || res;
  },

  async logout() {
    try {
      await http.post('/auth/logout');
    } catch (_) {}
    TokenStore.clear();
  },

  async getMe() {
    const res = await http.get('/auth/me');
    return res.data || res;
  },

  async getDashboard() {
    const res = await http.get('/admin/dashboard');
    return res.data || res;
  },

  async getAllocationReport() {
    const res = await http.get('/admin/allocation');
    return res.data || res;
  },

  async getStudentsReport() {
    const res = await http.get('/admin/reports/students');
    return res.data || res;
  },

  async getRecommendationsReport() {
    const res = await http.get('/admin/reports/recommendations');
    return res.data || res;
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

    if (idx >= 0) list[idx] = item;
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
  /* ==========================================================
     STUDENTS
     ========================================================== */
  async getStudents(params = {}) {
    if (await window.isBackendOnline()) {
      return await StudentsAPI.getAll(params);
    }

    let data = APIStore.get(API_KEYS.STUDENTS);

    if (params.search) {
      const s = String(params.search).toLowerCase();
      data = data.filter(st =>
        (st.fullName || '').toLowerCase().includes(s) ||
        (st.rollNo || '').toLowerCase().includes(s) ||
        (st.department || '').toLowerCase().includes(s) ||
        (st.email || '').toLowerCase().includes(s)
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
      return await StudentsAPI.getById(id);
    }
    return APIStore.getOne(API_KEYS.STUDENTS, id);
  },

  async createStudent(payload) {
    if (await window.isBackendOnline()) {
      return await StudentsAPI.create(payload);
    }

    const raw =
      payload instanceof FormData ? Object.fromEntries(payload.entries()) : { ...payload };

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
      return await StudentsAPI.update(id, payload);
    }

    const existing = APIStore.getOne(API_KEYS.STUDENTS, id) || {};
    const raw =
      payload instanceof FormData ? Object.fromEntries(payload.entries()) : { ...payload };

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
      return await StudentsAPI.delete(id);
    }
    APIStore.remove(API_KEYS.STUDENTS, id);
  },

  async getRecommendations(studentId, topN = 10) {
    if (await window.isBackendOnline()) {
      return await StudentsAPI.getRecommendations(studentId, topN);
    }

    const student = APIStore.getOne(API_KEYS.STUDENTS, studentId);
    const internships = APIStore.get(API_KEYS.INTERNSHIPS);

    if (!student) return [];

    return internships
      .map(i => {
        const score =
          typeof calcMatchScore === 'function'
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
      return await StudentsAPI.getApplications(studentId);
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

  /* ==========================================================
     INTERNSHIPS
     ========================================================== */
  async getInternships(params = {}) {
    if (await window.isBackendOnline()) {
      return await InternshipsAPI.getAll(params);
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

    return {
      data,
      meta: { total: data.length },
    };
  },

  async getInternship(id) {
    if (await window.isBackendOnline()) {
      return await InternshipsAPI.getById(id);
    }
    return APIStore.getOne(API_KEYS.INTERNSHIPS, id);
  },

  async createInternship(payload) {
    if (await window.isBackendOnline()) {
      return await InternshipsAPI.create(payload);
    }

    const newInternship = {
      ...payload,
      _id: genId(),
      id: genId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    APIStore.save(API_KEYS.INTERNSHIPS, newInternship);
    return newInternship;
  },

  async updateInternship(id, payload) {
    if (await window.isBackendOnline()) {
      return await InternshipsAPI.update(id, payload);
    }

    const existing = APIStore.getOne(API_KEYS.INTERNSHIPS, id) || {};
    const updated = {
      ...existing,
      ...payload,
      updatedAt: new Date().toISOString(),
    };

    APIStore.save(API_KEYS.INTERNSHIPS, updated);
    return updated;
  },

  async deleteInternship(id) {
    if (await window.isBackendOnline()) {
      return await InternshipsAPI.delete(id);
    }
    APIStore.remove(API_KEYS.INTERNSHIPS, id);
  },

  async getFilterMeta() {
    if (await window.isBackendOnline()) {
      return await InternshipsAPI.getFilterMeta();
    }

    const all = APIStore.get(API_KEYS.INTERNSHIPS);

    return {
      domains: [...new Set(all.map(i => i.domain).filter(Boolean))],
      locations: [...new Set(all.map(i => i.location).filter(Boolean))],
      durations: [...new Set(all.map(i => i.duration).filter(Boolean))],
    };
  },

  /* ==========================================================
     APPLICATIONS
     ========================================================== */
  async applyForInternship(studentId, internshipId, coverLetter = '') {
    if (await window.isBackendOnline()) {
      return await ApplicationsAPI.create(studentId, internshipId, coverLetter);
    }

    const apps = APIStore.get(API_KEYS.APPLICATIONS);

    const alreadyApplied = apps.some(a => {
      const appStudentId = extractId(a.studentId) || extractId(a.student);
      const appInternshipId = extractId(a.internshipId) || extractId(a.internship);

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

    const appId = genId();

    const app = {
      _id: appId,
      id: appId,
      studentId,
      internshipId,
      student: {
        _id: student?._id || student?.id || studentId,
        fullName: student?.fullName || student?.name || '',
        rollNo: student?.rollNo || '',
        department: student?.department || '',
      },
      internship: {
        _id: internship?._id || internship?.id || internshipId,
        title: internship?.title || '',
        company: internship?.company || '',
        domain: internship?.domain || '',
      },
      studentName: student?.fullName || student?.name || '',
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
      return await ApplicationsAPI.getAll(params);
    }

    let data = APIStore.get(API_KEYS.APPLICATIONS);

    if (params.status) {
      data = data.filter(a => a.status === params.status);
    }

    if (params.studentId) {
      data = data.filter(a => {
        const appStudentId = extractId(a.studentId) || extractId(a.student);
        return appStudentId === params.studentId;
      });
    }

    if (params.internshipId) {
      data = data.filter(a => {
        const appInternshipId = extractId(a.internshipId) || extractId(a.internship);
        return appInternshipId === params.internshipId;
      });
    }

    return {
      data,
      meta: { total: data.length },
    };
  },

  async updateApplicationStatus(id, status, notes = '') {
    if (await window.isBackendOnline()) {
      return await ApplicationsAPI.updateStatus(id, status, notes);
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
      return await ApplicationsAPI.delete(id);
    }
    APIStore.remove(API_KEYS.APPLICATIONS, id);
  },

  /* ==========================================================
     ADMIN DASHBOARD
     ========================================================== */
  async getAdminDashboard() {
    if (await window.isBackendOnline()) {
      return await AdminAPI.getDashboard();
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
              students.reduce((sum, st) => sum + (parseFloat(st.cgpa) || 0), 0) /
              students.length
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
      return await AdminAPI.getAllocationReport();
    }

    const students = APIStore.get(API_KEYS.STUDENTS);
    const internships = APIStore.get(API_KEYS.INTERNSHIPS);
    const apps = APIStore.get(API_KEYS.APPLICATIONS);

    return students.map(s => {
      const scored = internships
        .map(i => ({
          internship: i,
          matchScore:
            typeof calcMatchScore === 'function' ? calcMatchScore(s, i) : 0,
        }))
        .sort((a, b) => b.matchScore - a.matchScore);

      const bestApp = apps
        .filter(a => {
          const appStudentId = extractId(a.studentId) || extractId(a.student);
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
   GLOBAL EXPORTS
   ============================================================ */
window.TokenStore = TokenStore;
window.StudentsAPI = StudentsAPI;
window.InternshipsAPI = InternshipsAPI;
window.ApplicationsAPI = ApplicationsAPI;
window.AdminAPI = AdminAPI;
window.APIStore = APIStore;
window.DataService = DataService;