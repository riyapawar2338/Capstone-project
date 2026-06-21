/* ================================================================
   AI INTERNSHIP ALLOCATION & RECOMMENDATION SYSTEM
   script.js — FIXED VERSION
   ================================================================ */
'use strict';

// ============================================================
// AUTH EVENT SYSTEM
// ============================================================
window.AuthEvents = {
  notify: function () {
    window.dispatchEvent(new Event('auth-changed'));
  }
};

/* ── Storage keys ─────────────────────────────────────────────── */
var KEYS = {
  STUDENTS:     'aiias_students',
  INTERNSHIPS:  'aiias_internships',
  APPLICATIONS: 'aiias_applications',
  USERS:        'aiias_users',
  SESSION:      'aiias_session'
};

/* ── LocalStorage Store ───────────────────────────────────────── */
var Store = {
  get: function (key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; }
    catch (e) { return []; }
  },
  set: function (key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); }
    catch (e) {}
  },
  save: function (key, item) {
    var list = this.get(key);
    var idx = list.findIndex(function(i) { return i.id === item.id; });
    if (idx >= 0) list[idx] = item;
    else list.push(item);
    this.set(key, list);
  }
};

/* ── Auth System ──────────────────────────────────────────────── */
var Auth = {
  getSession: function () {
    try { return JSON.parse(localStorage.getItem(KEYS.SESSION)); }
    catch (e) { return null; }
  },

  setSession: function (user) {
    localStorage.setItem(KEYS.SESSION, JSON.stringify(user));
    window.AuthEvents.notify();
  },

  clearSession: function () {
    localStorage.removeItem(KEYS.SESSION);
    localStorage.removeItem('aiias_token');
    window.AuthEvents.notify();
  },

  isLoggedIn: function () {
    return !!this.getSession();
  },

  /* FIX: Added missing isAdmin() method */
  isAdmin: function () {
    var session = this.getSession();
    return !!(session && session.role === 'admin');
  },

  logout: function () {
    this.clearSession();
    window.location.href = 'login.html';
  }
};

/* ── Seed Default Admin ──────────────────────────────────────── */
function seedDefaultAdmin() {
  var users = Store.get(KEYS.USERS);
  var hasAdmin = users.some(function(u) { return u.role === 'admin'; });

  if (!hasAdmin) {
    users.push({
      id: 'admin_001',
      name: 'Administrator',
      email: 'admin@aiias.edu',
      password: 'Admin@1234',
      role: 'admin',
      createdAt: new Date().toISOString()
    });
    Store.set(KEYS.USERS, users);
  }
}

/* ── Register User ───────────────────────────────────────────── */
/* FIX: Now accepts a single object so callers don't need to worry
        about argument order. Still works if old positional style
        is used by passing (name, email, password, rollNo). */
function registerUser(nameOrObj, email, password, rollNo) {
  var name, emailAddr, pass, roll;

  if (nameOrObj && typeof nameOrObj === 'object') {
    /* Called with an object: registerUser({ name, email, password, rollNo }) */
    name      = nameOrObj.name      || nameOrObj.fullName || '';
    emailAddr = nameOrObj.email     || '';
    pass      = nameOrObj.password  || '';
    roll      = nameOrObj.rollNo    || '';
  } else {
    /* Called with positional args: registerUser(name, email, password, rollNo) */
    name      = nameOrObj || '';
    emailAddr = email     || '';
    pass      = password  || '';
    roll      = rollNo    || '';
  }

  if (!name || !emailAddr || !pass) {
    return { ok: false, msg: 'Name, email and password are required.' };
  }

  var users = Store.get(KEYS.USERS);

  if (users.some(function(u) {
    return u.email.toLowerCase() === emailAddr.toLowerCase();
  })) {
    return { ok: false, msg: 'Email already registered.' };
  }

  var user = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name:      name.trim(),
    email:     emailAddr.toLowerCase().trim(),
    password:  pass,
    role:      'student',
    rollNo:    roll.trim(),
    createdAt: new Date().toISOString()
  };

  users.push(user);
  Store.set(KEYS.USERS, users);

  return { ok: true, user: user };
}

