'use strict';

/* =========================================================
   CONFIG
   IMPORTANT: Change this URL to your deployed backend.
   For local testing: http://localhost:5001/api
   For deployed backend (Render/Railway etc): https://your-backend.onrender.com/api
========================================================= */
var API_BASE = window.API_BASE || 'http://localhost:5001/api';

/* =========================================================
   TOKEN STORE — JWT stored in sessionStorage (not localStorage)
   Session only — clears when browser tab closes
========================================================= */
var TokenStore = {
  _key: 'aiias_token',
  get:   function()      { return sessionStorage.getItem(this._key) || null; },
  set:   function(token) { if (token) sessionStorage.setItem(this._key, token); },
  clear: function()      { sessionStorage.removeItem(this._key); }
};

/* =========================================================
   GENERIC API REQUEST
   - Handles JSON and FormData
   - Attaches Bearer token automatically
   - Returns parsed JSON or throws Error with backend message
========================================================= */
async function apiRequest(endpoint, method, data, requiresAuth) {
  method      = method      || 'GET';
  requiresAuth = requiresAuth !== false;

  var isFormData = (typeof FormData !== 'undefined' && data instanceof FormData);
  var headers   = {};

  if (!isFormData) headers['Content-Type'] = 'application/json';
  if (requiresAuth) {
    var token = TokenStore.get();
    if (token) headers['Authorization'] = 'Bearer ' + token;
  }

  try {
    var res = await fetch(API_BASE + endpoint, {
      method:  method,
      headers: headers,
      body:    isFormData ? data : (data ? JSON.stringify(data) : null)
    });
    var result = await res.json();
    if (!res.ok) throw new Error(result.msg || result.message || result.error || 'Server error ' + res.status);
    return result;
  } catch (err) {
    console.error('[API]', endpoint, err.message);
    throw err;
  }
}

/* =========================================================
   BACKEND HEALTH CHECK — returns true only if backend responds
   Returns false instantly for localhost (GitHub Pages)
========================================================= */
async function isBackendOnline() {
  if (API_BASE.includes('localhost') || API_BASE.includes('127.0.0.1')) {
    /* Running locally — assume backend is reachable if window.API_BASE was set */
    if (window.API_BASE) return true;
    return false;
  }
  try {
    var ctrl  = new AbortController();
    var timer = setTimeout(function() { ctrl.abort(); }, 3000);
    var res   = await fetch(API_BASE.replace('/api', '') + '/health', {
      method: 'GET', signal: ctrl.signal
    });
    clearTimeout(timer);
    return res.ok;
  } catch (e) {
    return false;
  }
}

/* =========================================================
   AUTH APIs
========================================================= */
var AuthAPI = {
  adminLogin: async function(email, password) {
    return apiRequest('/auth/login', 'POST', { email, password }, false);
  },
  studentLogin: async function(email, password) {
    return apiRequest('/auth/student/login', 'POST', { email, password }, false);
  },
  studentRegister: async function(data) {
    return apiRequest('/auth/student/register', 'POST', data, false);
  }
};

/* keep old names working */
var AdminAPI = {
  login:        function(e, p) { return AuthAPI.adminLogin(e, p);   },
  studentLogin: function(e, p) { return AuthAPI.studentLogin(e, p); }
};

/* =========================================================
   STUDENTS API
========================================================= */
var StudentsAPI = {
  register: async function(data) {
    return apiRequest('/students/register', 'POST', data, false);
  },
  getAll: async function() {
    return apiRequest('/students', 'GET', null, true);
  },
  getOne: async function(id) {
    return apiRequest('/students/' + id, 'GET', null, true);
  },
  create: async function(data) {
    var isForm   = data instanceof FormData;
    var endpoint = isForm ? '/students/upload' : '/students';
    return apiRequest(endpoint, 'POST', data, true);
  },
  update: async function(id, data) {
    var isForm   = data instanceof FormData;
    var endpoint = isForm ? '/students/' + id + '/upload' : '/students/' + id;
    return apiRequest(endpoint, 'PUT', data, true);
  },
  remove: async function(id) {
    return apiRequest('/students/' + id, 'DELETE', null, true);
  }
};

