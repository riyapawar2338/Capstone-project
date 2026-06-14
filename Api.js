/* ============================================================
   AI INTERNSHIP ALLOCATION & RECOMMENDATION SYSTEM
   api.js — Frontend REST API Client
   Connects the HTML pages to the Node.js/Express backend.
   Falls back to LocalStorage if backend is unreachable.
   ============================================================ */
'use strict';

// ── Backend base URL ──────────────────────────────────────────
// Change this to your deployed server URL in production
const API_BASE = window.AIIAS_API_BASE || 'https://capstone-project-backend-m20u.onrender.com/api';
// ── Token management ──────────────────────────────────────────
const TokenStore = {
  get()        { return localStorage.getItem('aiias_admin_token'); },
  set(t)       { localStorage.setItem('aiias_admin_token', t); },
  clear()      { localStorage.removeItem('aiias_admin_token'); },
  isPresent()  { return !!this.get(); },
};

// ── Connection state ──────────────────────────────────────────
let _backendOnline = null; // null = not yet checked

async function isBackendOnline() {
  if (_backendOnline !== null) return _backendOnline;
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 2000);
    const r = await fetch(`${API_BASE}/health`, { signal: ctrl.signal });
    _backendOnline = r.ok;
  } catch {
    _backendOnline = false;
  }
  const badge = document.getElementById('connectionBadge');
  if (badge) {
    badge.textContent    = _backendOnline ? '🟢 API Connected' : '🟡 Offline Mode';
    badge.style.color    = _backendOnline ? 'var(--success)' : 'var(--warning)';
  }
  console.info(_backendOnline
    ? '✅ Backend API connected — https://capstone-project-backend-m20u.onrender.com'
    : '⚠️  Backend offline — using LocalStorage mode');
  return _backendOnline;
}

// ── Base HTTP helper ──────────────────────────────────────────
async function apiRequest(method, path, body = null, isFormData = false) {
  const headers = {};
  if (!isFormData) headers['Content-Type'] = 'application/json';
  if (TokenStore.isPresent()) headers['Authorization'] = `Bearer ${TokenStore.get()}`;

  const options = { method, headers };
  if (body) options.body = isFormData ? body : JSON.stringify(body);

  const response = await fetch(`${API_BASE}${path}`, options);
  const json     = await response.json();

  if (!json.success) {
    throw new Error(json.message || `API error ${response.status}`);
  }
  return json;
}

// ── Shorthand methods ─────────────────────────────────────────
const http = {
  get:       (path)           => apiRequest('GET',    path),
  post:      (path, body)     => apiRequest('POST',   path, body),
  put:       (path, body)     => apiRequest('PUT',    path, body),
  patch:     (path, body)     => apiRequest('PATCH',  path, body),
  del:       (path)           => apiRequest('DELETE', path),
  postForm:  (path, formData) => apiRequest('POST',   path, formData, true),
  putForm:   (path, formData) => apiRequest('PUT',    path, formData, true),
};

/* ============================================================
   STUDENTS API
   ============================================================ */
const StudentsAPI = {
  /**
   * Get all students with optional filters.
   * @param {{ search?, department?, semester?, preferredDomain?,
   *           sortBy?, order?, page?, limit? }} params
   */
  async getAll(params = {}) {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([,v]) => v !== '' && v != null))
    ).toString();
    const res = await http.get(`/students${qs ? '?' + qs : ''}`);
    return res; // { success, data: [], meta: { total, page, ... } }
  },

  /** Get single student by MongoDB _id */
  async getById(id) {
    const res = await http.get(`/students/${id}`);
    return res.data;
  },

  /**
   * Create a new student profile.
   * @param {FormData|Object} payload - FormData (with resume file) or plain object
   */
  async create(payload) {
    const res = payload instanceof FormData
      ? await http.postForm('/students', payload)
      : await http.post('/students', payload);
    return res.data;
  },

  /**
   * Update an existing student.
   * @param {string} id
   * @param {FormData|Object} payload
   */
  async update(id, payload) {
    const res = payload instanceof FormData
      ? await http.putForm(`/students/${id}`, payload)
      : await http.put(`/students/${id}`, payload);
    return res.data;
  },

  /** Soft-delete a student */
  async delete(id) {
    await http.del(`/students/${id}`);
  },

  /** Get AI recommendations for a student */
  async getRecommendations(id, topN = 10) {
    const res = await http.get(`/students/${id}/recommendations?topN=${topN}`);
    return res.data; // [{ internship, matchScore, breakdown, label }]
  },

  /** Get all applications for a student */
  async getApplications(id) {
    const res = await http.get(`/students/${id}/applications`);
    return res.data;
  },

  /** Download student resume */
  downloadResume(id) {
    window.open(`${API_BASE}/students/${id}/resume`, '_blank');
  },
};

