'use strict';

const API_BASE = window.API_BASE || 'https://capstone-project-backend-m20u.onrender.com/api';

/* ============================================================
   CHECK BACKEND
============================================================ */
async function isBackendOnline(force = false) {
  try {
    const res = await fetch(`${API_BASE}/health`, {
      method: 'GET'
    });
    const data = await res.json();
    return !!data.success;
  } catch (err) {
    return false;
  }
}

/* ============================================================
   AUTH API
============================================================ */
const AuthAPI = {
  login: async (email, password) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return res.json();
  },

  register: async (payload) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  }
};

/* ============================================================
   STUDENT API
============================================================ */
const StudentsAPI = {
  create: async (payload) => {
    const res = await fetch(`${API_BASE}/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  getAll: async () => {
    const res = await fetch(`${API_BASE}/students`);
    return res.json();
  },

  getById: async (id) => {
    const res = await fetch(`${API_BASE}/students/${id}`);
    return res.json();
  }
};

/* ============================================================
   ADMIN API
============================================================ */
const AdminAPI = {
  login: async (email, password) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return res.json();
  }
};

/* ============================================================
   LOCAL STORAGE FALLBACK
============================================================ */
function loginUser(email, pass) {
  const users = JSON.parse(localStorage.getItem('users') || '[]');
  const user = users.find(u => u.email === email && u.password === pass);
  return user ? { ok: true, user } : { ok: false, msg: 'Invalid credentials' };
}

function registerUser(user) {
  const users = JSON.parse(localStorage.getItem('users') || '[]');

  if (users.find(u => u.email === user.email)) {
    return { ok: false, msg: 'User already exists' };
  }

  users.push(user);
  localStorage.setItem('users', JSON.stringify(users));
  return { ok: true, user };
}

/* ============================================================
   AUTH SESSION
============================================================ */
const Auth = {
  setSession: (user) => {
    localStorage.setItem('auth', JSON.stringify(user));
  },

  getSession: () => {
    return JSON.parse(localStorage.getItem('auth'));
  },

  isLoggedIn: () => {
    return !!localStorage.getItem('auth');
  },

  isAdmin: () => {
    const u = Auth.getSession();
    return u?.role === 'admin';
  }
};

/* expose globally */
window.isBackendOnline = isBackendOnline;
window.AuthAPI = AuthAPI;
window.StudentsAPI = StudentsAPI;
window.AdminAPI = AdminAPI;
window.loginUser = loginUser;
window.registerUser = registerUser;
window.Auth = Auth;