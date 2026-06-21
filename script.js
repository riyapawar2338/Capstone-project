/* ================================================================
   AI INTERNSHIP ALLOCATION & RECOMMENDATION SYSTEM
   script.js — Auth + Storage + AI Engine + UI Helpers
   Pure LocalStorage. Works 100% on GitHub Pages.
   ================================================================ */
'use strict';

/* ── Storage keys ──────────────────────────────────────────────── */
var KEYS = {
  STUDENTS:     'aiias_students',
  INTERNSHIPS:  'aiias_internships',
  APPLICATIONS: 'aiias_applications',
  USERS:        'aiias_users',
  SESSION:      'aiias_session'
};

/* ── LocalStorage Store ────────────────────────────────────────── */
var Store = {
  get: function(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; }
    catch(e) { return []; }
  },
  set: function(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); }
    catch(e) {}
  },
  getOne: function(key, id) {
    return this.get(key).find(function(i){ return i.id === id; }) || null;
  },
  save: function(key, item) {
    var list = this.get(key);
    var idx  = list.findIndex(function(i){ return i.id === item.id; });
    if (idx >= 0) list[idx] = item; else list.push(item);
    this.set(key, list);
  },
  remove: function(key, id) {
    this.set(key, this.get(key).filter(function(i){ return i.id !== id; }));
  }
};

/* ── Session helpers ──────────────────────────────────────────── */
var Auth = {
  getSession: function() {
    try { return JSON.parse(localStorage.getItem(KEYS.SESSION)) || null; }
    catch(e) { return null; }
  },
  setSession: function(user) {
    localStorage.setItem(KEYS.SESSION, JSON.stringify(user));
  },
  clearSession: function() {
    localStorage.removeItem(KEYS.SESSION);
  },
  isLoggedIn: function() {
    return !!this.getSession();
  },
  isAdmin: function() {
    var s = this.getSession();
    return s && s.role === 'admin';
  },
  isStudent: function() {
    var s = this.getSession();
    return s && s.role === 'student';
  },
  getCurrentUser: function() {
    return this.getSession();
  },
  /* Redirect to login if not logged in */
  requireLogin: function() {
    if (!this.isLoggedIn()) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  },
  /* Redirect to home if not admin */
  requireAdmin: function() {
    if (!this.isLoggedIn()) { window.location.href = 'login.html'; return false; }
    if (!this.isAdmin())    { window.location.href = 'student-dashboard.html'; return false; }
    return true;
  },
  logout: function() {
    this.clearSession();
    window.location.href = 'login.html';
  }
};

/* ── Seed default admin + seed users from registered students ─── */
function seedDefaultAdmin() {
  var users = Store.get(KEYS.USERS);
  var hasAdmin = users.some(function(u){ return u.role === 'admin'; });
  if (!hasAdmin) {
    Store.save(KEYS.USERS, {
      id:       'admin_001',
      name:     'Administrator',
      email:    'admin@aiias.edu',
      password: 'Admin@1234',
      role:     'admin',
      createdAt: new Date().toISOString()
    });
  }
}

/* ── Register a new student user ─────────────────────────────── */
function registerUser(name, email, password, rollNo) {
  var users = Store.get(KEYS.USERS);
  if (users.some(function(u){ return u.email.toLowerCase() === email.toLowerCase(); })) {
    return { ok: false, msg: 'Email already registered. Please login.' };
  }
  var user = {
    id:        genId(),
    name:      name,
    email:     email.toLowerCase(),
    password:  password,
    role:      'student',
    rollNo:    rollNo || '',
    createdAt: new Date().toISOString()
  };
  Store.save(KEYS.USERS, user);
  return { ok: true, user: user };
}

/* ── Login ────────────────────────────────────────────────────── */
function loginUser(email, password) {
  var users = Store.get(KEYS.USERS);
  var user  = users.find(function(u){
    return u.email.toLowerCase() === email.toLowerCase() && u.password === password;
  });
  if (!user) return { ok: false, msg: 'Invalid email or password.' };
  Auth.setSession({ id: user.id, name: user.name, email: user.email, role: user.role, rollNo: user.rollNo || '' });
  return { ok: true, user: user };
}

/* ── Unique ID ────────────────────────────────────────────────── */
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2,7);
}

/* ── Date formatter ───────────────────────────────────────────── */
function fmtDate(str) {
  if (!str) return '—';
  try {
    return new Date(str).toLocaleDateString('en-IN',
      { day:'2-digit', month:'short', year:'numeric' });
  } catch(e) { return str; }
}

