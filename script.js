'use strict';

/* =========================================================
   AUTH — session stored in sessionStorage only (not localStorage)
   NO application data is stored in localStorage.
========================================================= */
var Auth = {
  _key: 'aiias_session',

  getSession: function() {
    try { return JSON.parse(sessionStorage.getItem(this._key)) || null; }
    catch(e) { return null; }
  },
  setSession: function(user) {
    sessionStorage.setItem(this._key, JSON.stringify(user));
  },
  clearSession: function() {
    sessionStorage.removeItem(this._key);
    if (typeof TokenStore !== 'undefined') TokenStore.clear();
  },
  isLoggedIn: function() { return this.getSession() !== null; },
  isAdmin:    function() { var s = this.getSession(); return s && s.role === 'admin'; },
  isStudent:  function() { var s = this.getSession(); return s && s.role === 'student'; },
  logout:     function() { this.clearSession(); window.location.href = 'login.html'; }
};

/* =========================================================
   LOGIN — tries admin then student endpoint on backend
========================================================= */
async function loginUser(email, password) {
  /* ── ONLINE: try backend ── */
  if (!OFFLINE_MODE) {
    /* Try admin login */
    try {
      var adminData = await AdminAPI.login(email, password);
      TokenStore.set(adminData.token);
      var u = adminData.admin || adminData.user || {};
      var user = {
        id: String(u._id||u.id||''), _id: String(u._id||u.id||''),
        name: u.username||u.name||u.fullName||'Admin',
        email: u.email, role: 'admin'
      };
      Auth.setSession(user);
      return { ok:true, user:user };
    } catch(e) { /* not admin or wrong creds */ }

    /* Try student login */
    try {
      var stuData = await AdminAPI.studentLogin(email, password);
      TokenStore.set(stuData.token);
      var st = stuData.student||stuData.user||{};
      var user2 = {
        id: String(st._id||st.id||''), _id: String(st._id||st.id||''),
        name: st.fullName||st.name||'', email: st.email||email,
        role: 'student', rollNo: st.rollNo||''
      };
      Auth.setSession(user2);
      return { ok:true, user:user2 };
    } catch(e) {
      return { ok:false, msg: e.message||'Invalid email or password.' };
    }
  }

  /* ── OFFLINE MODE: check demo users + session-registered users ── */
  var allUsers = (DEMO_USERS || []).concat(OfflineStudents.getAll());
  var found = allUsers.find(function(u){
    return (u.email||'').toLowerCase() === email.toLowerCase() && u.password === password;
  });
  if (!found) return { ok:false, msg:'Invalid email or password. (Offline mode — backend not connected)' };

  var user3 = {
    id: String(found._id||found.id||''), _id: String(found._id||found.id||''),
    name: found.name||found.fullName||'User',
    email: found.email, role: found.role||'student', rollNo: found.rollNo||''
  };
  Auth.setSession(user3);
  return { ok:true, user:user3 };
}

/* =========================================================
   REGISTER — saves directly to MongoDB, no localStorage
========================================================= */
async function registerUser(name, email, password, rollNo) {
  var rn = rollNo || ('STU' + Date.now().toString().slice(-6));

  /* ── ONLINE: save to MongoDB ── */
  if (!OFFLINE_MODE) {
    try {
      await StudentsAPI.register({
        fullName: name, email: email, password: password, rollNo: rn,
        department: 'Computer Engineering', semester: 'Semester 6',
        cgpa: 7.0, preferredDomain: 'Artificial Intelligence', technicalSkills: []
      });
      var res = await loginUser(email, password);
      if (!res.ok) throw new Error('Registered but login failed: ' + res.msg);
      return { ok:true, user:res.user };
    } catch(e) {
      var msg = (e.message||'').toLowerCase();
      if (msg.includes('already')||msg.includes('duplicate')||msg.includes('exists')) {
        throw new Error('Email already registered. Please login instead.');
      }
      /* backend unreachable — fall through to offline */
      console.warn('Register backend failed, falling back to offline:', e.message);
    }
  }

  /* ── OFFLINE fallback ── */
  var all = (DEMO_USERS||[]).concat(OfflineStudents.getAll());
  if (all.find(function(u){ return (u.email||'').toLowerCase()===email.toLowerCase(); })) {
    throw new Error('Email already registered. Please login instead.');
  }
  var id  = 'stu_'+Date.now();
  var stu = {
    id:id, _id:id, name:name, fullName:name, email:email, password:password,
    rollNo:rn, role:'student', department:'', semester:'', cgpa:0,
    preferredDomain:'', technicalSkills:[], createdAt:new Date().toISOString()
  };
  OfflineStudents.upsert(stu);
  var user = { id:id, _id:id, name:name, email:email, role:'student', rollNo:rn };
  Auth.setSession(user);
  return { ok:true, user:user };
}

