'use strict';

/* ================================================================
   AI INTERNSHIP ALLOCATION & RECOMMENDATION SYSTEM
   script.js — shared UI helpers only.

   IMPORTANT: this file must never redeclare `Auth` or `DataService`.
   Those live exclusively in api.js. This file only consumes
   window.Auth / window.DataService.
   ================================================================ */

/* ================================================================
   NAVBAR
================================================================ */
function updateNavbarUI() {
  var session   = window.Auth ? window.Auth.getSession() : null;
  var authLink  = document.getElementById('navAuthLink');
  var adminLink = document.getElementById('navAdmin');
  var userPill  = document.getElementById('navUserPill');

  if (adminLink) adminLink.style.display = (session && session.role === 'admin') ? '' : 'none';

  if (authLink) {
    authLink.innerHTML = !session
      ? '<a href="login.html" class="btn btn-primary btn-sm">Login / Register</a>'
      : '<a href="' + (session.role === 'admin' ? 'admin-dashboard.html' : 'student-dashboard.html') + '" class="btn btn-primary btn-sm">Dashboard</a>';
  }

  if (userPill) {
    userPill.innerHTML = !session ? '' :
      '<span class="badge ' + (session.role === 'admin' ? 'badge-violet' : 'badge-blue') + '">' +
      (session.role === 'admin' ? '👑 Admin' : '🎓 ' + escapeHtml(session.name || 'Student')) + '</span>' +
      '<button onclick="Auth.logout(); window.location.href=\'login.html\';" class="btn btn-ghost btn-sm" style="margin-left:.6rem">Logout</button>';
  }
}
window.addEventListener('auth-changed', updateNavbarUI);

function toggleNav() {
  var links = document.querySelector('.nav-links');
  if (links) links.classList.toggle('open');
}

/* ================================================================
   STRING / SAFETY HELPERS
================================================================ */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function debounce(fn, wait) {
  var t;
  return function () {
    var args = arguments, ctx = this;
    clearTimeout(t);
    t = setTimeout(function () { fn.apply(ctx, args); }, wait || 250);
  };
}

function formatDate(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch (e) { return '—'; }
}

/* ================================================================
   TOASTS
================================================================ */
function showToast(message, type) {
  var container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  var icons = { success: '✅', error: '⚠️', warning: '⏳', info: 'ℹ️' };
  var el = document.createElement('div');
  el.className = 'toast ' + (type || 'info');
  el.innerHTML = '<span>' + (icons[type] || icons.info) + '</span><span>' + escapeHtml(message) + '</span>';
  container.appendChild(el);
  setTimeout(function () {
    el.style.transition = 'opacity .3s';
    el.style.opacity = '0';
    setTimeout(function () { el.remove(); }, 300);
  }, 3800);
}

/* ================================================================
   MODALS
================================================================ */
function openModal(id) {
  var el = document.getElementById(id);
  if (el) el.classList.add('open');
}
function closeModal(id) {
  var el = document.getElementById(id);
  if (el) el.classList.remove('open');
}
document.addEventListener('click', function (e) {
  if (e.target.classList && e.target.classList.contains('modal-backdrop')) {
    e.target.classList.remove('open');
  }
});

/* ================================================================
   ANIMATED COUNTER
================================================================ */
function animateCount(el, target) {
  if (!el) return;
  target = parseInt(target) || 0;
  var current = 0;
  var step = Math.max(1, Math.ceil(target / 40));
  var timer = setInterval(function () {
    current = Math.min(current + step, target);
    el.textContent = current;
    if (current >= target) clearInterval(timer);
  }, 35);
}

