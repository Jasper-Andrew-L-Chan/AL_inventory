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
      if (this.currentView === 'inventory' || this.currentView === 'pos' || this.currentView === 'dashboard') {
        this.renderCurrent();
      }
    });

    window.addEventListener('pharmacy:txns-updated', () => {
      if (this.currentView === 'transactions' || this.currentView === 'dashboard' || this.currentView === 'reports') {
        this.renderCurrent();
      }
    });

    // Keyboard shortcuts: F2 for Quick POS, Esc for modals
    window.addEventListener('keydown', (e) => {
      if (e.key === 'F2') {
        e.preventDefault();
        this.navigate('pos');
      }
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
      pos: 'Pharmacy POS Cashier Register',
      inventory: 'Medicine Inventory & Batches',
      transactions: 'Transactions',
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
      case 'pos':
        renderPOSView(this.contentEl);
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

document.addEventListener('DOMContentLoaded', () => {
  window.appRouter = new AppRouter();
  window.appRouter.init();
});
