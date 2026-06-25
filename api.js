'use strict';

/* =========================================================
   CONFIG
   ─────────────────────────────────────────────────────────
   HOW TO SET YOUR BACKEND URL (pick ONE method):

   Option A — Edit this file: replace the URL below with your
   deployed backend, e.g. https://my-app.onrender.com/api

   Option B — Add ONE line in your HTML BEFORE api.js loads:
   <script>window.BACKEND_URL = 'https://my-app.onrender.com/api';</script>

   ► If no backend is deployed yet, the site works in OFFLINE
     MODE — login/register use demo accounts, internships show
     from built-in seed data.
========================================================= */
/* ──────────────────────────────────────────────────────────────
   ► STEP 1: Paste your deployed backend URL here (Render/Railway)
   ► Example: 'https://capstone-backend.onrender.com/api'
   ► Leave empty '' to run in offline/demo mode
   ────────────────────────────────────────────────────────────── */
var _DEPLOYED_BACKEND = 'https://capstone-project-backend-m20u.onrender.com';   /* ← PASTE YOUR BACKEND URL HERE */

/* ──────────────────────────────────────────────────────────────
   API_BASE resolution order:
   1. window.BACKEND_URL  (set in HTML before api.js loads)
   2. _DEPLOYED_BACKEND   (set above)
   3. localhost:5001       (local development only)
   ────────────────────────────────────────────────────────────── */
function _getApiBase() {
  if (window.BACKEND_URL && window.BACKEND_URL.trim()) return window.BACKEND_URL.trim();
  if (_DEPLOYED_BACKEND  && _DEPLOYED_BACKEND.trim())  return _DEPLOYED_BACKEND.trim();
  return 'http://localhost:5001/api';
}
var API_BASE = _getApiBase();

/* OFFLINE_MODE = true only when no real backend URL is configured */
var OFFLINE_MODE = (
  !window.BACKEND_URL &&
  !_DEPLOYED_BACKEND  &&
  (API_BASE.includes('localhost') || API_BASE.includes('127.0.0.1'))
);

/* Re-read API_BASE dynamically in case window.BACKEND_URL is set after load */
function getApiBase() { return _getApiBase(); }

