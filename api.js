'use strict';

/* ================================================================
   AI INTERNSHIP ALLOCATION & RECOMMENDATION SYSTEM
   api.js — FIXED VERSION
   All API calls to backend. Falls back gracefully to offline mode.
   ================================================================ */

const API_BASE = window.API_BASE || 'https://capstone-project-backend-m20u.onrender.com/api';

/* ── Token helpers ──────────────────────────────────────────── */
function getToken() {
  return localStorage.getItem('aiias_token') || null;
}

function saveToken(token) {
  if (token) localStorage.setItem('aiias_token', token);
}

function authHeaders(extra) {
  var headers = Object.assign({ 'Content-Type': 'application/json' }, extra || {});
  var token = getToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return headers;
}

/* ── Generic fetch wrapper with error handling ──────────────── */
async function apiFetch(url, options) {
  try {
    var res = await fetch(url, options);
    var data = await res.json();

    if (!res.ok) {
      /* Backend returned an error status */
      var msg = (data && (data.message || data.error)) || ('HTTP ' + res.status);
      throw new Error(msg);
    }

    return data;
  } catch (err) {
    /* Network error or JSON parse error */
    if (err instanceof TypeError) {
      throw new Error('Cannot reach server. Check your connection.');
    }
    throw err;
  }
}

/* ============================================================
   BACKEND HEALTH CHECK
============================================================ */
async function isBackendOnline(silent) {
  try {
    var res = await fetch(API_BASE + '/health', { signal: AbortSignal.timeout(5000) });
    var data = await res.json();
    return !!(data && data.success);
  } catch (err) {
    if (!silent) console.warn('[api.js] Backend offline:', err.message);
    return false;
  }
}

/* ============================================================
   AUTH API
============================================================ */
const AuthAPI = {
  /**
   * Login — works for both admin and student accounts.
   * On success saves JWT token and returns the user object.
   */
  login: async function (email, password) {
    var data = await apiFetch(API_BASE + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: password })
    });

    /* Save JWT if backend returns one */
    if (data.token)              saveToken(data.token);
    if (data.data && data.data.token) saveToken(data.data.token);

    /* Normalise user object — backend may return it in data.user or data.data */
    var user = data.user || data.data || data;
    if (!user || !user.email) throw new Error(data.message || 'Login failed');

    return { user: user };
  },

  /**
   * Register — public student self-registration.
   */
  register: async function (payload) {
    var data = await apiFetch(API_BASE + '/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return data;
  }
};

/* ============================================================
   STUDENT API
============================================================ */
const StudentsAPI = {
  /**
   * FIX: Student SELF-registration hits /students/register (public),
   * NOT /students (admin-protected).
   */
  register: async function (payload) {
    var data = await apiFetch(API_BASE + '/students/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return data;
  },

  /**
   * Admin-only: create student manually (requires auth token).
   */
  create: async function (payload) {
    var data = await apiFetch(API_BASE + '/students', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });
    return data;
  },

  getAll: async function (params) {
    var query = params ? ('?' + new URLSearchParams(params).toString()) : '';
    var data  = await apiFetch(API_BASE + '/students' + query, {
      headers: authHeaders()
    });
    return data;
  },

  getById: async function (id) {
    var data = await apiFetch(API_BASE + '/students/' + id, {
      headers: authHeaders()
    });
    return data;
  },

  update: async function (id, payload) {
    var data = await apiFetch(API_BASE + '/students/' + id, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });
    return data;
  },

  delete: async function (id) {
    var data = await apiFetch(API_BASE + '/students/' + id, {
      method: 'DELETE',
      headers: authHeaders()
    });
    return data;
  },

  getRecommendations: async function (id, topN) {
    var query = topN ? ('?topN=' + topN) : '';
    var data  = await apiFetch(API_BASE + '/students/' + id + '/recommendations' + query, {
      headers: authHeaders()
    });
    return data;
  },

  getApplications: async function (id) {
    var data = await apiFetch(API_BASE + '/students/' + id + '/applications', {
      headers: authHeaders()
    });
    return data;
  }
};

/* ============================================================
   ADMIN API
============================================================ */
const AdminAPI = {
  /** Alias — login is the same endpoint for all roles */
  login: async function (email, password) {
    return AuthAPI.login(email, password);
  }
};

/* ============================================================
   INTERNSHIP API
============================================================ */
const InternshipsAPI = {
  getAll: async function () {
    var data = await apiFetch(API_BASE + '/internships', {
      headers: authHeaders()
    });
    return data;
  },

  getById: async function (id) {
    var data = await apiFetch(API_BASE + '/internships/' + id, {
      headers: authHeaders()
    });
    return data;
  }
};

/* ============================================================
   APPLICATIONS API
============================================================ */
const ApplicationsAPI = {
  create: async function (payload) {
    var data = await apiFetch(API_BASE + '/applications', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });
    return data;
  },

  getAll: async function () {
    var data = await apiFetch(API_BASE + '/applications', {
      headers: authHeaders()
    });
    return data;
  },

  updateStatus: async function (id, status) {
    var data = await apiFetch(API_BASE + '/applications/' + id, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ status: status })
    });
    return data;
  }
};

/* ============================================================
   EXPOSE GLOBALS
============================================================ */
window.isBackendOnline   = isBackendOnline;
window.AuthAPI           = AuthAPI;
window.AdminAPI          = AdminAPI;
window.StudentsAPI       = StudentsAPI;
window.InternshipsAPI    = InternshipsAPI;
window.ApplicationsAPI   = ApplicationsAPI;