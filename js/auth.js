/**
 * AffordaLabs Auth System
 * Manages user accounts, sessions, and authentication state.
 * Sessions persist in localStorage until explicit logout.
 */

const AUTH_KEY = 'al_auth_session';
const USERS_KEY = 'al_auth_users';

// ── Default user accounts with permission levels ─────────────────────────────
const ALL_PERMISSIONS = ['home', 'dashboard', 'transactions', 'reports', 'inventory', 'staff', 'cashdrawer', 'settings'];

const ROLE_PERMISSIONS_PRESETS = {
  'Owner / Administrator': ['home', 'dashboard', 'transactions', 'reports', 'inventory', 'staff', 'cashdrawer', 'settings'],
  'Pharmacist-in-Charge': ['home', 'dashboard', 'transactions', 'reports', 'inventory', 'staff', 'cashdrawer', 'settings'],
  'Staff Pharmacist': ['home', 'dashboard', 'transactions', 'reports', 'inventory', 'cashdrawer'],
  'Pharmacy Assistant': ['home', 'transactions', 'inventory', 'cashdrawer'],
  'Cashier': ['home', 'transactions', 'cashdrawer'],
  'Inventory Specialist': ['home', 'inventory', 'reports']
};

const DEFAULT_USERS = [
  {
    id: 'usr-001',
    username: 'andrew',
    password: 'andrew123',
    fullName: 'Jasper Andrew Chan, RPh',
    firstName: 'Andrew',
    initials: 'AC',
    role: 'Pharmacist-in-Charge / Owner',
    level: 'Owner',
    permissions: ['home', 'dashboard', 'transactions', 'reports', 'inventory', 'staff', 'cashdrawer', 'settings'],
    prcLicense: 'PRC-0089142',
    phone: '0917-123-4567',
    status: 'Active',
    avatar: null
  },
  {
    id: 'usr-005',
    username: 'admin',
    password: 'admin123',
    fullName: 'System Administrator',
    firstName: 'Admin',
    initials: 'SA',
    role: 'Owner / Administrator',
    level: 'Admin',
    permissions: ['home', 'dashboard', 'transactions', 'reports', 'inventory', 'staff', 'cashdrawer', 'settings'],
    prcLicense: 'N/A',
    phone: '0900-000-0000',
    status: 'Active',
    avatar: null
  },
  {
    id: 'usr-002',
    username: 'lionel',
    password: 'lionel123',
    fullName: 'Lionel Santos, RPh',
    firstName: 'Lionel',
    initials: 'LS',
    role: 'Staff Pharmacist',
    level: 'Staff',
    permissions: ['home', 'dashboard', 'transactions', 'reports', 'inventory', 'cashdrawer'],
    prcLicense: 'PRC-0092144',
    phone: '0918-234-5678',
    status: 'Active',
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
    level: 'Staff',
    permissions: ['home', 'transactions', 'inventory', 'cashdrawer'],
    prcLicense: 'TESDA NC-III',
    phone: '0922-345-6789',
    status: 'Active',
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
    level: 'Staff',
    permissions: ['home', 'inventory', 'reports'],
    prcLicense: 'INV-REG-2024',
    phone: '0919-456-7890',
    status: 'Active',
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
      // Merge in any new default users or update missing permissions without overwriting custom passwords
      try {
        const parsed = JSON.parse(existing);
        let updated = false;

        // Ensure every user has valid permissions and level
        parsed.forEach(u => {
          if (!Array.isArray(u.permissions)) {
            u.permissions = this.getDefaultPermissionsForRole(u.role, u.level);
            updated = true;
          }
          if (!u.level) {
            u.level = (u.username === 'admin' || (u.role || '').toLowerCase().includes('owner')) ? 'Owner' : 'Staff';
            updated = true;
          }
        });

        DEFAULT_USERS.forEach(defUser => {
          const found = parsed.find(u => u.username.toLowerCase() === defUser.username.toLowerCase());
          if (!found) {
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

  /** Return all registered users */
  getUsers() {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  },

  getUserById(id) {
    return this.getUsers().find(u => u.id === id);
  },

  /** Add or register a new user */
  addUser(userData) {
    const users = this.getUsers();
    const uname = (userData.username || '').toLowerCase().trim();
    if (!uname) {
      throw new Error('Username is required');
    }
    if (users.some(u => u.username.toLowerCase() === uname)) {
      throw new Error('Username already exists. Please choose a unique username.');
    }

    const level = userData.level || 'Staff';
    const permissions = Array.isArray(userData.permissions) && userData.permissions.length > 0
      ? userData.permissions
      : this.getDefaultPermissionsForRole(userData.role, level);

    const newUser = {
      id: `usr-${Date.now()}`,
      username: uname,
      password: userData.password || '123456',
      fullName: (userData.fullName || '').trim() || uname,
      firstName: userData.firstName || (userData.fullName || '').split(' ')[0] || uname,
      initials: userData.initials || ((userData.fullName || uname).split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()),
      role: userData.role || 'Staff Pharmacist',
      level: level,
      permissions: permissions,
      prcLicense: userData.prcLicense || '-',
      phone: userData.phone || '-',
      status: userData.status || 'Active',
      avatar: null
    };

    users.push(newUser);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    window.dispatchEvent(new CustomEvent('pharmacy:users-updated'));
    return newUser;
  },

  /** Update user profile, role, password or permissions */
  updateUser(id, updates) {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) throw new Error('User not found');

    if (updates.username) {
      const newUname = updates.username.toLowerCase().trim();
      if (users.some(u => u.id !== id && u.username.toLowerCase() === newUname)) {
        throw new Error('Username already in use by another account');
      }
      updates.username = newUname;
    }

    const current = users[idx];
    const updated = {
      ...current,
      ...updates,
      id: current.id
    };

    if (updates.fullName) {
      updated.firstName = updates.firstName || updates.fullName.split(' ')[0];
      updated.initials = (updates.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase());
    }

    users[idx] = updated;
    localStorage.setItem(USERS_KEY, JSON.stringify(users));

    // If current logged-in user session was updated, update active session too
    const session = this.getSession();
    if (session && session.userId === id) {
      const refreshedSession = {
        ...session,
        fullName: updated.fullName,
        role: updated.role,
        level: updated.level,
        permissions: updated.permissions,
        prcLicense: updated.prcLicense
      };
      localStorage.setItem(AUTH_KEY, JSON.stringify(refreshedSession));
      window.dispatchEvent(new CustomEvent('pharmacy:auth-changed', { detail: refreshedSession }));
    }

    window.dispatchEvent(new CustomEvent('pharmacy:users-updated'));
    return updated;
  },

  /** Change password for a specific user (verifies current password) */
  changePassword(userId, currentPassword, newPassword) {
    const users = this.getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) {
      throw new Error('User not found.');
    }
    if (user.password !== currentPassword) {
      throw new Error('Current password is incorrect.');
    }
    if (!newPassword || newPassword.length < 4) {
      throw new Error('New password must be at least 4 characters long.');
    }

    user.password = newPassword;
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    window.dispatchEvent(new CustomEvent('pharmacy:users-updated'));
    return true;
  },

  deleteUser(id) {
    const session = this.getSession();
    if (session && session.userId === id) {
      throw new Error('You cannot delete the account you are currently logged in with.');
    }
    const users = this.getUsers();
    const filtered = users.filter(u => u.id !== id);
    if (filtered.length !== users.length) {
      localStorage.setItem(USERS_KEY, JSON.stringify(filtered));
      window.dispatchEvent(new CustomEvent('pharmacy:users-updated'));
      return true;
    }
    return false;
  },

  /** Check if active user has permission to access a view/action */
  hasPermission(viewName) {
    const session = this.getSession();
    if (!session) return false;

    // Owners and Admins have unrestricted access to all views
    const lvl = (session.level || '').toLowerCase();
    const role = (session.role || '').toLowerCase();
    if (lvl === 'owner' || lvl === 'admin' || role.includes('owner') || role.includes('admin') || session.username === 'admin') {
      return true;
    }

    // Check specific user permissions
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
      level: user.level || 'Staff',
      permissions: user.permissions || this.getDefaultPermissionsForRole(user.role, user.level),
      prcLicense: user.prcLicense,
      phone: user.phone,
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
