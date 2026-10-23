/**
 * AffordaLabs Pharmacy POS & Inventory System
 * Data Store & State Management
 *
 * The CENTRAL database (Upstash Redis behind /api/*) is the single source of truth.
 * This store keeps a per-device *cache* of it so the screens stay instant:
 *   - every change is applied locally right away AND queued as a small operation
 *     (the "outbox") that is sent to the central database (/api/mutate)
 *   - every few seconds the store checks the central version (/api/sync) and
 *     replaces the cache with the shared data when another PC changed something
 * If the connection drops, changes stay in the outbox and upload when it returns.
 */

const STORAGE_KEYS = {
  ITEMS: 'al_cache_items',
  TRANSACTIONS: 'al_cache_transactions',
  SETTINGS: 'al_cache_settings',
  STAFF: 'al_cache_staff',
  DRAWER: 'al_cache_drawer',
  OUTBOX: 'al_outbox_v1'
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
    this.serverVersion = -1;
    this.isSyncing = false;
    this.isFlushing = false;
    this.localSeq = 0;          // bumps on every local change (guards against stale poll responses)
    this.pollTimer = null;
    this.flushTimer = null;
    this.POLL_MS = 2500;        // other PCs' changes appear within ~2.5 seconds (near real-time)
    this.status = { state: 'idle', message: '', at: null };
    this.init();
    this.outbox = this.loadOutbox();
    this.bindLifecycle();
    if (window.authStore && window.authStore.isLoggedIn()) {
      this.startSync();
    }
  }

  init() {
    const ensure = (key, value) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(value));
    };
    ensure(STORAGE_KEYS.ITEMS, []);
    ensure(STORAGE_KEYS.TRANSACTIONS, []);
    ensure(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
    ensure(STORAGE_KEYS.STAFF, INITIAL_STAFF);
    ensure(STORAGE_KEYS.DRAWER, INITIAL_DRAWER);
  }

  /** Forget this device's copy of the shared data (called on logout). */
  resetCache() {
    [STORAGE_KEYS.ITEMS, STORAGE_KEYS.TRANSACTIONS, STORAGE_KEYS.SETTINGS, STORAGE_KEYS.STAFF, STORAGE_KEYS.DRAWER]
      .forEach(k => localStorage.removeItem(k));
    this.serverVersion = -1;
    this.init();
  }

  // ── Central database sync ────────────────────────────────────────────────

  bindLifecycle() {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) this.syncFromServer();
    });
    window.addEventListener('online', () => this.syncFromServer(true));
    window.addEventListener('focus', () => this.syncFromServer());
  }

  /** Begin polling the central database. Resolves after the first full sync. */
  startSync() {
    this.stopSync();
    this.pollTimer = setInterval(() => {
      if (!document.hidden) this.syncFromServer();
    }, this.POLL_MS);
    return this.syncFromServer(true);
  }

  stopSync() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.setStatus('idle');
  }

  /**
   * Pull the shared data. Skipped while this device still has changes waiting
   * to upload, so a poll can never overwrite what the user just did.
   */
  async syncFromServer(force = false) {
    if (!window.authStore || !window.authStore.isLoggedIn()) return false;
    if (this.outbox.length && !this.isFlushing) {
      await this.flushOutbox();
      return false;
    }
    if (this.isSyncing || this.isFlushing) return false;

    this.isSyncing = true;
    const seq = this.localSeq;
    if (force) this.setStatus('syncing');
    try {
      const data = await window.alApi('/api/sync?v=' + (force ? -1 : this.serverVersion));
      if (data.unchanged) {
        this.setStatus('ok');
        return false;
      }
      // The user changed something while we were fetching: discard, the next poll fetches fresh data.
      if (seq !== this.localSeq || this.outbox.length || this.isFlushing) return false;
      this.applyServerState(data);
      this.serverVersion = data.version;
      this.setStatus('ok');
      return true;
    } catch (err) {
      this.setStatus(err.network ? 'offline' : 'error', err.message);
      return false;
    } finally {
      this.isSyncing = false;
    }
  }

  applyServerState(d) {
    const changed = { items: false, txns: false, settings: false, drawer: false, users: false };
    const put = (key, value) => {
      const s = JSON.stringify(value);
      if (s === localStorage.getItem(key)) return false;
      try {
        localStorage.setItem(key, s);
        return true;
      } catch (e) {
        console.warn('[AffordaLabs Sync] Could not cache ' + key + ':', e.message);
        return false;
      }
    };

    if (Array.isArray(d.items)) changed.items = put(STORAGE_KEYS.ITEMS, d.items);
    if (Array.isArray(d.transactions)) changed.txns = put(STORAGE_KEYS.TRANSACTIONS, d.transactions);
    if (d.settings && typeof d.settings === 'object') changed.settings = put(STORAGE_KEYS.SETTINGS, d.settings);
    if (d.drawer && typeof d.drawer === 'object') changed.drawer = put(STORAGE_KEYS.DRAWER, d.drawer);
    if (window.authStore) changed.users = window.authStore.syncUsersFromRemote(d.users, d.me);

    if (Object.values(changed).some(Boolean)) {
      window.dispatchEvent(new CustomEvent('pharmacy:remote-sync', { detail: changed }));
    }
  }

  // ── Outbox: changes waiting to be written to the central database ────────

  loadOutbox() {
    try {
      const o = JSON.parse(localStorage.getItem(STORAGE_KEYS.OUTBOX));
      return Array.isArray(o) ? o : [];
    } catch (e) {
      return [];
    }
  }

  saveOutbox() {
    try {
      localStorage.setItem(STORAGE_KEYS.OUTBOX, JSON.stringify(this.outbox));
    } catch (e) {
      console.warn('[AffordaLabs Sync] Could not persist outbox:', e.message);
    }
  }

  uid() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 8);
  }

  enqueue(op) {
    op.opId = op.opId || this.uid();
    this.outbox.push(op);
    this.localSeq++;
    this.saveOutbox();
    this.renderStatusBadge();
    this.scheduleFlush();
  }

  scheduleFlush() {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      this.flushOutbox();
    }, 50);
  }

  async flushOutbox() {
    if (this.isFlushing || !this.outbox.length) return;
    if (!window.authStore || !window.authStore.isLoggedIn()) return;

    this.isFlushing = true;
    this.setStatus('syncing');
    const batch = this.outbox.slice(0, 100);
    let proceed = false;
    try {
      const res = await window.alApi('/api/mutate', { method: 'POST', body: { ops: batch } });
      this.outbox = this.outbox.slice(batch.length);
      this.saveOutbox();
      proceed = true;

      const rejected = [];
      (res.results || []).forEach((r, i) => {
        if (!r) return;
        if (r.receiptNo && batch[i].type === 'txn.add') this.patchReceipt(batch[i].txn.id, r.receiptNo);
        if (r.ok === false) rejected.push(r.error || 'The server rejected a change.');
      });
      if (rejected.length) {
        alert('Some changes could not be saved to the shared database:\n\n' + rejected[0] +
          '\n\nThe screen will now refresh to show the current shared data.');
      }
    } catch (err) {
      const clientError = err.status && err.status >= 400 && err.status < 500 && err.status !== 401 && err.status !== 429;
      if (clientError) {
        // A request the server will never accept: drop it so it cannot block everything behind it.
        this.outbox = this.outbox.slice(batch.length);
        this.saveOutbox();
        proceed = true;
        alert('A change could not be saved: ' + err.message);
      } else {
        this.setStatus(err.network ? 'offline' : 'error', err.message);
      }
    } finally {
      this.isFlushing = false;
    }

    if (!proceed) return;
    if (this.outbox.length) this.scheduleFlush();
    else this.syncFromServer(true);
  }

  /** The server may assign a different receipt number if two PCs picked the same one. */
  patchReceipt(txnId, receiptNo) {
    try {
      const txns = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) || [];
      const t = txns.find(x => x.id === txnId);
      if (t && t.receiptNo !== receiptNo) {
        t.receiptNo = receiptNo;
        localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(txns));
        window.dispatchEvent(new CustomEvent('pharmacy:txns-updated'));
      }
    } catch (e) { /* ignore */ }
  }

  // ── Sync status badge (bottom-right) ─────────────────────────────────────

  setStatus(state, message = '') {
    this.status = { state, message, at: new Date() };
    this.renderStatusBadge();
  }

  renderStatusBadge() {
    if (!document.body) return;
    let el = document.getElementById('syncStatusBadge');
    if (!window.authStore || !window.authStore.isLoggedIn()) {
      if (el) el.remove();
      return;
    }
    if (!el) {
      el = document.createElement('div');
      el.id = 'syncStatusBadge';
      el.style.cssText = 'position:fixed;right:14px;bottom:12px;z-index:9999;font:600 11px Inter,system-ui,sans-serif;' +
        'padding:5px 11px;border-radius:999px;box-shadow:0 2px 10px rgba(0,0,0,.18);cursor:default;user-select:none;';
      document.body.appendChild(el);
    }
    const pending = this.outbox.length;
    const time = this.status.at ? this.status.at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';
    let text, bg, fg;
    if (this.status.state === 'offline' || this.status.state === 'error') {
      text = '⚠ ' + (this.status.state === 'offline' ? 'Offline' : 'Sync problem') +
        (pending ? ` – ${pending} change${pending === 1 ? '' : 's'} waiting to upload` : ' – retrying');
      bg = '#fef2f2'; fg = '#b91c1c';
    } else if (this.status.state === 'syncing' || pending) {
      text = '⟳ Syncing' + (pending ? ` (${pending})` : '…');
      bg = '#eff6ff'; fg = '#1d4ed8';
    } else {
      text = '● Shared database · synced ' + time;
      bg = '#ecfdf5'; fg = '#047857';
    }
    el.textContent = text;
    el.title = this.status.message || 'All PCs use the same central database.';
    el.style.background = bg;
    el.style.color = fg;
  }

  /**
   * Shift Window Identifier (informational):
   * The pharmacy operating hours are 6:00 AM (06:00) to 9:00 PM (21:00).
   * - 'open' (Day Shift): 06:00 to 20:59:59 (6:00 AM to 9:00 PM)
   * - 'closed' (Night / Closed Period): 21:00 to 05:59:59 (9:00 PM to 6:00 AM next day)
   * The reset of Added / Deducted to 0 at each transition is now performed ONCE,
   * centrally, by the server (api/sync.js) so every PC always agrees.
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

  /** Kept for backward compatibility: the shift reset is handled by the server now. */
  checkAndResetShiftStock() {
    return false;
  }

  // --- Medicine Item Methods ---
  getItems() {
    const items = JSON.parse(localStorage.getItem(STORAGE_KEYS.ITEMS)) || [];
    return items.map(item => {
      const name = this.formatItemName(item);
      const cost = Number(item.costPrice !== undefined ? item.costPrice : (item.unitPrice || 0));
      let sellingPrice = Number(item.sellingPrice || 0);
      let congPrice = Number(item.congPrice || 0);

      // If sellingPrice was unset or erroneously set to cost price, heal with 1.2x multiplier
      if (cost > 0 && (sellingPrice === 0 || Math.abs(sellingPrice - cost) < 0.001)) {
        sellingPrice = parseFloat((cost * 1.20).toFixed(4));
      }
      // If congPrice was unset or erroneously set to cost price, heal with 2.4x multiplier
      if (cost > 0 && (congPrice === 0 || Math.abs(congPrice - cost) < 0.001)) {
        congPrice = parseFloat((cost * 2.40).toFixed(4));
      }

      return {
        ...item,
        name,
        costPrice: cost,
        unitPrice: cost,
        sellingPrice,
        congPrice
      };
    });
  }

  getItemById(id) {
    return this.getItems().find(i => i.id === id);
  }

  /** Write the local cache only (the caller queues the matching server operation). */
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
    newItem._ord = Date.now();
    items.unshift(newItem);
    this.saveItems(items);
    this.enqueue({ type: 'item.put', item: newItem, stockMode: 'init' });
    return newItem;
  }

  updateItem(id, updates) {
    const items = this.getItems();
    const idx = items.findIndex(i => i.id === id);
    if (idx !== -1) {
      const before = items[idx];
      const merged = { ...before, ...updates };
      merged.name = this.formatItemName(merged);
      items[idx] = merged;
      this.saveItems(items);
      this.enqueue({ type: 'item.put', item: merged, stockMode: 'none' });
      if (updates.currentStock !== undefined && Number(merged.currentStock) !== Number(before.currentStock)) {
        this.enqueue({ type: 'stock.set', id, current: Number(merged.currentStock) });
      }
      return items[idx];
    }
    return null;
  }

  deleteItem(id) {
    const items = this.getItems();
    const filtered = items.filter(i => i.id !== id);
    if (filtered.length !== items.length) {
      this.saveItems(filtered);
      this.enqueue({ type: 'item.del', id });
      return true;
    }
    return false;
  }

  deleteItems(ids) {
    const idSet = new Set(ids);
    const items = this.getItems();
    const filtered = items.filter(i => !idSet.has(i.id));
    this.saveItems(filtered);
    if (items.length !== filtered.length) {
      this.enqueue({ type: 'item.delMany', ids: Array.from(idSet) });
    }
    return items.length - filtered.length;
  }

  backupItems() {
    const raw = localStorage.getItem(STORAGE_KEYS.ITEMS);
    const backupKey = 'al_pharmacy_items_backup_' + Date.now();
    localStorage.setItem(backupKey, raw || '[]');
    localStorage.setItem('al_pharmacy_items_latest_backup', backupKey);
    return backupKey;
  }

  restoreItemsBackup(backupKey) {
    const key = backupKey || localStorage.getItem('al_pharmacy_items_latest_backup');
    if (!key) return false;
    const backupData = localStorage.getItem(key);
    if (!backupData) return false;
    const restored = JSON.parse(backupData);
    localStorage.setItem(STORAGE_KEYS.ITEMS, backupData);
    window.dispatchEvent(new CustomEvent('pharmacy:items-updated'));
    this.enqueue({ type: 'item.clear' });
    restored.forEach(item => this.enqueue({ type: 'item.put', item, stockMode: 'set' }));
    return true;
  }

  bulkImportItems(newItemsList, updateExisting = false) {
    // 1. Automatically create backup before importing
    this.backupItems();

    const currentItems = this.getItems();
    // Index current items for duplicate check
    const makeKey = (brand, generic, dosage, form) => {
      return `${(brand || '').trim().toLowerCase()}|${(generic || '').trim().toLowerCase()}|${(dosage || '').trim().toLowerCase()}|${(form || '').trim().toLowerCase()}`;
    };

    const itemMap = new Map();
    currentItems.forEach(i => {
      itemMap.set(makeKey(i.brandName, i.genericName, i.dosage, i.dosageForm), i);
    });

    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const changedExisting = [];
    const createdItems = [];
    const ordBase = Date.now();

    // duplicateMode can be: 'separate' (import all as separate entries), 'update' (update existing), 'skip' (skip existing)
    const duplicateMode = typeof updateExisting === 'string' 
      ? updateExisting 
      : (updateExisting === true ? 'update' : 'skip');

    newItemsList.forEach(rawItem => {
      const key = makeKey(rawItem.brandName, rawItem.genericName, rawItem.dosage, rawItem.dosageForm);
      const existing = itemMap.get(key);

      if (existing && duplicateMode !== 'separate') {
        if (duplicateMode === 'update') {
          // Update prices, expiry, supplier, batch without wiping out currentStock unless specified
          existing.costPrice = Number(rawItem.costPrice !== undefined ? rawItem.costPrice : (rawItem.unitPrice !== undefined ? rawItem.unitPrice : existing.costPrice));
          existing.unitPrice = Number(rawItem.unitPrice !== undefined ? rawItem.unitPrice : (rawItem.costPrice !== undefined ? rawItem.costPrice : (existing.unitPrice || existing.costPrice)));
          existing.netPrice = Number(rawItem.netPrice !== undefined ? rawItem.netPrice : (existing.netPrice || 0));
          existing.sellingPrice = Number(rawItem.sellingPrice !== undefined ? rawItem.sellingPrice : existing.sellingPrice);
          existing.congPrice = Number(rawItem.congPrice !== undefined ? rawItem.congPrice : (existing.congPrice || 0));
          existing.qtyPerBox = Number(rawItem.qtyPerBox !== undefined ? rawItem.qtyPerBox : (existing.qtyPerBox || 1));
          if (rawItem.company || rawItem.supplier) {
            existing.company = (rawItem.company || rawItem.supplier).trim();
            existing.supplier = (rawItem.company || rawItem.supplier).trim();
          }
          if (rawItem.dosageForm) existing.dosageForm = rawItem.dosageForm.trim();
          if (rawItem.expiryDate) existing.expiryDate = rawItem.expiryDate;
          if (rawItem.batchLot) existing.batchLot = rawItem.batchLot;
          existing.name = this.formatItemName(existing);
          changedExisting.push(existing);
          updatedCount++;
        } else {
          skippedCount++;
        }
      } else {
        const formattedName = this.formatItemName(rawItem);
        const qty = Number(rawItem.initialQty !== undefined ? rawItem.initialQty : (rawItem.qty !== undefined ? rawItem.qty : rawItem.currentStock || 0));
        const newItem = {
          id: 'med-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
          name: formattedName,
          brandName: (rawItem.brandName || '').trim(),
          genericName: (rawItem.genericName || '').trim(),
          dosage: (rawItem.dosage || '').trim(),
          dosageForm: (rawItem.dosageForm || 'Tablet').trim(),
          category: rawItem.category || 'General Medicine',
          isRx: !!rawItem.isRx,
          unit: (rawItem.unit || rawItem.dosageForm || 'pcs').trim(),
          beginningStock: qty,
          addedStock: 0,
          deductedStock: 0,
          currentStock: qty,
          reorderLevel: Number(rawItem.reorderLevel || 20),
          batchLot: rawItem.batchLot || 'LOT-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000),
          expiryDate: rawItem.expiryDate || '2028-12-31',
          costPrice: Number(rawItem.costPrice || rawItem.unitPrice || 0),
          unitPrice: Number(rawItem.unitPrice || rawItem.costPrice || 0),
          netPrice: Number(rawItem.netPrice || 0),
          sellingPrice: Number(rawItem.sellingPrice || 0),
          congPrice: Number(rawItem.congPrice || 0),
          qtyPerBox: Number(rawItem.qtyPerBox || 1),
          company: (rawItem.company || rawItem.supplier || 'General Distributor').trim(),
          supplier: (rawItem.company || rawItem.supplier || 'General Distributor').trim()
        };
        newItem._ord = ordBase + createdItems.length;
        currentItems.unshift(newItem);
        createdItems.push(newItem);
        if (duplicateMode !== 'separate') {
          itemMap.set(key, newItem);
        }
        addedCount++;
      }
    });

    this.saveItems(currentItems);
    changedExisting.forEach(item => this.enqueue({ type: 'item.put', item, stockMode: 'none' }));
    createdItems.forEach(item => this.enqueue({ type: 'item.put', item, stockMode: 'init' }));
    return {
      success: true,
      addedCount,
      updatedCount,
      skippedCount,
      totalProcessed: newItemsList.length
    };
  }

  clearAllItems() {
    this.saveItems([]);
    this.enqueue({ type: 'item.clear' });
  }

  adjustStock(id, changeAmount, reason = 'Adjustment', isReturn = false) {
    const items = this.getItems();
    const item = items.find(i => i.id === id);
    if (item) {
      const amount = Number(changeAmount);
      if (amount > 0) {
        if (isReturn) {
          // If returning/restocking previously sold items, reduce deductedStock
          item.deductedStock = Math.max(0, (Number(item.deductedStock) || 0) - amount);
        } else {
          item.addedStock = (Number(item.addedStock) || 0) + amount;
        }
      } else {
        item.deductedStock = (Number(item.deductedStock) || 0) + Math.abs(amount);
      }
      item.currentStock = Math.max(0, (Number(item.currentStock) || 0) + amount);
      this.saveItems(items);
      // The server applies this as an atomic +/- so two PCs adjusting the same medicine never overwrite each other.
      if (amount !== 0 && Number.isFinite(amount)) {
        this.enqueue({ type: 'stock.adj', id, delta: amount, isReturn: !!isReturn, reason });
      }
      return item;
    }
    return null;
  }

  // --- Transactions ---
  getTransactions() {
    const txns = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) || [];
    // Always keep customers who belong to the same Barangay grouped together
    const UNSPEC = 'BARANGAY NOT SPECIFIED';
    return txns.sort((a, b) => {
      const cleanBrgy = raw => {
        if (!raw || !String(raw).trim()) return UNSPEC;
        const c = String(raw).trim().replace(/\s+/g, ' ');
        return c.replace(/^(barangay|brgy\.?)\s+/i, '').trim().toUpperCase() || UNSPEC;
      };
      const ka = cleanBrgy(a.barangay);
      const kb = cleanBrgy(b.barangay);
      if (ka === kb) return 0;
      if (ka === UNSPEC) return 1;
      if (kb === UNSPEC) return -1;
      return ka.localeCompare(kb, undefined, { numeric: true, sensitivity: 'base' });
    });
  }

  /** Write the local cache only (the caller queues the matching server operation). */
  saveTransactions(txns) {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(txns));
    window.dispatchEvent(new CustomEvent('pharmacy:txns-updated'));
  }

  addTransaction(txnData) {
    const txns = this.getTransactions();
    // Next receipt number = highest existing IO-#### + 1 (the server guarantees uniqueness across PCs).
    const highest = txns.reduce((max, t) => {
      const m = /^IO-(\d+)$/.exec(t.receiptNo || '');
      return m ? Math.max(max, Number(m[1])) : max;
    }, 2759);
    const receiptNum = highest + 1;
    const now = new Date();
    const uniqueSuffix = Math.random().toString(36).substring(2, 8) + '-' + Math.random().toString(36).substring(2, 6);

    const newTxn = {
      id: 'txn-' + Date.now() + '-' + uniqueSuffix,
      _ord: Date.now(),
      receiptNo: txnData.receiptNo || 'IO-' + receiptNum,
      customerName: txnData.customerName || 'Walk-in Customer',
      budget: Number(txnData.budget || 0),
      barangay: txnData.barangay || '',
      date: txnData.date || now.toISOString().split('T')[0],
      time: txnData.time || now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      cashier: txnData.encoderName || txnData.cashier || (window.authStore && window.authStore.getSession() ? (window.authStore.getSession().fullName || window.authStore.getSession().username) : 'Staff Pharmacist'),
      encoderName: txnData.encoderName || txnData.cashier || (window.authStore && window.authStore.getSession() ? (window.authStore.getSession().fullName || window.authStore.getSession().username) : 'Staff Pharmacist'),
      encoderLicense: txnData.encoderLicense !== undefined ? txnData.encoderLicense : (window.authStore && window.authStore.getSession() ? (window.authStore.getSession().prcLicense || '') : ''),
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
    this.enqueue({ type: 'txn.add', txn: newTxn, opId: newTxn.id });

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
          this.adjustStock(oldTargetId, Math.abs(Number(item.qty || 0)), 'Restock before edit ' + oldTxn.receiptNo, true);
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
          this.adjustStock(newTargetId, -Math.abs(Number(item.qty || 0)), 'Deduct edited ' + updatedTxn.receiptNo, false);
        }
      });
    }

    // adjustStock only touches the items cache, so the transactions list above is still current
    txns[txnIndex] = updatedTxn;
    this.saveTransactions(txns);
    this.enqueue({ type: 'txn.put', txn: updatedTxn });
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
      this.enqueue({ type: 'txn.put', txn });

      // Return actual medicines to inventory
      txn.items.forEach(item => {
        const targetInvId = item.actualInventoryId || item.id;
        if (targetInvId) {
          this.adjustStock(targetInvId, Math.abs(Number(item.qty || 0)), 'Restock ' + txn.receiptNo, true);
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
          this.adjustStock(targetInvId, Math.abs(Number(item.qty || 0)), 'Restock on delete ' + txn.receiptNo, true);
        }
      });
    }

    txns.splice(idx, 1);
    this.saveTransactions(txns);
    this.enqueue({ type: 'txn.del', id: txnId });
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
    this.enqueue({ type: 'settings.put', settings });
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
    this.enqueue({ type: 'drawer.put', drawer });
  }
}

// Global instance
window.pharmacyStore = new PharmacyStore();