/* ── Toast ────────────────────────────────────────────────────── */
function showToast(msg, type) {
  type = type || 'info';
  var icons = { success:'✅', error:'❌', info:'ℹ️', warning:'⚠️' };
  var box = document.getElementById('toastContainer');
  if (!box) {
    box = document.createElement('div');
    box.id = 'toastContainer';
    box.className = 'toast-container';
    document.body.appendChild(box);
  }
  var t = document.createElement('div');
  t.className = 'toast ' + type;
  t.innerHTML = '<span class="toast-icon">'+(icons[type]||'ℹ️')+'</span>'
              + '<span class="toast-msg">'+msg+'</span>'
              + '<button class="toast-close" onclick="this.parentElement.remove()">✕</button>';
  box.appendChild(t);
  setTimeout(function(){ if(t.parentElement) t.remove(); }, 3500);
}

/* ── Modal ────────────────────────────────────────────────────── */
function openModal(id)  { var m=document.getElementById(id); if(m){m.classList.add('open');document.body.style.overflow='hidden';} }
function closeModal(id) { var m=document.getElementById(id); if(m){m.classList.remove('open');document.body.style.overflow='';} }

/* ── Tags input ───────────────────────────────────────────────── */
function initTagsInput(wrapperId, hiddenId) {
  var wrapper = document.getElementById(wrapperId);
  var hidden  = document.getElementById(hiddenId);
  if (!wrapper||!hidden) return { getTags:function(){return[];}, setTags:function(){} };
  var tags = hidden.value ? hidden.value.split(',').map(function(t){return t.trim();}).filter(Boolean) : [];

  function render() {
    var inp = wrapper.querySelector('.tags-input');
    wrapper.querySelectorAll('.tag-item').forEach(function(el){ el.remove(); });
    tags.forEach(function(tag) {
      var el = document.createElement('span');
      el.className = 'tag-item';
      el.innerHTML = tag+'<button class="tag-remove" type="button">✕</button>';
      el.querySelector('.tag-remove').addEventListener('click', function(){
        tags = tags.filter(function(t){ return t!==tag; });
        hidden.value = tags.join(',');
        render();
      });
      if (inp) wrapper.insertBefore(el,inp); else wrapper.appendChild(el);
    });
    hidden.value = tags.join(',');
  }

  var inp = wrapper.querySelector('.tags-input');
  if (inp) {
    inp.addEventListener('keydown', function(e) {
      if ((e.key==='Enter'||e.key===',') && inp.value.trim()) {
        e.preventDefault();
        var v = inp.value.trim().replace(/,+$/,'');
        if (v && tags.indexOf(v)===-1) { tags.push(v); render(); }
        inp.value='';
      } else if (e.key==='Backspace'&&!inp.value&&tags.length) { tags.pop(); render(); }
    });
    wrapper.addEventListener('click', function(){ inp.focus(); });
  }
  render();
  return {
    getTags: function(){ return tags.slice(); },
    setTags: function(arr){ tags=(arr||[]).map(function(t){return String(t).trim();}).filter(Boolean); render(); }
  };
}

/* ── File upload ──────────────────────────────────────────────── */
function initFileUpload(areaId) {
  var area=document.getElementById(areaId); if(!area) return;
  var input=area.querySelector('input[type=file]');
  var label=area.querySelector('.file-name');
  function handleFile(f){ if(label) label.textContent='📎 '+f.name; area.dataset.fileName=f.name; }
  if (input) {
    area.addEventListener('click',function(e){ if(e.target!==input) input.click(); });
    input.addEventListener('change',function(){ if(input.files&&input.files[0]) handleFile(input.files[0]); });
    area.addEventListener('dragover',function(e){ e.preventDefault(); area.classList.add('dragover'); });
    area.addEventListener('dragleave',function(){ area.classList.remove('dragover'); });
    area.addEventListener('drop',function(e){ e.preventDefault(); area.classList.remove('dragover'); if(e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); });
  }
}