/* ── Login ───────────────────────────────────────────────────── */
function loginUser(email, password) {
  if (!email || !password) {
    return { ok: false, msg: 'Email and password are required.' };
  }

  var users = Store.get(KEYS.USERS);
  var user  = users.find(function(u) {
    return u.email.toLowerCase() === email.toLowerCase().trim() &&
           u.password === password;
  });

  if (!user) return { ok: false, msg: 'Invalid email or password.' };

  return {
    ok: true,
    user: {
      id:     user.id,
      name:   user.name,
      email:  user.email,
      role:   user.role,
      rollNo: user.rollNo || ''
    }
  };
}

/* ── Navbar Controller ─────────────────────────────────────────── */
function updateNavbarUI() {
  var session   = Auth.getSession();
  var authLink  = document.getElementById('navAuthLink');
  var adminLink = document.getElementById('navAdmin');
  var userPill  = document.getElementById('navUserPill');

  if (adminLink) {
    adminLink.style.display = (session && session.role === 'admin') ? 'block' : 'none';
  }

  if (authLink) {
    if (!session) {
      authLink.innerHTML = '<a href="login.html" class="nav-cta btn">Login / Register</a>';
    } else {
      var dest = (session.role === 'admin') ? 'admin-dashboard.html' : 'student-dashboard.html';
      authLink.innerHTML = '<a href="' + dest + '" class="nav-cta btn">Dashboard</a>';
    }
  }

  if (userPill) {
    if (!session) {
      userPill.innerHTML = '';
    } else {
      var label = (session.role === 'admin') ? '👑 Admin' : '🎓 ' + session.name;
      userPill.innerHTML =
        '<span style="color:white;font-weight:600">' + label + '</span>' +
        '<button onclick="Auth.logout()" class="btn btn-sm" style="margin-left:.6rem">Logout</button>';
    }
  }
}

/* ── AI Match Score ───────────────────────────────────────────── */
/* FIX: Deterministic scoring based on actual student/internship data */
function calcMatchScore(student, internship) {
  if (!student || !internship) return 0;

  var score = 0;

  /* Domain / interest match (40 pts) */
  var interests = (student.areasOfInterest || student.interests || [])
    .map(function(s) { return s.toLowerCase(); });
  var domain = (internship.domain || '').toLowerCase();
  if (interests.some(function(i) { return i.includes(domain) || domain.includes(i); })) {
    score += 40;
  } else {
    score += 10; /* partial */
  }

  /* Skill overlap (40 pts) */
  var skills = (student.technicalSkills || student.skills || [])
    .map(function(s) { return s.toLowerCase(); });
  var required = (internship.requiredSkills || [])
    .map(function(s) { return s.toLowerCase(); });

  if (required.length > 0) {
    var matched = required.filter(function(r) {
      return skills.some(function(sk) { return sk.includes(r) || r.includes(sk); });
    }).length;
    score += Math.round((matched / required.length) * 40);
  } else {
    score += 20; /* no required skills listed — give partial */
  }

  /* CGPA bonus (20 pts) */
  var cgpa = parseFloat(student.cgpa) || 0;
  if (cgpa >= 8.5)       score += 20;
  else if (cgpa >= 7.5)  score += 15;
  else if (cgpa >= 6.5)  score += 10;
  else                   score += 5;

  return Math.min(score, 100);
}

