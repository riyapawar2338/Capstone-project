'use strict';

/* ================================================================
   AI INTERNSHIP ALLOCATION & RECOMMENDATION SYSTEM
   api.js — CORRECTED VERSION
   ================================================================ */

const API_BASE = window.API_BASE || 'https://capstone-project-backend-m20u.onrender.com/api';

/* ── Backend online state (module-level, private) ───────────── */
var _backendOnline  = null;   // null = unknown, true = online, false = offline
var _lastChecked    = 0;
var CHECK_INTERVAL  = 60000;  // re-check at most once per minute

/* ================================================================
   TOKEN HELPERS
================================================================ */
function getToken() {
  return localStorage.getItem('aiias_token') || null;
}

function saveToken(token) {
  if (token) localStorage.setItem('aiias_token', token);
}

function removeToken() {
  localStorage.removeItem('aiias_token');
}

/**
 * Build auth headers.
 * IMPORTANT: Do NOT set Content-Type when sending FormData —
 * the browser must set it with the multipart boundary automatically.
 */
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
  try {
    var res  = await fetch(url, options);
    var data = await res.json();

    if (!res.ok) {
      var msg = (data && (data.message || data.error)) || ('HTTP ' + res.status);
      throw new Error(msg);
    }

    return data;
  } catch (err) {
    if (err instanceof TypeError) {
      throw new Error('Cannot reach server. Check your connection.');
    }
    throw err;
  }
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
    var res  = await fetch(API_BASE + '/health', { signal: AbortSignal.timeout(8000) });
    var data = await res.json();
    _backendOnline = !!(data && data.success);
  } catch (err) {
    console.warn('[api.js] Backend offline:', err.message);
    _backendOnline = false;
  }
  _lastChecked = Date.now();
  return _backendOnline;
}

/* ================================================================
   LOCAL STORAGE FALLBACK HELPERS
   Used when backend is offline.
================================================================ */
var LS_KEY = 'aiias_students';

function lsGetAll() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); }
  catch (e) { return []; }
}

function lsSave(arr) {
  localStorage.setItem(LS_KEY, JSON.stringify(arr));
}

function lsCreate(payload) {
  var list = lsGetAll();
  var obj  = Object.assign({}, payload, { _id: 'local_' + Date.now(), _local: true });
  list.push(obj);
  lsSave(list);
  return { success: true, data: obj };
}

function lsUpdate(id, payload) {
  var list    = lsGetAll();
  var idx     = list.findIndex(function(s) { return (s._id || s.id) === id; });
  if (idx < 0) throw new Error('Student not found in local storage.');
  list[idx]   = Object.assign({}, list[idx], payload);
  lsSave(list);
  return { success: true, data: list[idx] };
}

function lsDelete(id) {
  var list = lsGetAll().filter(function(s) { return (s._id || s.id) !== id; });
  lsSave(list);
  return { success: true };
}

function lsGetById(id) {
  return lsGetAll().find(function(s) { return (s._id || s.id) === id; }) || null;
}

function lsFilter(params) {
  var list = lsGetAll();
  if (params.search) {
    var q = params.search.toLowerCase();
    list  = list.filter(function(s) {
      return (s.fullName     || '').toLowerCase().includes(q)
          || (s.rollNo       || '').toLowerCase().includes(q)
          || (s.department   || '').toLowerCase().includes(q);
    });
  }
  if (params.department) {
    list = list.filter(function(s) { return s.department === params.department; });
  }
  if (params.semester) {
    list = list.filter(function(s) { return s.semester === params.semester; });
  }
  return { success: true, data: list, meta: { total: list.length } };
}

/* ================================================================
   AUTH API
================================================================ */
const AuthAPI = {
  login: async function (email, password) {
    var data = await apiFetch(API_BASE + '/auth/login', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email: email, password: password })
    });

    /* Save JWT — backend may nest it differently */
    var token = data.token || (data.data && data.data.token);
    if (token) saveToken(token);

    var user = data.user || data.data || data;
    if (!user || !user.email) throw new Error(data.message || 'Login failed');

    return { user: user };
  },

  register: async function (payload) {
    return apiFetch(API_BASE + '/auth/register', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload)
    });
  }
};

