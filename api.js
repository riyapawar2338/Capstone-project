'use strict';

/* =========================================================
   CONFIG — change this to your deployed backend URL
   For GitHub Pages, set window.API_BASE before loading this file
   e.g. <script>window.API_BASE = 'https://your-backend.onrender.com/api';</script>
========================================================= */
const API_BASE = window.API_BASE || 'http://localhost:5000/api';

/* =========================================================
   TOKEN STORE — stores JWT in localStorage
========================================================= */
var TokenStore = {
  _key: 'aiias_token',
  get: function () {
    return localStorage.getItem(this._key) || null;
  },
  set: function (token) {
    if (token) localStorage.setItem(this._key, token);
  },
  clear: function () {
    localStorage.removeItem(this._key);
  }
};

/* =========================================================
   GENERIC API CALL WRAPPER
========================================================= */
async function apiRequest(endpoint, method, data, requiresAuth) {
  method = method || 'GET';
  requiresAuth = requiresAuth !== false; // default true

  var headers = { 'Content-Type': 'application/json' };

  if (requiresAuth) {
    var token = TokenStore.get();
    if (token) headers['Authorization'] = 'Bearer ' + token;
  }

  try {
    var res = await fetch(API_BASE + endpoint, {
      method: method,
      headers: headers,
      body: data ? JSON.stringify(data) : null
    });

    var result = await res.json();
    if (!res.ok) throw new Error(result.msg || result.message || 'API Error');
    return result;

  } catch (err) {
    console.error('API Error [' + endpoint + ']:', err.message);
    throw err;
  }
}

