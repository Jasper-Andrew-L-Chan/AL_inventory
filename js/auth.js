/**
 * AffordaLabs Auth System (client)
 *
 * All user accounts live in the CENTRAL database and are verified on the
 * server (/api/login, /api/users). This file only keeps:
 *   - the signed-in session on this device (so a refresh does not log you out)
 *   - a read-only cache of the account list (no passwords, ever) for the Staff page
 */

const AUTH_KEY = 'al_auth_session';
const USERS_CACHE_KEY = 'al_cache_users';

const ALL_PERMISSIONS = ['home', 'dashboard', 'transactions', 'reports', 'inventory', 'staff', 'cashdrawer', 'settings'];

const ROLE_PERMISSIONS_PRESETS = {
  'Owner / Administrator': ['home', 'dashboard', 'transactions', 'reports', 'inventory', 'staff', 'cashdrawer', 'settings'],
  'Pharmacist-in-Charge': ['home', 'dashboard', 'transactions', 'reports', 'inventory', 'staff', 'cashdrawer', 'settings'],
  'Staff Pharmacist': ['home', 'dashboard', 'transactions', 'reports', 'inventory', 'cashdrawer'],
  'Pharmacy Assistant': ['home', 'transactions', 'inventory', 'cashdrawer'],
  'Cashier': ['home', 'transactions', 'cashdrawer'],
  'Inventory Specialist': ['home', 'inventory', 'reports']
};

/**
 * Call the central API. Adds the bearer token, turns failures into Errors with
 * readable messages, and signs the user out if the server says the session is invalid.
 */
async function alApi(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const session = authStore.getSession();
  if (auth && session && session.token) headers['Authorization'] = 'Bearer ' + session.token;

  let res;
  try {
    res = await fetch(path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: 'no-store'
    });
  } catch (e) {
    const err = new Error('Cannot reach the server. Please check your internet connection.');
    err.network = true;
    throw err;
  }

  let data = null;
  try { data = await res.json(); } catch (e) { /* non-JSON response */ }

  if (!res.ok) {
    const err = new Error((data && data.error) || ('Server error (' + res.status + ')'));
    err.status = res.status;
    if (res.status === 401 && auth) authStore._handleUnauthorized(err.message);
    throw err;
  }
  return data;
}
window.alApi = alApi;