/* =========================================================
   DEMO / SEED DATA  — used when backend is not reachable
========================================================= */
var DEMO_INTERNSHIPS = [
  { id:'i1', _id:'i1', title:'AI/ML Engineer Intern', company:'TechCorp India',
    location:'Pune', domain:'Artificial Intelligence', duration:'3 months',
    stipend:'₹15,000/mo', stipendAmount:15000, minCgpa:7.0, seats:5,
    deadline:'2025-12-30', description:'Work on cutting-edge ML models and deployment pipelines.',
    requiredSkills:['Python','Machine Learning','TensorFlow','NumPy','Pandas'],
    tags:['AI','Python','ML'] },
  { id:'i2', _id:'i2', title:'Full Stack Web Developer Intern', company:'InnovateTech Pvt Ltd',
    location:'Mumbai', domain:'Web Development', duration:'6 months',
    stipend:'₹12,000/mo', stipendAmount:12000, minCgpa:6.5, seats:8,
    deadline:'2025-12-30', description:'Build responsive web applications using React and Node.js.',
    requiredSkills:['React','Node.js','MongoDB','JavaScript','CSS'],
    tags:['React','Node.js','Full Stack'] },
  { id:'i3', _id:'i3', title:'Data Science Intern', company:'Analytics Hub',
    location:'Bangalore', domain:'Data Science', duration:'3 months',
    stipend:'₹18,000/mo', stipendAmount:18000, minCgpa:7.5, seats:4,
    deadline:'2025-12-30', description:'Analyze large datasets and build predictive models.',
    requiredSkills:['Python','Pandas','SQL','Data Visualization','Statistics'],
    tags:['Data','Python','SQL'] },
  { id:'i4', _id:'i4', title:'Cybersecurity Intern', company:'SecureNet Solutions',
    location:'Hyderabad', domain:'Cybersecurity', duration:'4 months',
    stipend:'₹12,000/mo', stipendAmount:12000, minCgpa:7.0, seats:2,
    deadline:'2025-12-30', description:'Learn ethical hacking and network security.',
    requiredSkills:['Networking','Linux','Ethical Hacking','Python'],
    tags:['Security','Linux','Networking'] },
  { id:'i5', _id:'i5', title:'Mobile App Developer Intern', company:'AppWorks Studio',
    location:'Nagpur', domain:'Mobile Development', duration:'2 months',
    stipend:'₹8,000/mo', stipendAmount:8000, minCgpa:6.0, seats:3,
    deadline:'2025-12-30', description:'Build cross-platform mobile apps using Flutter.',
    requiredSkills:['Flutter','Dart','Firebase','UI Design'],
    tags:['Flutter','Mobile','Firebase'] },
  { id:'i6', _id:'i6', title:'Cloud Computing Intern', company:'CloudBase Technologies',
    location:'Chennai', domain:'Cloud Computing', duration:'3 months',
    stipend:'₹20,000/mo', stipendAmount:20000, minCgpa:7.0, seats:4,
    deadline:'2025-12-30', description:'Work with AWS services and containerized deployments.',
    requiredSkills:['AWS','Docker','Linux','Kubernetes'],
    tags:['AWS','Cloud','DevOps'] },
  { id:'i7', _id:'i7', title:'UI/UX Design Intern', company:'DesignFirst Agency',
    location:'Pune', domain:'UI/UX Design', duration:'2 months',
    stipend:'₹10,000/mo', stipendAmount:10000, minCgpa:6.0, seats:3,
    deadline:'2025-12-30', description:'Design user interfaces using Figma and conduct user research.',
    requiredSkills:['Figma','User Research','Wireframing','Prototyping'],
    tags:['Design','Figma','UX'] },
  { id:'i8', _id:'i8', title:'IoT Developer Intern', company:'SmartSys Labs',
    location:'Bangalore', domain:'Internet of Things', duration:'3 months',
    stipend:'₹11,000/mo', stipendAmount:11000, minCgpa:6.5, seats:3,
    deadline:'2025-12-30', description:'Build IoT solutions using Raspberry Pi and Arduino.',
    requiredSkills:['Python','C++','Arduino','Raspberry Pi','MQTT'],
    tags:['IoT','Embedded','Python'] }
];

var DEMO_USERS = [
  { id:'admin001', _id:'admin001', email:'admin@aiias.edu', password:'Admin@1234',
    name:'Admin', role:'admin' }
];

/* offline "database" stored in sessionStorage per-tab */
var _offlineApps = [];

/* =========================================================
   TOKEN STORE — JWT in sessionStorage
========================================================= */
var TokenStore = {
  _key: 'aiias_token',
  get:   function() { return sessionStorage.getItem(this._key) || null; },
  set:   function(t){ if (t) sessionStorage.setItem(this._key, t); },
  clear: function() { sessionStorage.removeItem(this._key); }
};

/* =========================================================
   OFFLINE STUDENT STORE — sessionStorage, tab-only
========================================================= */
var OfflineStudents = {
  _key: 'aiias_offline_students',
  getAll:  function() { try { return JSON.parse(sessionStorage.getItem(this._key)) || []; } catch(e){ return []; } },
  save:    function(arr) { sessionStorage.setItem(this._key, JSON.stringify(arr)); },
  getOne:  function(id)  {
    return this.getAll().find(function(s){ return s.id===id||s._id===id; }) || null;
  },
  upsert:  function(s) {
    var all = this.getAll();
    var idx = all.findIndex(function(x){ return x.id===s.id||x._id===s._id; });
    if (idx >= 0) all[idx] = s; else all.push(s);
    this.save(all);
    return s;
  },
  remove:  function(id) {
    this.save(this.getAll().filter(function(s){ return s.id!==id&&s._id!==id; }));
  }
};

var OfflineApps = {
  _key: 'aiias_offline_apps',
  getAll:      function()   { try { return JSON.parse(sessionStorage.getItem(this._key))||[]; } catch(e){ return []; } },
  save:        function(arr){ sessionStorage.setItem(this._key, JSON.stringify(arr)); },
  getByStudent:function(sid){ return this.getAll().filter(function(a){ return String(a.studentId)===String(sid); }); },
  push:        function(app){ var all=this.getAll(); all.push(app); this.save(all); return app; },
  update:      function(id,patch){
    var all=this.getAll();
    var idx=all.findIndex(function(a){ return a.id===id||a._id===id; });
    if(idx>=0){ all[idx]=Object.assign(all[idx],patch); this.save(all); return all[idx]; }
  }
};