/* ── Build navigation based on role ──────────────────────────── */
function buildNav() {
  var session = Auth.getSession();
  var nav = document.querySelector('.nav-links');
  if (!nav) return;

  /* Scroll shadow */
  window.addEventListener('scroll', function(){
    var nb=document.querySelector('.navbar');
    if(nb) nb.classList.toggle('scrolled', window.scrollY>20);
  });

  /* Mobile toggle */
  var toggle=document.querySelector('.nav-toggle');
  if (toggle) {
    toggle.addEventListener('click', function(){
      toggle.classList.toggle('open');
      nav.classList.toggle('open');
    });
  }
  document.querySelectorAll('.nav-links a').forEach(function(a){
    a.addEventListener('click',function(){
      nav.classList.remove('open');
      if(toggle) toggle.classList.remove('open');
    });
  });

  /* Active link */
  var page = location.pathname.split('/').pop()||'index.html';
  nav.querySelectorAll('a').forEach(function(a){
    if ((a.getAttribute('href')||'')=== page) a.classList.add('active');
  });

  /* User pill in nav */
  var userPill = document.getElementById('navUserPill');
  if (userPill) {
    if (session) {
      userPill.innerHTML =
        '<span style="display:flex;align-items:center;gap:.5rem">'
        + '<span style="background:linear-gradient(135deg,var(--blue),var(--cyan));color:var(--navy);padding:.25rem .7rem;border-radius:20px;font-size:.78rem;font-weight:700">'
        + (session.role==='admin'?'👑 Admin':'🎓 '+session.name)
        + '</span>'
        + '<button onclick="Auth.logout()" class="btn btn-ghost btn-sm" style="padding:.3rem .7rem;font-size:.78rem">Logout</button>'
        + '</span>';
    } else {
      userPill.innerHTML = '<a href="login.html" class="btn btn-primary btn-sm">Login</a>';
    }
  }
}

/* ── AI Match Score ───────────────────────────────────────────── */
function calcMatchScore(student, internship) {
  if (!student||!internship) return 0;
  function tokens(v){
    if(!v) return [];
    if(Array.isArray(v)) return v.map(function(s){return s.toLowerCase().trim();}).filter(Boolean);
    return String(v).split(',').map(function(s){return s.toLowerCase().trim();}).filter(Boolean);
  }
  var sSkills=tokens(student.technicalSkills), rSkills=tokens(internship.requiredSkills);
  var skillPts=0;
  if(rSkills.length&&sSkills.length){
    var hits=rSkills.filter(function(r){return sSkills.some(function(s){return s.indexOf(r)!==-1||r.indexOf(s)!==-1;});}).length;
    skillPts=Math.round((hits/rSkills.length)*40);
  } else if(sSkills.length) skillPts=20;

  var pd=(student.preferredDomain||'').toLowerCase(), id=(internship.domain||'').toLowerCase();
  var domPts=0;
  if(pd&&id){ if(pd===id) domPts=25; else if(pd.split(' ').some(function(w){return id.indexOf(w)!==-1;})) domPts=12; }

  var cgpa=parseFloat(student.cgpa)||0, minC=parseFloat(internship.minCgpa)||0;
  var cgpaPts=0;
  if(cgpa>=minC) cgpaPts=Math.min(20,15+Math.round((cgpa-minC)*2));
  else if(minC-cgpa<=0.5) cgpaPts=8;

  var ints=tokens(student.areasOfInterest), dw=id.split(/\s+/).filter(function(w){return w.length>2;});
  var intPts=0;
  if(ints.some(function(i){return dw.some(function(d){return i.indexOf(d)!==-1||d.indexOf(i)!==-1;});})) intPts+=10;
  var cw=tokens(student.certifications).join(' ').split(/\s+/);
  if(cw.some(function(c){return dw.some(function(d){return c.indexOf(d)!==-1||d.indexOf(c)!==-1;});})) intPts+=5;
  return Math.min(100, skillPts+domPts+cgpaPts+Math.min(15,intPts));
}