const authStore = {
  _loginUsers: [],

  init() { /* nothing to seed locally – accounts come from the central database */ },

  // ── Permission presets (UI helpers) ───────────────────────────────────────
  getDefaultPermissionsForRole(role = '', level = 'Staff') {
    if (level === 'Owner' || level === 'Admin' || (role || '').toLowerCase().includes('owner') || (role || '').toLowerCase().includes('admin')) {
      return [...ALL_PERMISSIONS];
    }
    for (const [rName, perms] of Object.entries(ROLE_PERMISSIONS_PRESETS)) {
      if ((role || '').toLowerCase().includes(rName.toLowerCase())) {
        return [...perms];
      }
    }
    return ['home', 'transactions', 'cashdrawer'];
  },

  getAllPermissionsList() {
    return [
      { id: 'home', label: 'Home (Onboarding Hub & Daily Overview)', icon: 'house' },
      { id: 'dashboard', label: 'Dashboard (Live Sales KPIs & Chart)', icon: 'layout-dashboard' },
      { id: 'transactions', label: 'In - Out (Customer Sales & Movements)', icon: 'arrow-left-right' },
      { id: 'inventory', label: 'Inventory (Medicines & Stock Batches)', icon: 'package' },
      { id: 'reports', label: 'Reports (COGS, Rx & BIR Tax Books)', icon: 'bar-chart-3' },
      { id: 'cashdrawer', label: 'Cash Drawer (Reconciliation & Z-Reading)', icon: 'banknote' },
      { id: 'staff', label: 'Staff (Manage Accounts & Access Control)', icon: 'users' },
      { id: 'settings', label: 'Settings (Pharmacy & BIR Config)', icon: 'settings' }
    ];
  },

  // ── Account list (cache of the central database; never contains passwords) ─
  getUsers() {
    try { return JSON.parse(localStorage.getItem(USERS_CACHE_KEY) || '[]'); } catch (e) { return []; }
  },

  getUserById(id) {
    return this.getUsers().find(u => u.id === id);
  },

  _setUsers(users) {
    if (!Array.isArray(users)) return false;
    const next = JSON.stringify(users);
    if (next === localStorage.getItem(USERS_CACHE_KEY)) return false;
    localStorage.setItem(USERS_CACHE_KEY, next);
    window.dispatchEvent(new CustomEvent('pharmacy:users-updated'));
    return true;
  },

  /** Called by the store after every sync with the latest accounts + the signed-in user's record. */
  syncUsersFromRemote(remoteUsers, me) {
    const changed = this._setUsers(remoteUsers);
    if (me) this._refreshSession(me);
    return changed;
  },

  /** Keep this device's session in step with role/permission changes made by an admin on another PC. */
  _refreshSession(me) {
    const s = this.getSession();
    if (!s || s.userId !== me.id) return;
    const fields = ['fullName', 'firstName', 'initials', 'role', 'level', 'permissions', 'prcLicense', 'phone', 'mustChange'];
    const refreshed = { ...s };
    fields.forEach(f => { refreshed[f] = me[f]; });
    refreshed.level = me.level || 'Staff';
    if (JSON.stringify(refreshed) !== JSON.stringify(s)) {
      localStorage.setItem(AUTH_KEY, JSON.stringify(refreshed));
      window.dispatchEvent(new CustomEvent('pharmacy:auth-changed', { detail: refreshed }));
    }
  },

  async addUser(userData) {
    const res = await alApi('/api/users', { method: 'POST', body: { action: 'create', user: userData } });
    this._setUsers(res.users);
    return res.user;
  },

  async updateUser(id, updates) {
    const res = await alApi('/api/users', { method: 'POST', body: { action: 'update', id, updates } });
    this._setUsers(res.users);
    if (res.user) this._refreshSession(res.user);
    return res.user;
  },

  async deleteUser(id) {
    const res = await alApi('/api/users', { method: 'POST', body: { action: 'delete', id } });
    this._setUsers(res.users);
    return true;
  },

  async changePassword(userId, currentPassword, newPassword) {
    const res = await alApi('/api/users', { method: 'POST', body: { action: 'password', currentPassword, newPassword } });
    if (res.user) this._refreshSession(res.user);
    return true;
  },

  // ── Permissions (based on the live session, refreshed on every sync) ──────
  hasPermission(viewName) {
    const session = this.getSession();
    if (!session) return false;

    const lvl = (session.level || '').toLowerCase();
    const role = (session.role || '').toLowerCase();
    if (lvl === 'owner' || lvl === 'admin' || role.includes('owner') || role.includes('admin') || session.username === 'admin') {
      return true;
    }
    if (Array.isArray(session.permissions)) {
      return session.permissions.includes(viewName);
    }
    return true; // fallback
  },

  isOwnerOrAdmin() {
    const session = this.getSession();
    if (!session) return false;
    const lvl = (session.level || '').toLowerCase();
    const role = (session.role || '').toLowerCase();
    return lvl === 'owner' || lvl === 'admin' || role.includes('owner') || role.includes('admin') || session.username === 'admin';
  },

  // ── Login page: usernames only, for the "pick your name" pills ───────────
  getLoginUsers() {
    return this._loginUsers;
  },

  async refreshLoginUsers() {
    try {
      const data = await alApi('/api/login', { auth: false });
      this._loginUsers = (data && data.users) || [];
    } catch (e) {
      // keep whatever we had
    }
    return this._loginUsers;
  },

  // ── Session ───────────────────────────────────────────────────────────────
  /** Verify credentials on the server. Resolves with the session, rejects with a readable Error. */
  async login(username, password) {
    const data = await alApi('/api/login', {
      method: 'POST',
      body: { username: String(username || '').trim(), password },
      auth: false
    });
    const u = data.user;
    const session = {
      token: data.token,
      userId: u.id,
      username: u.username,
      fullName: u.fullName,
      firstName: u.firstName,
      initials: u.initials,
      role: u.role,
      level: u.level || 'Staff',
      permissions: u.permissions || this.getDefaultPermissionsForRole(u.role, u.level),
      prcLicense: u.prcLicense,
      phone: u.phone,
      mustChange: !!u.mustChange,
      loginTime: new Date().toISOString()
    };
    localStorage.setItem(AUTH_KEY, JSON.stringify(session));
    window.dispatchEvent(new CustomEvent('pharmacy:auth-changed', { detail: session }));
    return session;
  },

  /** Log out and wipe this device's cached copy of the shared data. */
  logout() {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(USERS_CACHE_KEY);
    if (window.pharmacyStore) {
      window.pharmacyStore.stopSync();
      window.pharmacyStore.resetCache();
    }
    window.dispatchEvent(new CustomEvent('pharmacy:auth-changed', { detail: null }));
  },

  /** Server rejected our token (expired, or the account was disabled/deleted). */
  _handleUnauthorized(message) {
    if (!this.getSession()) return;
    this.logout();
    if (typeof window.renderLoginPage === 'function') {
      window.renderLoginPage();
      const err = document.getElementById('loginError');
      const msg = document.getElementById('loginErrorMsg');
      if (err && msg) {
        msg.textContent = message || 'Your session has ended. Please sign in again.';
        err.style.display = 'flex';
      }
    }
  },

  getSession() {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },

  /** True only if a session issued by the central server exists. */
  isLoggedIn() {
    const s = this.getSession();
    return !!(s && s.token);
  },

  get(field) {
    const s = this.getSession();
    return s ? s[field] : null;
  }
};

window.authStore = authStore;
