'use strict';

/* =========================================================
   KEYS — localStorage key names
========================================================= */
var KEYS = {
  STUDENTS:     'aiias_students',
  INTERNSHIPS:  'aiias_internships',
  APPLICATIONS: 'aiias_applications',
  USERS:        'aiias_users'
};

/* =========================================================
   STORE — localStorage CRUD helper
   Used as offline fallback when backend is unavailable
========================================================= */
var Store = {
  get: function (key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || [];
    } catch (e) {
      return [];
    }
  },

  set: function (key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error('Store.set failed:', e);
    }
  },

  getOne: function (key, id) {
    return this.get(key).find(function (item) {
      return item.id === id || item._id === id;
    }) || null;
  },

  remove: function (key, id) {
    var list = this.get(key).filter(function (item) {
      return item.id !== id && item._id !== id;
    });
    this.set(key, list);
  },

  push: function (key, item) {
    var list = this.get(key);
    list.push(item);
    this.set(key, list);
  }
};

/* =========================================================
   AUTH — session management
========================================================= */
var Auth = {
  _key: 'aiias_session',

  getSession: function () {
    try {
      return JSON.parse(localStorage.getItem(this._key)) || null;
    } catch (e) {
      return null;
    }
  },

  setSession: function (user) {
    localStorage.setItem(this._key, JSON.stringify(user));
  },

  clearSession: function () {
    localStorage.removeItem(this._key);
    // Also clear token on logout
    if (typeof TokenStore !== 'undefined') TokenStore.clear();
  },

  isLoggedIn: function () {
    return this.getSession() !== null;
  },

  isAdmin: function () {
    var s = this.getSession();
    return s && s.role === 'admin';
  },

  isStudent: function () {
    var s = this.getSession();
    return s && s.role === 'student';
  },

  logout: function () {
    this.clearSession();
    window.location.href = 'login.html';
  }
};

/* =========================================================
   NAV USER PILL — renders logged-in user badge in navbar
========================================================= */
function renderNavUser() {
  var pill = document.getElementById('navUserPill');
  if (!pill) return;

  var session = Auth.getSession();
  if (!session) {
    pill.innerHTML = '<a href="login.html" class="btn btn-primary btn-sm" style="margin-left:.75rem">Login / Register</a>';
    return;
  }

  var isAdmin = session.role === 'admin';
  var initials = (session.name || 'U').split(' ').map(function (n) { return n[0] || ''; }).join('').toUpperCase().slice(0, 2);
  pill.innerHTML =
    '<div style="display:flex;align-items:center;gap:.6rem;margin-left:.75rem">' +
      '<div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--blue),var(--cyan));display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:700;color:var(--navy)">' + initials + '</div>' +
      '<span style="font-size:.82rem;color:var(--white-2)">' + (session.name || 'User') + '</span>' +
      (isAdmin ? '<span class="badge badge-cyan" style="font-size:.65rem">Admin</span>' : '') +
      '<button onclick="Auth.logout()" class="btn btn-ghost btn-sm" style="font-size:.75rem;padding:.25rem .6rem">Logout</button>' +
    '</div>';
}

/* =========================================================
   LOGIN — tries MongoDB backend first, localStorage fallback
========================================================= */
async function loginUser(email, password) {
  // Try backend
  try {
    var online = (typeof isBackendOnline === 'function') ? await isBackendOnline() : false;
    if (online) {
      // Try admin login
      try {
        var adminData = await AdminAPI.login(email, password);
        if (typeof TokenStore !== 'undefined') TokenStore.set(adminData.token);
        var u = adminData.admin || adminData.user || {};
        var user = {
          id: u._id || u.id,
          _id: u._id || u.id,
          name: u.username || u.name || u.fullName || 'Admin',
          email: u.email,
          role: 'admin'
        };
        Auth.setSession(user);
        return { ok: true, user: user };
      } catch (adminErr) { /* not admin, try student */ }

      // Try student login
      try {
        var stuData = await AdminAPI.studentLogin(email, password);
        if (typeof TokenStore !== 'undefined') TokenStore.set(stuData.token);
        var st = stuData.student || stuData.user || {};
        var user = {
          id: st._id || st.id,
          _id: st._id || st.id,
          name: st.fullName || st.name,
          email: st.email,
          role: 'student',
          rollNo: st.rollNo || ''
        };
        Auth.setSession(user);
        return { ok: true, user: user };
      } catch (stuErr) {
        // Both failed
        return { ok: false, msg: 'Invalid email or password.' };
      }
    }
  } catch (e) { /* network issue, fall through to localStorage */ }

  // ---- Offline localStorage fallback ----
  var users = Store.get(KEYS.USERS);
  var found = users.find(function (u) {
    return u.email && u.email.toLowerCase() === email.toLowerCase() && u.password === password;
  });

  if (!found) {
    // Check hardcoded admin
    if (email === 'admin@aiias.edu' && password === 'Admin@1234') {
      var adminUser = { id: 'admin_001', _id: 'admin_001', name: 'Admin', email: email, role: 'admin' };
      Auth.setSession(adminUser);
      return { ok: true, user: adminUser };
    }
    return { ok: false, msg: 'Invalid email or password.' };
  }

  var sessionUser = { id: found.id, _id: found.id, name: found.name, email: found.email, role: found.role || 'student', rollNo: found.rollNo || '' };
  Auth.setSession(sessionUser);
  return { ok: true, user: sessionUser };
}

