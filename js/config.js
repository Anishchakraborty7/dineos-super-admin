/**
 * DineOS Super Admin — Shared Config + Utilities v2
 */

const CONFIG = {
  // Auto-detects: uses production URL in production, localhost in local dev
  API_BASE: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : 'https://dineos-api.onrender.com',
  TOKEN_KEY: 'dineos_super_admin_token',
  ADMIN_KEY: 'dineos_super_admin_info',
};

// ============================================================
// API Helper
// ============================================================
const api = {
  _getToken() { return localStorage.getItem(CONFIG.TOKEN_KEY); },

  _headers(extra = {}) {
    const token = this._getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extra
    };
  },

  async request(method, path, body = null) {
    const opts = { method, headers: this._headers() };
    if (body) opts.body = JSON.stringify(body);
    try {
      const res = await fetch(`${CONFIG.API_BASE}${path}`, opts);
      const data = await res.json();
      if (res.status === 401 && !path.includes('/login')) { auth.logout(); return null; }
      if (!res.ok) throw new ApiError(data.error || 'Request failed', res.status, data);
      return data;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError('Network error. Is the server running?', 0);
    }
  },

  get(path)         { return this.request('GET', path); },
  post(path, body)  { return this.request('POST', path, body); },
  patch(path, body) { return this.request('PATCH', path, body); },
  del(path)         { return this.request('DELETE', path); },
};

class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message); this.status = status; this.data = data;
  }
}

// ============================================================
// Auth Helper
// ============================================================
const auth = {
  getToken()  { return localStorage.getItem(CONFIG.TOKEN_KEY); },
  getAdmin()  { const d = localStorage.getItem(CONFIG.ADMIN_KEY); return d ? JSON.parse(d) : null; },

  setSession(token, admin) {
    localStorage.setItem(CONFIG.TOKEN_KEY, token);
    localStorage.setItem(CONFIG.ADMIN_KEY, JSON.stringify(admin));
  },

  logout() {
    localStorage.removeItem(CONFIG.TOKEN_KEY);
    localStorage.removeItem(CONFIG.ADMIN_KEY);
    window.location.href = 'index.html';
  },

  requireAuth() {
    if (!this.getToken()) { window.location.href = 'index.html'; return null; }
    return this.getAdmin();
  }
};

// ============================================================
// Toast Notifications
// ============================================================
const toast = {
  _container: null,
  _getContainer() {
    if (!this._container) {
      this._container = document.createElement('div');
      this._container.id = 'toast-container';
      document.body.appendChild(this._container);
    }
    return this._container;
  },
  show(message, type = 'info', duration = 4000) {
    const icons = { success: '✅', error: '❌', info: '💡', warning: '⚠️' };
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.innerHTML = `<span class="toast-icon">${icons[type] || '💡'}</span><span class="toast-msg">${message}</span><span class="toast-close" onclick="this.parentElement.remove()">✕</span>`;
    this._getContainer().appendChild(t);
    setTimeout(() => t.classList.add('toast-show'), 10);
    setTimeout(() => { t.classList.remove('toast-show'); setTimeout(() => t.remove(), 300); }, duration);
  },
  success(msg, d) { this.show(msg, 'success', d); },
  error(msg, d)   { this.show(msg, 'error', d || 6000); },
  info(msg, d)    { this.show(msg, 'info', d); },
  warning(msg, d) { this.show(msg, 'warning', d); },
};

// ============================================================
// Utilities
// ============================================================
const utils = {
  formatDate(dateStr, opts = {}) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', ...opts });
  },
  formatDateTime(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  },
  timeAgo(dateStr) {
    if (!dateStr) return '—';
    const seconds = Math.floor((new Date() - new Date(dateStr)) / 1000);
    for (const [secs, unit] of [[31536000,'year'],[2592000,'month'],[86400,'day'],[3600,'hour'],[60,'minute']]) {
      const n = Math.floor(seconds / secs);
      if (n >= 1) return `${n} ${unit}${n > 1 ? 's' : ''} ago`;
    }
    return 'Just now';
  },
  initials(name = '') {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2) || 'SA';
  },
  planBadge(plan) {
    const map = { basic: 'badge-basic', pro: 'badge-pro', enterprise: 'badge-enterprise' };
    return `<span class="badge ${map[plan] || 'badge-basic'}">${capitalize(plan || 'basic')}</span>`;
  },
  statusBadge(isActive) {
    return isActive
      ? `<span class="badge badge-active">Active</span>`
      : `<span class="badge badge-inactive">Inactive</span>`;
  },
  subStatusBadge(status) {
    const map = { active: 'badge-active', trial: 'badge-trial', expired: 'badge-inactive', cancelled: 'badge-inactive' };
    return `<span class="badge ${map[status] || 'badge-basic'}">${capitalize(status || 'unknown')}</span>`;
  },
  debounce(fn, ms = 300) {
    let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  },
  async copyToClipboard(text, btn = null) {
    try {
      await navigator.clipboard.writeText(text);
      if (btn) { const o = btn.innerHTML; btn.innerHTML = '✓ Copied!'; btn.classList.add('copied'); setTimeout(() => { btn.innerHTML = o; btn.classList.remove('copied'); }, 2000); }
      return true;
    } catch { return false; }
  },
  formatCurrency(amount) {
    return '₹' + parseFloat(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 });
  },
  avatarColor(str = '') {
    const colors = ['#6366f1','#8b5cf6','#ec4899','#06b6d4','#10b981','#f59e0b','#ef4444'];
    let hash = 0;
    for (const c of str) hash = c.charCodeAt(0) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  },
};

function capitalize(str) { return str ? str.charAt(0).toUpperCase() + str.slice(1) : ''; }

// ============================================================
// Sidebar active link + admin info population
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;
  document.querySelectorAll('.nav-item[href]').forEach(item => {
    const href = item.getAttribute('href');
    if (href && path.includes(href.replace('.html', ''))) item.classList.add('active');
  });

  const admin = auth.getAdmin();
  if (admin) {
    const nameEl = document.getElementById('sidebarUserName');
    const avatarEl = document.getElementById('sidebarUserAvatar');
    if (nameEl) nameEl.textContent = admin.name || 'Admin';
    if (avatarEl) { avatarEl.textContent = utils.initials(admin.name); avatarEl.style.background = utils.avatarColor(admin.name); }
  }

  document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Sign out of DineOS?')) auth.logout();
  });
});
