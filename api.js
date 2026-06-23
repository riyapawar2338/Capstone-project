'use strict';

const API_BASE = window.API_BASE || 'http://localhost:5000/api';

/* =========================
   GENERIC API CALL WRAPPER
========================= */
async function apiRequest(endpoint, method = 'GET', data = null) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: data ? JSON.stringify(data) : null
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.msg || 'API Error');
    return result;

  } catch (err) {
    console.error('API Error:', err.message);
    throw err;
  }
}

/* =========================
   AUTH APIs
========================= */
async function apiLogin(email, password) {
  return apiRequest('/auth/login', 'POST', { email, password });
}

async function apiRegister(name, email, password, rollNo) {
  return apiRequest('/auth/register', 'POST', {
    name, email, password, rollNo
  });
}

/* =========================
   STUDENT APIs
========================= */
async function getStudents() {
  return apiRequest('/students');
}

async function updateStudent(id, data) {
  return apiRequest(`/students/${id}`, 'PUT', data);
}

/* =========================
   INTERNSHIP APIs
========================= */
async function getInternships() {
  return apiRequest('/internships');
}

async function addInternship(data) {
  return apiRequest('/internships', 'POST', data);
}

/* =========================
   APPLICATION APIs
========================= */
async function applyInternship(data) {
  return apiRequest('/applications', 'POST', data);
}