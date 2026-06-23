'use strict';

/* =========================================================
   STATE
========================================================= */
var Auth = {
  getSession: function () {
    try {
      return JSON.parse(localStorage.getItem('aiias_session')) || null;
    } catch (e) {
      return null;
    }
  },

  setSession: function (user) {
    localStorage.setItem('aiias_session', JSON.stringify(user));
  },

  clearSession: function () {
    localStorage.removeItem('aiias_session');
  },

  logout: function () {
    this.clearSession();
    window.location.href = 'login.html';
  }
};

/* =========================================================
   LOGIN (NOW USES BACKEND)
========================================================= */
async function loginUser(email, password) {
  try {
    const res = await apiLogin(email, password);

    Auth.setSession(res.user);

    return { ok: true, user: res.user };
  } catch (err) {
    return { ok: false, msg: err.message };
  }
}

/* =========================================================
   REGISTER (NOW USES BACKEND)
========================================================= */
async function registerUser(name, email, password, rollNo) {
  try {
    const res = await apiRegister(name, email, password, rollNo);
    return { ok: true, user: res.user };
  } catch (err) {
    return { ok: false, msg: err.message };
  }
}

/* =========================================================
   DATE FORMATTER (UNCHANGED)
========================================================= */
function fmtDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

/* =========================================================
   TOAST (UNCHANGED)
========================================================= */
function showToast(msg, type) {
  type = type || 'info';
  var box = document.getElementById('toastContainer');
  if (!box) {
    box = document.createElement('div');
    box.id = 'toastContainer';
    document.body.appendChild(box);
  }

  var t = document.createElement('div');
  t.className = 'toast ' + type;
  t.innerHTML = msg;

  box.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

/* =========================================================
   AI MATCH SCORE (UNCHANGED LOGIC)
========================================================= */
function calcMatchScore(student, internship) {
  if (!student || !internship) return 0;

  function tokens(v) {
    if (!v) return [];
    if (Array.isArray(v)) return v;
    return String(v).split(',');
  }

  var sSkills = tokens(student.technicalSkills);
  var rSkills = tokens(internship.requiredSkills);

  var hits = rSkills.filter(r =>
    sSkills.some(s =>
      s.toLowerCase().includes(r.toLowerCase())
    )
  ).length;

  var skillPts = rSkills.length ? (hits / rSkills.length) * 40 : 0;

  var cgpaPts = (student.cgpa || 0) >= (internship.minCgpa || 0)
    ? 20
    : 10;

  return Math.round(skillPts + cgpaPts);
}