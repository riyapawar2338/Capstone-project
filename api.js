'use strict';

/* ================================================================
   AI INTERNSHIP ALLOCATION & RECOMMENDATION SYSTEM
   api.js

   This is the ONLY file that defines `Auth` and `DataService`.
   script.js must never redeclare them — that was the bug that
   broke login/registration (two different "Auth" objects fighting
   over window.Auth). Load order on every page is:
     <script src="api.js"></script>
     <script src="script.js"></script>
   ================================================================ */

const API_BASE = window.API_BASE || 'https://capstone-project-backend-m20u.onrender.com/api';

var _backendOnline = null;     // null = unknown, true = online, false = offline
var _lastChecked   = 0;
var CHECK_INTERVAL = 60000;    // re-check at most once a minute

/* ================================================================
   TOKEN HELPERS
================================================================ */
function getToken()        { return localStorage.getItem('aiias_token') || null; }
function saveToken(token)  { if (token) localStorage.setItem('aiias_token', token); }
function removeToken()     { localStorage.removeItem('aiias_token'); }

function authHeaders(isFormData) {
  var headers = isFormData ? {} : { 'Content-Type': 'application/json' };
  var token = getToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return headers;
}

/* ================================================================
   GENERIC FETCH WRAPPER
================================================================ */
async function apiFetch(url, options) {
  var res;
  try {
    res = await fetch(url, options);
  } catch (err) {
    throw new Error('Cannot reach server. Check your connection.');
  }
  var data = null;
  try { data = await res.json(); } catch (e) { /* empty body */ }

  if (!res.ok) {
    var msg = (data && (data.message || data.error)) || ('HTTP ' + res.status);
    throw new Error(msg);
  }
  return data || {};
}

/* ================================================================
   BACKEND HEALTH CHECK
================================================================ */
async function isBackendOnline(force) {
  var now = Date.now();
  if (!force && _backendOnline !== null && (now - _lastChecked) < CHECK_INTERVAL) {
    return _backendOnline;
  }
  try {
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, 7000);
    var res  = await fetch(API_BASE + '/health', { signal: controller.signal });
    clearTimeout(timer);
    var data = await res.json();
    _backendOnline = !!(data && data.success);
  } catch (err) {
    _backendOnline = false;
  }
  _lastChecked = Date.now();
  return _backendOnline;
}

/* ================================================================
   AUTH EVENT BUS (navbar / pages listen for this)
================================================================ */
window.AuthEvents = {
  notify: function () { window.dispatchEvent(new Event('auth-changed')); }
};

/* ================================================================
   OFFLINE STORE  (used when the backend is unreachable)
================================================================ */
var LS = {
  USERS:        'aiias_users',
  STUDENTS:     'aiias_students',
  INTERNSHIPS:  'aiias_internships',
  APPLICATIONS: 'aiias_applications',
  SESSION:      'aiias_session'
};