/* ── Seed internships ─────────────────────────────────────────── */
function seedInternships() {
  if (Store.get(KEYS.INTERNSHIPS).length>0) return;
  var list=[
    {title:'AI/ML Engineering Intern',company:'TechCorp Solutions',domain:'Artificial Intelligence',location:'Pune',duration:'3 months',stipend:'₹15,000/mo',stipendAmount:15000,requiredSkills:['Python','Machine Learning','TensorFlow','NumPy','Pandas'],minCgpa:'7.0',seats:5,description:'Work on cutting-edge ML models and deployment pipelines. Build and train deep learning models for real-world problems.',deadline:'2025-12-30',tags:['AI','Python','ML']},
    {title:'Full Stack Web Developer Intern',company:'InnovateTech Pvt Ltd',domain:'Web Development',location:'Mumbai',duration:'6 months',stipend:'₹12,000/mo',stipendAmount:12000,requiredSkills:['React','Node.js','MongoDB','JavaScript','CSS'],minCgpa:'6.5',seats:8,description:'Build responsive web applications using React and Node.js. Collaborate with teams to ship production features.',deadline:'2025-12-30',tags:['React','Node.js','Full Stack']},
    {title:'Data Science Intern',company:'DataInsights Pvt Ltd',domain:'Data Science',location:'Bangalore',duration:'4 months',stipend:'₹18,000/mo',stipendAmount:18000,requiredSkills:['Python','Pandas','SQL','Data Visualization','Statistics'],minCgpa:'7.5',seats:4,description:'Analyze large datasets and build predictive models. Create dashboards and reports for business decisions.',deadline:'2025-12-30',tags:['Data Science','Python','SQL']},
    {title:'Android App Developer Intern',company:'MobileFirst Studios',domain:'Mobile Development',location:'Hyderabad',duration:'3 months',stipend:'₹10,000/mo',stipendAmount:10000,requiredSkills:['Java','Kotlin','Android Studio','Firebase','REST API'],minCgpa:'6.0',seats:6,description:'Develop Android applications. Work with Kotlin and modern Android frameworks like Jetpack Compose.',deadline:'2025-12-30',tags:['Android','Kotlin','Mobile']},
    {title:'Cybersecurity Analyst Intern',company:'SecureNet Labs',domain:'Cybersecurity',location:'Delhi',duration:'3 months',stipend:'₹14,000/mo',stipendAmount:14000,requiredSkills:['Network Security','Linux','Python','Ethical Hacking','OWASP'],minCgpa:'7.0',seats:3,description:'Assist in vulnerability assessments and penetration testing. Learn real-world cybersecurity workflows.',deadline:'2025-12-30',tags:['Security','Linux','Networking']},
    {title:'Cloud Infrastructure Intern',company:'CloudScale Inc',domain:'Cloud Computing',location:'Pune',duration:'6 months',stipend:'₹20,000/mo',stipendAmount:20000,requiredSkills:['AWS','Docker','Kubernetes','Linux','Terraform'],minCgpa:'7.0',seats:4,description:'Deploy and manage cloud infrastructure on AWS. Work with containerization and CI/CD pipelines.',deadline:'2025-12-30',tags:['AWS','Docker','Cloud']},
    {title:'UI/UX Design Intern',company:'PixelCraft Design',domain:'UI/UX Design',location:'Bangalore',duration:'3 months',stipend:'₹10,000/mo',stipendAmount:10000,requiredSkills:['Figma','Adobe XD','HTML','CSS','User Research'],minCgpa:'6.0',seats:5,description:'Design user interfaces and conduct usability testing for web and mobile products.',deadline:'2025-12-30',tags:['Figma','Design','UX']},
    {title:'IoT Systems Intern',company:'SmartTech Industries',domain:'Internet of Things',location:'Chennai',duration:'4 months',stipend:'₹12,000/mo',stipendAmount:12000,requiredSkills:['Arduino','Raspberry Pi','Python','C++','Embedded Systems'],minCgpa:'6.5',seats:4,description:'Develop IoT prototypes and integrate sensors with cloud platforms for smart manufacturing.',deadline:'2025-12-30',tags:['IoT','Arduino','Embedded']},
    {title:'DevOps Engineer Intern',company:'Infra Solutions Ltd',domain:'DevOps',location:'Noida',duration:'6 months',stipend:'₹16,000/mo',stipendAmount:16000,requiredSkills:['Linux','Docker','Jenkins','Git','Bash'],minCgpa:'6.5',seats:3,description:'Build CI/CD pipelines, automate deployments, and manage Linux server infrastructure.',deadline:'2025-12-30',tags:['DevOps','Linux','Docker']},
    {title:'Data Analyst Intern',company:'BizAnalytics Corp',domain:'Data Science',location:'Mumbai',duration:'3 months',stipend:'₹12,000/mo',stipendAmount:12000,requiredSkills:['SQL','Excel','Python','Tableau','Statistics'],minCgpa:'6.0',seats:6,description:'Analyse sales and marketing data to provide actionable insights. Build automated dashboards.',deadline:'2025-12-30',tags:['SQL','Tableau','Analytics']}
  ];
  list.forEach(function(item){ item.id=genId(); });
  Store.set(KEYS.INTERNSHIPS, list);
}

/* ── Global init ──────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function() {
  seedDefaultAdmin();
  seedInternships();
  buildNav();
  document.querySelectorAll('.modal-overlay').forEach(function(m){
    m.addEventListener('click', function(e){ if(e.target===m) closeModal(m.id); });
  });
});