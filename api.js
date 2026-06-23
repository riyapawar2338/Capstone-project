/* ============================================================
   AI INTERNSHIP ALLOCATION & RECOMMENDATION SYSTEM
   api.js — FIXED VERSION
   ============================================================ */
'use strict';

/* ── Backend base URL ────────────────────────────────────────── */
var API_BASE =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5001/api'
    : 'https://capstone-project-backend-m20u.onrender.com/api';

/* ── Token management ────────────────────────────────────────── */
var TokenStore = {
  get:       function()  { return localStorage.getItem('aiias_admin_token'); },
  set:       function(t) { localStorage.setItem('aiias_admin_token', t); },
  clear:     function()  { localStorage.removeItem('aiias_admin_token'); },
  isPresent: function()  { return !!this.get(); }
};

/* ── Connection state ────────────────────────────────────────── */
var _backendOnline = null;

async function isBackendOnline() {
  if (_backendOnline !== null) return _backendOnline;
  try {
    var ctrl  = new AbortController();
    var timer = setTimeout(function(){ ctrl.abort(); }, 3000);
    var r = await fetch(API_BASE + '/health', { signal: ctrl.signal });
    clearTimeout(timer);
    _backendOnline = r.ok;
  } catch (err) {
    _backendOnline = false;
  }

  var badge = document.getElementById('connectionBadge');
  if (badge) {
    badge.textContent = _backendOnline ? '🟢 API Connected' : '🟡 Offline Mode';
    badge.style.color = _backendOnline ? 'var(--success)' : 'var(--warning)';
  }
  console.info(_backendOnline
    ? '✅ Backend API connected — ' + API_BASE
    : '⚠️ Backend offline — using LocalStorage mode');
  return _backendOnline;
}

/* ── Base HTTP helper ────────────────────────────────────────── */
async function apiRequest(method, path, body, isFormData) {
  body        = body        || null;
  isFormData  = isFormData  || false;
  var headers = {};
  if (!isFormData) headers['Content-Type'] = 'application/json';
  if (TokenStore.isPresent()) headers['Authorization'] = 'Bearer ' + TokenStore.get();

  var options = { method: method, headers: headers };
  if (body) options.body = isFormData ? body : JSON.stringify(body);

  var response = await fetch(API_BASE + path, options);
  var json = {};
  try { json = await response.json(); }
  catch (err) { throw new Error('Invalid JSON response from ' + path); }

  if (!response.ok || !json.success) {
    throw new Error(json.message || ('API error ' + response.status));
  }
  return json;
}

/* ── Shorthand methods ───────────────────────────────────────── */
var http = {
  get:      function(path)            { return apiRequest('GET',    path); },
  post:     function(path, body)      { return apiRequest('POST',   path, body); },
  put:      function(path, body)      { return apiRequest('PUT',    path, body); },
  patch:    function(path, body)      { return apiRequest('PATCH',  path, body); },
  del:      function(path)            { return apiRequest('DELETE', path); },
  postForm: function(path, formData)  { return apiRequest('POST',   path, formData, true); },
  putForm:  function(path, formData)  { return apiRequest('PUT',    path, formData, true); }
};

/* ============================================================
   STUDENTS API
   ============================================================ */
var StudentsAPI = {
  async getAll(params) {
    params = params || {};
    var qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(function(e){ return e[1] !== '' && e[1] != null; }))
    ).toString();
    return await http.get('/students' + (qs ? '?' + qs : ''));
  },
  async getById(id) {
    var res = await http.get('/students/' + id);
    return res.data;
  },
  async register(payload) {
    var res = payload instanceof FormData
      ? await http.postForm('/students/register', payload)
      : await http.post('/students/register', payload);
    return res.data;
  },
  async create(payload) {
    var res = payload instanceof FormData
      ? await http.postForm('/students', payload)
      : await http.post('/students', payload);
    return res.data;
  },
  async update(id, payload) {
    var res = payload instanceof FormData
      ? await http.putForm('/students/' + id, payload)
      : await http.put('/students/' + id, payload);
    return res.data;
  },
  async updateSelf(id, payload) {
  var res = payload instanceof FormData
    ? await http.putForm('/students/' + id + '/self', payload)
    : await http.put('/students/' + id + '/self', payload);
  return res.data;
},
  async delete(id) { await http.del('/students/' + id); },
  async getRecommendations(id, topN) {
    topN = topN || 10;
    var res = await http.get('/students/' + id + '/recommendations?topN=' + topN);
    return res.data;
  },
  async getApplications(id) {
    var res = await http.get('/students/' + id + '/applications');
    return res.data;
  },
  downloadResume: function(id) {
    window.open(API_BASE + '/students/' + id + '/resume', '_blank');
  }
};