/* =========================================================
   BACKEND HEALTH CHECK
========================================================= */
async function isBackendOnline() {
  /* Re-check OFFLINE_MODE each time in case window.BACKEND_URL was set after load */
  var base = getApiBase();
  var offlineNow = !window.BACKEND_URL && !_DEPLOYED_BACKEND &&
    (base.includes('localhost') || base.includes('127.0.0.1'));
  if (offlineNow) return false;
  try {
    var ctrl  = new AbortController();
    var timer = setTimeout(function(){ ctrl.abort(); }, 3000);
    var res   = await fetch(getApiBase().replace('/api','') + '/health', {
      method:'GET', signal:ctrl.signal
    });
    clearTimeout(timer);
    return res.ok;
  } catch(e) {
    return false;
  }
}

/* =========================================================
   GENERIC API REQUEST
========================================================= */
async function apiRequest(endpoint, method, data, requiresAuth) {
  method       = method       || 'GET';
  requiresAuth = requiresAuth !== false;

  var isFormData = (typeof FormData !== 'undefined' && data instanceof FormData);
  var headers    = {};

  if (!isFormData) headers['Content-Type'] = 'application/json';
  if (requiresAuth) {
    var token = TokenStore.get();
    if (token) headers['Authorization'] = 'Bearer ' + token;
  }

  var res    = await fetch(getApiBase() + endpoint, {
    method:  method,
    headers: headers,
    body:    isFormData ? data : (data ? JSON.stringify(data) : null)
  });
  var result = await res.json();
  if (!res.ok) throw new Error(result.msg || result.message || result.error || 'Server error ' + res.status);
  return result;
}

/* =========================================================
   AUTH APIs
========================================================= */
var AuthAPI = {
  adminLogin: function(email, password) {
    return apiRequest('/auth/login', 'POST', { email:email, password:password }, false);
  },
  studentLogin: function(email, password) {
    return apiRequest('/auth/student/login', 'POST', { email:email, password:password }, false);
  }
};

var AdminAPI = {
  login:        function(e,p){ return AuthAPI.adminLogin(e,p);   },
  studentLogin: function(e,p){ return AuthAPI.studentLogin(e,p); }
};

/* =========================================================
   STUDENTS API
========================================================= */
var StudentsAPI = {
  register: function(data){ return apiRequest('/students/register','POST',data,false); },
  getAll:   function()    { return apiRequest('/students','GET',null,true);            },
  getOne:   function(id)  { return apiRequest('/students/'+id,'GET',null,true);        },
  create:   function(data){
    var ep = (data instanceof FormData) ? '/students/upload' : '/students';
    return apiRequest(ep,'POST',data,true);
  },
  update:   function(id,data){
    var ep = (data instanceof FormData) ? '/students/'+id+'/upload' : '/students/'+id;
    return apiRequest(ep,'PUT',data,true);
  },
  remove:   function(id){ return apiRequest('/students/'+id,'DELETE',null,true); }
};

/* =========================================================
   INTERNSHIPS API
========================================================= */
var InternshipsAPI = {
  getAll:  function()    { return apiRequest('/internships','GET',null,false);       },
  getOne:  function(id)  { return apiRequest('/internships/'+id,'GET',null,false);  },
  create:  function(data){ return apiRequest('/internships','POST',data,true);       },
  update:  function(id,d){ return apiRequest('/internships/'+id,'PUT',d,true);      },
  remove:  function(id)  { return apiRequest('/internships/'+id,'DELETE',null,true);}
};

/* =========================================================
   APPLICATIONS API
========================================================= */
var ApplicationsAPI = {
  getAll:        function()     { return apiRequest('/applications','GET',null,true);                             },
  getByStudent:  function(sid)  { return apiRequest('/applications/student/'+sid,'GET',null,true);               },
  create:        function(data) { return apiRequest('/applications','POST',data,true);                           },
  updateStatus:  function(id,s,n){ return apiRequest('/applications/'+id+'/status','PUT',{status:s,notes:n},true);}
};