/* ================================================================
   MATCH GAUGE (SVG ring) — signature visual used across pages
================================================================ */
function gaugeColor(score) {
  if (score >= 80) return 'var(--success)';
  if (score >= 60) return 'var(--cyan)';
  if (score >= 40) return 'var(--warning)';
  return 'var(--danger)';
}
function gaugeSVG(score, size, strokeWidth) {
  size = size || 92; strokeWidth = strokeWidth || 8;
  var r = (size - strokeWidth) / 2;
  var c = 2 * Math.PI * r;
  var offset = c - (Math.max(0, Math.min(100, score)) / 100) * c;
  var color = gaugeColor(score);
  return '' +
    '<div class="gauge" style="width:' + size + 'px;height:' + size + 'px">' +
      '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' +
        '<circle class="gauge-track" cx="' + size/2 + '" cy="' + size/2 + '" r="' + r + '" stroke-width="' + strokeWidth + '"></circle>' +
        '<circle class="gauge-fill" cx="' + size/2 + '" cy="' + size/2 + '" r="' + r + '" stroke-width="' + strokeWidth + '" stroke="' + color + '" stroke-dasharray="' + c + '" stroke-dashoffset="' + offset + '"></circle>' +
      '</svg>' +
      '<div class="gauge-label"><b>' + Math.round(score) + '%</b><span>match</span></div>' +
    '</div>';
}
function matchLabel(score) {
  if (score >= 80) return { text: 'Excellent Match', cls: 'badge-green' };
  if (score >= 60) return { text: 'Good Match', cls: 'badge-blue' };
  if (score >= 40) return { text: 'Fair Match', cls: 'badge-amber' };
  return { text: 'Low Match', cls: 'badge-red' };
}

/* ================================================================
   TAG INPUT WIDGET
   Usage: var tags = initTagsInput('wrapId', ['existing','tags']);
   tags.getValues() -> array, tags.setValues(arr)
================================================================ */
function initTagsInput(wrapId, initial) {
  var wrap = document.getElementById(wrapId);
  if (!wrap) return { getValues: function () { return []; }, setValues: function () {} };

  var values = (initial || []).slice();

  function render() {
    wrap.innerHTML = '';
    values.forEach(function (val, idx) {
      var pill = document.createElement('span');
      pill.className = 'pill';
      pill.innerHTML = escapeHtml(val) + ' <button type="button" data-idx="' + idx + '">×</button>';
      wrap.appendChild(pill);
    });
    var input = document.createElement('input');
    input.type = 'text';
    input.placeholder = values.length ? '' : 'Type and press Enter…';
    wrap.appendChild(input);
    input.focus();

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        var v = input.value.trim();
        if (v && !values.includes(v)) { values.push(v); render(); }
        else input.value = '';
      } else if (e.key === 'Backspace' && !input.value && values.length) {
        values.pop(); render();
      }
    });
    input.addEventListener('blur', function () {
      var v = input.value.trim();
      if (v && !values.includes(v)) { values.push(v); render(); }
    });

    wrap.querySelectorAll('button[data-idx]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        values.splice(parseInt(btn.dataset.idx), 1);
        render();
      });
    });
  }
  render();

  return {
    getValues: function () { return values.slice(); },
    setValues: function (arr) { values = (arr || []).slice(); render(); }
  };
}

/* ================================================================
   CSV EXPORT
================================================================ */
function downloadCSV(filename, rows) {
  if (!rows || !rows.length) { showToast('Nothing to export yet.', 'warning'); return; }
  var headers = Object.keys(rows[0]);
  var lines = [headers.join(',')];
  rows.forEach(function (row) {
    lines.push(headers.map(function (h) {
      var val = row[h] === undefined || row[h] === null ? '' : String(row[h]);
      if (val.indexOf(',') > -1 || val.indexOf('"') > -1 || val.indexOf('\n') > -1) {
        val = '"' + val.replace(/"/g, '""') + '"';
      }
      return val;
    }).join(','));
  });
  var blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

/* ================================================================
   GUARD HELPERS (page-level access control)
================================================================ */
function requireLogin(redirectTo) {
  if (!window.Auth || !Auth.isLoggedIn()) {
    window.location.href = 'login.html' + (redirectTo ? ('?next=' + encodeURIComponent(redirectTo)) : '');
    return false;
  }
  return true;
}
function requireAdmin() {
  if (!window.Auth || !Auth.isAdmin()) {
    var el = document.getElementById('accessDenied');
    var layout = document.getElementById('adminLayout');
    if (el) el.classList.remove('hidden');
    if (layout) layout.classList.add('hidden');
    return false;
  }
  return true;
}

/* ================================================================
   INIT — runs on every page that includes this script
================================================================ */
document.addEventListener('DOMContentLoaded', function () {
  updateNavbarUI();
  var toggle = document.querySelector('.nav-toggle');
  if (toggle) toggle.addEventListener('click', toggleNav);
});