/* =========================================================
   REGISTER — stores directly in MongoDB, no localStorage for users
========================================================= */
async function registerUser(name, email, password, rollNo) {
  // Try backend
  try {
    var online = (typeof isBackendOnline === 'function') ? await isBackendOnline() : false;
    if (online) {
      await StudentsAPI.register({
        fullName: name,
        email: email,
        password: password,
        rollNo: rollNo || ('STU' + Date.now().toString().slice(-6)),
        department: 'Computer Engineering',
        semester: 'Semester 6',
        cgpa: 7.0,
        preferredDomain: 'Artificial Intelligence',
        technicalSkills: ['To be updated']
      });
      // Now login to get token + session
      var stuData = await AdminAPI.studentLogin(email, password);
      if (typeof TokenStore !== 'undefined') TokenStore.set(stuData.token);
      var st = stuData.student || stuData.user || {};
      var user = {
        id: st._id || st.id,
        _id: st._id || st.id,
        name: st.fullName || st.name || name,
        email: st.email || email,
        role: 'student',
        rollNo: st.rollNo || rollNo || ''
      };
      Auth.setSession(user);
      return { ok: true, user: user };
    }
  } catch (err) {
    var msg = (err.message || '').toLowerCase();
    if (msg.includes('already') || msg.includes('duplicate') || msg.includes('exists')) {
      return { ok: false, msg: 'Email already registered. Please login.' };
    }
    console.warn('Backend register failed, falling back to localStorage:', err.message);
  }

  // ---- Offline localStorage fallback ----
  var users = Store.get(KEYS.USERS);
  var exists = users.some(function (u) { return u.email && u.email.toLowerCase() === email.toLowerCase(); });
  if (exists) return { ok: false, msg: 'Email already registered.' };

  var newUser = {
    id: 'stu_' + Date.now(),
    name: name,
    email: email,
    password: password,
    role: 'student',
    rollNo: rollNo || ('STU' + Date.now().toString().slice(-6)),
    createdAt: new Date().toISOString()
  };
  users.push(newUser);
  Store.set(KEYS.USERS, users);

  // Also create a student profile entry
  var profile = {
    id: newUser.id,
    _id: newUser.id,
    fullName: name,
    email: email,
    rollNo: newUser.rollNo,
    department: '',
    semester: '',
    cgpa: 0,
    preferredDomain: '',
    technicalSkills: [],
    createdAt: newUser.createdAt
  };
  Store.push(KEYS.STUDENTS, profile);

  var sessionUser = { id: newUser.id, _id: newUser.id, name: newUser.name, email: newUser.email, role: 'student', rollNo: newUser.rollNo };
  Auth.setSession(sessionUser);
  return { ok: true, user: sessionUser };
}

/* =========================================================
   SEED DEFAULT INTERNSHIPS (if none exist in localStorage)
   This runs once so dashboards have data to display offline
========================================================= */
function seedDefaultData() {
  if (Store.get(KEYS.INTERNSHIPS).length === 0) {
    Store.set(KEYS.INTERNSHIPS, [
      { id: 'int_1', title: 'AI/ML Intern', company: 'TechCorp India', location: 'Pune', domain: 'Artificial Intelligence', requiredSkills: ['Python', 'Machine Learning', 'TensorFlow'], minCgpa: 7.0, seats: 5, duration: '3 months', stipend: '₹15,000/mo', createdAt: new Date().toISOString() },
      { id: 'int_2', title: 'Frontend Developer Intern', company: 'WebSolutions Pvt Ltd', location: 'Mumbai', domain: 'Web Development', requiredSkills: ['HTML', 'CSS', 'JavaScript', 'React'], minCgpa: 6.5, seats: 3, duration: '2 months', stipend: '₹10,000/mo', createdAt: new Date().toISOString() },
      { id: 'int_3', title: 'Data Science Intern', company: 'Analytics Hub', location: 'Bangalore', domain: 'Data Science', requiredSkills: ['Python', 'Pandas', 'SQL', 'Data Visualization'], minCgpa: 7.5, seats: 4, duration: '3 months', stipend: '₹18,000/mo', createdAt: new Date().toISOString() },
      { id: 'int_4', title: 'Cybersecurity Intern', company: 'SecureNet', location: 'Hyderabad', domain: 'Cybersecurity', requiredSkills: ['Networking', 'Linux', 'Ethical Hacking'], minCgpa: 7.0, seats: 2, duration: '4 months', stipend: '₹12,000/mo', createdAt: new Date().toISOString() },
      { id: 'int_5', title: 'Mobile App Developer Intern', company: 'AppWorks', location: 'Nagpur', domain: 'Mobile Development', requiredSkills: ['Flutter', 'Dart', 'Firebase'], minCgpa: 6.0, seats: 3, duration: '2 months', stipend: '₹8,000/mo', createdAt: new Date().toISOString() },
      { id: 'int_6', title: 'Cloud Computing Intern', company: 'CloudBase', location: 'Chennai', domain: 'Cloud Computing', requiredSkills: ['AWS', 'Docker', 'Linux', 'Kubernetes'], minCgpa: 7.0, seats: 4, duration: '3 months', stipend: '₹20,000/mo', createdAt: new Date().toISOString() }
    ]);
  }

  // Ensure hardcoded admin exists in USERS store for offline login
  var users = Store.get(KEYS.USERS);
  var adminExists = users.some(function (u) { return u.email === 'admin@aiias.edu'; });
  if (!adminExists) {
    users.push({ id: 'admin_001', _id: 'admin_001', name: 'Admin', email: 'admin@aiias.edu', password: 'Admin@1234', role: 'admin' });
    Store.set(KEYS.USERS, users);
  }
}

