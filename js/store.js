/**
 * AffordaLabs Pharmacy POS & Inventory System
 * Data Store & State Management (LocalStorage with default pharmacy seed)
 */

const STORAGE_KEYS = {
  ITEMS: 'al_pharmacy_items',
  TRANSACTIONS: 'al_pharmacy_transactions',
  SETTINGS: 'al_pharmacy_settings',
  STAFF: 'al_pharmacy_staff',
  DRAWER: 'al_pharmacy_drawer',
  SHIFT_TRACKER: 'al_pharmacy_shift_tracker'
};

const INITIAL_MEDICINES = [];

const INITIAL_TRANSACTIONS = [];

const INITIAL_SETTINGS = {
  pharmacyName: 'AffordaLabs Pharmacy',
  tagline: 'Your Trusted Community Drugstore',
  branch: 'Main Branch - Pasig City',
  address: '128 Mabini St, Kapasigan, Pasig City, Metro Manila',
  tin: '302-841-925-000',
  pharmacistInCharge: 'Jasper Andrew Chan, RPh',
  prcLicense: 'PRC-0089142',
  birAccreditation: 'BIR-RR7-2024-00981',
  phone: '(02) 8642-9912 / 0917-123-4567',
  currency: 'PHP',
  currencySymbol: '₱',
  seniorDiscountRate: 20, // 20% Senior / PWD
  vatRate: 12,
  vatExemptSenior: true
};

const INITIAL_STAFF = [
  { id: 'stf-1', name: 'Jasper Andrew Chan', role: 'Pharmacist-in-Charge / Owner', license: 'PRC-0089142', phone: '0917-123-4567', status: 'Active' },
  { id: 'stf-2', name: 'Lionel Santos', role: 'Staff Pharmacist', license: 'PRC-0092144', phone: '0918-234-5678', status: 'Active' },
  { id: 'stf-3', name: 'Sarah Dela Cruz', role: 'Pharmacy Assistant', license: 'TESDA NC-III', phone: '0922-345-6789', status: 'Active' },
  { id: 'stf-4', name: 'Mark Ramos', role: 'Inventory Specialist', license: '-', phone: '0919-456-7890', status: 'Active' }
];

const INITIAL_DRAWER = {
  shiftDate: '2026-10-01',
  openedAt: '08:00 AM',
  openedBy: 'Lionel Santos',
  openingFloat: 2000.00, // ₱2,000 petty cash float
  currentCashInDrawer: 3431.00,
  expectedCash: 3431.00,
  discrepancy: 0.00,
  status: 'Open'
};

class PharmacyStore {
  constructor() {
    this.init();
  }