/* =========================================================
   BACKEND HEALTH CHECK
========================================================= */
async function isBackendOnline() {
  try {
    var res = await fetch(API_BASE + '/health', {
      method: 'GET',
      signal: AbortSignal.timeout(3000)
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

/* =========================================================
   AUTH APIs (no token required)
========================================================= */
async function apiLogin(email, password) {
  return apiRequest('/auth/login', 'POST', { email: email, password: password }, false);
}

async function apiRegister(name, email, password, rollNo) {
  return apiRequest('/auth/register', 'POST', {
    name: name, email: email, password: password, rollNo: rollNo
  }, false);
}

/* =========================================================
   ADMIN API — login + student login via admin routes
========================================================= */
var AdminAPI = {
  login: async function (email, password) {
    return apiRequest('/auth/admin/login', 'POST', { email: email, password: password }, false);
  },

  studentLogin: async function (email, password) {
    return apiRequest('/auth/student/login', 'POST', { email: email, password: password }, false);
  },

  getStats: async function () {
    return apiRequest('/admin/stats', 'GET', null, true);
  }
};

/* =========================================================
   STUDENTS API — full CRUD
========================================================= */
var StudentsAPI = {
  register: async function (data) {
    return apiRequest('/students/register', 'POST', data, false);
  },

  getAll: async function () {
    return apiRequest('/students', 'GET', null, true);
  },

  getOne: async function (id) {
    return apiRequest('/students/' + id, 'GET', null, true);
  },

  create: async function (data) {
    return apiRequest('/students', 'POST', data, true);
  },

  update: async function (id, data) {
    return apiRequest('/students/' + id, 'PUT', data, true);
  },

  remove: async function (id) {
    return apiRequest('/students/' + id, 'DELETE', null, true);
  }
};

/* =========================================================
   INTERNSHIPS API
========================================================= */
var InternshipsAPI = {
  getAll: async function () {
    return apiRequest('/internships', 'GET', null, true);
  },

  getOne: async function (id) {
    return apiRequest('/internships/' + id, 'GET', null, true);
  },

  create: async function (data) {
    return apiRequest('/internships', 'POST', data, true);
  },

  update: async function (id, data) {
    return apiRequest('/internships/' + id, 'PUT', data, true);
  },

  remove: async function (id) {
    return apiRequest('/internships/' + id, 'DELETE', null, true);
  }
};

/* =========================================================
   APPLICATIONS API
========================================================= */
var ApplicationsAPI = {
  getAll: async function () {
    return apiRequest('/applications', 'GET', null, true);
  },

  getByStudent: async function (studentId) {
    return apiRequest('/applications/student/' + studentId, 'GET', null, true);
  },

  create: async function (data) {
    return apiRequest('/applications', 'POST', data, true);
  },

  updateStatus: async function (id, status, notes) {
    return apiRequest('/applications/' + id + '/status', 'PUT', { status: status, notes: notes }, true);
  }
};

/* =========================================================
   DATA SERVICE — used by student-management.html
   Tries MongoDB backend first, falls back to Store (localStorage)
========================================================= */
var DataService = {
  getStudents: async function () {
    try {
      var online = await isBackendOnline();
      if (online) {
        var res = await StudentsAPI.getAll();
        return Array.isArray(res) ? res : (res.data || res.students || []);
      }
    } catch (e) {
      console.warn('DataService.getStudents backend failed, using local Store');
    }
    return Store.get(KEYS.STUDENTS);
  },

  getStudent: async function (id) {
    try {
      var online = await isBackendOnline();
      if (online) {
        var res = await StudentsAPI.getOne(id);
        return res.data || res.student || res;
      }
    } catch (e) {}
    return Store.getOne(KEYS.STUDENTS, id);
  },

  createStudent: async function (data) {
    try {
      var online = await isBackendOnline();
      if (online) {
        var res = await StudentsAPI.create(data);
        var saved = res.data || res.student || res;
        // Also mirror to local store so dashboards still work offline
        var list = Store.get(KEYS.STUDENTS);
        list.push(saved);
        Store.set(KEYS.STUDENTS, list);
        return saved;
      }
    } catch (e) {
      console.warn('DataService.createStudent backend failed, using local Store');
    }
    // Offline fallback
    var student = Object.assign({ id: 'stu_' + Date.now(), createdAt: new Date().toISOString() }, data);
    var list = Store.get(KEYS.STUDENTS);
    list.push(student);
    Store.set(KEYS.STUDENTS, list);
    return student;
  },

  updateStudent: async function (id, data) {
    try {
      var online = await isBackendOnline();
      if (online) {
        var res = await StudentsAPI.update(id, data);
        var saved = res.data || res.student || res;
        // Mirror update to local store
        var list = Store.get(KEYS.STUDENTS);
        var idx = list.findIndex(function (s) { return (s._id || s.id) === id; });
        if (idx >= 0) { list[idx] = Object.assign(list[idx], saved); Store.set(KEYS.STUDENTS, list); }
        return saved;
      }
    } catch (e) {
      console.warn('DataService.updateStudent backend failed, using local Store');
    }
    // Offline fallback
    var list = Store.get(KEYS.STUDENTS);
    var idx = list.findIndex(function (s) { return (s._id || s.id) === id; });
    if (idx >= 0) {
      list[idx] = Object.assign(list[idx], data);
      Store.set(KEYS.STUDENTS, list);
      return list[idx];
    }
    throw new Error('Student not found');
  },

  deleteStudent: async function (id) {
    try {
      var online = await isBackendOnline();
      if (online) {
        await StudentsAPI.remove(id);
      }
    } catch (e) {
      console.warn('DataService.deleteStudent backend failed, using local Store');
    }
    // Always remove from local store too
    var list = Store.get(KEYS.STUDENTS).filter(function (s) { return (s._id || s.id) !== id; });
    Store.set(KEYS.STUDENTS, list);
  }
};

/* =========================================================
   LEGACY WRAPPERS (keep old code working)
========================================================= */
async function getStudents() {
  return StudentsAPI.getAll();
}

async function updateStudent(id, data) {
  return StudentsAPI.update(id, data);
}

async function getInternships() {
  return InternshipsAPI.getAll();
}

async function addInternship(data) {
  return InternshipsAPI.create(data);
}

async function applyInternship(data) {
  return ApplicationsAPI.create(data);
}