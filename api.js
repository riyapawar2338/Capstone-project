'use strict';

/* =========================================================
   CONFIG
   -------------------------------------------------------
   IMPORTANT: Set your deployed backend URL here.
   Replace the string below with your Render / Railway /
   Vercel backend URL.

   Example: const API_BASE = 'https://my-backend.onrender.com/api';

   If you have NO backend deployed yet, leave as localhost
   and the app will run fully in localStorage (offline mode).
========================================================= */
const API_BASE = window.API_BASE || 'http://localhost:5001/api';

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

  var isFormData = (typeof FormData !== 'undefined' && data instanceof FormData);

  var headers = {};
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  // Never set Content-Type for FormData — browser sets it with boundary automatically

  if (requiresAuth) {
    var token = TokenStore.get();
    if (token) headers['Authorization'] = 'Bearer ' + token;
  }

  try {
    var res = await fetch(API_BASE + endpoint, {
      method: method,
      headers: headers,
      body: isFormData ? data : (data ? JSON.stringify(data) : null)
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
  // If using localhost, skip the check entirely — always offline on GitHub Pages
  if (API_BASE.includes('localhost') || API_BASE.includes('127.0.0.1')) {
    return false;
  }
  try {
    var controller = new AbortController();
    var timer = setTimeout(function(){ controller.abort(); }, 2500);
    var res = await fetch(API_BASE + '/health', {
      method: 'GET',
      signal: controller.signal
    });
    clearTimeout(timer);
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
    var isFormData = (typeof FormData !== 'undefined' && data instanceof FormData);
    // For FormData (resume upload), use multipart endpoint
    var endpoint = isFormData ? '/students/upload' : '/students';
    return apiRequest(endpoint, 'POST', data, true);
  },

  update: async function (id, data) {
    var isFormData = (typeof FormData !== 'undefined' && data instanceof FormData);
    var endpoint = isFormData ? '/students/' + id + '/upload' : '/students/' + id;
    return apiRequest(endpoint, 'PUT', data, true);
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
    // Normalize field names — some backends use internship/student, others internshipId/studentId
    var payload = Object.assign({}, data, {
      internship: data.internshipId || data.internship,
      student: data.studentId || data.student,
      internshipId: data.internshipId || data.internship,
      studentId: data.studentId || data.student
    });
    return apiRequest('/applications', 'POST', payload, true);
  },

  updateStatus: async function (id, status, notes) {
    // Try both common route patterns
    try {
      return await apiRequest('/applications/' + id + '/status', 'PUT', { status: status, notes: notes }, true);
    } catch(e) {
      return await apiRequest('/applications/' + id, 'PUT', { status: status, adminNotes: notes }, true);
    }
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
    var online = false;
    try { online = await isBackendOnline(); } catch(e){}

    if (online) {
      try {
        var res = await StudentsAPI.create(data);
        var saved = res.data || res.student || res;
        // Normalize: ensure both id and _id exist
        if (!saved.id && saved._id) saved.id = saved._id;
        if (!saved._id && saved.id) saved._id = saved.id;
        // Mirror to local Store
        var list = Store.get(KEYS.STUDENTS);
        var idx = list.findIndex(function(s){ return (s._id||s.id) === (saved._id||saved.id); });
        if (idx >= 0) list[idx] = saved; else list.push(saved);
        Store.set(KEYS.STUDENTS, list);
        return saved;
      } catch (e) {
        console.warn('DataService.createStudent backend failed:', e.message);
        showToast('Backend error: ' + (e.message || 'Could not save to database.') + ' Saving locally.', 'warning');
      }
    }

    // Offline fallback — save to localStorage only
    var isFormData = (typeof FormData !== 'undefined' && data instanceof FormData);
    var localData = isFormData ? {} : data;
    if (isFormData) {
      // Extract fields from FormData for localStorage
      for (var pair of data.entries()) {
        if (pair[0] !== 'resume') localData[pair[0]] = pair[1];
      }
    }
    var student = Object.assign({
      id: 'stu_' + Date.now(),
      _id: 'stu_' + Date.now(),
      createdAt: new Date().toISOString()
    }, localData);
    var list = Store.get(KEYS.STUDENTS);
    list.push(student);
    Store.set(KEYS.STUDENTS, list);
    return student;
  },

  updateStudent: async function (id, data) {
    var online = false;
    try { online = await isBackendOnline(); } catch(e){}

    if (online) {
      try {
        var res = await StudentsAPI.update(id, data);
        var saved = res.data || res.student || res;
        if (!saved.id && saved._id) saved.id = saved._id;
        if (!saved._id && saved.id) saved._id = saved.id;
        // Mirror update to local Store
        var list = Store.get(KEYS.STUDENTS);
        var idx = list.findIndex(function(s){ return (s._id||s.id) === id; });
        if (idx >= 0) { list[idx] = Object.assign(list[idx], saved); Store.set(KEYS.STUDENTS, list); }
        return saved;
      } catch (e) {
        console.warn('DataService.updateStudent backend failed:', e.message);
        showToast('Backend error: ' + (e.message || 'Could not update database.') + ' Saving locally.', 'warning');
      }
    }

    // Offline fallback
    var isFormData = (typeof FormData !== 'undefined' && data instanceof FormData);
    var localData = isFormData ? {} : data;
    if (isFormData) {
      for (var pair of data.entries()) {
        if (pair[0] !== 'resume') localData[pair[0]] = pair[1];
      }
    }
    var list = Store.get(KEYS.STUDENTS);
    var idx = list.findIndex(function(s){ return (s._id||s.id) === id; });
    if (idx >= 0) {
      list[idx] = Object.assign(list[idx], localData);
      Store.set(KEYS.STUDENTS, list);
      return list[idx];
    }
    throw new Error('Student not found in local store. Please refresh.');
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