// Run seed on page load
seedDefaultData();

/* =========================================================
   SYNC FROM MONGODB → localStorage
   Call this after login to mirror backend data to local Store
   so all pages work even if backend goes offline mid-session
========================================================= */
async function syncFromBackend() {
  try {
    var online = (typeof isBackendOnline === 'function') ? await isBackendOnline() : false;
    if (!online) return;

    // Sync students
    try {
      var res = await StudentsAPI.getAll();
      var list = Array.isArray(res) ? res : (res.data || res.students || []);
      if (list.length) Store.set(KEYS.STUDENTS, list);
    } catch (e) {}

    // Sync internships
    try {
      var res2 = await InternshipsAPI.getAll();
      var list2 = Array.isArray(res2) ? res2 : (res2.data || res2.internships || []);
      if (list2.length) Store.set(KEYS.INTERNSHIPS, list2);
    } catch (e) {}

    // Sync applications
    try {
      var res3 = await ApplicationsAPI.getAll();
      var list3 = Array.isArray(res3) ? res3 : (res3.data || res3.applications || []);
      if (list3.length) Store.set(KEYS.APPLICATIONS, list3);
    } catch (e) {}

  } catch (e) {
    console.warn('syncFromBackend failed:', e.message);
  }
}

/* =========================================================
   DATE FORMATTER
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
   TOAST NOTIFICATION
========================================================= */
function showToast(msg, type) {
  type = type || 'info';
  var box = document.getElementById('toastContainer');
  if (!box) {
    box = document.createElement('div');
    box.id = 'toastContainer';
    box.className = 'toast-container';
    document.body.appendChild(box);
  }

  var t = document.createElement('div');
  t.className = 'toast ' + type;
  t.innerHTML = msg;

  box.appendChild(t);
  setTimeout(function () { t.remove(); }, 3000);
}

/* =========================================================
   MODAL HELPERS
========================================================= */
function openModal(id) {
  var el = document.getElementById(id);
  if (el) el.classList.add('active');
}

function closeModal(id) {
  var el = document.getElementById(id);
  if (el) el.classList.remove('active');
}

/* =========================================================
   AI MATCH SCORE
========================================================= */
function calcMatchScore(student, internship) {
  if (!student || !internship) return 0;

  function tokens(v) {
    if (!v) return [];
    if (Array.isArray(v)) return v.map(function (s) { return (s || '').trim(); }).filter(Boolean);
    return String(v).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  }

  var sSkills = tokens(student.technicalSkills);
  var rSkills = tokens(internship.requiredSkills);

  var hits = rSkills.filter(function (r) {
    return sSkills.some(function (s) {
      return s.toLowerCase().includes(r.toLowerCase()) || r.toLowerCase().includes(s.toLowerCase());
    });
  }).length;

  var skillPts = rSkills.length ? (hits / rSkills.length) * 40 : 0;

  var cgpaPts = (parseFloat(student.cgpa) || 0) >= (parseFloat(internship.minCgpa) || 0) ? 20 : 10;

  var domainPts = 0;
  if (student.preferredDomain && internship.domain) {
    if (student.preferredDomain.toLowerCase() === internship.domain.toLowerCase()) domainPts = 20;
  }

  return Math.min(100, Math.round(skillPts + cgpaPts + domainPts));
}

/* =========================================================
   INIT NAV on every page load
========================================================= */
document.addEventListener('DOMContentLoaded', function () {
  renderNavUser();

  // Show/hide admin nav link
  var navAdmin = document.getElementById('navAdmin');
  if (navAdmin && Auth.isAdmin()) {
    navAdmin.classList.remove('hidden');
  }
  var navManage = document.getElementById('navManage');
  if (navManage && Auth.isAdmin()) {
    navManage.classList.remove('hidden');
  }
});