/* ── Seed Internships ─────────────────────────────────────────── */
function seedInternships() {
  if (Store.get(KEYS.INTERNSHIPS).length) return;

  Store.set(KEYS.INTERNSHIPS, [
    {
      id: 'int1',
      title: 'AI/ML Intern',
      company: 'TechCorp Solutions',
      domain: 'Artificial Intelligence',
      location: 'Pune',
      stipend: '₹15,000/mo',
      duration: '3 Months',
      requiredSkills: ['Python', 'Machine Learning', 'TensorFlow'],
      deadline: '2025-08-31'
    },
    {
      id: 'int2',
      title: 'Full Stack Web Developer Intern',
      company: 'InnovateTech',
      domain: 'Web Development',
      location: 'Mumbai',
      stipend: '₹12,000/mo',
      duration: '6 Months',
      requiredSkills: ['HTML', 'CSS', 'JavaScript', 'Node.js'],
      deadline: '2025-09-15'
    },
    {
      id: 'int3',
      title: 'Data Science Intern',
      company: 'DataMinds',
      domain: 'Data Science',
      location: 'Bangalore',
      stipend: '₹18,000/mo',
      duration: '3 Months',
      requiredSkills: ['Python', 'Pandas', 'SQL', 'Data Visualization'],
      deadline: '2025-08-20'
    },
    {
      id: 'int4',
      title: 'Cloud Engineering Intern',
      company: 'CloudNest',
      domain: 'Cloud Computing',
      location: 'Hyderabad',
      stipend: '₹14,000/mo',
      duration: '4 Months',
      requiredSkills: ['AWS', 'Linux', 'Docker'],
      deadline: '2025-09-01'
    },
    {
      id: 'int5',
      title: 'Cybersecurity Analyst Intern',
      company: 'SecureNet',
      domain: 'Cybersecurity',
      location: 'Pune',
      stipend: '₹13,000/mo',
      duration: '3 Months',
      requiredSkills: ['Networking', 'Linux', 'Python'],
      deadline: '2025-08-25'
    },
    {
      id: 'int6',
      title: 'Android App Developer Intern',
      company: 'AppCraft',
      domain: 'Mobile Development',
      location: 'Mumbai',
      stipend: '₹10,000/mo',
      duration: '3 Months',
      requiredSkills: ['Java', 'Android', 'XML'],
      deadline: '2025-09-10'
    },
    {
      id: 'int7',
      title: 'UI/UX Design Intern',
      company: 'DesignStudio',
      domain: 'UI/UX Design',
      location: 'Remote',
      stipend: '₹8,000/mo',
      duration: '2 Months',
      requiredSkills: ['Figma', 'Adobe XD', 'Prototyping'],
      deadline: '2025-08-15'
    },
    {
      id: 'int8',
      title: 'DevOps Intern',
      company: 'PipelineWorks',
      domain: 'DevOps',
      location: 'Bangalore',
      stipend: '₹16,000/mo',
      duration: '4 Months',
      requiredSkills: ['Docker', 'Kubernetes', 'CI/CD', 'Linux'],
      deadline: '2025-09-20'
    },
    {
      id: 'int9',
      title: 'IoT Systems Intern',
      company: 'SmartThings',
      domain: 'IoT Systems',
      location: 'Pune',
      stipend: '₹11,000/mo',
      duration: '3 Months',
      requiredSkills: ['Arduino', 'C/C++', 'Raspberry Pi'],
      deadline: '2025-08-30'
    },
    {
      id: 'int10',
      title: 'Business Intelligence Intern',
      company: 'Analytics Hub',
      domain: 'Data Science',
      location: 'Remote',
      stipend: '₹10,000/mo',
      duration: '3 Months',
      requiredSkills: ['SQL', 'Power BI', 'Excel'],
      deadline: '2025-09-05'
    }
  ]);
}

/* ── INIT ─────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function () {
  seedDefaultAdmin();
  seedInternships();
  updateNavbarUI();

  /* Animated student counter on homepage */
  var hStudents = document.getElementById('hStudents');
  var statStudents = document.getElementById('statStudents');
  var count = Store.get(KEYS.STUDENTS).length || Store.get(KEYS.USERS)
    .filter(function(u) { return u.role === 'student'; }).length;

  function animateCount(el, target) {
    if (!el) return;
    var current = 0;
    var step = Math.max(1, Math.ceil(target / 40));
    var timer = setInterval(function () {
      current = Math.min(current + step, target);
      el.textContent = current;
      if (current >= target) clearInterval(timer);
    }, 40);
  }

  animateCount(hStudents, count);
  animateCount(statStudents, count);
});

/* ── Auto-refresh navbar on auth change ─────────────────────── */
window.addEventListener('auth-changed', updateNavbarUI);