/* ============================================================
   INTERNSHIPS API
   ============================================================ */
const InternshipsAPI = {
  async getAll(params = {}) {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([,v]) => v !== '' && v != null))
    ).toString();
    const res = await http.get(`/internships${qs ? '?' + qs : ''}`);
    return res;
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
    return res.data; // { domains, locations, durations }
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
    const res = await http.post('/applications', { studentId, internshipId, coverLetter });
    return res.data;
  },

  async getAll(params = {}) {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([,v]) => v !== '' && v != null))
    ).toString();
    const res = await http.get(`/applications${qs ? '?' + qs : ''}`);
    return res;
  },

  async getById(id) {
    const res = await http.get(`/applications/${id}`);
    return res.data;
  },

  async updateStatus(id, status, adminNotes = '') {
    const res = await http.patch(`/applications/${id}/status`, { status, adminNotes });
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
    TokenStore.set(res.data.token);
    return res.data;
  },

  async logout() {
    try { await http.post('/auth/logout'); } catch {}
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
   LOCAL STORAGE STORE  (offline fallback)
   ============================================================ */
const KEYS = {
  STUDENTS:     'aiias_students',
  INTERNSHIPS:  'aiias_internships',
  APPLICATIONS: 'aiias_applications',
};

const Store = {
  get(key)        { try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } },
  set(key, val)   { localStorage.setItem(key, JSON.stringify(val)); },
  getOne(key, id) { return this.get(key).find(i => (i._id || i.id) === id) || null; },
  save(key, item) {
    const list = this.get(key);
    const idx  = list.findIndex(i => (i._id || i.id) === (item._id || item.id));
    idx >= 0 ? list.splice(idx, 1, item) : list.push(item);
    this.set(key, list);
  },
  remove(key, id) { this.set(key, this.get(key).filter(i => (i._id || i.id) !== id)); },
};

/* ============================================================
   UNIFIED DataService
   Auto-selects API or LocalStorage based on backend availability
   ============================================================ */