function lsGet(key) {
  try { return JSON.parse(localStorage.getItem(key)) || []; }
  catch (e) { return []; }
}
function lsSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
}
function uid(prefix) {
  return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* ── Seed offline defaults (admin account + sample internships) ── */
function seedOfflineDefaults() {
  var users = lsGet(LS.USERS);
  if (!users.some(function (u) { return u.role === 'admin'; })) {
    users.push({
      id: 'admin_001', name: 'Administrator', email: 'admin@aiias.edu',
      password: 'Admin@1234', role: 'admin', createdAt: new Date().toISOString()
    });
    lsSet(LS.USERS, users);
  }

  if (!lsGet(LS.INTERNSHIPS).length) {
    lsSet(LS.INTERNSHIPS, [
      { id: 'int1', title: 'AI/ML Engineering Intern', company: 'TechCorp Solutions', domain: 'Artificial Intelligence', location: 'Pune', duration: '3 Months', stipend: '₹15,000/mo', requiredSkills: ['Python', 'Machine Learning', 'TensorFlow', 'Pandas'], minCgpa: 7.0, tags: ['AI', 'Python'], deadline: '2026-08-30', description: 'Build and train ML models for real-world classification and NLP problems.' },
      { id: 'int2', title: 'Full Stack Web Developer Intern', company: 'InnovateTech Pvt Ltd', domain: 'Web Development', location: 'Mumbai', duration: '6 Months', stipend: '₹12,000/mo', requiredSkills: ['React', 'Node.js', 'MongoDB', 'JavaScript', 'CSS'], minCgpa: 6.5, tags: ['React', 'Full Stack'], deadline: '2026-09-15', description: 'Build responsive web applications and ship production features.' },
      { id: 'int3', title: 'Data Science Intern', company: 'DataInsights Pvt Ltd', domain: 'Data Science', location: 'Bangalore', duration: '4 Months', stipend: '₹18,000/mo', requiredSkills: ['Python', 'Pandas', 'SQL', 'Statistics', 'Scikit-learn'], minCgpa: 7.5, tags: ['Data Science', 'SQL'], deadline: '2026-07-20', description: 'Analyse datasets and build predictive models with dashboards.' },
      { id: 'int4', title: 'Android App Developer Intern', company: 'MobileFirst Studios', domain: 'Mobile Development', location: 'Hyderabad', duration: '3 Months', stipend: '₹10,000/mo', requiredSkills: ['Java', 'Kotlin', 'Android Studio', 'Firebase'], minCgpa: 6.0, tags: ['Android', 'Kotlin'], deadline: '2026-09-01', description: 'Develop Android features with Kotlin and Jetpack Compose.' },
      { id: 'int5', title: 'Cybersecurity Analyst Intern', company: 'SecureNet Labs', domain: 'Cybersecurity', location: 'Delhi', duration: '3 Months', stipend: '₹14,000/mo', requiredSkills: ['Network Security', 'Linux', 'Python', 'Ethical Hacking'], minCgpa: 7.0, tags: ['Security', 'Linux'], deadline: '2026-08-10', description: 'Assist with vulnerability assessments and incident response.' },
      { id: 'int6', title: 'Cloud Infrastructure Intern', company: 'CloudScale Inc', domain: 'Cloud Computing', location: 'Pune', duration: '6 Months', stipend: '₹20,000/mo', requiredSkills: ['AWS', 'Docker', 'Kubernetes', 'Linux', 'Terraform'], minCgpa: 7.0, tags: ['AWS', 'Cloud'], deadline: '2026-08-25', description: 'Deploy and manage cloud infrastructure and CI/CD pipelines.' },
      { id: 'int7', title: 'UI/UX Design Intern', company: 'PixelCraft Design', domain: 'UI/UX Design', location: 'Remote', duration: '3 Months', stipend: '₹10,000/mo', requiredSkills: ['Figma', 'Adobe XD', 'Prototyping', 'User Research'], minCgpa: 6.0, tags: ['Figma', 'Design'], deadline: '2026-07-25', description: 'Design interfaces and run usability tests for real products.' },
      { id: 'int8', title: 'IoT Systems Intern', company: 'SmartTech Industries', domain: 'Internet of Things', location: 'Chennai', duration: '4 Months', stipend: '₹12,000/mo', requiredSkills: ['Arduino', 'Raspberry Pi', 'Python', 'C++', 'MQTT'], minCgpa: 6.5, tags: ['IoT', 'Embedded'], deadline: '2026-08-20', description: 'Build IoT prototypes and integrate sensors with cloud platforms.' },
      { id: 'int9', title: 'DevOps Engineer Intern', company: 'Infra Solutions Ltd', domain: 'DevOps', location: 'Noida', duration: '6 Months', stipend: '₹16,000/mo', requiredSkills: ['Linux', 'Docker', 'Jenkins', 'Git', 'Bash'], minCgpa: 6.5, tags: ['DevOps', 'Linux'], deadline: '2026-09-10', description: 'Automate deployments and maintain CI/CD infrastructure.' },
      { id: 'int10', title: 'Data Analyst Intern', company: 'BizAnalytics Corp', domain: 'Data Science', location: 'Mumbai', duration: '3 Months', stipend: '₹12,000/mo', requiredSkills: ['SQL', 'Excel', 'Python', 'Tableau', 'Statistics'], minCgpa: 6.0, tags: ['SQL', 'Analytics'], deadline: '2026-08-05', description: 'Turn sales and marketing data into actionable insights.' }
    ]);
  }
}

/* ================================================================
   AI MATCH SCORE — Skills 40% · Domain 25% · CGPA 20% · Interest 15%
   (Mirrors backend utils/aiMatcher.js exactly so on/offline scores agree.)
================================================================ */
function calcMatchScore(student, internship) {
  if (!student || !internship) return 0;

  var lower = function (arr) { return (arr || []).map(function (s) { return String(s).toLowerCase().trim(); }); };
  var skills    = lower(student.technicalSkills);
  var required  = lower(internship.requiredSkills);
  var interests = lower(student.areasOfInterest).concat(lower(student.certifications));

  /* Skills — 40 pts */
  var skillScore = 20; // baseline if nothing listed
  if (required.length) {
    var matched = required.filter(function (r) {
      return skills.some(function (s) { return s.includes(r) || r.includes(s); });
    }).length;
    skillScore = Math.round((matched / required.length) * 40);
  }

  /* Domain — 25 pts */
  var domain = String(internship.domain || '').toLowerCase();
  var pref   = String(student.preferredDomain || '').toLowerCase();
  var domainScore = 0;
  if (pref && domain && (pref === domain || pref.includes(domain) || domain.includes(pref))) {
    domainScore = 25;
  } else if (interests.some(function (i) { return domain.includes(i) || i.includes(domain); })) {
    domainScore = 12;
  }

  /* CGPA — 20 pts */
  var cgpa = parseFloat(student.cgpa) || 0;
  var minCgpa = parseFloat(internship.minCgpa) || 0;
  var cgpaScore;
  if (!minCgpa)                cgpaScore = cgpa >= 7.5 ? 18 : cgpa >= 6 ? 12 : 6;
  else if (cgpa >= minCgpa + 1.5) cgpaScore = 20;
  else if (cgpa >= minCgpa)       cgpaScore = 16;
  else if (cgpa >= minCgpa - 0.5) cgpaScore = 10;
  else                             cgpaScore = 4;

  /* Interest — 15 pts */
  var tags = lower(internship.tags).concat([domain]);
  var interestMatches = interests.filter(function (i) {
    return tags.some(function (t) { return t.includes(i) || i.includes(t); });
  }).length;
  var interestScore = interests.length ? Math.min(15, Math.round((interestMatches / interests.length) * 15) + (interestMatches > 0 ? 4 : 0)) : 5;

  return Math.max(0, Math.min(100, skillScore + domainScore + cgpaScore + interestScore));
}

function rankInternships(student, internships, topN) {
  var scored = (internships || []).map(function (i) {
    return Object.assign({}, i, { matchScore: calcMatchScore(student, i) });
  });
  scored.sort(function (a, b) { return b.matchScore - a.matchScore; });
  return topN ? scored.slice(0, topN) : scored;
}

/* ================================================================
   OFFLINE AUTH (local users store)
================================================================ */
var OfflineAuth = {
  register: function (payload) {
    var name  = payload.fullName || payload.name || '';
    var email = (payload.email || '').toLowerCase().trim();
    var pass  = payload.password || '';
    var roll  = payload.rollNo || '';

    if (!name || !email || !pass) throw new Error('Full name, email and password are required.');
    if (pass.length < 6) throw new Error('Password must be at least 6 characters.');

    var users = lsGet(LS.USERS);
    if (users.some(function (u) { return u.email === email; })) {
      throw new Error('Email already registered.');
    }

    var studentId = uid('local');
    var user = {
      id: studentId, name: name.trim(), email: email, password: pass,
      role: 'student', rollNo: roll.trim(), createdAt: new Date().toISOString()
    };
    users.push(user);
    lsSet(LS.USERS, users);

    /* Mirror a student profile so Student Management / Recommendations can find it */
    var students = lsGet(LS.STUDENTS);
    students.push(Object.assign({}, payload, {
      _id: studentId, id: studentId, fullName: name.trim(), email: email,
      rollNo: roll.trim(), technicalSkills: payload.technicalSkills || [],
      softSkills: payload.softSkills || [], certifications: payload.certifications || [],
      areasOfInterest: payload.areasOfInterest || [],
      department: payload.department || 'Computer Engineering',
      semester: payload.semester || 'Semester 5',
      cgpa: payload.cgpa || 7.0,
      preferredDomain: payload.preferredDomain || 'Artificial Intelligence',
      createdAt: new Date().toISOString()
    }));
    lsSet(LS.STUDENTS, students);

    return { id: studentId, name: user.name, email: user.email, role: 'student', rollNo: user.rollNo };
  },

  login: function (email, password) {
    var users = lsGet(LS.USERS);
    var clean = (email || '').toLowerCase().trim();
    var user  = users.find(function (u) { return u.email.toLowerCase() === clean && u.password === password; });
    if (!user) throw new Error('Invalid email or password.');
    return { id: user.id, name: user.name, email: user.email, role: user.role, rollNo: user.rollNo || '' };
  }
};

/* ================================================================
   AUTH  — single source of truth (session + login + register)
================================================================ */
const Auth = {
  _key: LS.SESSION,

  getSession: function () {
    try { var raw = localStorage.getItem(this._key); return raw ? JSON.parse(raw) : null; }
    catch (e) { return null; }
  },
  setSession: function (user) {
    try { localStorage.setItem(this._key, JSON.stringify(user)); } catch (e) {}
    window.AuthEvents.notify();
  },
  isLoggedIn: function () { return !!this.getSession(); },
  isAdmin:    function () { var s = this.getSession(); return !!(s && s.role === 'admin'); },
  logout: function () {
    localStorage.removeItem(this._key);
    removeToken();
    window.AuthEvents.notify();
  },

  /** High-level login: tries backend, falls back to offline store. */
  login: async function (email, password) {
    var online = await isBackendOnline(true);
    if (online) {
      try {
        var res = await apiFetch(API_BASE + '/auth/login', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email, password: password })
        });
        var payload = res.data || res;
        if (payload.token) saveToken(payload.token);
        var user = payload.user;
        if (!user || !user.email) throw new Error(res.message || 'Login failed.');
        this.setSession(user);
        return user;
      } catch (apiErr) {
        /* fall through to offline only if it's a connectivity issue */
        if (apiErr.message && apiErr.message.indexOf('Cannot reach server') === -1) {
          throw apiErr; /* real auth error (wrong password etc) — don't mask it */
        }
      }
    }
    var offlineUser = OfflineAuth.login(email, password);
    this.setSession(offlineUser);
    return offlineUser;
  },

  /** High-level register: tries backend, falls back to offline store. */
  register: async function (payload) {
    var online = await isBackendOnline(true);
    if (online) {
      try {
        return await StudentsAPI.register(payload);
      } catch (apiErr) {
        if (apiErr.message && apiErr.message.indexOf('Cannot reach server') === -1) {
          throw apiErr; /* real validation error from server — surface it */
        }
      }
    }
    return OfflineAuth.register(payload);
  }
};