/* =========================================================
   INTERNSHIPS API
========================================================= */
var InternshipsAPI = {
  getAll: async function() {
    return apiRequest('/internships', 'GET', null, false);
  },
  getOne: async function(id) {
    return apiRequest('/internships/' + id, 'GET', null, false);
  },
  create: async function(data) {
    return apiRequest('/internships', 'POST', data, true);
  },
  update: async function(id, data) {
    return apiRequest('/internships/' + id, 'PUT', data, true);
  },
  remove: async function(id) {
    return apiRequest('/internships/' + id, 'DELETE', null, true);
  }
};

/* =========================================================
   APPLICATIONS API
========================================================= */
var ApplicationsAPI = {
  getAll: async function() {
    return apiRequest('/applications', 'GET', null, true);
  },
  getByStudent: async function(studentId) {
    return apiRequest('/applications/student/' + studentId, 'GET', null, true);
  },
  create: async function(data) {
    return apiRequest('/applications', 'POST', data, true);
  },
  updateStatus: async function(id, status, notes) {
    return apiRequest('/applications/' + id + '/status', 'PUT', { status, notes }, true);
  }
};

/* =========================================================
   NOTIFICATIONS API (for Apply confirmation emails / alerts)
========================================================= */
var NotificationsAPI = {
  send: async function(data) {
    /* data: { type, studentId, internshipId, studentName, internshipTitle, email } */
    try {
      return apiRequest('/notifications/send', 'POST', data, true);
    } catch(e) {
      console.warn('Notification send failed (non-critical):', e.message);
    }
  }
};

/* =========================================================
   DATA SERVICE  — MongoDB only, NO localStorage fallback
   All data goes straight to backend. If backend is offline,
   a clear error is shown to the user.
========================================================= */
var DataService = {

  getStudents: async function() {
    var res  = await StudentsAPI.getAll();
    return normalizeList(Array.isArray(res) ? res : (res.data || res.students || []));
  },

  getStudent: async function(id) {
    var res = await StudentsAPI.getOne(id);
    return normalize(res.data || res.student || res);
  },

  createStudent: async function(data) {
    var res   = await StudentsAPI.create(data);
    var saved = normalize(res.data || res.student || res);
    return saved;
  },

  updateStudent: async function(id, data) {
    var res   = await StudentsAPI.update(id, data);
    var saved = normalize(res.data || res.student || res);
    return saved;
  },

  deleteStudent: async function(id) {
    return StudentsAPI.remove(id);
  },

  getInternships: async function() {
    var res = await InternshipsAPI.getAll();
    return normalizeList(Array.isArray(res) ? res : (res.data || res.internships || []));
  },

  getApplications: async function(studentId) {
    var res  = studentId
      ? await ApplicationsAPI.getByStudent(studentId)
      : await ApplicationsAPI.getAll();
    return normalizeList(Array.isArray(res) ? res : (res.data || res.applications || []));
  },

  createApplication: async function(data) {
    var res   = await ApplicationsAPI.create(data);
    var saved = normalize(res.data || res.application || res);
    return saved;
  }
};

/* =========================================================
   HELPERS
========================================================= */
function normalize(item) {
  if (!item) return item;
  var copy = Object.assign({}, item);
  if (!copy.id  && copy._id) copy.id  = String(copy._id);
  if (!copy._id && copy.id)  copy._id = String(copy.id);
  return copy;
}
function normalizeList(arr) {
  return (arr || []).map(normalize);
}
function getSid(s) {
  return s ? (String(s._id || s.id || '')) : '';
}
function genId() {
  return 'tmp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

/* legacy wrappers */
async function getStudents()        { return StudentsAPI.getAll();      }
async function updateStudent(id, d) { return StudentsAPI.update(id, d); }
async function getInternships()     { return InternshipsAPI.getAll();   }
async function addInternship(d)     { return InternshipsAPI.create(d);  }
async function applyInternship(d)   { return ApplicationsAPI.create(d); }