const DataService = {

  // ── Students ─────────────────────────────────────────────────
  async getStudents(params = {}) {
    if (await isBackendOnline()) return StudentsAPI.getAll(params);
    let data = Store.get(KEYS.STUDENTS);
    if (params.search) {
      const s = params.search.toLowerCase();
      data = data.filter(st =>
        (st.fullName||'').toLowerCase().includes(s) ||
        (st.rollNo  ||'').toLowerCase().includes(s) ||
        (st.department||'').toLowerCase().includes(s) ||
        (st.technicalSkills||[]).join(' ').toLowerCase().includes(s)
      );
    }
    if (params.department) data = data.filter(st => st.department === params.department);
    if (params.semester)   data = data.filter(st => st.semester   === params.semester);
    if (params.preferredDomain) data = data.filter(st => st.preferredDomain === params.preferredDomain);
    return { data, meta: { total: data.length, page:1, totalPages:1 } };
  },

  async getStudent(id) {
    if (await isBackendOnline()) return StudentsAPI.getById(id);
    return Store.getOne(KEYS.STUDENTS, id);
  },

  async createStudent(payload) {
    if (await isBackendOnline()) return StudentsAPI.create(payload);
    const raw = payload instanceof FormData ? Object.fromEntries(payload) : { ...payload };
    const normalise = v => Array.isArray(v) ? v : (v||'').split(',').map(s=>s.trim()).filter(Boolean);
    const student = {
      ...raw,
      _id: genId(), id: genId(),
      technicalSkills:  normalise(raw.technicalSkills),
      softSkills:       normalise(raw.softSkills),
      certifications:   normalise(raw.certifications),
      areasOfInterest:  normalise(raw.areasOfInterest),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    Store.save(KEYS.STUDENTS, student);
    return student;
  },

  async updateStudent(id, payload) {
    if (await isBackendOnline()) return StudentsAPI.update(id, payload);
    const existing = Store.getOne(KEYS.STUDENTS, id) || {};
    const raw      = payload instanceof FormData ? Object.fromEntries(payload) : { ...payload };
    const normalise = v => v === undefined ? undefined : (Array.isArray(v) ? v : (v||'').split(',').map(s=>s.trim()).filter(Boolean));
    ['technicalSkills','softSkills','certifications','areasOfInterest'].forEach(f => {
      if (raw[f] !== undefined) raw[f] = normalise(raw[f]);
    });
    const updated = { ...existing, ...raw, updatedAt: new Date().toISOString() };
    Store.save(KEYS.STUDENTS, updated);
    return updated;
  },

  async deleteStudent(id) {
    if (await isBackendOnline()) return StudentsAPI.delete(id);
    Store.remove(KEYS.STUDENTS, id);
  },

  async getRecommendations(studentId, topN = 10) {
    if (await isBackendOnline()) return StudentsAPI.getRecommendations(studentId, topN);
    const student     = Store.getOne(KEYS.STUDENTS, studentId);
    const internships = Store.get(KEYS.INTERNSHIPS);
    if (!student) return [];
    return internships
      .map(i => {
        const score = calcMatchScore(student, i);
        return {
          internship: i,
          matchScore: score,
          label: score>=80?'Excellent Match':score>=60?'Good Match':score>=40?'Fair Match':'Low Match',
          breakdown: {},
        };
      })
      .sort((a,b) => b.matchScore - a.matchScore)
      .slice(0, topN);
  },

  async getStudentApplications(studentId) {
    if (await isBackendOnline()) return StudentsAPI.getApplications(studentId);
    return Store.get(KEYS.APPLICATIONS)
      .filter(a => (a.studentId || a.student) === studentId)
      .map(a => ({
        ...a,
        internship: Store.getOne(KEYS.INTERNSHIPS, a.internshipId || a.internship),
      }));
  },

  // ── Internships ───────────────────────────────────────────────
  async getInternships(params = {}) {
    if (await isBackendOnline()) return InternshipsAPI.getAll(params);
    let data = Store.get(KEYS.INTERNSHIPS);
    if (params.search) {
      const s = params.search.toLowerCase();
      data = data.filter(i =>
        (i.title||'').toLowerCase().includes(s)   ||
        (i.company||'').toLowerCase().includes(s) ||
        (i.domain||'').toLowerCase().includes(s)
      );
    }
    if (params.domain)   data = data.filter(i => i.domain   === params.domain);
    if (params.location) data = data.filter(i => i.location === params.location);
    if (params.duration) data = data.filter(i => i.duration === params.duration);
    if (params.minCgpa)  data = data.filter(i => parseFloat(i.minCgpa||0) <= parseFloat(params.minCgpa));
    return { data, meta: { total: data.length } };
  },

  async getInternship(id) {
    if (await isBackendOnline()) return InternshipsAPI.getById(id);
    return Store.getOne(KEYS.INTERNSHIPS, id);
  },

  async getFilterMeta() {
    if (await isBackendOnline()) return InternshipsAPI.getFilterMeta();
    const all = Store.get(KEYS.INTERNSHIPS);
    return {
      domains:   [...new Set(all.map(i=>i.domain  ).filter(Boolean))],
      locations: [...new Set(all.map(i=>i.location).filter(Boolean))],
      durations: [...new Set(all.map(i=>i.duration).filter(Boolean))],
    };
  },

  // ── Applications ──────────────────────────────────────────────
  async applyForInternship(studentId, internshipId, coverLetter = '') {
    if (await isBackendOnline()) return ApplicationsAPI.create(studentId, internshipId, coverLetter);
    const apps = Store.get(KEYS.APPLICATIONS);
    if (apps.some(a => (a.studentId||a.student)===studentId && (a.internshipId||a.internship)===internshipId)) {
      throw new Error('You have already applied for this internship');
    }
    const student    = Store.getOne(KEYS.STUDENTS,    studentId);
    const internship = Store.getOne(KEYS.INTERNSHIPS, internshipId);
    const score      = calcMatchScore(student, internship);
    const app = {
      _id: genId(), id: genId(),
      studentId, internshipId,
      student: { fullName: student?.fullName, rollNo: student?.rollNo, department: student?.department },
      internship: { title: internship?.title, company: internship?.company, domain: internship?.domain },
      studentName: student?.fullName || '',
      rollNo:      student?.rollNo   || '',
      matchScore:  score,
      coverLetter,
      status:    'Pending',
      appliedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    Store.save(KEYS.APPLICATIONS, app);
    return app;
  },

  async getApplications(params = {}) {
    if (await isBackendOnline()) return ApplicationsAPI.getAll(params);
    let data = Store.get(KEYS.APPLICATIONS);
    if (params.status)       data = data.filter(a => a.status === params.status);
    if (params.studentId)    data = data.filter(a => (a.studentId||a.student?._id||a.student) === params.studentId);
    if (params.internshipId) data = data.filter(a => (a.internshipId||a.internship?._id||a.internship) === params.internshipId);
    return { data, meta: { total: data.length } };
  },

  async updateApplicationStatus(id, status, notes = '') {
    if (await isBackendOnline()) return ApplicationsAPI.updateStatus(id, status, notes);
    const apps = Store.get(KEYS.APPLICATIONS);
    const idx  = apps.findIndex(a => (a._id||a.id) === id);
    if (idx >= 0) { apps[idx].status = status; if (notes) apps[idx].adminNotes = notes; }
    Store.set(KEYS.APPLICATIONS, apps);
    return apps[idx];
  },

  async deleteApplication(id) {
    if (await isBackendOnline()) return ApplicationsAPI.delete(id);
    Store.remove(KEYS.APPLICATIONS, id);
  },

  // ── Admin Dashboard ───────────────────────────────────────────
  async getAdminDashboard() {
    if (await isBackendOnline()) return AdminAPI.getDashboard();
    const students    = Store.get(KEYS.STUDENTS);
    const internships = Store.get(KEYS.INTERNSHIPS);
    const apps        = Store.get(KEYS.APPLICATIONS);
    const groupBy     = (arr, key) => arr.reduce((m,i)=>{ m[i[key]]=(m[i[key]]||0)+1; return m; }, {});
    return {
      stats: {
        totalStudents:     students.length,
        totalInternships:  internships.length,
        totalApplications: apps.length,
        accepted:    apps.filter(a=>a.status==='Accepted').length,
        pending:     apps.filter(a=>a.status==='Pending').length,
        shortlisted: apps.filter(a=>a.status==='Shortlisted').length,
        rejected:    apps.filter(a=>a.status==='Rejected').length,
      },
      deptBreakdown:    Object.entries(groupBy(students,'department')).map(([_id,count])=>({_id,count})).sort((a,b)=>b.count-a.count),
      domainBreakdown:  Object.entries(groupBy(students,'preferredDomain')).map(([_id,count])=>({_id,count})).sort((a,b)=>b.count-a.count),
      cgpaStats:        { avgCgpa: students.length ? (students.reduce((s,st)=>s+(parseFloat(st.cgpa)||0),0)/students.length).toFixed(2) : 0 },
      recentStudents:   [...students].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,5),
      recentApplications: [...apps].sort((a,b)=>new Date(b.createdAt||b.appliedAt)-new Date(a.createdAt||a.appliedAt)).slice(0,5).map(a=>({
        ...a,
        student:    { fullName: a.studentName || a.student?.fullName, rollNo: a.rollNo || a.student?.rollNo },
        internship: Store.getOne(KEYS.INTERNSHIPS, a.internshipId || a.internship),
      })),
    };
  },

  async getAllocationReport() {
    if (await isBackendOnline()) return AdminAPI.getAllocationReport();
    const students    = Store.get(KEYS.STUDENTS);
    const internships = Store.get(KEYS.INTERNSHIPS);
    const apps        = Store.get(KEYS.APPLICATIONS);
    return students.map(s => {
      const scored  = internships.map(i => ({ internship:i, matchScore: calcMatchScore(s,i) })).sort((a,b)=>b.matchScore-a.matchScore);
      const bestApp = apps.filter(a=>(a.studentId||a.student)===s._id||a.studentId===s.id).sort((a,b)=>b.matchScore-a.matchScore)[0];
      return {
        student:           s,
        bestMatch:         scored[0]?.internship || null,
        bestScore:         scored[0]?.matchScore || 0,
        applicationStatus: bestApp?.status || 'Not Applied',
      };
    });
  },
};