/* ================================================================
   AUTH API  (raw backend calls)
================================================================ */
const AuthAPI = {
  login: async function (email, password) { return Auth.login(email, password); }
};
const AdminAPI = { login: AuthAPI.login };

/* ================================================================
   STUDENTS API (raw backend calls)
================================================================ */
const StudentsAPI = {
  register: async function (payload) {
    var res = await apiFetch(API_BASE + '/students/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.data || res;
  },
  create: async function (payload) {
    var isFormData = payload instanceof FormData;
    return apiFetch(API_BASE + '/students', {
      method: 'POST', headers: authHeaders(isFormData),
      body: isFormData ? payload : JSON.stringify(payload)
    });
  },
  getAll: async function (params) {
    var query = params ? ('?' + new URLSearchParams(params).toString()) : '';
    return apiFetch(API_BASE + '/students' + query, { headers: authHeaders() });
  },
  getById: async function (id) { return apiFetch(API_BASE + '/students/' + id, { headers: authHeaders() }); },
  update: async function (id, payload) {
    var isFormData = payload instanceof FormData;
    return apiFetch(API_BASE + '/students/' + id, {
      method: 'PUT', headers: authHeaders(isFormData),
      body: isFormData ? payload : JSON.stringify(payload)
    });
  },
  delete: async function (id) { return apiFetch(API_BASE + '/students/' + id, { method: 'DELETE', headers: authHeaders() }); },
  getRecommendations: async function (id, topN) {
    var query = topN ? ('?topN=' + topN) : '';
    return apiFetch(API_BASE + '/students/' + id + '/recommendations' + query, { headers: authHeaders() });
  },
  getApplications: async function (id) { return apiFetch(API_BASE + '/students/' + id + '/applications', { headers: authHeaders() }); }
};

/* ================================================================
   INTERNSHIPS API
================================================================ */
const InternshipsAPI = {
  getAll:  async function ()   { return apiFetch(API_BASE + '/internships', { headers: authHeaders() }); },
  getById: async function (id) { return apiFetch(API_BASE + '/internships/' + id, { headers: authHeaders() }); }
};

/* ================================================================
   APPLICATIONS API
================================================================ */
const ApplicationsAPI = {
  create: async function (payload) {
    return apiFetch(API_BASE + '/applications', { method: 'POST', headers: authHeaders(), body: JSON.stringify(payload) });
  },
  getAll: async function () { return apiFetch(API_BASE + '/applications', { headers: authHeaders() }); },
  updateStatus: async function (id, status) {
    return apiFetch(API_BASE + '/applications/' + id, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ status: status }) });
  }
};