/* =========================================================
   NOTIFICATIONS API
========================================================= */
var NotificationsAPI = {
  send: async function(data) {
    try { return await apiRequest('/notifications/send','POST',data,true); }
    catch(e){ console.warn('Notification non-critical:',e.message); }
  }
};

/* =========================================================
   DATA SERVICE — tries backend first, falls back to offline
========================================================= */
var DataService = {

  getStudents: async function() {
    var bc = !!(window.BACKEND_URL || _DEPLOYED_BACKEND);
    if (bc) {
      try {
        var res = await StudentsAPI.getAll();
        var list = normalizeList(Array.isArray(res) ? res : (res.data||res.students||[]));
        list.forEach(function(s){ OfflineStudents.upsert(s); });
        return list;
      } catch(e){ console.warn('getStudents backend failed:', e.message); }
    }
    return normalizeList(OfflineStudents.getAll());
  },

  getStudent: async function(id) {
    var bc = !!(window.BACKEND_URL || _DEPLOYED_BACKEND);
    var isOffId = id && (String(id).startsWith('offline_')||String(id).startsWith('stu_')||String(id).startsWith('tmp_'));
    if (bc && !isOffId) {
      try {
        var res = await StudentsAPI.getOne(id);
        var s = normalize(res.data||res.student||res);
        OfflineStudents.upsert(s);
        return s;
      } catch(e){ console.warn('getStudent backend failed:', e.message); }
    }
    return normalize(OfflineStudents.getOne(id));
  },

  createStudent: async function(data) {
    var backendConfigured = !!(window.BACKEND_URL || _DEPLOYED_BACKEND);
    if (backendConfigured) {
      try {
        var res   = await StudentsAPI.create(data);
        var saved = normalize(res.data||res.student||res);
        OfflineStudents.upsert(saved);
        return saved;
      } catch(e) {
        showToast('⚠️ Backend error: '+e.message+' — saved locally for this session.','warning');
      }
    }
    /* Offline fallback — session-only storage with offline_ prefix so we know it's not real */
    var isForm = (typeof FormData!=='undefined' && data instanceof FormData);
    var plain  = isForm ? {} : (data||{});
    if (isForm) { for(var p of data.entries()){ if(p[0]!=='resume') plain[p[0]]=p[1]; } }
    var tempId = 'offline_'+Date.now();
    var s = Object.assign({ id:tempId, _id:tempId, createdAt:new Date().toISOString() }, plain);
    return normalize(OfflineStudents.upsert(s));
  },

  updateStudent: async function(id, data) {
    var isOfflineId = id && (String(id).startsWith('stu_') || String(id).startsWith('tmp_'));
    var currentBase = getApiBase();
    var backendConfigured = !!(window.BACKEND_URL || _DEPLOYED_BACKEND);

    if (backendConfigured) {
      /* If this student has an offline-generated ID, create them instead of updating */
      if (isOfflineId) {
        try {
          var isForm2 = (typeof FormData !== 'undefined' && data instanceof FormData);
          var plain2  = isForm2 ? {} : Object.assign({}, data);
          if (isForm2) { for (var p2 of data.entries()) { if (p2[0]!=='resume') plain2[p2[0]]=p2[1]; } }
          /* Remove the fake id so MongoDB generates a real one */
          delete plain2.id; delete plain2._id;
          var res2   = await StudentsAPI.create(data);
          var saved2 = normalize(res2.data||res2.student||res2);
          OfflineStudents.upsert(saved2);
          showToast('✅ ' + (saved2.fullName||'Student') + ' saved to database!', 'success');
          return saved2;
        } catch(e2) {
          showToast('⚠️ Could not save to database: ' + e2.message, 'warning');
          var isForm3 = (typeof FormData !== 'undefined' && data instanceof FormData);
          var plain3  = isForm3 ? {} : Object.assign({}, data);
          if (isForm3) { for (var p3 of data.entries()) { if (p3[0]!=='resume') plain3[p3[0]]=p3[1]; } }
          return normalize(OfflineStudents.upsert(Object.assign(OfflineStudents.getOne(id)||{id:id,_id:id}, plain3)));
        }
      }
      /* Normal update with real MongoDB _id */
      try {
        var res   = await StudentsAPI.update(id, data);
        var saved = normalize(res.data||res.student||res);
        OfflineStudents.upsert(saved);
        return saved;
      } catch(e) {
        /* 404 means student not in DB — try creating */
        if (e.message && (e.message.includes('404') || e.message.includes('not found'))) {
          try {
            var resC  = await StudentsAPI.create(data);
            var saveC = normalize(resC.data||resC.student||resC);
            OfflineStudents.upsert(saveC);
            showToast('✅ ' + (saveC.fullName||'Student') + ' saved to database!', 'success');
            return saveC;
          } catch(ec) {
            showToast('⚠️ Could not save to database: ' + ec.message, 'warning');
          }
        } else {
          showToast('⚠️ Backend error: ' + e.message, 'warning');
        }
      }
    }
    /* Offline fallback */
    var isForm = (typeof FormData !== 'undefined' && data instanceof FormData);
    var plain  = isForm ? {} : (data||{});
    if (isForm) { for (var p of data.entries()) { if (p[0]!=='resume') plain[p[0]]=p[1]; } }
    var existing = OfflineStudents.getOne(id) || { id:id, _id:id };
    return normalize(OfflineStudents.upsert(Object.assign(existing, plain)));
  },

  deleteStudent: async function(id) {
    var backendConfigured = !!(window.BACKEND_URL || _DEPLOYED_BACKEND);
    var isOfflineId = id && (String(id).startsWith('offline_') || String(id).startsWith('tmp_') || String(id).startsWith('stu_'));
    if (backendConfigured && !isOfflineId) {
      try { return await StudentsAPI.remove(id); } catch(e) {
        showToast('⚠️ Could not delete from database: '+e.message,'warning');
      }
    }
    OfflineStudents.remove(id);
  },

  getInternships: async function() {
    var bc = !!(window.BACKEND_URL || _DEPLOYED_BACKEND);
    if (bc) {
      try {
        var res = await InternshipsAPI.getAll();
        return normalizeList(Array.isArray(res) ? res : (res.data||res.internships||[]));
      } catch(e){ console.warn('getInternships backend failed, using seed data:', e.message); }
    }
    return normalizeList(DEMO_INTERNSHIPS);
  },

  getApplications: async function(studentId) {
    var bc = !!(window.BACKEND_URL || _DEPLOYED_BACKEND);
    if (bc) {
      try {
        var res = studentId
          ? await ApplicationsAPI.getByStudent(studentId)
          : await ApplicationsAPI.getAll();
        return normalizeList(Array.isArray(res) ? res : (res.data||res.applications||[]));
      } catch(e){ console.warn('getApplications backend failed:', e.message); }
    }
    return normalizeList(studentId ? OfflineApps.getByStudent(studentId) : OfflineApps.getAll());
  },

  createApplication: async function(data) {
    var bc = !!(window.BACKEND_URL || _DEPLOYED_BACKEND);
    if (bc) {
      try {
        var res   = await ApplicationsAPI.create(data);
        var saved = normalize(res.data||res.application||res);
        OfflineApps.push(saved);
        return saved;
      } catch(e){
        showToast('⚠️ Backend error: '+e.message+' — application saved for this session.','warning');
      }
    }
    var app = Object.assign({ id:'app_'+Date.now(), _id:'app_'+Date.now(), createdAt:new Date().toISOString() }, data);
    return normalize(OfflineApps.push(app));
  }
};

/* =========================================================
   HELPERS
========================================================= */
function normalize(item) {
  if (!item) return item;
  var c = Object.assign({}, item);
  if (!c.id  && c._id) c.id  = String(c._id);
  if (!c._id && c.id)  c._id = String(c.id);
  return c;
}
function normalizeList(arr) { return (arr||[]).map(normalize); }
function getSid(s)  { return s ? String(s._id||s.id||'') : ''; }
function genId()    { return 'tmp_'+Date.now()+'_'+Math.random().toString(36).slice(2,7); }

/* legacy wrappers */
async function getStudents()        { return StudentsAPI.getAll();      }
async function updateStudent(id,d)  { return StudentsAPI.update(id,d);  }
async function getInternships()     { return InternshipsAPI.getAll();   }
async function addInternship(d)     { return InternshipsAPI.create(d);  }
async function applyInternship(d)   { return ApplicationsAPI.create(d); }