/* ============================================================
   INTERNSHIPS API
   ============================================================ */
var InternshipsAPI = {
  async getAll(params) {
    params = params || {};
    var qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(function(e){ return e[1] !== '' && e[1] != null; }))
    ).toString();
    return await http.get('/internships' + (qs ? '?' + qs : ''));
  },
  async getById(id)      { var res = await http.get('/internships/' + id); return res.data; },
  async create(payload)  { var res = await http.post('/internships', payload); return res.data; },
  async update(id, p)    { var res = await http.put('/internships/' + id, p); return res.data; },
  async delete(id)       { await http.del('/internships/' + id); },
  async getFilterMeta()  { var res = await http.get('/internships/meta/filters'); return res.data; },
  async getApplications(id) { var res = await http.get('/internships/' + id + '/applications'); return res.data; }
};

/* ============================================================
   APPLICATIONS API
   ============================================================ */
var ApplicationsAPI = {
  async create(studentId, internshipId, coverLetter) {
    coverLetter = coverLetter || '';
    var res = await http.post('/applications', { studentId: studentId, internshipId: internshipId, coverLetter: coverLetter });
    return res.data;
  },
  async getAll(params) {
    params = params || {};
    var qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(function(e){ return e[1] !== '' && e[1] != null; }))
    ).toString();
    return await http.get('/applications' + (qs ? '?' + qs : ''));
  },
  async getById(id)   { var res = await http.get('/applications/' + id); return res.data; },
  async updateStatus(id, status, adminNotes) {
    adminNotes = adminNotes || '';
    var res = await http.patch('/applications/' + id + '/status', { status: status, adminNotes: adminNotes });
    return res.data;
  },
  async delete(id)    { await http.del('/applications/' + id); },
  async getAnalytics(){ var res = await http.get('/applications/analytics'); return res.data; }
};

/* ============================================================
   ADMIN API
   ============================================================ */
var AdminAPI = {
  async login(email, password) {
  var res = await http.post('/auth/login', { email: email, password: password });

  var token =
    (res.data && res.data.token) ||
    (res.data && res.data.data && res.data.data.token);

  if (token) TokenStore.set(token);

  return res.data;
},
  async studentLogin(email, password) {
  var res = await http.post('/auth/student-login', { email: email, password: password });

  var token =
    (res.data && res.data.token) ||
    (res.data && res.data.data && res.data.data.token);

  if (token) TokenStore.set(token);

  return res.data;
},
  async logout() {
    try { await http.post('/auth/logout'); } catch(e) {}
    TokenStore.clear();
  },
  async getMe()                   { var res = await http.get('/auth/me');                        return res.data; },
  async getDashboard()            { var res = await http.get('/admin/dashboard');                return res.data; },
  async getAllocationReport()     { var res = await http.get('/admin/allocation');               return res.data; },
  async getStudentsReport()       { var res = await http.get('/admin/reports/students');         return res.data; },
  async getRecommendationsReport(){ var res = await http.get('/admin/reports/recommendations'); return res.data; }
};

/* ============================================================
   NOTE: KEYS and Store are defined in script.js and loaded first.
   Do NOT redefine them here — that was causing the session system
   to break. We only define helpers not already in script.js.
   ============================================================ */

function normalizeArr(v) {
  if (Array.isArray(v)) return v;
  return String(v || '').split(',').map(function(s){ return s.trim(); }).filter(Boolean);
}

function normalizeStudentRecord(raw, existing) {
  var base = existing ? Object.assign({}, existing) : {};
  var id   = (existing && (existing._id || existing.id)) || (typeof genId === 'function' ? genId() : Math.random().toString(36).slice(2));
  var out  = Object.assign({}, base, raw, {
    _id:             id,
    id:              id,
    technicalSkills: normalizeArr(raw.technicalSkills  !== undefined ? raw.technicalSkills  : base.technicalSkills),
    softSkills:      normalizeArr(raw.softSkills       !== undefined ? raw.softSkills       : base.softSkills),
    certifications:  normalizeArr(raw.certifications   !== undefined ? raw.certifications   : base.certifications),
    areasOfInterest: normalizeArr(raw.areasOfInterest  !== undefined ? raw.areasOfInterest  : base.areasOfInterest),
    updatedAt:       new Date().toISOString()
  });
  if (!existing) out.createdAt = new Date().toISOString();
  if (out.rollNo)     out.rollNo     = String(out.rollNo).trim().toUpperCase();
  if (out.email)      out.email      = String(out.email).trim().toLowerCase();
  if (out.cgpa  !== undefined && out.cgpa  !== null && out.cgpa  !== '') out.cgpa       = parseFloat(out.cgpa);
  if (out.percentage !== undefined && out.percentage !== null && out.percentage !== '') out.percentage = parseFloat(out.percentage);
  return out;
}