/* ================================================================
   ADMIN API
================================================================ */
const AdminStatsAPI = {
  dashboard: async function () { return apiFetch(API_BASE + '/admin/dashboard', { headers: authHeaders() }); }
};

/* ── FormData → plain object ─────────────────────────────────── */
function formDataToObj(fd) {
  var obj = {};
  fd.forEach(function (val, key) {
    var arrKey = key.endsWith('[]') ? key.slice(0, -2) : null;
    if (arrKey) {
      if (!Array.isArray(obj[arrKey])) obj[arrKey] = [];
      obj[arrKey].push(val);
    } else { obj[key] = val; }
  });
  return obj;
}

/* ================================================================
   DATA SERVICE — high level, used by every page.
   Tries backend first, transparently falls back to localStorage.
================================================================ */
const DataService = {
  isOnline:   function () { return _backendOnline === true; },
  resetCache: function () { _backendOnline = null; _lastChecked = 0; },

  _normList: function (raw) {
    if (Array.isArray(raw))             return { data: raw,          meta: { total: raw.length } };
    if (raw && Array.isArray(raw.data)) return { data: raw.data,     meta: raw.meta || { total: raw.data.length } };
    if (raw && raw.students)            return { data: raw.students, meta: { total: raw.students.length } };
    return { data: [], meta: { total: 0 } };
  },
  _normOne: function (raw) {
    if (raw && raw.data) return raw.data;
    return raw;
  },

  /* ── Students ──────────────────────────────────────────────── */
  getStudents: async function (params) {
    if (await isBackendOnline()) {
      try { return this._normList(await StudentsAPI.getAll(params)); }
      catch (e) { /* fall back */ }
    }
    var list = lsGet(LS.STUDENTS);
    if (params && params.search) {
      var q = params.search.toLowerCase();
      list = list.filter(function (s) {
        return (s.fullName || '').toLowerCase().includes(q) ||
               (s.rollNo || '').toLowerCase().includes(q) ||
               (s.email || '').toLowerCase().includes(q);
      });
    }
    if (params && params.department) list = list.filter(function (s) { return s.department === params.department; });
    return { data: list, meta: { total: list.length } };
  },

  getStudent: async function (id) {
    if (await isBackendOnline()) {
      try { return this._normOne(await StudentsAPI.getById(id)); }
      catch (e) { /* fall back */ }
    }
    return lsGet(LS.STUDENTS).find(function (s) { return (s._id || s.id) === id; }) || null;
  },

  createStudent: async function (payload) {
    if (await isBackendOnline()) {
      try { return await StudentsAPI.create(payload); }
      catch (e) { _backendOnline = false; }
    }
    var data = payload instanceof FormData ? formDataToObj(payload) : payload;
    var list = lsGet(LS.STUDENTS);
    var obj  = Object.assign({}, data, { _id: uid('local'), id: uid('local') });
    list.push(obj);
    lsSet(LS.STUDENTS, list);
    return { success: true, data: obj };
  },

  updateStudent: async function (id, payload) {
    if (await isBackendOnline()) {
      try { return await StudentsAPI.update(id, payload); }
      catch (e) { _backendOnline = false; }
    }
    var data = payload instanceof FormData ? formDataToObj(payload) : payload;
    var list = lsGet(LS.STUDENTS);
    var idx  = list.findIndex(function (s) { return (s._id || s.id) === id; });
    if (idx < 0) throw new Error('Student not found.');
    list[idx] = Object.assign({}, list[idx], data);
    lsSet(LS.STUDENTS, list);
    return { success: true, data: list[idx] };
  },

  deleteStudent: async function (id) {
    if (await isBackendOnline()) {
      try { return await StudentsAPI.delete(id); }
      catch (e) { _backendOnline = false; }
    }
    var list = lsGet(LS.STUDENTS).filter(function (s) { return (s._id || s.id) !== id; });
    lsSet(LS.STUDENTS, list);
    return { success: true };
  },

  /* ── Internships ───────────────────────────────────────────── */
  getInternships: async function () {
    if (await isBackendOnline()) {
      try { return this._normList(await InternshipsAPI.getAll()); }
      catch (e) { /* fall back */ }
    }
    var list = lsGet(LS.INTERNSHIPS);
    return { data: list, meta: { total: list.length } };
  },

  /* ── Recommendations (AI matching) ───────────────────────────── */
  getRecommendations: async function (studentId, topN) {
    if (await isBackendOnline()) {
      try { return this._normList(await StudentsAPI.getRecommendations(studentId, topN)); }
      catch (e) { /* fall back */ }
    }
    var student = await this.getStudent(studentId);
    var internships = (await this.getInternships()).data;
    var ranked = rankInternships(student, internships, topN);
    return { data: ranked, meta: { total: ranked.length } };
  },

  /* ── Applications ─────────────────────────────────────────── */
  applyToInternship: async function (studentId, internshipId, coverLetter) {
    var payload = { studentId: studentId, internshipId: internshipId, coverLetter: coverLetter || '' };
    if (await isBackendOnline()) {
      try { return await ApplicationsAPI.create(payload); }
      catch (e) {
        if (e.message && e.message.indexOf('Cannot reach server') === -1) throw e;
      }
    }
    var apps = lsGet(LS.APPLICATIONS);
    if (apps.some(function (a) { return a.studentId === studentId && a.internshipId === internshipId; })) {
      throw new Error('You have already applied to this internship.');
    }
    var student     = await this.getStudent(studentId);
    var internships = (await this.getInternships()).data;
    var internship  = internships.find(function (i) { return (i._id || i.id) === internshipId; });
    var app = {
      id: uid('app'), studentId: studentId, internshipId: internshipId,
      studentName: student ? student.fullName : 'Unknown',
      internshipTitle: internship ? internship.title : 'Unknown',
      company: internship ? internship.company : '',
      coverLetter: coverLetter || '', status: 'Pending',
      matchScore: student && internship ? calcMatchScore(student, internship) : 0,
      createdAt: new Date().toISOString()
    };
    apps.push(app);
    lsSet(LS.APPLICATIONS, apps);
    return { success: true, data: app };
  },

  getApplications: async function (studentId) {
    if (await isBackendOnline()) {
      try {
        var raw = studentId ? await StudentsAPI.getApplications(studentId) : await ApplicationsAPI.getAll();
        return this._normList(raw);
      } catch (e) { /* fall back */ }
    }
    var apps = lsGet(LS.APPLICATIONS);
    if (studentId) apps = apps.filter(function (a) { return a.studentId === studentId; });
    return { data: apps, meta: { total: apps.length } };
  },

  updateApplicationStatus: async function (id, status) {
    if (await isBackendOnline()) {
      try { return await ApplicationsAPI.updateStatus(id, status); }
      catch (e) { _backendOnline = false; }
    }
    var apps = lsGet(LS.APPLICATIONS);
    var idx  = apps.findIndex(function (a) { return (a._id || a.id) === id; });
    if (idx < 0) throw new Error('Application not found.');
    apps[idx].status = status;
    lsSet(LS.APPLICATIONS, apps);
    return { success: true, data: apps[idx] };
  }
};

/* ================================================================
   BOOT — make sure offline mode always has something to show
================================================================ */
seedOfflineDefaults();

/* ================================================================
   EXPOSE GLOBALS
================================================================ */
window.isBackendOnline  = isBackendOnline;
window.Auth             = Auth;
window.AuthAPI          = AuthAPI;
window.AdminAPI         = AdminAPI;
window.StudentsAPI      = StudentsAPI;
window.InternshipsAPI   = InternshipsAPI;
window.ApplicationsAPI  = ApplicationsAPI;
window.AdminStatsAPI    = AdminStatsAPI;
window.DataService      = DataService;
window.calcMatchScore   = calcMatchScore;
window.rankInternships  = rankInternships;
window.LS_KEYS          = LS;