  init() {
    // If first time with cleared items or user wants fresh clean inventory
    const existingClean = localStorage.getItem('al_pharmacy_items_cleared_v2');
    if (!existingClean) {
      localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify([]));
      localStorage.setItem('al_pharmacy_items_cleared_v2', 'true');
    } else if (!localStorage.getItem(STORAGE_KEYS.ITEMS)) {
      localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify([]));
    }

    // Clear transactions as requested
    const existingTxnsClean = localStorage.getItem('al_pharmacy_txns_cleared_v1');
    if (!existingTxnsClean) {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([]));
      localStorage.setItem('al_pharmacy_txns_cleared_v1', 'true');
    } else if (!localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([]));
    } else {
      // Clean up deleted/voided transactions for ALLYANE and JO if previously purged
      const currentTxns = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) || [];
      const cleaned = currentTxns.filter(t => {
        const name = (t.customerName || '').toUpperCase().trim();
        return name !== 'ALLYANE' && name !== 'JO';
      });
      if (cleaned.length !== currentTxns.length) {
        localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(cleaned));
      }
    }
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.STAFF)) {
      localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(INITIAL_STAFF));
    }
    if (!localStorage.getItem(STORAGE_KEYS.DRAWER)) {
      localStorage.setItem(STORAGE_KEYS.DRAWER, JSON.stringify(INITIAL_DRAWER));
    }

    // Verify and synchronize shift opening (6:00 AM) and closing (9:00 PM)
    this.checkAndResetShiftStock();
  }

  /**
   * Shift Window Identifier:
   * The pharmacy operating hours are 6:00 AM (06:00) to 9:00 PM (21:00).
   * - 'open' (Day Shift): 06:00 to 20:59:59 (6:00 AM to 9:00 PM)
   * - 'closed' (Night / Closed Period): 21:00 to 05:59:59 (9:00 PM to 6:00 AM next day)
   * Whenever transitioning into Open (6 AM) or Closed (9 PM), Added and Deducted reset to 0.
   */
  getCurrentShiftId(now = new Date()) {
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const hour = now.getHours();

    if (hour >= 6 && hour < 21) {
      return `${dateStr}_open_06_21`;
    } else {
      // If past 9 PM (21:00 - 23:59), it belongs to dateStr closed period
      // If before 6 AM (00:00 - 05:59), it is the night following previous day
      return `${dateStr}_closed_h${hour < 6 ? 'early' : 'late'}`;
    }
  }

  checkAndResetShiftStock() {
    const currentShift = this.getCurrentShiftId();
    const recordedShift = localStorage.getItem(STORAGE_KEYS.SHIFT_TRACKER);

    if (recordedShift !== currentShift) {
      // New shift started (e.g. pharmacy just opened at 6am, or closed at 9pm, or new calendar day)
      this.resetAddedAndDeductedStock(`Shift transition to: ${currentShift}`);
      localStorage.setItem(STORAGE_KEYS.SHIFT_TRACKER, currentShift);
    }
  }

  resetAddedAndDeductedStock(reason = 'Shift reset') {
    const rawItems = JSON.parse(localStorage.getItem(STORAGE_KEYS.ITEMS)) || [];
    let modified = false;

    const updated = rawItems.map(item => {
      const added = Number(item.addedStock) || 0;
      const deducted = Number(item.deductedStock) || 0;
      const current = Number(item.currentStock) || 0;

      if (added !== 0 || deducted !== 0 || item.beginningStock !== current) {
        modified = true;
        return {
          ...item,
          beginningStock: current, // The new shift begins with current stock as beginning stock
          addedStock: 0,
          deductedStock: 0
        };
      }
      return item;
    });

    if (modified) {
      localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('pharmacy:items-updated'));
      console.log(`[AffordaLabs Shift] Reset added & deducted stock to 0. (${reason})`);
    }
  }

  // --- Medicine Item Methods ---
  getItems() {
    // Proactively verify shift window upon any item query
    this.checkAndResetShiftStock();

    const items = JSON.parse(localStorage.getItem(STORAGE_KEYS.ITEMS)) || [];
    return items.map(item => {
      const name = this.formatItemName(item);
      return { ...item, name };
    });
  }

  getItemById(id) {
    return this.getItems().find(i => i.id === id);
  }

  saveItems(items) {
    localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('pharmacy:items-updated'));
  }

  // Helper to compute a standardized medicine display name (e.g. Biogesic, Lazartan)
  formatItemName(item) {
    if (!item) return 'Unnamed Medicine';
    const brand = (item.brandName || '').trim();
    const generic = (item.genericName || '').trim();
    const dosage = (item.dosage && item.dosage !== 'Standard') ? item.dosage.trim() : '';

    if (brand && generic) {
      const detail = dosage ? `${generic} ${dosage}` : generic;
      return `${brand} (${detail})`;
    }
    if (brand) {
      return dosage ? `${brand} ${dosage}` : brand;
    }
    if (generic) {
      return dosage ? `${generic} ${dosage}` : generic;
    }
    if (item.name && item.name.trim()) {
      return item.name.trim();
    }
    return 'Unnamed Medicine';
  }

  addItem(item) {
    const items = this.getItems();
    const formattedName = this.formatItemName(item);
    const newItem = {
      id: 'med-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      name: formattedName,
      beginningStock: Number(item.qty !== undefined ? item.qty : item.currentStock || 0),
      addedStock: 0,
      deductedStock: 0,
      currentStock: Number(item.qty !== undefined ? item.qty : item.currentStock || 0),
      reorderLevel: Number(item.reorderLevel || 20),
      batchLot: item.batchLot || 'LOT-' + new Date().getFullYear() + '-01',
      expiryDate: item.expiryDate || '2027-12-31',
      isRx: !!item.isRx,
      costPrice: Number(item.costPrice || 0),
      sellingPrice: Number(item.sellingPrice || 0),
      supplier: item.supplier || 'General Distributor',
      ...item,
      name: formattedName
    };
    items.unshift(newItem);
    this.saveItems(items);
    return newItem;
  }

  updateItem(id, updates) {
    const items = this.getItems();
    const idx = items.findIndex(i => i.id === id);
    if (idx !== -1) {
      const merged = { ...items[idx], ...updates };
      merged.name = this.formatItemName(merged);
      items[idx] = merged;
      this.saveItems(items);
      return items[idx];
    }
    return null;
  }

  deleteItem(id) {
    const items = this.getItems();
    const filtered = items.filter(i => i.id !== id);
    if (filtered.length !== items.length) {
      this.saveItems(filtered);
      return true;
    }
    return false;
  }

  deleteItems(ids) {
    const idSet = new Set(ids);
    const items = this.getItems();
    const filtered = items.filter(i => !idSet.has(i.id));
    this.saveItems(filtered);
    return items.length - filtered.length;
  }

  clearAllItems() {
    this.saveItems([]);
  }

  adjustStock(id, changeAmount, reason = 'Adjustment') {
    const items = this.getItems();
    const item = items.find(i => i.id === id);
    if (item) {
      const amount = Number(changeAmount);
      if (amount > 0) {
        item.addedStock = (Number(item.addedStock) || 0) + amount;
      } else {
        item.deductedStock = (Number(item.deductedStock) || 0) + Math.abs(amount);
      }
      item.currentStock = Math.max(0, (Number(item.currentStock) || 0) + amount);
      this.saveItems(items);
      return item;
    }
    return null;
  }

  // --- Transactions ---
  getTransactions() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) || [];
  }

  saveTransactions(txns) {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(txns));
    window.dispatchEvent(new CustomEvent('pharmacy:txns-updated'));
  }

  addTransaction(txnData) {
    const txns = this.getTransactions();
    const receiptNum = 2760 + txns.length;
    const now = new Date();
    
    const newTxn = {
      id: 'txn-' + Date.now(),
      receiptNo: txnData.receiptNo || 'IO-' + receiptNum,
      customerName: txnData.customerName || 'Walk-in Customer',
      budget: Number(txnData.budget || 0),
      barangay: txnData.barangay || '',
      date: txnData.date || now.toISOString().split('T')[0],
      time: txnData.time || now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      cashier: txnData.cashier || (window.authStore && window.authStore.getSession() ? window.authStore.getSession().fullName : 'Staff'),
      customerType: txnData.customerType || 'Regular',
      customerId: txnData.customerId || '',
      paymentMethod: txnData.paymentMethod || 'Cash',
      items: txnData.items || [],
      subtotal: Number(txnData.subtotal || 0),
      discountAmount: Number(txnData.discountAmount || 0),
      netTotal: Number(txnData.netTotal || 0),
      status: 'Completed'
    };

    txns.unshift(newTxn);
    this.saveTransactions(txns);

    // Deduct stock for each supplied medicine based on actual inventory item used
    newTxn.items.forEach(item => {
      const targetInvId = item.actualInventoryId || item.id;
      if (targetInvId) {
        this.adjustStock(targetInvId, -Math.abs(Number(item.qty || 0)), 'In-Out Issue ' + newTxn.receiptNo);
      }
    });

    return newTxn;
  }

  updateTransaction(txnId, updatedData) {
    const txns = this.getTransactions();
    const txnIndex = txns.findIndex(t => t.id === txnId);
    if (txnIndex === -1) return null;

    const oldTxn = txns[txnIndex];

    // 1. Restock the previously supplied medicines back to inventory (if not already refunded)
    if (oldTxn.status !== 'Refunded' && Array.isArray(oldTxn.items)) {
      oldTxn.items.forEach(item => {
        const oldTargetId = item.actualInventoryId || item.id;
        if (oldTargetId) {
          this.adjustStock(oldTargetId, Math.abs(Number(item.qty || 0)), 'Restock before edit ' + oldTxn.receiptNo);
        }
      });
    }

    // 2. Prepare merged transaction data
    const updatedTxn = {
      ...oldTxn,
      ...updatedData,
      id: oldTxn.id,
      receiptNo: updatedData.receiptNo !== undefined ? updatedData.receiptNo : oldTxn.receiptNo,
      status: 'Completed',
      editedAt: new Date().toISOString()
    };

    // 3. Deduct stock for the new/updated medicines
    if (Array.isArray(updatedTxn.items)) {
      updatedTxn.items.forEach(item => {
        const newTargetId = item.actualInventoryId || item.id;
        if (newTargetId) {
          this.adjustStock(newTargetId, -Math.abs(Number(item.qty || 0)), 'Deduct edited ' + updatedTxn.receiptNo);
        }
      });
    }

    txns[txnIndex] = updatedTxn;
    this.saveTransactions(txns);
    return updatedTxn;
  }

  refundTransaction(txnId, reason = 'Void / Return') {
    const txns = this.getTransactions();
    const txn = txns.find(t => t.id === txnId);
    if (txn && txn.status !== 'Refunded') {
      txn.status = 'Refunded';
      txn.refundReason = reason;
      txn.refundDate = new Date().toISOString();
      this.saveTransactions(txns);

      // Return actual medicines to inventory
      txn.items.forEach(item => {
        const targetInvId = item.actualInventoryId || item.id;
        if (targetInvId) {
          this.adjustStock(targetInvId, Math.abs(Number(item.qty || 0)), 'Restock ' + txn.receiptNo);
        }
      });

      return txn;
    }
    return null;
  }

  deleteTransaction(txnId, restockItems = false) {
    const txns = this.getTransactions();
    const idx = txns.findIndex(t => t.id === txnId);
    if (idx === -1) return false;

    const txn = txns[idx];
    if (restockItems && txn.status !== 'Refunded' && Array.isArray(txn.items)) {
      txn.items.forEach(item => {
        const targetInvId = item.actualInventoryId || item.id;
        if (targetInvId) {
          this.adjustStock(targetInvId, Math.abs(Number(item.qty || 0)), 'Restock on delete ' + txn.receiptNo);
        }
      });
    }

    txns.splice(idx, 1);
    this.saveTransactions(txns);
    return true;
  }

  // --- Financial & Dashboard Aggregates ---
  getDashboardMetrics() {
    const txns = this.getTransactions().filter(t => t.status !== 'Refunded');
    const items = this.getItems();

    let totalNetSales = 0;
    let totalDiscounts = 0;
    let totalItemsDispensed = 0;
    let costOfGoods = 0;

    const paymentTotals = {
      Cash: 0,
      Grab: 0,
      Maya: 0,
      GCash: 0,
      Card: 0,
      FoodPanda: 0
    };

    txns.forEach(t => {
      totalNetSales += Number(t.netTotal || 0);
      totalDiscounts += Number(t.discountAmount || 0);

      const method = t.paymentMethod || 'Cash';
      if (paymentTotals[method] !== undefined) {
        paymentTotals[method] += Number(t.netTotal || 0);
      } else {
        paymentTotals['Cash'] += Number(t.netTotal || 0);
      }

      t.items.forEach(sold => {
        const qty = Number(sold.qty || 0);
        totalItemsDispensed += qty;
        const targetId = sold.actualInventoryId || sold.id;
        const originalItem = items.find(i => i.id === targetId);
        const cost = Number(sold.unitPrice) > 0 
          ? Number(sold.unitPrice) 
          : (originalItem && Number(originalItem.costPrice) > 0 ? Number(originalItem.costPrice) : Number(sold.price || sold.sellingPrice || 0) * 0.65);
        costOfGoods += cost * qty;
      });
    });

    const grossProfit = totalNetSales - costOfGoods;
    const lowStockCount = items.filter(i => i.currentStock <= i.reorderLevel).length;

    // Check items expiring within 90 days
    const now = new Date();
    const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    const expiringSoonCount = items.filter(i => {
      const exp = new Date(i.expiryDate);
      return exp <= in90Days;
    }).length;

    // Items sold log for real-time live feed (all recorded sales)
    const recentSoldList = [];
    txns.forEach(t => {
      (t.items || []).forEach(item => {
        recentSoldList.push({
          time: t.time || '',
          date: t.date || '',
          receiptNo: t.receiptNo || '',
          customerName: t.customerName || 'Walk-in',
          name: item.actualSuppliedName || item.name || 'Medicine',
          qty: Number(item.qty || 1),
          sellingPrice: Number(item.sellingPrice || item.price || 0),
          totalPrice: Number(item.qty || 1) * Number(item.sellingPrice || item.price || 0),
          isSubstitute: !!item.isSubstitute
        });
      });
    });

    return {
      netSales: totalNetSales,
      discounts: totalDiscounts,
      transactionCount: txns.length,
      costOfGoods: costOfGoods,
      itemsDispensed: totalItemsDispensed,
      grossProfit: grossProfit,
      totalRefunds: 0.00,
      lowStockCount,
      expiringSoonCount,
      paymentTotals,
      totalSKUs: items.length,
      recentSold: recentSoldList,
      allCompletedTxns: txns
    };
  }

  getLowStockItems() {
    return this.getItems().filter(i => (Number(i.currentStock) || 0) <= (Number(i.reorderLevel) || 10));
  }

  getExpiringItems(daysAhead = 90) {
    const now = new Date();
    const threshold = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    return this.getItems().filter(i => {
      if (!i.expiryDate) return false;
      const exp = new Date(i.expiryDate);
      return !isNaN(exp.getTime()) && exp <= threshold;
    }).sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
  }

  // --- Settings ---
  getSettings() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS)) || INITIAL_SETTINGS;
  }

  saveSettings(settings) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent('pharmacy:settings-updated'));
  }

  // --- Staff ---
  getStaff() {
    if (window.authStore && typeof window.authStore.getUsers === 'function') {
      const authUsers = window.authStore.getUsers();
      if (Array.isArray(authUsers) && authUsers.length > 0) {
        return authUsers.map(u => ({
          id: u.id,
          username: u.username,
          name: u.fullName,
          role: u.role,
          level: u.level || 'Staff',
          permissions: u.permissions || [],
          license: u.prcLicense || '-',
          phone: u.phone || '-',
          status: u.status || 'Active'
        }));
      }
    }
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.STAFF)) || INITIAL_STAFF;
  }

  // --- Cash Drawer ---
  getDrawer() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.DRAWER)) || INITIAL_DRAWER;
  }

  saveDrawer(drawer) {
    localStorage.setItem(STORAGE_KEYS.DRAWER, JSON.stringify(drawer));
    window.dispatchEvent(new CustomEvent('pharmacy:drawer-updated'));
  }
}

// Global instance
window.pharmacyStore = new PharmacyStore();