/* =========================================================
   TOAST NOTIFICATION — shows at top-right
========================================================= */
function showToast(msg, type, duration) {
  type     = type     || 'info';
  duration = duration || 4000;

  var box = document.getElementById('toastContainer');
  if (!box) {
    box = document.createElement('div');
    box.id        = 'toastContainer';
    box.className = 'toast-container';
    document.body.appendChild(box);
  }

  var t = document.createElement('div');
  t.className = 'toast ' + type;
  t.innerHTML = msg;
  box.appendChild(t);

  /* auto-remove */
  var timer = setTimeout(function() {
    t.style.opacity   = '0';
    t.style.transform = 'translateX(110%)';
    setTimeout(function() { t.remove(); }, 400);
  }, duration);

  /* click to dismiss */
  t.addEventListener('click', function() {
    clearTimeout(timer);
    t.remove();
  });
}

/* Application success notification — big green banner */
function showApplyNotification(internshipTitle, companyName) {
  var box = document.getElementById('toastContainer');
  if (!box) {
    box = document.createElement('div');
    box.id        = 'toastContainer';
    box.className = 'toast-container';
    document.body.appendChild(box);
  }

  var t = document.createElement('div');
  t.className   = 'toast success';
  t.style.cssText = 'min-width:320px;padding:1.1rem 1.4rem;font-size:.92rem;line-height:1.5;cursor:pointer';
  t.innerHTML   =
    '<div style="font-weight:700;font-size:1rem;margin-bottom:.3rem">🎉 Application Submitted!</div>' +
    '<div>You applied for <strong>' + internshipTitle + '</strong></div>' +
    '<div style="font-size:.8rem;opacity:.8;margin-top:.25rem">' + (companyName || '') + ' · Status: Pending Review</div>' +
    '<div style="font-size:.75rem;opacity:.6;margin-top:.4rem">Click to dismiss</div>';

  box.appendChild(t);
  t.addEventListener('click', function() { t.remove(); });
  setTimeout(function() {
    t.style.opacity   = '0';
    t.style.transform = 'translateX(110%)';
    setTimeout(function() { t.remove(); }, 400);
  }, 7000);
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
   DATE FORMATTER
========================================================= */
function fmtDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

/* =========================================================
   AI MATCH SCORE
========================================================= */
function calcMatchScore(student, internship) {
  if (!student || !internship) return 0;
  function tokens(v) {
    if (!v) return [];
    if (Array.isArray(v)) return v.map(function(s){ return (s||'').trim(); }).filter(Boolean);
    return String(v).split(',').map(function(s){ return s.trim(); }).filter(Boolean);
  }
  var sSkills = tokens(student.technicalSkills);
  var rSkills = tokens(internship.requiredSkills);
  var hits    = rSkills.filter(function(r) {
    return sSkills.some(function(s) {
      return s.toLowerCase().includes(r.toLowerCase()) || r.toLowerCase().includes(s.toLowerCase());
    });
  }).length;
  var skillPts  = rSkills.length ? (hits / rSkills.length) * 40 : 0;
  var cgpaPts   = (parseFloat(student.cgpa) || 0) >= (parseFloat(internship.minCgpa) || 0) ? 20 : 10;
  var domPts    = 0;
  if (student.preferredDomain && internship.domain &&
      student.preferredDomain.toLowerCase() === internship.domain.toLowerCase()) {
    domPts = 20;
  }
  return Math.min(100, Math.round(skillPts + cgpaPts + domPts));
}

/* =========================================================
   NAV USER PILL — renders logged-in user badge
========================================================= */
function renderNavUser() {
  var pill = document.getElementById('navUserPill');
  if (!pill) return;
  var session = Auth.getSession();
  if (!session) {
    pill.innerHTML = '<a href="login.html" class="btn btn-primary btn-sm" style="margin-left:.75rem">Login / Register</a>';
    return;
  }
  var initials = (session.name || 'U').split(' ').map(function(n){ return n[0]||''; }).join('').toUpperCase().slice(0,2);
  var isAdmin  = session.role === 'admin';
  pill.innerHTML =
    '<div style="display:flex;align-items:center;gap:.6rem;margin-left:.75rem">' +
      '<div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--blue),var(--cyan));display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:700;color:var(--navy)">' + initials + '</div>' +
      '<span style="font-size:.82rem;color:var(--white-2)">' + (session.name||'User') + '</span>' +
      (isAdmin ? '<span class="badge badge-cyan" style="font-size:.65rem">Admin</span>' : '') +
      '<button onclick="Auth.logout()" class="btn btn-ghost btn-sm" style="font-size:.75rem;padding:.25rem .6rem">Logout</button>' +
    '</div>';
}

/* =========================================================
   TAGS INPUT — chip-style multi-value input
========================================================= */
function initTagsInput(wrapperId, hiddenId) {
  var wrapper = document.getElementById(wrapperId);
  var hidden  = document.getElementById(hiddenId);
  if (!wrapper) return { getTags:function(){return[];}, setTags:function(){}, clear:function(){} };

  var input = wrapper.querySelector('.tags-input');
  var tags  = [];

  function render() {
    wrapper.querySelectorAll('.tag-item').forEach(function(el){ el.remove(); });
    tags.forEach(function(tag, i) {
      var chip = document.createElement('span');
      chip.className = 'tag-item';
      chip.innerHTML = tag + '<button type="button" class="tag-remove" data-i="' + i + '">✕</button>';
      wrapper.insertBefore(chip, input);
    });
    if (hidden) hidden.value = tags.join(',');
  }

  function addTag(val) {
    (val||'').split(',').forEach(function(part) {
      var p = part.trim();
      if (p && !tags.includes(p)) tags.push(p);
    });
    render();
  }

  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(input.value); input.value=''; }
    else if (e.key === 'Backspace' && input.value==='' && tags.length) { tags.splice(tags.length-1,1); render(); }
  });
  input.addEventListener('blur', function() { if(input.value.trim()){ addTag(input.value); input.value=''; } });
  wrapper.addEventListener('click', function(e) {
    var btn = e.target.closest('.tag-remove');
    if (btn) { tags.splice(parseInt(btn.dataset.i,10),1); render(); }
    else input.focus();
  });

  return {
    getTags:  function()    { return tags.slice(); },
    setTags:  function(arr) { tags=(arr||[]).map(function(t){return(t||'').trim();}).filter(Boolean); render(); },
    addTag:   addTag,
    clear:    function()    { tags=[]; render(); }
  };
}

