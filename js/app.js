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

    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  updateBadges() {
    const items = window.pharmacyStore.getItems();
    const lowStockCount = items.filter(i => (Number(i.currentStock) || 0) <= (Number(i.reorderLevel) || 10)).length;
    const in90Days = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    const expiringCount = items.filter(i => {
      if (!i.expiryDate) return false;
      const d = new Date(i.expiryDate);
      return !isNaN(d.getTime()) && d <= in90Days;
    }).length;

    const totalAlerts = lowStockCount + expiringCount;

    // Sidebar Inventory badge
    const invBadge = document.getElementById('inventoryBadge');
    if (invBadge) {
      if (lowStockCount > 0) {
        invBadge.textContent = lowStockCount;
        invBadge.style.display = 'inline-block';
      } else {
        invBadge.style.display = 'none';
      }
    }

    // Topbar notification bell dot & count
    const notifDot = document.getElementById('notifBadgeDot');
    if (notifDot) {
      notifDot.style.display = totalAlerts > 0 ? 'block' : 'none';
    }

    const notifHeaderCount = document.getElementById('notifHeaderCount');
    if (notifHeaderCount) {
      notifHeaderCount.textContent = totalAlerts;
    }
  }
}

// ── Topbar Alerts Dropdown Handlers ──────────────────────────────────────────
let currentNotifFilter = 'all';