/* ================================================================
   STUDENTS API  (raw backend calls)
================================================================ */
const StudentsAPI = {
  /** Public self-registration */
  register: async function (payload) {
    return apiFetch(API_BASE + '/students/register', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload)
    });
  },

  /** Admin-only create */
  create: async function (payload) {
    var isFormData = payload instanceof FormData;
    return apiFetch(API_BASE + '/students', {
      method:  'POST',
      headers: authHeaders(isFormData),
      body:    isFormData ? payload : JSON.stringify(payload)
    });
  },

  getAll: async function (params) {
    var query = params ? ('?' + new URLSearchParams(params).toString()) : '';
    return apiFetch(API_BASE + '/students' + query, { headers: authHeaders() });
  },

  getById: async function (id) {
    return apiFetch(API_BASE + '/students/' + id, { headers: authHeaders() });
  },

  update: async function (id, payload) {
    var isFormData = payload instanceof FormData;
    return apiFetch(API_BASE + '/students/' + id, {
      method:  'PUT',
      headers: authHeaders(isFormData),
      body:    isFormData ? payload : JSON.stringify(payload)
    });
  },

  delete: async function (id) {
    return apiFetch(API_BASE + '/students/' + id, {
      method:  'DELETE',
      headers: authHeaders()
    });
  },

  getRecommendations: async function (id, topN) {
    var query = topN ? ('?topN=' + topN) : '';
    return apiFetch(API_BASE + '/students/' + id + '/recommendations' + query, {
      headers: authHeaders()
    });
  },

  getApplications: async function (id) {
    return apiFetch(API_BASE + '/students/' + id + '/applications', {
      headers: authHeaders()
    });
  }
};

/* ================================================================
   ADMIN API
================================================================ */
const AdminAPI = {
  login: async function (email, password) {
    return AuthAPI.login(email, password);
  }
};

/* ================================================================
   INTERNSHIP API
================================================================ */
const InternshipsAPI = {
  getAll: async function () {
    return apiFetch(API_BASE + '/internships', { headers: authHeaders() });
  },

  getById: async function (id) {
    return apiFetch(API_BASE + '/internships/' + id, { headers: authHeaders() });
  }
};

/* ================================================================
   APPLICATIONS API
================================================================ */
const ApplicationsAPI = {
  create: async function (payload) {
    return apiFetch(API_BASE + '/applications', {
      method:  'POST',
      headers: authHeaders(),
      body:    JSON.stringify(payload)
    });
  },

  getAll: async function () {
    return apiFetch(API_BASE + '/applications', { headers: authHeaders() });
  },

  updateStatus: async function (id, status) {
    return apiFetch(API_BASE + '/applications/' + id, {
      method:  'PUT',
      headers: authHeaders(),
      body:    JSON.stringify({ status: status })
    });
  }
};