/* ============================================================
   UNIFIED DataService
   ============================================================ */
var DataService = {

  /* ── Students ─────────────────────────────────────────────── */
  async getStudents(params) {
    params = params || {};
    if (await isBackendOnline()) return StudentsAPI.getAll(params);
    var data = Store.get(KEYS.STUDENTS);
    if (params.search) {
      var s = params.search.toLowerCase();
      data = data.filter(function(st){
        return (st.fullName||'').toLowerCase().includes(s) ||
               (st.rollNo||'').toLowerCase().includes(s)   ||
               (st.department||'').toLowerCase().includes(s)||
               normalizeArr(st.technicalSkills).join(' ').toLowerCase().includes(s);
      });
    }
    if (params.department)     data = data.filter(function(st){ return st.department     === params.department; });
    if (params.semester)       data = data.filter(function(st){ return st.semester       === params.semester; });
    if (params.preferredDomain)data = data.filter(function(st){ return st.preferredDomain=== params.preferredDomain; });
    return { data: data, meta: { total: data.length, page: 1, totalPages: 1 } };
  },

  async getStudent(id) {
    if (await isBackendOnline()) return StudentsAPI.getById(id);
    return Store.getOne(KEYS.STUDENTS, id);
  },
  async registerStudent(payload) {
    if (await isBackendOnline()) {
      return StudentsAPI.register(payload);
    }

    // localStorage fallback only when backend is offline
    var raw = payload instanceof FormData
      ? Object.fromEntries(payload.entries())
      : Object.assign({}, payload);

    var student = normalizeStudentRecord(raw, null);

    if (raw.resume && typeof raw.resume === 'object') {
      student.resumeOriginalName = raw.resume.name || 'resume';
      student.resumeFile = raw.resume.name || 'resume';
    }

    Store.save(KEYS.STUDENTS, student);

    // optional local auth fallback
    if (typeof registerUser === 'function') {
      registerUser(
        student.fullName,
        student.email,
        raw.password || '',
        student.rollNo
      );
    }

    return student;
  },
  async createStudent(payload) {
    if (await isBackendOnline()) return StudentsAPI.create(payload);
    var raw     = payload instanceof FormData ? Object.fromEntries(payload.entries()) : Object.assign({}, payload);
    var student = normalizeStudentRecord(raw, null);
    if (raw.resume && typeof raw.resume === 'object') {
      student.resumeOriginalName = raw.resume.name || 'resume';
      student.resumeFile         = raw.resume.name || 'resume';
    }
    Store.save(KEYS.STUDENTS, student);
    return student;
  },

  async updateStudent(id, payload) {
  if (await isBackendOnline()) {
    var session = (window.Auth && Auth.getSession) ? Auth.getSession() : null;
    var isAdmin = session && session.role === 'admin';

    // Admin uses protected route
    if (isAdmin) {
      return StudentsAPI.update(id, payload);
    }

    // Student uses self route
    return StudentsAPI.updateSelf(id, payload);
  }

  // localStorage fallback
  var existing = Store.getOne(KEYS.STUDENTS, id) || {};
  var raw = payload instanceof FormData
    ? Object.fromEntries(payload.entries())
    : Object.assign({}, payload);

  var updated = normalizeStudentRecord(raw, existing);

  if (raw.resume && typeof raw.resume === 'object') {
    updated.resumeOriginalName = raw.resume.name || existing.resumeOriginalName || 'resume';
    updated.resumeFile = raw.resume.name || existing.resumeFile || 'resume';
  }

  Store.save(KEYS.STUDENTS, updated);
  return updated;
},

  async deleteStudent(id) {
    if (await isBackendOnline()) return StudentsAPI.delete(id);
    Store.remove(KEYS.STUDENTS, id);
  },

  async getRecommendations(studentId, topN) {
    topN = topN || 10;
    if (await isBackendOnline()) return StudentsAPI.getRecommendations(studentId, topN);
    var student     = Store.getOne(KEYS.STUDENTS, studentId);
    var internships = Store.get(KEYS.INTERNSHIPS);
    if (!student) return [];
    return internships
      .map(function(i){ var score = calcMatchScore(student, i); return { internship: i, matchScore: score, label: score>=80?'Excellent Match':score>=60?'Good Match':score>=40?'Fair Match':'Low Match', breakdown:{} }; })
      .sort(function(a, b){ return b.matchScore - a.matchScore; })
      .slice(0, topN);
  },

  async getStudentApplications(studentId) {
    if (await isBackendOnline()) return StudentsAPI.getApplications(studentId);
    return Store.get(KEYS.APPLICATIONS)
      .filter(function(a){ return (a.studentId || a.student) === studentId; })
      .map(function(a){ return Object.assign({}, a, { internship: Store.getOne(KEYS.INTERNSHIPS, a.internshipId || a.internship) }); });
  },

  /* ── Internships ──────────────────────────────────────────── */
  async getInternships(params) {
    params = params || {};
    if (await isBackendOnline()) return InternshipsAPI.getAll(params);
    var data = Store.get(KEYS.INTERNSHIPS);
    if (params.search) { var s2 = params.search.toLowerCase(); data = data.filter(function(i){ return (i.title||'').toLowerCase().includes(s2)||(i.company||'').toLowerCase().includes(s2)||(i.domain||'').toLowerCase().includes(s2); }); }
    if (params.domain)   data = data.filter(function(i){ return i.domain   === params.domain; });
    if (params.location) data = data.filter(function(i){ return i.location === params.location; });
    if (params.duration) data = data.filter(function(i){ return i.duration === params.duration; });
    if (params.minCgpa)  data = data.filter(function(i){ return parseFloat(i.minCgpa||0) <= parseFloat(params.minCgpa); });
    return { data: data, meta: { total: data.length } };
  },

  async getInternship(id) {
    if (await isBackendOnline()) return InternshipsAPI.getById(id);
    return Store.getOne(KEYS.INTERNSHIPS, id);
  },

  async getFilterMeta() {
    if (await isBackendOnline()) return InternshipsAPI.getFilterMeta();
    var all = Store.get(KEYS.INTERNSHIPS);
    return {
      domains:   [...new Set(all.map(function(i){ return i.domain;   }).filter(Boolean))],
      locations: [...new Set(all.map(function(i){ return i.location; }).filter(Boolean))],
      durations: [...new Set(all.map(function(i){ return i.duration; }).filter(Boolean))]
    };
  },

  /* ── Applications ─────────────────────────────────────────── */
  async applyForInternship(studentId, internshipId, coverLetter) {
    coverLetter = coverLetter || '';
    if (await isBackendOnline()) return ApplicationsAPI.create(studentId, internshipId, coverLetter);
    var apps = Store.get(KEYS.APPLICATIONS);
    if (apps.some(function(a){ return (a.studentId||a.student)===studentId && (a.internshipId||a.internship)===internshipId; })) {
      throw new Error('You have already applied for this internship');
    }
    var student    = Store.getOne(KEYS.STUDENTS, studentId);
    var internship = Store.getOne(KEYS.INTERNSHIPS, internshipId);
    var score      = calcMatchScore(student, internship);
    var appId      = (typeof genId === 'function' ? genId() : Math.random().toString(36).slice(2));
    var app = {
      _id: appId, id: appId,
      studentId: studentId, internshipId: internshipId,
      student:    { fullName: student && student.fullName,    rollNo: student && student.rollNo,    department: student && student.department },
      internship: { title:    internship && internship.title, company: internship && internship.company, domain: internship && internship.domain },
      studentName: (student && student.fullName) || '',
      rollNo:      (student && student.rollNo)   || '',
      matchScore: score, coverLetter: coverLetter,
      status: 'Pending',
      appliedAt: new Date().toISOString(), createdAt: new Date().toISOString()
    };
    Store.save(KEYS.APPLICATIONS, app);
    return app;
  },

  async getApplications(params) {
    params = params || {};
    if (await isBackendOnline()) return ApplicationsAPI.getAll(params);
    var data = Store.get(KEYS.APPLICATIONS);
    if (params.status)       data = data.filter(function(a){ return a.status === params.status; });
    if (params.studentId)    data = data.filter(function(a){ return (a.studentId||a.student) === params.studentId; });
    if (params.internshipId) data = data.filter(function(a){ return (a.internshipId||a.internship) === params.internshipId; });
    return { data: data, meta: { total: data.length } };
  },

  async updateApplicationStatus(id, status, notes) {
    notes = notes || '';
    if (await isBackendOnline()) return ApplicationsAPI.updateStatus(id, status, notes);
    var apps = Store.get(KEYS.APPLICATIONS);
    var idx  = apps.findIndex(function(a){ return (a._id||a.id) === id; });
    if (idx >= 0) {
      apps[idx].status    = status;
      apps[idx].updatedAt = new Date().toISOString();
      if (notes) apps[idx].adminNotes = notes;
    }
    Store.set(KEYS.APPLICATIONS, apps);
    return apps[idx];
  },

  async deleteApplication(id) {
    if (await isBackendOnline()) return ApplicationsAPI.delete(id);
    Store.remove(KEYS.APPLICATIONS, id);
  },

  /* ── Admin Dashboard ──────────────────────────────────────── */
  async getAdminDashboard() {
    if (await isBackendOnline()) return AdminAPI.getDashboard();
    var students    = Store.get(KEYS.STUDENTS);
    var internships = Store.get(KEYS.INTERNSHIPS);
    var apps        = Store.get(KEYS.APPLICATIONS);
    function groupBy(arr, key){ return arr.reduce(function(m,i){ m[i[key]]=(m[i[key]]||0)+1; return m; }, {}); }
    return {
      stats: {
        totalStudents:    students.length,
        totalInternships: internships.length,
        totalApplications:apps.length,
        accepted:    apps.filter(function(a){ return a.status==='Accepted';    }).length,
        pending:     apps.filter(function(a){ return a.status==='Pending';     }).length,
        shortlisted: apps.filter(function(a){ return a.status==='Shortlisted'; }).length,
        rejected:    apps.filter(function(a){ return a.status==='Rejected';    }).length
      },
      deptBreakdown:   Object.entries(groupBy(students,'department'))  .map(function(e){ return {_id:e[0],count:e[1]}; }).sort(function(a,b){ return b.count-a.count; }),
      domainBreakdown: Object.entries(groupBy(students,'preferredDomain')).map(function(e){ return {_id:e[0],count:e[1]}; }).sort(function(a,b){ return b.count-a.count; }),
      cgpaStats: { avgCgpa: students.length ? (students.reduce(function(s,st){ return s+(parseFloat(st.cgpa)||0); },0)/students.length).toFixed(2) : 0 },
      recentStudents: students.slice().sort(function(a,b){ return new Date(b.createdAt)-new Date(a.createdAt); }).slice(0,5),
      recentApplications: apps.slice()
        .sort(function(a,b){ return new Date(b.createdAt||b.appliedAt)-new Date(a.createdAt||a.appliedAt); })
        .slice(0,5)
        .map(function(a){ return Object.assign({},a, { student: { fullName: a.studentName||((a.student||{}).fullName), rollNo: a.rollNo||((a.student||{}).rollNo) }, internship: Store.getOne(KEYS.INTERNSHIPS, a.internshipId||a.internship) }); })
    };
  },


  async getAllocationReport() {
    if (await isBackendOnline()) return AdminAPI.getAllocationReport();
    var students    = Store.get(KEYS.STUDENTS);
    var internships = Store.get(KEYS.INTERNSHIPS);
    var apps        = Store.get(KEYS.APPLICATIONS);
    return students.map(function(s){
      var scored = internships.map(function(i){ return { internship:i, matchScore: calcMatchScore(s,i) }; }).sort(function(a,b){ return b.matchScore-a.matchScore; });
      var bestApp = apps.filter(function(a){ return (a.studentId||a.student)===s._id || (a.studentId||a.student)===s.id; }).sort(function(a,b){ return b.matchScore-a.matchScore; })[0];
      return { student:s, bestMatch: scored[0] && scored[0].internship || null, bestScore: scored[0] && scored[0].matchScore || 0, applicationStatus: (bestApp&&bestApp.status)||'Not Applied' };
    });
  }
};

/* ── Expose globally ────────────────────────────────────────── */
window.TokenStore      = TokenStore;
window.StudentsAPI     = StudentsAPI;
window.InternshipsAPI  = InternshipsAPI;
window.ApplicationsAPI = ApplicationsAPI;
window.AdminAPI        = AdminAPI;
window.DataService     = DataService;
window.isBackendOnline = isBackendOnline;