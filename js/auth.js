/**
 * AffordaLabs Auth System
 * Manages user accounts, sessions, and authentication state.
 * Sessions persist in localStorage until explicit logout.
 */

const AUTH_KEY = 'al_auth_session';
const USERS_KEY = 'al_auth_users';

// ── Default user accounts ────────────────────────────────────────────────────
const DEFAULT_USERS = [
  {
    id: 'usr-001',
    username: 'andrew',
    password: 'andrew123',
    fullName: 'Andrew Chan, RPh',
    firstName: 'Andrew',
    initials: 'AC',
    role: 'Licensed Pharmacist',
    prcLicense: 'PRC-0123456',
    avatar: null
  },
  {
    id: 'usr-002',
    username: 'lionel',
    password: 'lionel123',
    fullName: 'Lionel Santos, RPh',
    firstName: 'Lionel',
    initials: 'LS',
    role: 'Licensed Pharmacist',
    prcLicense: 'PRC-7891011',
    avatar: null
  },
  {
    id: 'usr-003',
    username: 'sarah',
    password: 'sarah123',
    fullName: 'Sarah Dela Cruz',
    firstName: 'Sarah',
    initials: 'SD',
    role: 'Pharmacy Assistant',
    prcLicense: 'TESDA NC-III',
    avatar: null
  },
  {
    id: 'usr-004',
    username: 'mark',
    password: 'mark123',
    fullName: 'Mark Ramos',
    firstName: 'Mark',
    initials: 'MR',
    role: 'Inventory Specialist',
    prcLicense: 'INV-REG-2024',
    avatar: null
  },
  {
    id: 'usr-005',
    username: 'admin',
    password: 'admin123',
    fullName: 'System Administrator',
    firstName: 'Admin',
    initials: 'SA',
    role: 'System Administrator',
    prcLicense: 'N/A',
    avatar: null
  }
];

// ── Auth Store ────────────────────────────────────────────────────────────────
const authStore = {

  /** Initialise – seed users if first run */
  init() {
    const existing = localStorage.getItem(USERS_KEY);
    if (!existing) {
      localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS));
    } else {
      // Merge in any new default users without overwriting custom ones
      try {
        const parsed = JSON.parse(existing);
        let updated = false;
        DEFAULT_USERS.forEach(defUser => {
          if (!parsed.some(u => u.username.toLowerCase() === defUser.username.toLowerCase())) {
            parsed.push(defUser);
            updated = true;
          }
        });
        if (updated) {
          localStorage.setItem(USERS_KEY, JSON.stringify(parsed));
        }
      } catch (err) {
        localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS));
      }
    }
  },

  /** Return all registered users */
  getUsers() {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  },

  /** Add or register a new user */
  addUser(userData) {
    const users = this.getUsers();
    if (users.some(u => u.username.toLowerCase() === userData.username.toLowerCase().trim())) {
      throw new Error('Username already exists');
    }
    const newUser = {
      id: `usr-${Date.now()}`,
      username: userData.username.trim(),
      password: userData.password,
      fullName: userData.fullName.trim(),
      firstName: userData.firstName || userData.fullName.split(' ')[0],
      initials: userData.initials || (userData.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()),
      role: userData.role || 'Staff',
      prcLicense: userData.prcLicense || 'N/A',
      avatar: null
    };
    users.push(newUser);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    return newUser;
  },

  /** Attempt login. Returns the user session on success, null on failure. */
  login(username, password) {
    const users = this.getUsers();
    const user = users.find(
      u => u.username.toLowerCase() === username.toLowerCase().trim()
        && u.password === password
    );
    if (!user) return null;

    const session = {
      userId: user.id,
      username: user.username,
      fullName: user.fullName,
      firstName: user.firstName,
      initials: user.initials,
      role: user.role,
      prcLicense: user.prcLicense,
      loginTime: new Date().toISOString()
    };
    localStorage.setItem(AUTH_KEY, JSON.stringify(session));
    window.dispatchEvent(new CustomEvent('pharmacy:auth-changed', { detail: session }));
    return session;
  },

  /** Log out and clear session */
  logout() {
    localStorage.removeItem(AUTH_KEY);
    window.dispatchEvent(new CustomEvent('pharmacy:auth-changed', { detail: null }));
  },

  /** Return current session or null */
  getSession() {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  },

  /** True if a valid session exists */
  isLoggedIn() {
    return !!this.getSession();
  },

  /** Convenience: get a specific field from the current session */
  get(field) {
    const s = this.getSession();
    return s ? s[field] : null;
  }
};

// Initialise on load
authStore.init();
window.authStore = authStore;
