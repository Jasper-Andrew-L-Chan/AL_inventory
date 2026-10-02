/**
 * Application Router & Main Coordinator
 * Manages view switching, sidebar state, and event listening
 */

class AppRouter {
  constructor() {
    this.currentView = 'home';
    this.contentEl = document.getElementById('main-content');
    this.pageTitleEl = document.getElementById('pageTitle');
  }

  init() {
    this.bindEvents();
    this.navigate('home');
  }

  bindEvents() {
    // Listen for custom store updates
    window.addEventListener('pharmacy:items-updated', () => {
      this.updateBadges();
      if (this.currentView === 'inventory' || this.currentView === 'transactions' || this.currentView === 'dashboard') {
        this.renderCurrent();
      }
    });

    window.addEventListener('pharmacy:txns-updated', () => {
      if (this.currentView === 'transactions' || this.currentView === 'dashboard' || this.currentView === 'reports') {
        this.renderCurrent();
      }
    });

    // Keyboard shortcuts: Esc for modals
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const modals = document.querySelectorAll('.modal-overlay.active');
        modals.forEach(m => m.classList.remove('active'));
      }
    });
  }

  navigate(viewName) {
    this.currentView = viewName;

    // Update active nav in sidebar
    document.querySelectorAll('.nav-item').forEach(el => {
      if (el.getAttribute('data-view') === viewName) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    // Update Page Header Title
    const titles = {
      home: 'Home',
      dashboard: 'Dashboard',
      inventory: 'Medicine Inventory & Batches',
      transactions: 'In - Out (Stock Movements & Logs)',
      reports: 'Reports & Analytics',
      staff: 'Pharmacy Staff',
      cashdrawer: 'Cash Drawer',
      settings: 'Settings'
    };
    if (this.pageTitleEl) {
      this.pageTitleEl.textContent = titles[viewName] || 'AffordaLabs Pharmacy';
    }

    this.renderCurrent();
    this.updateBadges();
  }

  renderCurrent() {
    if (!this.contentEl) return;

    switch (this.currentView) {
      case 'home':
        renderHomeView(this.contentEl);
        break;
      case 'dashboard':
        renderDashboardView(this.contentEl);
        break;
      case 'inventory':
        renderInventoryView(this.contentEl);
        break;
      case 'transactions':
        renderTransactionsView(this.contentEl);
        break;
      case 'reports':
        renderReportsView(this.contentEl);
        break;
      case 'staff':
        renderStaffView(this.contentEl);
        break;
      case 'cashdrawer':
        renderCashDrawerView(this.contentEl);
        break;
      case 'settings':
        renderSettingsView(this.contentEl);
        break;
      default:
        renderHomeView(this.contentEl);
    }
  }

  updateBadges() {
    const items = window.pharmacyStore.getItems();
    const lowStockCount = items.filter(i => i.currentStock <= i.reorderLevel).length;
    const invBadge = document.getElementById('inventoryBadge');
    if (invBadge) {
      if (lowStockCount > 0) {
        invBadge.textContent = lowStockCount;
        invBadge.style.display = 'inline-block';
      } else {
        invBadge.style.display = 'none';
      }
    }
  }
}

// Global helper to update top navigation bar user profile dynamically
window.updateUserProfileUI = function () {
  const session = window.authStore ? window.authStore.getSession() : null;
  const avatarEl = document.querySelector('.user-avatar span');
  const nameEl = document.querySelector('.user-name');
  const roleEl = document.querySelector('.user-role');

  if (session) {
    if (avatarEl) avatarEl.textContent = session.initials || session.firstName.slice(0, 2).toUpperCase();
    if (nameEl) nameEl.textContent = session.fullName;
    if (roleEl) roleEl.textContent = session.role;
  } else {
    if (avatarEl) avatarEl.textContent = '??';
    if (nameEl) nameEl.textContent = 'Guest';
    if (roleEl) roleEl.textContent = 'Not Logged In';
  }
};

window.bootApp = function () {
  window.updateUserProfileUI();
  if (!window.appRouter) {
    window.appRouter = new AppRouter();
  }
  window.appRouter.init();
};

document.addEventListener('DOMContentLoaded', () => {
  // Listen for auth session updates
  window.addEventListener('pharmacy:auth-changed', () => {
    window.updateUserProfileUI();
  });

  // Check if user is authenticated
  if (window.authStore && !window.authStore.isLoggedIn()) {
    renderLoginPage();
  } else {
    const overlay = document.getElementById('login-overlay');
    if (overlay) overlay.style.display = 'none';
    window.bootApp();
  }
});