/* ================================================================
   AUTH SESSION MANAGER
   Used by pages: Auth.getSession(), Auth.setSession(), Auth.logout()
================================================================ */
const Auth = {
  _key: 'aiias_session',

  getSession: function () {
    try {
      var raw = localStorage.getItem(this._key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  },

  setSession: function (user) {
    try { localStorage.setItem(this._key, JSON.stringify(user)); } catch (e) {}
  },

  logout: function () {
    localStorage.removeItem(this._key);
    removeToken();
  },

  /**
   * High-level login — calls API, saves session, returns user.
   */
  login: async function (email, password) {
    var result = await AuthAPI.login(email, password);
    if (result && result.user) {
      this.setSession(result.user);
    }
    return result;
  }
};

/* ================================================================
   DATA SERVICE
   High-level wrapper used by all pages.
   Tries the backend first; falls back to localStorage when offline.
================================================================ */
const DataService = {

  /* ── public status helpers ─────────────────────────────────── */
  isOnline: function () { return _backendOnline === true; },

  resetCache: function () {
    _backendOnline = null;
    _lastChecked   = 0;
  },

  /* ── normalise the list response from backend ──────────────── */
  _normList: function (raw) {
    /* Backend may return: { data:[...], meta:{total} }
       OR  { students:[...] }
       OR  [...] */
    if (Array.isArray(raw))            return { data: raw,           meta: { total: raw.length } };
    if (raw && Array.isArray(raw.data)) return { data: raw.data,     meta: raw.meta || { total: raw.data.length } };
    if (raw && raw.students)            return { data: raw.students,  meta: { total: raw.students.length } };
    return { data: [], meta: { total: 0 } };
  },

  /* ── normalise single-student response ─────────────────────── */
  _normOne: function (raw) {
    if (raw && raw.data) return raw.data;
    if (raw && raw._id)  return raw;
    if (raw && raw.id)   return raw;
    return raw;
  },

  /* ── students ──────────────────────────────────────────────── */
  getStudents: async function (params) {
    var online = await isBackendOnline();
    if (online) {
      try {
        var raw = await StudentsAPI.getAll(params);
        return this._normList(raw);
      } catch (e) {
        console.warn('[DataService] getStudents backend error, falling back:', e.message);
      }
    }
    /* offline fallback */
    return lsFilter(params || {});
  },

  getStudent: async function (id) {
    var online = await isBackendOnline();
    if (online) {
      try {
        var raw = await StudentsAPI.getById(id);
        return this._normOne(raw);
      } catch (e) {
        console.warn('[DataService] getStudent backend error, falling back:', e.message);
      }
    }
    return lsGetById(id);
  },

  createStudent: async function (payload) {
    var online = await isBackendOnline();
    if (online) {
      try {
        return await StudentsAPI.create(payload);
      } catch (e) {
        console.warn('[DataService] createStudent backend error, falling back:', e.message);
        _backendOnline = false; /* mark offline until next check */
      }
    }
    /* offline fallback — convert FormData back to plain object */
    var data = payload instanceof FormData ? formDataToObj(payload) : payload;
    return lsCreate(data);
  },

  updateStudent: async function (id, payload) {
    var online = await isBackendOnline();
    if (online) {
      try {
        return await StudentsAPI.update(id, payload);
      } catch (e) {
        console.warn('[DataService] updateStudent backend error, falling back:', e.message);
        _backendOnline = false;
      }
    }
    var data = payload instanceof FormData ? formDataToObj(payload) : payload;
    return lsUpdate(id, data);
  },

  deleteStudent: async function (id) {
    var online = await isBackendOnline();
    if (online) {
      try {
        return await StudentsAPI.delete(id);
      } catch (e) {
        console.warn('[DataService] deleteStudent backend error, falling back:', e.message);
        _backendOnline = false;
      }
    }
    return lsDelete(id);
  },

  getRecommendations: async function (id, topN) {
    return StudentsAPI.getRecommendations(id, topN);
  }
};

/* ── FormData → plain object helper ────────────────────────── */
function formDataToObj(fd) {
  var obj = {};
  fd.forEach(function (val, key) {
    /* keys like technicalSkills[] → technicalSkills array */
    var arrKey = key.endsWith('[]') ? key.slice(0, -2) : null;
    if (arrKey) {
      if (!Array.isArray(obj[arrKey])) obj[arrKey] = [];
      obj[arrKey].push(val);
    } else {
      obj[key] = val;
    }
  });
  return obj;
}

/* ================================================================
   EXPOSE GLOBALS
================================================================ */
window.isBackendOnline   = isBackendOnline;
window.Auth              = Auth;
window.AuthAPI           = AuthAPI;
window.AdminAPI          = AdminAPI;
window.StudentsAPI       = StudentsAPI;
window.InternshipsAPI    = InternshipsAPI;
window.ApplicationsAPI   = ApplicationsAPI;
window.DataService       = DataService;