/* =========================================================
   FILE UPLOAD AREA
========================================================= */
function initFileUpload(areaId) {
  var area  = document.getElementById(areaId);
  var input = document.getElementById('resumeFile');
  var label = document.getElementById('resumeName');
  if (!area || !input) return;

  area.addEventListener('click', function(e) { if (e.target !== input) input.click(); });
  input.addEventListener('change', function() {
    if (input.files && input.files[0]) {
      var name = input.files[0].name;
      if (label) label.textContent = '📎 ' + name;
    }
  });
  area.addEventListener('dragover',  function(e){ e.preventDefault(); area.style.borderColor='var(--cyan)'; });
  area.addEventListener('dragleave', function()  { area.style.borderColor=''; });
  area.addEventListener('drop', function(e) {
    e.preventDefault(); area.style.borderColor='';
    if (e.dataTransfer.files[0]) {
      try { var dt=new DataTransfer(); dt.items.add(e.dataTransfer.files[0]); input.files=dt.files; } catch(ex){}
      if (label) label.textContent = '📎 ' + e.dataTransfer.files[0].name;
    }
  });
}

/* =========================================================
   INIT NAV on page load
========================================================= */
document.addEventListener('DOMContentLoaded', function() {
  renderNavUser();
  var na = document.getElementById('navAdmin');
  if (na && Auth.isAdmin()) na.classList.remove('hidden');
  var nm = document.getElementById('navManage');
  if (nm && Auth.isAdmin()) nm.classList.remove('hidden');
});