window.toggleAlertsDropdown = function(event) {
  if (event) event.stopPropagation();
  const dd = document.getElementById('alertsDropdown');
  if (!dd) return;

  const isVisible = dd.classList.contains('show');
  if (isVisible) {
    dd.classList.remove('show');
  } else {
    renderAlertsDropdownContent();
    dd.classList.add('show');
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
};

window.closeAlertsDropdown = function() {
  const dd = document.getElementById('alertsDropdown');
  if (dd) dd.classList.remove('show');
};

// Close dropdown when clicking outside
document.addEventListener('click', function(e) {
  const wrapper = document.querySelector('.notif-dropdown-wrapper');
  if (wrapper && !wrapper.contains(e.target)) {
    window.closeAlertsDropdown();
  }
});

window.filterNotifTab = function(filter) {
  currentNotifFilter = filter;
  ['all', 'restock', 'expiry'].forEach(f => {
    const btn = document.getElementById('tabNotif' + f.charAt(0).toUpperCase() + f.slice(1));
    if (btn) {
      if (f === filter) btn.classList.add('active');
      else btn.classList.remove('active');
    }
  });
  renderAlertsDropdownContent();
};

window.renderAlertsDropdownContent = function() {
  const container = document.getElementById('notifListContainer');
  if (!container) return;

  const items = window.pharmacyStore.getItems();
  const now = new Date();
  const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  const lowStockItems = items.filter(i => (Number(i.currentStock) || 0) <= (Number(i.reorderLevel) || 10));
  const expiringItems = items.filter(i => {
    if (!i.expiryDate) return false;
    const exp = new Date(i.expiryDate);
    return !isNaN(exp.getTime()) && exp <= in90Days;
  }).sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));

  let alertEntries = [];

  if (currentNotifFilter === 'all' || currentNotifFilter === 'restock') {
    lowStockItems.forEach(item => {
      const isCritical = (Number(item.currentStock) || 0) === 0;
      alertEntries.push({
        type: 'restock',
        itemId: item.id,
        title: (item.genericName ? `${item.genericName} (${item.brandName})` : item.brandName),
        sub: `Current Stock: ${item.currentStock} ${item.unit || 'units'} (Reorder Level: ${item.reorderLevel || 10})`,
        batch: item.batchLot || 'N/A',
        severity: isCritical ? 'danger' : 'warning',
        badgeText: isCritical ? 'OUT OF STOCK' : 'LOW STOCK - REORDER',
        icon: 'package-plus',
        actionLabel: 'Restock'
      });
    });
  }

  if (currentNotifFilter === 'all' || currentNotifFilter === 'expiry') {
    expiringItems.forEach(item => {
      const expDate = new Date(item.expiryDate);
      const daysLeft = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));
      const isExpired = daysLeft <= 0;
      const isCritical = daysLeft <= 30;

      alertEntries.push({
        type: 'expiry',
        itemId: item.id,
        title: (item.genericName ? `${item.genericName} (${item.brandName})` : item.brandName),
        sub: `Expires: ${item.expiryDate} (Lot: ${item.batchLot || 'N/A'}) • Stock: ${item.currentStock} ${item.unit || 'units'}`,
        batch: item.batchLot || 'N/A',
        severity: isExpired || isCritical ? 'danger' : 'warning',
        badgeText: isExpired ? 'EXPIRED' : (daysLeft <= 30 ? `EXPIRES IN ${daysLeft}D` : `EXPIRING SOON (${daysLeft}D)`),
        icon: 'clock',
        actionLabel: 'Inspect'
      });
    });
  }

  // Update header count
  const countEl = document.getElementById('notifHeaderCount');
  if (countEl) countEl.textContent = lowStockItems.length + expiringItems.length;

  const syncEl = document.getElementById('notifSyncTime');
  if (syncEl) syncEl.textContent = `${alertEntries.length} alert${alertEntries.length === 1 ? '' : 's'} active`;

  if (alertEntries.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2.2rem 1.2rem; color: var(--text-muted);">
        <div style="margin-bottom: 0.5rem; display: flex; justify-content: center; color: #10b981;">
          <i data-lucide="check-circle" style="width: 32px; height: 32px;"></i>
        </div>
        <div style="font-weight: 700; font-size: 0.88rem; color: var(--text-main);">No Immediate Alerts</div>
        <div style="font-size: 0.74rem; margin-top: 4px;">
          All medicine stocks are above reorder thresholds and no batches are expiring within 90 days.
        </div>
      </div>
    `;
    if (typeof lucide !== 'undefined') lucide.createIcons();
    return;
  }

  container.innerHTML = alertEntries.map(entry => `
    <div class="notif-item" onclick="openMedicineFromAlert('${entry.itemId}')" title="Click to view and adjust stock">
      <div class="notif-icon-circle ${entry.severity}">
        <i data-lucide="${entry.icon}" style="width: 16px; height: 16px;"></i>
      </div>
      <div class="notif-content">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 4px; margin-bottom: 2px;">
          <div class="notif-title">${entry.title}</div>
          <span class="notif-badge-pill ${entry.severity}">${entry.badgeText}</span>
        </div>
        <div class="notif-sub">${entry.sub}</div>
      </div>
    </div>
  `).join('');

  if (typeof lucide !== 'undefined') lucide.createIcons();
};

window.goToAlertsTab = function() {
  window.closeAlertsDropdown();
  if (window.appRouter) {
    window.appRouter.navigate('inventory');
    setTimeout(() => {
      if (typeof window.switchInventoryTab === 'function') {
        window.switchInventoryTab('expiry-alerts');
      }
    }, 100);
  }
};

window.openMedicineFromAlert = function(itemId) {
  window.closeAlertsDropdown();
  if (window.appRouter) {
    window.appRouter.navigate('inventory');
    setTimeout(() => {
      if (typeof window.openEditMedicineModal === 'function') {
        window.openEditMedicineModal(itemId);
      }
    }, 150);
  }
};

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
    if (avatarEl) avatarEl.textContent = '--';
    if (nameEl) nameEl.textContent = 'Guest';
    if (roleEl) roleEl.textContent = 'Not Logged In';
  }

  // Update badge notifications
  if (window.appRouter) {
    window.appRouter.updateBadges();
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

  // Listen for item changes to re-check stock badges
  window.addEventListener('pharmacy:items-updated', () => {
    if (window.appRouter) window.appRouter.updateBadges();
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
