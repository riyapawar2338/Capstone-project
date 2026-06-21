/* ============================================================
   AI INTERNSHIP ALLOCATION & RECOMMENDATION SYSTEM
   api.js — Frontend REST API Client
   ============================================================ */
'use strict';

/* ============================================================
   GLOBAL CONFIG
   ============================================================ */
window._backendOnline = null;
window.API_BASE =
  window.API_BASE || 'https://capstone-project-backend-m20u.onrender.com/api';

/* ============================================================
   HELPERS
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
  if (v == null) return [];
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
   TOKEN
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
   BACKEND CHECK
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

  return window._backendOnline;
};

/* ============================================================
   BASE REQUEST
   ============================================================ */
async function apiRequest(method, path, body = null, isFormData = false) {
  const headers = {};

  if (!isFormData) headers['Content-Type'] = 'application/json';

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

  const text = await response.text();
  let json;

  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!response.ok) {
    throw new Error(json?.message || `API error ${response.status}`);
  }

  return json || { success: true };
}

const http = {
  get: p => apiRequest('GET', p),
  post: (p, b) => apiRequest('POST', p, b),
  put: (p, b) => apiRequest('PUT', p, b),
  patch: (p, b) => apiRequest('PATCH', p, b),
  del: p => apiRequest('DELETE', p),
};

/* ============================================================
   STUDENTS API  (FIX ADDED HERE)
   ============================================================ */
const StudentsAPI = {
  async getAll() {
    return http.get('/students');
  },

  async getById(id) {
    const res = await http.get(`/students/${id}`);
    return res.data;
  },

  async create(payload) {
    const res = await http.post('/students', payload);
    return res.data;
  },

  // ✅ FIX: alias used by your login.html
  async register(payload) {
    return this.create(payload);
  },

  async update(id, payload) {
    const res = await http.put(`/students/${id}`, payload);
    return res.data;
  },

  async delete(id) {
    return http.del(`/students/${id}`);
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
  async getAll() {
    return http.get('/internships');
  },
};

/* ============================================================
   APPLICATIONS API
   ============================================================ */
const ApplicationsAPI = {
  async create(studentId, internshipId, coverLetter = '') {
    return http.post('/applications', {
      studentId,
      internshipId,
      coverLetter,
    });
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
};

/* ============================================================
   EXPORTS
   ============================================================ */
window.TokenStore = TokenStore;
window.StudentsAPI = StudentsAPI;
window.InternshipsAPI = InternshipsAPI;
window.ApplicationsAPI = ApplicationsAPI;
window.AdminAPI = AdminAPI;